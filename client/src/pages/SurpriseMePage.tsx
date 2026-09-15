import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, ChevronRight, Gift, Loader2 } from "lucide-react";
import type { ClipWithUser } from "@shared/schema";
import VideoPlayer from "@/components/shared/VideoPlayer";
import { LikeButton } from "@/components/engagement/LikeButton";
import { FireButton } from "@/components/engagement/FireButton";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { queryClient } from "@/lib/queryClient";
import "@/components/home/surprise-me-rainbow.css";

type ProgressState = { completed: number; remaining: number; limit: number };
type PickResponse = { clip: ClipWithUser; progress: ProgressState; watchThresholdSeconds: number; xpAwarded: number };

export default function SurpriseMePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [pick, setPick] = useState<PickResponse | null>(null);
  const [progress, setProgress] = useState<ProgressState>({ completed: 0, remaining: 1, limit: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rewarded, setRewarded] = useState(false);
  const claimingRef = useRef(false);

  const loadSurprise = useCallback(async () => {
    setLoading(true);
    setError(null);
    setRewarded(false);
    claimingRef.current = false;
    try {
      const response = await fetch("/api/surprise-me/pick", { method: "POST", credentials: "include" });
      const data = await response.json();
      if (!response.ok) {
        if (typeof data.completed === "number") setProgress(data);
        throw new Error(data.message || "Could not find a surprise");
      }
      setPick(data);
      setProgress(data.progress);
    } catch (cause) {
      setPick(null);
      setError(cause instanceof Error ? cause.message : "Could not find a surprise");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadSurprise(); }, [loadSurprise]);

  const handleProgress = useCallback(async (currentTime: number) => {
    if (!pick || rewarded || claimingRef.current || currentTime < pick.watchThresholdSeconds) return;
    claimingRef.current = true;
    try {
      const response = await fetch("/api/surprise-me/complete", {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clipId: pick.clip.id, watchedSeconds: currentTime }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not award bonus XP");
      setRewarded(true);
      setProgress(data.progress);
      if (user) {
        void queryClient.invalidateQueries({ queryKey: [`/api/user/${user.id}/level-progress`] });
        void queryClient.invalidateQueries({ queryKey: [`/api/user/${user.id}/daily-activity`] });
      }
      toast({ title: `+${data.xpAwarded} XP`, description: "Surprise discovered — 2x XP earned!", variant: "gamefolioSuccess" });
    } catch (cause) {
      claimingRef.current = false;
      toast({ title: "Bonus not awarded", description: cause instanceof Error ? cause.message : "Please try again", variant: "gamefolioError" });
    }
  }, [pick, rewarded, toast, user]);

  return (
    <div className="min-h-screen bg-[#0F101B] px-4 py-5 pb-28 text-white">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-5 flex items-center justify-between gap-3">
          <Link href="/"><Button variant="ghost" size="sm"><ArrowLeft className="mr-2 h-4 w-4" />Back</Button></Link>
          <div className="rounded-full border border-[#B7FF1A]/40 bg-[#B7FF1A]/10 px-3 py-1 text-sm font-bold text-[#B7FF1A]">{progress.completed}/{progress.limit} today</div>
        </div>
        <div className="surprise-me-rainbow-border mb-5">
          <div className="surprise-me-rainbow-inner rounded-[12px] p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#B7FF1A] text-2xl font-black leading-none text-[#071013]" aria-hidden="true">?</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <h1 className="text-2xl font-black tracking-tight">Surprise Me</h1>
                  <span className="shrink-0 text-sm font-black text-[#B7FF1A]">x2 XP</span>
                </div>
                <p className="mt-1 text-sm leading-6 text-white/65">Discover a random clip or reel · 1 free bonus daily</p>
                <Progress className="mt-4 h-2" value={(progress.completed / progress.limit) * 100} />
              </div>
              <ChevronRight className="mt-2 h-5 w-5 shrink-0 text-[#B7FF1A]" aria-hidden="true" />
            </div>
          </div>
        </div>
        {loading && <div className="flex min-h-72 items-center justify-center"><Loader2 className="h-9 w-9 animate-spin text-[#B7FF1A]" /></div>}
        {!loading && error && <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center"><Gift className="mx-auto mb-3 h-10 w-10 text-[#B7FF1A]" /><h2 className="text-xl font-bold">{progress.remaining === 0 ? "All surprises discovered" : "No surprise this time"}</h2><p className="mt-2 text-white/60">{error}</p>{progress.remaining > 0 && <Button className="mt-5" onClick={() => void loadSurprise()}><Shuffle className="mr-2 h-4 w-4" />Try again</Button>}</div>}
        {!loading && pick && <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0b151b] shadow-2xl">
          <div className="relative aspect-video bg-black"><VideoPlayer videoUrl={pick.clip.videoUrl} thumbnailUrl={pick.clip.thumbnailUrl || undefined} clipId={pick.clip.id} autoPlay objectFit="contain" className="h-full w-full" onProgress={handleProgress} /><div className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/75 px-3 py-1 text-xs font-black text-[#B7FF1A]">2x XP</div></div>
          <div className="p-4"><div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-bold">{pick.clip.title}</h2><p className="text-sm text-white/55">@{pick.clip.user.username} · {pick.clip.videoType === "reel" ? "Reel" : "Clip"}</p></div><div className="flex items-center gap-2"><LikeButton contentId={pick.clip.id} contentType="clip" contentOwnerId={pick.clip.userId} initialCount={(pick.clip as any)._count?.likes || 0} /><FireButton contentId={pick.clip.id} contentType="clip" contentOwnerId={pick.clip.userId} initialCount={(pick.clip as any)._count?.reactions || 0} /></div></div>
            <div className={`mt-4 rounded-xl border p-3 text-sm ${rewarded ? "border-[#B7FF1A]/40 bg-[#B7FF1A]/10 text-[#B7FF1A]" : "border-white/10 bg-white/5 text-white/65"}`}>{rewarded ? `Bonus earned! +${pick.xpAwarded} XP` : `Keep watching — the ${pick.xpAwarded} XP bonus unlocks after ${pick.watchThresholdSeconds} seconds.`}</div>
             {rewarded && progress.remaining > 0 && <Button className="mt-4 w-full" onClick={() => void loadSurprise()}>Surprise me again</Button>}
          </div>
        </div>}
      </div>
    </div>
  );
}
