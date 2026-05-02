import { App, type URLOpenListenerEvent } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { isNative } from './platform';

export const CAPACITOR_APP_SCHEME = 'com.gamefolio.app';
const SCHEME_PREFIX = `${CAPACITOR_APP_SCHEME}:`;

type PendingAuth = {
  resolve: (code: string) => void;
  reject: (err: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
};

type BufferedResult =
  | { kind: 'code'; code: string; receivedAt: number }
  | { kind: 'error'; message: string; receivedAt: number };

let pending: PendingAuth | null = null;
let listenerInstalled = false;
// Buffers the most recent callback if it arrived before any awaiter was
// registered (e.g., cold-start launch URL or a callback that fires before
// `awaitMobileAuthCallback()` runs). Drained on the next await.
let buffered: BufferedResult | null = null;
const BUFFER_TTL_MS = 60_000;

function clearPending(): void {
  if (pending) {
    clearTimeout(pending.timeout);
    pending = null;
  }
}

function clearBufferedIfStale(): void {
  if (buffered && Date.now() - buffered.receivedAt > BUFFER_TTL_MS) {
    buffered = null;
  }
}

function deliverOrBuffer(result: BufferedResult): void {
  if (pending) {
    const p = pending;
    clearPending();
    if (result.kind === 'code') {
      p.resolve(result.code);
    } else {
      p.reject(new Error(result.message));
    }
    return;
  }
  buffered = result;
}

/**
 * Strictly parse a URL and decide if it is one of OUR auth deep-links.
 * Only `com.gamefolio.app://...` URLs are accepted — any other scheme is
 * ignored to avoid cross-scheme spoofing of in-flight auth flows.
 */
function handleAuthUrl(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  if (parsed.protocol !== SCHEME_PREFIX) {
    return false;
  }

  // For custom schemes, the meaningful path piece is split between host and
  // pathname (e.g. "com.gamefolio.app://auth/callback" -> host="auth",
  // pathname="/callback").
  const composite = `${parsed.host || ''}${parsed.pathname || ''}`.toLowerCase();

  const isCallback = composite.includes('auth/callback') || composite.endsWith('/callback') || composite === 'auth';
  const isError = composite.includes('auth/error') || composite.endsWith('/error');

  if (!isCallback && !isError) {
    return false;
  }

  // Close any in-app browser still open.
  void Browser.close().catch(() => undefined);

  if (isError) {
    const message = parsed.searchParams.get('message') || 'Authentication failed';
    deliverOrBuffer({ kind: 'error', message, receivedAt: Date.now() });
    return true;
  }

  const code = parsed.searchParams.get('code');
  if (code) {
    deliverOrBuffer({ kind: 'code', code, receivedAt: Date.now() });
    return true;
  }

  return true;
}

export function initNativeAuthBridge(): void {
  if (!isNative || listenerInstalled) return;
  listenerInstalled = true;

  void App.addListener('appUrlOpen', (event: URLOpenListenerEvent) => {
    try {
      handleAuthUrl(event.url);
    } catch (err) {
      console.warn('appUrlOpen handler failed:', err);
    }
  });

  // Cold-start: if the app was launched directly by an auth deep link, the
  // appUrlOpen listener registered above may not have fired in time. Check
  // for a pending launch URL and replay it through the same handler.
  void (async () => {
    try {
      const launch = await App.getLaunchUrl();
      if (launch?.url) {
        handleAuthUrl(launch.url);
      }
    } catch (err) {
      console.warn('App.getLaunchUrl failed:', err);
    }
  })();

  // Treat the user closing the in-app browser as a cancel signal. On iOS the
  // Browser plugin emits `browserFinished` when SFSafariViewController is
  // dismissed; on Android it fires when Chrome Custom Tab finishes. Without
  // this, a user closing the browser would hang the auth promise until the
  // 5-minute timeout.
  void Browser.addListener('browserFinished', () => {
    if (pending) {
      cancelPendingMobileAuth('Authentication cancelled');
    }
  });
}

/**
 * Wait for a deep-link `auth/callback?code=...` to arrive after the user
 * completes an OAuth flow in the in-app browser. If a callback was already
 * received (cold-start launch URL or a fast redirect that landed before the
 * caller awaited), it is delivered immediately. Rejects on `auth/error` or
 * after the timeout (default 5 minutes).
 */
export function awaitMobileAuthCallback(timeoutMs = 5 * 60 * 1000): Promise<string> {
  if (!isNative) {
    return Promise.reject(new Error('awaitMobileAuthCallback is only valid on native'));
  }

  // Drain any buffered result first.
  clearBufferedIfStale();
  if (buffered) {
    const b = buffered;
    buffered = null;
    if (b.kind === 'code') return Promise.resolve(b.code);
    return Promise.reject(new Error(b.message));
  }

  if (pending) {
    pending.reject(new Error('Replaced by a new auth attempt'));
    clearPending();
  }

  return new Promise<string>((resolve, reject) => {
    const timeout = setTimeout(() => {
      if (pending) {
        clearPending();
        reject(new Error('Authentication timed out'));
      }
    }, timeoutMs);
    pending = { resolve, reject, timeout };
  });
}

export function cancelPendingMobileAuth(reason = 'Cancelled'): void {
  if (!pending) return;
  const p = pending;
  clearPending();
  p.reject(new Error(reason));
}
