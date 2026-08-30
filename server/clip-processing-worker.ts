import { storage } from './storage';
import { supabaseStorage } from './supabase-storage';
import { VideoProcessor } from './video-processor';
import { finishClipProcessing } from './services/clip-processing';
import type { Clip } from '@shared/schema';

// A clip stays "processing" until finishClipProcessing (fired immediately on
// upload) finishes. If the server restarts mid-job, that in-process attempt
// never completes and the row is orphaned — this reconciler picks it back
// up. The grace period avoids racing the in-process attempt that's still
// legitimately running.
const STUCK_GRACE_PERIOD_MS = 10 * 60 * 1000;

/**
 * Re-probes the still-raw video (codec/size aren't persisted on the row —
 * only known transiently during the original request) and resumes
 * processing for one stuck clip.
 */
async function retryStuckClip(clip: Clip): Promise<void> {
  let downloadUrl = clip.videoUrl;
  try {
    const signedUrl = await supabaseStorage.convertToSignedUrl(clip.videoUrl, 300);
    if (signedUrl) downloadUrl = signedUrl;
  } catch (signError) {
    console.warn(`Could not sign URL for stuck clip ${clip.id}, falling back to public URL:`, signError);
  }

  let sourceVideoCodec = '';
  let sourceAudioCodec: string | null = null;
  let sizeBytes = 0;
  try {
    const headResp = await fetch(downloadUrl, { method: 'HEAD' });
    sizeBytes = parseInt(headResp.headers.get('content-length') || '0', 10);
    const videoInfo = await VideoProcessor.getVideoInfo(downloadUrl);
    sourceVideoCodec = videoInfo.videoCodec;
    sourceAudioCodec = videoInfo.audioCodec;
  } catch (probeError) {
    console.warn(`Could not re-probe stuck clip ${clip.id}, proceeding without codec info:`, probeError);
  }

  await finishClipProcessing(clip, {
    downloadUrl,
    requestedTrimStart: clip.trimStart ?? 0,
    requestedTrimEnd: clip.trimEnd ?? clip.duration ?? 0,
    videoType: (clip.videoType === 'reel' ? 'reel' : 'clip'),
    userId: clip.userId,
    sourceVideoCodec,
    sourceAudioCodec,
    sizeBytes,
    actualDuration: clip.duration ?? 0,
  });
}

export async function reconcileStuckClipProcessing(): Promise<void> {
  const before = new Date(Date.now() - STUCK_GRACE_PERIOD_MS);
  const stuck = await storage.getStuckProcessingClips(before);
  if (stuck.length === 0) return;

  console.log(`🔁 Reconciling ${stuck.length} stuck clip(s) still marked "processing"`);
  for (const clip of stuck) {
    try {
      await retryStuckClip(clip);
    } catch (err) {
      // finishClipProcessing already records the failure/attempt count on
      // the row itself — a throw here means even that bookkeeping failed,
      // so just log and move on to the next stuck clip.
      console.error(`Reconciler: failed to retry stuck clip ${clip.id}:`, err);
    }
  }
}
