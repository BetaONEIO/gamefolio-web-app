/**
 * Developer-uploaded game builds.
 *
 * Upload is a three-step handshake rather than a single POST:
 *
 *   1. POST /upload-url  — quota and ownership are checked, a row is reserved,
 *                          and a presigned R2 URL comes back.
 *   2. The browser PUTs the file straight to R2. The bytes never touch this
 *      server; proxying a 4GB upload through Express would be slow, memory-
 *      hostile, and pointless when R2 can take it directly.
 *   3. POST /:id/complete — the server confirms the object really landed, at
 *      the size that was approved, and only then moves the build into review.
 *
 * Step 3 is not a formality. Step 1's quota check trusts a client-declared size,
 * so the presigned URL pins ContentLength into the signature and step 3 HEADs
 * the object to confirm what actually arrived. A build that is never completed
 * stays `pending_upload` and still counts against quota, which is the correct
 * bias — abandoned uploads occupy real bytes.
 */

import { Router, type Request, type Response } from "express";
import { createHash } from "crypto";
import { db } from "../db";
import { sql } from "drizzle-orm";
import { hybridAuth } from "../middleware/hybrid-auth";
import { createRateLimiter } from "../middleware/rate-limit";
import { captureRouteError } from "../sentry";
import {
  BUILD_PLATFORMS,
  quotaFor,
  validateBuildUpload,
  formatBytes,
  type BuildPlatform,
  type BuildType,
} from "@shared/game-builds";
import {
  isR2Configured,
  isWebBuildServingConfigured,
  createPresignedUpload,
  createPresignedDownload,
  buildArchiveKey,
  webBuildPrefix,
  buildRootPrefix,
  headObject,
  getObjectBuffer,
  deleteObject,
  deletePrefix,
  prefixSize,
  publicWebUrl,
} from "../r2-storage";
import {
  extractWebBuild,
  BuildExtractionError,
} from "../services/game-build-extractor";
import {
  getQuotaUsage,
  getAccountUsedBytes,
  summariseQuota,
} from "../services/game-build-service";

const router = Router();

/** db.execute() return shape differs by driver — normalize to a plain array. */
function rowsOf(result: unknown): any[] {
  return ((result as any).rows ?? result) as any[];
}

function currentUserId(req: Request): number | null {
  const id = (req as any).user?.id;
  return typeof id === "number" ? id : null;
}

/**
 * Every write path goes through this. The feature is off rather than degraded
 * when R2 is missing: falling back to the Supabase bucket would quietly invert
 * the economics the whole feature depends on (see server/r2-storage.ts).
 */
function requireR2(res: Response): boolean {
  if (isR2Configured()) return true;
  res.status(503).json({
    error: "build_hosting_unavailable",
    message: "Game build hosting is not configured on this server yet.",
  });
  return false;
}

async function loadOwnedProfile(profileId: number, userId: number) {
  const result = await db.execute(sql`
    SELECT id, user_id AS "userId", game_name AS "gameName"
    FROM indie_game_profiles
    WHERE id = ${profileId}
    LIMIT 1
  `);
  const profile = rowsOf(result)[0];
  if (!profile) return { profile: null, owned: false };
  return { profile, owned: Number(profile.userId) === userId };
}

async function isSubscriber(userId: number): Promise<boolean> {
  const result = await db.execute(sql`
    SELECT is_indie_dev_subscriber AS "isIndieDevSubscriber"
    FROM users WHERE id = ${userId} LIMIT 1
  `);
  return !!rowsOf(result)[0]?.isIndieDevSubscriber;
}

function contentTypeForArchive(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".zip")) return "application/zip";
  if (lower.endsWith(".7z")) return "application/x-7z-compressed";
  if (lower.endsWith(".tar.gz") || lower.endsWith(".tgz")) return "application/gzip";
  if (lower.endsWith(".dmg")) return "application/x-apple-diskimage";
  return "application/octet-stream";
}

/**
 * Same one-way fingerprint the indie analytics events use. Raw IP and
 * user-agent must never be persisted — only this digest.
 */
function visitorKeyFor(req: Request): string {
  const userId = currentUserId(req);
  const fingerprint = userId
    ? `user:${userId}`
    : `anonymous:${req.ip}|${req.get("user-agent") ?? ""}`;
  return createHash("sha256").update(fingerprint).digest("hex");
}

