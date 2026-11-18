import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { stripIndieProfileSecrets } from "../server/lib/sanitize-indie-profile";
import { toPublicUser } from "../server/lib/public-user";
import {
  stripPublicUserSecrets,
  stripUserCredentials,
  stripUsersCredentials,
} from "../server/lib/sanitize-user";

const storedUser = {
  id: 42,
  username: "creator",
  email: "creator@example.test",
  birthday: "04-12",
  ageRange: "25-34",
  authProvider: "local",
  lastLoginAt: new Date("2026-11-18T00:00:00.000Z"),
  totalLoginTime: 120,
  walletAddress: "0x123",
  proSubscriptionType: "monthly",
  twoFactorEnabled: true,
  isPro: true,
  password: "salt:credential-hash",
  twoFactorSecret: "encrypted-totp-secret",
  encryptedPrivateKey: "encrypted-wallet-key",
  twitchAccessToken: "twitch-token",
  kickAccessToken: "kick-token",
};

test("owner user responses remove every authentication credential", () => {
  assert.deepEqual(stripUserCredentials(storedUser), {
    id: 42,
    username: "creator",
    email: "creator@example.test",
    birthday: "04-12",
    ageRange: "25-34",
    authProvider: "local",
    lastLoginAt: new Date("2026-11-18T00:00:00.000Z"),
    totalLoginTime: 120,
    walletAddress: "0x123",
    proSubscriptionType: "monthly",
    twoFactorEnabled: true,
    isPro: true,
  });
  assert.equal(storedUser.password, "salt:credential-hash");
});

test("user credential sanitising supports lists and empty values", () => {
  assert.deepEqual(stripUsersCredentials([storedUser]), [stripUserCredentials(storedUser)]);
  assert.equal(stripUserCredentials(null), null);
  assert.equal(stripUserCredentials(undefined), undefined);
  assert.deepEqual(stripUsersCredentials([]), []);
});

test("public indie profiles never expose the stored itch.io credential", () => {
  const storedProfile = {
    id: 7,
    gameName: "Safe Game",
    itchUsername: "safe-studio",
    itchApiKey: "encrypted-itch-key",
  };

  assert.deepEqual(stripIndieProfileSecrets(storedProfile), {
    id: 7,
    gameName: "Safe Game",
    itchUsername: "safe-studio",
  });
  assert.equal(storedProfile.itchApiKey, "encrypted-itch-key");
});

test("nested public users use an allow-list instead of leaking private columns", () => {
  const publicUser = toPublicUser(storedUser);

  assert.equal(publicUser.id, storedUser.id);
  assert.equal(publicUser.username, storedUser.username);
  assert.equal(publicUser.password, undefined);
  assert.equal(publicUser.email, undefined);
  assert.equal(publicUser.twoFactorSecret, undefined);
  assert.equal(publicUser.encryptedPrivateKey, undefined);
  assert.equal(publicUser.twitchAccessToken, undefined);
  assert.equal(publicUser.kickAccessToken, undefined);
  assert.equal(publicUser.ageRange, undefined);
  assert.equal(publicUser.authProvider, undefined);
  assert.equal(publicUser.lastLoginAt, undefined);
  assert.equal(publicUser.totalLoginTime, undefined);
  assert.equal(publicUser.proSubscriptionType, undefined);
  assert.equal(publicUser.twoFactorEnabled, undefined);
});

test("full public profiles remove internal account and subscription metadata", () => {
  const publicProfile = stripPublicUserSecrets(storedUser);

  assert.equal(publicProfile.id, storedUser.id);
  assert.equal(publicProfile.username, storedUser.username);
  assert.equal(publicProfile.isPro, true);
  assert.equal(publicProfile.password, undefined);
  assert.equal(publicProfile.email, undefined);
  assert.equal(publicProfile.ageRange, undefined);
  assert.equal(publicProfile.authProvider, undefined);
  assert.equal(publicProfile.lastLoginAt, undefined);
  assert.equal(publicProfile.totalLoginTime, undefined);
  assert.equal(publicProfile.walletAddress, undefined);
  assert.equal(publicProfile.proSubscriptionType, undefined);
  assert.equal(publicProfile.twoFactorEnabled, undefined);
});

test("public and admin route wiring keeps full user rows behind projections", () => {
  const routes = readFileSync("server/routes.ts", "utf8");
  const adminRoutes = readFileSync("server/routes/admin.ts", "utf8");
  const authRoutes = readFileSync("server/routes/auth-routes.ts", "utf8");
  const tokenAuthRoutes = readFileSync("server/routes/token-auth.ts", "utf8");

  assert.doesNotMatch(routes, /SENSITIVE_USER_FIELDS/);
  assert.doesNotMatch(routes, /map\(stripUserSecrets\)/);
  assert.equal((routes.match(/toPublicUser\(entry\.user\)/g) ?? []).length, 2);
  assert.match(routes, /stripUserSecrets\(getMacUserWithStats\(\)\)/);
  assert.match(routes, /stripUserSecrets\(getDemoUserWithStats\(\)\)/);
  assert.equal((adminRoutes.match(/sanitizeAdminUser\(claim\.user\)/g) ?? []).length, 2);
  assert.ok((routes.match(/stripUserCredentials\(/g) ?? []).length >= 19);
  assert.ok((tokenAuthRoutes.match(/stripUserCredentials\(/g) ?? []).length >= 7);
  assert.ok((authRoutes.match(/stripUserCredentials\(/g) ?? []).length >= 2);
  assert.ok((routes.match(/stripIndieProfileSecrets\(/g) ?? []).length >= 9);
  assert.doesNotMatch(authRoutes, /auth\/debug-tokens/);
});
