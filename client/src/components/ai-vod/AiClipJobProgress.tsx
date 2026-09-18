import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import type { AiClipJob } from "@shared/schema";

const STAGES: { key: string; label: string }[] = [
  { key: "queued", label: "Queued" },
  { key: "downloading", label: "Downloading VOD" },
  { key: "transcribing", label: "Transcribing audio" },
  { key: "analyzing", label: "Finding highlights" },
  { key: "cutting", label: "Cutting clips" },
  { key: "completed", label: "Done" },
];

interface AiClipJobProgressProps {
  job: AiClipJob;
  onRetry: () => void;
  retrying?: boolean;
}

export default function AiClipJobProgress({ job, onRetry, retrying }: AiClipJobProgressProps) {
  if (job.status === "failed" || job.status === "cancelled") {
    const isCancelled = job.status === "cancelled";
    return (
      <div className="text-center py-8 space-y-3">
        <p className={isCancelled ? "font-medium" : "text-destructive font-medium"}>
          {isCancelled ? "Generation cancelled" : "Generation failed"}
        </p>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">{job.errorReason}</p>
        <Button onClick={onRetry} disabled={retrying}>
          {retrying ? "Retrying…" : "Retry"}
        </Button>
      </div>
    );
  }

  const stageIndex = Math.max(0, STAGES.findIndex((s) => s.key === job.status));
  const overallProgress = ((stageIndex + job.stageProgress / 100) / (STAGES.length - 1)) * 100;

  return (
    <div className="py-8 space-y-4 max-w-md mx-auto text-center">
      <p className="font-medium">{STAGES[stageIndex]?.label || "Working…"}</p>
      <Progress value={Math.min(100, overallProgress)} />
      <p className="text-xs text-muted-foreground">
        This can take several minutes for longer VODs — feel free to leave this page and come back.
      </p>
    </div>
  );
}
