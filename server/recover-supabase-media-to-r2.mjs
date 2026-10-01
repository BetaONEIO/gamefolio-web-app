import postgres from "postgres";
import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  UploadPartCommand,
} from "@aws-sdk/client-s3";

const SOURCE = "https://rupzmxqyhqktpifgfmzc.supabase.co";
const REF = "rupzmxqyhqktpifgfmzc.supabase.co";
const PREFIX = "legacy-supabase";
const required = [
  "DATABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY", "R2_BUCKET", "R2_PUBLIC_BASE_URL",
];
const missingEnv = required.filter((name) => !process.env[name]);
if (missingEnv.length) throw new Error(`Missing: ${missingEnv.join(", ")}`);

const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const publicBase = process.env.R2_PUBLIC_BASE_URL.replace(/\/+$/, "");
const sql = postgres(process.env.DATABASE_URL, { max: 4, prepare: false });
const r2 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT || `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const quote = (value) => `"${String(value).replaceAll('"', '""')}"`;
function parseStorageUrl(raw) {
  try {
    const url = new URL(raw);
    const match = url.pathname.match(/^\/storage\/v1\/object\/(?:public\/|authenticated\/|sign\/)?([^/]+)\/(.+)$/);
    if (!match) return null;
    return { bucket: decodeURIComponent(match[1]), path: match[2].split("/").map(decodeURIComponent).join("/") };
  } catch { return null; }
}
const destinationKey = ({ bucket, path }) => `${PREFIX}/${bucket}/${path}`;
const destinationUrl = (object) => `${publicBase}/${destinationKey(object).split("/").map(encodeURIComponent).join("/").replaceAll("%2F", "/")}`;
const sourceUrl = ({ bucket, path }) => `${SOURCE}/storage/v1/object/authenticated/${encodeURIComponent(bucket)}/${path.split("/").map(encodeURIComponent).join("/")}`;
const sourceHeaders = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };

async function send(command, attempts = 4) {
  let last;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try { return await r2.send(command); }
    catch (error) {
      last = error;
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, attempt * 750));
    }
  }
  throw last;
}

async function upload(key, body, contentType) {
  const partSize = 10 * 1024 * 1024;
  if (body.length <= partSize) {
    await send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET, Key: key, Body: body, ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    }));
    return;
  }
  const created = await send(new CreateMultipartUploadCommand({
    Bucket: process.env.R2_BUCKET, Key: key, ContentType: contentType,
    CacheControl: "public, max-age=31536000, immutable",
  }));
  if (!created.UploadId) throw new Error("No multipart upload ID");
  try {
    const parts = [];
    for (let offset = 0, part = 1; offset < body.length; offset += partSize, part++) {
      const result = await send(new UploadPartCommand({
        Bucket: process.env.R2_BUCKET, Key: key, UploadId: created.UploadId,
        PartNumber: part, Body: body.subarray(offset, Math.min(offset + partSize, body.length)),
      }));
      parts.push({ ETag: result.ETag, PartNumber: part });
    }
    await send(new CompleteMultipartUploadCommand({
      Bucket: process.env.R2_BUCKET, Key: key, UploadId: created.UploadId,
      MultipartUpload: { Parts: parts },
    }));
  } catch (error) {
    try { await send(new AbortMultipartUploadCommand({ Bucket: process.env.R2_BUCKET, Key: key, UploadId: created.UploadId }), 2); } catch {}
    throw error;
  }
}

const columns = await sql`
  select table_schema, table_name, column_name
  from information_schema.columns
  where table_schema in ('public', 'recovery_profile_media_20261001')
    and data_type in ('text', 'character varying')
  order by table_schema, table_name, ordinal_position
`;
const references = [];
for (const col of columns) {
  const query = `select ${quote(col.column_name)}::text as value
    from ${quote(col.table_schema)}.${quote(col.table_name)}
    where ${quote(col.column_name)}::text like $1`;
  for (const row of await sql.unsafe(query, [`%${REF}%`])) {
    const object = parseStorageUrl(row.value);
    if (object) references.push({ ...col, oldUrl: row.value, ...object });
  }
}

