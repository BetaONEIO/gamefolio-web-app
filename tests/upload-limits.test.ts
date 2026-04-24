import { test, expect } from '@playwright/test';
import jwt from 'jsonwebtoken';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import * as http from 'node:http';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { spawnSync } from 'node:child_process';
import { users, type UploadLimits } from '../shared/schema';

// Pin the upload-error contract returned by /api/upload/video-direct,
// /api/upload/screenshot, the multer hard cap, and the duration check.
// Desktop and mobile clients render `data.message` verbatim in their toasts
// and rely on `data.limits` to gate their "Upgrade to Pro" CTA — see
// MOBILE_EXPORT.md §"Upload limits & error handling" and DESKTOP_AUTH_GUIDE.md.

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

const FREE_MAX_CLIP_SIZE_MB = 100;
const FREE_MAX_SCREENSHOT_SIZE_MB = 10;
const FREE_MAX_CLIP_DURATION_SECONDS = 180;
const PRO_MAX_REEL_SIZE_MB = 250;
const MULTER_VIDEO_CAP_MB = 500;

const REQUIRED_LIMIT_KEYS: Array<keyof UploadLimits> = [
  'isPro',
  'maxClipSizeMB',
  'maxReelSizeMB',
  'maxScreenshotSizeMB',
  'maxClipDurationSeconds',
  'maxReelDurationSeconds',
];

const PRO_UPGRADE_HINT = 'Upgrade to Pro';

function expectLimitsShape(limits: any) {
  expect(limits, 'limits payload must be present').toBeTruthy();
  for (const key of REQUIRED_LIMIT_KEYS) {
    expect(limits, `limits.${key} must be present`).toHaveProperty(key);
  }
  expect(typeof limits.isPro).toBe('boolean');
  expect(typeof limits.maxClipSizeMB).toBe('number');
  expect(typeof limits.maxReelSizeMB).toBe('number');
  expect(typeof limits.maxScreenshotSizeMB).toBe('number');
  expect(typeof limits.maxClipDurationSeconds).toBe('number');
  expect(typeof limits.maxReelDurationSeconds).toBe('number');
}

function makeAccessToken(userId: number): string {
  return jwt.sign({ userId, type: 'access' }, JWT_SECRET, { expiresIn: '1h' });
}

interface StreamingUploadOpts {
  pathname: string;
  token: string;
  fieldName: string;
  filename: string;
  mimeType: string;
  totalFileSize: number;
  extraFields?: Record<string, string>;
}

interface UploadResponse {
  status: number;
  body: any;
}

function postStreamingMultipart(opts: StreamingUploadOpts): Promise<UploadResponse> {
  const baseUrl = new URL(process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5000');
  const boundary = '----formdata-' + Math.random().toString(36).slice(2);
  let preamble = '';
  for (const [k, v] of Object.entries(opts.extraFields || {})) {
    preamble += `--${boundary}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}\r\n`;
  }
  preamble += `--${boundary}\r\nContent-Disposition: form-data; name="${opts.fieldName}"; filename="${opts.filename}"\r\nContent-Type: ${opts.mimeType}\r\n\r\n`;
  const closing = `\r\n--${boundary}--\r\n`;

  const preambleBuf = Buffer.from(preamble, 'utf8');
  const closingBuf = Buffer.from(closing, 'utf8');
  const contentLength = preambleBuf.length + opts.totalFileSize + closingBuf.length;

  return new Promise<UploadResponse>((resolve, reject) => {
    let resolved = false;

    const req = http.request(
      {
        hostname: baseUrl.hostname,
        port: Number(baseUrl.port) || 5000,
        method: 'POST',
        path: opts.pathname,
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': contentLength.toString(),
          'Authorization': `Bearer ${opts.token}`,
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          if (resolved) return;
          resolved = true;
          const text = Buffer.concat(chunks).toString('utf8');
          let body: any = text;
          try { body = JSON.parse(text); } catch { /* keep as text */ }
          try { req.destroy(); } catch { /* ignore */ }
          resolve({ status: res.statusCode || 0, body });
        });
      },
    );

    req.on('error', (err) => {
      if (resolved) return;
      resolved = true;
      reject(err);
    });

    req.write(preambleBuf);

    const CHUNK_SIZE = 256 * 1024;
    const reusableChunk = Buffer.alloc(CHUNK_SIZE, 0);
    let written = 0;

    function pump() {
      while (!resolved && written < opts.totalFileSize) {
        const remaining = opts.totalFileSize - written;
        const len = Math.min(remaining, CHUNK_SIZE);
        const buf = len === CHUNK_SIZE ? reusableChunk : reusableChunk.subarray(0, len);
        let ok: boolean;
        try {
          ok = req.write(buf);
        } catch {
          return; // socket likely closed by server after early rejection
        }
        written += len;
        if (!ok) {
          req.once('drain', pump);
          return;
        }
      }
      if (!resolved) {
        try {
          req.write(closingBuf);
          req.end();
        } catch {
          // ignore — server may have closed early
        }
      }
    }

    pump();
  });
}