// Uploads are the expensive operation, so they get their own ceiling. Generous
// enough that a developer iterating on a build never notices it.
const uploadRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 20,
  keyFn: (req) => {
    const id = (req as any).user?.id;
    return id ? `user:${id}` : null;
  },
  message: "Too many build uploads started recently. Please try again shortly.",
});

// Signed download URLs are cheap to mint but shareable, so cap how fast one
// visitor can mint them.
const downloadRateLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 30,
  keyFn: (req) => `visitor:${visitorKeyFor(req)}`,
  message: "Too many downloads requested. Please wait a moment and try again.",
});

// ---------------------------------------------------------------------------
// Developer routes
// ---------------------------------------------------------------------------

/** Storage headroom, for the upload UI. */
router.get("/quota", hybridAuth, async (req: Request, res: Response) => {
  try {
    const userId = currentUserId(req);
    if (!userId) return res.status(401).json({ message: "Not authenticated" });

    const subscriber = await isSubscriber(userId);
    const quota = quotaFor(subscriber);
    const usedBytes = await getAccountUsedBytes(userId);

    res.json({
      ...summariseQuota({ usedBytes, buildsOnGame: 0 }, quota),
      isSubscriber: subscriber,
      hostingConfigured: isR2Configured(),
      webPlayConfigured: isWebBuildServingConfigured(),
    });
  } catch (error) {
    captureRouteError(error, { route: "game-builds GET /quota" });
    res.status(500).json({ message: "Failed to load build storage usage" });
  }
});

/** A developer's own builds for one game, in every status. */
router.get("/", hybridAuth, async (req: Request, res: Response) => {
  try {
    const userId = currentUserId(req);
    if (!userId) return res.status(401).json({ message: "Not authenticated" });

    const profileId = Number(req.query.profileId);
    if (!Number.isInteger(profileId)) {
      return res.status(400).json({ message: "profileId is required" });
    }

    const { profile, owned } = await loadOwnedProfile(profileId, userId);
    if (!profile) return res.status(404).json({ message: "Game not found" });
    if (!owned) return res.status(403).json({ message: "That game is not yours" });

    const result = await db.execute(sql`
      SELECT id, build_type AS "buildType", platform, channel, label,
             original_file_name AS "originalFileName",
             size_bytes AS "sizeBytes", stored_bytes AS "storedBytes",
             status, review_notes AS "reviewNotes", reviewed_at AS "reviewedAt",
             download_count AS "downloadCount", last_downloaded_at AS "lastDownloadedAt",
             hidden_at AS "hiddenAt", hidden_reason AS "hiddenReason",
             web_entry_path AS "webEntryPath",
             created_at AS "createdAt"
      FROM game_builds
      WHERE profile_id = ${profileId} AND status <> 'removed'
      ORDER BY created_at DESC
    `);

    res.json({ builds: rowsOf(result) });
  } catch (error) {
    captureRouteError(error, { route: "game-builds GET /" });
    res.status(500).json({ message: "Failed to load builds" });
  }
});

