import express from 'express';
import { eq, and, desc } from 'drizzle-orm';
import { db } from '../db';
import { aiClipJobs, aiClipCandidates } from '@shared/schema';
import { storage } from '../storage';
import { hybridFullAccess } from '../middleware/hybrid-auth';
import { twitchApi } from '../services/twitch-api';
import { createJob, retryJob, publishCandidate, discardCandidate, getVodClipLimits, getAiClipDailyUsage, AiVodClipError } from '../services/ai-vod-clip-jobs';

const router = express.Router();

function handleError(res: express.Response, error: unknown) {
  if (error instanceof AiVodClipError) {
    return res.status(error.status).json({ error: error.message });
  }
  console.error('AI VOD clips route error:', error);
  return res.status(500).json({ error: 'Something went wrong' });
}

// Public: whether the feature is currently accepting new generation jobs
// (admin-controlled — see AdminPage "AI Clips" tab). No auth so entry-point
// UI (Settings, Upload) can check this before even showing the button.
router.get('/status', async (req, res) => {
  try {
    const settings = await storage.getAiClipSettings();
    res.json({
      enabled: settings?.isEnabled ?? true,
      disabledMessage: settings?.disabledMessage || null,
    });
  } catch (error) {
    handleError(res, error);
  }
});

// List the connected Twitch account's past broadcasts, flagged for eligibility.
router.get('/vods', hybridFullAccess, async (req, res) => {
  try {
    const user = await storage.getUser(req.user!.id);
    if (!user?.twitchVerified || !user.twitchUserId) {
      return res.status(403).json({ error: 'Twitch account not connected' });
    }

    const limits = getVodClipLimits(user);
    const dailyUsed = await getAiClipDailyUsage(req.user!.id);

    const vods = await twitchApi.getUserVods(user.twitchUserId, 20);
    res.json({
      vods: vods.map((v) => ({ ...v, eligible: v.durationSeconds <= limits.maxVodDurationSeconds })),
      maxDurationSeconds: limits.maxVodDurationSeconds,
      isPro: limits.isPro,
      dailyJobLimit: limits.dailyJobLimit,
      dailyJobsUsed: dailyUsed,
    });
  } catch (error) {
    handleError(res, error);
  }
});

router.post('/jobs', hybridFullAccess, async (req, res) => {
  try {
    const settings = await storage.getAiClipSettings();
    if (settings && !settings.isEnabled) {
      return res.status(503).json({ error: settings.disabledMessage || 'AI clip generation is temporarily unavailable' });
    }

    const { vodId } = req.body;
    if (!vodId || typeof vodId !== 'string') {
      return res.status(400).json({ error: 'vodId is required' });
    }
    const job = await createJob(req.user!.id, vodId);
    res.status(202).json({ job });
  } catch (error) {
    handleError(res, error);
  }
});

router.get('/jobs', hybridFullAccess, async (req, res) => {
  try {
    const jobs = await db.select().from(aiClipJobs)
      .where(eq(aiClipJobs.userId, req.user!.id))
      .orderBy(desc(aiClipJobs.createdAt));
    res.json({ jobs });
  } catch (error) {
    handleError(res, error);
  }
});

router.get('/jobs/:jobId', hybridFullAccess, async (req, res) => {
  try {
    const jobId = parseInt(req.params.jobId, 10);
    const [job] = await db.select().from(aiClipJobs)
      .where(and(eq(aiClipJobs.id, jobId), eq(aiClipJobs.userId, req.user!.id)));
    if (!job) return res.status(404).json({ error: 'Job not found' });

    const candidates = await db.select().from(aiClipCandidates)
      .where(eq(aiClipCandidates.jobId, jobId))
      .orderBy(aiClipCandidates.rank);

    res.json({ job, candidates });
  } catch (error) {
    handleError(res, error);
  }
});

router.post('/jobs/:jobId/retry', hybridFullAccess, async (req, res) => {
  try {
    const jobId = parseInt(req.params.jobId, 10);
    const job = await retryJob(req.user!.id, jobId);
    res.json({ job });
  } catch (error) {
    handleError(res, error);
  }
});

router.post('/candidates/:candidateId/publish', hybridFullAccess, async (req, res) => {
  try {
    const candidateId = parseInt(req.params.candidateId, 10);
    const { title, description, gameId, tags, ageRestricted } = req.body || {};
    const result = await publishCandidate(req.user!.id, candidateId, { title, description, gameId, tags, ageRestricted });
    res.json(result);
  } catch (error) {
    handleError(res, error);
  }
});

router.post('/candidates/:candidateId/discard', hybridFullAccess, async (req, res) => {
  try {
    const candidateId = parseInt(req.params.candidateId, 10);
    await discardCandidate(req.user!.id, candidateId);
    res.json({ success: true });
  } catch (error) {
    handleError(res, error);
  }
});

export default router;
