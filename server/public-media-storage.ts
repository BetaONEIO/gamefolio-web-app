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
        console.error("R2 public media upload failed; falling back to Supabase", error);
      }
    }
    return supabaseStorage.uploadBuffer(buffer, filename, contentType, type, userId);
  }
}

export const publicMediaStorage = new PublicMediaStorage();
