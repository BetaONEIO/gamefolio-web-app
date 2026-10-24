import assert from "node:assert/strict";
import test from "node:test";

import { publicRegistrationSchema } from "../shared/schema";

test("public registration strips privileged and server-controlled user fields", () => {
  const registration = publicRegistrationSchema.parse({
    username: "public_signup_test",
    password: "Helloworld1!",
    email: "public-signup@example.test",
    displayName: "Public Signup Test",
    dateOfBirth: "2000-01-01",
    isPro: true,
    isPartner: true,
    partnerType: "indie",
    isIndieDevSubscriber: true,
    role: "admin",
    status: "banned",
    emailVerified: true,
    gfTokenBalance: 1_000_000,
    totalXP: 1_000_000,
    level: 999,
    authProvider: "google",
    twoFactorEnabled: true,
    canMintNfts: true,
    canSellNfts: true,
    referralCode: "ATTACKER",
    referredBy: "ATTACKER",
  });

  assert.deepEqual(registration, {
    username: "public_signup_test",
    password: "Helloworld1!",
    email: "public-signup@example.test",
    displayName: "Public Signup Test",
    dateOfBirth: "2000-01-01",
  });
});
