import assert from "node:assert/strict";
import test from "node:test";
import { S3Store } from "@tus/s3-store";
import { FileStore } from "@tus/file-store";
import {
  errorLooksLikeLostTusUpload,
  isLostTusUpload,
  shouldRetryTusStatus,
  withLostUploadRestart,
} from "../client/src/lib/tus-finish-payload";
const lostBody = "The file for this url was not found";

test("a missing tus upload is not retried in place", () => {
  assert.equal(shouldRetryTusStatus(404, lostBody, true), false);
  assert.equal(shouldRetryTusStatus(404, "", true), false);
  assert.equal(isLostTusUpload(404, lostBody), true);
  assert.equal(isLostTusUpload(404, "Cannot POST /api/upload/tus"), false);
  assert.equal(isLostTusUpload(500, lostBody), false);
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
});

test("an expired tus upload restarts once, without retrying unrelated 410 failures", async () => {
  const body = "The file for this url no longer exists\n";
  const expired = Object.assign(new Error(body), {
    originalResponse: { getStatus: () => 410, getBody: () => body },
  });
  assert.equal(isLostTusUpload(410, body), true);
  assert.equal(isLostTusUpload(410, "Resource is gone"), false);
  assert.equal(isLostTusUpload(500, body), false);
  assert.equal(shouldRetryTusStatus(410, body, true), false);
  assert.equal(errorLooksLikeLostTusUpload(new Error(body)), true);
  assert.equal(errorLooksLikeLostTusUpload(Object.assign(new Error(body), { httpStatus: 500 })), false);

  let attempts = 0;
  let restarts = 0;
  assert.equal(await withLostUploadRestart(async () => {
    if (++attempts === 1) throw expired;
    return "published";
  }, () => { restarts += 1; }), "published");
  assert.equal(attempts, 2);
  assert.equal(restarts, 1);

  attempts = 0;
  await assert.rejects(withLostUploadRestart(async () => {
    attempts += 1;
    throw expired;
  }, () => undefined), /no longer exists/);
  assert.equal(attempts, 2);
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

  await disk.remove("upload-that-was-never-written");
});
