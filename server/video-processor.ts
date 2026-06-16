import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs/promises';
import { accessSync } from 'fs';
import { execSync } from 'child_process';
import sharp from 'sharp';
import { supabaseStorage } from './supabase-storage';

// Find FFmpeg path and log its source
const { path: ffmpegPath, source } = (function() {
  // 1. Check environment variable
  if (process.env.FFMPEG_PATH) {
    try {
      accessSync(process.env.FFMPEG_PATH);
      return { path: process.env.FFMPEG_PATH, source: 'FFMPEG_PATH env var' };
    } catch {}
  }

  // 2. Try to find system FFmpeg using 'which'
  try {
    const systemPath = execSync('which ffmpeg', { encoding: 'utf8' }).trim();
    if (systemPath) {
      accessSync(systemPath);
      return { path: systemPath, source: 'system' };
    }
  } catch {}

  // 3. Fall back to ffmpeg-static package
  try {
    const ffmpegStatic = require('ffmpeg-static');
    if (ffmpegStatic) {
      accessSync(ffmpegStatic);
      return { path: ffmpegStatic, source: 'ffmpeg-static package' };
    }
  } catch {}

  return { path: null, source: null };
})();

if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath);
  console.log(`✅ Using FFmpeg (${source}): ${ffmpegPath}`);
} else {
  console.error('❌ FFmpeg not found - video processing will fail!');
  console.error('   Install FFmpeg or set FFMPEG_PATH environment variable');
}

export class VideoProcessor {
  private static readonly TEMP_DIR = path.join(process.cwd(), 'temp');

  static async ensureDirectories(): Promise<void> {
    try {
      await fs.access(this.TEMP_DIR);
    } catch {
      await fs.mkdir(this.TEMP_DIR, { recursive: true });
    }
  }

  static async processVideo(
    originalVideoPath: string,
    clipId: number,
    trimStart: number,
    trimEnd: number,
    generateThumbnail: boolean = true,
    userId: number = 0,
    videoType: 'clip' | 'reel' = 'clip'
  ): Promise<{ videoUrl: string; thumbnailUrl?: string; thumbnailOptions?: string[]; duration: number }> {
    await this.ensureDirectories();

    const filename = `clip_${clipId}.mp4`;
    const processedVideoPath = path.join(this.TEMP_DIR, filename);

    // Step 1: Trim the video (and crop if it's a reel)
    if (videoType === 'reel') {
      await this.trimAndCropVideoForReel(originalVideoPath, processedVideoPath, trimStart, trimEnd);
    } else {
      await this.trimVideo(originalVideoPath, processedVideoPath, trimStart, trimEnd);
    }
    
    // Step 2: Get the actual duration of the processed video
    const videoInfo = await this.getVideoInfo(processedVideoPath);
    const actualDuration = Math.round(videoInfo.duration);
    
    // Step 3: Upload processed video to Supabase
    const videoBuffer = await fs.readFile(processedVideoPath);
    const { url: videoUrl } = await supabaseStorage.uploadBuffer(
      videoBuffer,
      filename,
      'video/mp4',
      'video',
      userId
    );
    
    let thumbnailUrl: string | undefined;
    let thumbnailOptions: string[] | undefined;
    
    if (generateThumbnail) {
      try {
        // Step 3: Generate multiple thumbnails from trimmed video for user selection
        const videoDuration = trimEnd - trimStart;
        const thumbnailTimes = [
          Math.max(1, videoDuration * 0.1), // 10% into video
          Math.max(1, videoDuration * 0.3), // 30% into video
          Math.max(1, videoDuration * 0.5), // 50% into video
          Math.max(1, videoDuration * 0.7), // 70% into video
          Math.max(1, videoDuration * 0.9), // 90% into video
        ];
        
        thumbnailOptions = [];
        
        for (let i = 0; i < thumbnailTimes.length; i++) {
          try {
            const thumbnailFilename = `thumb_${clipId}_${i}.jpg`;
            const thumbnailPath = path.join(this.TEMP_DIR, thumbnailFilename);
            await this.generateThumbnail(processedVideoPath, thumbnailPath, thumbnailTimes[i], videoType);
            
            // Upload thumbnail to Supabase
            const thumbnailBuffer = await fs.readFile(thumbnailPath);
            const { url: supabaseThumbnailUrl } = await supabaseStorage.uploadBuffer(
              thumbnailBuffer,
              thumbnailFilename,
              'image/jpeg',
              'thumbnail',
              userId
            );
            
            thumbnailOptions.push(supabaseThumbnailUrl);
            
            // Clean up local thumbnail file
            try {
              await fs.unlink(thumbnailPath);
            } catch (error) {
              console.warn('Could not delete local thumbnail file:', error);
            }
          } catch (thumbError) {
            console.warn(`Failed to generate thumbnail ${i}:`, thumbError);
            // Continue with next thumbnail attempt
          }
        }
        
        // Use first successful thumbnail as default
        thumbnailUrl = thumbnailOptions.length > 0 ? thumbnailOptions[0] : undefined;
        
        // If no thumbnails were generated, create a fallback
        if (!thumbnailUrl) {
          console.warn('All thumbnail generation attempts failed, creating fallback thumbnail');
          thumbnailUrl = await this.generateFallbackThumbnail(userId, clipId, videoType);
        }
      } catch (thumbnailError) {
        console.error('Thumbnail generation completely failed:', thumbnailError);
        // Generate a fallback thumbnail
        thumbnailUrl = await this.generateFallbackThumbnail(userId, clipId, videoType);
      }
    }

    // Clean up local processed video file
    try {
      await fs.unlink(processedVideoPath);
    } catch (error) {
      console.warn('Could not delete local processed video file:', error);
    }

    return {
      videoUrl,
      thumbnailUrl,
      thumbnailOptions,
      duration: actualDuration
    };
  }

