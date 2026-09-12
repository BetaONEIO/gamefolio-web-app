import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSignedUrl } from "@/hooks/use-signed-url";
import type { AiClipCandidate } from "@shared/schema";

interface CandidateReviewCardProps {
  candidate: AiClipCandidate;
  onPublish: () => void;
  onDiscard: () => void;
  publishing?: boolean;
  discarding?: boolean;
}

function formatExpiry(expiresAt: string | Date): string {
  const days = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
  if (days <= 0) return "expiring soon";
  if (days === 1) return "expires in 1 day";
  return `expires in ${days} days`;
}

const STATUS_LABELS: Record<string, string> = {
  published: "Published",
  discarded: "Discarded",
  expired: "Expired — not published in time",
};

export default function CandidateReviewCard({ candidate, onPublish, onDiscard, publishing, discarding }: CandidateReviewCardProps) {
  const [showVideo, setShowVideo] = useState(false);
  // gamefolio-media is a private bucket — the stored URLs need to be
  // exchanged for signed ones before the browser can actually load them.
  const { signedUrl: signedVideoUrl } = useSignedUrl(candidate.draftVideoUrl);
  const { signedUrl: signedThumbnailUrl } = useSignedUrl(candidate.draftThumbnailUrl);

  if (candidate.status !== "pending") {
    return (
      <Card className="p-4 opacity-60">
        <p className="font-medium text-sm">{candidate.title}</p>
        <Badge variant="secondary" className="mt-2">
          {STATUS_LABELS[candidate.status] || candidate.status}
        </Badge>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="relative aspect-video bg-black">
        {showVideo ? (
          signedVideoUrl && <video src={signedVideoUrl} controls autoPlay className="w-full h-full" />
        ) : (
          <button className="w-full h-full relative" onClick={() => setShowVideo(true)}>
            {signedThumbnailUrl && (
              <img src={signedThumbnailUrl} alt={candidate.title} className="w-full h-full object-cover" />
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">▶</div>
            </div>
          </button>
        )}
        <Badge className="absolute bottom-2 right-2 bg-black/70 text-white border-0">
          {Math.round(candidate.durationSeconds)}s
        </Badge>
      </div>
      <div className="p-3 space-y-2">
        <p className="font-medium text-sm">{candidate.title}</p>
        {candidate.reasoning && (
          <p className="text-xs text-muted-foreground line-clamp-3">{candidate.reasoning}</p>
        )}
        <p className="text-xs text-amber-500">Draft only — {formatExpiry(candidate.expiresAt)}</p>
        <div className="flex gap-2 pt-1">
          <Button size="sm" onClick={onPublish} disabled={publishing || discarding} className="flex-1">
            {publishing ? "Publishing…" : "Publish"}
          </Button>
          <Button size="sm" variant="outline" onClick={onDiscard} disabled={publishing || discarding} className="flex-1">
            {discarding ? "Discarding…" : "Discard"}
          </Button>
        </div>
      </div>
    </Card>
  );
}
