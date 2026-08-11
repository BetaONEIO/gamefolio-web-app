/**
 * Discord OAuth configuration and authentication functions
 * Web flow: redirect to Discord, callback at /auth/discord/callback (handled
 *           by client/src/components/auth/DiscordCallback.tsx)
 * Native flow (Capacitor): backend /api/auth/mobile/discord/init returns an
 *           authUrl, we open it in @capacitor/browser, the backend's mobile
 *           callback redirects to com.gamefolio.app://auth/callback?code=...
 *           which is captured by native-auth-bridge and exchanged for JWT
 *           tokens via /api/auth/mobile/exchange.
 */

import { Browser } from '@capacitor/browser';
import { isNative, openExternal, API_BASE } from './platform';
import { CAPACITOR_APP_SCHEME, awaitMobileAuthCallback } from './native-auth-bridge';

interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  email?: string;
  avatar?: string;
  verified?: boolean;
}

interface DiscordOAuthConfig {
  clientId: string;
  redirectUri: string;
  scope: string;
}

// Discord OAuth configuration (web flow)
const discordConfig: DiscordOAuthConfig = {
  clientId: import.meta.env.VITE_DISCORD_CLIENT_ID || '',
  redirectUri: typeof window !== 'undefined'
    ? `${window.location.origin}/auth/discord/callback`
    : '',
  scope: 'identify email'
};

// Discord client id is only required for the web popup flow; the native
// flow runs through the backend so it can work even without it.
const isDiscordConfigValid = isNative ? true : !!discordConfig.clientId;

if (!isDiscordConfigValid) {
  console.warn('Discord configuration is incomplete. Discord authentication will not work.');
  console.warn('Missing values:', {
    hasClientId: !!discordConfig.clientId,
    clientId: discordConfig.clientId
  });
}

/**
 * Fetch a CSRF state token from the server, which stores it in the session.
 * The server's /api/auth/discord/token verifies the value we round-trip here
 * against the session-stored copy. Server-side session storage is used because
 * client-side approaches (sessionStorage / localStorage / cookies) all proved
 * unreliable across Discord's COOP-induced browsing-context-group change and
 * Chrome's storage partitioning.
 */
async function fetchOAuthState(): Promise<string> {
  const res = await fetch('/api/auth/discord/init', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    throw new Error('Failed to start Discord sign-in');
  }
  const data = await res.json();
  if (!data?.state) {
    throw new Error('Server did not return an OAuth state');
  }
  return data.state as string;
}

/**
 * Result returned by signInWithDiscord on native platforms — a one-time auth
 * code that should be exchanged with /api/auth/mobile/exchange.
 */
export type DiscordNativeResult = { kind: 'native'; code: string };

/**
 * Initiate Discord OAuth flow.
 *  - Web: redirects to Discord; resolves to undefined.
 *  - Native: opens Discord in @capacitor/browser, waits for the deep-link
 *            callback, and resolves to a one-time auth code.
 */
export const signInWithDiscord = async (): Promise<DiscordNativeResult | void> => {
  if (isNative) {
    // Use the backend mobile init endpoint so the redirect URI matches the
    // server's callback (deep-link back into the app).
    const initRes = await fetch(
      `${API_BASE}/api/auth/mobile/discord/init?scheme=${encodeURIComponent(CAPACITOR_APP_SCHEME)}`,
      { method: 'GET' }
    );
    if (!initRes.ok) {
      throw new Error('Failed to start Discord sign-in');
    }
    const { authUrl } = (await initRes.json()) as { authUrl: string };
    if (!authUrl) throw new Error('Discord auth URL missing');

    // Kick off the deep-link wait BEFORE opening the browser so we don't miss
    // a fast redirect.
    const codePromise = awaitMobileAuthCallback();
    await Browser.open({ url: authUrl, presentationStyle: 'popover' });
    const code = await codePromise;
    return { kind: 'native', code };
  }

  if (!isDiscordConfigValid) {
    throw new Error('Discord OAuth not properly configured');
  }

  // Web: fetch a CSRF state from the server (stored in the express-session),
  // then full-page redirect to Discord with that state. Same-tab navigation
  // is still required so the session cookie travels with the return request.
  const state = await fetchOAuthState();

  const authUrl = new URL('https://discord.com/oauth2/authorize');
  authUrl.searchParams.set('client_id', discordConfig.clientId);
  authUrl.searchParams.set('redirect_uri', discordConfig.redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', discordConfig.scope);
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('prompt', 'consent');

  window.location.href = authUrl.toString();
};

/**
 * Handle Discord OAuth callback (web only).
 * This processes the authorization code returned from Discord.
 */
export const handleDiscordCallback = async (code: string, state: string): Promise<DiscordUser> => {
  if (!isDiscordConfigValid) {
    throw new Error('Discord OAuth not properly configured');
  }

  // State verification now happens server-side: /api/auth/discord/token
  // compares the `state` posted here against the value previously stored
  // on the session by /api/auth/discord/init.
  try {
    const response = await fetch('/api/auth/discord/token', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code,
        state,
        redirectUri: discordConfig.redirectUri,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Token exchange failed' }));
      throw new Error(errorData.message || 'Failed to exchange authorization code');
    }

    const userData = await response.json();
    return userData;
  } catch (error) {
    console.error('Discord token exchange error:', error);
    throw error;
  }
};

/**
 * Check if current URL is a Discord OAuth callback (web)
 */
export const isDiscordCallback = (): boolean => {
  return typeof window !== 'undefined' && window.location.pathname === '/auth/discord/callback';
};

/**
 * Extract OAuth parameters from current URL (web)
 */
export const getDiscordCallbackParams = (): { code: string | null; state: string | null; error: string | null } => {
  const urlParams = new URLSearchParams(window.location.search);
  return {
    code: urlParams.get('code'),
    state: urlParams.get('state'),
    error: urlParams.get('error')
  };
};

export { isDiscordConfigValid };