const unique = new Map();
for (const ref of references) unique.set(`${ref.bucket}\n${ref.path}`, { bucket: ref.bucket, path: ref.path });
const objects = [...unique.values()];
const results = new Map();
let cursor = 0;
let finished = 0;
async function worker() {
  while (true) {
    const index = cursor++;
    if (index >= objects.length) return;
    const object = objects[index];
    const identity = `${object.bucket}\n${object.path}`;
    const key = destinationKey(object);
    try {
      let existing = null;
      try { existing = await send(new HeadObjectCommand({ Bucket: process.env.R2_BUCKET, Key: key })); }
      catch (error) {
        if (error?.$metadata?.httpStatusCode !== 404 && error?.name !== "NotFound") throw error;
      }
      let sourceSize = null;
      try {
        const head = await fetch(sourceUrl(object), {
          method: "HEAD", headers: sourceHeaders, signal: AbortSignal.timeout(30_000),
        });
        if (head.ok && head.headers.get("content-length")) sourceSize = Number(head.headers.get("content-length"));
      } catch {}
      if (sourceSize !== null && Number(existing?.ContentLength) === sourceSize) {
        results.set(identity, { status: "copied", newUrl: destinationUrl(object), size: sourceSize });
        finished++;
        if (finished % 50 === 0 || finished === objects.length) console.log(`progress ${finished}/${objects.length}`);
        continue;
      }
      const response = await fetch(sourceUrl(object), {
        headers: sourceHeaders, signal: AbortSignal.timeout(180_000),
      });
      if (!response.ok) throw new Error(`Supabase HTTP ${response.status}`);
      const body = Buffer.from(await response.arrayBuffer());
      const contentType = response.headers.get("content-type") || "application/octet-stream";
      if (Number(existing?.ContentLength) !== body.length) await upload(key, body, contentType);
      const verified = await send(new HeadObjectCommand({ Bucket: process.env.R2_BUCKET, Key: key }));
      if (Number(verified.ContentLength) !== body.length) throw new Error("R2 size verification failed");
      results.set(identity, { status: "copied", newUrl: destinationUrl(object), size: body.length });
    } catch (error) {
      results.set(identity, { status: "missing", error: error instanceof Error ? error.message : String(error) });
    }
    finished++;
    if (finished % 50 === 0 || finished === objects.length) console.log(`progress ${finished}/${objects.length}`);
  }
}
await Promise.all(Array.from({ length: 2 }, worker));

await sql.begin(async (tx) => {
  await tx`create schema if not exists recovery_supabase_media_20261001`;
  await tx`create table if not exists recovery_supabase_media_20261001.url_references (
    id bigserial primary key,
    table_schema text not null,
    table_name text not null,
    column_name text not null,
    old_url text not null,
    new_url text,
    bucket text not null,
    object_path text not null,
    status text not null,
    error text,
    backed_up_at timestamptz not null default now(),
    unique (table_schema, table_name, column_name, old_url)
  )`;
  await tx`create table if not exists recovery_supabase_media_20261001.users_before_r2_restore as
    select id, avatar_url, banner_url, profile_background_image_url, now() as backed_up_at from public.users`;

  const distinctRefs = new Map();
  for (const ref of references) distinctRefs.set(`${ref.table_schema}\n${ref.table_name}\n${ref.column_name}\n${ref.oldUrl}`, ref);
  for (const ref of distinctRefs.values()) {
    const result = results.get(`${ref.bucket}\n${ref.path}`);
    await tx`insert into recovery_supabase_media_20261001.url_references
      (table_schema, table_name, column_name, old_url, new_url, bucket, object_path, status, error)
      values (${ref.table_schema}, ${ref.table_name}, ${ref.column_name}, ${ref.oldUrl}, ${result?.newUrl || null},
              ${ref.bucket}, ${ref.path}, ${result?.status || "missing"}, ${result?.error || null})
      on conflict (table_schema, table_name, column_name, old_url) do update
      set new_url = excluded.new_url, status = excluded.status, error = excluded.error`;
    if (ref.table_schema === "public" && result?.status === "copied") {
      const update = `update ${quote(ref.table_schema)}.${quote(ref.table_name)}
        set ${quote(ref.column_name)} = $1 where ${quote(ref.column_name)} = $2`;
      await tx.unsafe(update, [result.newUrl, ref.oldUrl]);
    }
  }

  const profileRows = await tx`select id, avatar_url, banner_url, profile_background_image_url
    from recovery_profile_media_20261001.users_before_fix`;
  for (const row of profileRows) {
    for (const [column, oldUrl] of [
      ["avatar_url", row.avatar_url], ["banner_url", row.banner_url],
      ["profile_background_image_url", row.profile_background_image_url],
    ]) {
      if (!oldUrl) continue;
      const object = parseStorageUrl(oldUrl);
      const result = object && results.get(`${object.bucket}\n${object.path}`);
      if (result?.status !== "copied") continue;
      const update = `update public.users set ${quote(column)} = $1
        where id = $2 and (${quote(column)} is null or ${quote(column)} like $3)`;
      await tx.unsafe(update, [result.newUrl, row.id, `%${REF}%`]);
    }
  }
});

const copied = [...results.values()].filter((x) => x.status === "copied");
const failed = [...results.entries()].filter(([, x]) => x.status !== "copied");
const remaining = await sql`select count(*)::int as count from recovery_supabase_media_20261001.url_references where status <> 'copied'`;
console.log(JSON.stringify({
  references: references.length, uniqueObjects: objects.length, copied: copied.length,
  bytes: copied.reduce((sum, x) => sum + x.size, 0), failed: failed.length,
  remainingFailedReferences: remaining[0].count,
  failures: failed.slice(0, 50).map(([object, result]) => ({ object, error: result.error })),
}, null, 2));
r2.destroy();
await sql.end();
