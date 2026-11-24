import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  getImpersonationTokenFromLocation,
  isConfirmedImpersonationUser,
} from "../client/src/pages/impersonation-handoff";

test("reads new handoff tokens from the non-transmitted URL fragment", () => {
  assert.equal(getImpersonationTokenFromLocation("", "#token=abc%20123"), "abc 123");
  assert.equal(getImpersonationTokenFromLocation("?token=legacy", "#token=current"), "current");
  assert.equal(getImpersonationTokenFromLocation("?token=legacy", ""), "legacy");
  assert.equal(getImpersonationTokenFromLocation("", ""), null);
});

test("accepts only users with a server-confirmed impersonation marker", () => {
  assert.equal(isConfirmedImpersonationUser({
    id: 42,
    impersonatedBy: { adminId: 1, adminUsername: "admin" },
  }), true);

  assert.equal(isConfirmedImpersonationUser({ id: 1, role: "admin" }), false);
  assert.equal(isConfirmedImpersonationUser({ impersonatedBy: null }), false);
  assert.equal(isConfirmedImpersonationUser({
    impersonatedBy: { adminId: "1", adminUsername: "admin" },
  }), false);
  assert.equal(isConfirmedImpersonationUser(null), false);
});

test("scrubs the handoff token before session storage can fail", () => {
  const source = readFileSync("client/src/pages/ImpersonateSessionPage.tsx", "utf8");
  const adminSource = readFileSync("client/src/pages/AdminPage.tsx", "utf8");
  const scrubIndex = source.indexOf("window.history.replaceState");
  const storageIndex = source.indexOf("sessionStorage.setItem");

  assert.notEqual(scrubIndex, -1);
  assert.notEqual(storageIndex, -1);
  assert.ok(scrubIndex < storageIndex);
  assert.match(adminSource, /\/impersonate-session#token=/);
  assert.doesNotMatch(adminSource, /\/impersonate-session\?token=/);
});
