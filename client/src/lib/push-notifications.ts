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
  // Use apiRequest so the call carries the JWT Authorization header on
  // native (cookies don't cross the Capacitor WebView origin, so a raw
  // fetch hits the server unauthenticated and gets a silent 401).
  try {
    await apiRequest('POST', '/api/push/register', { token, platform, appVersion });
    registeredToken = token;
    console.log(`[push] token registered (${platform}, ${appVersion ?? 'unknown'})`);
  } catch (err) {
    console.warn('[push] /api/push/register failed', err);
  }
}

async function unregisterTokenWithServer(token: string): Promise<void> {
  // Unregister tolerates 401 (logout may have already invalidated the
  // session), so use raw fetch with the URL rewriter rather than apiRequest.
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
