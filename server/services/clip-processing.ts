import sharp from 'sharp';
import { nanoid } from 'nanoid';
import QRCode from 'qrcode';
import { supabaseStorage } from '../supabase-storage';
import { storage } from '../storage';
import { insertClipSchema, type Clip } from '@shared/schema';
import { VideoProcessor } from '../video-processor';
import { XPService } from '../xp-service';
import { CreatorMilestoneService } from '../creator-milestone-service';

// Thrown for the "expected" failure cases (bad input, over limits) so both the
// in-app upload route and the OAuth public API can map it back to the exact same
// HTTP status/body they used to return inline.
export class ClipProcessingError extends Error {
  status: number;
  body: any;
  constructor(status: number, body: any) {
    super(typeof body?.error === 'string' ? body.error : 'Clip processing failed');
    this.status = status;
    this.body = body;
  }
}

export interface ProcessAndCreateClipParams {
  uploadResult: { url: string; path: string };
  title: string;
  description?: string;
  gameId?: string | number;
  tags?: string[];
  videoType?: 'clip' | 'reel';
  ageRestricted?: boolean | string;
  trimStart?: string | number;
  trimEnd?: string | number;
  // When set, the fully-processed clip is stored as a scheduled post instead
  // of being published immediately — see routes/upload.ts for the pre-check
  // that rejects invalid/over-limit schedules before this expensive pipeline runs.
  scheduledAt?: Date;
  // Spam/multi-account detection signals — caller derives these from the
  // request (see server/lib/request-meta.ts) since this service has no req.
  uploadIp?: string;
  uploadDeviceId?: string | null;
}

/**
 * Resolves/creates the game record, trims/transcodes/thumbnails the video, and
 * creates the clip row. Extracted out of the browser-facing `/process-video`
 * route (server/routes/upload.ts) so the new OAuth public API
 * (server/routes/public-api-v1.ts) can create clips through the exact same
 * pipeline instead of a second, divergent copy of this logic.
 */
