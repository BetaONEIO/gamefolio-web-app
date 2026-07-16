import { Preferences } from '@capacitor/preferences';
import * as Sentry from '@sentry/capacitor';
import { isNative } from './platform';

const ACCESS_KEY = 'gf_access_token';
const REFRESH_KEY = 'gf_refresh_token';

let memoryAccess: string | null = null;
let memoryRefresh: string | null = null;
// A shared in-flight promise, not a boolean flag: multiple callers can invoke
// getAccessToken()/getRefreshToken() concurrently during cold boot (several
// queries firing at once). A boolean set synchronously before the actual
// Preferences.get() await let a second concurrent caller see "already
// hydrated" and read memoryAccess/memoryRefresh while they were still null -
// silently sending that request with no token and getting a false 401. All
// callers must await the same real hydration work instead.
let hydratePromise: Promise<void> | null = null;

function hydrate(): Promise<void> {
  if (hydratePromise) return hydratePromise;
  hydratePromise = (async () => {
    // Diagnostic for the "logged out after force-quit" investigation: report
    // via captureMessage (not just a breadcrumb) so this shows up as its own
    // Sentry event on every cold boot, even when nothing throws - we need to
    // see isNative + whether a stored token was found, not just failures.
    if (!isNative) {
      Sentry.captureMessage('auth-token: hydrate skipped, isNative is false', {
        level: 'warning',
        tags: { module: 'auth-token', op: 'hydrate', isNative: 'false' },
      });
      return;
    }
    try {
      const [a, r] = await Promise.all([
        Preferences.get({ key: ACCESS_KEY }),
        Preferences.get({ key: REFRESH_KEY }),
      ]);
      memoryAccess = a.value ?? null;
      memoryRefresh = r.value ?? null;
      Sentry.captureMessage('auth-token: hydrate completed', {
        level: 'info',
        tags: {
          module: 'auth-token',
          op: 'hydrate',
          isNative: 'true',
          hasAccess: String(!!memoryAccess),
          hasRefresh: String(!!memoryRefresh),
        },
      });
    } catch (e) {
      console.warn('auth-token: hydrate failed', e);
      Sentry.captureException(e, { tags: { module: 'auth-token', op: 'hydrate' } });
    }
  })();
  return hydratePromise;
}

export function getAccessTokenSync(): string | null {
  return memoryAccess;
}

export async function getAccessToken(): Promise<string | null> {
  await hydrate();
  return memoryAccess;
}

export async function getRefreshToken(): Promise<string | null> {
  await hydrate();
  return memoryRefresh;
}

export async function setTokens(access: string, refresh: string): Promise<void> {
  memoryAccess = access;
  memoryRefresh = refresh;
  hydratePromise = Promise.resolve();
  if (!isNative) return;
  try {
    await Promise.all([
      Preferences.set({ key: ACCESS_KEY, value: access }),
      Preferences.set({ key: REFRESH_KEY, value: refresh }),
    ]);
    Sentry.addBreadcrumb({ category: 'auth-token', message: 'setTokens', level: 'info' });
  } catch (e) {
    console.warn('auth-token: setTokens failed', e);
    Sentry.captureException(e, { tags: { module: 'auth-token', op: 'setTokens' } });
  }
}

export async function clearTokens(): Promise<void> {
  memoryAccess = null;
  memoryRefresh = null;
  hydratePromise = Promise.resolve();
  if (!isNative) return;
  try {
    await Promise.all([
      Preferences.remove({ key: ACCESS_KEY }),
      Preferences.remove({ key: REFRESH_KEY }),
    ]);
    Sentry.addBreadcrumb({ category: 'auth-token', message: 'clearTokens', level: 'info' });
  } catch (e) {
    console.warn('auth-token: clearTokens failed', e);
    Sentry.captureException(e, { tags: { module: 'auth-token', op: 'clearTokens' } });
  }
}

export async function ensureHydrated(): Promise<void> {
  await hydrate();
}
