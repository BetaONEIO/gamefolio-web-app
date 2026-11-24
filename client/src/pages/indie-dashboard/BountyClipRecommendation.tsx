import { useMutation } from '@tanstack/react-query';
import { authedFetch } from '@/lib/queryClient';
import { BOUNTY_CLIP_AI_DISCLOSURE, type BountyClipRecommendation as Recommendation } from '@shared/bounty-clip-ai-review';

export function BountyClipReviewBadge({ recommendation }: { recommendation: Recommendation }) {
  return recommendation.verdict === 'looks_ready'
    ? <span className="text-sm font-semibold text-[#B9FF1A]">AI: Looks ready</span>
    : <span className="text-sm font-semibold text-amber-200">AI: Needs a closer look</span>;
}

export default function BountyClipRecommendation({ campaignId, submissionId, saved, onReviewed }: {
  campaignId: number;
  submissionId: number;
  saved?: Recommendation;
  onReviewed: () => void;
}) {
  const review = useMutation<Recommendation>({
    mutationFn: async () => {
      const response = await authedFetch(`/api/campaigns/instances/${campaignId}/submissions/${submissionId}/ai-review`, { method: 'POST' });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload) throw new Error(payload?.error ?? 'AI review is unavailable. Try again.');
      return payload;
    },
    onSuccess: onReviewed,
  });
  const recommendation = saved ?? review.data;
  const seconds = recommendation?.timestamp == null ? null : Math.floor(recommendation.timestamp);
  return <section aria-label="AI recommendation" className="space-y-2 rounded-lg border border-[#394158] p-4">
    {recommendation ? <>
      <BountyClipReviewBadge recommendation={recommendation} />
      <p className="text-sm text-[#D2D6E0]">
        {seconds != null && <strong className="text-white">{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')} · </strong>}
        {recommendation.reason}
      </p>
      <p className="text-sm text-[#BAC0D0]">{BOUNTY_CLIP_AI_DISCLOSURE}</p>
    </> : <div aria-live="polite" className="space-y-2">
      <p className="text-sm text-[#D2D6E0]">Send still frames to Anthropic to check the clip against the game and bounty brief.</p>
      <button type="button" className="text-sm font-semibold text-[#B9FF1A] underline disabled:opacity-60" disabled={review.isPending} onClick={() => review.mutate()}>
        {review.isPending ? 'Checking clip…' : review.isError ? 'Retry AI check' : 'Get AI recommendation'}
      </button>
      {review.error && <p role="alert" className="text-sm text-amber-200">{review.error.message}</p>}
    </div>}
  </section>;
}
