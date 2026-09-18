import { readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { colorizeAvatarFrame } from '../../shared/avatar-frame';

const MAX_BYTES = 10 * 1024 * 1024;
const publicRoot = path.resolve('client/public');
export function allowedAssetUrl(value: string, storageUrl = process.env.SUPABASE_URL): boolean {
  try {
    const url = new URL(value);
    const hosts = new Set(['images.igdb.com', 'static-cdn.jtvnw.net', 'lh3.googleusercontent.com', 'lh4.googleusercontent.com', 'lh5.googleusercontent.com', 'lh6.googleusercontent.com', 'cdn.discordapp.com', 'avatars.githubusercontent.com']);
    if (storageUrl) hosts.add(new URL(storageUrl).hostname);
    return url.protocol === 'https:' && !url.username && !url.password && (!url.port || url.port === '443') && hosts.has(url.hostname);
  } catch { return false; }
}
async function boundedBody(response: Response): Promise<Buffer> {
  if (!response.ok || !response.body) throw new Error('Asset unavailable');
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) throw new Error('Asset exceeds 10 MB');
      chunks.push(value);
    }
  } finally { await reader.cancel().catch(() => {}); }
  return Buffer.concat(chunks);
}
export async function rasterAsset(value?: string | null, frameColor?: string): Promise<string | undefined> {
  if (!value) return undefined;
  let bytes: Buffer;
  if (value.startsWith('/') && !value.startsWith('//')) {
    const filename = path.resolve(publicRoot, `.${decodeURIComponent(value.split('?')[0])}`);
    if (!filename.startsWith(publicRoot + path.sep)) throw new Error('Invalid asset path');
    const resolved = await realpath(filename);
    if (!resolved.startsWith(await realpath(publicRoot) + path.sep) || (await stat(resolved)).size > MAX_BYTES) throw new Error('Invalid asset file');
    bytes = await readFile(resolved);
  } else {
    if (!allowedAssetUrl(value)) throw new Error('Unsupported image host');
    bytes = await boundedBody(await fetch(value, { redirect: 'error', signal: AbortSignal.timeout(8000) }));
  }
  if (bytes.length > MAX_BYTES) throw new Error('Asset exceeds 10 MB');
  if (frameColor && /^#[0-9a-f]{3,8}$/i.test(frameColor) && bytes.subarray(0,1000).toString('utf8').includes('<svg')) {
    bytes = Buffer.from(colorizeAvatarFrame(bytes.toString('utf8'), frameColor));
  }
  // Decode rather than trusting MIME/extensions. Animated media always uses frame zero.
  const image = sharp(bytes, { animated: false, limitInputPixels: 40_000_000 });
  const png = await image.resize({ width: 1920, height: 1080, fit: 'inside', withoutEnlargement: true }).png().toBuffer();
  return `data:image/png;base64,${png.toString('base64')}`;
}
export async function validateBackground(bytes: Buffer, mime: string): Promise<Buffer> {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(mime) || bytes.length > MAX_BYTES) throw new Error('Upload a PNG, JPEG or WebP image up to 10 MB.');
  const image = sharp(bytes, { limitInputPixels: 1920 * 1080 });
  const metadata = await image.metadata();
  if (!['png','jpeg','webp'].includes(metadata.format || '') || (metadata.pages || 1) !== 1 || metadata.width !== 1920 || metadata.height !== 1080 || (metadata.orientation || 1) > 4) {
    throw new Error('Backgrounds must be a still image exactly 1920 × 1080 pixels.');
  }
  return image.rotate().png().toBuffer();
}
