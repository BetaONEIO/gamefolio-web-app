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

// Interface for a past broadcast (Helix Get Videos, type=archive), used by
// the AI VOD-clip picker.
export interface TwitchVod {
  id: string;
  title: string;
  url: string;
  thumbnailUrl: string;
  durationSeconds: number;
  createdAt: string;
  viewCount: number;
}

// Twitch's public web client-id. Helix exposes no official VOD-download
// endpoint, so the actual media is fetched via Twitch's GraphQL API, which
// mints a short-lived signed playback token for a video id (see
// getVodDownloadUrl). This is the same anonymous client-id the Twitch web
// player uses, and the same one the (parked) clip-import feature uses for
// clip MP4s — VODs use a distinct GQL field and Usher param names.
const TWITCH_GQL_CLIENT_ID = 'kimne78kx3ncx6brgo4mv6wki5h1ko';

// Twitch VOD ids are numeric; validated before being interpolated into the
// GraphQL query as a defensive measure.
const VOD_ID_RE = /^\d+$/;

// Parses Helix's ISO-8601 duration-ish string ("1h2m3s") into seconds.
function parseTwitchDuration(duration: string): number {
  const match = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(duration || '');
  if (!match) return 0;
  const [, h, m, s] = match;
  return (parseInt(h || '0', 10) * 3600) + (parseInt(m || '0', 10) * 60) + parseInt(s || '0', 10);
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

// Log Twitch/axios failures with the response status + body so the real
// cause (401 bad token, 429 rate limit, 5xx upstream) shows up in the server
// logs instead of an opaque "[object Object]".
function logTwitchError(context: string, error: unknown): void {
  if (axios.isAxiosError(error)) {
    console.error(
      `${context}: ${error.response?.status ?? 'no-status'} ${error.code ?? ''}`,
      JSON.stringify(error.response?.data ?? error.message)
    );
  } else {
    console.error(`${context}:`, error);
  }
}

// Twitch API service
class TwitchApiService {
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;
  private readonly clientId: string;
  private readonly clientSecret: string;

  // Cache the full filtered top-games list so we can (a) paginate without
  // re-hitting Twitch and (b) serve stale data if Twitch briefly fails,
  // rather than surfacing a 500 to the app. Twitch rate-limits the
  // client-credentials app token, so caching also reduces failure pressure.
  private topGamesCache: { games: TwitchGame[]; fetchedAt: number } | null = null;
  private readonly TOP_GAMES_TTL_MS = 5 * 60 * 1000;
  
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
      logTwitchError('Error getting Twitch access token', error);
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

    // Serve fresh cache without touching Twitch.
    if (this.topGamesCache && Date.now() - this.topGamesCache.fetchedAt < this.TOP_GAMES_TTL_MS) {
      return this.topGamesCache.games.slice(offset, offset + limit);
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

      // Map the full filtered list once, then cache it so pagination and
      // subsequent requests don't re-hit Twitch.
      const mapped: TwitchGame[] = allGames.map((game: any) => ({
        id: game.id,
        name: game.name,
        box_art_url: resolveBoxArtUrl(game.box_art_url),
        igdb_id: game.igdb_id
      }));
      this.topGamesCache = { games: mapped, fetchedAt: Date.now() };

      // Apply offset and limit for pagination
      return mapped.slice(offset, offset + limit);
    } catch (error) {
      logTwitchError('Error fetching top games from Twitch', error);
      // Graceful degradation: if Twitch is flaky but we fetched successfully
      // before, serve the stale list instead of 500ing the app.
      if (this.topGamesCache) {
        console.warn('Serving stale Twitch top-games cache after fetch failure');
        return this.topGamesCache.games.slice(offset, offset + limit);
      }
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

  /**
   * List a broadcaster's past broadcasts ("archive" VODs — as opposed to
   * highlights/uploads), most recent first. Uses the app access token; VOD
   * metadata for a public channel needs no user OAuth scope.
   */
  async getUserVods(twitchUserId: string, limit: number = 20): Promise<TwitchVod[]> {
    if (!this.isConfigured()) {
      throw new Error('Twitch API credentials not configured');
    }
    if (!twitchUserId) return [];

    try {
      const token = await this.getAccessToken();
      const response = await axios.get('https://api.twitch.tv/helix/videos', {
        headers: {
          'Client-ID': this.clientId,
          'Authorization': `Bearer ${token}`,
        },
        params: {
          user_id: twitchUserId,
          type: 'archive',
          first: Math.min(Math.max(limit, 1), 100),
        },
      });
      return (response.data.data || []).map((v: any): TwitchVod => ({
        id: v.id,
        title: v.title || 'Untitled stream',
        url: v.url,
        thumbnailUrl: (v.thumbnail_url || '').replace('%{width}', '440').replace('%{height}', '248'),
        durationSeconds: parseTwitchDuration(v.duration),
        createdAt: v.created_at,
        viewCount: v.view_count || 0,
      }));
    } catch (error) {
      logTwitchError('Error fetching Twitch VODs', error);
      throw new Error('Failed to fetch VODs from Twitch API');
    }
  }

  /**
   * Re-resolve a single VOD by id server-side (used to re-validate duration
   * against fresh Helix data at job-creation time, rather than trusting a
   * client-supplied duration).
   */
  async getVodById(vodId: string): Promise<TwitchVod | null> {
    if (!this.isConfigured() || !vodId) return null;
    try {
      const token = await this.getAccessToken();
      const response = await axios.get('https://api.twitch.tv/helix/videos', {
        headers: {
          'Client-ID': this.clientId,
          'Authorization': `Bearer ${token}`,
        },
        params: { id: vodId },
      });
      const v = (response.data.data || [])[0];
      if (!v) return null;
      return {
        id: v.id,
        title: v.title || 'Untitled stream',
        url: v.url,
        thumbnailUrl: (v.thumbnail_url || '').replace('%{width}', '440').replace('%{height}', '248'),
        durationSeconds: parseTwitchDuration(v.duration),
        createdAt: v.created_at,
        viewCount: v.view_count || 0,
      };
    } catch (error) {
      logTwitchError('Error fetching Twitch VOD by id', error);
      return null;
    }
  }

  /**
   * Resolve a VOD's directly-playable HLS (m3u8) URL via Twitch's GraphQL
   * API, the same anonymous-GQL approach the clip importer uses for clip
   * MP4s, but with the VOD-specific field/params: `videoPlaybackAccessToken`
   * (vs. `clip.playbackAccessToken`) and Usher's `nauth`/`nauthsig` query
   * params (vs. clips' `token`/`sig`). Twitch VODs are HLS, not a single
   * MP4, so the caller (ffmpeg) consumes this master playlist URL directly
   * rather than fetching one file. Returns null if the VOD can't be
   * resolved. The URL is short-lived — fetch it promptly, server-side.
   */
  async getVodDownloadUrl(vodId: string): Promise<string | null> {
    if (!vodId || !VOD_ID_RE.test(vodId)) return null;
    try {
      const query = `{
  videoPlaybackAccessToken(id: "${vodId}", params: {platform: "web", playerBackend: "mediaplayer", playerType: "site"}) {
    signature
    value
  }
}`;
      const resp = await axios.post(
        'https://gql.twitch.tv/gql',
        { query },
        { headers: { 'Client-ID': TWITCH_GQL_CLIENT_ID, 'Content-Type': 'application/json' }, timeout: 10000 },
      );
      const token = resp.data?.data?.videoPlaybackAccessToken;
      if (!token?.signature || !token?.value) return null;
      const params = new URLSearchParams({
        nauth: token.value,
        nauthsig: token.signature,
        allow_source: 'true',
        allow_audio_only: 'true',
        player: 'twitchweb',
      });
      return `https://usher.ttvnw.net/vod/${vodId}.m3u8?${params.toString()}`;
    } catch (err: any) {
      logTwitchError('Twitch GQL VOD playback lookup failed', err);
      return null;
    }
  }
}

// Create and export a singleton instance
export const twitchApi = new TwitchApiService();