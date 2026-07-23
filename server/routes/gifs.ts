import { Router, Request, Response } from 'express';
import { hybridAuth } from '../middleware/hybrid-auth';

const router = Router();

const GIPHY_BASE = 'https://api.giphy.com/v1/gifs';

interface GifResult {
  id: string;
  url: string;
  previewUrl: string;
  width: number;
  height: number;
}

interface GiphyApiResponse {
  data?: Array<{
    id: string;
    images?: {
      original?: { url: string; width: string; height: string };
      fixed_width?: { url: string; width: string; height: string };
    };
  }>;
  pagination?: { total_count: number; count: number; offset: number };
}

function mapGiphyResults(data: GiphyApiResponse): { results: GifResult[]; next: string | null } {
  const results: GifResult[] = (data.data || [])
    .filter(r => r.images?.original?.url)
    .map(r => ({
      id: r.id,
      url: r.images!.original!.url,
      previewUrl: r.images?.fixed_width?.url || r.images!.original!.url,
      width: Number(r.images!.original!.width) || 0,
      height: Number(r.images!.original!.height) || 0,
    }));

  const pagination = data.pagination;
  const nextOffset = pagination && pagination.offset + pagination.count < pagination.total_count
    ? String(pagination.offset + pagination.count)
    : null;

  return { results, next: nextOffset };
}

async function proxyGiphy(endpoint: 'search' | 'trending', params: Record<string, string>, res: Response) {
  const apiKey = process.env.GIPHY_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ message: 'GIF search is not configured' });
  }

  try {
    const searchParams = new URLSearchParams({
      api_key: apiKey,
      limit: '24',
      rating: 'pg-13',
      lang: 'en',
      ...params,
    });

    const giphyRes = await fetch(`${GIPHY_BASE}/${endpoint}?${searchParams.toString()}`);
    if (!giphyRes.ok) {
      console.error(`GIPHY ${endpoint} error: ${giphyRes.status}`);
      return res.status(502).json({ message: 'Failed to fetch GIFs' });
    }

    const data: GiphyApiResponse = await giphyRes.json();
    res.json(mapGiphyResults(data));
  } catch (error) {
    console.error(`Error proxying GIPHY ${endpoint}:`, error);
    res.status(502).json({ message: 'Failed to fetch GIFs' });
  }
}

router.get('/api/gifs/trending', hybridAuth, async (req: Request, res: Response) => {
  const offset = typeof req.query.pos === 'string' ? req.query.pos : undefined;
  await proxyGiphy('trending', offset ? { offset } : {}, res);
});

router.get('/api/gifs/search', hybridAuth, async (req: Request, res: Response) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (!q) {
    return res.status(400).json({ message: 'Query parameter "q" is required' });
  }
  const offset = typeof req.query.pos === 'string' ? req.query.pos : undefined;
  await proxyGiphy('search', { q, ...(offset ? { offset } : {}) }, res);
});

export const gifsRouter = router;
