import { Preferences } from '@capacitor/preferences';
import { isNative } from './platform';

// Best-effort per-install identifier used only as a spam / multi-account
// detection signal server-side (see gamefolio-bot) — never used for auth.
// Web: localStorage is synchronous, so the id is available immediately.
// Native: Capacitor Preferences is async, so we cache in memory after a
// startup hydrate() (mirrors client/src/lib/auth-token.ts) and expose a sync
// getter that returns null until that completes.
const STORAGE_KEY = 'gf_device_id';

function generateId(): string {
  if ('randomUUID' in crypto) return crypto.randomUUID();
  // Fallback for older WebViews without crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

let memoryDeviceId: string | null = null;
let hydratePromise: Promise<void> | null = null;

function hydrate(): Promise<void> {
  if (hydratePromise) return hydratePromise;
  hydratePromise = (async () => {
    if (!isNative) {
      try {
        let id = localStorage.getItem(STORAGE_KEY);
        if (!id) {
          id = generateId();
          localStorage.setItem(STORAGE_KEY, id);
        }
        memoryDeviceId = id;
      } catch {
        // localStorage unavailable (private mode, etc.) — fall back to an
        // in-memory-only id for this session rather than sending nothing.
        memoryDeviceId = generateId();
      }
      return;
    }
    try {
      const existing = await Preferences.get({ key: STORAGE_KEY });
      if (existing.value) {
        memoryDeviceId = existing.value;
      } else {
        const id = generateId();
        await Preferences.set({ key: STORAGE_KEY, value: id });
        memoryDeviceId = id;
      }
    } catch (e) {
      console.warn('device-id: hydrate failed', e);
      memoryDeviceId = generateId();
    }
  })();
  return hydratePromise;
}

/** Call once at startup (see main.tsx) so getDeviceIdSync() is populated before requests fire. */
export async function ensureDeviceIdHydrated(): Promise<void> {
  await hydrate();
}

/** Returns null until ensureDeviceIdHydrated() has resolved. */
export function getDeviceIdSync(): string | null {
  return memoryDeviceId;
}

export async function getDeviceId(): Promise<string> {
  await hydrate();
  return memoryDeviceId!;
}
