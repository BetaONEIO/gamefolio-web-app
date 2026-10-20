import assert from "node:assert/strict";
import test from "node:test";

process.env.DATABASE_URL ??= "postgres://towerdog-test.invalid/towerdog";
process.env.NODE_ENV = "production";

const {
  claimFirstProTransition,
  createTowerdogRewardDecision,
  getTowerdogRewardDecision,
  grantTowerdogMilestoneReward,
  shouldCreateTowerdogProReward,
} = await import("../server/services/towerdog-milestone-rewards");

const walletAddress = `0x${"a".repeat(40)}`;

class Query<T> {
  private valuesSet: any;
  private wantsReturning = false;

  constructor(private readonly execute: (query: Query<T>) => T | Promise<T>) {}

  values(values: any) {
    this.valuesSet = values;
    return this;
  }

  set(values: any) {
    this.valuesSet = values;
    return this;
  }

  onConflictDoNothing() {
    return this;
  }

  from() {
    return this;
  }

  where() {
    return this;
  }

  limit() {
    return this;
  }

  orderBy() {
    return this;
  }

  returning() {
    this.wantsReturning = true;
    return this;
  }

  get insertedValues() {
    return this.valuesSet;
  }

  get returningRequested() {
    return this.wantsReturning;
  }

  then<TResult1 = T, TResult2 = never>(
    onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve(this.execute(this)).then(onfulfilled, onrejected);
  }
}

class DecisionDb {
  rows: any[] = [];

  insert() {
    return new Query((query) => {
      const existing = this.rows.find((row) =>
        row.userId === query.insertedValues.userId &&
        row.eventType === query.insertedValues.eventType,
      );
      if (existing) return [];

      const row = {
        id: `decision-${this.rows.length + 1}`,
        ...query.insertedValues,
        xpAwarded: false,
        attempts: 0,
      };
      this.rows.push(row);
      return [row];
    });
  }

  select() {
    return new Query(() => this.rows.length ? [this.rows[0]] : []);
  }
}

function payout(overrides: Record<string, any> = {}) {
  return {
    id: "payout-1",
    userId: 42,
    eventType: "pro_purchase",
    rewardMode: "wallet",
    xpAmount: 500,
    xpAwarded: true,
    gftAmount: 500,
    walletAddress,
    status: "pending",
    txHash: null,
    signedTransaction: null,
    errorMessage: null,
    retryable: false,
    attempts: 0,
    lastAttemptAt: new Date("2026-09-17T00:00:00.000Z"),
    nextRetryAt: null,
    createdAt: new Date("2026-09-17T00:00:00.000Z"),
    paidAt: null,
    ...overrides,
  };
}

class RewardDb {
  state: any;
  xpHistoryRows = 0;
  totalXp = 0;

  constructor(initial: Record<string, any> = {}) {
    this.state = payout(initial);
  }

  select() {
    return new Query(() => [structuredClone(this.state)]);
  }

  transaction<T>(callback: (tx: this) => Promise<T>) {
    return callback(this);
  }

  insert() {
    return new Query((query) => {
      if (this.xpHistoryRows > 0) return [];
      this.xpHistoryRows += 1;
      return [{ id: 1, values: query.insertedValues }];
    });
  }

  update() {
    return new Query((query) => {
      const values = query.insertedValues || {};

      if ("totalXP" in values) {
        this.totalXp += this.state.xpAmount;
        return [];
      }

      if ("xpAwarded" in values) {
        this.state.xpAwarded = true;
        return [];
      }

      if (values.status === "sending") {
        const now = values.lastAttemptAt as Date;
        const stale = this.state.status === "sending" &&
          this.state.lastAttemptAt &&
          this.state.lastAttemptAt.getTime() <= now.getTime() - 10 * 60 * 1000;
        const retryable = this.state.status === "failed" &&
          this.state.retryable &&
          (!this.state.nextRetryAt || this.state.nextRetryAt <= now);
        const fresh = this.state.status === "pending" && this.state.attempts === 0;
        if (!fresh && !retryable && !stale) return [];

        this.state = {
          ...this.state,
          status: "sending",
          attempts: this.state.attempts + 1,
          lastAttemptAt: now,
          nextRetryAt: null,
        };
        return query.returningRequested ? [structuredClone(this.state)] : [];
      }

      if (values.status === "submitted" && values.txHash) {
        this.state = { ...this.state, ...values };
        return query.returningRequested ? [{ id: this.state.id }] : [];
      }

      if (values.status === "paid") {
        this.state = { ...this.state, ...values };
        return [];
      }

      if (values.status === "failed") {
        this.state = { ...this.state, ...values };
        return [];
      }

      return [];
    });
  }
}

function runtimeFor(
  db: RewardDb,
  transferGfTokens: any,
  getReceiptStatus: any = async () => "success",
  rebroadcast: any = async () => "0xhash",
) {
  return {
    db,
    transferGfTokens,
    getGfTransferReceiptStatus: getReceiptStatus,
    rebroadcastSignedGfTransfer: rebroadcast,
    updateUserLevel: async () => {},
  } as any;
}

