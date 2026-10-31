import assert from "node:assert/strict";
import test from "node:test";

import { sanitizeAdminUser, sanitizeAdminUsers } from "../server/admin-user-response";

test("admin user responses never expose password hashes", () => {
  const storedUser = {
    id: 42,
    username: "creator",
    password: "salt:credential-hash",
    email: "creator@example.test",
  };

  assert.deepEqual(sanitizeAdminUser(storedUser), {
    id: 42,
    username: "creator",
    email: "creator@example.test",
  });
  assert.equal(storedUser.password, "salt:credential-hash");
  assert.deepEqual(sanitizeAdminUsers([storedUser]), [{
    id: 42,
    username: "creator",
    email: "creator@example.test",
  }]);
});

test("admin user response sanitising preserves empty results", () => {
  assert.equal(sanitizeAdminUser(null), null);
  assert.equal(sanitizeAdminUser(undefined), undefined);
  assert.deepEqual(sanitizeAdminUsers([]), []);
});