  static async generateThumbnailFromVideo(
    videoPath: string,
    clipId: number,
    timeOffset: number = 1
  ): Promise<string> {
    await this.ensureDirectories();
    
    const thumbnailFilename = `thumb_${clipId}.jpg`;
    const thumbnailPath = path.join(this.TEMP_DIR, thumbnailFilename);
    
    await this.generateThumbnail(videoPath, thumbnailPath, timeOffset);
    
    // Upload thumbnail to Supabase instead of serving locally
    const thumbnailBuffer = await fs.readFile(thumbnailPath);
    const { url: supabaseThumbnailUrl } = await supabaseStorage.uploadBuffer(
      thumbnailBuffer,
      thumbnailFilename,
      'image/jpeg',
      'thumbnail',
      0 // Default user ID for system-generated thumbnails
    );
    
    // Clean up local thumbnail file
    try {
      await fs.unlink(thumbnailPath);
    } catch (error) {
      console.warn('Could not delete local thumbnail file:', error);
    }
    
    return supabaseThumbnailUrl;
  }

  /**
   * Generate automatic thumbnail from random frame between 10% and 90% of video duration
   * This is used for automatic thumbnail generation on upload
   */
  static async generateAutoThumbnail(
    videoPath: string,
    userId: number,
    filePrefix: string = 'auto_thumb',
    videoType: 'clip' | 'reel' = 'clip'
  ): Promise<string> {
    await this.ensureDirectories();
    
    const thumbnailFilename = `${filePrefix}_${Date.now()}.jpg`;
    const thumbnailPath = path.join(this.TEMP_DIR, thumbnailFilename);
    
    return new Promise((resolve, reject) => {
      // First get video duration
      ffmpeg.ffprobe(videoPath, async (err: any, metadata: any) => {
        if (err) {
          reject(new Error(`Failed to get video metadata: ${err.message}`));
          return;
        }

        const duration = metadata.format.duration;
        if (!duration) {
          reject(new Error('Could not determine video duration'));
          return;
        }

        // Generate random timestamp between 10% and 90% of video duration
        const minTime = Math.max(1, duration * 0.1);
        const maxTime = Math.min(duration - 1, duration * 0.9);
        const randomTime = Math.random() * (maxTime - minTime) + minTime;

        // Use appropriate size based on video type
        // Reels: 9:16 (1080x1920), Clips: 16:9 (1920x1080)
        const thumbnailSize = videoType === 'reel' ? '1080x1920' : '1920x1080';

        // Generate thumbnail at random timestamp
        ffmpeg(videoPath)
          .seekInput(randomTime)
          .frames(1)
          .size(thumbnailSize)
          .outputOptions(['-q:v 1']) // Highest quality JPEG
          .output(thumbnailPath)
          .on('end', async () => {
            try {
              console.log(`Auto thumbnail generated at ${randomTime.toFixed(2)}s: ${thumbnailPath}`);
              
              // Upload thumbnail to Supabase
              const thumbnailBuffer = await fs.readFile(thumbnailPath);
              const { url: supabaseThumbnailUrl } = await supabaseStorage.uploadBuffer(
                thumbnailBuffer,
                thumbnailFilename,
                'image/jpeg',
                'thumbnail',
                userId
              );
              
              // Clean up local thumbnail file
              try {
                await fs.unlink(thumbnailPath);
              } catch (error) {
                console.warn('Could not delete local thumbnail file:', error);
              }
              
              resolve(supabaseThumbnailUrl);
            } catch (uploadError) {
              reject(new Error(`Thumbnail upload failed: ${uploadError}`));
            }
          })
          .on('error', (error: any) => {
            console.error('Error generating auto thumbnail:', error);
            reject(new Error(`Auto thumbnail generation failed: ${error.message}`));
          })
          .run();
      });
    });
  }

