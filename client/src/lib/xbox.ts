import { openExternal } from './platform';

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

export const isXboxConfigValid = !!xboxConfig.clientId;

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

function navigateToXboxAuth(url: string): void {
  void openExternal(url);
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

export const signInWithXbox = (): void => {
  if (!isXboxConfigValid) {
    throw new Error('Xbox OAuth not properly configured');
  }

  const state = generateOAuthState();
  storeOAuthState(state);
  localStorage.removeItem('xbox_oauth_mode');

  navigateToXboxAuth(buildXboxAuthUrl(state));
};

export const connectXboxAccount = (): void => {
  if (!isXboxConfigValid) {
    throw new Error('Xbox OAuth not properly configured');
  }

  const state = generateOAuthState();
  storeOAuthState(state);
  localStorage.setItem('xbox_oauth_mode', 'connect');

  navigateToXboxAuth(buildXboxAuthUrl(state));
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
