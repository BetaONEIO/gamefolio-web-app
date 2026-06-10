import { Router, Request, Response, NextFunction } from "express";
import { createHmac, timingSafeEqual } from "crypto";
import { eq, and, desc } from "drizzle-orm";
import { db } from "../db";
import { storage } from "../storage";
import { liveStreams, users, type LiveStream } from "@shared/schema";
import { hybridAuth } from "../middleware/hybrid-auth";
import {
  isCloudflareStreamConfigured,
  createLiveInput,
  deleteLiveInput,
  getLiveInputStatus,
  iframeUrl,
  hlsUrl,
} from "../services/cloudflare-stream";

const router = Router();

/**
 * Reconcile a stream row's stored status against Cloudflare's real-time state,
 * persisting any change. This is the webhook-free path: the connect/disconnect
 * webhook still works in production, but reading status on demand means the app
 * reflects live/idle even when the webhook can't be delivered (e.g. localhost).
 */
async function withLiveStatus(row: LiveStream): Promise<LiveStream> {
  if (!isCloudflareStreamConfigured()) return row;
  const live = await getLiveInputStatus(row.liveInputId);
  if (!live || live === row.status) return row;
  const patch =
    live === "live"
      ? { status: "live", startedAt: row.startedAt ?? new Date(), lastLiveAt: new Date(), updatedAt: new Date() }
      : { status: "idle", updatedAt: new Date() };
  const [updated] = await db
    .update(liveStreams)
    .set(patch)
    .where(eq(liveStreams.id, row.id))
    .returning();
  return updated ?? ({ ...row, ...patch } as LiveStream);
}

function userId(req: Request): number | undefined {
  return (req as any).user?.id;
}

/** Gate to Streamer Partners (users.isPartner). Runs after hybridAuth. */
async function requirePartner(req: Request, res: Response, next: NextFunction) {
  const id = userId(req);
  if (!id) return res.status(401).json({ error: "Not authenticated" });
  const user = await storage.getUser(id);
  if (!user) return res.status(401).json({ error: "Not authenticated" });
  if (!user.isPartner) {
    return res
      .status(403)
      .json({ error: "Live streaming is available to Streamer Partners only." });
  }
  (req as any).partnerUser = user;
  next();
}

function ensureConfigured(res: Response): boolean {
  if (!isCloudflareStreamConfigured()) {
    res.status(503).json({
      error:
        "Streaming is not configured on the server (Cloudflare Stream env missing).",
    });
    return false;
  }
  return true;
}

/** Owner view — includes the OBS ingest URL + stream key (secrets). */
function ownerView(s: LiveStream) {
  return {
    id: s.id,
    status: s.status,
    title: s.title,
    viewerCount: s.viewerCount,
    startedAt: s.startedAt,
    playbackId: s.playbackId,
    ingestUrl: s.ingestUrl, // SECRET — owner only
    streamKey: s.streamKey, // SECRET — owner only
    playerUrl: safeIframeUrl(s.playbackId),
    hlsUrl: safeHlsUrl(s.playbackId),
  };
}

/** Public view — playback only, NEVER the ingest URL or stream key. */
function publicView(s: LiveStream, user?: { username: string; displayName: string; avatarUrl: string | null }) {
  return {
    status: s.status,
    title: s.title,
    viewerCount: s.viewerCount,
    startedAt: s.startedAt,
    playbackId: s.playbackId,
    playerUrl: safeIframeUrl(s.playbackId),
    hlsUrl: safeHlsUrl(s.playbackId),
    user: user
      ? {
          username: user.username,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
        }
      : undefined,
  };
}

