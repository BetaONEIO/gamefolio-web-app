import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { randomBytes } from "crypto";
import path from "path";

const trimSlash = (value: string) => value.replace(/\/+$/, "");

class R2Storage {
  private client: S3Client | null = null;

  get enabled(): boolean {
    return Boolean(
      process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET &&
      process.env.R2_PUBLIC_BASE_URL
    );
  }

  private getClient(): S3Client {
    if (!this.enabled) throw new Error("R2 public media storage is not configured");
    if (!this.client) {
      const endpoint = process.env.R2_ENDPOINT ||
        `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
      this.client = new S3Client({
        region: "auto",
        endpoint,
        credentials: {
          accessKeyId: process.env.R2_ACCESS_KEY_ID!,
          secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
        },
      });
    }
    return this.client;
  }

  private keyFor(originalName: string, type: "video" | "image" | "thumbnail", userId: number): string {
    const extension = path.extname(originalName).toLowerCase();
    const folder = type === "video" ? "videos" : type === "thumbnail" ? "thumbnails" : "images";
    return `published/users/${userId}/${folder}/${Date.now()}-${randomBytes(8).toString("hex")}${extension}`;
  }

  async uploadBuffer(
    buffer: Buffer,
    filename: string,
    contentType: string,
    type: "video" | "image" | "thumbnail",
    userId: number,
  ): Promise<{ url: string; path: string }> {
    const key = this.keyFor(filename, type, userId);
    await this.getClient().send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET!,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    }));
    return { url: `${trimSlash(process.env.R2_PUBLIC_BASE_URL!)}/${key}`, path: key };
  }

  async deleteFile(key: string): Promise<void> {
    if (!this.enabled) return;
    await this.getClient().send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET!, Key: key }));
  }
}

export const r2Storage = new R2Storage();