async function successfulTransfer(_to: string, _amount: number, options?: any) {
  await options?.onPrepared?.("0xhash", "0xsigned");
  return { success: true, txHash: "0xhash", signedTransaction: "0xsigned" };
}

test("wallet and no-wallet decisions snapshot the 500/500 and 750 XP branches", () => {
  assert.deepEqual(getTowerdogRewardDecision(` ${walletAddress.toUpperCase()} `), {
    rewardMode: "wallet",
    xpAmount: 500,
    gftAmount: 500,
    walletAddress,
    status: "pending",
  });
  assert.deepEqual(getTowerdogRewardDecision(null), {
    rewardMode: "xp_only",
    xpAmount: 750,
    gftAmount: 0,
    walletAddress: null,
    status: "xp_only",
  });
});

test("concurrent Stripe confirmation and webhook claims create one first-Pro decision", async () => {
  const db = new DecisionDb();
  const user = {
    isPro: false,
    proSubscriptionStartDate: null,
    walletAddress,
    originalSignupReferralCode: "TOWER",
  };
  const executor = {
    update: () => new Query((query) => {
      if (user.isPro || user.proSubscriptionStartDate) return [];
      user.isPro = true;
      user.proSubscriptionStartDate = new Date();
      return [{
        walletAddress: user.walletAddress,
        originalSignupReferralCode: user.originalSignupReferralCode,
      }];
    }),
    insert: db.insert.bind(db),
    select: db.select.bind(db),
  };
  const claims = await Promise.all(
    Array.from({ length: 32 }, () =>
      (async () => {
        const firstPro = await claimFirstProTransition(42, { isPro: true }, executor);
        if (!firstPro) return null;
        return createTowerdogRewardDecision(42, "pro_purchase", firstPro.walletAddress, executor);
      })(),
    ),
  );

  assert.equal(db.rows.length, 1);
  assert.equal(new Set(claims.filter(Boolean).map((claim) => claim?.id)).size, 1);
  assert.equal(db.rows[0].xpAmount, 500);
  assert.equal(db.rows[0].gftAmount, 500);
});

test("the first-Pro compare-and-set wins regardless of Stripe/webhook ordering", async () => {
  for (const ordering of ["stripe-confirmation-first", "webhook-first"]) {
    const user = {
      isPro: false,
      proSubscriptionStartDate: null,
      walletAddress,
      originalSignupReferralCode: "TOWER",
    };
    const executor = {
      update: () => new Query((query) => {
        if (user.isPro || user.proSubscriptionStartDate) return [];
        user.isPro = true;
        user.proSubscriptionStartDate = new Date();
        return [{
          walletAddress: user.walletAddress,
          originalSignupReferralCode: user.originalSignupReferralCode,
        }];
      }),
    };

    const [first, second] = await Promise.all([
      claimFirstProTransition(42, { isPro: true }, executor),
      claimFirstProTransition(42, { isPro: true }, executor),
    ]);

    assert.equal([first, second].filter(Boolean).length, 1, ordering);
  }
});

test("RevenueCat sandbox purchases never create a Towerdog Pro reward", () => {
  assert.equal(shouldCreateTowerdogProReward("TOWER", true), false);
  assert.equal(shouldCreateTowerdogProReward("TOWER", false), true);
  assert.equal(shouldCreateTowerdogProReward("OTHER", false), false);
});

test("an event without a wallet eventually completes as 750 XP with no GFT transfer", async () => {
  const db = new RewardDb({
    rewardMode: "xp_only",
    xpAmount: 750,
    gftAmount: 0,
    walletAddress: null,
    status: "xp_only",
    xpAwarded: false,
  });
  let transfers = 0;
  await grantTowerdogMilestoneReward(42, "signup", runtimeFor(
    db,
    async () => {
      transfers += 1;
      return { success: true };
    },
  ));

  assert.equal(db.xpHistoryRows, 1);
  assert.equal(db.totalXp, 750);
  assert.equal(db.state.xpAwarded, true);
  assert.equal(db.state.status, "xp_only");
  assert.equal(transfers, 0);
});

test("concurrent reward delivery awards XP once and broadcasts one GFT transfer", async () => {
  const db = new RewardDb({ xpAwarded: false });
  let releaseTransfer!: () => void;
  const transferReleased = new Promise<void>((resolve) => { releaseTransfer = resolve; });
  let transferStarted!: () => void;
  const transferObserved = new Promise<void>((resolve) => { transferStarted = resolve; });
  let transferCalls = 0;
  const runtime = runtimeFor(db, async (_to: string, _amount: number, options?: any) => {
    transferCalls += 1;
    transferStarted();
    await transferReleased;
    await options?.onPrepared?.("0xhash", "0xsigned");
    return { success: true, txHash: "0xhash", signedTransaction: "0xsigned" };
  });

  const first = grantTowerdogMilestoneReward(42, "pro_purchase", runtime);
  await transferObserved;
  await grantTowerdogMilestoneReward(42, "pro_purchase", runtime);
  releaseTransfer();
  await first;

  assert.equal(db.xpHistoryRows, 1);
  assert.equal(db.totalXp, 500);
  assert.equal(transferCalls, 1);
  assert.equal(db.state.status, "paid");
  assert.equal(db.state.attempts, 1);
});