async function postFileFromDisk(opts: {
  pathname: string;
  token: string;
  fieldName: string;
  filePath: string;
  mimeType: string;
  extraFields?: Record<string, string>;
}): Promise<UploadResponse> {
  const stat = fs.statSync(opts.filePath);
  const baseUrl = new URL(process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5000');
  const boundary = '----formdata-' + Math.random().toString(36).slice(2);
  let preamble = '';
  for (const [k, v] of Object.entries(opts.extraFields || {})) {
    preamble += `--${boundary}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}\r\n`;
  }
  preamble += `--${boundary}\r\nContent-Disposition: form-data; name="${opts.fieldName}"; filename="${path.basename(opts.filePath)}"\r\nContent-Type: ${opts.mimeType}\r\n\r\n`;
  const closing = `\r\n--${boundary}--\r\n`;

  const preambleBuf = Buffer.from(preamble, 'utf8');
  const closingBuf = Buffer.from(closing, 'utf8');
  const contentLength = preambleBuf.length + stat.size + closingBuf.length;

  return new Promise<UploadResponse>((resolve, reject) => {
    let resolved = false;
    const req = http.request(
      {
        hostname: baseUrl.hostname,
        port: Number(baseUrl.port) || 5000,
        method: 'POST',
        path: opts.pathname,
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': contentLength.toString(),
          'Authorization': `Bearer ${opts.token}`,
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          if (resolved) return;
          resolved = true;
          const text = Buffer.concat(chunks).toString('utf8');
          let body: any = text;
          try { body = JSON.parse(text); } catch { /* keep as text */ }
          resolve({ status: res.statusCode || 0, body });
        });
      },
    );
    req.on('error', (err) => {
      if (resolved) return;
      resolved = true;
      reject(err);
    });
    req.write(preambleBuf);
    const stream = fs.createReadStream(opts.filePath);
    stream.on('data', (chunk: Buffer) => {
      if (!req.write(chunk)) {
        stream.pause();
        req.once('drain', () => stream.resume());
      }
    });
    stream.on('end', () => {
      req.write(closingBuf);
      req.end();
    });
    stream.on('error', (err) => {
      if (!resolved) {
        resolved = true;
        reject(err);
      }
    });
  });
}

let connection: ReturnType<typeof postgres>;
let db: ReturnType<typeof drizzle>;
let freeUserId = 0;
let proUserId = 0;
let longVideoPath = '';
let smallImagePath = '';

test.describe.configure({ mode: 'serial' });

