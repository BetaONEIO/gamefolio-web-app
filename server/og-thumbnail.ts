import sharp from 'sharp';
import { supabaseStorage } from './supabase-storage';

/**
 * Refreshes a Supabase signed URL so the token isn't expired.
 * Returns the original URL if it isn't a Supabase signed URL or refresh fails.
 */
export async function refreshSupabaseSignedUrl(
  url: string,
  expiresIn: number = 60 * 60 * 24 * 7
): Promise<string> {
  if (!url) return url;
  // Re-sign any Supabase storage URL (both `/object/sign/` and `/object/public/` forms)
  // because some buckets/folders aren't publicly readable, so signed URLs are required
  // for crawlers to fetch them.
  if (!/\/storage\/v1\/object\/(sign|public)\//.test(url)) return url;
  try {
    const fresh = await supabaseStorage.convertToSignedUrl(url, expiresIn);
    return fresh || url;
  } catch {
    return url;
  }
}

/**
 * Creates a play button overlay on a thumbnail image.
 * Re-signs Supabase signed URLs first so the upstream fetch doesn't fail
 * when the original token has expired.
 */
export async function addPlayButtonOverlay(thumbnailUrl: string): Promise<Buffer> {
  const fetchUrl = await refreshSupabaseSignedUrl(thumbnailUrl);

  const response = await fetch(fetchUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch thumbnail: ${response.status} ${response.statusText}`);
  }

  const thumbnailBuffer = Buffer.from(await response.arrayBuffer());

  const metadata = await sharp(thumbnailBuffer, { failOn: 'none' }).metadata();
  const width = metadata.width || 1200;

  const buttonSize = Math.floor(width * 0.2);
  const buttonRadius = buttonSize / 2;

  const playButtonSvg = `
    <svg width="${buttonSize}" height="${buttonSize}" xmlns="http://www.w3.org/2000/svg">
      <circle cx="${buttonRadius}" cy="${buttonRadius}" r="${buttonRadius}"
        fill="rgba(0, 0, 0, 0.7)" />
      <circle cx="${buttonRadius}" cy="${buttonRadius}" r="${buttonRadius - 4}"
        fill="none" stroke="rgba(255, 255, 255, 0.9)" stroke-width="3" />
      <path d="M ${buttonRadius * 0.7} ${buttonRadius * 0.5}
               L ${buttonRadius * 1.5} ${buttonRadius}
               L ${buttonRadius * 0.7} ${buttonRadius * 1.5} Z"
        fill="rgba(255, 255, 255, 0.95)" />
    </svg>
  `;

  return sharp(thumbnailBuffer, { failOn: 'none' })
    .resize(1200, 630, { fit: 'cover', position: 'center' })
    .composite([{
      input: Buffer.from(playButtonSvg),
      left: Math.floor((1200 - buttonSize) / 2),
      top: Math.floor((630 - buttonSize) / 2),
      blend: 'over',
    }])
    .jpeg({ quality: 90 })
    .toBuffer();
}