export async function processAndCreateClip(userId: number, params: ProcessAndCreateClipParams) {
  const { uploadResult, title, description, gameId, tags, ageRestricted, trimStart: rawTrimStart, trimEnd: rawTrimEnd, scheduledAt, uploadIp, uploadDeviceId } = params;
  const videoType = params.videoType || 'clip';

  if (!uploadResult || !title) {
    throw new ClipProcessingError(400, { error: 'Missing required fields' });
  }
  if (!uploadResult.url || !uploadResult.path) {
    throw new ClipProcessingError(400, { error: 'Invalid upload result' });
  }
  if (!['clip', 'reel'].includes(videoType)) {
    throw new ClipProcessingError(400, { error: 'Invalid video type. Must be "clip" or "reel"' });
  }

  // Check upload limits before processing (size already validated at the raw-upload
  // step; duration is enforced after we have the actual video info below).
  const limits = await storage.getUploadLimits(userId);
  const isReel = videoType === 'reel';
  const maxDurationSeconds = isReel ? limits.maxReelDurationSeconds : limits.maxClipDurationSeconds;
  const maxSizeMB = isReel ? limits.maxReelSizeMB : limits.maxClipSizeMB;
  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  // Rolling 24h upload-count cap - reject before any expensive
  // download/transcode work below. Covers both the browser upload route and
  // the OAuth public API, since both call through this shared function.
  const usedInWindow = isReel ? limits.reelsUsedInWindow : limits.clipsUsedInWindow;
  const maxPerWindow = isReel ? limits.maxReelsPerWindow : limits.maxClipsPerWindow;
  if (usedInWindow >= maxPerWindow) {
    throw new ClipProcessingError(403, {
      error: 'Upload limit reached',
      message: `You've reached your ${maxPerWindow} ${isReel ? 'reel' : 'clip'} upload limit for now.${limits.isPro ? '' : ' Upgrade to Pro for a higher limit.'}`,
      limits,
    });
  }

  // Handle game ID - ensure game exists in database
  let finalGameId = null;
  if (gameId) {
    try {
      const parsedGameId = parseInt(String(gameId));

      let game = await storage.getGame(parsedGameId);
      if (!game) {
        console.log(`Game ${parsedGameId} not found in database, fetching from Twitch API`);
        try {
          game = await storage.getGameByTwitchId(parsedGameId.toString());

          if (!game) {
            const { twitchApi } = await import('./twitch-api.js');
            const gameData = await twitchApi.getGameById(parsedGameId.toString());

            if (gameData) {
              const existingGameByName = await storage.getGameByName(gameData.name);
              if (existingGameByName) {
                console.log(`✅ Found existing game by name: ${gameData.name} (ID: ${existingGameByName.id})`);
                game = existingGameByName;
                finalGameId = existingGameByName.id;
              } else {
                try {
                  game = await storage.createGame({
                    name: gameData.name,
                    imageUrl: gameData.box_art_url ?
                      gameData.box_art_url.replace('{width}', '600').replace('{height}', '800') : '',
                    twitchId: gameData.id
                  });
                  console.log(`✅ Created game: ${game.name} (ID: ${game.id}, Twitch ID: ${gameData.id})`);
                  finalGameId = game.id;
                } catch (createError: any) {
                  if (createError.code === '23505') {
                    console.log(`Game "${gameData.name}" was created by another request, fetching it`);
                    const raceConditionGame = await storage.getGameByName(gameData.name);
                    if (raceConditionGame) {
                      game = raceConditionGame;
                      finalGameId = raceConditionGame.id;
                    } else {
                      throw createError;
                    }
                  } else {
                    throw createError;
                  }
                }
              }
            } else {
              console.warn(`❌ Game ${parsedGameId} not found in Twitch API`);
              finalGameId = null;
            }
          } else {
            console.log(`✅ Found existing game by Twitch ID: ${game.name} (ID: ${game.id})`);
            finalGameId = game.id;
          }
        } catch (apiError) {
          console.error('Error fetching from Twitch API:', apiError);
          finalGameId = null;
        }
      } else {
        finalGameId = parsedGameId;
      }
    } catch (error) {
      console.warn('Invalid game ID provided:', gameId);
      finalGameId = null;
    }
  }

  // Validate clip data with detailed error logging
  const initialClipData = {
    userId,
    title,
    description: description || '',
    gameId: finalGameId,
    tags: tags || [],
    videoUrl: uploadResult.url,
    videoType,
    thumbnailUrl: '',
    duration: 0,
    ageRestricted: ageRestricted === true || ageRestricted === 'true',
  };
  try {
    insertClipSchema.parse(initialClipData);
  } catch (validationError: any) {
    console.error('❌ Clip validation failed:', {
      titleLength: title?.length,
      descriptionLength: description?.length,
      tagsCount: tags?.length,
      error: validationError.errors || validationError.message
    });
    throw new ClipProcessingError(400, {
      error: 'Invalid clip data',
      details: validationError.errors || validationError.message
    });
  }

  const generateShareCode = () => nanoid(8);

  // Fast probe only: size (HEAD) + duration/codec (ffprobe reading just the
  // header via range requests) — both quick, unlike the trim/transcode/
  // thumbnail work below. Doing this up front lets us reject an over-limit
  // upload immediately instead of accepting it and only discovering the
  // problem in the background.
  let downloadUrl = uploadResult.url;
  try {
    const signedUrl = await supabaseStorage.convertToSignedUrl(uploadResult.url, 300);
    if (signedUrl) {
      downloadUrl = signedUrl;
      console.log(`🔑 Using signed URL for video processing`);
    }
  } catch (signError) {
    console.warn('Could not generate signed URL, falling back to public URL:', signError);
  }

  const headResp = await fetch(downloadUrl, { method: 'HEAD' });
  const sizeBytes = parseInt(headResp.headers.get('content-length') || '0', 10);
  if (sizeBytes > maxSizeBytes) {
    try { await supabaseStorage.deleteFile(uploadResult.path); } catch {}
    const actualSizeMB = (sizeBytes / (1024 * 1024)).toFixed(1);
    throw new ClipProcessingError(403, {
      error: 'File size exceeds limit',
      message: `Maximum ${isReel ? 'reel' : 'clip'} size is ${maxSizeMB}MB (your file is ${actualSizeMB}MB).${limits.isPro ? '' : ' Upgrade to Pro for larger uploads.'}`,
      limits
    });
  }

  let sourceVideoCodec = '';
  let sourceAudioCodec: string | null = null;
  let actualDuration = 0;
  try {
    const videoInfo = await VideoProcessor.getVideoInfo(downloadUrl);
    actualDuration = Math.round(videoInfo.duration);
    sourceVideoCodec = videoInfo.videoCodec;
    sourceAudioCodec = videoInfo.audioCodec;
    console.log(`📹 Video actual duration: ${actualDuration}s, codec: ${sourceVideoCodec || 'unknown'}/${sourceAudioCodec || 'none'}`);
  } catch (probeError) {
    console.warn('Failed to extract video info, using fallback:', probeError);
    actualDuration = 60;
  }

  if (actualDuration > maxDurationSeconds) {
    throw new ClipProcessingError(403, {
      error: 'Video duration exceeds limit',
      message: `Maximum ${isReel ? 'reel' : 'clip'} duration is ${maxDurationSeconds} seconds (your video is ${actualDuration}s).${limits.isPro ? '' : ' Upgrade to Pro for longer videos.'}`,
      limits
    });
  }

  const requestedTrimStart = rawTrimStart !== undefined && rawTrimStart !== null ? parseInt(String(rawTrimStart)) : 0;
  const requestedTrimEnd = rawTrimEnd !== undefined && rawTrimEnd !== null ? parseInt(String(rawTrimEnd)) : actualDuration;

  const pipelineCtx: ClipPipelineContext = {
    downloadUrl, requestedTrimStart, requestedTrimEnd, videoType, userId,
    sourceVideoCodec, sourceAudioCodec, sizeBytes, actualDuration,
  };

  // A quick single-frame grab (ffmpeg seeks + reads one frame via an HTTP
  // range request — not a download) so the profile page has something real
  // to show immediately instead of a bare "processing" placeholder box.
  // Best-effort and bounded: if it's slow or fails for any reason, the row
  // just starts with no thumbnail and the background pipeline's own
  // (possibly better, e.g. post-crop) thumbnail fills it in once ready.
  let previewThumbnailUrl = '';
  try {
    previewThumbnailUrl = await Promise.race([
      VideoProcessor.generateAutoThumbnail(downloadUrl, userId, `${videoType}_thumb_preview`),
      new Promise<string>((_, reject) => setTimeout(() => reject(new Error('preview thumbnail timed out')), 15000)),
    ]);
  } catch (previewError) {
    console.warn('Preview thumbnail generation failed, continuing without one:', previewError);
  }

  const shareCode = generateShareCode();
  const placeholderClipData = {
    userId,
    title,
    description: description || '',
    gameId: finalGameId,
    tags: tags || [],
    videoUrl: uploadResult.url,
    videoType,
    thumbnailUrl: previewThumbnailUrl,
    duration: actualDuration || 60,
    trimStart: requestedTrimStart,
    trimEnd: requestedTrimEnd,
    ageRestricted: ageRestricted === true || ageRestricted === 'true',
    shareCode,
    uploadIp: uploadIp ?? null,
    uploadDeviceId: uploadDeviceId ?? null,
  };
  const validatedClipData = insertClipSchema.parse(placeholderClipData);

  // Scheduled path: unchanged — runs the full pipeline synchronously up
  // front (still processed now, just not published live). A scheduled post
  // isn't shown anywhere until its publish time, so there's no "processing"
  // state that needs to be surfaced to the user in the meantime.
  if (scheduledAt) {
    const { videoUrl, thumbnailUrl, duration } = await runClipProcessingPipeline({
      ...pipelineCtx, uploadResultUrl: uploadResult.url, uploadResultPath: uploadResult.path,
    });
    const scheduled = await storage.createScheduledPost({
      userId,
      contentType: 'clip',
      scheduledAt,
      payload: { ...validatedClipData, videoUrl, thumbnailUrl, duration },
      title: validatedClipData.title,
      thumbnailUrl: thumbnailUrl || null,
      videoType,
    });
    // The file was actually processed/uploaded now, not at the future
    // publish time, so it consumes the window now.
    await storage.incrementUploadUsage(userId, videoType);
    return {
      success: true,
      scheduled,
      message: `${videoType === 'reel' ? 'Reel' : 'Clip'} scheduled for ${scheduledAt.toISOString()}`,
    };
  }

  // Live path: create the row now with status "processing" — videoUrl still
  // points at the raw upload — and return immediately. The heavy
  // trim/transcode/thumbnail work runs in the background via
  // finishClipProcessing below (with a periodic reconciler as a safety net
  // if the process restarts mid-job; see server/clip-processing-worker.ts).
  const clip = await storage.createClip({ ...validatedClipData, status: 'processing', rawUploadPath: uploadResult.path });
  await storage.incrementUploadUsage(userId, videoType);

  await XPService.awardXP(
    userId,
    250,
    'upload',
    `Earned 250 XP for uploading a ${videoType === 'reel' ? 'reel' : 'clip'}`,
    clip.id
  );
  // "Upload Today" daily challenge bonus — separate from the flat upload XP above.
  CreatorMilestoneService.checkFirstUploadOfDay(userId).catch((err) => {
    console.error('Error checking first-upload-of-day milestone:', err);
  });

  finishClipProcessing(clip, pipelineCtx).catch((err) => {
    console.error(`Background processing failed to even start for clip ${clip.id}:`, err);
  });

  const baseUrl = 'https://app.gamefolio.com';
  const user = await storage.getUser(userId);
  const username = user?.username || 'unknown';
  const contentType = videoType === 'reel' ? 'reel' : 'clip';
  const clipUrl = `${baseUrl}/@${username}/${contentType}/${clip.shareCode}`;
  const qrCodeDataUrl = await QRCode.toDataURL(clipUrl);

  const socialMediaLinks = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(clipUrl)}`,
    twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check out my ${videoType}!`)}&url=${encodeURIComponent(clipUrl)}`,
    reddit: `https://www.reddit.com/submit?url=${encodeURIComponent(clipUrl)}&title=${encodeURIComponent(`Check out this gaming ${videoType}!`)}`,
    discord: clipUrl
  };

  return {
    success: true,
    clip: { ...clip, qrCode: qrCodeDataUrl, shareUrl: clipUrl, socialMediaLinks },
    xpGained: 250,
    userXP: user?.totalXP || 0,
    userLevel: user?.level || 1,
    message: 'Upload received — your clip is processing and will appear on your profile shortly.'
  };
}