test.describe('Upload error contract @integration', () => {
  test.beforeAll(async () => {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is required to seed test users.');
    }
    connection = postgres(process.env.DATABASE_URL, { max: 2 });
    db = drizzle(connection);

    const suffix = `${Date.now()}_${Math.floor(Math.random() * 1e6)}`;

    const [free] = await db
      .insert(users)
      .values({
        username: `upload_free_${suffix}`,
        password: 'placeholder-not-used-for-jwt',
        displayName: 'Upload Free Test',
        email: `upload_free_${suffix}@example.test`,
        emailVerified: true,
        userType: 'Streamer',
        isPro: false,
        role: 'user',
      })
      .returning({ id: users.id });
    freeUserId = free.id;

    const [pro] = await db
      .insert(users)
      .values({
        username: `upload_pro_${suffix}`,
        password: 'placeholder-not-used-for-jwt',
        displayName: 'Upload Pro Test',
        email: `upload_pro_${suffix}@example.test`,
        emailVerified: true,
        userType: 'Streamer',
        isPro: true,
        role: 'user',
      })
      .returning({ id: users.id });
    proUserId = pro.id;

    // A real, very small MP4 that is longer than the Free clip duration cap (180s)
    // so the route's ffprobe duration check (not the size check) fires.
    longVideoPath = path.join(os.tmpdir(), `upload-long-${suffix}.mp4`);
    const ffmpegResult = spawnSync(
      'ffmpeg',
      [
        '-y',
        '-f', 'lavfi',
        '-i', `color=c=black:s=64x64:d=${FREE_MAX_CLIP_DURATION_SECONDS + 20}:r=1`,
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-tune', 'stillimage',
        '-pix_fmt', 'yuv420p',
        longVideoPath,
      ],
      { stdio: 'pipe' },
    );
    if (ffmpegResult.status !== 0) {
      throw new Error(
        `Failed to generate long test video: ${ffmpegResult.stderr?.toString() || 'unknown error'}`,
      );
    }

    // A trivially small PNG buffer used for the screenshot-size test (we override
    // Content-Length via the streaming helper to fake an oversized payload).
    smallImagePath = path.join(os.tmpdir(), `upload-tiny-${suffix}.png`);
    fs.writeFileSync(smallImagePath, Buffer.alloc(0));
  });

  test.afterAll(async () => {
    try {
      if (freeUserId) await db.delete(users).where(eq(users.id, freeUserId));
      if (proUserId) await db.delete(users).where(eq(users.id, proUserId));
    } finally {
      await connection?.end({ timeout: 5 });
    }
    for (const p of [longVideoPath, smallImagePath]) {
      if (p && fs.existsSync(p)) {
        try { fs.unlinkSync(p); } catch { /* ignore */ }
      }
    }
  });

  test('Free user: oversized clip on /api/upload/video-direct returns 403 with full contract', async () => {
    const oversizedBytes = (FREE_MAX_CLIP_SIZE_MB + 5) * 1024 * 1024;
    const res = await postStreamingMultipart({
      pathname: '/api/upload/video-direct',
      token: makeAccessToken(freeUserId),
      fieldName: 'file',
      filename: 'free-oversized-clip.mp4',
      mimeType: 'video/mp4',
      totalFileSize: oversizedBytes,
      extraFields: { uploadType: 'clip' },
    });

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('error');
    expect(typeof res.body.message).toBe('string');
    expect(res.body.message).toContain(`${FREE_MAX_CLIP_SIZE_MB}MB`);
    // Offending file size is reported with one decimal in the route, e.g. "105.0MB".
    expect(res.body.message).toMatch(/105\.\dMB/);
    expect(res.body.message.trim().endsWith(`${PRO_UPGRADE_HINT} for larger uploads.`)).toBe(true);
    expectLimitsShape(res.body.limits);
    expect(res.body.limits.isPro).toBe(false);
    expect(res.body.limits.maxClipSizeMB).toBe(FREE_MAX_CLIP_SIZE_MB);
  });

  test('Free user: oversized screenshot on /api/upload/screenshot returns 403 with full contract', async () => {
    const oversizedBytes = (FREE_MAX_SCREENSHOT_SIZE_MB + 2) * 1024 * 1024;
    const res = await postStreamingMultipart({
      pathname: '/api/upload/screenshot',
      token: makeAccessToken(freeUserId),
      fieldName: 'screenshot',
      filename: 'free-oversized-shot.png',
      mimeType: 'image/png',
      totalFileSize: oversizedBytes,
      extraFields: { title: 'Oversized screenshot' },
    });

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('error');
    expect(typeof res.body.message).toBe('string');
    expect(res.body.message).toContain(`${FREE_MAX_SCREENSHOT_SIZE_MB}MB`);
    expect(res.body.message).toMatch(/12\.\dMB/);
    expect(res.body.message.trim().endsWith(`${PRO_UPGRADE_HINT} for larger uploads.`)).toBe(true);
    expectLimitsShape(res.body.limits);
    expect(res.body.limits.isPro).toBe(false);
    expect(res.body.limits.maxScreenshotSizeMB).toBe(FREE_MAX_SCREENSHOT_SIZE_MB);
  });

  test('Free user: video larger than the multer cap returns 413 with full contract', async () => {
    test.setTimeout(120_000);
    const overMulterCapBytes = (MULTER_VIDEO_CAP_MB + 2) * 1024 * 1024;
    const res = await postStreamingMultipart({
      pathname: '/api/upload/video-direct',
      token: makeAccessToken(freeUserId),
      fieldName: 'file',
      filename: 'free-multer-cap.mp4',
      mimeType: 'video/mp4',
      totalFileSize: overMulterCapBytes,
      extraFields: { uploadType: 'clip' },
    });

    expect(res.status).toBe(413);
    expect(res.body).toHaveProperty('error');
    expect(res.body.code).toBe('LIMIT_FILE_SIZE');
    expect(typeof res.body.message).toBe('string');
    // Tier-aware fallback message kicks in when the multer hard cap is hit
    // for an authenticated request.
    expect(res.body.message).toContain(`${FREE_MAX_CLIP_SIZE_MB}MB`);
    expect(res.body.message).toMatch(/(502|503)\.\d{2}\s?MB/);
    expect(res.body.message.trim().endsWith(`${PRO_UPGRADE_HINT} for larger uploads.`)).toBe(true);
    expectLimitsShape(res.body.limits);
    expect(res.body.limits.isPro).toBe(false);
    expect(res.body.limits.maxClipSizeMB).toBe(FREE_MAX_CLIP_SIZE_MB);
  });

  test('Free user: too-long video on /api/upload/video-direct returns 403 with full contract', async () => {
    test.setTimeout(60_000);
    const stat = fs.statSync(longVideoPath);
    // Sanity check: the test fixture must fit under the size cap so the
    // duration check (not the size check) is what rejects it.
    expect(stat.size).toBeLessThan(FREE_MAX_CLIP_SIZE_MB * 1024 * 1024);

    const res = await postFileFromDisk({
      pathname: '/api/upload/video-direct',
      token: makeAccessToken(freeUserId),
      fieldName: 'file',
      filePath: longVideoPath,
      mimeType: 'video/mp4',
      extraFields: { uploadType: 'clip' },
    });

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('error');
    expect(typeof res.body.message).toBe('string');
    expect(res.body.message).toContain(`${FREE_MAX_CLIP_DURATION_SECONDS} seconds`);
    // Probed duration is included verbatim ("(your video is 200s)" etc.).
    expect(res.body.message).toMatch(/your video is \d+s/);
    expect(res.body.message.trim().endsWith(`${PRO_UPGRADE_HINT} for longer videos.`)).toBe(true);
    expectLimitsShape(res.body.limits);
    expect(res.body.limits.isPro).toBe(false);
    expect(res.body.limits.maxClipDurationSeconds).toBe(FREE_MAX_CLIP_DURATION_SECONDS);
  });

  test('Pro user: oversized reel on /api/upload/video-direct returns 403 without Pro CTA', async () => {
    const oversizedBytes = (PRO_MAX_REEL_SIZE_MB + 5) * 1024 * 1024;
    const res = await postStreamingMultipart({
      pathname: '/api/upload/video-direct',
      token: makeAccessToken(proUserId),
      fieldName: 'file',
      filename: 'pro-oversized-reel.mp4',
      mimeType: 'video/mp4',
      totalFileSize: oversizedBytes,
      extraFields: { uploadType: 'reel' },
    });

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('error');
    expect(typeof res.body.message).toBe('string');
    expect(res.body.message).toContain(`${PRO_MAX_REEL_SIZE_MB}MB`);
    expect(res.body.message).toMatch(/255\.\dMB/);
    // Pro users must NOT see the upgrade CTA.
    expect(res.body.message).not.toContain(PRO_UPGRADE_HINT);
    expectLimitsShape(res.body.limits);
    expect(res.body.limits.isPro).toBe(true);
    expect(res.body.limits.maxReelSizeMB).toBe(PRO_MAX_REEL_SIZE_MB);
  });
});
