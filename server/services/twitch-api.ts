import axios from 'axios';

// Check if required environment variables are set
if (!process.env.TWITCH_CLIENT_ID) {
  console.error('TWITCH_CLIENT_ID environment variable is not set');
}

if (!process.env.TWITCH_CLIENT_SECRET) {
  console.error('TWITCH_CLIENT_SECRET environment variable is not set');
}

// Interface for Twitch API access token response
interface TwitchAuthResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

// Interface for Twitch game data
export interface TwitchGame {
  id: string;
  name: string;
  box_art_url: string;
  igdb_id?: string;
}

// Interface for Twitch stream data
export interface TwitchStream {
  id: string;
  user_id: string;
  user_login: string;
  user_name: string;
  game_id: string;
  game_name: string;
  title: string;
  viewer_count: number;
  started_at: string;
  thumbnail_url: string | null;
  is_mature: boolean;
}

// Resolve Twitch box art URL to a specific size, handling all URL formats:
// 1. Template {width}x{height} → e.g. "...Game-{width}x{height}.jpg"
// 2. Separate {width} / {height} tokens
// 3. Pre-baked numeric dimensions → e.g. "...Game-52x72.jpg" (some indie/older games)
function resolveBoxArtUrl(url: string | null | undefined, w = 600, h = 800): string {
  if (!url) return '';
  if (url.includes('{width}x{height}')) {
    return url.replace('{width}x{height}', `${w}x${h}`);
  }
  if (url.includes('{width}') && url.includes('{height}')) {
    return url.replace('{width}', String(w)).replace('{height}', String(h));
  }
  // Replace any existing hard-coded WxH numeric dimensions in the Twitch CDN path
  return url.replace(/-\d+x\d+(\.\w+)$/, `-${w}x${h}$1`);
}

// Twitch API service
class TwitchApiService {
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;
  private readonly clientId: string;
  private readonly clientSecret: string;
  
  constructor() {
    this.clientId = process.env.TWITCH_CLIENT_ID || '';
    this.clientSecret = process.env.TWITCH_CLIENT_SECRET || '';
  }
  
  /**
   * Check if Twitch API is properly configured
   */
  private isConfigured(): boolean {
    return !!this.clientId && !!this.clientSecret;
  }

