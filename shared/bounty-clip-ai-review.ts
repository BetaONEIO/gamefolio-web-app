export type BountyClipRecommendation = {
  verdict: 'looks_ready' | 'needs_review';
  reason: string;
  timestamp: number | null;
};

export const BOUNTY_CLIP_AI_DISCLOSURE =
  'AI checks sampled video frames against this game’s screenshots and bounty brief. You make the final decision.';
