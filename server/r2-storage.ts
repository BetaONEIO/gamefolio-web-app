/**
 * Cloudflare R2 — object storage for developer-uploaded game builds.
 *
 * WHY THIS IS NOT SUPABASE
 * ------------------------
 * Every other user upload in this app (clips, screenshots, avatars) goes to the
 * `gamefolio-media` Supabase bucket via server/supabase-storage.ts. Game builds
 * deliberately do not, and the reason is billing rather than taste.
 *
 * Supabase bills egress. A game build is 100MB-4GB and its whole purpose is to
 * be downloaded repeatedly. One 2GB build pulled 500 times in a month is ~1TB
 * of egress — roughly $90 at Supabase's overage rate, from a developer paying
 * £3.99/month. That is not a margin problem, it is a business-ending one, and
 * the org has already been over its egress quota once (272% in Aug 2026).
 *
 * R2 charges for storage (~$0.015/GB-month) and nothing for egress. The same
 * developer's full 20GB quota costs ~$0.30/month regardless of how many times
 * the builds are pulled. The subscription covers it comfortably. Serving builds
 * from Supabase instead would silently invert the unit economics of the entire
 * feature, so: builds go to R2, and if R2 is not configured the feature is off.
 *
 * SETUP (Cloudflare dashboard, not code)
 * --------------------------------------
 *   1. R2 → Create bucket, e.g. `gamefolio-builds`.
 *   2. R2 → Manage API Tokens → create an Object Read & Write token scoped to
 *      that bucket. Note the Access Key ID / Secret Access Key.
 *   3. Set the env vars below in Replit Secrets (and local `.env`).
 *   4. For browser-playable builds only: attach a public custom domain to the
 *      bucket (R2 → Settings → Public access → Connect domain), e.g.
 *      builds.gamefolio.com, and set R2_PUBLIC_BASE_URL to it. Downloadable
 *      builds do not need this — they are served via short-lived signed URLs.
 *
 * Required: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUILDS_BUCKET
 * Optional: R2_PUBLIC_BASE_URL (required for web builds specifically)
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const BUCKET = process.env.R2_BUILDS_BUCKET;
const PUBLIC_BASE_URL = process.env.R2_PUBLIC_BASE_URL;

let client: S3Client | null = null;

export function isR2Configured(): boolean {
  return Boolean(ACCOUNT_ID && ACCESS_KEY_ID && SECRET_ACCESS_KEY && BUCKET);
}

/** Web builds additionally need a public origin to serve their assets from. */
export function isWebBuildServingConfigured(): boolean {
  return isR2Configured() && Boolean(PUBLIC_BASE_URL);
}

function getClient(): S3Client {
  if (!isR2Configured()) {
    throw new Error(
      "R2 is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and R2_BUILDS_BUCKET.",
    );
  }
  if (!client) {
    client = new S3Client({
      region: "auto",
      endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: ACCESS_KEY_ID!,
        secretAccessKey: SECRET_ACCESS_KEY!,
      },
    });
  }
  return client;
}

function bucket(): string {
  return BUCKET!;
}

/**
 * Object key for a build archive. Namespaced by user so a quota sweep or an
 * account deletion can operate on one prefix.
 */
export function buildArchiveKey(userId: number, buildId: number, fileName: string): string {
  const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120);
  return `builds/${userId}/${buildId}/archive/${safe}`;
}

/** Prefix a web build's archive is expanded into. */
export function webBuildPrefix(userId: number, buildId: number): string {
  return `builds/${userId}/${buildId}/web/`;
}

/** Everything belonging to one build — used when deleting it. */
export function buildRootPrefix(userId: number, buildId: number): string {
  return `builds/${userId}/${buildId}/`;
}

/**
 * Presigned PUT the browser uploads straight to. Bytes never pass through this
 * server — a 4GB upload proxied through Express would be both slow and, on
 * Replit, expensive.
 *
 * ContentLength is part of the signature, so the URL cannot be reused to push a
 * larger file than the quota check approved. That matters: the size is declared
 * by the client, and this is what stops the declaration being a lie.
 */
