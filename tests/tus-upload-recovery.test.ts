import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { S3Store } from "@tus/s3-store";
import { FileStore } from "@tus/file-store";
import {
  errorLooksLikeLostTusUpload,
  isLostTusUpload,
  parseFinishConfirmation,
  shouldRetryTusStatus,
  tusFinishUrl,
  withLostUploadRestart,
} from "../client/src/lib/tus-finish-payload";
const lostBody = "The file for this url was not found";
const expiredBody = "The file for this url no longer exists\n";

test("a missing or expired tus upload is not retried in place", () => {
  assert.equal(shouldRetryTusStatus(404, lostBody, true), false);
  assert.equal(shouldRetryTusStatus(404, "", true), false);
  assert.equal(shouldRetryTusStatus(410, expiredBody, true), false);
  assert.equal(isLostTusUpload(404, lostBody), true);
  assert.equal(isLostTusUpload(410, expiredBody), true);
  assert.equal(isLostTusUpload(404, "Cannot POST /api/upload/tus"), false);
  assert.equal(isLostTusUpload(410, "gone"), false);
  assert.equal(isLostTusUpload(500, lostBody), false);
  assert.equal(errorLooksLikeLostTusUpload(new Error(`response text: ${expiredBody}`)), true);
});

test("a lost upload restarts once and keeps any other failure", async () => {
  const lost = Object.assign(new Error(`tus: response code: 404, response text: ${lostBody}`), {
    httpStatus: 404,
    originalResponse: {
      getStatus: () => 404,
      getBody: () => lostBody,
    },
  });
  assert.equal(errorLooksLikeLostTusUpload(lost), true);

  let attempts = 0;
  let restarts = 0;
  const uploaded = await withLostUploadRestart(async () => {
    attempts += 1;
    if (attempts === 1) throw lost;
    return "ok";
  }, () => {
    restarts += 1;
  });
  assert.equal(uploaded, "ok");
  assert.equal(attempts, 2);
  assert.equal(restarts, 1);

  await assert.rejects(
    () => withLostUploadRestart(async () => {
      throw new Error("tier limit");
    }, () => {
      restarts += 1;
    }),
    /tier limit/,
  );
  assert.equal(restarts, 1);

  const expired = Object.assign(new Error(`tus: response code: 410, response text: ${expiredBody}`), {
    originalResponse: {
      getStatus: () => 410,
      getBody: () => expiredBody,
    },
  });
  attempts = 0;
  const restarted = await withLostUploadRestart(async () => {
    attempts += 1;
    if (attempts === 1) throw expired;
    return "fresh";
  }, () => {
    restarts += 1;
  });
  assert.equal(restarted, "fresh");
  assert.equal(attempts, 2);
  assert.equal(restarts, 2);
});

test("a completed upload can be confirmed from its finish URL", () => {
  assert.equal(
    tusFinishUrl("https://app.gamefolio.com/api/upload/tus/abc123"),
    "https://app.gamefolio.com/api/upload/tus/abc123/finish",
  );
  assert.equal(
    tusFinishUrl("/api/upload/tus/abc123"),
    "/api/upload/tus/abc123/finish",
  );
  assert.equal(tusFinishUrl("/api/upload/tus/abc123/../../etc"), null);
  assert.deepEqual(
    parseFinishConfirmation(200, JSON.stringify({
      success: true,
      result: { url: "https://cdn.example/v.mp4", path: "published/v.mp4" },
    })),
    { kind: "result", result: { url: "https://cdn.example/v.mp4", path: "published/v.mp4" } },
  );
  assert.equal(parseFinishConfirmation(410, expiredBody).kind, "lost");
  assert.equal(parseFinishConfirmation(404, lostBody).kind, "lost");
  const limited = parseFinishConfirmation(403, JSON.stringify({ message: "Maximum clip size is 100MB" }));
  assert.equal(limited.kind, "error");
  if (limited.kind === "error") assert.match(limited.message, /Maximum clip size/);
});

test("tus uploads use R2 when it is configured and disk otherwise", async () => {
  process.env.SUPABASE_URL ||= "https://example.supabase.co";
  process.env.SUPABASE_PUBLISHABLE_KEY ||= "public-test-key";
  process.env.SUPABASE_ANON_KEY ||= "public-test-key";
  const { createTusStore, tusBackendFromEnv } = await import("../server/tus-storage");

  assert.equal(tusBackendFromEnv({}), "disk");
  assert.equal(tusBackendFromEnv({
    R2_ACCOUNT_ID: "account",
    R2_ACCESS_KEY_ID: "key",
    R2_SECRET_ACCESS_KEY: "secret",
    R2_BUCKET: "media",
  }), "disk");

  const disk = createTusStore({ NODE_ENV: "test" });
  assert.equal(disk.backend, "disk");
  assert.ok(disk.datastore instanceof FileStore);

  const durable = createTusStore({
    NODE_ENV: "test",
    R2_ACCOUNT_ID: "account",
    R2_ACCESS_KEY_ID: "key",
    R2_SECRET_ACCESS_KEY: "secret",
    R2_BUCKET: "media",
    R2_PUBLIC_BASE_URL: "https://cdn.example",
  });
  assert.equal(durable.backend, "r2");
  assert.ok(durable.datastore instanceof S3Store);
  assert.equal((durable.datastore as S3Store).minPartSize, 6 * 1024 * 1024);

  await disk.remove("upload-that-was-never-written");
  assert.equal(await disk.readFinishResult("../secret"), null);

  const id = "finishresult123";
  const dir = path.join(process.cwd(), "temp", "tus-finish");
  const filePath = path.join(dir, `${id}.json`);
  await fs.mkdir(dir, { recursive: true });
  const stored = { url: "https://cdn.example/v.mp4", path: "published/v.mp4" };
  await fs.writeFile(filePath, JSON.stringify(stored));
  assert.deepEqual(await disk.readFinishResult(id), stored);
  await disk.deleteExpiredFinishResults();
  assert.deepEqual(await disk.readFinishResult(id), stored);

  const expiredAt = new Date(Date.now() - 25 * 60 * 60 * 1000);
  await fs.utimes(filePath, expiredAt, expiredAt);
  await disk.deleteExpiredFinishResults();
  assert.equal(await disk.readFinishResult(id), null);
});