/** Step 1: reserve a build row and hand back a presigned upload URL. */
router.post("/upload-url", hybridAuth, uploadRateLimiter, async (req: Request, res: Response) => {
  try {
    const userId = currentUserId(req);
    if (!userId) return res.status(401).json({ message: "Not authenticated" });
    if (!requireR2(res)) return;

    const profileId = Number(req.body?.profileId);
    const buildType = String(req.body?.buildType ?? "") as BuildType;
    const platformRaw = req.body?.platform ? String(req.body.platform) : null;
    const platform = (platformRaw as BuildPlatform | null) ?? null;
    const channel = req.body?.channel === "full" ? "full" : "demo";
    const label = String(req.body?.label ?? "").trim().slice(0, 80);
    const fileName = String(req.body?.fileName ?? "").trim();
    const sizeBytes = Number(req.body?.sizeBytes);

    if (!Number.isInteger(profileId)) {
      return res.status(400).json({ message: "profileId is required" });
    }
    if (buildType !== "web" && buildType !== "download") {
      return res.status(400).json({ message: "buildType must be 'web' or 'download'" });
    }
    if (platform && !BUILD_PLATFORMS.includes(platform)) {
      return res.status(400).json({ message: "Unsupported platform" });
    }
    if (!label) {
      return res.status(400).json({ message: "Give the build a version label" });
    }
    if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
      return res.status(400).json({ message: "A valid file size is required" });
    }

    const { profile, owned } = await loadOwnedProfile(profileId, userId);
    if (!profile) return res.status(404).json({ message: "Game not found" });
    if (!owned) return res.status(403).json({ message: "That game is not yours" });

    if (buildType === "web" && !isWebBuildServingConfigured()) {
      return res.status(503).json({
        error: "web_play_unavailable",
        message: "Browser-playable builds are not enabled on this server yet.",
      });
    }

    const subscriber = await isSubscriber(userId);
    const quota = quotaFor(subscriber);
    const usage = await getQuotaUsage(userId, profileId);

    // The one source of truth for whether this upload may proceed — the same
    // function the upload form runs client-side, so the two cannot disagree.
    const rejection = validateBuildUpload(
      { buildType, platform, fileName, sizeBytes },
      usage,
      quota,
    );
    if (rejection) {
      return res.status(400).json({ message: rejection, quota: summariseQuota(usage, quota) });
    }

    const inserted = await db.execute(sql`
      INSERT INTO game_builds
        (profile_id, user_id, build_type, platform, channel, label,
         storage_key, original_file_name, size_bytes, status)
      VALUES
        (${profileId}, ${userId}, ${buildType}, ${buildType === "download" ? platform : null},
         ${channel}, ${label}, '', ${fileName}, ${sizeBytes}, 'pending_upload')
      RETURNING id
    `);
    const buildId = Number(rowsOf(inserted)[0]?.id);
    if (!buildId) throw new Error("Failed to reserve a build row");

    const storageKey = buildArchiveKey(userId, buildId, fileName);
    await db.execute(sql`
      UPDATE game_builds SET storage_key = ${storageKey}, updated_at = now()
      WHERE id = ${buildId}
    `);

    const contentType = contentTypeForArchive(fileName);
    const uploadUrl = await createPresignedUpload({ key: storageKey, contentType, sizeBytes });

    res.status(201).json({
      buildId,
      uploadUrl,
      // The browser must send exactly these, or the signature will not match.
      requiredHeaders: { "Content-Type": contentType },
      expectedSizeBytes: sizeBytes,
    });
  } catch (error) {
    captureRouteError(error, { route: "game-builds POST /upload-url" });
    res.status(500).json({ message: "Failed to start the build upload" });
  }
});

/**
 * Step 3: confirm the upload landed, expand it if it is a web build, and put it
 * in the review queue.
 *
 * Anything that fails here takes its bytes with it. A half-extracted build left
 * in R2 is a storage leak nothing references — exactly the failure mode that put
 * ~35GB of orphans in the Supabase bucket.
 */
