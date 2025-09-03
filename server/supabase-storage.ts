import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';

const readFile = promisify(fs.readFile);

export class SupabaseStorage {
  private supabase;
  private bucketName: string;
  private allowedBuckets: string[];
  private disallowedBuckets: string[];
  private strictMode: boolean;
  private preventLocalStorageFallback: boolean;

  constructor() {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      throw new Error('Missing Supabase environment variables. Please set SUPABASE_URL and SUPABASE_ANON_KEY');
    }

    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      }
    );

    // Enforce strict Supabase-only storage rules
    this.bucketName = 'gamefolio-media';
    this.allowedBuckets = ['gamefolio-media'];
    this.disallowedBuckets = ['gamefoliowebappmediacontent', 'gamefolio-media-v2'];
    this.strictMode = true;
    this.preventLocalStorageFallback = true;

    console.log('🔒 Supabase storage initialized in strict mode - local storage fallback disabled');

    // Verify bucket exists on initialization (non-blocking)
    this.checkBucket().then(exists => {
      if (!exists) {
        console.error(`⚠️  Supabase bucket '${this.bucketName}' validation failed - but continuing startup`);
        console.error('This may cause issues with file uploads. Please ensure the bucket exists.');
      }
    }).catch(error => {
      console.error('⚠️  Bucket validation failed:', error.message);
      console.error('Continuing startup - file operations may fail if bucket doesn\'t exist');
    });
  }

  /**
   * Enforce bucket usage rules
   */
  private validateBucketAccess(bucketName: string): void {
    if (this.strictMode) {
      if (!this.allowedBuckets.includes(bucketName)) {
        throw new Error(`Access denied: Bucket "${bucketName}" is not in the allowed list: ${this.allowedBuckets.join(', ')}`);
      }

      if (this.disallowedBuckets.includes(bucketName)) {
        throw new Error(`Access denied: Bucket "${bucketName}" is explicitly disallowed`);
      }
    }
  }

  /**
   * Prevent local storage fallback
   */
  private preventLocalStorage(): void {
    if (this.preventLocalStorageFallback) {
      throw new Error('Local storage fallback is disabled. All media must use Supabase storage exclusively.');
    }
  }

  /**
   * Check if storage bucket exists and provide helpful error if not
   */
  async checkBucket() {
    this.validateBucketAccess(this.bucketName);

    try {
      // Use list operation instead of getBucket as it's more reliable
      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .list('', { limit: 1 });

      if (error && (error.message.includes('not found') || error.message.includes('Bucket not found'))) {
        console.error(`Supabase storage bucket '${this.bucketName}' not found.`);
        console.error('Please create the bucket manually in your Supabase dashboard:');
        console.error('1. Go to Storage in your Supabase dashboard');
        console.error('2. Click "Create bucket"');
        console.error(`3. Name it '${this.bucketName}'`);
        console.error('4. Set it to public');
        console.error('5. Allow image/* and video/* file types');
        return false;
      } else if (error) {
        console.error('Error checking bucket:', error);
        return false;
      }

      console.log(`✅ Supabase bucket '${this.bucketName}' is accessible`);
      return true;
    } catch (error) {
      console.error('Error checking Supabase storage:', error);
      return false;
    }
  }

  /**
   * Generate a unique filename with proper extension
   */
  private generateFilename(originalName: string, type: 'video' | 'image' | 'thumbnail'): string {
    const timestamp = Date.now();
    const randomId = randomBytes(8).toString('hex');
    const extension = path.extname(originalName);
    const prefix = type === 'video' ? 'videos' : type === 'thumbnail' ? 'thumbnails' : 'images';

    return `${prefix}/${timestamp}-${randomId}${extension}`;
  }

  /**
   * Upload a file to Supabase storage
   */
  async uploadFile(
    file: Express.Multer.File, 
    type: 'video' | 'image' | 'thumbnail',
    userId: number
  ): Promise<{ url: string; path: string }> {
    try {
      const filename = this.generateFilename(file.originalname, type);
      const filePath = `users/${userId}/${filename}`;

      // Read file buffer
      const fileBuffer = await readFile(file.path);

      // Upload to Supabase
      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .upload(filePath, fileBuffer, {
          contentType: file.mimetype,
          cacheControl: '31536000', // 1 year
          upsert: false
        });

      if (error) {
        console.error('Supabase upload error:', error);
        throw error;
      }

      // Get public URL
      const { data: { publicUrl } } = this.supabase.storage
        .from(this.bucketName)
        .getPublicUrl(filePath);

      return {
        url: publicUrl,
        path: filePath
      };
    } catch (error) {
      console.error('Error uploading file to Supabase:', error);
      throw error;
    }
  }

  /**
   * Upload a buffer directly to Supabase storage
   */
  async uploadBuffer(
    buffer: Buffer,
    filename: string,
    contentType: string,
    type: 'video' | 'image' | 'thumbnail',
    userId: number
  ): Promise<{ url: string; path: string }> {
    try {
      const generatedFilename = this.generateFilename(filename, type);
      const filePath = `users/${userId}/${generatedFilename}`;

      // Upload to Supabase
      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .upload(filePath, buffer, {
          contentType,
          cacheControl: '31536000', // 1 year
          upsert: false
        });

      if (error) {
        console.error('Supabase upload error:', error);
        throw error;
      }

      // Get public URL
      const { data: { publicUrl } } = this.supabase.storage
        .from(this.bucketName)
        .getPublicUrl(filePath);

      return {
        url: publicUrl,
        path: filePath
      };
    } catch (error) {
      console.error('Error uploading buffer to Supabase:', error);
      throw error;
    }
  }

  /**
   * Delete a file from Supabase storage
   */
  async deleteFile(filePath: string): Promise<boolean> {
    try {
      const { error } = await this.supabase.storage
        .from(this.bucketName)
        .remove([filePath]);

      if (error) {
        console.error('Error deleting file from Supabase:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error deleting file from Supabase:', error);
      return false;
    }
  }

  /**
   * Get file URL from Supabase storage
   */
  getFileUrl(filePath: string): string {
    const { data: { publicUrl } } = this.supabase.storage
      .from(this.bucketName)
      .getPublicUrl(filePath);

    return publicUrl;
  }

  /**
   * Move file from local storage to Supabase storage
   */
  async migrateLocalFile(
    localFilePath: string,
    filename: string,
    contentType: string,
    type: 'video' | 'image' | 'thumbnail',
    userId: number
  ): Promise<{ url: string; path: string }> {
    try {
      // Read local file
      const fileBuffer = await readFile(localFilePath);

      // Upload to Supabase
      const result = await this.uploadBuffer(fileBuffer, filename, contentType, type, userId);

      // Optionally delete local file after successful upload
      try {
        fs.unlinkSync(localFilePath);
      } catch (deleteError) {
        console.warn('Could not delete local file after migration:', deleteError);
      }

      return result;
    } catch (error) {
      console.error('Error migrating local file to Supabase:', error);
      throw error;
    }
  }

  /**
   * Check if a file exists in Supabase storage
   */
  async fileExists(filePath: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .list(path.dirname(filePath), {
          search: path.basename(filePath)
        });

      if (error) {
        return false;
      }

      return data && data.length > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get storage stats for a user
   */
  async getUserStorageStats(userId: number): Promise<{
    totalFiles: number;
    totalSize: number;
    videoFiles: number;
    imageFiles: number;
  }> {
    try {
      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .list(`users/${userId}`, {
          limit: 1000
        });

      if (error) {
        console.error('Error getting user storage stats:', error);
        return { totalFiles: 0, totalSize: 0, videoFiles: 0, imageFiles: 0 };
      }

      const stats = {
        totalFiles: data.length,
        totalSize: data.reduce((sum, file) => sum + (file.metadata?.size || 0), 0),
        videoFiles: data.filter(file => file.metadata?.mimetype?.startsWith('video/')).length,
        imageFiles: data.filter(file => file.metadata?.mimetype?.startsWith('image/')).length
      };

      return stats;
    } catch (error) {
      console.error('Error calculating user storage stats:', error);
      return { totalFiles: 0, totalSize: 0, videoFiles: 0, imageFiles: 0 };
    }
  }
}

// Create singleton instance
export const supabaseStorage = new SupabaseStorage();