test("a crash before preparation is retried with the same reward decision", async () => {
  const db = new RewardDb();
  await assert.rejects(() => grantTowerdogMilestoneReward(42, "pro_purchase", runtimeFor(
    db,
    async () => { throw new Error("crash before signing"); },
  )));
  assert.equal(db.state.status, "sending");
  assert.equal(db.state.txHash, null);

  db.state.lastAttemptAt = new Date("2026-09-17T00:00:00.000Z");
  await grantTowerdogMilestoneReward(42, "pro_purchase", runtimeFor(db, successfulTransfer));
  assert.equal(db.state.status, "paid");
  assert.equal(db.state.xpAmount, 500);
  assert.equal(db.state.walletAddress, walletAddress);
});

test("a crash after signed persistence rebroadcasts the same signed transaction", async () => {
  const db = new RewardDb();
  await assert.rejects(() => grantTowerdogMilestoneReward(42, "pro_purchase", runtimeFor(
    db,
    async (_to: string, _amount: number, options?: any) => {
      await options?.onPrepared?.("0xhash", "0xsigned");
      throw new Error("crash after persistence");
    },
  )));
  assert.equal(db.state.status, "submitted");

  let rebroadcasted = "";
  await grantTowerdogMilestoneReward(42, "pro_purchase", runtimeFor(
    db,
    successfulTransfer,
    async () => "pending",
    async (signed: string) => { rebroadcasted = signed; return "0xhash"; },
  ));
  assert.equal(rebroadcasted, "0xsigned");
  assert.equal(db.state.status, "submitted");
});

test("a crash after broadcast is reconciled by hash without a second transfer", async () => {
  const db = new RewardDb();
  let transfers = 0;
  await grantTowerdogMilestoneReward(42, "pro_purchase", runtimeFor(
    db,
    async (_to: string, _amount: number, options?: any) => {
      transfers += 1;
      await options?.onPrepared?.("0xhash", "0xsigned");
      return { success: false, txHash: "0xhash", signedTransaction: "0xsigned", error: "ack lost" };
    },
  ));
  assert.equal(db.state.status, "submitted");

  await grantTowerdogMilestoneReward(42, "pro_purchase", runtimeFor(db, successfulTransfer));
  assert.equal(db.state.status, "paid");
  assert.equal(transfers, 1);
});

test("temporary RPC failure during receipt reconciliation leaves the decision retryable", async () => {
  const db = new RewardDb({ status: "submitted", txHash: "0xhash", signedTransaction: "0xsigned" });
  let receiptCalls = 0;
  const temporarilyUnavailable = async () => {
    receiptCalls += 1;
    if (receiptCalls === 1) throw new Error("RPC unavailable");
    return "success";
  };

  await assert.rejects(() => grantTowerdogMilestoneReward(42, "pro_purchase", runtimeFor(
    db,
    successfulTransfer,
    temporarilyUnavailable,
  )));
  assert.equal(db.state.status, "submitted");
  await grantTowerdogMilestoneReward(42, "pro_purchase", runtimeFor(
    db,
    successfulTransfer,
    temporarilyUnavailable,
  ));
  assert.equal(db.state.status, "paid");
});

test("a reverted transaction retries without changing the original decision", async () => {
  const db = new RewardDb({ status: "submitted", txHash: "0xhash", signedTransaction: "0xsigned" });
  await grantTowerdogMilestoneReward(42, "pro_purchase", runtimeFor(
    db,
    successfulTransfer,
    async () => "reverted",
  ));
  assert.equal(db.state.status, "failed");
  assert.equal(db.state.retryable, true);
  assert.equal(db.state.txHash, null);

  db.state.nextRetryAt = new Date("2026-09-17T00:00:00.000Z");
  await grantTowerdogMilestoneReward(42, "pro_purchase", runtimeFor(db, successfulTransfer));
  assert.equal(db.state.status, "paid");
  assert.equal(db.state.xpAmount, 500);
  assert.equal(db.state.gftAmount, 500);
  assert.equal(db.state.walletAddress, walletAddress);
});

test("a temporarily unavailable send retries without changing the reward decision", async () => {
  const db = new RewardDb();
  await grantTowerdogMilestoneReward(42, "pro_purchase", runtimeFor(
    db,
    async () => ({ success: false, error: "RPC unavailable", retryable: true }),
  ));
  assert.equal(db.state.status, "failed");
  assert.equal(db.state.retryable, true);

  db.state.nextRetryAt = new Date("2026-09-17T00:00:00.000Z");
  await grantTowerdogMilestoneReward(42, "pro_purchase", runtimeFor(db, successfulTransfer));
  assert.equal(db.state.status, "paid");
  assert.equal(db.state.xpAmount, 500);
  assert.equal(db.state.gftAmount, 500);
});