function safeIframeUrl(playbackId: string): string | null {
  try {
    return iframeUrl(playbackId);
  } catch {
    return null;
  }
}
function safeHlsUrl(playbackId: string): string | null {
  try {
    return hlsUrl(playbackId);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Owner endpoints
// ---------------------------------------------------------------------------

/**
 * Provision (or return) the caller's live input. Idempotent: one input per user.
 * Returns the OBS ingest URL + stream key so the partner can paste them into OBS.
 */
router.post(
  "/api/streams/live-input",
  hybridAuth,
  requirePartner,
  async (req: Request, res: Response) => {
    if (!ensureConfigured(res)) return;
    const id = userId(req)!;
    try {
      const existing = await db
        .select()
        .from(liveStreams)
        .where(eq(liveStreams.userId, id))
        .limit(1);
      if (existing.length) {
        return res.json(ownerView(existing[0]));
      }

      const user = (req as any).partnerUser;
      const input = await createLiveInput(`gamefolio:${user.username} (#${id})`);
      const [row] = await db
        .insert(liveStreams)
        .values({
          userId: id,
          provider: "cloudflare",
          liveInputId: input.liveInputId,
          playbackId: input.playbackId,
          ingestUrl: input.ingestUrl,
          streamKey: input.streamKey,
          status: "idle",
        })
        .returning();
      return res.status(201).json(ownerView(row));
    } catch (err: any) {
      console.error("[streams] provision failed:", err?.message || err);
      return res.status(500).json({ error: "Failed to provision live stream." });
    }
  },
);

/** Rotate the stream key (delete + recreate the Cloudflare live input). */
router.post(
  "/api/streams/rotate-key",
  hybridAuth,
  requirePartner,
  async (req: Request, res: Response) => {
    if (!ensureConfigured(res)) return;
    const id = userId(req)!;
    try {
      const [existing] = await db
        .select()
        .from(liveStreams)
        .where(eq(liveStreams.userId, id))
        .limit(1);
      if (!existing) return res.status(404).json({ error: "No live stream to rotate." });

      const user = (req as any).partnerUser;
      const input = await createLiveInput(`gamefolio:${user.username} (#${id})`);
      const [row] = await db
        .update(liveStreams)
        .set({
          liveInputId: input.liveInputId,
          playbackId: input.playbackId,
          ingestUrl: input.ingestUrl,
          streamKey: input.streamKey,
          status: "idle",
          updatedAt: new Date(),
        })
        .where(eq(liveStreams.userId, id))
        .returning();

      // Best-effort cleanup of the old input.
      deleteLiveInput(existing.liveInputId).catch((e) =>
        console.warn("[streams] old live input cleanup failed:", e?.message),
      );
      return res.json(ownerView(row));
    } catch (err: any) {
      console.error("[streams] rotate failed:", err?.message || err);
      return res.status(500).json({ error: "Failed to rotate stream key." });
    }
  },
);

/** The caller's own stream (with secrets), or null if none provisioned yet. */
router.get("/api/streams/me", hybridAuth, async (req: Request, res: Response) => {
  const id = userId(req);
  if (!id) return res.status(401).json({ error: "Not authenticated" });
  const [row] = await db
    .select()
    .from(liveStreams)
    .where(eq(liveStreams.userId, id))
    .limit(1);
  if (!row) return res.json(null);
  return res.json(ownerView(await withLiveStatus(row)));
});

/** Update broadcast title. */
router.patch(
  "/api/streams/me",
  hybridAuth,
  requirePartner,
  async (req: Request, res: Response) => {
    const id = userId(req)!;
    const title = typeof req.body?.title === "string" ? req.body.title.slice(0, 140) : null;
    const [row] = await db
      .update(liveStreams)
      .set({ title, updatedAt: new Date() })
      .where(eq(liveStreams.userId, id))
      .returning();
    if (!row) return res.status(404).json({ error: "No live stream provisioned." });
    return res.json(ownerView(row));
  },
);

// ---------------------------------------------------------------------------
// Public endpoints (no secrets)
// ---------------------------------------------------------------------------

/** "Live now" — partners currently broadcasting. */
router.get("/api/streams/live", async (_req: Request, res: Response) => {
  const rows = await db
    .select({
      stream: liveStreams,
      username: users.username,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
    })
    .from(liveStreams)
    .innerJoin(users, eq(users.id, liveStreams.userId))
    .where(eq(liveStreams.status, "live"))
    .orderBy(desc(liveStreams.startedAt));
  return res.json(
    rows.map((r) =>
      publicView(r.stream, {
        username: r.username,
        displayName: r.displayName,
        avatarUrl: r.avatarUrl,
      }),
    ),
  );
});

/** A single partner's stream by username (playback only). */
router.get("/api/streams/u/:username", async (req: Request, res: Response) => {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.username, req.params.username))
    .limit(1);
  if (!user) return res.status(404).json({ error: "Not found" });
  const [row] = await db
    .select()
    .from(liveStreams)
    .where(eq(liveStreams.userId, user.id))
    .limit(1);
  if (!row) return res.status(404).json({ error: "This user has no stream." });
  return res.json(
    publicView(await withLiveStatus(row), {
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
    }),
  );
});

// ---------------------------------------------------------------------------
// Cloudflare webhook — flips status when the OBS feed connects / disconnects.
// Configure the webhook URL + secret in the Cloudflare Stream dashboard.
// ---------------------------------------------------------------------------

router.post(
  "/api/streams/webhook/cloudflare",
  async (req: Request, res: Response) => {
    const secret = process.env.CLOUDFLARE_STREAM_WEBHOOK_SECRET;
    if (secret && !verifyCfSignature(req, secret)) {
      return res.status(401).json({ error: "Bad signature" });
    }

    const body: any = req.body || {};
    // Cloudflare live webhooks carry the live input UID and a connection event.
    // Shapes vary by product version, so match defensively and log the raw body
    // the first time so we can pin the exact field once a real event arrives.
    const liveInputId: string | undefined =
      body.uid || body.live_input_id || body.data?.live_input_id || body.input?.uid;
    const eventName: string =
      body.eventType || body.name || body.notificationName || "";
    const stateRaw: string = (
      body.status?.current?.state ||
      body.state ||
      eventName ||
      ""
    )
      .toString()
      .toLowerCase();

    if (!liveInputId) {
      console.warn("[streams] webhook with no live input id:", JSON.stringify(body).slice(0, 500));
      return res.status(200).json({ ok: true });
    }

    const isLive = /connect|live/.test(stateRaw) && !/disconnect/.test(stateRaw);
    try {
      await db
        .update(liveStreams)
        .set(
          isLive
            ? { status: "live", startedAt: new Date(), lastLiveAt: new Date(), updatedAt: new Date() }
            : { status: "idle", updatedAt: new Date() },
        )
        .where(eq(liveStreams.liveInputId, liveInputId));
    } catch (err: any) {
      console.error("[streams] webhook update failed:", err?.message || err);
    }
    return res.status(200).json({ ok: true });
  },
);

/** Cloudflare signs as `Webhook-Signature: time=...,sig1=...` over `time.body`. */
function verifyCfSignature(req: Request, secret: string): boolean {
  try {
    const header = req.header("Webhook-Signature") || "";
    const parts = Object.fromEntries(
      header.split(",").map((kv) => kv.split("=").map((s) => s.trim())),
    );
    const time = parts["time"];
    const sig = parts["sig1"];
    if (!time || !sig) return false;
    const raw = (req as any).rawBody
      ? (req as any).rawBody.toString()
      : JSON.stringify(req.body);
    const expected = createHmac("sha256", secret).update(`${time}.${raw}`).digest("hex");
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export default router;
