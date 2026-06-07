import admin from "firebase-admin";
import { storage } from "./storage";
import type { PushToken } from "@shared/schema";

let initialized = false;
let initFailedReason: string | null = null;

function getServiceAccount(): admin.ServiceAccount | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return {
      projectId: parsed.project_id,
      clientEmail: parsed.client_email,
      privateKey: parsed.private_key?.replace(/\\n/g, "\n"),
    };
  } catch (err) {
    initFailedReason = `FIREBASE_SERVICE_ACCOUNT_JSON is set but failed to parse: ${(err as Error).message}`;
    return null;
  }
}

function ensureInitialized(): boolean {
  if (initialized) return true;
  if (admin.apps.length > 0) {
    initialized = true;
    return true;
  }
  const credentials = getServiceAccount();
  if (!credentials) {
    if (!initFailedReason) {
      initFailedReason = "FIREBASE_SERVICE_ACCOUNT_JSON not set — push notifications disabled";
    }
    return false;
  }
  try {
    admin.initializeApp({ credential: admin.credential.cert(credentials) });
    initialized = true;
    console.log("[push] firebase-admin initialised");
    return true;
  } catch (err) {
    initFailedReason = `firebase-admin init failed: ${(err as Error).message}`;
    console.error(initFailedReason);
    return false;
  }
}

export function isPushEnabled(): boolean {
  return ensureInitialized();
}

export function pushDisabledReason(): string | null {
  return initFailedReason;
}

export interface SendOptions {
  title: string;
  body: string;
  actionUrl?: string | null;
  data?: Record<string, string>;
}

export interface SendResult {
  recipientCount: number;
  successCount: number;
  failureCount: number;
  removedTokens: number;
}

// FCM HTTP v1 sendEachForMulticast caps at 500 tokens per call.
const FCM_BATCH_SIZE = 500;

async function sendBatch(tokens: string[], opts: SendOptions): Promise<{
  successCount: number;
  failureCount: number;
  invalidTokens: string[];
}> {
  if (tokens.length === 0) return { successCount: 0, failureCount: 0, invalidTokens: [] };

  const data: Record<string, string> = { ...(opts.data ?? {}) };
  if (opts.actionUrl) data.actionUrl = opts.actionUrl;

  const message: admin.messaging.MulticastMessage = {
    tokens,
    notification: { title: opts.title, body: opts.body },
    data,
    android: {
      priority: "high",
      notification: { sound: "default", channelId: "default" },
    },
    apns: {
      headers: { "apns-priority": "10" },
      payload: {
        aps: { sound: "default", badge: 1, "content-available": 1 },
      },
    },
  };

  const response = await admin.messaging().sendEachForMulticast(message);
  const invalidTokens: string[] = [];
  response.responses.forEach((r, i) => {
    if (!r.success && r.error) {
      const code = r.error.code;
      if (
        code === "messaging/registration-token-not-registered" ||
        code === "messaging/invalid-registration-token" ||
        code === "messaging/invalid-argument"
      ) {
        invalidTokens.push(tokens[i]);
      } else {
        console.warn(`[push] send error for token ${tokens[i].slice(0, 12)}…: ${code}`);
      }
    }
  });

  return {
    successCount: response.successCount,
    failureCount: response.failureCount,
    invalidTokens,
  };
}

async function sendToTokenRows(rows: PushToken[], opts: SendOptions): Promise<SendResult> {
  if (!ensureInitialized() || rows.length === 0) {
    return {
      recipientCount: rows.length,
      successCount: 0,
      failureCount: rows.length,
      removedTokens: 0,
    };
  }

  // Dedupe by token to avoid sending the same notification twice if the DB
  // somehow accumulates duplicates.
  const seen = new Set<string>();
  const tokens = rows.filter(r => {
    if (seen.has(r.token)) return false;
    seen.add(r.token);
    return true;
  }).map(r => r.token);

  let successCount = 0;
  let failureCount = 0;
  const invalid: string[] = [];

  for (let i = 0; i < tokens.length; i += FCM_BATCH_SIZE) {
    const batch = tokens.slice(i, i + FCM_BATCH_SIZE);
    try {
      const result = await sendBatch(batch, opts);
      successCount += result.successCount;
      failureCount += result.failureCount;
      invalid.push(...result.invalidTokens);
    } catch (err) {
      console.error("[push] batch send failed:", err);
      failureCount += batch.length;
    }
  }

  let removed = 0;
  if (invalid.length > 0) {
    try {
      removed = await storage.removeStalePushTokens(invalid);
    } catch (err) {
      console.warn("[push] failed to remove stale tokens:", err);
    }
  }

  return { recipientCount: tokens.length, successCount, failureCount, removedTokens: removed };
}

export async function sendPushToUser(userId: number, opts: SendOptions): Promise<SendResult> {
  if (!ensureInitialized()) {
    return { recipientCount: 0, successCount: 0, failureCount: 0, removedTokens: 0 };
  }
  const rows = await storage.getPushTokensByUserIds([userId]);
  return sendToTokenRows(rows, opts);
}

export async function sendPushToUsers(userIds: number[], opts: SendOptions): Promise<SendResult> {
  if (!ensureInitialized() || userIds.length === 0) {
    return { recipientCount: 0, successCount: 0, failureCount: 0, removedTokens: 0 };
  }
  const rows = await storage.getPushTokensByUserIds(userIds);
  return sendToTokenRows(rows, opts);
}

export async function sendPushToAll(opts: SendOptions): Promise<SendResult> {
  if (!ensureInitialized()) {
    return { recipientCount: 0, successCount: 0, failureCount: 0, removedTokens: 0 };
  }
  const rows = await storage.getAllPushTokens();
  return sendToTokenRows(rows, opts);
}

export async function sendPushToRole(role: string, opts: SendOptions): Promise<SendResult> {
  if (!ensureInitialized()) {
    return { recipientCount: 0, successCount: 0, failureCount: 0, removedTokens: 0 };
  }
  const rows = await storage.getPushTokensByRole(role);
  return sendToTokenRows(rows, opts);
}

export async function sendPushToProUsers(opts: SendOptions): Promise<SendResult> {
  if (!ensureInitialized()) {
    return { recipientCount: 0, successCount: 0, failureCount: 0, removedTokens: 0 };
  }
  const rows = await storage.getPushTokensForProUsers();
  return sendToTokenRows(rows, opts);
}
