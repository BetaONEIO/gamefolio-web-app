import { DeleteObjectsCommand, GetObjectCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
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
        // Same value as partSize so every non-final part is exactly 6MiB.
        // R2 rejects a multipart upload whose non-final parts differ in size.
        minPartSize: TUS_PART_SIZE_BYTES,
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
    scheduleFinishResultCleanup(this, env);
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

  async readFinishResult(id: string): Promise<{ url: string; path: string } | null> {
    if (!isSafeTusId(id)) return null;
    if (this.backend === "disk") {
      try {
        const raw = await fs.promises.readFile(finishResultPath(id), "utf8");
        return parseStoredFinishResult(raw);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
        throw error;
      }
    }
    try {
      const response = await this.s3!.send(new GetObjectCommand({
        Bucket: this.bucket!,
        Key: finishResultKey(id),
      }));
      return parseStoredFinishResult(await response.Body?.transformToString());
    } catch (error) {
      if (isMissingObject(error)) return null;
      throw error;
    }
  }

  async deleteExpiredFinishResults(now = Date.now()): Promise<void> {
    const cutoff = now - UPLOAD_TTL_MS;
    if (this.backend === "disk") {
      let names: string[] = [];
      try {
        names = await fs.promises.readdir(finishResultDir);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
        throw error;
      }
      await Promise.all(names.map(async (name) => {
        if (!name.endsWith(".json")) return;
        const filePath = path.join(finishResultDir, name);
        const stat = await fs.promises.stat(filePath).catch(() => null);
        if (stat && stat.mtimeMs < cutoff) {
          await fs.promises.unlink(filePath).catch(() => undefined);
        }
      }));
      return;
    }
    let token: string | undefined;
    do {
      const listed = await this.s3!.send(new ListObjectsV2Command({
        Bucket: this.bucket!,
        Prefix: "tus-finish/",
        ContinuationToken: token,
      }));
      const expired = (listed.Contents ?? []).filter((object) =>
        object.Key && object.LastModified && object.LastModified.getTime() < cutoff
      );
      if (expired.length > 0) {
        await this.s3!.send(new DeleteObjectsCommand({
          Bucket: this.bucket!,
          Delete: { Objects: expired.map((object) => ({ Key: object.Key! })), Quiet: true },
        }));
      }
      token = listed.IsTruncated ? listed.NextContinuationToken : undefined;
    } while (token);
  }

  async finishUpload(
    id: string,
    userId: number,
    uploadType: "video" | "reel",
    localPath: string,
  ): Promise<{ url: string; path: string }> {
    const saved = await this.readFinishResult(id);
    if (saved) {
      await this.remove(id);
      return saved;
    }
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
    const published = { url: result.url, path: result.path };
    // Persist before deleting the tus object. A dropped finish response can
    // then be read back instead of publishing the video again.
    await this.writeFinishResult(id, published);
    await this.remove(id);
    return published;
  }

  private async writeFinishResult(id: string, result: { url: string; path: string }): Promise<void> {
    if (!isSafeTusId(id)) throw new Error("Invalid tus upload id");
    const body = JSON.stringify(result);
    if (this.backend === "disk") {
      await fs.promises.mkdir(finishResultDir, { recursive: true });
      await fs.promises.writeFile(finishResultPath(id), body);
      return;
    }
    await this.s3!.send(new PutObjectCommand({
      Bucket: this.bucket!,
      Key: finishResultKey(id),
      Body: body,
      ContentType: "application/json",
    }));
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

function scheduleFinishResultCleanup(store: GamefolioTusStore, env: TusEnv) {
  if (env.NODE_ENV !== "production") return;
  const timer = setInterval(() => {
    store.deleteExpiredFinishResults().catch((error) => {
      console.error("Failed to delete expired tus finish results", error);
    });
  }, 60 * 60 * 1000);
  timer.unref?.();
}

const finishResultDir = path.join(tempDir, "tus-finish");

function isSafeTusId(id: string): boolean {
  return /^[a-z0-9]+$/i.test(id);
}

function finishResultKey(id: string): string {
  return `tus-finish/${id}.json`;
}

function finishResultPath(id: string): string {
  return path.join(finishResultDir, `${id}.json`);
}

function parseStoredFinishResult(raw: string | undefined): { url: string; path: string } | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { url?: unknown; path?: unknown };
    if (typeof parsed.url !== "string" || !parsed.url) return null;
    if (typeof parsed.path !== "string" || !parsed.path) return null;
    return { url: parsed.url, path: parsed.path };
  } catch {
    return null;
  }
}

function isMissingObject(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const record = error as { name?: string; Code?: string; $metadata?: { httpStatusCode?: number } };
  return record.name === "NoSuchKey"
    || record.name === "NotFound"
    || record.Code === "NoSuchKey"
    || record.$metadata?.httpStatusCode === 404;
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
