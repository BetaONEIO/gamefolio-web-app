import assert from "node:assert/strict";
import test from "node:test";
import {
  reconcileExpiredOrphanedPro,
  shouldExpireOrphanedPro,
  type ProEntitlementSnapshot,
} from "../server/services/pro-entitlement-reconciliation";

const now = new Date("2026-09-09T12:00:00.000Z");

function entitlement(
  overrides: Partial<ProEntitlementSnapshot> = {},
): ProEntitlementSnapshot {
  return {
    id: 42,
    isPro: true,
    isPartner: false,
    proSubscriptionEndDate: new Date("2026-09-08T12:00:00.000Z"),
    proSubscriptionType: "monthly",
    stripeSubscriptionId: null,
    revenuecatUserId: null,
    ...overrides,
  };
}

test("expired providerless non-partner Pro access is reconciled", async () => {
  let current = entitlement();
  let expiryAttempts = 0;

  const result = await reconcileExpiredOrphanedPro(current, now, {
    expireIfStillOrphaned: async () => {
      expiryAttempts += 1;
      current = { ...current, isPro: false, proSubscriptionType: null };
    },
    getCurrent: async () => current,
  });

  assert.equal(expiryAttempts, 1);
  assert.equal(result.isPro, false);
  assert.equal(result.proSubscriptionType, null);
});

test("future paid-through cancellation keeps access until its end date", async () => {
  const current = entitlement({
    proSubscriptionEndDate: new Date("2026-10-09T12:00:00.000Z"),
  });
  let expiryAttempts = 0;

  const result = await reconcileExpiredOrphanedPro(current, now, {
    expireIfStillOrphaned: async () => { expiryAttempts += 1; },
    getCurrent: async () => undefined,
  });

  assert.equal(expiryAttempts, 0);
  assert.equal(result, current);
  assert.equal(result.isPro, true);
});

test("protected Pro entitlement sources are never expired", () => {
  const protectedEntitlements = [
    entitlement({ isPartner: true }),
    entitlement({ stripeSubscriptionId: "sub_123" }),
    entitlement({ revenuecatUserId: "gamefolio_42" }),
    entitlement({ proSubscriptionEndDate: null }),
  ];

  for (const current of protectedEntitlements) {
    assert.equal(shouldExpireOrphanedPro(current, now), false);
  }
});

test("concurrent provider activation cannot be overwritten by expiry reconciliation", async () => {
  let current = entitlement();

  const result = await reconcileExpiredOrphanedPro(current, now, {
    expireIfStillOrphaned: async () => {
      // Models the database compare-and-set losing the race to a provider
      // activation: its guarded WHERE no longer matches, so no expiry occurs.
      current = {
        ...current,
        stripeSubscriptionId: "sub_activated_concurrently",
        proSubscriptionEndDate: new Date("2026-10-09T12:00:00.000Z"),
      };
    },
    getCurrent: async () => current,
  });

  assert.equal(result.isPro, true);
  assert.equal(result.stripeSubscriptionId, "sub_activated_concurrently");
});