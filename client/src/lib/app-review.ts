import { App as CapacitorApp } from '@capacitor/app';
import { InAppReview } from '@capacitor-community/in-app-review';
import { isAndroid, isIOS, isNative, openExternal } from './platform';

const FIRST_SEEN_KEY = 'gf_review_first_seen_at';
const LAUNCH_COUNT_KEY = 'gf_review_launch_count';
const REQUESTED_VERSION_PREFIX = 'gf_review_requested_';
const MIN_LAUNCHES = 3;
const MIN_ACCOUNT_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const PROMPT_DELAY_MS = 10_000;

const IOS_REVIEW_URL = 'itms-apps://itunes.apple.com/app/id6763506661?action=write-review';
const ANDROID_REVIEW_URL = 'market://details?id=com.gamefolio.app';
const IOS_REVIEW_WEB_URL = 'https://apps.apple.com/gb/app/gamefolio/id6763506661?action=write-review';
const ANDROID_REVIEW_WEB_URL = 'https://play.google.com/store/apps/details?id=com.gamefolio.app';

function readNumber(key: string, fallback: number): number {
  const parsed = Number(localStorage.getItem(key));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function recordNativeLaunch(): { firstSeenAt: number; launchCount: number } | null {
  if (!isNative) return null;

  const now = Date.now();
  const firstSeenAt = readNumber(FIRST_SEEN_KEY, now);
  const launchCount = readNumber(LAUNCH_COUNT_KEY, 0) + 1;
  localStorage.setItem(FIRST_SEEN_KEY, String(firstSeenAt));
  localStorage.setItem(LAUNCH_COUNT_KEY, String(launchCount));
  return { firstSeenAt, launchCount };
}

export async function scheduleInAppReview(
  launch: { firstSeenAt: number; launchCount: number },
): Promise<() => void> {
  if (!isNative || launch.launchCount < MIN_LAUNCHES) return () => {};
  if (Date.now() - launch.firstSeenAt < MIN_ACCOUNT_AGE_MS) return () => {};

  const info = await CapacitorApp.getInfo();
  const versionKey = `${REQUESTED_VERSION_PREFIX}${info.version}`;
  if (localStorage.getItem(versionKey)) return () => {};

  const timer = window.setTimeout(() => {
    // Record the attempt before handing control to the OS. Apple and Google
    // intentionally do not report whether their quota allowed the dialog.
    localStorage.setItem(versionKey, new Date().toISOString());
    void InAppReview.requestReview().catch((error) => {
      console.warn('[app-review] Native review request failed', error);
      localStorage.removeItem(versionKey);
    });
  }, PROMPT_DELAY_MS);

  return () => window.clearTimeout(timer);
}

export async function openStoreReviewPage(): Promise<void> {
  if (isIOS) {
    await openExternal(isNative ? IOS_REVIEW_URL : IOS_REVIEW_WEB_URL);
    return;
  }
  if (isAndroid) {
    await openExternal(isNative ? ANDROID_REVIEW_URL : ANDROID_REVIEW_WEB_URL);
    return;
  }
  await openExternal(IOS_REVIEW_WEB_URL);
}
