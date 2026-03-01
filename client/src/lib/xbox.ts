interface XboxUser {
  xuid: string;
  gamertag: string;
  gamerpic?: string;
}

interface XboxOAuthConfig {
  clientId: string;
  redirectUri: string;
  scope: string;
}

const xboxConfig: XboxOAuthConfig = {
  clientId: import.meta.env.VITE_MICROSOFT_CLIENT_ID || '',
  redirectUri: 'https://app.gamefolio.com/auth/xbox/callback',
  scope: 'Xboxlive.signin Xboxlive.offline_access'
};

export const isXboxConfigValid = !!xboxConfig.clientId;

if (!isXboxConfigValid) {
  console.warn('Xbox configuration is incomplete. Xbox authentication will not work.');
}

function generateOAuthState(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function storeOAuthState(state: string): void {
  sessionStorage.setItem('xbox_oauth_state', state);
}

function getStoredOAuthState(): string | null {
  return sessionStorage.getItem('xbox_oauth_state');
}

function clearOAuthState(): void {
  sessionStorage.removeItem('xbox_oauth_state');
}

export const signInWithXbox = async (): Promise<void> => {
  if (!isXboxConfigValid) {
    throw new Error('Xbox OAuth not properly configured');
  }

  const state = generateOAuthState();
  storeOAuthState(state);

  const authUrl = new URL('https://login.live.com/oauth20_authorize.srf');
  authUrl.searchParams.set('client_id', xboxConfig.clientId);
  authUrl.searchParams.set('redirect_uri', xboxConfig.redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', xboxConfig.scope);
  authUrl.searchParams.set('state', state);

  window.location.href = authUrl.toString();
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
      redirectUri: xboxConfig.redirectUri
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
