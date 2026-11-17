import { Router } from 'express';
import { z } from 'zod';
import { captureRouteError } from '../sentry';
import { hasBearerToken } from '../services/service-token';
import {
  creatorAnalyticsCatalog,
  isCreatorAnalyticsMetric,
  loadCreatorRanking,
  type AnalyticsPeriod,
} from '../creator-analytics';

const router = Router();
const querySchema = z.object({
  metric: z.string().min(1),
  period: z.enum(['all', 'today', 'week', 'month', 'season']).default('all'),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

router.use((req, res, next) => {
  res.setHeader('Cache-Control', 'private, no-store');
  if (!process.env.CREATOR_ANALYTICS_TOKEN) return res.status(503).json({ error: 'Creator analytics is not configured' });
  if (!hasBearerToken(req.get('authorization'), process.env.CREATOR_ANALYTICS_TOKEN)) return res.status(401).json({ error: 'Unauthorized' });
  next();
});

router.get('/metrics', (_req, res) => res.json({ metrics: creatorAnalyticsCatalog() }));

router.get('/rankings', async (req, res) => {
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success || !isCreatorAnalyticsMetric(parsed.data?.metric || '')) {
    return res.status(400).json({ error: 'Select a supported metric, period and limit.', metrics: creatorAnalyticsCatalog() });
  }
  const { metric, period, limit } = parsed.data as { metric: Parameters<typeof loadCreatorRanking>[0]; period: AnalyticsPeriod; limit: number };
  const availability = creatorAnalyticsCatalog().find(item => item.metric === metric)!;
  if (!availability.available) return res.status(409).json({ error: availability.reason, metric });
  try {
    const rows = await loadCreatorRanking(metric, period, limit);
    return res.json({ metric, period, limit, timezone: 'Europe/London', generatedAt: new Date().toISOString(), rows });
  } catch (error) {
    captureRouteError(error, { context: 'creator-analytics-ranking', metric });
    return res.status(500).json({ error: 'Unable to load creator analytics ranking' });
  }
});

export default router;
