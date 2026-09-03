/**
 * Rules for developer-uploaded game builds.
 *
 * Shared between client and server deliberately, for the same reason
 * `store-urls.ts` is: the upload UI needs to reject an oversized file before it
 * spends ten minutes pushing it to R2, and the server has to enforce the same
 * ceiling because a presigned upload URL is handed straight to the browser.
 * If these two drifted, the client would happily start an upload the server
 * would later refuse to register — the worst possible place to fail.
 */

export type BuildType = "web" | "download";
export type BuildChannel = "demo" | "full";
export type BuildPlatform = "windows" | "mac" | "linux";

/**
 * pending_upload — row reserved, bytes not yet confirmed in R2.
 * pending_review — bytes present, waiting on a human. Not publicly visible.
 * approved       — live on the game page.
 * rejected       — refused by a moderator; the developer can see why.
 * removed        — withdrawn by the developer or taken down. Object deleted.
 */
export type BuildStatus =
  | "pending_upload"
  | "pending_review"
  | "approved"
  | "rejected"
  | "removed";

/** Statuses whose bytes still exist in R2, and therefore still cost storage. */
export const BILLABLE_BUILD_STATUSES: BuildStatus[] = [
  "pending_upload",
  "pending_review",
  "approved",
  "rejected",
];

export const BUILD_PLATFORMS: BuildPlatform[] = ["windows", "mac", "linux"];

export const PLATFORM_LABELS: Record<BuildPlatform, string> = {
  windows: "Windows",
  mac: "macOS",
  linux: "Linux",
};

const GB = 1024 * 1024 * 1024;
const MB = 1024 * 1024;

export interface BuildQuota {
  /** Total bytes this account may hold across every game and build. */
  accountBytes: number;
  /** Largest single upload accepted. */
  maxBuildBytes: number;
  /** Builds per game profile, counting every status that still holds bytes. */
  maxBuildsPerGame: number;
  /** Free accounts get the browser-playable path only — no executables. */
  allowedTypes: BuildType[];
}

/**
 * Hosting is a Game Developer Pro feature outright — there is no free tier of
 * it. A zero quota with no allowed build types is how that is expressed, so
 * every quota check naturally refuses a non-subscriber without needing a
 * separate code path to remember.
 */
export const FREE_QUOTA: BuildQuota = {
  accountBytes: 0,
  maxBuildBytes: 0,
  maxBuildsPerGame: 0,
  allowedTypes: [],
};

export const SUBSCRIBER_QUOTA: BuildQuota = {
  accountBytes: 20 * GB,
  maxBuildBytes: 4 * GB,
  maxBuildsPerGame: 6,
  allowedTypes: ["web", "download"],
};

/**
 * Browser-playable builds are capped harder than the tier allows, on every
 * plan, because the server has to expand the archive to serve it. A 4GB zip is
 * a fine thing to hand a player as a download and a terrible thing to unpack in
 * a web process. Real WebGL/HTML5 builds land far under this.
 */
export const WEB_BUILD_MAX_BYTES = 500 * MB;

/** Guards against zip bombs: caps on the expanded tree, not the archive. */
export const WEB_BUILD_MAX_ENTRIES = 5000;
export const WEB_BUILD_MAX_EXPANDED_BYTES = 2 * GB;

export function quotaFor(isIndieDevSubscriber: boolean): BuildQuota {
  return isIndieDevSubscriber ? SUBSCRIBER_QUOTA : FREE_QUOTA;
}

/** Whether this quota permits hosting at all, as opposed to how much of it. */
export function hasBuildHosting(quota: BuildQuota): boolean {
  return quota.allowedTypes.length > 0 && quota.accountBytes > 0;
}

/**
 * Days a lapsed subscriber's builds are kept after the download is hidden.
 * Deliberately generous: someone who forgets a card should not lose the only
 * copy of a build they uploaded a year ago.
 */
export const LAPSED_RETENTION_DAYS = 90;

/**
 * Accepted archive extensions. Everything is a container — we never take a bare
 * .exe, both because a single file cannot carry the assets a real build needs
 * and because "upload your .exe here" is an invitation we do not want to issue.
 */
export const WEB_BUILD_EXTENSIONS = [".zip"];
export const DOWNLOAD_BUILD_EXTENSIONS = [".zip", ".7z", ".tar.gz", ".tgz", ".dmg"];

export function extensionsFor(buildType: BuildType): string[] {
  return buildType === "web" ? WEB_BUILD_EXTENSIONS : DOWNLOAD_BUILD_EXTENSIONS;
}

export function hasAllowedExtension(fileName: string, buildType: BuildType): boolean {
  const lower = fileName.toLowerCase();
  return extensionsFor(buildType).some((ext) => lower.endsWith(ext));
}

export function formatBytes(bytes: number): string {
  if (bytes >= GB) return `${(bytes / GB).toFixed(bytes >= 10 * GB ? 0 : 1)} GB`;
  if (bytes >= MB) return `${Math.round(bytes / MB)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export interface BuildUploadRequest {
  buildType: BuildType;
  platform?: BuildPlatform | null;
  fileName: string;
  sizeBytes: number;
}

export interface QuotaUsage {
  /** Bytes already held across the account, excluding the pending upload. */
  usedBytes: number;
  /** Builds already attached to the target game profile. */
  buildsOnGame: number;
}

/**
 * The single source of truth for "may this upload proceed". Returns null when
 * the upload is acceptable, or a player-readable reason when it is not.
 */
export function validateBuildUpload(
  req: BuildUploadRequest,
  usage: QuotaUsage,
  quota: BuildQuota,
): string | null {
  if (!hasBuildHosting(quota)) {
    return "Hosting your game on Gamefolio is part of Game Developer Pro.";
  }

  if (!req.fileName.trim()) return "Choose a file to upload.";

  if (!quota.allowedTypes.includes(req.buildType)) {
    return "That build type is not available on your plan.";
  }

  if (!hasAllowedExtension(req.fileName, req.buildType)) {
    return `${req.buildType === "web" ? "Browser-playable" : "Downloadable"} builds must be a ${extensionsFor(req.buildType).join(", ")} archive.`;
  }

  if (req.buildType === "download" && !req.platform) {
    return "Pick the platform this build runs on.";
  }

  if (req.buildType === "download" && req.platform && !BUILD_PLATFORMS.includes(req.platform)) {
    return "That platform is not supported.";
  }

  if (req.sizeBytes <= 0) return "That file looks empty.";

  if (req.buildType === "web" && req.sizeBytes > WEB_BUILD_MAX_BYTES) {
    return `Browser-playable builds are limited to ${formatBytes(WEB_BUILD_MAX_BYTES)} (this file is ${formatBytes(req.sizeBytes)}). Upload it as a downloadable build instead.`;
  }

  if (req.sizeBytes > quota.maxBuildBytes) {
    return `Builds are limited to ${formatBytes(quota.maxBuildBytes)} on your plan (this file is ${formatBytes(req.sizeBytes)}).`;
  }

  if (usage.usedBytes + req.sizeBytes > quota.accountBytes) {
    const remaining = Math.max(0, quota.accountBytes - usage.usedBytes);
    return `This would exceed your ${formatBytes(quota.accountBytes)} of build storage — you have ${formatBytes(remaining)} free. Remove an old build to make room.`;
  }

  if (usage.buildsOnGame >= quota.maxBuildsPerGame) {
    return `You can host ${quota.maxBuildsPerGame} build${quota.maxBuildsPerGame === 1 ? "" : "s"} per game on your plan. Remove one to upload another.`;
  }

  return null;
}