router.post("/:id/complete", hybridAuth, async (req: Request, res: Response) => {
  const buildId = Number(req.params.id);
  let cleanupPrefix: string | null = null;

  try {
    const userId = currentUserId(req);
    if (!userId) return res.status(401).json({ message: "Not authenticated" });
    if (!requireR2(res)) return;
    if (!Number.isInteger(buildId)) return res.status(400).json({ message: "Invalid build id" });

    const found = await db.execute(sql`
      SELECT id, user_id AS "userId", build_type AS "buildType", storage_key AS "storageKey",
             size_bytes AS "sizeBytes", status, original_file_name AS "originalFileName"
      FROM game_builds WHERE id = ${buildId} LIMIT 1
    `);
    const build = rowsOf(found)[0];
    if (!build) return res.status(404).json({ message: "Build not found" });
    if (Number(build.userId) !== userId) {
      return res.status(403).json({ message: "That build is not yours" });
    }
    if (build.status !== "pending_upload") {
      return res.status(409).json({ message: "That build has already been submitted" });
    }

    const head = await headObject(build.storageKey);
    if (!head) {
      return res.status(400).json({
        message: "The upload did not finish — no file arrived. Please try again.",
      });
    }

    // ContentLength was baked into the presigned signature, so a mismatch here
    // means something genuinely odd happened rather than a client fib.
    if (head.sizeBytes !== Number(build.sizeBytes)) {
      await deleteObject(build.storageKey).catch(() => {});
      await db.execute(sql`
        UPDATE game_builds SET status = 'removed', stored_bytes = 0, updated_at = now()
        WHERE id = ${buildId}
      `);
      return res.status(400).json({
        message: `The uploaded file is ${formatBytes(head.sizeBytes)}, but ${formatBytes(Number(build.sizeBytes))} was expected. Please start the upload again.`,
      });
    }

    let storedBytes = head.sizeBytes;
    let extractedPrefix: string | null = null;
    let webEntryPath: string | null = null;

    if (build.buildType === "web") {
      const prefix = webBuildPrefix(userId, buildId);
      cleanupPrefix = prefix;

      const archive = await getObjectBuffer(build.storageKey);
      const extracted = await extractWebBuild(archive, prefix);

      extractedPrefix = prefix;
      webEntryPath = extracted.entryPath;
      // The expanded tree is what occupies R2 from here on — the archive is
      // dropped, so quota must be billed against the extraction, not the zip.
      storedBytes = await prefixSize(prefix);
      await deleteObject(build.storageKey).catch((err) => {
        console.error(`[GameBuilds] Could not remove archive for build ${buildId}:`, err);
      });
      cleanupPrefix = null;
    }

    await db.execute(sql`
      UPDATE game_builds
      SET status = 'pending_review',
          stored_bytes = ${storedBytes},
          extracted_prefix = ${extractedPrefix},
          web_entry_path = ${webEntryPath},
          updated_at = now()
      WHERE id = ${buildId}
    `);

    res.json({
      buildId,
      status: "pending_review",
      storedBytes,
      message: "Upload received. A moderator will review the build before it goes live.",
    });
  } catch (error) {
    // Clean up whatever this attempt put in R2 before surfacing the failure.
    if (cleanupPrefix) {
      await deletePrefix(cleanupPrefix).catch((err) =>
        console.error(`[GameBuilds] Cleanup of ${cleanupPrefix} failed:`, err),
      );
    }
    if (Number.isInteger(buildId)) {
      await db
        .execute(sql`
          UPDATE game_builds SET status = 'removed', stored_bytes = 0, updated_at = now()
          WHERE id = ${buildId} AND status = 'pending_upload'
        `)
        .catch(() => {});
    }

    if (error instanceof BuildExtractionError) {
      // A rejected archive is the developer's problem to fix, not a server bug.
      return res.status(400).json({ message: error.message });
    }
    captureRouteError(error, { route: "game-builds POST /:id/complete" });
    res.status(500).json({ message: "Failed to finish processing the build" });
  }
});

/** Developer removes their own build. Bytes go first, then the row. */
router.delete("/:id", hybridAuth, async (req: Request, res: Response) => {
  try {
    const userId = currentUserId(req);
    if (!userId) return res.status(401).json({ message: "Not authenticated" });
    if (!requireR2(res)) return;

    const buildId = Number(req.params.id);
    if (!Number.isInteger(buildId)) return res.status(400).json({ message: "Invalid build id" });

    const found = await db.execute(sql`
      SELECT id, user_id AS "userId" FROM game_builds WHERE id = ${buildId} LIMIT 1
    `);
    const build = rowsOf(found)[0];
    if (!build) return res.status(404).json({ message: "Build not found" });
    if (Number(build.userId) !== userId) {
      return res.status(403).json({ message: "That build is not yours" });
    }

    // Delete objects before the row: if this throws, the row still points at
    // the bytes and the delete can be retried. The reverse leaks them forever.
    await deletePrefix(buildRootPrefix(userId, buildId));
    await db.execute(sql`
      UPDATE game_builds
      SET status = 'removed', stored_bytes = 0, hidden_at = NULL, hidden_reason = NULL, updated_at = now()
      WHERE id = ${buildId}
    `);

    res.json({ success: true });
  } catch (error) {
    captureRouteError(error, { route: "game-builds DELETE /:id" });
    res.status(500).json({ message: "Failed to remove the build" });
  }
});

// ---------------------------------------------------------------------------
// Public routes
// ---------------------------------------------------------------------------

