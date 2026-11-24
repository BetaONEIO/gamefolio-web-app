import { DeleteObjectsCommand, S3Client } from "@aws-sdk/client-s3";
import { FileStore } from "@tus/file-store";
import { S3Store } from "@tus/s3-store";
import type { DataStore, Upload } from "@tus/utils";
import { randomBytes } from "crypto";
import fs from "fs";
import path from "path";
import { publicMediaStorage } from "./public-media-storage";

// Matches the client's tus chunk size. Each PATCH is then one S3 part
// (S3's minimum part size is 5MiB; the client sends 6MiB).
const TUS_PART_SIZE_BYTES = 6 * 1024 * 1024;
const UPLOAD_TTL_MS = 24 * 60 * 60 * 1000;

const tempDir = path.join(process.cwd(), "temp");

export type TusBackend = "r2" | "disk";

export type TusEnv = Record<string, string | undefined>;

export function tusBackendFromEnv(env: TusEnv): TusBackend {
  if (
    env.R2_ACCOUNT_ID &&
    env.R2_ACCESS_KEY_ID &&
    env.R2_SECRET_ACCESS_KEY &&
    env.R2_BUCKET &&
    env.R2_PUBLIC_BASE_URL
  ) {
    return "r2";
  }
  return "disk";
}

type StagedUpload = {
  path: string;
  release: () => Promise<void>;
};

/**
 * Incomplete tus uploads used to live in `temp/` on the container disk.
 * Railway has one replica and no volume, so a deploy replaces that disk and
 * the next PATCH 404s. R2 keeps the multipart upload, so the new process can
 * resume it. Disk remains the fallback when R2 is not configured.
 */
export class GamefolioTusStore {
  readonly backend: TusBackend;
  readonly datastore: DataStore;
  private readonly s3: S3Client | null;
  private readonly bucket: string | null;

  constructor(env: TusEnv = process.env) {
    this.backend = tusBackendFromEnv(env);
    if (this.backend === "r2") {
      const endpoint = env.R2_ENDPOINT || `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
      const credentials = {
        accessKeyId: env.R2_ACCESS_KEY_ID!,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY!,
      };
      this.s3 = new S3Client({
        region: "auto",
        endpoint,
        credentials,
        // Recent AWS SDK builds checksum every upload. R2 rejects those
        // headers on multipart parts unless checksums are opt-in.
        requestChecksumCalculation: "WHEN_REQUIRED",
        responseChecksumValidation: "WHEN_REQUIRED",
      });
      this.bucket = env.R2_BUCKET!;
      this.datastore = new S3Store({
        partSize: TUS_PART_SIZE_BYTES,
        useTags: false,
        expirationPeriodInMilliseconds: UPLOAD_TTL_MS,
        s3ClientConfig: {
          bucket: this.bucket,
          region: "auto",
          endpoint,
          credentials,
          requestChecksumCalculation: "WHEN_REQUIRED",
          responseChecksumValidation: "WHEN_REQUIRED",
        },
      });
      scheduleExpiredUploadCleanup(this.datastore as S3Store, env);
    } else {
      fs.mkdirSync(tempDir, { recursive: true });
      this.s3 = null;
      this.bucket = null;
      this.datastore = new FileStore({ directory: tempDir });
    }
  }

  async remove(id: string): Promise<void> {
    try {
      await this.datastore.remove(id);
    } catch {
      // A missing upload has nothing to delete. Limit rejections call this
      // for ids that were never written to this process.
    }
    if (!this.s3 || !this.bucket) return;
    // S3Store.remove aborts the multipart upload and, once that upload is
    // already completed, skips deleting the object. Remove both copies.
    await this.s3.send(new DeleteObjectsCommand({
      Bucket: this.bucket,
      Delete: {
        Objects: [{ Key: id }, { Key: `${id}.info` }, { Key: `${id}.part` }],
        Quiet: true,
      },
    })).catch((error) => {
      console.error("Failed to delete tus upload objects", id, error);
    });
  }

  /**
   * A filesystem path ffprobe and the final publish step can read.
   * Disk uploads are already there. R2 uploads are copied into temp for the
   * duration probe, then released by the caller.
   */
  async stageLocalFile(id: string): Promise<StagedUpload> {
    if (this.backend === "disk") {
      return { path: path.join(tempDir, id), release: async () => undefined };
    }
    const bytes = await readBody(await (this.datastore as S3Store).read(id));
    fs.mkdirSync(tempDir, { recursive: true });
    const filePath = path.join(tempDir, `tus-r2-${id}`);
    await fs.promises.writeFile(filePath, bytes);
    return {
      path: filePath,
      release: async () => {
        await fs.promises.unlink(filePath).catch(() => undefined);
      },
    };
  }

  async finishUpload(
    id: string,
    userId: number,
    uploadType: "video" | "reel",
    localPath: string,
  ): Promise<{ url: string; path: string }> {
    const upload = await this.datastore.getUpload(id);
    if (!upload) throw new Error("Upload not found");
    if (!fs.existsSync(localPath)) throw new Error("Upload file not found");

    const fileBuffer = fs.readFileSync(localPath);
    const extension = extensionFromUpload(upload);
    const prefix = uploadType === "video" ? "videos" : "reels";
    const filename = `${prefix}/${Date.now()}-${randomBytes(8).toString("hex")}${extension}`;
    const result = await publicMediaStorage.uploadBuffer(
      fileBuffer,
      filename,
      upload.metadata?.filetype || "video/mp4",
      "video",
      userId,
    );
    await this.remove(id);
    return { url: result.url, path: result.path };
  }
}

function scheduleExpiredUploadCleanup(store: S3Store, env: TusEnv) {
  if (env.NODE_ENV !== "production") return;
  const timer = setInterval(() => {
    store.deleteExpired().catch((error) => {
      console.error("Failed to delete expired tus uploads", error);
    });
  }, 60 * 60 * 1000);
  timer.unref?.();
}

async function readBody(body: unknown): Promise<Buffer> {
  if (!body) throw new Error("Upload file not found");
  const transform = (body as { transformToByteArray?: () => Promise<Uint8Array> }).transformToByteArray;
  if (typeof transform === "function") {
    return Buffer.from(await transform.call(body));
  }
  const chunks: Buffer[] = [];
  for await (const chunk of body as AsyncIterable<Uint8Array | Buffer | string>) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function extensionFromUpload(upload: Upload): string {
  if (upload.metadata?.filename) return path.extname(upload.metadata.filename);
  const mimeToExt: Record<string, string> = {
    "video/mp4": ".mp4",
    "video/webm": ".webm",
    "video/quicktime": ".mov",
    "video/x-msvideo": ".avi",
    "video/x-ms-wmv": ".wmv",
  };
  if (upload.metadata?.filetype) return mimeToExt[upload.metadata.filetype] || ".mp4";
  return ".mp4";
}

export function createTusStore(env: TusEnv = process.env): GamefolioTusStore {
  return new GamefolioTusStore(env);
}

export const tusStore = createTusStore();
