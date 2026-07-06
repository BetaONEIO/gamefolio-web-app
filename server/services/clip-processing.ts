import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import { nanoid } from 'nanoid';
import QRCode from 'qrcode';
import { supabaseStorage } from '../supabase-storage';
import { storage } from '../storage';
import { insertClipSchema } from '@shared/schema';
import { VideoProcessor } from '../video-processor';
import { LeaderboardService, POINT_VALUES } from '../leaderboard-service';

const tempDir = path.join(process.cwd(), "temp");
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

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
}

/**
 * Resolves/creates the game record, trims/transcodes/thumbnails the video, and
 * creates the clip row. Extracted out of the browser-facing `/process-video`
 * route (server/routes/upload.ts) so the new OAuth public API
 * (server/routes/public-api-v1.ts) can create clips through the exact same
 * pipeline instead of a second, divergent copy of this logic.
 */
export async function processAndCreateClip(userId: number, params: ProcessAndCreateClipParams) {
  const { uploadResult, title, description, gameId, tags, ageRestricted, trimStart: rawTrimStart, trimEnd: rawTrimEnd } = params;
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

  let processedVideoUrl = uploadResult.url;
  let thumbnailUrl = '';
  let actualDuration = 0;

  const generateShareCode = () => nanoid(8);

  try {
    const tempVideoPath = path.join(tempDir, `video-${Date.now()}.mp4`);

    let downloadUrl = uploadResult.url;
    try {
      const signedUrl = await supabaseStorage.convertToSignedUrl(uploadResult.url, 300);
      if (signedUrl) {
        downloadUrl = signedUrl;
        console.log(`🔑 Using signed URL for video download`);
      }
    } catch (signError) {
      console.warn('Could not generate signed URL, falling back to public URL:', signError);
    }
    console.log(`🎬 Downloading video for thumbnail generation from: ${downloadUrl.substring(0, 80)}...`);
    const videoResponse = await fetch(downloadUrl);
    console.log(`📥 Video download response: ${videoResponse.status} ${videoResponse.statusText}`);

    if (videoResponse.ok) {
      const videoBuffer = await videoResponse.arrayBuffer();
      console.log(`📦 Video downloaded: ${(videoBuffer.byteLength / (1024 * 1024)).toFixed(2)} MB`);

      if (videoBuffer.byteLength > maxSizeBytes) {
        try { await supabaseStorage.deleteFile(uploadResult.path); } catch {}
        const actualSizeMB = (videoBuffer.byteLength / (1024 * 1024)).toFixed(1);
        throw new ClipProcessingError(403, {
          error: 'File size exceeds limit',
          message: `Maximum ${isReel ? 'reel' : 'clip'} size is ${maxSizeMB}MB (your file is ${actualSizeMB}MB).${limits.isPro ? '' : ' Upgrade to Pro for larger uploads.'}`,
          limits
        });
      }

      await fs.promises.writeFile(tempVideoPath, Buffer.from(videoBuffer));

      let sourceVideoCodec = '';
      let sourceAudioCodec: string | null = null;
      try {
        const videoInfo = await VideoProcessor.getVideoInfo(tempVideoPath);
        actualDuration = Math.round(videoInfo.duration);
        sourceVideoCodec = videoInfo.videoCodec;
        sourceAudioCodec = videoInfo.audioCodec;
        console.log(`📹 Video actual duration: ${actualDuration}s, codec: ${sourceVideoCodec || 'unknown'}/${sourceAudioCodec || 'none'}`);
      } catch (durationError) {
        console.warn('Failed to extract video info, using fallback:', durationError);
        actualDuration = 60;
      }

      if (actualDuration > maxDurationSeconds) {
        fs.unlink(tempVideoPath, () => {});
        throw new ClipProcessingError(403, {
          error: 'Video duration exceeds limit',
          message: `Maximum ${isReel ? 'reel' : 'clip'} duration is ${maxDurationSeconds} seconds (your video is ${actualDuration}s).${limits.isPro ? '' : ' Upgrade to Pro for longer videos.'}`,
          limits
        });
      }

      const tempClipId = Date.now();

      const requestedTrimStart = rawTrimStart !== undefined && rawTrimStart !== null ? parseInt(String(rawTrimStart)) : 0;
      const requestedTrimEnd = rawTrimEnd !== undefined && rawTrimEnd !== null ? parseInt(String(rawTrimEnd)) : actualDuration;
      const hasTrimming = requestedTrimStart > 0 || requestedTrimEnd < actualDuration;

      if (videoType === 'reel') {
        console.log(`🎬 Processing reel with 9:16 aspect ratio cropping (trim: ${requestedTrimStart}s - ${requestedTrimEnd}s)`);
        const { videoUrl: croppedVideoUrl, thumbnailUrl: reelThumbnailUrl, duration: processedDuration } = await VideoProcessor.processVideo(
          tempVideoPath, tempClipId, requestedTrimStart, requestedTrimEnd, true, userId, 'reel'
        );
        processedVideoUrl = croppedVideoUrl;
        thumbnailUrl = reelThumbnailUrl || '';
        actualDuration = processedDuration;
        console.log(`✅ Reel processed successfully. Thumbnail: ${thumbnailUrl ? thumbnailUrl.substring(0, 60) + '...' : 'NONE'}`);
      } else if (hasTrimming) {
        console.log(`✂️ Trimming clip: ${requestedTrimStart}s - ${requestedTrimEnd}s`);
        const { videoUrl: trimmedVideoUrl, thumbnailUrl: clipThumbnailUrl, duration: processedDuration } = await VideoProcessor.processVideo(
          tempVideoPath, tempClipId, requestedTrimStart, requestedTrimEnd, true, userId, 'clip'
        );
        processedVideoUrl = trimmedVideoUrl;
        thumbnailUrl = clipThumbnailUrl || '';
        actualDuration = processedDuration;
        console.log(`✅ Clip trimmed successfully. Duration: ${actualDuration}s`);
      } else if (sourceVideoCodec && !VideoProcessor.isBrowserPlayable(sourceVideoCodec, sourceAudioCodec)) {
        console.log(`🔄 Re-encoding clip — source codec ${sourceVideoCodec}/${sourceAudioCodec || 'none'} is not browser-playable`);
        const { videoUrl: reencodedUrl, thumbnailUrl: clipThumbnailUrl, duration: processedDuration } = await VideoProcessor.processVideo(
          tempVideoPath, tempClipId, 0, actualDuration, true, userId, 'clip'
        );
        processedVideoUrl = reencodedUrl;
        thumbnailUrl = clipThumbnailUrl || '';
        actualDuration = processedDuration;
        console.log(`✅ Clip re-encoded to H.264. Duration: ${actualDuration}s`);
      } else {
        console.log('🖼️ Generating clip thumbnail (no trimming/re-encode needed)...');
        thumbnailUrl = await VideoProcessor.generateAutoThumbnail(tempVideoPath, userId, `${videoType}_thumb`);
        console.log(`✅ Clip thumbnail generated: ${thumbnailUrl ? thumbnailUrl.substring(0, 60) + '...' : 'NONE'}`);
      }

      fs.unlink(tempVideoPath, (err) => {
        if (err) console.warn('Could not delete temp video file:', err);
      });
    } else {
      console.warn('Could not download video for thumbnail generation, using fallback');
      try {
        console.log('Attempting alternative video download for duration extraction...');
        const response = await fetch(downloadUrl);
        if (response.ok) {
          const videoBuffer = await response.arrayBuffer();
          const retryTempPath = path.join(tempDir, `retry-video-${Date.now()}.mp4`);
          await fs.promises.writeFile(retryTempPath, Buffer.from(videoBuffer));

          try {
            const videoInfo = await VideoProcessor.getVideoInfo(retryTempPath);
            actualDuration = Math.round(videoInfo.duration);
            console.log(`📹 Successfully extracted duration on retry: ${actualDuration} seconds`);
            fs.unlink(retryTempPath, (err) => {
              if (err) console.warn('Could not delete retry temp file:', err);
            });
          } catch (retryDurationError) {
            console.warn('Retry duration extraction also failed, using conservative fallback');
            actualDuration = 30;
            fs.unlink(retryTempPath, (err) => {
              if (err) console.warn('Could not delete retry temp file:', err);
            });
          }
        } else {
          throw new Error('Retry download failed');
        }
      } catch (retryError) {
        console.warn('Could not extract duration with retry, using fallback');
        actualDuration = 30;
      }

      const thumbnailBuffer = await sharp({
        create: { width: 1280, height: 720, channels: 3, background: { r: 30, g: 30, b: 30 } }
      }).jpeg({ quality: 80 }).toBuffer();

      const thumbnailResult = await supabaseStorage.uploadBuffer(
        thumbnailBuffer, `fallback_thumb_${Date.now()}.jpg`, 'image/jpeg', 'thumbnail', userId
      );

      thumbnailUrl = thumbnailResult.url;
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

  const shareCode = generateShareCode();

  const finalClipData = {
    userId,
    title,
    description: description || '',
    gameId: finalGameId,
    tags: tags || [],
    videoUrl: processedVideoUrl,
    videoType,
    thumbnailUrl,
    duration: actualDuration || 60,
    trimStart: rawTrimStart !== undefined && rawTrimStart !== null ? parseInt(String(rawTrimStart)) : 0,
    trimEnd: rawTrimEnd !== undefined && rawTrimEnd !== null ? parseInt(String(rawTrimEnd)) : actualDuration,
    ageRestricted: ageRestricted === true || ageRestricted === 'true',
    shareCode,
  };

  const validatedClipData = insertClipSchema.parse(finalClipData);
  const clip = await storage.createClip(validatedClipData);

  await LeaderboardService.awardPoints(
    userId,
    'upload',
    `Upload: ${videoType === 'reel' ? 'Reel' : 'Clip'} - ${title}`
  );

  const baseUrl = 'https://app.gamefolio.com';
  const user = await storage.getUser(userId);
  console.log(`🎯 XP Debug - User after award: ID=${user?.id}, totalXP=${user?.totalXP}, level=${user?.level}`);
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
    xpGained: POINT_VALUES['upload'] ?? 200,
    userXP: user?.totalXP || 0,
    userLevel: user?.level || 1,
    message: 'Video processed successfully'
  };
}
