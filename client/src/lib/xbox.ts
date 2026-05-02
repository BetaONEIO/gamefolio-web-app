import { Browser } from '@capacitor/browser';
import { isNative, openExternal, API_BASE } from './platform';
import { CAPACITOR_APP_SCHEME, awaitMobileAuthCallback } from './native-auth-bridge';

interface XboxUser {
  xuid: string;
  gamertag: string;
  gamerpic?: string;
}

interface XboxOAuthConfig {
  clientId: string;
  scope: string;
}

const xboxConfig: XboxOAuthConfig = {
  clientId: import.meta.env.VITE_MICROSOFT_CLIENT_ID || '',
  scope: 'XboxLive.signin XboxLive.offline_access'
};

// On native we drive the OAuth flow via the backend's /auth/mobile/xbox/init
// endpoint, so we don't strictly need the web client id locally.
export const isXboxConfigValid = isNative ? true : !!xboxConfig.clientId;

if (!isXboxConfigValid) {
  console.warn('Xbox configuration is incomplete. Xbox authentication will not work.');
}

function getRedirectUri(): string {
  return `${window.location.origin}/auth/xbox/callback`;
}

function generateOAuthState(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function storeOAuthState(state: string): void {
  localStorage.setItem('xbox_oauth_state', state);
}

function getStoredOAuthState(): string | null {
  return localStorage.getItem('xbox_oauth_state');
}

function clearOAuthState(): void {
  localStorage.removeItem('xbox_oauth_state');
}

function buildXboxAuthUrl(state: string): string {
  const authUrl = new URL('https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize');
  authUrl.searchParams.set('client_id', xboxConfig.clientId);
  authUrl.searchParams.set('redirect_uri', getRedirectUri());
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', xboxConfig.scope);
  authUrl.searchParams.set('state', state);
  return authUrl.toString();
}

export type XboxNativeLoginResult = { kind: 'native'; code: string };
export type XboxNativeConnectResult = { kind: 'native-connect'; code: string };
export type XboxNativeResult = XboxNativeLoginResult | XboxNativeConnectResult;

async function startXboxNativeFlow(mode: 'login' | 'connect'): Promise<string> {
  const initRes = await fetch(
    `${API_BASE}/api/auth/mobile/xbox/init?scheme=${encodeURIComponent(CAPACITOR_APP_SCHEME)}&mode=${mode}`,
    { method: 'GET' }
  );
  if (!initRes.ok) {
    throw new Error('Failed to start Xbox sign-in');
  }
  const { authUrl } = (await initRes.json()) as { authUrl: string };
  if (!authUrl) throw new Error('Xbox auth URL missing');

  const codePromise = awaitMobileAuthCallback();
  await Browser.open({ url: authUrl, presentationStyle: 'popover' });
  return codePromise;
}

/**
 * Initiate Xbox sign-in.
 *  - Web: redirects to Microsoft consumers OAuth page; resolves undefined.
 *  - Native: backend /api/auth/mobile/xbox/init returns the authUrl; opens it
 *            in the in-app browser and waits for the deep-link callback.
 */
export const signInWithXbox = async (): Promise<XboxNativeLoginResult | void> => {
  if (isNative) {
    const code = await startXboxNativeFlow('login');
    return { kind: 'native', code };
  }

  if (!isXboxConfigValid) {
    throw new Error('Xbox OAuth not properly configured');
  }

  const state = generateOAuthState();
  storeOAuthState(state);
  localStorage.removeItem('xbox_oauth_mode');
  await openExternal(buildXboxAuthUrl(state));
};

export const connectXboxAccount = async (): Promise<XboxNativeConnectResult | void> => {
  if (isNative) {
    // Connect mode: backend skips user-create and stores the raw Xbox profile
    // under a one-time code that the authenticated client redeems via
    // /api/auth/mobile/xbox/connect to link the xuid to the current user.
    const code = await startXboxNativeFlow('connect');
    return { kind: 'native-connect', code };
  }

  if (!isXboxConfigValid) {
    throw new Error('Xbox OAuth not properly configured');
  }

  const state = generateOAuthState();
  storeOAuthState(state);
  localStorage.setItem('xbox_oauth_mode', 'connect');
  await openExternal(buildXboxAuthUrl(state));
};

export const handleXboxCallback = async (code: string, state: string): Promise<XboxUser> => {
  if (!isXboxConfigValid) {
    throw new Error('Xbox OAuth not properly configured');
  }

  const storedState = getStoredOAuthState();
  if (!storedState || storedState !== state) {
    clearOAuthState();
    throw new Error('Invalid OAuth state parameter');
  }

  clearOAuthState();

  const response = await fetch('/api/auth/xbox/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code,
      redirectUri: getRedirectUri()
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Token exchange failed' }));
    throw new Error(errorData.message || 'Failed to exchange Xbox authorization code');
  }

  return response.json();
};

export const getXboxCallbackParams = (): { code: string | null; state: string | null; error: string | null } => {
  const urlParams = new URLSearchParams(window.location.search);
  return {
    code: urlParams.get('code'),
    state: urlParams.get('state'),
    error: urlParams.get('error')
  };
};
