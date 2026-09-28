import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  UploadPartCommand,
} from "@aws-sdk/client-s3";
import postgres from "postgres";
import path from "node:path";
import os from "node:os";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { promisify } from "node:util";

type MediaKind = "video" | "thumbnail";

type ClipRow = {
  id: number;
  user_id: number;
  video_type: string | null;
  video_url: string;
  thumbnail_url: string | null;
};

type StorageLocation = {
  bucket: string;
  objectPath: string;
};

type Args = {
  apply: boolean;
  concurrency: number;
  excludeIds: number[];
  ids: number[];
  limit?: number;
};

const R2_HOST = "media.gamefolio.com";
const execFileAsync = promisify(execFile);

function parseArgs(argv: string[]): Args {
  const valueFor = (name: string) => argv.find((arg) => arg.startsWith(`${name}=`))?.split("=").slice(1).join("=");
  const ids = (valueFor("--ids") || "")
    .split(",")
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isInteger(value) && value > 0);
  const excludeIds = (valueFor("--exclude-ids") || "")
    .split(",")
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isInteger(value) && value > 0);
  const limitValue = Number(valueFor("--limit"));
  const concurrencyValue = Number(valueFor("--concurrency") || 3);

  return {
    apply: argv.includes("--apply"),
    concurrency: Number.isInteger(concurrencyValue) && concurrencyValue > 0
      ? Math.min(concurrencyValue, 8)
      : 3,
    excludeIds,
    ids,
    limit: Number.isInteger(limitValue) && limitValue > 0 ? limitValue : undefined,
  };
}

export function parseSupabaseStorageUrl(value: string): StorageLocation | null {
  try {
    const url = new URL(value);
    const match = url.pathname.match(/^\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/]+)\/(.+)$/);
    if (!match) return null;
    return {
      bucket: decodeURIComponent(match[1]),
      objectPath: match[2].split("/").map(decodeURIComponent).join("/"),
    };
  } catch {
    return null;
  }
}

function isR2Url(value: string | null): boolean {
  if (!value) return false;
  try {
    return new URL(value).hostname === R2_HOST;
  } catch {
    return false;
  }
}

function extensionFor(sourcePath: string, contentType: string | null, kind: MediaKind): string {
  const extension = path.extname(sourcePath).toLowerCase();
  if (/^\.[a-z0-9]{1,8}$/.test(extension)) return extension;
  if (contentType === "video/webm") return ".webm";
  if (contentType === "image/png") return ".png";
  if (contentType === "image/webp") return ".webp";
  return kind === "video" ? ".mp4" : ".jpg";
}

function destinationKey(row: ClipRow, kind: MediaKind, sourcePath: string, contentType: string | null): string {
  const contentFolder = row.video_type === "reel" ? "reels" : "clips";
  return `migrated/users/${row.user_id}/${contentFolder}/${row.id}/${kind}${extensionFor(sourcePath, contentType, kind)}`;
}

async function mapConcurrent<T, R>(items: T[], concurrency: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function run(): Promise<void> {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await worker(items[index]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => run()));
  return results;
}

async function fetchWithRetry(url: string, init: RequestInit = {}, attempts = 3): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await fetch(url, init);
      if (response.ok || response.status === 206 || response.status < 500 || attempt === attempts) return response;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
      if (attempt === attempts) throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, attempt * 500));
  }
  throw lastError;
}

async function downloadWithCurl(url: string, headers: Record<string, string> = {}): Promise<Buffer> {
  const tempDirectory = await mkdtemp(path.join(os.tmpdir(), "gamefolio-r2-migration-"));
  const outputPath = path.join(tempDirectory, "source-media");
  const headerPath = path.join(tempDirectory, "headers");
  try {
    const curlArgs = [
      "--fail",
      "--location",
      "--silent",
      "--show-error",
      "--retry", "5",
      "--retry-all-errors",
      "--connect-timeout", "30",
      "--max-time", "1800",
      "--output", outputPath,
    ];
    if (Object.keys(headers).length > 0) {
      await writeFile(headerPath, Object.entries(headers).map(([name, value]) => `${name}: ${value}`).join("\n"), { mode: 0o600 });
      curlArgs.push("--header", `@${headerPath}`);
    }
    curlArgs.push(url);
    await execFileAsync("curl", curlArgs, { maxBuffer: 1024 * 1024 });
    return await readFile(outputPath);
  } finally {
    await rm(tempDirectory, { recursive: true, force: true });
  }
}