interface ClipPipelineContext {
  downloadUrl: string;
  requestedTrimStart: number;
  requestedTrimEnd: number;
  videoType: 'clip' | 'reel';
  userId: number;
  sourceVideoCodec: string;
  sourceAudioCodec: string | null;
  sizeBytes: number;
  actualDuration: number;
}

/**
 * The actual trim/crop/re-encode/thumbnail work — the part that can take
 * minutes for a large clip. Shared by the synchronous scheduled-post path
 * and the background finishClipProcessing path below. Never throws for a
 * processing failure (falls back to the raw upload + a placeholder
 * thumbnail, same as it always has) — only for the upstream limit checks
 * that already ran before this is called.
 */
async function runClipProcessingPipeline(
  ctx: ClipPipelineContext & { uploadResultUrl: string; uploadResultPath: string }
): Promise<{ videoUrl: string; thumbnailUrl: string; duration: number }> {
  const {
    downloadUrl, requestedTrimStart, requestedTrimEnd, videoType, userId,
    sourceVideoCodec, sourceAudioCodec, sizeBytes, uploadResultUrl, uploadResultPath,
  } = ctx;
  let processedVideoUrl = uploadResultUrl;
  let thumbnailUrl = '';
  let actualDuration = ctx.actualDuration;
  const tempClipId = Date.now();
  const hasTrimming = requestedTrimStart > 0 || requestedTrimEnd < actualDuration;

  try {
    if (videoType === 'reel') {
      console.log(`🎬 Processing reel with 9:16 aspect ratio cropping (trim: ${requestedTrimStart}s - ${requestedTrimEnd}s)`);
      const { videoUrl: croppedVideoUrl, thumbnailUrl: reelThumbnailUrl, duration: processedDuration } = await VideoProcessor.processVideo(
        downloadUrl, tempClipId, requestedTrimStart, requestedTrimEnd, true, userId, 'reel'
      );
      processedVideoUrl = croppedVideoUrl;
      thumbnailUrl = reelThumbnailUrl || '';
      actualDuration = processedDuration;
      console.log(`✅ Reel processed successfully. Thumbnail: ${thumbnailUrl ? thumbnailUrl.substring(0, 60) + '...' : 'NONE'}`);
    } else if (hasTrimming) {
      console.log(`✂️ Trimming clip: ${requestedTrimStart}s - ${requestedTrimEnd}s`);
      const { videoUrl: trimmedVideoUrl, thumbnailUrl: clipThumbnailUrl, duration: processedDuration } = await VideoProcessor.processVideo(
        downloadUrl, tempClipId, requestedTrimStart, requestedTrimEnd, true, userId, 'clip'
      );
      processedVideoUrl = trimmedVideoUrl;
      thumbnailUrl = clipThumbnailUrl || '';
      actualDuration = processedDuration;
      console.log(`✅ Clip trimmed successfully. Duration: ${actualDuration}s`);
    } else if (sourceVideoCodec && !VideoProcessor.isBrowserPlayable(sourceVideoCodec, sourceAudioCodec)) {
      console.log(`🔄 Re-encoding clip — source codec ${sourceVideoCodec}/${sourceAudioCodec || 'none'} is not browser-playable`);
      const { videoUrl: reencodedUrl, thumbnailUrl: clipThumbnailUrl, duration: processedDuration } = await VideoProcessor.processVideo(
        downloadUrl, tempClipId, 0, actualDuration, true, userId, 'clip'
      );
      processedVideoUrl = reencodedUrl;
      thumbnailUrl = clipThumbnailUrl || '';
      actualDuration = processedDuration;
      console.log(`✅ Clip re-encoded to H.264. Duration: ${actualDuration}s`);
    } else {
      // No trim and already browser-playable, but raw phone/console/OBS
      // captures are frequently 20-50+ Mbps — far above what's needed for
      // feed/mobile playback. Re-encoding at CRF 23 (same target reels
      // always get) cuts storage + per-view egress with no visible quality
      // loss, so only genuinely already-efficient clips skip it.
      const sourceBitrateMbps = actualDuration > 0
        ? (sizeBytes * 8) / actualDuration / 1_000_000
        : 0;
      const MAX_CLIP_BITRATE_MBPS = 6;
      if (sourceBitrateMbps > MAX_CLIP_BITRATE_MBPS) {
        console.log(`📉 Compressing clip — source bitrate ~${sourceBitrateMbps.toFixed(1)} Mbps exceeds ${MAX_CLIP_BITRATE_MBPS} Mbps target`);
        const { videoUrl: compressedUrl, thumbnailUrl: clipThumbnailUrl, duration: processedDuration } = await VideoProcessor.processVideo(
          downloadUrl, tempClipId, 0, actualDuration, true, userId, 'clip'
        );
        processedVideoUrl = compressedUrl;
        thumbnailUrl = clipThumbnailUrl || '';
        actualDuration = processedDuration;
        console.log(`✅ Clip compressed. Duration: ${actualDuration}s`);
      } else {
        // No download at all here — ffmpeg pulls only the header + the
        // one seeked-to frame it needs via HTTP range requests.
        console.log(`🖼️ Generating clip thumbnail (bitrate ~${sourceBitrateMbps.toFixed(1)} Mbps already efficient, no re-encode needed)...`);
        thumbnailUrl = await VideoProcessor.generateAutoThumbnail(downloadUrl, userId, `${videoType}_thumb`);
        console.log(`✅ Clip thumbnail generated: ${thumbnailUrl ? thumbnailUrl.substring(0, 60) + '...' : 'NONE'}`);
      }
    }

    // Re-encoding (reel crop, trim, or compression above) uploads a new
    // processed file and the clip row stores processedVideoUrl — the raw
    // upload this replaced is no longer referenced anywhere, so leaving it
    // in Supabase storage is pure orphaned cost. Safe to delete: nothing
    // still points at it.
    if (processedVideoUrl !== uploadResultUrl) {
      try {
        await supabaseStorage.deleteFile(uploadResultPath);
      } catch (cleanupError) {
        console.warn('Could not delete superseded raw upload:', cleanupError);
      }
    }
  } catch (thumbnailError) {
    if (thumbnailError instanceof ClipProcessingError) throw thumbnailError;
    console.error('❌ Thumbnail generation failed:', thumbnailError);
    try {
      console.log('🔄 Creating fallback thumbnail...');
      const fallbackBuffer = await sharp({
        create: {
          width: videoType === 'reel' ? 720 : 1280,
          height: videoType === 'reel' ? 1280 : 720,
          channels: 3,
          background: { r: 30, g: 30, b: 30 }
        }
      }).jpeg({ quality: 80 }).toBuffer();

      const fallbackResult = await supabaseStorage.uploadBuffer(
        fallbackBuffer, `fallback_thumb_${Date.now()}.jpg`, 'image/jpeg', 'thumbnail', userId
      );
      thumbnailUrl = fallbackResult.url;
      console.log(`✅ Fallback thumbnail created: ${thumbnailUrl.substring(0, 60)}...`);
    } catch (fallbackError) {
      console.error('❌ Even fallback thumbnail failed:', fallbackError);
      thumbnailUrl = '';
    }
  }

  return { videoUrl: processedVideoUrl, thumbnailUrl, duration: actualDuration || 60 };
}

