import assert from "node:assert/strict";
import test from "node:test";
import { Readable } from "node:stream";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { Upload } from "@tus/utils";

process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_PUBLISHABLE_KEY ||= "public-test-key";
process.env.SUPABASE_ANON_KEY ||= "public-test-key";
const { GamefolioTusStore } = await import("../server/tus-storage");

const env = {
  NODE_ENV: "test", R2_ACCOUNT_ID: "account", R2_ACCESS_KEY_ID: "key",
  R2_SECRET_ACCESS_KEY: "secret", R2_BUCKET: "media", R2_PUBLIC_BASE_URL: "https://cdn.example",
};

function backend() {
  const objects = new Map<string, Buffer>();
  const uploads = new Map<string, Upload>();
  const publicWrites: string[] = [];
  let failReceiptOnce = false;
  const s3 = {
    async send(command: any) {
      const { Key, Body, Delete } = command.input;
      switch (command.constructor.name) {
        case "GetObjectCommand": {
          const bytes = objects.get(Key);
          if (!bytes) throw Object.assign(new Error("missing"), { name: "NoSuchKey" });
          return { Body: Readable.from([bytes]) };
        }
        case "PutObjectCommand":
          if (Key.startsWith("published/")) publicWrites.push(Key);
          if (failReceiptOnce && Key.startsWith("tus-finish-receipts/")) {
            failReceiptOnce = false;
            throw new Error("process interrupted before receipt");
          }
          objects.set(Key, Buffer.from(Body));
          return {};
        case "DeleteObjectsCommand":
          for (const { Key: key } of Delete.Objects) objects.delete(key);
          return {};
        default: throw new Error(`Unexpected command ${command.constructor.name}`);
      }
    },
  };
  function freshStore() {
    const store = new GamefolioTusStore(env);
    assert.equal((store.datastore as any).minPartSize, 6 * 1024 * 1024);
    (store as any).s3 = s3;
    (store as any).datastore = {
      async getUpload(id: string) {
        const upload = uploads.get(id);
        if (!upload) throw { status_code: 404 };
        return upload;
      },
      async read(id: string) { return Readable.from([objects.get(id)!]); },
      async remove(id: string) { uploads.delete(id); },
      getExpiration() { return 24 * 60 * 60 * 1000; },
    };
    return store;
  }
  function add(id: string, options: { offset?: number; created?: string } = {}) {
    objects.set(id, Buffer.from("test video"));
    uploads.set(id, new Upload({
      id, size: 10, offset: options.offset ?? 10,
      metadata: { ownerId: "42", filename: "clip.mp4", filetype: "video/mp4" },
      creation_date: options.created ?? new Date().toISOString(),
    }));
  }
  return { objects, uploads, publicWrites, freshStore, add, interruptReceipt() { failReceiptOnce = true; } };
}

async function recover(store: InstanceType<typeof GamefolioTusStore>, id: string, userId = 42) {
  return store.recoverCompletedUpload(id, userId, async (upload) => {
    const staged = await store.stageLocalFile(upload.id);
    try {
      const result = await store.finishUpload(upload.id, userId, "video", staged.path);
      return { status_code: 200, headers: { "Upload-Result": JSON.stringify(result) }, body: JSON.stringify({ success: true, result }) };
    } finally { await staged.release(); }
  });
}

test("completed bytes are finalized on HEAD and fresh processes return the saved result", async () => {
  const remote = backend();
  remote.add("completed");
  const first = await recover(remote.freshStore(), "completed");
  assert.equal(first?.size, 10);
  assert.equal(first?.response.status_code, 200);
  assert.equal(remote.uploads.has("completed"), false);
  const second = await recover(remote.freshStore(), "completed");
  const third = await recover(remote.freshStore(), "completed");
  assert.deepEqual(second, first);
  assert.deepEqual(third, first);
  assert.equal(remote.publicWrites.length, 1, "a lost final response must not publish again");
});