async function sendR2<T>(client: S3Client, command: any, attempts = 5): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await client.send(command) as T;
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, attempt * 750));
    }
  }
  throw lastError;
}

async function uploadToR2(
  client: S3Client,
  bucket: string,
  key: string,
  body: Buffer,
  contentType: string,
): Promise<void> {
  const multipartThreshold = 10 * 1024 * 1024;
  if (body.length <= multipartThreshold) {
    await sendR2(client, new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    }));
    return;
  }

  const created = await sendR2<{ UploadId?: string }>(client, new CreateMultipartUploadCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
    CacheControl: "public, max-age=31536000, immutable",
  }));
  if (!created.UploadId) throw new Error("R2 did not return a multipart upload ID");

  try {
    const parts: Array<{ ETag?: string; PartNumber: number }> = [];
    for (let offset = 0, partNumber = 1; offset < body.length; offset += multipartThreshold, partNumber++) {
      const uploaded = await sendR2<{ ETag?: string }>(client, new UploadPartCommand({
        Bucket: bucket,
        Key: key,
        UploadId: created.UploadId,
        PartNumber: partNumber,
        Body: body.subarray(offset, Math.min(offset + multipartThreshold, body.length)),
      }));
      parts.push({ ETag: uploaded.ETag, PartNumber: partNumber });
    }
    await sendR2(client, new CompleteMultipartUploadCommand({
      Bucket: bucket,
      Key: key,
      UploadId: created.UploadId,
      MultipartUpload: { Parts: parts },
    }));
  } catch (error) {
    try {
      await sendR2(client, new AbortMultipartUploadCommand({
        Bucket: bucket,
        Key: key,
        UploadId: created.UploadId,
      }), 2);
    } catch {
      // The original upload error is more useful than an abort cleanup error.
    }
    throw error;
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const required = ["DATABASE_URL", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];
  if (args.apply) {
    required.push("R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET", "R2_PUBLIC_BASE_URL");
    if (process.env.MIGRATE_PUBLIC_MEDIA_TO_R2 !== "1") {
      throw new Error("Apply mode requires MIGRATE_PUBLIC_MEDIA_TO_R2=1 as an additional safety guard");
    }
  }
  const missing = required.filter((name) => !process.env[name]);
  if (missing.length) throw new Error(`Missing required environment variables: ${missing.join(", ")}`);

  const sql = postgres(process.env.DATABASE_URL!, { max: Math.max(2, args.concurrency + 1) });
  const publicBase = process.env.R2_PUBLIC_BASE_URL?.replace(/\/+$/, "");
  const r2 = args.apply ? new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT || `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  }) : null;

  try {
    const rows = await sql<ClipRow[]>`
      select id, user_id, video_type, video_url, thumbnail_url
      from clips
      where status = 'ready'
      order by id asc
    `;

    const scopedRows = rows
      .filter((row) => args.ids.length === 0 || args.ids.includes(row.id))
      .filter((row) => !args.excludeIds.includes(row.id))
      .filter((row) => !isR2Url(row.video_url) || (row.thumbnail_url !== null && !isR2Url(row.thumbnail_url)))
      .slice(0, args.limit);

    const inventory = {
      readyRows: rows.length,
      fullyOnR2: rows.filter((row) => isR2Url(row.video_url) && (!row.thumbnail_url || isR2Url(row.thumbnail_url))).length,
      scopedRows: scopedRows.length,
      supabaseVideos: scopedRows.filter((row) => parseSupabaseStorageUrl(row.video_url)).length,
      supabaseThumbnails: scopedRows.filter((row) => row.thumbnail_url && parseSupabaseStorageUrl(row.thumbnail_url)).length,
      unrecognisedVideos: scopedRows.filter((row) => !isR2Url(row.video_url) && !parseSupabaseStorageUrl(row.video_url)).length,
      unrecognisedThumbnails: scopedRows.filter((row) => row.thumbnail_url && !isR2Url(row.thumbnail_url) && !parseSupabaseStorageUrl(row.thumbnail_url)).length,
    };

    console.log(JSON.stringify({ mode: args.apply ? "apply" : "dry-run", inventory }, null, 2));
    if (!args.apply) {
      console.log("Dry run complete. No files were copied and no database rows were changed.");
      return;
    }

    const sourceDownloadUrl = async (value: string): Promise<{
      url: string;
      location: StorageLocation;
      headers: Record<string, string>;
    }> => {
      const location = parseSupabaseStorageUrl(value);
      if (!location) throw new Error("URL is not a recognised Supabase Storage URL");
      const encodedPath = location.objectPath.split("/").map(encodeURIComponent).join("/");
      return {
        url: `${process.env.SUPABASE_URL!.replace(/\/+$/, "")}/storage/v1/object/authenticated/${encodeURIComponent(location.bucket)}/${encodedPath}`,
        location,
        headers: {
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
        },
      };
    };

    const copyMedia = async (row: ClipRow, kind: MediaKind, sourceUrl: string): Promise<string> => {
      if (isR2Url(sourceUrl)) return sourceUrl;
      const { url, location, headers } = await sourceDownloadUrl(sourceUrl);
      let body: Buffer;
      let contentType: string | null = null;
      try {
        const response = await fetchWithRetry(url, { headers });
        if (!response.ok) throw new Error(`Supabase download returned HTTP ${response.status}`);
        contentType = response.headers.get("content-type");
        body = Buffer.from(await response.arrayBuffer());
      } catch (error) {
        console.warn(JSON.stringify({ status: "retrying-with-curl", id: row.id, kind }));
        body = await downloadWithCurl(url, headers);
      }
      const key = destinationKey(row, kind, location.objectPath, contentType);

      let exists = false;
      try {
        const head = await sendR2<any>(r2!, new HeadObjectCommand({ Bucket: process.env.R2_BUCKET!, Key: key }));
        exists = Number(head.ContentLength) === body.length;
      } catch (error: any) {
        if (error?.$metadata?.httpStatusCode !== 404 && error?.name !== "NotFound") throw error;
      }

      if (!exists) {
        await uploadToR2(
          r2!,
          process.env.R2_BUCKET!,
          key,
          body,
          contentType || (kind === "video" ? "video/mp4" : "image/jpeg"),
        );
      }

      const verified = await sendR2<any>(r2!, new HeadObjectCommand({ Bucket: process.env.R2_BUCKET!, Key: key }));
      if (Number(verified.ContentLength) !== body.length) {
        throw new Error(`R2 size verification failed (${verified.ContentLength} != ${body.length})`);
      }
      const publicUrl = `${publicBase}/${key}`;
      return publicUrl;
    };

    let migrated = 0;
    let failed = 0;
    const failures: Array<{ id: number; error: string }> = [];
    await mapConcurrent(scopedRows, args.concurrency, async (row) => {
      try {
        const nextVideoUrl = await copyMedia(row, "video", row.video_url);
        const nextThumbnailUrl = row.thumbnail_url
          ? await copyMedia(row, "thumbnail", row.thumbnail_url)
          : null;
        await sql.begin(async (transaction) => {
          await transaction`
            update clips
            set video_url = ${nextVideoUrl},
                thumbnail_url = ${nextThumbnailUrl},
                updated_at = now()
            where id = ${row.id}
              and video_url = ${row.video_url}
          `;
        });
        migrated++;
        console.log(JSON.stringify({ status: "migrated", id: row.id }));
      } catch (error) {
        failed++;
        const message = error instanceof Error ? error.message : String(error);
        failures.push({ id: row.id, error: message });
        console.error(JSON.stringify({ status: "failed", id: row.id, error: message }));
      }
    });

    console.log(JSON.stringify({ migrated, failed, failures }, null, 2));
    if (failed > 0) process.exitCode = 1;
  } finally {
    r2?.destroy();
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