  /**
   * Get an access token from the Twitch API
   */
  private async getAccessToken(): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('Twitch API credentials not configured');
    }

    // If we already have a valid token, return it
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      return this.accessToken;
    }
    
    // Otherwise, get a new token
    try {
      const response = await axios.post<TwitchAuthResponse>(
        'https://id.twitch.tv/oauth2/token',
        null,
        {
          params: {
            client_id: this.clientId,
            client_secret: this.clientSecret,
            grant_type: 'client_credentials'
          }
        }
      );
      
      this.accessToken = response.data.access_token;
      // Set expiry time (subtract 60 seconds for safety)
      this.tokenExpiresAt = Date.now() + (response.data.expires_in - 60) * 1000;
      
      return this.accessToken;
    } catch (error) {
      console.error('Error getting Twitch access token:', error);
      throw new Error('Failed to authenticate with Twitch API');
    }
  }
  
  /**
   * Get top games from Twitch API
   */
  async getTopGames(limit: number = 20, offset: number = 0): Promise<TwitchGame[]> {
    if (!this.isConfigured()) {
      throw new Error('Twitch API credentials not configured');
    }
    
    try {
      const token = await this.getAccessToken();
      
      // Fetch a large number of games to support pagination
      const response = await axios.get('https://api.twitch.tv/helix/games/top', {
        headers: {
          'Client-ID': this.clientId,
          'Authorization': `Bearer ${token}`
        },
        params: {
          first: 100 // Maximum allowed by Twitch API
        }
      });
      
      // Filter out non-gaming categories
      const excludedCategories = [
        'Just Chatting',
        'Music',
        'Art',
        'Talk Shows & Podcasts',
        'ASMR',
        'Pools, Hot Tubs, and Beaches',
        'Sports',
        'Travel & Outdoors',
        'Science & Technology',
        'Food & Drink',
        'Beauty & Body Art',
        'Special Events',
        'IRL',
        'Makers & Crafting',
        'Politics',
        'Animals, Aquariums, and Zoos'
      ];

      const allGames = response.data.data.filter((game: any) => 
        !excludedCategories.includes(game.name)
      );

      // Apply offset and limit for pagination
      const paginatedGames = allGames.slice(offset, offset + limit);

      // Return the paginated games with properly formatted URLs
      return paginatedGames.map((game: any) => ({
        id: game.id,
        name: game.name,
        box_art_url: resolveBoxArtUrl(game.box_art_url),
        igdb_id: game.igdb_id
      }));
    } catch (error) {
      console.error('Error fetching top games from Twitch:', error);
      throw new Error('Failed to fetch top games from Twitch API');
    }
  }
  
  /**
   * Search for games on Twitch using the search API
   * This uses a different endpoint that allows for partial name matching
   */
  async searchGames(query: string, limit: number = 20): Promise<TwitchGame[]> {
    if (!this.isConfigured()) {
      throw new Error('Twitch API credentials not configured');
    }
    
    try {
      const token = await this.getAccessToken();
      
      // Use the search API which supports partial matches
      const response = await axios.get('https://api.twitch.tv/helix/search/categories', {
        headers: {
          'Client-ID': this.clientId,
          'Authorization': `Bearer ${token}`
        },
        params: {
          query: query,
          first: limit
        }
      });
      
      return response.data.data.map((game: any) => ({
        id: game.id,
        name: game.name,
        box_art_url: resolveBoxArtUrl(game.box_art_url),
        igdb_id: game.igdb_id || ''
      }));
    } catch (error) {
      console.error('Error searching games on Twitch:', error);
      throw new Error('Failed to search games on Twitch API');
    }
  }
  
  /**
   * Get game by ID
   */
  async getGameById(gameId: string): Promise<TwitchGame | null> {
    if (!this.isConfigured()) {
      throw new Error('Twitch API credentials not configured');
    }
    
    try {
      const token = await this.getAccessToken();
      
      const response = await axios.get('https://api.twitch.tv/helix/games', {
        headers: {
          'Client-ID': this.clientId,
          'Authorization': `Bearer ${token}`
        },
        params: {
          id: gameId
        }
      });
      
      if (response.data.data.length === 0) {
        return null;
      }
      
      const game = response.data.data[0];
      return {
        id: game.id,
        name: game.name,
        box_art_url: resolveBoxArtUrl(game.box_art_url),
        igdb_id: game.igdb_id
      };
    } catch (error) {
      console.error('Error fetching game from Twitch:', error);
      throw new Error('Failed to fetch game from Twitch API');
    }
  }
  
  /**
   * Get game by name
   */
  async getGameByName(name: string): Promise<TwitchGame | null> {
    try {
      const token = await this.getAccessToken();
      
      const response = await axios.get('https://api.twitch.tv/helix/games', {
        headers: {
          'Client-ID': this.clientId,
          'Authorization': `Bearer ${token}`
        },
        params: {
          name: name
        }
      });
      
      if (response.data.data.length === 0) {
        return null;
      }
      
      const game = response.data.data[0];
      return {
        id: game.id,
        name: game.name,
        box_art_url: resolveBoxArtUrl(game.box_art_url),
        igdb_id: game.igdb_id
      };
    } catch (error) {
      console.error('Error fetching game from Twitch:', error);
      throw new Error('Failed to fetch game from Twitch API');
    }
  }

  /**
   * Get top live streams from Twitch
   */
  async getTopStreams(limit: number = 12): Promise<TwitchStream[]> {
    if (!this.isConfigured()) {
      throw new Error('Twitch API credentials not configured');
    }
    try {
      const token = await this.getAccessToken();
      const response = await axios.get('https://api.twitch.tv/helix/streams', {
        headers: {
          'Client-ID': this.clientId,
          'Authorization': `Bearer ${token}`
        },
        params: { first: limit, language: 'en' }
      });
      return (response.data.data || []).map((stream: any) => ({
        id: stream.id,
        user_id: stream.user_id,
        user_login: stream.user_login,
        user_name: stream.user_name,
        game_id: stream.game_id,
        game_name: stream.game_name,
        title: stream.title,
        viewer_count: stream.viewer_count,
        started_at: stream.started_at,
        thumbnail_url: stream.thumbnail_url
          ? stream.thumbnail_url.replace('{width}', '440').replace('{height}', '248')
          : null,
        is_mature: stream.is_mature,
      }));
    } catch (error) {
      console.error('Error fetching top streams from Twitch:', error);
      throw new Error('Failed to fetch top streams from Twitch API');
    }
  }

  /**
   * Look up a channel's current live stream by its login name (e.g. "gamefolio").
   * Returns the stream object if the channel is live, or null if offline /
   * the API isn't configured. Unlike checkUserLive (which needs a user ID),
   * this resolves directly from the channel login in a single call.
   */
  async getStreamByLogin(login: string): Promise<TwitchStream | null> {
    if (!this.isConfigured() || !login) return null;
    try {
      const token = await this.getAccessToken();
      const response = await axios.get('https://api.twitch.tv/helix/streams', {
        headers: {
          'Client-ID': this.clientId,
          'Authorization': `Bearer ${token}`
        },
        params: { user_login: login }
      });
      const stream = response.data?.data?.[0];
      if (!stream) return null;
      return {
        id: stream.id,
        user_id: stream.user_id,
        user_login: stream.user_login,
        user_name: stream.user_name,
        game_id: stream.game_id,
        game_name: stream.game_name,
        title: stream.title,
        viewer_count: stream.viewer_count,
        started_at: stream.started_at,
        thumbnail_url: stream.thumbnail_url
          ? stream.thumbnail_url.replace('{width}', '440').replace('{height}', '248')
          : null,
        is_mature: stream.is_mature,
      };
    } catch (error) {
      console.error('Error fetching Twitch stream by login:', error);
      return null;
    }
  }

  /**
   * Check if a user is currently live streaming
   */
  async checkUserLive(userId: string): Promise<boolean> {
    if (!this.isConfigured()) return false;
    try {
      const token = await this.getAccessToken();
      const response = await axios.get('https://api.twitch.tv/helix/streams', {
        headers: {
          'Client-ID': this.clientId,
          'Authorization': `Bearer ${token}`
        },
        params: { user_id: userId }
      });
      return Array.isArray(response.data.data) && response.data.data.length > 0;
    } catch (error) {
      console.error('Error checking Twitch live status:', error);
      return false;
    }
  }
}

// Create and export a singleton instance
export const twitchApi = new TwitchApiService();