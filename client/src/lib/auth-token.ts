import { Preferences } from '@capacitor/preferences';
import { isNative } from './platform';

const ACCESS_KEY = 'gf_access_token';
const REFRESH_KEY = 'gf_refresh_token';

let memoryAccess: string | null = null;
let memoryRefresh: string | null = null;
let hydrated = false;

async function hydrate(): Promise<void> {
  if (hydrated) return;
  hydrated = true;
  if (!isNative) return;
  try {
    const [a, r] = await Promise.all([
      Preferences.get({ key: ACCESS_KEY }),
      Preferences.get({ key: REFRESH_KEY }),
    ]);
    memoryAccess = a.value ?? null;
    memoryRefresh = r.value ?? null;
  } catch (e) {
    console.warn('auth-token: hydrate failed', e);
  }
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
  hydrated = true;
  if (!isNative) return;
  try {
    await Promise.all([
      Preferences.set({ key: ACCESS_KEY, value: access }),
      Preferences.set({ key: REFRESH_KEY, value: refresh }),
    ]);
  } catch (e) {
    console.warn('auth-token: setTokens failed', e);
  }
}

export async function clearTokens(): Promise<void> {
  memoryAccess = null;
  memoryRefresh = null;
  hydrated = true;
  if (!isNative) return;
  try {
    await Promise.all([
      Preferences.remove({ key: ACCESS_KEY }),
      Preferences.remove({ key: REFRESH_KEY }),
    ]);
  } catch (e) {
    console.warn('auth-token: clearTokens failed', e);
  }
}

export async function ensureHydrated(): Promise<void> {
  await hydrate();
}
