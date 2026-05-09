import { FirebaseMessaging } from '@capacitor-firebase/messaging';
import { App as CapacitorApp } from '@capacitor/app';
import { isNative, isIOS, isAndroid, resolveApiUrl } from './platform';

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

async function postJson(path: string, body: unknown): Promise<Response | null> {
  try {
    return await fetch(resolveApiUrl(path), {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.warn(`[push] ${path} failed`, err);
    return null;
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
  const res = await postJson('/api/push/register', { token, platform, appVersion });
  if (res?.ok) {
    registeredToken = token;
  }
}

async function unregisterTokenWithServer(token: string): Promise<void> {
  await postJson('/api/push/unregister', { token });
  if (registeredToken === token) registeredToken = null;
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
      return;
    }

    const { token } = await FirebaseMessaging.getToken();
    if (token) await registerTokenWithServer(token);

    await FirebaseMessaging.addListener('tokenReceived', ({ token: newToken }) => {
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
  } catch (err) {
    console.warn('[push] init failed:', err);
  }
}

// Called from the auth flow when the user logs out so we don't keep pushing
// to a device that signed out. Best-effort: failures are logged but don't
// block the logout itself.
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
