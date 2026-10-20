import { r2Storage } from "./r2-storage";
import { supabaseStorage } from "./supabase-storage";

class PublicMediaStorage {
  async uploadBuffer(
    buffer: Buffer,
    filename: string,
    contentType: string,
    type: "video" | "image" | "thumbnail",
    userId: number,
  ): Promise<{ url: string; path: string }> {
    if (r2Storage.enabled) {
      try {
        return await r2Storage.uploadBuffer(buffer, filename, contentType, type, userId);
      } catch (error) {
        if (type === "video") {
          console.error("R2 video upload failed; Supabase fallback is disabled", error);
          throw error;
        }
        console.error("R2 public media upload failed; falling back to Supabase", error);
      }
    }
    if (type === "video") {
      throw new Error("R2 public media storage is required for video uploads");
    }
    return supabaseStorage.uploadBuffer(buffer, filename, contentType, type, userId);
  }

  async deleteFile(url: string, storagePath: string): Promise<void> {
    const publicBase = process.env.R2_PUBLIC_BASE_URL?.replace(/\/+$/, "");
    if (publicBase && url.startsWith(`${publicBase}/`)) {
      await r2Storage.deleteFile(storagePath);
      return;
    }
    await supabaseStorage.deleteFile(storagePath);
  }
}

export const publicMediaStorage = new PublicMediaStorage();
