import { useMutation } from "@tanstack/react-query";
import { BarChart3, Check, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export type ActivePoll = {
  id: number;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  myVoteOptionId: number | null;
  options: Array<{ id: number; label: string; voteCount: number }>;
};

export const pollDismissed = (pollId: number) => document.cookie.split("; ").some((cookie) => cookie === `gf_poll_dismissed_${pollId}=1`);

export function PollTakeover({ poll, onDismiss }: { poll: ActivePoll; onDismiss: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const totalVotes = poll.options.reduce((sum, option) => sum + Number(option.voteCount), 0);
  const hasVoted = poll.myVoteOptionId !== null;

  const vote = useMutation({
    mutationFn: (optionId: number) => apiRequest("POST", `/api/polls/${poll.id}/vote`, { optionId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/polls/active"] }),
    onError: (error: Error) => toast({ title: "Vote not recorded", description: error.message, variant: "gamefolioError" }),
  });

  const dismiss = () => {
    const maxAge = Math.max(60, Math.ceil((new Date(poll.endsAt).getTime() - Date.now()) / 1000));
    document.cookie = `gf_poll_dismissed_${poll.id}=1; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
    onDismiss();
  };

  const choose = (optionId: number) => {
    if (!user) {
      toast({ title: "Log in to vote", description: "You need an account to cast a vote." });
      return;
    }
    if (!hasVoted && !vote.isPending) vote.mutate(optionId);
  };

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#090b12] text-white">
      <div className="absolute inset-0 opacity-70" style={{ background: "radial-gradient(circle at 15% 20%, rgba(183,255,24,.22), transparent 34%), radial-gradient(circle at 85% 80%, rgba(98,70,255,.28), transparent 38%)" }} />
      <button type="button" onClick={dismiss} aria-label="Dismiss poll" className="absolute right-4 top-4 z-20 rounded-full bg-black/50 p-2 text-white/80 transition hover:bg-black/80 hover:text-white"><X className="h-5 w-5" /></button>
      <div className="relative z-10 flex h-full flex-col justify-center px-5 py-12 sm:px-10 md:px-16">
        <div className="mx-auto w-full max-w-4xl">
          <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-[#B7FF18]"><BarChart3 className="h-4 w-4" />Community poll</div>
          <h2 className="max-w-3xl text-3xl font-black leading-tight sm:text-5xl">{poll.title}</h2>
          <p className="mt-3 max-w-2xl text-sm text-white/70 sm:text-base">{poll.description}</p>
          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            {poll.options.map((option) => {
              const selected = poll.myVoteOptionId === option.id;
              const percentage = totalVotes ? Math.round((Number(option.voteCount) / totalVotes) * 100) : 0;
              return <button key={option.id} type="button" disabled={hasVoted || vote.isPending} onClick={() => choose(option.id)} className={`relative overflow-hidden rounded-xl border p-3 text-left transition ${selected ? "border-[#B7FF18] bg-[#B7FF18]/15" : "border-white/15 bg-white/[0.07] hover:border-white/35 hover:bg-white/10"}`}>
                {hasVoted ? <span className="absolute inset-y-0 left-0 bg-white/10" style={{ width: `${percentage}%` }} /> : null}
                <span className="relative flex items-center justify-between gap-3"><span className="font-semibold">{option.label}</span>{hasVoted ? <span className="flex items-center gap-2 text-sm text-white/65">{selected ? <Check className="h-4 w-4 text-[#B7FF18]" /> : null}{percentage}%</span> : null}</span>
              </button>;
            })}
          </div>
          <p className="mt-4 text-xs text-white/50">{hasVoted ? `${totalVotes} vote${totalVotes === 1 ? "" : "s"} so far` : "Choose one answer · one vote per account"}</p>
        </div>
      </div>
    </div>
  );
}
