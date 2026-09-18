export type AiVodClipUser = {
  isPro?: boolean | null;
  role?: string | null;
  isAmbassador?: boolean | null;
};

export type AiVodClipLimits = {
  isPro: boolean;
  maxVodDurationSeconds: number;
  dailyJobLimit: number;
};

const PRO_MAX_VOD_DURATION_SECONDS = parseInt(process.env.AI_VOD_MAX_VOD_DURATION_SECONDS || '21600', 10);
const FREE_MAX_VOD_DURATION_SECONDS = parseInt(process.env.AI_VOD_FREE_MAX_VOD_DURATION_SECONDS || '14400', 10);
const PRO_DAILY_JOB_LIMIT = parseInt(process.env.AI_VOD_PRO_DAILY_JOBS || '3', 10);
const FREE_DAILY_JOB_LIMIT = parseInt(process.env.AI_VOD_FREE_DAILY_JOBS || '1', 10);

/**
 * The clipper is still private. Pro membership affects limits but does not
 * grant route access until the public launch policy is deliberately changed.
 */
export function canAccessPrivateAiVodClipper(user: AiVodClipUser | undefined): boolean {
  return user?.role === 'admin' || !!user?.isAmbassador;
}

/**
 * Private testers receive the eventual Pro allowance. The Free allowance is
 * retained for launch-time tiering, without granting Free users route access.
 */
export function getVodClipLimits(user: AiVodClipUser): AiVodClipLimits {
  const isPro = !!user.isPro || user.role === 'admin' || !!user.isAmbassador;
  return {
    isPro,
    maxVodDurationSeconds: isPro ? PRO_MAX_VOD_DURATION_SECONDS : FREE_MAX_VOD_DURATION_SECONDS,
    dailyJobLimit: isPro ? PRO_DAILY_JOB_LIMIT : FREE_DAILY_JOB_LIMIT,
  };
}

export function isVodDurationAllowed(durationSeconds: number, limits: AiVodClipLimits): boolean {
  return durationSeconds <= limits.maxVodDurationSeconds;
}