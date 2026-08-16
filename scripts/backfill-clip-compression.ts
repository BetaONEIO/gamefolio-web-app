/**
 * One-off backfill: re-encode existing high-bitrate clips (uploaded before
 * the compression fix in server/services/clip-processing.ts started
 * catching them at upload time) down to a sane bitrate, in place.
 *
 * Usage: tsx scripts/backfill-clip-compression.ts <clipId,clipId,...>
 *
 * For each clip id: downloads the current video, re-encodes at CRF 23 (same
 * path VideoProcessor already uses for reels/trims), uploads the result,
 * and only updates the DB + deletes the old file once the new one is
 * confirmed live. A failure on one clip does not touch its row or file and
 * does not stop the rest of the batch.
 */
import fs from 'fs';
import path from 'path';
import { pool } from '../server/db';
import { supabaseStorage } from '../server/supabase-storage';
import { VideoProcessor } from '../server/video-processor';

const tempDir = path.join(process.cwd(), 'temp');
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

async function headContentLength(url: string): Promise<number | null> {
  const resp = await fetch(url, { method: 'HEAD' });
  if (!resp.ok) return null;
  const len = parseInt(resp.headers.get('content-length') || '0', 10);
  return len || null;
}

async function backfillClip(id: number) {
  const rows = await pool.unsafe(
    `SELECT id, user_id, video_url, duration FROM clips WHERE id = $1`,
    [id],
  );
  const clip = (rows as any)[0];
  if (!clip) {
    console.log(`[${id}] not found, skipping`);
    return;
  }

  const oldUrl: string = clip.video_url;
  const duration: number = clip.duration;
  const userId: number = clip.user_id;

  const oldPath = supabaseStorage.extractStoragePath(oldUrl);
  if (!oldPath) {
    console.log(`[${id}] could not parse storage path from ${oldUrl}, skipping`);
    return;
  }

  const signedUrl = await supabaseStorage.convertToSignedUrl(oldUrl, 300);
  if (!signedUrl) {
    console.log(`[${id}] could not sign download URL, skipping`);
    return;
  }

  const oldSize = await headContentLength(signedUrl);
  if (!oldSize) {
    console.log(`[${id}] could not read current file size, skipping`);
    return;
  }
  const oldMbps = (oldSize * 8) / duration / 1_000_000;

  const tempVideoPath = path.join(tempDir, `backfill-${id}-${Date.now()}.mp4`);
  try {
    const resp = await fetch(signedUrl);
    if (!resp.ok) {
      console.log(`[${id}] download failed (${resp.status}), skipping`);
      return;
    }
    const buf = Buffer.from(await resp.arrayBuffer());
    await fs.promises.writeFile(tempVideoPath, buf);

    const { videoUrl: newUrl, duration: newDuration } = await VideoProcessor.processVideo(
      tempVideoPath, id, 0, duration, false, userId, 'clip',
    );

    // Re-encoding a full clip (trimStart=0, trimEnd=duration) must not change
    // its length — more than 1s drift means something went wrong upstream
    // (e.g. duration was stale), so bail rather than risk a truncated clip.
    if (Math.abs(newDuration - duration) > 1) {
      console.log(`[${id}] duration mismatch after re-encode (${duration}s -> ${newDuration}s), leaving original in place`);
      try { await supabaseStorage.deleteFile(supabaseStorage.extractStoragePath(newUrl)!); } catch {}
      return;
    }

    const newSignedUrl = await supabaseStorage.convertToSignedUrl(newUrl, 300);
    const newSize = newSignedUrl ? await headContentLength(newSignedUrl) : null;
    if (!newSize) {
      console.log(`[${id}] new file not reachable after upload, leaving original in place`);
      return;
    }
    const newMbps = (newSize * 8) / newDuration / 1_000_000;

    await pool.unsafe(`UPDATE clips SET video_url = $1 WHERE id = $2`, [newUrl, id]);

    try {
      await supabaseStorage.deleteFile(oldPath);
    } catch (e) {
      console.warn(`[${id}] DB updated but could not delete old file at ${oldPath}:`, e);
    }

    console.log(
      `[${id}] ${(oldSize / 1e6).toFixed(1)}MB (${oldMbps.toFixed(1)} Mbps) -> ` +
      `${(newSize / 1e6).toFixed(1)}MB (${newMbps.toFixed(1)} Mbps), ` +
      `${(100 * (1 - newSize / oldSize)).toFixed(0)}% smaller`,
    );
  } finally {
    fs.unlink(tempVideoPath, () => {});
  }
}

async function main() {
  const ids = process.argv[2]?.split(',').map((s) => parseInt(s.trim(), 10)).filter(Boolean);
  if (!ids || ids.length === 0) {
    console.error('Usage: tsx scripts/backfill-clip-compression.ts <clipId,clipId,...>');
    process.exit(1);
  }
  for (const id of ids) {
    try {
      await backfillClip(id);
    } catch (e) {
      console.error(`[${id}] failed:`, e);
    }
  }
  await pool.end();
}

main();
