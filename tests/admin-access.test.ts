import assert from "node:assert/strict";
import test from "node:test";

import { hasAdminAccess } from "../server/admin-access";

test("recognises session users with the admin role", () => {
  assert.equal(hasAdminAccess({ role: "admin" }), true);
});

test("recognises token users with the legacy isAdmin flag", () => {
  assert.equal(hasAdminAccess({ isAdmin: true }), true);
});

test("rejects non-admin and missing users", () => {
  assert.equal(hasAdminAccess({ role: "moderator" }), false);
  assert.equal(hasAdminAccess({ role: "user", isAdmin: false }), false);
  assert.equal(hasAdminAccess(null), false);
});
