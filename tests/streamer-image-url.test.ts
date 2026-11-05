import assert from "node:assert/strict";
import test from "node:test";
import { canonicalStreamerImageUrl } from "../server/streamer-image-url";

test("makes app-relative streamer images absolute", () => {
  assert.equal(
    canonicalStreamerImageUrl("/api/static/avatar.jpg", "https://app.gamefolio.com"),
    "https://app.gamefolio.com/api/static/avatar.jpg",
  );
});

test("rewrites migrated Supabase public media", () => {
  assert.equal(
    canonicalStreamerImageUrl(
      "https://example.supabase.co/storage/v1/object/public/gamefolio-media/users/42/avatar.jpg",
    ),
    "https://media.gamefolio.com/legacy-supabase/gamefolio-media/users/42/avatar.jpg",
  );
});

test("rejects empty or malformed values", () => {
  assert.equal(canonicalStreamerImageUrl(null), null);
  assert.equal(canonicalStreamerImageUrl("   "), null);
  assert.equal(canonicalStreamerImageUrl("http://[invalid"), null);
});
