import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { and, eq, sql } from "drizzle-orm";
import { towerdogRewardPayouts, userXPHistory, users } from "@shared/schema";

process.env.DATABASE_URL ??= process.env.TOWERDOG_TEST_DATABASE_URL ?? "postgres://towerdog-test.invalid/towerdog";
process.env.NODE_ENV = "production";

const {
  claimFirstProTransition,
  createTowerdogRewardDecision,
  getTowerdogRewardDecision,
  grantTowerdogMilestoneReward,
  shouldCreateTowerdogProReward,
} = await import("../server/services/towerdog-milestone-rewards");

const walletAddress = `0x${"a".repeat(40)}`;
const testDatabaseUrl = process.env.TOWERDOG_TEST_DATABASE_URL;
const integrationOptions = testDatabaseUrl ? undefined : { skip: "Set TOWERDOG_TEST_DATABASE_URL to run PostgreSQL integration tests" };

test("Towerdog decisions snapshot the wallet and preserve the no-wallet branch", () => {
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
  assert.equal(shouldCreateTowerdogProReward("TOWER", false), true);
  assert.equal(shouldCreateTowerdogProReward("TOWER", true), false);
});

interface IntegrationContext {
  schema: string;
  admin: postgres.Sql;
  connectionA: postgres.Sql;
  connectionB: postgres.Sql;
  dbA: ReturnType<typeof drizzle>;
  dbB: ReturnType<typeof drizzle>;
}

async function createIntegrationContext(): Promise<IntegrationContext> {
  assert(testDatabaseUrl, "TOWERDOG_TEST_DATABASE_URL is required");
  const schema = `towerdog_test_${process.pid}_${Date.now()}`;
  const admin = postgres(testDatabaseUrl, { max: 1 });
  const connectionA = postgres(testDatabaseUrl, { max: 1 });
  const connectionB = postgres(testDatabaseUrl, { max: 1 });

  await admin.unsafe(`CREATE SCHEMA "${schema}"`);
  await admin.unsafe(`SET search_path TO "${schema}"`);
  await admin.unsafe(`
    CREATE TABLE users (
      id integer PRIMARY KEY,
      is_pro boolean NOT NULL DEFAULT false,
      pro_subscription_start_date timestamp,
      wallet_address text,
      original_signup_referral_code text,
      total_xp real NOT NULL DEFAULT 0,
      created_at timestamp NOT NULL DEFAULT now()
    );
    CREATE TABLE user_xp_history (
      id serial PRIMARY KEY,
      user_id integer NOT NULL REFERENCES users(id),
      clip_id integer,
      content_type text,
      content_id integer,
      reactor_id integer,
      dedupe_key text,
      xp_amount integer NOT NULL,
      view_count integer,
      source text NOT NULL,
      description text,
      created_at timestamp NOT NULL DEFAULT now()
    );
    CREATE UNIQUE INDEX user_xp_history_dedupe_key_unique
      ON user_xp_history (dedupe_key) WHERE dedupe_key IS NOT NULL;
  `);
  await admin.unsafe(await readFile("migrations/0029_add_towerdog_milestone_rewards.sql", "utf8"));
  await connectionA.unsafe(`SET search_path TO "${schema}"`);
  await connectionB.unsafe(`SET search_path TO "${schema}"`);

  return {
    schema,
    admin,
    connectionA,
    connectionB,
    dbA: drizzle(connectionA),
    dbB: drizzle(connectionB),
  };
}

async function destroyIntegrationContext(context: IntegrationContext): Promise<void> {
  await context.admin.unsafe(`DROP SCHEMA "${context.schema}" CASCADE`);
  await Promise.all([
    context.connectionA.end(),
    context.connectionB.end(),
    context.admin.end(),
  ]);
}

function runtimeFor(database: IntegrationContext["dbA"], overrides: Record<string, unknown> = {}) {
  return {
    db: database,
    transferGfTokens: async () => ({ success: true, txHash: "0xunused" }),
    getGfTransferReceiptStatus: async () => "pending" as const,
    rebroadcastSignedGfTransfer: async (signedTransaction: string) => signedTransaction,
    updateUserLevel: async () => {},
    ...overrides,
  } as any;
}

async function insertTestUser(connection: postgres.Sql, id: number, wallet: string | null = null): Promise<void> {
  await connection`
    INSERT INTO users (id, wallet_address, original_signup_referral_code, total_xp)
    VALUES (${id}, ${wallet}, 'TOWER', 0)
  `;
}

test("the migration's unique indexes and check constraints hold in PostgreSQL", integrationOptions, async () => {
  const context = await createIntegrationContext();
  try {
    await insertTestUser(context.connectionA, 1, walletAddress);

    const [firstDecision] = await Promise.all([
      createTowerdogRewardDecision(1, "signup", walletAddress, context.dbA),
      createTowerdogRewardDecision(1, "signup", walletAddress, context.dbB),
    ]);
    const [decisionCount] = await context.dbA
      .select({ count: sql<number>`count(*)` })
      .from(towerdogRewardPayouts);

    assert.equal(Number(decisionCount.count), 1);
    assert.ok(firstDecision);
    await assert.rejects(
      context.admin.unsafe(`
        INSERT INTO "${context.schema}".towerdog_reward_payouts
          (user_id, event_type, reward_mode, xp_amount, gft_amount, wallet_address)
        VALUES (1, 'signup', 'wallet', 750, 0, NULL)
      `),
      /towerdog_reward_payouts_reward_combination_check/,
    );
  } finally {
    await destroyIntegrationContext(context);
  }
});

