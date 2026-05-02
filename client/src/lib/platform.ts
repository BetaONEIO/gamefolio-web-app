import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { Share } from '@capacitor/share';

export const isNative = Capacitor.isNativePlatform();
export const platform = Capacitor.getPlatform();
export const isIOS = platform === 'ios';
export const isAndroid = platform === 'android';

// On native builds, the webview origin is capacitor://localhost (iOS) or
// https://localhost (Android). Relative /api paths must be rewritten to the
// hosted backend. VITE_API_URL should be set at build time for native.
export const API_BASE: string = isNative
  ? (import.meta.env.VITE_API_URL as string | undefined) ?? 'https://app.gamefolio.com'
  : '';

export function resolveApiUrl(url: string): string {
  if (!isNative) return url;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('/')) return `${API_BASE}${url}`;
  return url;
}

let fetchPatched = false;
export function installNativeFetchPatch(): void {
  if (!isNative || fetchPatched) return;
  const originalFetch = globalThis.fetch.bind(globalThis);
  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    if (typeof input === 'string') {
      return originalFetch(resolveApiUrl(input), init);
    }
    if (input instanceof URL) {
      return originalFetch(input, init);
    }
    // Request object — rebuild with rewritten URL if relative
    const rewritten = resolveApiUrl(input.url);
    if (rewritten === input.url) return originalFetch(input, init);
    return originalFetch(new Request(rewritten, input), init);
  }) as typeof fetch;
  fetchPatched = true;
}

export async function openExternal(url: string): Promise<void> {
  if (isNative) {
    await Browser.open({ url, presentationStyle: 'popover' });
    return;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}

export interface NativeShareOptions {
  title?: string;
  text?: string;
  url?: string;
  dialogTitle?: string;
}

/**
 * Share content using the platform's native share sheet when available
 * (Capacitor on iOS/Android, Web Share API in mobile browsers). Falls back
 * to opening a target URL in a new window/external browser so existing
 * "share to Twitter/Facebook" buttons keep working on desktop web.
 *
 * Returns `true` when the native sheet handled the share, `false` when the
 * caller should run its own fallback (e.g. open a social-share popup).
 */
export async function nativeShare(opts: NativeShareOptions): Promise<boolean> {
  const payload = {
    title: opts.title,
    text: opts.text,
    url: opts.url,
    dialogTitle: opts.dialogTitle ?? opts.title,
  };

  if (isNative) {
    try {
      await Share.share(payload);
      return true;
    } catch (err) {
      const name = (err as { message?: string })?.message ?? '';
      // User cancelled — treat as handled so we don't fall back to a popup.
      if (/cancel/i.test(name)) return true;
      console.warn('Native share failed, falling back:', err);
      return false;
    }
  }

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({
        title: payload.title,
        text: payload.text,
        url: payload.url,
      });
      return true;
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return true;
      // Browser refused (e.g. no user gesture) — caller can fall back.
      return false;
    }
  }

  return false;
}
