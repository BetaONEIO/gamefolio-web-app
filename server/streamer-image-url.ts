const DEFAULT_APP_URL = "https://app.gamefolio.com";
const LEGACY_MEDIA_URL = "https://media.gamefolio.com/legacy-supabase";

/**
 * Return a public, absolute URL that the marketing site can render.
 * User media was migrated away from Supabase, while older accounts can still
 * contain either the former public URL or an app-relative path.
 */
export function canonicalStreamerImageUrl(
  value: string | null | undefined,
  appBaseUrl = process.env.APP_BASE_URL || DEFAULT_APP_URL,
): string | null {
  const input = value?.trim();
  if (!input) return null;

  try {
    const url = new URL(input, appBaseUrl);
    const publicObjectPrefix = "/storage/v1/object/public/";

    if (url.hostname.endsWith(".supabase.co") && url.pathname.includes(publicObjectPrefix)) {
      const objectPath = url.pathname.split(publicObjectPrefix)[1];
      return `${LEGACY_MEDIA_URL}/${objectPath}`;
    }

    return url.toString();
  } catch {
    return null;
  }
}
