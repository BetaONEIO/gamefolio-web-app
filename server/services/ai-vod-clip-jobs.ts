import path from 'path';
import fs from 'fs/promises';
import { nanoid } from 'nanoid';
import { eq, and, asc, lt } from 'drizzle-orm';
import { db } from '../db';
import { aiClipJobs, aiClipCandidates, insertClipSchema, type AiClipJob } from '@shared/schema';
import { storage } from '../storage';
import { supabaseStorage } from '../supabase-storage';
import { VideoProcessor } from '../video-processor';
import { twitchApi } from './twitch-api';
import { transcribeAudioFile } from './whisper-transcription';
import { detectHighlights } from './ai-highlight-detector';
import { LeaderboardService, POINT_VALUES } from '../leaderboard-service';

const MAX_VOD_DURATION_SECONDS = parseInt(process.env.AI_VOD_MAX_VOD_DURATION_SECONDS || '2700', 10); // 45 min
const CANDIDATE_TTL_DAYS = parseInt(process.env.AI_VOD_CANDIDATE_TTL_DAYS || '7', 10);
const TEMP_DIR = path.join(process.cwd(), 'temp', 'ai-vod-clips');

async function ensureTempDir(): Promise<void> {
  await fs.mkdir(TEMP_DIR, { recursive: true });
}

export class AiVodClipError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// Thrown internally when a cancellation is detected mid-run, so the catch
// block in processNextQueuedJob can tell "admin cancelled this" apart from
// a real failure and skip overwriting the status/reason that cancelJob()
// already set.
class JobCancelledError extends Error {}

async function checkCancelled(jobId: number): Promise<void> {
  const [job] = await db.select({ status: aiClipJobs.status }).from(aiClipJobs).where(eq(aiClipJobs.id, jobId));
  if (job?.status === 'cancelled') throw new JobCancelledError();
}

// Supabase Storage uploads occasionally hit transient network errors
// (dropped connections, EPIPE, etc.) — retrying a couple times with backoff
// turns those into a non-event instead of failing the whole multi-minute
// job over one flaky request.
async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < attempts - 1) {
        const delayMs = 500 * Math.pow(3, i); // 500ms, 1.5s
        console.warn(`ai-vod-clip-jobs: attempt ${i + 1}/${attempts} failed, retrying in ${delayMs}ms:`, error instanceof Error ? error.message : error);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
  throw lastError;
}

/**
 * Create a new job. Re-validates VOD duration against fresh Helix metadata
 * (not a client-supplied value) so the hard cap can't be bypassed.
 */
export async function createJob(userId: number, twitchVodId: string): Promise<AiClipJob> {
  const user = await storage.getUser(userId);
  if (!user?.twitchVerified || !user.twitchUserId) {
    throw new AiVodClipError(403, 'Twitch account not connected');
  }

  const vod = await twitchApi.getVodById(twitchVodId);
  if (!vod) {
    throw new AiVodClipError(404, 'VOD not found');
  }
  if (vod.durationSeconds > MAX_VOD_DURATION_SECONDS) {
    throw new AiVodClipError(422, `VOD is ${Math.round(vod.durationSeconds / 60)} min — the AI clip generator supports VODs up to ${Math.round(MAX_VOD_DURATION_SECONDS / 60)} min`);
  }

  const [job] = await db.insert(aiClipJobs).values({
    userId,
    twitchVodId: vod.id,
    vodTitle: vod.title,
    vodDurationSeconds: vod.durationSeconds,
    vodThumbnailUrl: vod.thumbnailUrl,
  }).returning();

  return job;
}

export async function retryJob(userId: number, jobId: number): Promise<AiClipJob> {
  const [job] = await db.select().from(aiClipJobs).where(and(eq(aiClipJobs.id, jobId), eq(aiClipJobs.userId, userId)));
  if (!job) throw new AiVodClipError(404, 'Job not found');
  if (job.status !== 'failed' && job.status !== 'cancelled') throw new AiVodClipError(409, 'Only failed or cancelled jobs can be retried');

  const [updated] = await db.update(aiClipJobs)
    .set({ status: 'queued', errorReason: null, stageProgress: 0, updatedAt: new Date() })
    .where(eq(aiClipJobs.id, jobId))
    .returning();
  return updated;
}

