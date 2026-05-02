/**
 * Mobile (Capacitor) auth helpers. These functions wire the native sign-in
 * flows (Google plugin + Discord/Xbox in-app browser + deep-link callback)
 * up to the backend's mobile JWT endpoints, then store the resulting token
 * pair in @capacitor/preferences so subsequent API calls authenticate.
 */

import { setTokens } from './auth-token';
import { API_BASE, isNative } from './platform';
import { signInWithGoogleNative } from './firebase';

type MobileAuthResponse = {
  success?: boolean;
  message?: string;
  accessToken?: string;
  refreshToken?: string;
  user?: any;
};

async function postJson<T = MobileAuthResponse>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as T;
  if (!res.ok) {
    const message = (data as any)?.message || `Request to ${path} failed (${res.status})`;
    throw new Error(message);
  }
  return data;
}

/**
 * Native Google sign-in: open the system Google chooser via the Capacitor
 * Firebase plugin, exchange the resulting profile for JWT tokens at
 * /api/auth/mobile/google, persist tokens, and return the user object.
 */
export async function nativeSignInWithGoogle(): Promise<{ user: any }> {
  if (!isNative) {
    throw new Error('nativeSignInWithGoogle is only valid on native platforms');
  }
  const profile = await signInWithGoogleNative();
  const data = await postJson('/api/auth/mobile/google', {
    email: profile.email,
    displayName: profile.displayName,
    photoURL: profile.photoURL,
    uid: profile.uid,
  });
  if (!data.accessToken || !data.refreshToken) {
    throw new Error(data.message || 'Mobile Google sign-in did not return tokens');
  }
  await setTokens(data.accessToken, data.refreshToken);
  return { user: data.user };
}

/**
 * Exchange a one-time auth code (received via the
 * com.gamefolio.app://auth/callback?code=... deep link) for JWT tokens.
 */
export async function exchangeMobileAuthCode(code: string): Promise<{ user: any }> {
  if (!isNative) {
    throw new Error('exchangeMobileAuthCode is only valid on native platforms');
  }
  const data = await postJson('/api/auth/mobile/exchange', { code });
  if (!data.accessToken || !data.refreshToken) {
    throw new Error(data.message || 'Mobile auth exchange did not return tokens');
  }
  await setTokens(data.accessToken, data.refreshToken);
  return { user: data.user };
}