export async function createPresignedUpload(params: {
  key: string;
  contentType: string;
  sizeBytes: number;
  expiresInSeconds?: number;
}): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: bucket(),
    Key: params.key,
    ContentType: params.contentType,
    ContentLength: params.sizeBytes,
  });
  return getSignedUrl(getClient(), command, {
    expiresIn: params.expiresInSeconds ?? 60 * 60 * 6, // 6h — a 4GB push on a slow line is not quick
  });
}

/**
 * Short-lived signed GET for a downloadable build. Deliberately short: R2 egress
 * is free, but a long-lived URL is a link someone can post elsewhere, turning
 * Gamefolio into a general-purpose CDN with none of the download counted.
 */
export async function createPresignedDownload(params: {
  key: string;
  downloadFileName: string;
  expiresInSeconds?: number;
}): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: bucket(),
    Key: params.key,
    ResponseContentDisposition: `attachment; filename="${params.downloadFileName.replace(/"/g, "")}"`,
  });
  return getSignedUrl(getClient(), command, {
    expiresIn: params.expiresInSeconds ?? 60 * 5,
  });
}

/** Public URL for an asset inside an extracted web build. */
export function publicWebUrl(objectKey: string): string {
  if (!PUBLIC_BASE_URL) {
    throw new Error("R2_PUBLIC_BASE_URL is not set — browser-playable builds cannot be served.");
  }
  return `${PUBLIC_BASE_URL.replace(/\/$/, "")}/${objectKey.replace(/^\//, "")}`;
}

export async function headObject(key: string): Promise<{ sizeBytes: number } | null> {
  try {
    const res = await getClient().send(new HeadObjectCommand({ Bucket: bucket(), Key: key }));
    return { sizeBytes: Number(res.ContentLength ?? 0) };
  } catch (err: any) {
    if (err?.$metadata?.httpStatusCode === 404 || err?.name === "NotFound") return null;
    throw err;
  }
}

export async function getObjectBuffer(key: string): Promise<Buffer> {
  const res = await getClient().send(new GetObjectCommand({ Bucket: bucket(), Key: key }));
  const chunks: Buffer[] = [];
  for await (const chunk of res.Body as any) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export async function putObject(params: {
  key: string;
  body: Buffer;
  contentType: string;
  cacheControl?: string;
}): Promise<void> {
  await getClient().send(
    new PutObjectCommand({
      Bucket: bucket(),
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType,
      CacheControl: params.cacheControl,
    }),
  );
}

export async function deleteObject(key: string): Promise<void> {
  await getClient().send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }));
}

/** Total bytes under a prefix. Used to bill an extracted web build accurately. */
export async function prefixSize(prefix: string): Promise<number> {
  let total = 0;
  let token: string | undefined;
  do {
    const res = await getClient().send(
      new ListObjectsV2Command({ Bucket: bucket(), Prefix: prefix, ContinuationToken: token }),
    );
    for (const obj of res.Contents ?? []) total += Number(obj.Size ?? 0);
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);
  return total;
}

/**
 * Delete everything under a prefix. Returns the number of objects removed.
 *
 * Storage leaks are not hypothetical here — the Supabase bucket accumulated
 * ~35GB of orphans because delete paths silently no-opped. Callers must treat a
 * throw from this as a real failure, not something to swallow.
 */
export async function deletePrefix(prefix: string): Promise<number> {
  let deleted = 0;
  let token: string | undefined;
  do {
    const res = await getClient().send(
      new ListObjectsV2Command({ Bucket: bucket(), Prefix: prefix, ContinuationToken: token }),
    );
    const keys = (res.Contents ?? []).map((o) => ({ Key: o.Key! })).filter((o) => o.Key);
    if (keys.length > 0) {
      // DeleteObjects caps at 1000 keys per call, which matches the page size
      // ListObjectsV2 returns by default.
      await getClient().send(new DeleteObjectsCommand({ Bucket: bucket(), Delete: { Objects: keys } }));
      deleted += keys.length;
    }
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);
  return deleted;
}
