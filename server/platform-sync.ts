// Xbox (xbl.io) and PlayStation (psn-api) profile syncing.
//
// The per-user sync logic lives here so it can be driven two ways:
//   1. On-demand, from the "Sync" buttons in Settings (see the
//      /api/xbox/achievements/sync and /api/psn/trophies/sync routes).
//   2. Automatically, by the daily scheduler wired up in server/index.ts.
//
// Connecting a profile used to require a manual sync to refresh data; the
// scheduler keeps every connected profile fresh without user action.

import axios from 'axios';
import { and, eq, isNotNull, isNull, lt, or } from 'drizzle-orm';
import type { User } from '@shared/schema';
import { users, serverSettings } from '@shared/schema';
import { db } from './db';
import { storage } from './storage';

/** Error with a stable code + HTTP status so on-demand routes can map it. */
export class PlatformSyncError extends Error {
  code: string;
  httpStatus: number;
  constructor(code: string, httpStatus: number, message: string) {
    super(message);
    this.name = 'PlatformSyncError';
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

// ---------------------------------------------------------------------------
// Xbox
// ---------------------------------------------------------------------------

export interface XboxSyncResult {
  achievements: any[];
  gamerscore: number;
  totalAchievements: number;
}

export async function syncXboxForUser(user: User): Promise<XboxSyncResult> {
  if (!user.xboxXuid) {
    throw new PlatformSyncError('NO_XBOX_LINKED', 400, 'No Xbox account linked. Please connect your Xbox account first.');
  }

  const xblApiKey = process.env.XBL_API_KEY;
  if (!xblApiKey) {
    throw new PlatformSyncError('NOT_CONFIGURED', 500, 'Xbox integration is not configured');
  }

  const axiosResponse = await axios.get(`https://xbl.io/api/v2/achievements/player/${user.xboxXuid}`, {
    headers: {
      'x-authorization': xblApiKey,
      'Accept': 'application/json',
      'Accept-Language': 'en-US',
    },
    validateStatus: null,
  });

  if (axiosResponse.status < 200 || axiosResponse.status >= 300) {
    console.error('xbl.io achievements error:', axiosResponse.status, JSON.stringify(axiosResponse.data));
    throw new PlatformSyncError('UPSTREAM', 502, 'Failed to fetch achievements from Xbox Live');
  }

  const data = axiosResponse.data as any;
  const allTitles = data.titles || data.achievements || data.data || [];
  const achievements = allTitles.slice(0, 100);

  // Tally true totals across ALL games before slicing
  const totalAchievementsEarned = allTitles.reduce((sum: number, t: any) => {
    return sum + (t.achievement?.currentAchievements ?? t.earnedAchievements ?? t.currentAchievements ?? 0);
  }, 0);

  const totalGamerscoreEarned = allTitles.reduce((sum: number, t: any) => {
    return sum + (t.achievement?.currentGamerscore ?? t.currentGamerscore ?? 0);
  }, 0);

  await storage.updateUser(user.id, {
    xboxAchievements: achievements,
    xboxAchievementsLastSync: new Date(),
    xboxTotalAchievements: totalAchievementsEarned,
    xboxGamerscore: totalGamerscoreEarned > 0 ? totalGamerscoreEarned : null,
  });

  return { achievements, gamerscore: totalGamerscoreEarned, totalAchievements: totalAchievementsEarned };
}

// ---------------------------------------------------------------------------
// PlayStation
// ---------------------------------------------------------------------------

// PSN refresh token lives in server_settings and self-renews on each use.
async function getPsnRefreshToken(): Promise<string | null> {
  try {
    const rows = await db.select().from(serverSettings).where(eq(serverSettings.key, 'psn_refresh_token'));
    return rows[0]?.value ?? null;
  } catch {
    return null;
  }
}

async function setPsnRefreshToken(token: string): Promise<void> {
  try {
    await db.insert(serverSettings).values({ key: 'psn_refresh_token', value: token, updatedAt: new Date() })
      .onConflictDoUpdate({ target: serverSettings.key, set: { value: token, updatedAt: new Date() } });
  } catch (e) {
    console.error('Failed to save PSN refresh token:', e);
  }
}

export interface PsnSyncResult {
  trophyLevel: number | null;
  totalTrophies: number | null;
  earnedTrophies: any;
  recentGames: any[];
}

export async function syncPsnForUser(user: User): Promise<PsnSyncResult> {
  if (!user.playstationUsername) {
    throw new PlatformSyncError('NO_PSN_USERNAME', 400, 'No PlayStation ID saved. Please add your PSN ID first.');
  }

  // psn-api is ESM-formatted but lacks "type":"module", so dynamic import()
  // fails in production. Instead we load the CJS build via require (dev) or
  // createRequire (production ESM build).
  const psnMod: any = await (async () => {
    const cjsRequire: NodeRequire | undefined = (globalThis as any).require;
    if (cjsRequire) {
      return cjsRequire('psn-api');
    }
    const { createRequire } = await import('node:module');
    return createRequire(process.cwd() + '/index.js')('psn-api');
  })();
  const {
    exchangeNpssoForCode,
    exchangeCodeForAccessToken,
    exchangeRefreshTokenForAuthTokens,
    getProfileFromUserName,
    getUserPlayedGames,
  } = psnMod;

  let accessToken: string;

  // Try refresh token first (self-renewing — no manual rotation needed)
  const storedRefreshToken = await getPsnRefreshToken();
  if (storedRefreshToken) {
    try {
      const tokens = await exchangeRefreshTokenForAuthTokens(storedRefreshToken);
      accessToken = tokens.accessToken;
      // Save the new refresh token — keeps the chain alive indefinitely
      if (tokens.refreshToken) await setPsnRefreshToken(tokens.refreshToken);
    } catch (refreshErr: any) {
      console.warn('PSN refresh token expired, falling back to NPSSO:', refreshErr?.message);
      accessToken = '';
    }
  } else {
    accessToken = '';
  }

  // Fall back to NPSSO (one-time bootstrap)
  if (!accessToken) {
    const npsso = process.env.PSN_NPSSO_TOKEN;
    if (!npsso) {
      throw new PlatformSyncError(
        'NOT_CONFIGURED',
        503,
        'PSN is not configured. Please add a PSN_NPSSO_TOKEN secret to get started. After the first sync, it will self-renew automatically.',
      );
    }
    try {
      const code = await exchangeNpssoForCode(npsso);
      const tokens = await exchangeCodeForAccessToken(code);
      accessToken = tokens.accessToken;
      if (tokens.refreshToken) await setPsnRefreshToken(tokens.refreshToken);
    } catch (authErr: any) {
      console.error('PSN NPSSO auth error:', authErr?.message || authErr);
      throw new PlatformSyncError(
        'AUTH_FAILED',
        503,
        'Failed to authenticate with PSN. The NPSSO token may be expired — please update it in your secrets.',
      );
    }
  }

  let profile: any;
  try {
    profile = await getProfileFromUserName({ accessToken }, user.playstationUsername);
  } catch (lookupErr: any) {
    const msg = lookupErr?.message || '';
    if (msg.includes('not found') || msg.includes('404') || msg.includes('2105023')) {
      throw new PlatformSyncError('USER_NOT_FOUND', 404, `Could not find PSN user "${user.playstationUsername}". Check the PSN ID is correct and the profile is public.`);
    }
    throw lookupErr;
  }

  const accountId: string = profile?.profile?.accountId;
  if (!accountId) {
    throw new PlatformSyncError('USER_NOT_FOUND', 404, `Could not find PSN user "${user.playstationUsername}". Check the PSN ID is correct and the profile is public.`);
  }

  const trophySummaryData = profile?.profile?.trophySummary ?? null;
  const trophyLevel: number | null = trophySummaryData?.level ?? null;
  const earnedTrophies = trophySummaryData?.earnedTrophies ?? {};
  const totalTrophies = (
    (earnedTrophies.platinum ?? 0) +
    (earnedTrophies.gold ?? 0) +
    (earnedTrophies.silver ?? 0) +
    (earnedTrophies.bronze ?? 0)
  ) || null;

  let recentGames: any[] = [];
  try {
    const gamesResult = await getUserPlayedGames({ accessToken }, accountId, { limit: 12, categories: 'ps4_game,ps5_native_game' });
    recentGames = gamesResult?.titles ?? [];
  } catch (gamesErr: any) {
    console.warn('PSN recent games unavailable:', gamesErr?.message || gamesErr);
  }

  const trophyData = {
    earnedTrophies,
    trophyLevel,
    recentGames: recentGames.slice(0, 10).map((g: any) => ({
      titleId: g.titleId,
      name: g.name,
      imageUrl: g.imageUrl,
      category: g.category,
      playCount: g.playCount,
      lastPlayedDateTime: g.lastPlayedDateTime,
    })),
  };

  await storage.updateUser(user.id, {
    psnTrophyData: [trophyData],
    psnTrophiesLastSync: new Date(),
    psnTrophyLevel: trophyLevel,
    psnTotalTrophies: totalTrophies,
  });

  return { trophyLevel, totalTrophies, earnedTrophies, recentGames: trophyData.recentGames };
}

// ---------------------------------------------------------------------------
// Scheduled background sync
// ---------------------------------------------------------------------------

// A profile is re-synced once its last sync is older than this. Set just under
// 24h so the every-6h scheduler reliably refreshes each profile ~daily without
// drifting to ~30h gaps.
const STALE_MS = 23 * 60 * 60 * 1000;
// Pause between users so we don't hammer xbl.io / PSN. PSN especially shares a
// single refresh token, so syncs are processed strictly one at a time.
const PER_USER_DELAY_MS = 1500;

let isRunning = false;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface ScheduledSyncSummary {
  xboxAttempted: number;
  xboxSucceeded: number;
  psnAttempted: number;
  psnSucceeded: number;
  errors: number;
}

/**
 * Re-sync every connected Xbox/PSN profile whose data is stale. Safe to call
 * repeatedly: it skips profiles synced within STALE_MS and refuses to overlap
 * with an in-flight run. Per-user failures are logged and skipped, never thrown.
 */
export async function runScheduledPlatformSync(): Promise<ScheduledSyncSummary> {
  const summary: ScheduledSyncSummary = {
    xboxAttempted: 0, xboxSucceeded: 0, psnAttempted: 0, psnSucceeded: 0, errors: 0,
  };

  if (process.env.PLATFORM_AUTOSYNC_DISABLED === 'true') return summary;
  if (isRunning) {
    console.warn('[platform-sync] previous run still in progress — skipping this tick');
    return summary;
  }
  isRunning = true;

  try {
    const cutoff = new Date(Date.now() - STALE_MS);

    const candidates = await db.select().from(users).where(
      or(
        and(isNotNull(users.xboxXuid), or(isNull(users.xboxAchievementsLastSync), lt(users.xboxAchievementsLastSync, cutoff))),
        and(isNotNull(users.playstationUsername), or(isNull(users.psnTrophiesLastSync), lt(users.psnTrophiesLastSync, cutoff))),
      ),
    );

    if (candidates.length === 0) return summary;
    console.log(`[platform-sync] ${candidates.length} profile(s) due for refresh`);

    for (const user of candidates) {
      const xboxStale = user.xboxXuid && (!user.xboxAchievementsLastSync || user.xboxAchievementsLastSync < cutoff);
      const psnStale = user.playstationUsername && (!user.psnTrophiesLastSync || user.psnTrophiesLastSync < cutoff);

      if (xboxStale) {
        summary.xboxAttempted++;
        try {
          await syncXboxForUser(user);
          summary.xboxSucceeded++;
        } catch (err: any) {
          summary.errors++;
          console.error(`[platform-sync] Xbox sync failed for user ${user.id}:`, err?.message || err);
        }
        await sleep(PER_USER_DELAY_MS);
      }

      if (psnStale) {
        summary.psnAttempted++;
        try {
          await syncPsnForUser(user);
          summary.psnSucceeded++;
        } catch (err: any) {
          summary.errors++;
          console.error(`[platform-sync] PSN sync failed for user ${user.id}:`, err?.message || err);
        }
        await sleep(PER_USER_DELAY_MS);
      }
    }

    console.log(
      `[platform-sync] done: xbox ${summary.xboxSucceeded}/${summary.xboxAttempted}, ` +
      `psn ${summary.psnSucceeded}/${summary.psnAttempted}, errors ${summary.errors}`,
    );
  } finally {
    isRunning = false;
  }

  return summary;
}
