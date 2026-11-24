import { test } from "node:test";
import assert from "node:assert/strict";
import { DB_POOL_LIMITS } from "../server/db-pool-limits";

test("preview and published app pools fit within the 15-client session limit", () => {
  const perInstance = Object.values(DB_POOL_LIMITS).reduce((sum, limit) => sum + limit, 0);
  assert.ok(perInstance * 2 < 15, `Two instances need ${perInstance * 2} connections`);
});