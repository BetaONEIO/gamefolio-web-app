/**
 * Server-to-server sync of streamer accounts into the
 * gamefolio.com marketing site, which is the source of truth for the
 * public /streamers directory.
 *
 * Configured via two env vars:
 *   MARKETING_API_URL   - base URL of the marketing site (e.g. https://gamefolio.com)
 *   PARTNER_SYNC_SECRET - shared secret, must match the marketing site's value
 *
 * When either is unset, every call is a safe no-op: partner status still
 * works in-app, it just isn't mirrored to the marketing site.
 */
import type { User } from "@shared/schema";
import { users } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

const MARKETING_API_URL = process.env.MARKETING_API_URL;
const PARTNER_SYNC_SECRET = process.env.PARTNER_SYNC_SECRET;

function isConfigured(): boolean {
  if (!MARKETING_API_URL || !PARTNER_SYNC_SECRET) {
    console.warn(
      "[MarketingSync] MARKETING_API_URL / PARTNER_SYNC_SECRET not set — skipping marketing-site sync",
    );
    return false;
  }
  return true;
}

function derivePlatforms(user: User): string[] {
  const platforms: string[] = [];
  if (user.twitchChannelName) platforms.push("twitch");
  if (user.youtubeUsername) platforms.push("youtube");
  if (user.kickChannelName) platforms.push("kick");
  return platforms;
}

/**
 * Register or update a partner on the marketing site. Fire-and-forget:
 * failures are logged and never propagated to the caller.
 */
export async function syncStreamerToMarketing(user: User): Promise<void> {
  if (!isConfigured()) return;

  try {
    const res = await fetch(`${MARKETING_API_URL}/api/partner-streamers/sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-partner-sync-secret": PARTNER_SYNC_SECRET as string,
      },
      body: JSON.stringify({
        appUserId: user.id,
        streamName: user.displayName || user.username,
        description: user.bio || "",
        platforms: derivePlatforms(user),
        twitchHandle: user.twitchChannelName || null,
        youtubeHandle: user.youtubeUsername || null,
        kickHandle: user.kickChannelName || null,
        bannerImageUrl: user.bannerUrl || null,
        gamesPlayed: user.streamMainGame ? [user.streamMainGame] : [],
        schedule: user.streamFrequency || null,
        featuredStreamUrl: user.partnerFeaturedStreamUrl || null,
        isOfficialPartner: user.isPartner === true && user.partnerType === "streamer",
        visible: user.partnerStreamerVisible !== false,
      }),
    });

    if (!res.ok) {
      console.error(
        `[MarketingSync] sync failed for user ${user.id}: ${res.status} ${await res.text()}`,
      );
    }
  } catch (err) {
    console.error(`[MarketingSync] sync error for user ${user.id}:`, err);
  }
}

export const syncPartnerToMarketing = syncStreamerToMarketing;

function hasStreamerPersona(user: User): boolean {
  const personas = typeof user.userType === "string"
    ? user.userType.split(",").map((value) => value.trim().toLowerCase())
    : [];
  return user.isStreamer === true || personas.includes("streamer");
}

/**
 * Backfill existing public streamer accounts after a deploy. Upserts are keyed
 * by app user ID, so running this on every startup is safe and also refreshes
 * listings when profile data changed while the sync was unavailable.
 */
export async function syncExistingStreamersToMarketing(): Promise<number> {
  if (!isConfigured()) return 0;

  const activeUsers = await db.select().from(users).where(eq(users.status, "active"));
  const streamers = activeUsers.filter(
    (user) => user.isPrivate !== true && hasStreamerPersona(user),
  );

  const batchSize = 10;
  for (let offset = 0; offset < streamers.length; offset += batchSize) {
    await Promise.all(streamers.slice(offset, offset + batchSize).map(syncStreamerToMarketing));
  }

  console.log(`[MarketingSync] backfilled ${streamers.length} existing streamer account(s)`);
  return streamers.length;
}

/**
 * Remove a partner from the marketing site (partner status revoked or Pro
 * lapsed). Fire-and-forget.
 */
export async function removePartnerFromMarketing(appUserId: number): Promise<void> {
  if (!isConfigured()) return;

  try {
    const res = await fetch(
      `${MARKETING_API_URL}/api/partner-streamers/${appUserId}`,
      {
        method: "DELETE",
        headers: { "x-partner-sync-secret": PARTNER_SYNC_SECRET as string },
      },
    );

    if (!res.ok) {
      console.error(
        `[MarketingSync] delete failed for user ${appUserId}: ${res.status} ${await res.text()}`,
      );
    }
  } catch (err) {
    console.error(`[MarketingSync] delete error for user ${appUserId}:`, err);
  }
}
