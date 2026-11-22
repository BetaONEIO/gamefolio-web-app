import assert from "node:assert/strict";
import test from "node:test";
import { supabaseConfig } from "../server/supabase-config";
import { mediaUploadError } from "../server/services/media-upload-error";

test("current API keys take precedence over disabled legacy credentials", () => {
  const config = supabaseConfig({
    SUPABASE_URL: "https://project.supabase.co",
    SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
    SUPABASE_SECRET_KEY: "sb_secret_test",
    SUPABASE_ANON_KEY: "legacy-anon",
    SUPABASE_SERVICE_ROLE_KEY: "legacy-service",
  });
  assert.equal(config.publicKey, "sb_publishable_test");
  assert.equal(config.secretKey, "sb_secret_test");
});

test("legacy deployments and neutral hosting aliases remain supported", () => {
  assert.deepEqual(supabaseConfig({ STORAGE_SUPABASE_URL: "https://project.supabase.co", STORAGE_SUPABASE_ANON_KEY: "anon", SUPABASE_SERVICE_ROLE_KEY: "service" }), {
    url: "https://project.supabase.co", publicKey: "anon", secretKey: "service",
  });
  assert.equal(supabaseConfig({STORAGE_SUPABASE_PUBLISHABLE_KEY: "publishable"}).publicKey, "publishable");
  assert.equal(supabaseConfig({STORAGE_SUPABASE_SECRET_KEY: "secret"}).secretKey, "secret");
});

test("storage configuration failures do not blame the image or disclose provider details in production", () => {
  const error = new Error("Legacy API keys are disabled");
  const production = mediaUploadError(error);
  assert.equal(production.status, 503);
  assert.equal(production.code, "MEDIA_STORAGE_NOT_CONFIGURED");
  assert.match(production.message, /not been saved/);
  assert.doesNotMatch(production.message, /Supabase|API key/);
  assert.match(mediaUploadError(error, true).message, /Update the local Supabase API keys/);
  assert.equal(mediaUploadError({message:"Invalid API key"}).status, 503);
});

test("unrelated upload failures stay generic and do not leak their exception messages", () => {
  const result = mediaUploadError(new Error("private connection details"), true);
  assert.equal(result.status, 500);
  assert.equal(result.code, "BANNER_UPLOAD_FAILED");
  assert.doesNotMatch(result.message, /private connection/);
});