  private static async trimVideo(
    inputPath: string,
    outputPath: string,
    startTime: number,
    endTime: number
  ): Promise<void> {
    const duration = endTime - startTime;
    
    return new Promise((resolve, reject) => {
      console.log(`Trimming video from ${startTime}s to ${endTime}s (duration: ${duration}s)`);
      
      ffmpeg(inputPath)
        .seekInput(startTime)
        .duration(duration)
        .videoCodec('libx264')
        .audioCodec('aac')
        .outputOptions([
          '-preset fast',
          '-crf 23',
          '-movflags +faststart'
        ])
        .output(outputPath)
        .on('start', (commandLine: string) => {
          console.log('FFmpeg trim command:', commandLine);
        })
        .on('progress', (progress: any) => {
          console.log(`Trimming progress: ${Math.round(progress.percent || 0)}%`);
        })
        .on('end', () => {
          console.log(`Video trimmed successfully: ${outputPath}`);
          resolve();
        })
        .on('error', (error: any) => {
          console.error('Error trimming video:', error);
          reject(error);
        })
        .run();
    });
  }

  /**
   * Trim and crop video to 9:16 aspect ratio for reels
   * This will crop the video to fit a 9:16 (vertical) aspect ratio
   */
  private static async trimAndCropVideoForReel(
    inputPath: string,
    outputPath: string,
    startTime: number,
    endTime: number
  ): Promise<void> {
    const duration = endTime - startTime;
    
    return new Promise((resolve, reject) => {
      console.log(`Trimming and cropping reel from ${startTime}s to ${endTime}s (duration: ${duration}s) to 9:16 aspect ratio`);
      
      // Get video dimensions first to calculate crop parameters
      ffmpeg.ffprobe(inputPath, (err: any, metadata: any) => {
        if (err) {
          reject(new Error(`Failed to get video metadata: ${err.message}`));
          return;
        }

        const videoStream = metadata.streams.find((stream: any) => stream.codec_type === 'video');
        if (!videoStream) {
          reject(new Error('No video stream found'));
          return;
        }

        const inputWidth = videoStream.width;
        const inputHeight = videoStream.height;
        const inputAspectRatio = inputWidth / inputHeight;
        const targetAspectRatio = 9 / 16; // 9:16 for reels

        let cropFilter: string;
        let outputWidth: number;
        let outputHeight: number;

        if (inputAspectRatio > targetAspectRatio) {
          // Video is too wide, crop width but maintain reasonable scale
          outputHeight = inputHeight;
          outputWidth = Math.floor(inputHeight * targetAspectRatio);
          // Ensure outputWidth doesn't exceed inputWidth
          outputWidth = Math.min(outputWidth, inputWidth);
          const cropX = Math.floor((inputWidth - outputWidth) / 2);
          cropFilter = `crop=${outputWidth}:${outputHeight}:${cropX}:0`;
        } else {
          // Video is too tall, crop height but maintain reasonable scale
          outputWidth = inputWidth;
          outputHeight = Math.floor(inputWidth / targetAspectRatio);
          // Ensure outputHeight doesn't exceed inputHeight
          outputHeight = Math.min(outputHeight, inputHeight);
          const cropY = Math.floor((inputHeight - outputHeight) / 2);
          cropFilter = `crop=${outputWidth}:${outputHeight}:0:${cropY}`;
        }
        
        // Add scaling to ensure reasonable output dimensions (max 1080p height for reels)
        const maxReelHeight = 1920; // 1080 * (16/9) = 1920 for 9:16
        const maxReelWidth = 1080;
        
        if (outputHeight > maxReelHeight || outputWidth > maxReelWidth) {
          const scale = Math.min(maxReelWidth / outputWidth, maxReelHeight / outputHeight);
          const finalWidth = Math.floor(outputWidth * scale);
          const finalHeight = Math.floor(outputHeight * scale);
          cropFilter += `,scale=${finalWidth}:${finalHeight}`;
          console.log(`Scaling reel to ${finalWidth}x${finalHeight} for optimal quality`);
        }

        console.log(`Cropping ${inputWidth}x${inputHeight} to ${outputWidth}x${outputHeight} for 9:16 aspect ratio`);

        // Validate crop parameters to prevent FFmpeg errors
        if (outputWidth <= 0 || outputHeight <= 0) {
          reject(new Error(`Invalid crop dimensions: ${outputWidth}x${outputHeight}`));
          return;
        }

        if (outputWidth > inputWidth || outputHeight > inputHeight) {
          reject(new Error(`Crop dimensions ${outputWidth}x${outputHeight} exceed input dimensions ${inputWidth}x${inputHeight}`));
          return;
        }

        ffmpeg(inputPath)
          .seekInput(startTime)
          .duration(duration)
          .videoFilter(cropFilter)
          .videoCodec('libx264')
          .audioCodec('aac')
          .outputOptions([
            '-preset fast',
            '-crf 23',
            '-movflags +faststart'
          ])
          .output(outputPath)
          .on('start', (commandLine: string) => {
            console.log('FFmpeg reel crop command:', commandLine);
          })
          .on('progress', (progress: any) => {
            console.log(`Reel processing progress: ${Math.round(progress.percent || 0)}%`);
          })
          .on('end', () => {
            console.log(`Reel processed successfully with 9:16 crop: ${outputPath}`);
            resolve();
          })
          .on('error', (error: any) => {
            console.error('Error processing reel:', error);
            reject(error);
          })
          .run();
      });
    });
  }

