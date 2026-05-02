/**
 * Mobile (Capacitor) auth helpers. These functions wire the native sign-in
 * flows (Google plugin + Discord/Xbox in-app browser + deep-link callback)
 * up to the backend's mobile JWT endpoints, then store the resulting token
 * pair in @capacitor/preferences so subsequent API calls authenticate.
 */

import { Capacitor } from '@capacitor/core';
import { SignInWithApple, type SignInWithAppleResponse } from '@capacitor-community/apple-sign-in';
import { setTokens } from './auth-token';
import { API_BASE, isIOS, isNative } from './platform';
import { signInWithGoogleNative } from './firebase';
import { apiRequest } from './queryClient';

const APPLE_SERVICE_ID = (import.meta.env.VITE_APPLE_SERVICE_ID as string | undefined) ?? 'com.gamefolio.app';
const APPLE_REDIRECT_URI =
  (import.meta.env.VITE_APPLE_REDIRECT_URI as string | undefined) ?? 'https://app.gamefolio.com/api/auth/apple/callback';

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
 * Native Apple sign-in (iOS only). Opens the system Sign in with Apple sheet
 * via the @capacitor-community/apple-sign-in plugin, then exchanges the
 * resulting identity token for JWT tokens at /api/auth/mobile/apple.
 *
 * Apple only returns the user's email and full name on the FIRST authorization
 * for a given app — we forward those values to the backend so the new account
 * can be seeded with a display name. On subsequent sign-ins we still get the
 * stable `user` (Apple `sub`) inside the identity token.
 */
export function isAppleSignInAvailable(): boolean {
  return isIOS && Capacitor.isPluginAvailable('SignInWithApple');
}

export async function nativeSignInWithApple(): Promise<{ user: any }> {
  if (!isAppleSignInAvailable()) {
    throw new Error('Sign in with Apple is only available on iOS');
  }

  const result: SignInWithAppleResponse = await SignInWithApple.authorize({
    clientId: APPLE_SERVICE_ID,
    redirectURI: APPLE_REDIRECT_URI,
    scopes: 'email name',
  });

  const r = result.response;
  if (!r?.identityToken) {
    throw new Error('Apple sign-in did not return an identity token');
  }

  const data = await postJson('/api/auth/mobile/apple', {
    identityToken: r.identityToken,
    authorizationCode: r.authorizationCode,
    user: r.user,
    email: r.email,
    givenName: r.givenName,
    familyName: r.familyName,
  });
  if (!data.accessToken || !data.refreshToken) {
    throw new Error(data.message || 'Mobile Apple sign-in did not return tokens');
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

/**
 * Link a Xbox profile (captured via the connect-mode deep-link) to the
 * currently-authenticated user. Uses apiRequest so the request automatically
 * carries the Bearer token from auth-token storage.
 */
export async function nativeXboxConnect(code: string): Promise<{ xboxUsername: string; user: any }> {
  if (!isNative) {
    throw new Error('nativeXboxConnect is only valid on native platforms');
  }
  const res = await apiRequest('POST', '/api/auth/mobile/xbox/connect', { code });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.success) {
    throw new Error(data?.message || 'Failed to link Xbox account');
  }
  return { xboxUsername: data.xboxUsername, user: data.user };
}