/**
 * Admin action: cancel a single job. Queued jobs stop cleanly (never
 * picked up). Jobs already in progress are flagged cancelled and will stop
 * at the next checkCancelled() checkpoint in runJob() — typically within
 * one ffmpeg/Whisper/Claude call of the request, not instantly, since
 * there's no cancellation token wired into those calls themselves.
 */
export async function cancelJob(jobId: number): Promise<AiClipJob> {
  const [job] = await db.select().from(aiClipJobs).where(eq(aiClipJobs.id, jobId));
  if (!job) throw new AiVodClipError(404, 'Job not found');
  if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
    throw new AiVodClipError(409, 'Job is not active');
  }

  const [updated] = await db.update(aiClipJobs)
    .set({ status: 'cancelled', errorReason: 'Cancelled by admin', updatedAt: new Date() })
    .where(eq(aiClipJobs.id, jobId))
    .returning();
  return updated;
}

/**
 * Admin action: clear the backlog. Only touches queued jobs (never
 * started, so no cleanup/race concerns) — use cancelJob() for anything
 * already in progress.
 */
export async function cancelAllQueued(): Promise<{ cancelled: number }> {
  const cancelled = await db.update(aiClipJobs)
    .set({ status: 'cancelled', errorReason: 'Cancelled by admin (queue cleared)', updatedAt: new Date() })
    .where(eq(aiClipJobs.status, 'queued'))
    .returning({ id: aiClipJobs.id });
  return { cancelled: cancelled.length };
}

async function setJobStage(jobId: number, status: string, stageProgress = 0): Promise<void> {
  await db.update(aiClipJobs).set({ status, stageProgress, updatedAt: new Date() }).where(eq(aiClipJobs.id, jobId));
}

async function failJob(jobId: number, error: unknown): Promise<void> {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`AI VOD clip job ${jobId} failed:`, error);
  await db.update(aiClipJobs)
    .set({ status: 'failed', errorReason: message.slice(0, 500), updatedAt: new Date() })
    .where(eq(aiClipJobs.id, jobId));
  // A failed run may have already cut/uploaded some candidates before
  // hitting the error. Clean those up so a retry starts clean instead of
  // accumulating duplicate/orphaned candidates alongside the new attempt.
  await cleanupCandidatesForJob(jobId);
}

