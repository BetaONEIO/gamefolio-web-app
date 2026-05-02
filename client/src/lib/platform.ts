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

/**
 * Open `url` outside of the SPA without hijacking the WebView.
 *
 * - On native (iOS/Android), http(s) URLs open in the in-app Capacitor
 *   Browser so the user can dismiss back to the app. Non-http schemes
 *   (mailto:, tel:, sms:, etc.) are handed to `window.location.href` so
 *   the OS can route them to the right app — Capacitor Browser only
 *   handles web URLs.
 * - On web, http(s) URLs open in a new tab. Non-http schemes use
 *   `window.location.href` because most browsers block `window.open` for
 *   `mailto:`/`tel:` links.
 *
 * Returns a promise that resolves once the browser was launched (native)
 * or the new tab/scheme was triggered (web).
 */
export async function openExternal(url: string): Promise<void> {
  const isHttp = /^https?:\/\//i.test(url);

  if (isNative) {
    if (isHttp) {
      await Browser.open({ url, presentationStyle: 'popover' });
      return;
    }
    // mailto:, tel:, sms:, custom schemes — let the OS handle the intent.
    window.location.href = url;
    return;
  }

  if (isHttp) {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }
  window.location.href = url;
}

/**
 * Subscribe to the in-app Capacitor Browser's "finished" (dismissed) event.
 * Useful for resetting transient UI state (e.g. an OAuth "Connecting…"
 * spinner) when the user closes the browser without completing the flow.
 *
 * On web this is a no-op and returns a noop unsubscribe.
 */
export function onExternalBrowserClosed(handler: () => void): () => void {
  if (!isNative) return () => {};
  let cleanup = () => {};
  void Browser.addListener('browserFinished', handler).then((sub) => {
    cleanup = () => {
      void sub.remove();
    };
  });
  return () => cleanup();
}

/**
 * Open a social-share intent URL (Twitter/Facebook/Reddit/etc) in the
 * platform-appropriate way. Preserves the legacy desktop-web UX of a
 * centered, popup-sized window so the share screen looks like a dialog,
 * not a full new tab. On native, defers to the in-app Capacitor Browser.
 */
export async function openShareWindow(
  url: string,
  opts: { width?: number; height?: number; name?: string } = {},
): Promise<void> {
  if (isNative) {
    await openExternal(url);
    return;
  }
  const width = opts.width ?? 600;
  const height = opts.height ?? 500;
  const name = opts.name ?? 'share';
  let features = 'noopener,noreferrer';
  try {
    const dualLeft =
      window.screenLeft ?? (window.screen as unknown as { left?: number }).left ?? 0;
    const dualTop =
      window.screenTop ?? (window.screen as unknown as { top?: number }).top ?? 0;
    const winW = window.innerWidth || document.documentElement.clientWidth || width;
    const winH = window.innerHeight || document.documentElement.clientHeight || height;
    const left = dualLeft + Math.max(0, (winW - width) / 2);
    const top = dualTop + Math.max(0, (winH - height) / 2);
    features = `noopener,noreferrer,width=${width},height=${height},left=${Math.round(left)},top=${Math.round(top)}`;
  } catch {
    features = `noopener,noreferrer,width=${width},height=${height}`;
  }
  const popup = window.open(url, name, features);
  // Some browsers ignore size hints and return null when blocking the
  // popup — fall back to a regular new tab so the user still gets the
  // intent URL.
  if (!popup) window.open(url, '_blank', 'noopener,noreferrer');
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