test("interruption after publish but before the receipt retries the same public object", async () => {
  const remote = backend();
  remote.add("interrupted");
  remote.interruptReceipt();
  await assert.rejects(recover(remote.freshStore(), "interrupted"), /interrupted before receipt/);
  assert.equal(remote.uploads.has("interrupted"), true, "source remains until the receipt is durable");
  const result = await recover(remote.freshStore(), "interrupted");
  assert.equal(result?.response.status_code, 200);
  assert.equal(remote.publicWrites.length, 2);
  assert.equal(new Set(remote.publicWrites).size, 1, "recovery must reuse the published key");
  assert.equal([...remote.objects.keys()].filter((key) => key.startsWith("published/")).length, 1);
});

test("recovery rejects a different owner before and after publishing", async () => {
  const remote = backend();
  remote.add("owned");
  await assert.rejects(recover(remote.freshStore(), "owned", 99), /another user/);
  assert.equal(remote.publicWrites.length, 0);
  await recover(remote.freshStore(), "owned");
  await assert.rejects(recover(remote.freshStore(), "owned", 99), /another user/);
  assert.equal(remote.publicWrites.length, 1);
});

test("partial, missing, and expired uploads do not run finalization", async () => {
  const remote = backend();
  remote.add("partial", { offset: 4 });
  remote.add("expired", { created: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString() });
  assert.equal(await recover(remote.freshStore(), "partial"), null);
  assert.equal(await recover(remote.freshStore(), "missing"), null);
  assert.equal(await recover(remote.freshStore(), "expired"), null);
  assert.equal(remote.publicWrites.length, 0);
});

test("the authenticated HEAD route returns the recovery header without calling the tus handler", async () => {
  const source = ts.createSourceFile("upload.ts", readFileSync(new URL("../server/routes/upload.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  let registration: ts.CallExpression | undefined;
  function find(node: ts.Node) {
    if (ts.isCallExpression(node) && node.expression.getText(source) === "router.all"
      && node.arguments[0]?.getText(source) === "'/tus/*'") registration = node;
    ts.forEachChild(node, find);
  }
  find(source);
  assert.ok(registration);
  assert.equal(registration.arguments[1].getText(source), "hybridFullAccess");
  const remote = backend();
  remote.add("head-route");
  const store = remote.freshStore();
  let transportCalls = 0;
  const handler = vm.runInNewContext(ts.transpileModule(`(${registration.arguments[2].getText(source)})`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText, {
    tusStore: store,
    tusOnUploadFinish: async (req: any, upload: Upload) => {
      const staged = await store.stageLocalFile(upload.id);
      try {
        const result = await store.finishUpload(upload.id, req.user.id, "video", staged.path);
        return { status_code: 200, headers: { "Upload-Result": JSON.stringify(result) }, body: "" };
      } finally { await staged.release(); }
    },
    patchResEndForSessionCompat() {},
    tusServer: { handle() { transportCalls += 1; } },
  });
  function response() {
    return {
      headers: {} as Record<string, string>, code: 0, ended: false,
      set(headers: Record<string, string>) { Object.assign(this.headers, headers); return this; },
      append(name: string, value: string) { this.headers[name] = value; return this; },
      status(code: number) { this.code = code; return this; },
      end() { this.ended = true; return this; },
    };
  }
  const first = response();
  await handler({ method: "HEAD", path: "/tus/head-route", user: { id: 42 } }, first, (error: unknown) => { throw error; });
  assert.equal(first.code, 200);
  assert.equal(first.headers["Upload-Offset"], "10");
  assert.equal(first.headers["Upload-Length"], "10");
  assert.equal(first.headers["Tus-Resumable"], "1.0.0");
  assert.match(first.headers["Access-Control-Expose-Headers"], /Upload-Result/);
  assert.ok(JSON.parse(first.headers["Upload-Result"]).url);
  assert.equal(first.ended, true);
  assert.equal(transportCalls, 0);
  const wrongOwner = response();
  await handler({ method: "HEAD", path: "/tus/head-route", user: { id: 99 } }, wrongOwner, (error: unknown) => { throw error; });
  assert.equal(wrongOwner.code, 403);
  assert.equal(transportCalls, 0);
  remote.add("partial-route", { offset: 2 });
  await handler({ method: "HEAD", path: "/tus/partial-route", user: { id: 42 } }, response(), (error: unknown) => { throw error; });
  assert.equal(transportCalls, 1, "partial uploads retain the normal TUS HEAD handler");
});