  private static async generateThumbnail(
    videoPath: string,
    thumbnailPath: string,
    timeOffset: number = 1,
    videoType: 'clip' | 'reel' = 'clip'
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log(`Generating thumbnail from trimmed video: ${videoPath}`);
      
      // Use appropriate aspect ratio based on video type
      // Reels: 9:16 (540x960), Clips: 16:9 (960x540)
      const thumbnailSize = videoType === 'reel' ? '540x960' : '960x540';
      
      ffmpeg(videoPath)
        .seekInput(1) // 1 second into the trimmed video
        .frames(1)
        .size(thumbnailSize)
        .output(thumbnailPath)
        .on('start', (commandLine: string) => {
          console.log('FFmpeg thumbnail command:', commandLine);
        })
        .on('end', async () => {
          try {
            console.log(`Thumbnail generated: ${thumbnailPath}`);
            
            // Optimize with sharp
            await sharp(thumbnailPath)
              .jpeg({ quality: 92, mozjpeg: true })
              .toFile(thumbnailPath.replace('.jpg', '_opt.jpg'));
            
            // Replace original with optimized
            await fs.rename(thumbnailPath.replace('.jpg', '_opt.jpg'), thumbnailPath);
            console.log('Thumbnail optimized with Sharp');
            
            resolve();
          } catch (error) {
            console.error('Error optimizing thumbnail:', error);
            // Continue even if optimization fails
            resolve();
          }
        })
        .on('error', (error: any) => {
          console.error('Error generating thumbnail:', error);
          reject(error);
        })
        .run();
    });
  }

  /**
   * Generate a fallback thumbnail when video thumbnail generation fails
   */
  private static async generateFallbackThumbnail(userId: number, clipId: number, videoType: 'clip' | 'reel' = 'clip'): Promise<string> {
    try {
      // Use appropriate dimensions based on video type
      // Reels: 9:16 (720x1280), Clips: 16:9 (1280x720)
      const width = videoType === 'reel' ? 720 : 1280;
      const height = videoType === 'reel' ? 1280 : 720;
      const centerX = width / 2;
      const centerY = height / 2;
      
      // Create a simple colored thumbnail with Sharp
      const thumbnailBuffer = await sharp({
        create: {
          width,
          height,
          channels: 3,
          background: { r: 30, g: 30, b: 30 }
        }
      })
      .composite([{
        input: Buffer.from(`
          <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
            <rect width="${width}" height="${height}" fill="#1e1e1e"/>
            <circle cx="${centerX}" cy="${centerY}" r="80" fill="#10b981"/>
            <polygon points="${centerX-40},${centerY-40} ${centerX-40},${centerY+40} ${centerX+40},${centerY}" fill="white"/>
          </svg>
        `),
        top: 0,
        left: 0
      }])
      .jpeg({ quality: 80 })
      .toBuffer();

      // Upload fallback thumbnail
      const { url: fallbackThumbnailUrl } = await supabaseStorage.uploadBuffer(
        thumbnailBuffer,
        `fallback_thumb_${clipId}.jpg`,
        'image/jpeg',
        'thumbnail',
        userId
      );

      console.log('✅ Fallback thumbnail created successfully');
      return fallbackThumbnailUrl;
    } catch (fallbackError) {
      console.error('❌ Even fallback thumbnail generation failed:', fallbackError);
      // Return empty string if everything fails
      return '';
    }
  }

  /**
   * Generate a personalised outro video: dark background → logo fade+glow → @username fade-in.
   * Landscape/default: 1080×1080 square (fill-cropped to 16:9 at download time).
   * Portrait: 1080×1920 (9:16, fills portrait/reel clips natively).
   * Returns the raw MP4 buffer (caller uploads to storage).
   */
  static async generateOutroVideo(username: string, userId: number, format: 'portrait' | 'landscape' = 'landscape'): Promise<Buffer> {
    await this.ensureDirectories();

    const outputPath = path.join(this.TEMP_DIR, `outro_${userId}_${format}_${Date.now()}.mp4`);
    const logoPath = path.join(process.cwd(), 'client', 'public', 'attached_assets', 'gamefolio-logo-green.png');
    const fontPath = path.join(process.cwd(), 'server', 'assets', 'fonts', 'SpaceGrotesk-Bold.ttf');

    // Strip any characters that could break the drawtext filter
    const safeUser = `@${username}`.replace(/[^a-zA-Z0-9_@.-]/g, '');

    const logoExists = (() => {
      try { accessSync(logoPath); return true; } catch { return false; }
    })();

    const audioPath = path.join(process.cwd(), 'server', 'assets', 'audio', 'outro-sting.mp3');
    const audioExists = (() => {
      try { accessSync(audioPath); return true; } catch { return false; }
    })();

    // Portrait (reels): 9:16 canvas; landscape/default: square (fill-cropped at download time)
    const canvasSize = format === 'portrait' ? '1080x1920' : '1080x1080';
    // Timing: logo fades in at 0.3 s over 0.8 s (fully visible at 1.1 s)
    //         username fades in at 1.1 s (0.8 s after logo starts) over 0.8 s
    const logoFadeStart = 0.3;
    const logoFadeDur   = 0.8;
    const userFadeStart = logoFadeStart + logoFadeDur; // 1.1 s
    const userFadeDur   = 0.8;
    const totalDur      = 4;

    return new Promise<Buffer>((resolve, reject) => {
      const cmd = (ffmpeg as any)()
        // Input 0: 4-second solid dark background
        .input(`color=c=0x0B1319:size=${canvasSize}:rate=30:d=${totalDur}`)
        .inputOptions(['-f', 'lavfi']);

      if (logoExists) {
        cmd.input(logoPath).inputOptions(['-loop', '1']);
      }

      // Audio input index: 2 if logo present, 1 otherwise
      const audioIdx = logoExists ? 2 : 1;
      if (audioExists) {
        cmd.input(audioPath);
      }

      const audioFilter = audioExists
        ? [`[${audioIdx}:a]adelay=400:all=1,atrim=duration=3.5,aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo[aout]`]
        : [];

      const filters: string[] = logoExists ? [
        // Scale logo to 320 px wide, force RGBA
        '[1:v]scale=320:-1,format=rgba[logo_raw]',
        // Split into glow copy and main copy
        '[logo_raw]split=2[logo1][logo2]',
        // Blur second copy to create the glow halo
        '[logo2]gblur=sigma=22[glow_blur]',
        // Logo fades in at logoFadeStart s over logoFadeDur s
        `[logo1]fade=t=in:st=${logoFadeStart}:d=${logoFadeDur}:alpha=1[logo_faded]`,
        `[glow_blur]fade=t=in:st=${logoFadeStart}:d=${logoFadeDur}:alpha=1[glow_faded]`,
        // Composite: glow behind logo, both centred
        '[0:v][glow_faded]overlay=(W-w)/2:(H-h)/2-90[bg_glow]',
        '[bg_glow][logo_faded]overlay=(W-w)/2:(H-h)/2-90[with_logo]',
        // Username text fades in 0.8 s AFTER logo starts (i.e. once logo is fully visible)
        `[with_logo]drawtext=text='${safeUser}':fontfile='${fontPath}':fontsize=66:fontcolor=white:x=(w-tw)/2:y=(h/2)+120:alpha='if(lt(t\\,${userFadeStart})\\,0\\,if(lt(t\\,${userFadeStart + userFadeDur})\\,(t-${userFadeStart})/${userFadeDur}\\,1))'[out]`,
        ...audioFilter,
      ] : [
        // Fallback: no logo — just text fading in at userFadeStart
        `[0:v]drawtext=text='${safeUser}':fontfile='${fontPath}':fontsize=66:fontcolor=white:x=(w-tw)/2:y=(h/2)+10:alpha='if(lt(t\\,${userFadeStart})\\,0\\,if(lt(t\\,${userFadeStart + userFadeDur})\\,(t-${userFadeStart})/${userFadeDur}\\,1))'[out]`,
        ...audioFilter,
      ];

      cmd
        .complexFilter(filters)
        .outputOptions([
          '-map', '[out]',
          ...(audioExists ? ['-map', '[aout]', '-c:a', 'aac', '-ar', '44100'] : ['-an']),
          '-c:v', 'libx264',
          '-t', `${totalDur}`,
          '-preset', 'slow',
          '-crf', '18',
          '-pix_fmt', 'yuv420p',
        ])
        .format('mp4')
        .on('error', (err: Error) => {
          console.error('❌ Outro generation failed:', err.message);
          reject(err);
        })
        .on('end', async () => {
          try {
            const buffer = await fs.readFile(outputPath);
            await fs.unlink(outputPath).catch(() => {});
            resolve(buffer);
          } catch (e) {
            reject(e);
          }
        })
        .save(outputPath);
    });
  }

  static async getVideoInfo(videoPath: string): Promise<{ duration: number; width: number; height: number; videoCodec: string; audioCodec: string | null }> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (error: any, metadata: any) => {
        if (error) {
          reject(error);
          return;
        }

        const videoStream = metadata.streams.find((stream: any) => stream.codec_type === 'video');
        if (!videoStream) {
          reject(new Error('No video stream found'));
          return;
        }

        const audioStream = metadata.streams.find((stream: any) => stream.codec_type === 'audio');

        resolve({
          duration: metadata.format?.duration || 0,
          width: videoStream.width || 0,
          height: videoStream.height || 0,
          videoCodec: (videoStream.codec_name || '').toLowerCase(),
          audioCodec: audioStream ? (audioStream.codec_name || '').toLowerCase() : null
        });
      });
    });
  }

  /**
   * Returns true when the file can be played as-is by a standard HTML <video>
   * element across browsers / WebViews. Anything else (HEVC/H.265, 10-bit,
   * ProRes, exotic audio, etc.) must be re-encoded to H.264 + AAC before it is
   * served, otherwise it will fail to play for viewers — the same way it fails
   * to preview at upload time.
   */
  static isBrowserPlayable(videoCodec: string, audioCodec: string | null): boolean {
    const videoOk = videoCodec === 'h264';
    const audioOk = audioCodec === null || audioCodec === 'aac' || audioCodec === 'mp3';
    return videoOk && audioOk;
  }
}