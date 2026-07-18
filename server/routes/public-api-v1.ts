import { Router, Request, Response } from 'express';
import fs from 'fs';
import { storage } from '../storage';
import { supabaseStorage } from '../supabase-storage';
import { VideoProcessor } from '../video-processor';
import { requireOAuthScope } from '../middleware/oauth-auth';
import { oauthRateLimiter } from '../oauth-rate-limiter';
import { upload } from './upload';
import { processAndCreateClip, ClipProcessingError } from '../services/clip-processing';

const router = Router();

// clips.videoUrl/thumbnailUrl are stored as Supabase "public" URLs, but the
// gamefolio-media bucket is private — those URLs 400 with "Bucket not found"
// unless converted to a signed URL first. Mirrors the signClipUrls helper in
// server/routes.ts (kept separate rather than shared since that one also
// touches first-party-only fields this API doesn't expose).
async function signMediaUrl(url: string | null | undefined): Promise<string | null | undefined> {
  if (!url || !url.includes('supabase.co/storage')) return url;
  const signed = await supabaseStorage.convertToSignedUrl(url, 3600);
  return signed ?? url;
}

async function signClipMediaUrls<T extends { thumbnailUrl?: string | null; videoUrl?: string | null }>(clip: T): Promise<T> {
  const [thumbnailUrl, videoUrl] = await Promise.all([
    signMediaUrl(clip.thumbnailUrl),
    signMediaUrl(clip.videoUrl),
  ]);
  return { ...clip, thumbnailUrl, videoUrl };
}

/**
 * GET /api/public/v1/me — profile:read
 * Strict allow-list of fields; deliberately excludes email by default.
 */
router.get('/me', requireOAuthScope('profile:read'), oauthRateLimiter, async (req: Request, res: Response) => {
  try {
    const user = await storage.getUserById(req.oauthContext!.userId);
    if (!user) return res.status(404).json({ error: 'not_found' });
    return res.json({
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
    });
  } catch (error) {
    console.error('[Public API v1] GET /me error:', error);
    return res.status(500).json({ error: 'server_error' });
  }
});

const CLIPS_DEFAULT_PAGE_SIZE = 20;
const CLIPS_MAX_PAGE_SIZE = 50;

/**
 * GET /api/public/v1/clips — clips:read
 * Only the authorizing user's own clips — public catalog browsing doesn't need OAuth.
 * Paginated (limit/pageSize + page) — an unpaginated fetch of a prolific
 * streamer's full clip history is what was timing out integrations out at 20s.
 */
