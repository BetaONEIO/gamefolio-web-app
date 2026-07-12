import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import ProUpgradeDialog from "@/components/ProUpgradeDialog";
import VodPickerList from "@/components/ai-vod/VodPickerList";
import AiClipJobProgress from "@/components/ai-vod/AiClipJobProgress";
import CandidateReviewCard from "@/components/ai-vod/CandidateReviewCard";
import {
  useAiClipsStatus,
  useTwitchVods,
  useCreateAiClipJob,
  useAiClipJob,
  useRetryAiClipJob,
  usePublishCandidate,
  useDiscardCandidate,
  type TwitchVodOption,
} from "@/hooks/use-ai-vod-clips";

export default function AiVodClipsPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeJobId, setActiveJobId] = useState<number | null>(null);
  const [publishingId, setPublishingId] = useState<number | null>(null);
  const [discardingId, setDiscardingId] = useState<number | null>(null);
  const [showProUpgrade, setShowProUpgrade] = useState(false);

  const { data: statusData } = useAiClipsStatus();
  const { data: vodData, isLoading: vodsLoading, error: vodsError } = useTwitchVods();
  const createJob = useCreateAiClipJob();
  const { data: jobData, isLoading: jobLoading } = useAiClipJob(activeJobId);
  const retryJob = useRetryAiClipJob(activeJobId);
  const publishCandidate = usePublishCandidate(activeJobId);
  const discardCandidate = useDiscardCandidate(activeJobId);

  const handleSelectVod = async (vod: TwitchVodOption) => {
    try {
      const { job } = await createJob.mutateAsync(vod.id);
      setActiveJobId(job.id);
    } catch (error: any) {
      const message: string = error?.message || "";
      if (message.startsWith("429:")) {
        if (!vodData?.isPro) {
          setShowProUpgrade(true);
        } else {
          toast({ title: "Daily limit reached", description: "Resets at midnight UTC.", variant: "destructive" });
        }
        return;
      }
      toast({ title: "Couldn't start generation", description: message, variant: "destructive" });
    }
  };

  const handlePublish = async (candidateId: number) => {
    setPublishingId(candidateId);
    try {
      const result = await publishCandidate.mutateAsync({ candidateId });
      toast({ title: "Clip published!", description: `+${result.xpGained} XP` });
    } catch (error: any) {
      toast({ title: "Publish failed", description: error?.message, variant: "destructive" });
    } finally {
      setPublishingId(null);
    }
  };

  const handleDiscard = async (candidateId: number) => {
    setDiscardingId(candidateId);
    try {
      await discardCandidate.mutateAsync(candidateId);
    } catch (error: any) {
      toast({ title: "Couldn't discard", description: error?.message, variant: "destructive" });
    } finally {
      setDiscardingId(null);
    }
  };

  const pendingCount = jobData?.candidates.filter((c) => c.status === "pending").length || 0;

  // Generated drafts only become permanent when explicitly published — warn
  // before an actual page close/refresh/navigation-away so an unpublished
  // batch doesn't get lost without the user realizing nothing was saved.
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (pendingCount > 0) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [pendingCount]);

  const handlePickAnotherVod = () => {
    if (pendingCount > 0) {
      const confirmed = window.confirm(
        `You have ${pendingCount} unpublished clip${pendingCount === 1 ? "" : "s"} from this VOD. They won't be saved unless you publish them first. Continue anyway?`
      );
      if (!confirmed) return;
    }
    setActiveJobId(null);
  };

  if (vodsError) {
    return (
      <div className="max-w-2xl mx-auto p-6 text-center space-y-3">
        <p className="text-destructive">Couldn't load your Twitch VODs.</p>
        <p className="text-sm text-muted-foreground">{(vodsError as Error).message}</p>
        <Button variant="outline" onClick={() => setLocation("/settings/profile")}>Back to Settings</Button>
      </div>
    );
  }

  const job = jobData?.job;
  const candidates = jobData?.candidates || [];
  const limitReached = vodData ? vodData.dailyJobsUsed >= vodData.dailyJobLimit : false;

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">AI clips from your streams</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Pick a past broadcast and Claude will find the highlight-worthy moments and cut them into clips for you to review.
          </p>
        </div>
        {vodData && (
          <div className="text-right flex-shrink-0">
            <p className="text-xs text-muted-foreground">{vodData.isPro ? "Pro" : "Free"} plan</p>
            <p className="text-sm font-medium">{vodData.dailyJobsUsed}/{vodData.dailyJobLimit} today</p>
          </div>
        )}
      </div>

      {!activeJobId && statusData?.enabled === false && (
        <div className="text-center py-12 space-y-2">
          <p className="font-medium">AI clip generation is temporarily unavailable</p>
          {statusData.disabledMessage && <p className="text-sm text-muted-foreground max-w-md mx-auto">{statusData.disabledMessage}</p>}
        </div>
      )}

      {!activeJobId && statusData?.enabled !== false && limitReached && (
        <div className="text-center py-12 space-y-3">
          <p className="font-medium">Daily limit reached</p>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            You've used {vodData!.dailyJobsUsed}/{vodData!.dailyJobLimit} AI clip generations today. Resets at midnight UTC.
          </p>
          {!vodData!.isPro && (
            <Button onClick={() => setShowProUpgrade(true)}>Upgrade to Pro for more</Button>
          )}
        </div>
      )}

      {!activeJobId && statusData?.enabled !== false && !limitReached && (
        vodsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="aspect-video rounded-lg" />)}
          </div>
        ) : (
          <VodPickerList
            vods={vodData?.vods || []}
            maxDurationSeconds={vodData?.maxDurationSeconds || 2700}
            onSelect={handleSelectVod}
            disabled={createJob.isPending}
          />
        )
      )}

      {activeJobId && job && job.status !== "completed" && (
        <AiClipJobProgress job={job} onRetry={() => retryJob.mutate()} retrying={retryJob.isPending} />
      )}

      {activeJobId && job && job.status === "completed" && (
        <div className="space-y-4">
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
            These are drafts, not permanent uploads — publish the ones you want to keep. Anything left unpublished is automatically deleted after a few days.
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{candidates.length} candidate clips found</p>
            <Button variant="ghost" size="sm" onClick={handlePickAnotherVod}>Pick another VOD</Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {candidates.map((candidate) => (
              <CandidateReviewCard
                key={candidate.id}
                candidate={candidate}
                onPublish={() => handlePublish(candidate.id)}
                onDiscard={() => handleDiscard(candidate.id)}
                publishing={publishingId === candidate.id}
                discarding={discardingId === candidate.id}
              />
            ))}
          </div>
        </div>
      )}

      {activeJobId && jobLoading && !job && (
        <div className="text-center py-12 text-muted-foreground">Loading job…</div>
      )}

      <ProUpgradeDialog
        open={showProUpgrade}
        onOpenChange={setShowProUpgrade}
        subtitle="Get more daily AI clip generations and longer VOD support with Pro."
      />
    </div>
  );
}