/** Approved, visible builds for a game page. */
router.get("/game/:profileId", async (req: Request, res: Response) => {
  try {
    const profileId = Number(req.params.profileId);
    if (!Number.isInteger(profileId)) return res.status(400).json({ message: "Invalid game id" });

    const result = await db.execute(sql`
      SELECT id, build_type AS "buildType", platform, channel, label,
             size_bytes AS "sizeBytes", stored_bytes AS "storedBytes",
             download_count AS "downloadCount", created_at AS "createdAt"
      FROM game_builds
      WHERE profile_id = ${profileId}
        AND status = 'approved'
        AND hidden_at IS NULL
      ORDER BY build_type ASC, created_at DESC
    `);

    res.json({ builds: rowsOf(result) });
  } catch (error) {
    captureRouteError(error, { route: "game-builds GET /game/:profileId" });
    res.status(500).json({ message: "Failed to load builds" });
  }
});

/**
 * Mint a short-lived download URL and count the pull.
 *
 * POST rather than GET because it has an effect, and because a GET would be
 * prefetched by link scanners and inflate the count.
 */
router.post("/:id/download", downloadRateLimiter, async (req: Request, res: Response) => {
  try {
    if (!requireR2(res)) return;
    const buildId = Number(req.params.id);
    if (!Number.isInteger(buildId)) return res.status(400).json({ message: "Invalid build id" });

    const found = await db.execute(sql`
      SELECT id, build_type AS "buildType", storage_key AS "storageKey",
             original_file_name AS "originalFileName", status, hidden_at AS "hiddenAt"
      FROM game_builds WHERE id = ${buildId} LIMIT 1
    `);
    const build = rowsOf(found)[0];
    if (!build || build.status !== "approved" || build.hiddenAt) {
      return res.status(404).json({ message: "That build is not available" });
    }
    if (build.buildType !== "download") {
      return res.status(400).json({ message: "That build is played in the browser, not downloaded" });
    }

    const url = await createPresignedDownload({
      key: build.storageKey,
      downloadFileName: build.originalFileName,
    });

    // Deduped by (build, visitor, UTC day) via a unique index, so the counter
    // measures people rather than refreshes.
    const visitorKey = visitorKeyFor(req);
    const dayKey = new Date().toISOString().slice(0, 10);
    const userId = currentUserId(req);
    const logged = await db.execute(sql`
      INSERT INTO game_build_downloads (build_id, user_id, visitor_key, day_key)
      VALUES (${buildId}, ${userId}, ${visitorKey}, ${dayKey})
      ON CONFLICT (build_id, visitor_key, day_key) DO NOTHING
      RETURNING id
    `);
    if (rowsOf(logged).length > 0) {
      await db.execute(sql`
        UPDATE game_builds
        SET download_count = download_count + 1, last_downloaded_at = now(), updated_at = now()
        WHERE id = ${buildId}
      `);
    }

    res.json({ url });
  } catch (error) {
    captureRouteError(error, { route: "game-builds POST /:id/download" });
    res.status(500).json({ message: "Failed to prepare the download" });
  }
});

/**
 * Where to point an iframe for a browser-playable build.
 *
 * This deliberately returns a URL on the R2 public origin rather than proxying
 * the build through this server. The cross-origin boundary is what makes
 * running an untrusted developer's JavaScript acceptable — it has no access to
 * app cookies or session storage. Do not "fix" this by same-origin proxying.
 */
router.get("/:id/play", async (req: Request, res: Response) => {
  try {
    const buildId = Number(req.params.id);
    if (!Number.isInteger(buildId)) return res.status(400).json({ message: "Invalid build id" });
    if (!isWebBuildServingConfigured()) {
      return res.status(503).json({ message: "Browser-playable builds are not enabled on this server." });
    }

    const found = await db.execute(sql`
      SELECT id, build_type AS "buildType", extracted_prefix AS "extractedPrefix",
             web_entry_path AS "webEntryPath", status, hidden_at AS "hiddenAt"
      FROM game_builds WHERE id = ${buildId} LIMIT 1
    `);
    const build = rowsOf(found)[0];
    if (!build || build.status !== "approved" || build.hiddenAt) {
      return res.status(404).json({ message: "That build is not available" });
    }
    if (build.buildType !== "web" || !build.extractedPrefix || !build.webEntryPath) {
      return res.status(400).json({ message: "That build is not browser-playable" });
    }

    res.json({ url: publicWebUrl(`${build.extractedPrefix}${build.webEntryPath}`) });
  } catch (error) {
    captureRouteError(error, { route: "game-builds GET /:id/play" });
    res.status(500).json({ message: "Failed to open the build" });
  }
});

export default router;
