export type ProEntitlementSnapshot = {
  id: number;
  isPro: boolean;
  isPartner: boolean | null;
  proSubscriptionEndDate: Date | string | null;
  proSubscriptionType: string | null;
  stripeSubscriptionId: string | null;
  revenuecatUserId: string | null;
};

export type ProEntitlementReconciliationDeps = {
  expireIfStillOrphaned: (userId: number, now: Date) => Promise<void>;
  getCurrent: (userId: number) => Promise<ProEntitlementSnapshot | undefined>;
};

export function shouldExpireOrphanedPro(
  user: ProEntitlementSnapshot,
  now: Date,
): boolean {
  return Boolean(
    user.isPro
    && !user.isPartner
    && user.proSubscriptionEndDate
    && new Date(user.proSubscriptionEndDate) <= now
    && !user.stripeSubscriptionId
    && !user.revenuecatUserId
  );
}

export async function reconcileExpiredOrphanedPro(
  user: ProEntitlementSnapshot,
  now: Date,
  deps: ProEntitlementReconciliationDeps,
): Promise<ProEntitlementSnapshot> {
  if (!shouldExpireOrphanedPro(user, now)) {
    return user;
  }

  await deps.expireIfStillOrphaned(user.id, now);

  // Always re-read after the compare-and-set. A provider may have activated
  // after the snapshot was loaded, in which case the guarded write is a no-op.
  return (await deps.getCurrent(user.id)) ?? user;
}