async function runJob(job: AiClipJob): Promise<void> {
  await ensureTempDir();
  const vodPath = path.join(TEMP_DIR, `vod-${job.id}.mp4`);
  const audioPath = path.join(TEMP_DIR, `vod-${job.id}.wav`);

  try {
    // 1. Download
    await checkCancelled(job.id);
    await setJobStage(job.id, 'downloading');
    const hlsUrl = await twitchApi.getVodDownloadUrl(job.twitchVodId);
    if (!hlsUrl) throw new Error('Could not resolve VOD playback URL — it may be sub-only, deleted, or region-locked');
    await VideoProcessor.downloadHlsToFile(hlsUrl, vodPath);

    // 2. Transcribe
    await checkCancelled(job.id);
    await setJobStage(job.id, 'transcribing');
    await VideoProcessor.extractAudioTrack(vodPath, audioPath);
    const segments = await transcribeAudioFile(audioPath);
    await fs.unlink(audioPath).catch(() => {});

    // 3. Analyze
    await checkCancelled(job.id);
    await setJobStage(job.id, 'analyzing');
    const highlights = await detectHighlights(segments);
    if (highlights.length === 0) {
      throw new Error('No highlight-worthy moments found in this VOD');
    }

    // 4. Cut + stage each candidate
    await checkCancelled(job.id);
    await setJobStage(job.id, 'cutting');
    let rank = 0;
    for (const highlight of highlights) {
      await checkCancelled(job.id);
      const candidateVideoPath = path.join(TEMP_DIR, `candidate-${job.id}-${rank}.mp4`);
      const candidateThumbPath = path.join(TEMP_DIR, `candidate-${job.id}-${rank}-thumb.jpg`);

      await VideoProcessor.trimSegment(vodPath, candidateVideoPath, highlight.startTime, highlight.endTime);
      await VideoProcessor.captureThumbnailAt(candidateVideoPath, candidateThumbPath, 1);

      const videoBuffer = await fs.readFile(candidateVideoPath);
      const thumbBuffer = await fs.readFile(candidateThumbPath);

      const draftVideo = await withRetry(() => supabaseStorage.uploadBufferToFixedPath(
        videoBuffer,
        `users/${job.userId}/ai-clip-drafts/${job.id}/candidate-${rank}.mp4`,
        'video/mp4',
      ));
      const draftThumb = await withRetry(() => supabaseStorage.uploadBufferToFixedPath(
        thumbBuffer,
        `users/${job.userId}/ai-clip-drafts/${job.id}/candidate-${rank}-thumb.jpg`,
        'image/jpeg',
      ));

      await db.insert(aiClipCandidates).values({
        jobId: job.id,
        userId: job.userId,
        title: highlight.title,
        reasoning: highlight.reasoning,
        startTime: highlight.startTime,
        endTime: highlight.endTime,
        durationSeconds: highlight.endTime - highlight.startTime,
        rank,
        draftVideoPath: draftVideo.path,
        draftVideoUrl: draftVideo.url,
        draftThumbnailPath: draftThumb.path,
        draftThumbnailUrl: draftThumb.url,
        // Draft storage is temporary — unpublished candidates get swept up
        // and deleted by expireStaleCandidates() after this window.
        expiresAt: new Date(Date.now() + CANDIDATE_TTL_DAYS * 24 * 60 * 60 * 1000),
      });

      await fs.unlink(candidateVideoPath).catch(() => {});
      await fs.unlink(candidateThumbPath).catch(() => {});
      rank += 1;
    }

    await checkCancelled(job.id);
    await db.update(aiClipJobs)
      .set({ status: 'completed', stageProgress: 100, candidateCount: rank, completedAt: new Date(), updatedAt: new Date() })
      .where(eq(aiClipJobs.id, job.id));
  } finally {
    await fs.unlink(vodPath).catch(() => {});
    await fs.unlink(audioPath).catch(() => {});
  }
}

// Single-flight guard — this is a POC, so job processing is a single
// sequential in-process worker (no queue), matching the app's existing
// setInterval reconcile-loop pattern rather than adding new infra.
let isProcessing = false;

export async function processNextQueuedJob(): Promise<void> {
  if (isProcessing) return;
  isProcessing = true;
  try {
    const [job] = await db.select().from(aiClipJobs)
      .where(eq(aiClipJobs.status, 'queued'))
      .orderBy(asc(aiClipJobs.createdAt))
      .limit(1);
    if (!job) return;

    try {
      await runJob(job);
    } catch (error) {
      if (error instanceof JobCancelledError) {
        console.log(`AI VOD clip job ${job.id} was cancelled — cleaning up any partial candidates`);
        await cleanupCandidatesForJob(job.id);
      } else {
        await failJob(job.id, error);
      }
    }
  } finally {
    isProcessing = false;
  }
}

async function cleanupCandidatesForJob(jobId: number): Promise<void> {
  const partial = await db.select().from(aiClipCandidates)
    .where(and(eq(aiClipCandidates.jobId, jobId), eq(aiClipCandidates.status, 'pending')));
  for (const candidate of partial) {
    await supabaseStorage.deleteFile(candidate.draftVideoPath).catch(() => {});
    if (candidate.draftThumbnailPath) {
      await supabaseStorage.deleteFile(candidate.draftThumbnailPath).catch(() => {});
    }
    await db.update(aiClipCandidates).set({ status: 'discarded' }).where(eq(aiClipCandidates.id, candidate.id));
  }
}

