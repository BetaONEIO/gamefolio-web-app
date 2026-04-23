import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

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
  window.location.href = url;
}
