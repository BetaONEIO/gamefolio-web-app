import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import path from 'path';
import fs from 'fs/promises';
import sharp from 'sharp';
import { supabaseStorage } from './supabase-storage';

// Configure FFmpeg with static binary
ffmpeg.setFfmpegPath(ffmpegStatic!);

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
  ): Promise<{ videoUrl: string; thumbnailUrl?: string; thumbnailOptions?: string[] }> {
    await this.ensureDirectories();

    const filename = `clip_${clipId}.mp4`;
    const processedVideoPath = path.join(this.TEMP_DIR, filename);

    // Step 1: Trim the video (and crop if it's a reel)
    if (videoType === 'reel') {
      await this.trimAndCropVideoForReel(originalVideoPath, processedVideoPath, trimStart, trimEnd);
    } else {
      await this.trimVideo(originalVideoPath, processedVideoPath, trimStart, trimEnd);
    }
    
    // Step 2: Upload processed video to Supabase
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
            await this.generateThumbnail(processedVideoPath, thumbnailPath, thumbnailTimes[i]);
            
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
          thumbnailUrl = await this.generateFallbackThumbnail(userId, clipId);
        }
      } catch (thumbnailError) {
        console.error('Thumbnail generation completely failed:', thumbnailError);
        // Generate a fallback thumbnail
        thumbnailUrl = await this.generateFallbackThumbnail(userId, clipId);
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
      thumbnailOptions
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
    filePrefix: string = 'auto_thumb'
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

        // Generate thumbnail at random timestamp
        ffmpeg(videoPath)
          .seekInput(randomTime)
          .frames(1)
          .size('1280x720')
          .outputOptions(['-q:v 2']) // High quality JPEG
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
          const cropX = Math.floor((inputWidth - outputWidth) / 2);
          cropFilter = `crop=${outputWidth}:${outputHeight}:${cropX}:0`;
        } else {
          // Video is too tall, crop height but maintain reasonable scale
          outputWidth = inputWidth;
          outputHeight = Math.floor(inputWidth / targetAspectRatio);
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
    timeOffset: number = 1
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log(`Generating thumbnail from trimmed video: ${videoPath}`);
      
      ffmpeg(videoPath)
        .seekInput(1) // 1 second into the trimmed video
        .frames(1)
        .size('320x180')
        .output(thumbnailPath)
        .on('start', (commandLine: string) => {
          console.log('FFmpeg thumbnail command:', commandLine);
        })
        .on('end', async () => {
          try {
            console.log(`Thumbnail generated: ${thumbnailPath}`);
            
            // Optimize with sharp
            await sharp(thumbnailPath)
              .jpeg({ quality: 85 })
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
  private static async generateFallbackThumbnail(userId: number, clipId: number): Promise<string> {
    try {
      // Create a simple colored thumbnail with Sharp
      const thumbnailBuffer = await sharp({
        create: {
          width: 1280,
          height: 720,
          channels: 3,
          background: { r: 30, g: 30, b: 30 }
        }
      })
      .composite([{
        input: Buffer.from(`
          <svg width="1280" height="720" xmlns="http://www.w3.org/2000/svg">
            <rect width="1280" height="720" fill="#1e1e1e"/>
            <circle cx="640" cy="360" r="80" fill="#10b981"/>
            <polygon points="600,320 600,400 680,360" fill="white"/>
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

  static async getVideoInfo(videoPath: string): Promise<{ duration: number; width: number; height: number }> {
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

        resolve({
          duration: metadata.format?.duration || 0,
          width: videoStream.width || 0,
          height: videoStream.height || 0
        });
      });
    });
  }
}