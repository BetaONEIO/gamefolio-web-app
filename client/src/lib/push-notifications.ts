import { FirebaseMessaging } from '@capacitor-firebase/messaging';
import { App as CapacitorApp } from '@capacitor/app';
import { isNative, isIOS, isAndroid, resolveApiUrl } from './platform';
import { apiRequest } from './queryClient';

let initialised = false;
let registeredToken: string | null = null;

const NOTIFICATION_DEEP_LINK_EVENT = 'gf-push-deeplink';

interface PushDeepLinkDetail {
  actionUrl?: string;
  notificationId?: string;
  type?: string;
}

declare global {
  interface WindowEventMap {
    'gf-push-deeplink': CustomEvent<PushDeepLinkDetail>;
  }
}

async function reportDiagnostic(stage: string, detail: string): Promise<void> {
  try {
    await apiRequest('POST', '/api/push/diagnostic', {
      stage,
      detail,
      platform: isIOS ? 'ios' : isAndroid ? 'android' : 'web',
    });
  } catch {
    // best-effort only
  }
}

async function registerTokenWithServer(token: string): Promise<void> {
  if (registeredToken === token) return;
  let appVersion: string | undefined;
  try {
    const info = await CapacitorApp.getInfo();
    appVersion = `${info.version} (${info.build})`;
  } catch {
    appVersion = undefined;
  }
  const platform = isIOS ? 'ios' : isAndroid ? 'android' : 'web';
  try {
    await apiRequest('POST', '/api/push/register', { token, platform, appVersion });
    registeredToken = token;
    console.log(`[push] token registered (${platform}, ${appVersion ?? 'unknown'})`);
  } catch (err) {
    console.warn('[push] /api/push/register failed', err);
    void reportDiagnostic('register-failed', String(err));
  }
}

async function unregisterTokenWithServer(token: string): Promise<void> {
  try {
    await fetch(resolveApiUrl('/api/push/unregister'), {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
  } catch (err) {
    console.warn('[push] /api/push/unregister failed', err);
  }
  if (registeredToken === token) registeredToken = null;
}

async function getTokenWithRetry(maxAttempts = 4, baseDelayMs = 2000): Promise<string | null> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const { token } = await FirebaseMessaging.getToken();
      if (token) {
        console.log(`[push] getToken succeeded on attempt ${attempt}`);
        return token;
      }
      console.warn(`[push] getToken returned empty token (attempt ${attempt}/${maxAttempts})`);
      void reportDiagnostic('getToken-empty', `attempt ${attempt}`);
    } catch (err) {
      console.warn(`[push] getToken error (attempt ${attempt}/${maxAttempts}):`, err);
      void reportDiagnostic('getToken-error', `attempt ${attempt}: ${String(err)}`);
    }
    if (attempt < maxAttempts) {
      // Exponential backoff: 2s, 4s, 8s
      await new Promise<void>((r) => setTimeout(r, baseDelayMs * attempt));
    }
  }
  return null;
}

export async function initPushNotifications(): Promise<void> {
  if (!isNative || initialised) return;
  initialised = true;

  try {
    const perm = await FirebaseMessaging.checkPermissions();
    let granted = perm.receive === 'granted';
    if (!granted) {
      const req = await FirebaseMessaging.requestPermissions();
      granted = req.receive === 'granted';
    }
    if (!granted) {
      console.log('[push] permission not granted');
      void reportDiagnostic('permission-denied', 'user denied or not determined');
      return;
    }

    void reportDiagnostic('permission-granted', 'proceeding to getToken');

    // Register the tokenReceived listener FIRST so we never miss an async
    // token refresh even if the initial getToken() call below fails.
    await FirebaseMessaging.addListener('tokenReceived', ({ token: newToken }) => {
      console.log('[push] tokenReceived event fired');
      if (newToken) void registerTokenWithServer(newToken);
    });

    // When the user taps a push that was delivered while the app was in the
    // background, FCM hands us the message + data payload. Surface the
    // actionUrl on a window event so the SPA's router can navigate to it.
    await FirebaseMessaging.addListener('notificationActionPerformed', (event) => {
      const data = (event.notification?.data ?? {}) as Record<string, string>;
      const detail: PushDeepLinkDetail = {
        actionUrl: data.actionUrl,
        notificationId: data.notificationId,
        type: data.type,
      };
      try {
        window.dispatchEvent(new CustomEvent(NOTIFICATION_DEEP_LINK_EVENT, { detail }));
      } catch {
        /* noop */
      }
    });

    // Try to get the token, retrying up to 4 times with backoff in case
    // the APNs token exchange hasn't completed yet at app startup.
    const token = await getTokenWithRetry();
    if (token) {
      await registerTokenWithServer(token);
    } else {
      console.warn('[push] could not obtain FCM token after all retries');
      void reportDiagnostic('getToken-all-failed', 'no token after 4 attempts');
    }
  } catch (err) {
    console.warn('[push] init failed:', err);
    void reportDiagnostic('init-failed', String(err));
  }
}

export async function unregisterCurrentPushToken(): Promise<void> {
  if (!isNative) return;
  try {
    const { token } = await FirebaseMessaging.getToken();
    if (token) await unregisterTokenWithServer(token);
    await FirebaseMessaging.deleteToken();
  } catch (err) {
    console.warn('[push] unregister current token failed:', err);
  }
}