test("concurrent XP delivery uses the real dedupe index and one totalXP update", integrationOptions, async () => {
  const context = await createIntegrationContext();
  try {
    await insertTestUser(context.connectionA, 2);
    await createTowerdogRewardDecision(2, "signup", null, context.dbA);

    await Promise.all([
      grantTowerdogMilestoneReward(2, "signup", runtimeFor(context.dbA)),
      grantTowerdogMilestoneReward(2, "signup", runtimeFor(context.dbB)),
    ]);

    const [history] = await context.dbA
      .select({ count: sql<number>`count(*)` })
      .from(userXPHistory)
      .where(eq(userXPHistory.dedupeKey, "towerdog_milestone:signup:2"));
    const [user] = await context.dbA
      .select({ totalXP: users.totalXP })
      .from(users)
      .where(eq(users.id, 2));

    assert.equal(Number(history.count), 1);
    assert.equal(Number(user.totalXP), 750);
  } finally {
    await destroyIntegrationContext(context);
  }
});

test("first-Pro compare-and-set returns one winner across separate PostgreSQL connections", integrationOptions, async () => {
  const context = await createIntegrationContext();
  try {
    await insertTestUser(context.connectionA, 3, walletAddress);

    const [first, second] = await Promise.all([
      claimFirstProTransition(3, { isPro: true, proSubscriptionStartDate: new Date() }, context.dbA),
      claimFirstProTransition(3, { isPro: true, proSubscriptionStartDate: new Date() }, context.dbB),
    ]);

    assert.equal([first, second].filter(Boolean).length, 1);
    const [user] = await context.dbA
      .select({ isPro: users.isPro })
      .from(users)
      .where(eq(users.id, 3));
    assert.equal(user.isPro, true);
  } finally {
    await destroyIntegrationContext(context);
  }
});

test("signed transaction recovery and status CAS survive separate connections", integrationOptions, async () => {
  const context = await createIntegrationContext();
  try {
    await insertTestUser(context.connectionA, 4, walletAddress);
    await createTowerdogRewardDecision(4, "pro_purchase", walletAddress, context.dbA);

    const crashAfterPrepare = runtimeFor(context.dbA, {
      transferGfTokens: (async (
        _to: string,
        _amount: number,
        options?: { onPrepared?: (hash: string, signed: string) => Promise<void> },
      ) => {
        await options?.onPrepared?.("0x" + "b".repeat(64), "0xsigned-towerdog");
        throw new Error("simulated process crash after durable preparation");
      }) as any,
    });
    await assert.rejects(
      grantTowerdogMilestoneReward(4, "pro_purchase", crashAfterPrepare),
      /simulated process crash/,
    );

    const [persisted] = await context.dbB
      .select({
        status: towerdogRewardPayouts.status,
        txHash: towerdogRewardPayouts.txHash,
        signedTransaction: towerdogRewardPayouts.signedTransaction,
      })
      .from(towerdogRewardPayouts)
      .where(and(
        eq(towerdogRewardPayouts.userId, 4),
        eq(towerdogRewardPayouts.eventType, "pro_purchase"),
      ));
    assert.equal(persisted.status, "submitted");
    assert.equal(persisted.signedTransaction, "0xsigned-towerdog");

    const rebroadcasts: string[] = [];
    await grantTowerdogMilestoneReward(4, "pro_purchase", runtimeFor(context.dbB, {
      rebroadcastSignedGfTransfer: async (signed: string) => {
        rebroadcasts.push(signed);
        return "0x" + "b".repeat(64);
      },
    }));
    assert.deepEqual(rebroadcasts, ["0xsigned-towerdog"]);

    const successfulReceipt = runtimeFor(context.dbA, {
      getGfTransferReceiptStatus: async () => "success" as const,
    });
    await Promise.all([
      grantTowerdogMilestoneReward(4, "pro_purchase", successfulReceipt),
      grantTowerdogMilestoneReward(4, "pro_purchase", runtimeFor(context.dbB, {
        getGfTransferReceiptStatus: async () => "success" as const,
      })),
    ]);

    const [recovered] = await context.dbB
      .select({
        status: towerdogRewardPayouts.status,
        txHash: towerdogRewardPayouts.txHash,
      })
      .from(towerdogRewardPayouts)
      .where(eq(towerdogRewardPayouts.userId, 4));
    assert.equal(recovered.status, "paid");
    assert.equal(recovered.txHash, "0x" + "b".repeat(64));
  } finally {
    await destroyIntegrationContext(context);
  }
});