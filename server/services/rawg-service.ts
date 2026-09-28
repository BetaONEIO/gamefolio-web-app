import axios from 'axios';
import { Game } from '@shared/schema';
import { db } from '../db';
import { games } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';

// RAWG API types
interface RAWGGame {
  id: number;
  name: string;
  background_image: string;
  released?: string | null;
  platforms?: Array<{
    platform?: {
      name?: string | null;
    } | null;
  } | null> | null;
  metacritic?: number;
}

export type RAWGCatalogGame = Pick<Game, 'id' | 'name' | 'imageUrl' | 'createdAt'> & {
  released?: string | null;
  platforms?: string[];
};

interface RAWGResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: RAWGGame[];
}

function getPlatformNames(rawgGame: RAWGGame): string[] | undefined {
  if (!Array.isArray(rawgGame.platforms)) {
    return undefined;
  }

  return rawgGame.platforms.flatMap((entry) =>
    typeof entry?.platform?.name === 'string' ? [entry.platform.name] : []
  );
}

function mapRAWGGame(rawgGame: RAWGGame, id: number): RAWGCatalogGame {
  const platforms = getPlatformNames(rawgGame);
  return {
    id,
    name: rawgGame.name,
    imageUrl: rawgGame.background_image || null,
    createdAt: new Date(),
    ...(rawgGame.released !== undefined ? { released: rawgGame.released } : {}),
    ...(platforms !== undefined ? { platforms } : {}),
  };
}

export class RAWGService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.RAWG_API_KEY || '';
    this.baseUrl = 'https://api.rawg.io/api';
    
    if (!this.apiKey) {
      console.warn('RAWG_API_KEY not found! Game search functionality will be limited.');
    }
  }

  async searchGames(query: string): Promise<RAWGCatalogGame[]> {
    if (!query || query.length < 2) {
      return [];
    }

    try {
      // First, try to find partial matches in our local database
      const localGames = await db.select()
        .from(games)
        .where(
          // Use SQL LIKE for partial matches with Drizzle's syntax
          sql`${games.name} LIKE ${`%${query}%`}`
        )
        .limit(10);

      // Always ask the provider so existing local matches can include current
      // release/platform metadata. Local results remain available on failure.
      console.log(`Searching RAWG API for: "${query}"`);
      const response = await axios.get<RAWGResponse>(`${this.baseUrl}/games`, {
        params: {
          key: this.apiKey,
          search: query,
          page_size: 10,
          search_exact: false,
        }
      });

      const rawgGames = response.data.results;
      const mappedGames: RAWGCatalogGame[] = [];
      
      // Add any local games we already found
      mappedGames.push(...localGames);
      
      // Track local matches by name so provider data enriches them without
      // returning duplicate games.
      const gameIndexes = new Map(mappedGames.map((game, index) => [game.name.toLowerCase(), index]));

      for (const rawgGame of rawgGames) {
        const nameKey = rawgGame.name.toLowerCase();
        const existingIndex = gameIndexes.get(nameKey);
        if (existingIndex !== undefined) {
          const existing = mappedGames[existingIndex];
          mappedGames[existingIndex] = {
            ...existing,
            ...(rawgGame.released !== undefined ? { released: rawgGame.released } : {}),
            ...(getPlatformNames(rawgGame) !== undefined ? { platforms: getPlatformNames(rawgGame) } : {}),
          };
          continue;
        }
        
        mappedGames.push(mapRAWGGame(rawgGame, Math.abs(rawgGame.id % 10000)));
        gameIndexes.set(nameKey, mappedGames.length - 1);
      }

      return mappedGames;
    } catch (error) {
      console.error(
        `RAWG game search failed${axios.isAxiosError(error) ? ` (HTTP ${error.response?.status ?? 'unknown'})` : ''}`
      );
      
      // Return any local games we can find as fallback
      return db.select()
        .from(games)
        .where(
          sql`${games.name} LIKE ${`%${query}%`}`
        )
        .limit(10);
    }
  }

  async getGameDetails(gameId: number): Promise<Game | null> {
    try {
      // First check if we have this game in our database
      const [existingGame] = await db.select().from(games).where(eq(games.id, gameId));
      if (existingGame) {
        return existingGame;
      }

      return null;
    } catch (error) {
      console.error('Error getting game details:', error);
      return null;
    }
  }
  
  async getTrendingGames(limit: number = 10): Promise<RAWGCatalogGame[]> {
    try {
      console.log('Fetching trending games from RAWG API...');
      
      // Directly fetch from RAWG API regardless of database content
      const response = await axios.get<RAWGResponse>(`${this.baseUrl}/games`, {
        params: {
          key: this.apiKey,
          ordering: '-rating', // Order by highest rated
          page_size: limit,
          dates: '2022-01-01,2025-12-31' // Recent games
        }
      });

      console.log(`RAWG API returned ${response.data.results.length} games`);
      
      const rawgGames = response.data.results;
      
      // Map the RAWG games to our Game type
      // The id field won't match our database, but that's OK for this temporary view
      const mappedGames = rawgGames.map(rawgGame =>
        mapRAWGGame(rawgGame, Math.abs(rawgGame.id % 1000))
      );
      
      console.log('First game image URL:', mappedGames[0]?.imageUrl);
      
      return mappedGames;
    } catch (error) {
      console.error(
        `RAWG popular games request failed${axios.isAxiosError(error) ? ` (HTTP ${error.response?.status ?? 'unknown'})` : ''}`
      );
      
      // Return whatever games we have in the database as fallback
      return db.select().from(games).limit(limit);
    }
  }
}

// Create singleton instance
export const rawgService = new RAWGService();