// ── Bounty Hub XP Profile Engine ───────────────────────────────────────────
// Gamefolio-controlled XP. Indie developers cannot set XP values.

import { db } from "./db";
import { sql } from "drizzle-orm";
import { XPService } from "./xp-service";

export type XPTier = "quick" | "standard" | "premium" | "featured";

export interface XPProfile {
  tier: XPTier;
  duration: number;        // target days
  totalXP: number;         // campaign total
  completionBonus: number; // largest single reward
  joinXP: number;
  demoClaimXP: number;
  playDemoXP: number;
  firstClipXP: number;
  perClipXP: number;
  clipBonusQty: number;    // "upload X clips" bonus threshold
  clipBonusXP: number;
  firstScreenshotXP: number;
  perScreenshotXP: number;
  screenshotBonusQty: number;
  screenshotBonusXP: number;
  firstFeedbackXP: number;
  perFeedbackXP: number;
  reelXP: number;
  bugReportXP: number;
  streamXP: number;
}

// ── Hardcoded profiles (admin-managed, not editable by devs) ──────────────
const PROFILES: Record<XPTier, XPProfile> = {
  quick: {
    tier: "quick",
    duration: 7,
    totalXP: 5_000,
    completionBonus: 2_600,
    joinXP: 100,
    demoClaimXP: 50,
    playDemoXP: 250,
    firstClipXP: 500,
    perClipXP: 150,
    clipBonusQty: 3,
    clipBonusXP: 500,
    firstScreenshotXP: 250,
    perScreenshotXP: 100,
    screenshotBonusQty: 3,
    screenshotBonusXP: 250,
    firstFeedbackXP: 500,
    perFeedbackXP: 200,
    reelXP: 600,
    bugReportXP: 300,
    streamXP: 400,
  },
  standard: {
    tier: "standard",
    duration: 14,
    totalXP: 10_000,
    completionBonus: 5_000,
    joinXP: 150,
    demoClaimXP: 75,
    playDemoXP: 350,
    firstClipXP: 600,
    perClipXP: 200,
    clipBonusQty: 3,
    clipBonusXP: 600,
    firstScreenshotXP: 300,
    perScreenshotXP: 125,
    screenshotBonusQty: 3,
    screenshotBonusXP: 300,
    firstFeedbackXP: 600,
    perFeedbackXP: 250,
    reelXP: 800,
    bugReportXP: 400,
    streamXP: 500,
  },
  premium: {
    tier: "premium",
    duration: 30,
    totalXP: 15_000,
    completionBonus: 8_000,
    joinXP: 200,
    demoClaimXP: 100,
    playDemoXP: 500,
    firstClipXP: 800,
    perClipXP: 250,
    clipBonusQty: 3,
    clipBonusXP: 800,
    firstScreenshotXP: 400,
    perScreenshotXP: 150,
    screenshotBonusQty: 3,
    screenshotBonusXP: 400,
    firstFeedbackXP: 800,
    perFeedbackXP: 300,
    reelXP: 1_000,
    bugReportXP: 500,
    streamXP: 600,
  },
  featured: {
    tier: "featured",
    duration: 45,
    totalXP: 25_000,
    completionBonus: 15_000,
    joinXP: 300,
    demoClaimXP: 150,
    playDemoXP: 700,
    firstClipXP: 1_200,
    perClipXP: 350,
    clipBonusQty: 5,
    clipBonusXP: 1_200,
    firstScreenshotXP: 600,
    perScreenshotXP: 200,
    screenshotBonusQty: 5,
    screenshotBonusXP: 600,
    firstFeedbackXP: 1_200,
    perFeedbackXP: 400,
    reelXP: 1_500,
    bugReportXP: 700,
    streamXP: 800,
  },
};

export function getXPProfile(tier: XPTier): XPProfile {
  return PROFILES[tier] ?? PROFILES.standard;
}

export function getTierFromDuration(duration: number): XPTier {
  if (duration <= 10) return "quick";
  if (duration <= 14) return "standard";
  if (duration <= 30) return "premium";
  return "featured";
}

export function listAllProfiles(): XPProfile[] {
  return Object.values(PROFILES);
}

// ── Compute XP for a specific bounty based on content type ────────────────
export function computeBountyXP(
  profile: XPProfile,
  contentType: string,
  isFirstOfType: boolean,
  quantity: number,
  qtySoFar: number,
): number {
  switch (contentType) {
    case "clip": {
      let xp = isFirstOfType ? profile.firstClipXP : profile.perClipXP;
      const totalQty = qtySoFar + 1;
      if (totalQty === profile.clipBonusQty) xp += profile.clipBonusXP;
      return xp;
    }
    case "screenshot": {
      let xp = isFirstOfType ? profile.firstScreenshotXP : profile.perScreenshotXP;
      const totalQty = qtySoFar + 1;
      if (totalQty === profile.screenshotBonusQty) xp += profile.screenshotBonusXP;
      return xp;
    }
    case "feedback":
      return isFirstOfType ? profile.firstFeedbackXP : profile.perFeedbackXP;
    case "reel":
      return profile.reelXP;
    case "bug":
      return profile.bugReportXP;
    case "stream":
      return profile.streamXP;
    default:
      return isFirstOfType ? 300 : 150;
  }
}

// ── Compute total campaign XP (with optional event multiplier) ──────────
export function computeCampaignTotalXP(
  tier: XPTier,
  eventMultiplier: number = 1.0,
): number {
  const profile = getXPProfile(tier);
  return Math.round(profile.totalXP * eventMultiplier);
}

export function computeCompletionBonus(
  tier: XPTier,
  eventMultiplier: number = 1.0,
): number {
  const profile = getXPProfile(tier);
  return Math.round(profile.completionBonus * eventMultiplier);
}

// ── Award XP to user and record in history ───────────────────────────────
export async function awardCampaignXP(
  userId: number,
  xpAmount: number,
  source: string,
  description: string,
  instanceId?: number,
): Promise<void> {
  await XPService.awardXP(userId, xpAmount, "other", description);
  // Track bounty-specific XP
  if (instanceId) {
    await db.execute(sql`
      UPDATE campaign_participants
      SET xp_earned = COALESCE(xp_earned, 0) + ${xpAmount}
      WHERE instance_id = ${instanceId} AND user_id = ${userId}
    `);
  }
}

// ── Admin: update a profile (persisted in memory only for now) ───────────
export function updateProfile(tier: XPTier, patch: Partial<XPProfile>): void {
  PROFILES[tier] = { ...PROFILES[tier], ...patch };
}
