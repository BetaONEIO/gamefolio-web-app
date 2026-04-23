/**
 * Discord OAuth configuration and authentication functions
 * Similar to Firebase setup but for Discord OAuth 2.0
 */

import { openExternal } from './platform';

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

// Discord OAuth configuration
const discordConfig: DiscordOAuthConfig = {
  clientId: import.meta.env.VITE_DISCORD_CLIENT_ID || '',
  redirectUri: `${window.location.origin}/auth/discord/callback`,
  scope: 'identify email'
};

// Validate Discord configuration
const isDiscordConfigValid = !!discordConfig.clientId;

if (!isDiscordConfigValid) {
  console.warn('Discord configuration is incomplete. Discord authentication will not work.');
  console.warn('Missing values:', {
    hasClientId: !!discordConfig.clientId,
    clientId: discordConfig.clientId
  });
}

/**
 * Generate a secure random state for OAuth flow
 */
function generateOAuthState(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

/**
 * Store and retrieve OAuth state from sessionStorage for security
 */
function storeOAuthState(state: string): void {
  sessionStorage.setItem('discord_oauth_state', state);
}

function getStoredOAuthState(): string | null {
  return sessionStorage.getItem('discord_oauth_state');
}

function clearOAuthState(): void {
  sessionStorage.removeItem('discord_oauth_state');
}

/**
 * Initiate Discord OAuth flow
 * Opens Discord authorization URL in current window
 */
export const signInWithDiscord = async (): Promise<void> => {
  if (!isDiscordConfigValid) {
    throw new Error('Discord OAuth not properly configured');
  }

  // Generate and store state for security
  const state = generateOAuthState();
  storeOAuthState(state);

  // Build Discord OAuth URL
  const authUrl = new URL('https://discord.com/oauth2/authorize');
  authUrl.searchParams.set('client_id', discordConfig.clientId);
  authUrl.searchParams.set('redirect_uri', discordConfig.redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', discordConfig.scope);
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('prompt', 'consent');

  // Redirect to Discord OAuth (in-app browser on native, same-window on web)
  await openExternal(authUrl.toString());
};

/**
 * Handle Discord OAuth callback
 * This processes the authorization code returned from Discord
 */
export const handleDiscordCallback = async (code: string, state: string): Promise<DiscordUser> => {
  if (!isDiscordConfigValid) {
    throw new Error('Discord OAuth not properly configured');
  }

  // Verify state parameter for security
  const storedState = getStoredOAuthState();
  if (!storedState || storedState !== state) {
    clearOAuthState();
    throw new Error('Invalid OAuth state parameter');
  }

  clearOAuthState();

  try {
    // Exchange authorization code for access token via our backend
    const response = await fetch('/api/auth/discord/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code,
        redirectUri: discordConfig.redirectUri
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
 * Check if current URL is a Discord OAuth callback
 */
export const isDiscordCallback = (): boolean => {
  return window.location.pathname === '/auth/discord/callback';
};

/**
 * Extract OAuth parameters from current URL
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