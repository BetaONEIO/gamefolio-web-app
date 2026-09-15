import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Loader2, ClipboardCheck, Check, X, Video, Camera, MessageSquare,
  AlertCircle, ExternalLink, RotateCcw,
} from "lucide-react";
import { NEON, CARD_BG, CARD_BORDER } from "./constants";

type Submission = {
  id: number;
  instance_id: number;
  participant_id: number;
  bounty_id: number;
  content_type: string;
  clip_id?: number | null;
  screenshot_id?: number | null;
  reel_id?: number | null;
  content_url?: string | null;
  content_data?: any;
  status: string;
  review_notes?: string | null;
  submitted_at: string;
  reviewed_at?: string | null;
  username: string;
  display_name?: string | null;
  avatar_url?: string | null;
  game_name?: string | null;
  campaign_title?: string | null;
  bounty_title?: string | null;
  media_url?: string | null;
  thumbnail_url?: string | null;
};

const ICONS: Record<string, any> = {
  clip: Video, reel: Video, screenshot: Camera, feedback: MessageSquare, bug: AlertCircle,
};

function ReviewReasonDialog({
  title,
  actionLabel,
  onConfirm,
  onCancel,
}: {
  title: string;
  actionLabel: string;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState("");
  return (
    <div className="fixed inset-0 z-[200001] flex items-center justify-center bg-black/75 p-4" onClick={onCancel}>
      <div className="w-full max-w-md rounded-2xl p-5" style={{ background: "#0A0A10", border: `1px solid ${CARD_BORDER}` }} onClick={(e) => e.stopPropagation()}>
        <h3 className="text-sm font-black text-white">{title}</h3>
        <p className="mt-1 text-xs text-white/45">Give the creator a clear reason so they know what to do next.</p>
        <textarea
          autoFocus
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Write your feedback…"
          className="mt-4 min-h-28 w-full rounded-xl bg-white/[0.04] p-3 text-sm text-white outline-none placeholder:text-white/25"
          style={{ border: "1px solid rgba(255,255,255,0.12)" }}
        />
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onCancel} className="rounded-lg px-3 py-2 text-xs font-bold text-white/50 hover:text-white">Cancel</button>
          <button
            disabled={!reason.trim()}
            onClick={() => onConfirm(reason.trim())}
            className="rounded-lg px-3 py-2 text-xs font-black disabled:opacity-40"
            style={{ background: actionLabel === "Reject" ? "#ef4444" : "#f97316", color: "#100707" }}
          >
            {actionLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function SubmissionViewer({ submission, onClose }: { submission: Submission; onClose: () => void }) {
  const mediaUrl = submission.media_url ?? submission.content_url ?? null;
  const isVideo = submission.content_type === "clip" || submission.content_type === "reel";
  return (
    <div className="fixed inset-0 z-[200000] flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
      <div className="w-full max-w-3xl rounded-2xl p-5" style={{ background: "#0F101B", border: `1px solid ${CARD_BORDER}` }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: NEON }}>{submission.bounty_title ?? submission.content_type}</div>
            <h3 className="mt-1 text-xl font-black text-white">{submission.campaign_title ?? "Campaign submission"}</h3>
            <p className="mt-1 text-xs text-white/45">Submitted by @{submission.username}</p>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X size={18} /></button>
        </div>
        <div className="mt-5 overflow-hidden rounded-xl bg-black/40">
          {isVideo && mediaUrl ? <video controls className="max-h-[55vh] w-full" src={mediaUrl} poster={submission.thumbnail_url ?? undefined} /> :
            submission.content_type === "screenshot" && mediaUrl ? <img src={mediaUrl} alt="" className="max-h-[55vh] w-full object-contain" /> :
            mediaUrl ? <a href={mediaUrl} target="_blank" rel="noreferrer" className="flex min-h-48 items-center justify-center gap-2 text-sm font-bold" style={{ color: NEON }}><ExternalLink size={16} /> Open submission</a> :
            <div className="flex min-h-48 items-center justify-center text-sm text-white/35">No media preview is available for this submission.</div>}
        </div>
        {submission.content_data?.text && <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-white/70">{submission.content_data.text}</p>}
        {submission.review_notes && <p className="mt-4 rounded-lg bg-white/[0.04] p-3 text-xs text-white/60">{submission.review_notes}</p>}
        <button onClick={onClose} className="mt-5 w-full rounded-lg border border-white/10 py-2.5 text-xs font-bold text-white/65 hover:text-white">Close viewer</button>
      </div>
    </div>
  );
}

export default function SubmissionReviewTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Submission | null>(null);
  const [reason, setReason] = useState<{ id: number; verdict: "changes_requested" | "rejected" } | null>(null);
  const { data: submissions = [], isLoading } = useQuery<Submission[]>({
    queryKey: ["/api/bounties/admin/submissions", "owner"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/bounties/admin/submissions");
      return response.json();
    },
  });
  const review = useMutation({
    mutationFn: ({ id, verdict, notes }: { id: number; verdict: string; notes?: string }) =>
      apiRequest("PATCH", `/api/bounties/admin/submissions/${id}/review`, { verdict, notes }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["/api/bounties/admin/submissions", "owner"] });
      qc.invalidateQueries({ queryKey: ["/api/indie/overview"] });
      toast({ title: vars.verdict === "approved" ? "Submission approved" : vars.verdict === "changes_requested" ? "Changes requested" : "Submission rejected", variant: "gamefolioSuccess" as any });
      setReason(null);
      setSelected(null);
    },
    onError: (error: any) => toast({ title: "Review failed", description: error?.message ?? "Could not update this submission", variant: "gamefolioError" as any }),
  });

  const pending = submissions.filter((s) => ["pending", "under_review"].includes(s.status));
  const reviewed = submissions.filter((s) => !["pending", "under_review"].includes(s.status));
  const renderRow = (submission: Submission) => {
    const Icon = ICONS[submission.content_type] ?? Video;
    return (
      <div key={submission.id} className="rounded-xl p-3" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
        <div className="flex items-center gap-3">
          {submission.thumbnail_url ? <img src={submission.thumbnail_url} className="h-14 w-20 rounded-lg object-cover" alt="" /> : <div className="flex h-14 w-20 items-center justify-center rounded-lg bg-white/[0.04]"><Icon size={18} className="text-white/35" /></div>}
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-black text-white">{submission.bounty_title ?? "Campaign objective"}</div>
            <div className="mt-1 text-xs text-white/45">@{submission.username} · {submission.campaign_title ?? submission.game_name ?? "Campaign"}</div>
            <div className="mt-1 text-[10px] text-white/30">{new Date(submission.submitted_at).toLocaleString()}</div>
          </div>
          <span className="hidden text-[10px] font-black uppercase tracking-wider text-amber-300 sm:block">{submission.status.replaceAll("_", " ")}</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={() => setSelected(submission)} className="rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-white/65 hover:text-white">Review submission</button>
          {pending.includes(submission) && <>
            <button onClick={() => review.mutate({ id: submission.id, verdict: "approved" })} disabled={review.isPending} className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-black disabled:opacity-50" style={{ background: NEON, color: "#080b10" }}><Check size={14} /> Approve</button>
            <button onClick={() => setReason({ id: submission.id, verdict: "changes_requested" })} disabled={review.isPending} className="inline-flex items-center gap-1 rounded-lg border border-orange-400/30 px-3 py-2 text-xs font-black text-orange-300 disabled:opacity-50"><RotateCcw size={14} /> Request changes</button>
            <button onClick={() => setReason({ id: submission.id, verdict: "rejected" })} disabled={review.isPending} className="inline-flex items-center gap-1 rounded-lg border border-red-400/25 px-3 py-2 text-xs font-black text-red-300 disabled:opacity-50"><X size={14} /> Reject</button>
          </>}
        </div>
      </div>
    );
  };

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin" style={{ color: NEON }} /></div>;
  if (submissions.length === 0) return null;
  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div><div className="flex items-center gap-2"><ClipboardCheck size={16} style={{ color: NEON }} /><h2 className="text-sm font-black text-white">Submissions</h2></div><p className="mt-1 text-xs text-white/35">{pending.length} awaiting review across your campaigns.</p></div>
      </div>
      {pending.length > 0 && <div className="space-y-2">{pending.map(renderRow)}</div>}
      {reviewed.length > 0 && <details className="group"><summary className="cursor-pointer text-xs font-black uppercase tracking-wider text-white/35">Review history ({reviewed.length})</summary><div className="mt-2 space-y-2">{reviewed.map(renderRow)}</div></details>}
      {selected && <SubmissionViewer submission={selected} onClose={() => setSelected(null)} />}
      {reason && <ReviewReasonDialog title={reason.verdict === "rejected" ? "Reject submission" : "Request changes"} actionLabel={reason.verdict === "rejected" ? "Reject" : "Send request"} onCancel={() => setReason(null)} onConfirm={(notes) => review.mutate({ id: reason.id, verdict: reason.verdict, notes })} />}
    </section>
  );
}