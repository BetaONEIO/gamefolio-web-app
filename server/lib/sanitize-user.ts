const USER_CREDENTIAL_FIELDS = [
  "password",
  "twoFactorSecret",
  "encryptedPrivateKey",
  "twitchAccessToken",
  "kickAccessToken",
] as const;

type UserCredentialField = typeof USER_CREDENTIAL_FIELDS[number];

const PUBLIC_USER_PRIVATE_FIELDS = [
  ...USER_CREDENTIAL_FIELDS,
  "email",
  "twoFactorEnabled",
  "stripeCustomerId",
  "stripeSubscriptionId",
  "indieDevStripeSubscriptionId",
  "revenuecatUserId",
  "walletAddress",
  "walletChain",
  "walletCreatedAt",
  "dateOfBirth",
  "birthday",
  "lastBirthdayNotificationYear",
  "ageRange",
  "authProvider",
  "externalId",
  "referralCode",
  "referredBy",
  "originalSignupReferralCode",
  "referralCodeCustomized",
  "bannedReason",
  "lastLoginAt",
  "totalLoginTime",
  "lastStreakUpdate",
  "signupIp",
  "signupDeviceId",
  "hideFromLeaderboard",
  "canMintNfts",
  "canSellNfts",
  "welcomePackClaimed",
  "gfTokenBalance",
  "proSubscriptionType",
  "proSubscriptionStartDate",
  "proSubscriptionEndDate",
  "indieDevSubscriptionType",
  "indieDevSubscriptionStartDate",
  "indieDevSubscriptionEndDate",
  "xboxXuid",
  "xboxAchievementsLastSync",
  "psnTrophiesLastSync",
  "outroVideoPath",
  "outroVideoPathPortrait",
] as const;

type PublicUserPrivateField = typeof PUBLIC_USER_PRIVATE_FIELDS[number];

export type CredentialSafeUser<T> = T extends object
  ? Omit<T, UserCredentialField>
  : T;

export type PublicSafeUser<T> = T extends object
  ? Omit<T, PublicUserPrivateField>
  : T;

/**
 * Removes authentication credentials from a user row before it crosses an
 * HTTP response boundary. Keep this list in sync with secret-bearing columns
 * on the users table.
 */
export function stripUserCredentials<T extends object | null | undefined>(
  user: T,
): CredentialSafeUser<T> {
  if (!user || typeof user !== "object") return user as CredentialSafeUser<T>;

  const safeUser = { ...user } as Record<string, unknown>;
  for (const field of USER_CREDENTIAL_FIELDS) {
    delete safeUser[field];
  }
  return safeUser as CredentialSafeUser<T>;
}

export function stripUsersCredentials<T extends object>(
  users: T[],
): Array<CredentialSafeUser<T>> {
  return users.map(user => stripUserCredentials(user));
}

/**
 * Removes credentials, billing identifiers, PII, and internal account state
 * from a full user row used by a public profile response.
 */
export function stripPublicUserSecrets<T extends object | null | undefined>(
  user: T,
): PublicSafeUser<T> {
  if (!user || typeof user !== "object") return user as PublicSafeUser<T>;

  const safeUser = { ...user } as Record<string, unknown>;
  for (const field of PUBLIC_USER_PRIVATE_FIELDS) {
    delete safeUser[field];
  }
  return safeUser as PublicSafeUser<T>;
}