const MAX_PROCESSING_ATTEMPTS = 3;

/**
 * Finishes background processing for a clip created with status
 * "processing" (videoUrl still the raw upload). Called immediately after
 * upload (fire-and-forget) and again by the periodic reconciler
 * (server/clip-processing-worker.ts) for any row that's still "processing"
 * after the in-process attempt should have finished — e.g. because the
 * server restarted mid-job.
 */
export async function finishClipProcessing(clip: Clip, ctx: ClipPipelineContext) {
  try {
    const { videoUrl, thumbnailUrl, duration } = await runClipProcessingPipeline({
      ...ctx, uploadResultUrl: clip.videoUrl, uploadResultPath: clip.rawUploadPath || '',
    });
    await storage.updateClip(clip.id, {
      videoUrl, thumbnailUrl, duration,
      status: 'ready', rawUploadPath: null, updatedAt: new Date(),
    });
  } catch (err) {
    const attempts = (clip.processingAttempts ?? 0) + 1;
    console.error(`Background processing failed for clip ${clip.id} (attempt ${attempts}):`, err);
    await storage.updateClip(clip.id, {
      status: attempts >= MAX_PROCESSING_ATTEMPTS ? 'failed' : 'processing',
      processingError: err instanceof Error ? err.message : String(err),
      processingAttempts: attempts,
      updatedAt: new Date(),
    });
  }
}