export async function publishCandidate(
  userId: number,
  candidateId: number,
  overrides: { title?: string; description?: string; gameId?: number; tags?: string[]; ageRestricted?: boolean } = {},
) {
  const [candidate] = await db.select().from(aiClipCandidates)
    .where(and(eq(aiClipCandidates.id, candidateId), eq(aiClipCandidates.userId, userId)));
  if (!candidate) throw new AiVodClipError(404, 'Candidate not found');
  if (candidate.status !== 'pending') throw new AiVodClipError(409, 'Candidate already published or discarded');

  // The candidate is already cut to length — move (not re-upload/re-trim) the
  // staged draft into the canonical clip storage layout.
  const finalVideoPath = `users/${userId}/videos/${Date.now()}-${nanoid(8)}.mp4`;
  const finalThumbPath = `users/${userId}/thumbnails/${Date.now()}-${nanoid(8)}.jpg`;
  const movedVideo = await supabaseStorage.moveFile(candidate.draftVideoPath, finalVideoPath);
  let thumbnailUrl = candidate.draftThumbnailUrl || '';
  if (candidate.draftThumbnailPath) {
    const movedThumb = await supabaseStorage.moveFile(candidate.draftThumbnailPath, finalThumbPath).catch(() => null);
    if (movedThumb) thumbnailUrl = movedThumb.url;
  }

  const shareCode = nanoid(8);
  const clipData = insertClipSchema.parse({
    userId,
    title: overrides.title || candidate.title,
    description: overrides.description || candidate.reasoning || '',
    gameId: overrides.gameId,
    tags: overrides.tags || [],
    videoUrl: movedVideo.url,
    videoType: 'clip' as const,
    thumbnailUrl,
    duration: Math.round(candidate.durationSeconds),
    trimStart: 0,
    trimEnd: Math.round(candidate.durationSeconds),
    ageRestricted: overrides.ageRestricted || false,
    shareCode,
    source: 'ai_vod_highlight',
    aiJobId: candidate.jobId,
  });

  const clip = await storage.createClip(clipData);
  await LeaderboardService.awardPoints(userId, 'upload', `Upload: AI-generated clip - ${clip.title}`);
  const user = await storage.getUser(userId);

  const [updated] = await db.update(aiClipCandidates)
    .set({ status: 'published', publishedClipId: clip.id })
    .where(eq(aiClipCandidates.id, candidateId))
    .returning();

  return {
    candidate: updated,
    clip,
    shareUrl: `https://app.gamefolio.com/@${user?.username || 'unknown'}/clip/${clip.shareCode}`,
    xpGained: POINT_VALUES['upload'] ?? 200,
    userXP: user?.totalXP || 0,
    userLevel: user?.level || 1,
  };
}

export async function discardCandidate(userId: number, candidateId: number): Promise<void> {
  const [candidate] = await db.select().from(aiClipCandidates)
    .where(and(eq(aiClipCandidates.id, candidateId), eq(aiClipCandidates.userId, userId)));
  if (!candidate) throw new AiVodClipError(404, 'Candidate not found');
  if (candidate.status !== 'pending') throw new AiVodClipError(409, 'Candidate already published or discarded');

  await supabaseStorage.deleteFile(candidate.draftVideoPath).catch(() => {});
  if (candidate.draftThumbnailPath) {
    await supabaseStorage.deleteFile(candidate.draftThumbnailPath).catch(() => {});
  }

  await db.update(aiClipCandidates).set({ status: 'discarded' }).where(eq(aiClipCandidates.id, candidateId));
}

/**
 * Draft clips are temporary storage, not a permanent home — sweep up
 * candidates nobody published or discarded in time, deleting their staged
 * files and marking them expired so Supabase storage doesn't accumulate
 * from abandoned generations. Intended to run periodically (see the
 * scheduler in server/index.ts), not per-request.
 */
export async function expireStaleCandidates(): Promise<{ expired: number }> {
  const stale = await db.select().from(aiClipCandidates)
    .where(and(eq(aiClipCandidates.status, 'pending'), lt(aiClipCandidates.expiresAt, new Date())));

  for (const candidate of stale) {
    await supabaseStorage.deleteFile(candidate.draftVideoPath).catch(() => {});
    if (candidate.draftThumbnailPath) {
      await supabaseStorage.deleteFile(candidate.draftThumbnailPath).catch(() => {});
    }
    await db.update(aiClipCandidates).set({ status: 'expired' }).where(eq(aiClipCandidates.id, candidate.id));
  }

  return { expired: stale.length };
}