router.get('/clips', requireOAuthScope('clips:read'), oauthRateLimiter, async (req: Request, res: Response) => {
  try {
    const rawLimit = Number(req.query.limit ?? req.query.pageSize);
    const limit = Number.isFinite(rawLimit) && rawLimit > 0
      ? Math.min(Math.floor(rawLimit), CLIPS_MAX_PAGE_SIZE)
      : CLIPS_DEFAULT_PAGE_SIZE;

    const rawPage = Number(req.query.page);
    const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;
    const offset = (page - 1) * limit;

    const { clips, total } = await storage.getClipsByUserIdPaginated(req.oauthContext!.userId, { limit, offset });
    const signedClips = await Promise.all(clips.map(signClipMediaUrls));
    return res.json({
      clips: signedClips,
      pagination: { page, pageSize: limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    });
  } catch (error) {
    console.error('[Public API v1] GET /clips error:', error);
    return res.status(500).json({ error: 'server_error' });
  }
});

router.get('/clips/:id', requireOAuthScope('clips:read'), oauthRateLimiter, async (req: Request, res: Response) => {
  try {
    const clip = await storage.getClipById(Number(req.params.id));
    if (!clip || clip.userId !== req.oauthContext!.userId) {
      return res.status(404).json({ error: 'not_found' });
    }
    return res.json({ clip: await signClipMediaUrls(clip) });
  } catch (error) {
    console.error('[Public API v1] GET /clips/:id error:', error);
    return res.status(500).json({ error: 'server_error' });
  }
});

/**
 * POST /api/public/v1/clips — clips:write
 * Multipart: video file + title/gameId/videoType/description/tags. Uploads to
 * Gamefolio's own storage (same as an in-app upload) and creates the clip via the
 * shared processAndCreateClip pipeline — a single call does what the browser flow
 * does in two (raw upload, then process) for a much better external API DX.
 */
router.post('/clips', requireOAuthScope('clips:write'), oauthRateLimiter, upload.single('file'), async (req: Request, res: Response) => {
  const userId = req.oauthContext!.userId;

  if (!req.file) {
    return res.status(400).json({ error: 'invalid_request', message: 'No video file provided' });
  }

  try {
    const { title, description, gameId, tags, videoType = 'clip', ageRestricted, trimStart, trimEnd } = req.body;

    if (!title) {
      if (req.file.path) fs.unlink(req.file.path, () => {});
      return res.status(400).json({ error: 'invalid_request', message: 'title is required' });
    }

    const limits = await storage.getUploadLimits(userId);
    const isReel = videoType === 'reel';
    const maxVideoSizeMB = isReel ? limits.maxReelSizeMB : limits.maxClipSizeMB;
    const maxDurationSeconds = isReel ? limits.maxReelDurationSeconds : limits.maxClipDurationSeconds;

    const fileSizeMB = req.file.size / (1024 * 1024);
    if (fileSizeMB > maxVideoSizeMB) {
      if (req.file.path) fs.unlink(req.file.path, () => {});
      return res.status(403).json({
        error: 'file_too_large',
        message: `Maximum ${isReel ? 'reel' : 'clip'} size is ${maxVideoSizeMB}MB (your file is ${fileSizeMB.toFixed(1)}MB).${limits.isPro ? '' : ' Upgrade to Pro for larger uploads.'}`,
        limits
      });
    }

    try {
      const videoInfo = await VideoProcessor.getVideoInfo(req.file.path);
      const durationSeconds = Math.round(videoInfo.duration || 0);
      if (durationSeconds > maxDurationSeconds) {
        if (req.file.path) fs.unlink(req.file.path, () => {});
        return res.status(403).json({
          error: 'duration_too_long',
          message: `Maximum ${isReel ? 'reel' : 'clip'} duration is ${maxDurationSeconds} seconds (your video is ${durationSeconds}s).${limits.isPro ? '' : ' Upgrade to Pro for longer videos.'}`,
          limits
        });
      }
    } catch (durationCheckError) {
      console.warn('[Public API v1] Could not determine video duration before upload:', durationCheckError);
    }

    const fileBuffer = fs.readFileSync(req.file.path);
    const timestamp = Date.now();
    const randomId = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = req.file.originalname.includes('.') ? '.' + req.file.originalname.split('.').pop() : '';
    const prefix = videoType === 'reel' ? 'reels' : 'videos';
    const fileName = `${prefix}/${timestamp}-${randomId}${extension}`;

    const uploadResult = await supabaseStorage.uploadBuffer(fileBuffer, fileName, req.file.mimetype, videoType, userId);
    fs.unlink(req.file.path, (err) => {
      if (err) console.warn('[Public API v1] Could not delete temp file:', err);
    });

    if (!uploadResult.url) {
      throw new Error('Supabase upload failed - no URL returned');
    }

    const responseData = await processAndCreateClip(userId, {
      uploadResult: { url: uploadResult.url, path: `users/${userId}/${fileName}` },
      title,
      description,
      gameId,
      tags: Array.isArray(tags) ? tags : typeof tags === 'string' ? tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
      videoType,
      ageRestricted,
      trimStart,
      trimEnd,
    });

    return res.status(201).json({
      ...responseData,
      clip: await signClipMediaUrls(responseData.clip),
    });
  } catch (error) {
    if (req.file?.path) fs.unlink(req.file.path, () => {});
    if (error instanceof ClipProcessingError) {
      return res.status(error.status).json(error.body);
    }
    console.error('[Public API v1] POST /clips error:', error);
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Upload failed' });
  }
});

export default router;
