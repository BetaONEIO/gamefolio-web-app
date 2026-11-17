import { Preferences } from '@capacitor/preferences';
import * as Sentry from '@sentry/capacitor';
import { isNative } from './platform';

const ACCESS_KEY = 'gf_access_token';
const REFRESH_KEY = 'gf_refresh_token';
const AUTH_EXPECTED_KEY = 'gf_auth_expected';

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

type TokenSummary = {
  present: boolean;
  expiryState: 'missing' | 'valid' | 'expired' | 'unknown';
  expiresInSeconds?: number;
};

function summarizeToken(token: string | null): TokenSummary {
  if (!token) return { present: false, expiryState: 'missing' };
  try {
    const encodedPayload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const paddedPayload = encodedPayload.padEnd(Math.ceil(encodedPayload.length / 4) * 4, '=');
    const payload = JSON.parse(atob(paddedPayload));
    if (typeof payload?.exp !== 'number') return { present: true, expiryState: 'unknown' };
    const expiresInSeconds = Math.round(payload.exp - Date.now() / 1000);
    return {
      present: true,
      expiryState: expiresInSeconds > 0 ? 'valid' : 'expired',
      expiresInSeconds,
    };
  } catch {
    return { present: true, expiryState: 'unknown' };
  }
}

function recordHydratedTokenState(authExpected: boolean): void {
  const access = summarizeToken(memoryAccess);
  const refresh = summarizeToken(memoryRefresh);
  const context = {
    access_present: access.present,
    access_expiry_state: access.expiryState,
    access_expires_in_seconds: access.expiresInSeconds,
    refresh_present: refresh.present,
    refresh_expiry_state: refresh.expiryState,
    refresh_expires_in_seconds: refresh.expiresInSeconds,
    auth_expected: authExpected,
  };
  Sentry.setContext('native_auth_tokens', context);
  Sentry.addBreadcrumb({ category: 'auth-token', message: 'hydrate completed', level: 'info', data: context });

  // A half-written token pair can never refresh reliably. The separate
  // expectation marker also lets us distinguish a normal logged-out launch
  // from credentials unexpectedly disappearing between app launches.
  if (access.present !== refresh.present || (authExpected && !access.present && !refresh.present)) {
    Sentry.captureMessage('Native auth token persistence mismatch', {
      level: 'warning',
      tags: { module: 'auth-token', op: 'hydrate' },
      extra: context,
    });
  }
}

function hydrate(): Promise<void> {
  if (hydratePromise) return hydratePromise;
  hydratePromise = (async () => {
    // Web has no Preferences store - tokens only ever live in memory there.
    if (!isNative) return;
    try {
      const [a, r, expected] = await Promise.all([
        Preferences.get({ key: ACCESS_KEY }),
        Preferences.get({ key: REFRESH_KEY }),
        Preferences.get({ key: AUTH_EXPECTED_KEY }),
      ]);
      memoryAccess = a.value ?? null;
      memoryRefresh = r.value ?? null;
      recordHydratedTokenState(expected.value === '1');
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
      Preferences.set({ key: AUTH_EXPECTED_KEY, value: '1' }),
    ]);
    Sentry.addBreadcrumb({ category: 'auth-token', message: 'setTokens', level: 'info' });
  } catch (e) {
    console.warn('auth-token: setTokens failed', e);
    Sentry.captureException(e, { tags: { module: 'auth-token', op: 'setTokens' } });
  }
}

export async function clearTokens(reason: string = 'unspecified'): Promise<void> {
  const previousState = {
    access_present: Boolean(memoryAccess),
    refresh_present: Boolean(memoryRefresh),
    reason,
  };
  memoryAccess = null;
  memoryRefresh = null;
  hydratePromise = Promise.resolve();
  Sentry.addBreadcrumb({ category: 'auth-token', message: 'clearTokens', level: 'info', data: previousState });
  Sentry.setContext('native_auth_tokens', {
    access_present: false,
    refresh_present: false,
    cleared_reason: reason,
  });
  if (!isNative) return;
  try {
    await Promise.all([
      Preferences.remove({ key: ACCESS_KEY }),
      Preferences.remove({ key: REFRESH_KEY }),
      Preferences.remove({ key: AUTH_EXPECTED_KEY }),
    ]);
  } catch (e) {
    console.warn('auth-token: clearTokens failed', e);
    Sentry.captureException(e, { tags: { module: 'auth-token', op: 'clearTokens' } });
  }
}

export async function ensureHydrated(): Promise<void> {
  await hydrate();
}
