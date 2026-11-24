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
const RECEIPT_PREFIX = "tus-finish-receipts/";

const tempDir = path.join(process.cwd(), "temp");
const diskReceiptDir = path.join(tempDir, "tus-finish-receipts");

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

export type TusFinishReceipt = {
  userId: number;
  size: number;
  result: { url: string; path: string };
  createdAt: number;
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
  private readonly publicBaseUrl: string;

  constructor(env: TusEnv = process.env) {
    this.backend = tusBackendFromEnv(env);
    this.publicBaseUrl = env.R2_PUBLIC_BASE_URL?.replace(/\/+$/, "") ?? "";
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
        // R2 requires every non-final multipart part to have the same size.
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
    } else {
      fs.mkdirSync(tempDir, { recursive: true });
      this.s3 = null;
      this.bucket = null;
      this.datastore = new FileStore({ directory: tempDir });
    }
    scheduleExpiredUploadCleanup(this.backend === "r2" ? this.datastore as S3Store : null, env, () => this.deleteExpiredReceipts());
  }

  async getFinishReceipt(id: string, userId: number): Promise<TusFinishReceipt | null> {
    if (!/^[A-Za-z0-9_-]{1,200}$/.test(id)) return null;
    let receipt: TusFinishReceipt | undefined;
    if (this.s3 && this.bucket) {
      try {
        const response = await this.s3.send(new GetObjectCommand({ Bucket: this.bucket, Key: `${RECEIPT_PREFIX}${id}.json` }));
        receipt = JSON.parse((await readBody(response.Body)).toString("utf8"));
      } catch (error: any) {
        if (error?.$metadata?.httpStatusCode === 404 || error?.name === "NoSuchKey") return null;
        throw error;
      }
    } else {
      try {
        receipt = JSON.parse(await fs.promises.readFile(path.join(diskReceiptDir, `${id}.json`), "utf8"));
      } catch (error: any) {
        if (error?.code === "ENOENT") return null;
        throw error;
      }
    }
    if (!receipt || Date.now() - receipt.createdAt > UPLOAD_TTL_MS) return null;
    if (receipt.userId !== userId) throw new Error("Upload belongs to another user");
    return receipt;
  }

  private async saveFinishReceipt(id: string, receipt: TusFinishReceipt): Promise<void> {
    if (!/^[A-Za-z0-9_-]{1,200}$/.test(id)) throw new Error("Invalid tus upload id");
    if (this.s3 && this.bucket) {
      await this.s3.send(new PutObjectCommand({
        Bucket: this.bucket,
        Key: `${RECEIPT_PREFIX}${id}.json`,
        Body: JSON.stringify(receipt),
        ContentType: "application/json",
        CacheControl: "no-store",
      }));
    } else {
      await fs.promises.mkdir(diskReceiptDir, { recursive: true });
      const finalPath = path.join(diskReceiptDir, `${id}.json`);
      const temporaryPath = `${finalPath}.${randomBytes(8).toString("hex")}.tmp`;
      await fs.promises.writeFile(temporaryPath, JSON.stringify(receipt));
      await fs.promises.rename(temporaryPath, finalPath);
    }
  }

  async recoverCompletedUpload(
    id: string,
    userId: number,
    finish: (upload: Upload) => Promise<{ status_code: number; headers?: Record<string, string>; body: string }>,
    includeIncompleteResponse = false,
  ) {
    const fromReceipt = (receipt: TusFinishReceipt) => ({
      size: receipt.size,
      response: {
        status_code: 200,
        headers: { 'Upload-Result': JSON.stringify(receipt.result) },
        body: JSON.stringify({ success: true, result: receipt.result }),
      },
    });
    const receipt = await this.getFinishReceipt(id, userId);
    if (receipt) return fromReceipt(receipt);
    let upload: Upload;
    try {
      upload = await this.datastore.getUpload(id);
    } catch (error: any) {
      if (error?.status_code !== 404 && error?.status_code !== 410) throw error;
      // The original PATCH may have saved a receipt and removed the source
      // while this HEAD was reading it.
      const justFinished = await this.getFinishReceipt(id, userId);
      return justFinished ? fromReceipt(justFinished) : null;
    }
    if (upload.metadata?.ownerId && upload.metadata.ownerId !== String(userId)) {
      throw new Error("Upload belongs to another user");
    }
    const expires = this.datastore.getExpiration();
    if (expires > 0 && upload.creation_date && Date.now() > new Date(upload.creation_date).getTime() + expires) return null;
    if (upload.size === undefined || upload.offset !== upload.size) {
      if (!includeIncompleteResponse) return null;
      return {
        size: upload.size ?? upload.offset,
        response: { status_code: 409, body: JSON.stringify({ error: "Upload incomplete", message: "Upload is not complete" }) },
      };
    }
    return { size: upload.size, response: await finish(upload) };
  }

  async deleteExpiredReceipts(): Promise<void> {
    if (!this.s3 || !this.bucket) {
      const names = await fs.promises.readdir(diskReceiptDir).catch((error: NodeJS.ErrnoException) => {
        if (error.code === "ENOENT") return [];
        throw error;
      });
      await Promise.all(names.filter((name) => /^[A-Za-z0-9_-]+\.json$/.test(name)).map(async (name) => {
        const receiptPath = path.join(diskReceiptDir, name);
        const stat = await fs.promises.stat(receiptPath).catch(() => null);
        if (stat && Date.now() - stat.mtimeMs > UPLOAD_TTL_MS) await fs.promises.unlink(receiptPath).catch(() => undefined);
      }));
      return;
    }
    let continuationToken: string | undefined;
    do {
      const page = await this.s3.send(new ListObjectsV2Command({
        Bucket: this.bucket, Prefix: RECEIPT_PREFIX, ContinuationToken: continuationToken,
      }));
      const expired = (page.Contents ?? []).filter((object) => object.Key && object.LastModified
        && Date.now() - object.LastModified.getTime() > UPLOAD_TTL_MS);
      if (expired.length) await this.s3.send(new DeleteObjectsCommand({
        Bucket: this.bucket, Delete: { Objects: expired.map(({ Key }) => ({ Key })) },
      }));
      continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
    } while (continuationToken);
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
    const receipt = await this.getFinishReceipt(id, userId);
    if (receipt) return receipt.result;
    const upload = await this.datastore.getUpload(id);
    if (!upload) throw new Error("Upload not found");
    if (!fs.existsSync(localPath)) throw new Error("Upload file not found");

    const fileBuffer = fs.readFileSync(localPath);
    const extension = extensionFromUpload(upload);
    const prefix = uploadType === "video" ? "videos" : "reels";
    const filename = `${prefix}/${Date.now()}-${randomBytes(8).toString("hex")}${extension}`;
    let result: { url: string; path: string };
    if (this.s3 && this.bucket) {
      // A crash after publishing but before the receipt is saved must not
      // produce a second public object when HEAD retries finalization.
      const key = `published/users/${userId}/videos/tus-${id}${extension.toLowerCase()}`;
      await this.s3.send(new PutObjectCommand({
        Bucket: this.bucket, Key: key, Body: fileBuffer,
        ContentType: upload.metadata?.filetype || "video/mp4",
        CacheControl: "public, max-age=31536000, immutable",
      }));
      result = { url: `${this.publicBaseUrl}/${key}`, path: key };
    } else {
      result = await publicMediaStorage.uploadBuffer(fileBuffer, filename, upload.metadata?.filetype || "video/mp4", "video", userId);
    }
    // Persist before removing the upload, so a lost final response or a new
    // process can still return the result without re-uploading any bytes.
    await this.saveFinishReceipt(id, { userId, size: upload.size ?? fileBuffer.length, result, createdAt: Date.now() });
    await this.remove(id);
    return { url: result.url, path: result.path };
  }
}

function scheduleExpiredUploadCleanup(store: S3Store | null, env: TusEnv, cleanReceipts: () => Promise<void>) {
  if (env.NODE_ENV !== "production") return;
  const timer = setInterval(() => {
    store?.deleteExpired().catch((error) => {
      console.error("Failed to delete expired tus uploads", error);
    });
    cleanReceipts().catch((error) => console.error("Failed to delete expired tus receipts", error));
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
