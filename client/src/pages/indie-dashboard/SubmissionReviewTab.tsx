import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Loader2, ClipboardCheck, Check, X, Gamepad2, Video, Camera,
} from "lucide-react";
import { NEON, CARD_BG, CARD_BORDER } from "./constants";

interface IndieBounty {
  id: number;
  title: string;
  gameName: string | null;
  pendingSubmissions: number;
}

interface Submission {
  id: number;
  bountyId: number;
  userId: number;
  contentType: string;
  contentId: number;
  status: string;
  rejectionReason: string | null;
  reviewedAt: string | null;
  rewardSummary: any;
  createdAt: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}

const CONTENT_ICON: Record<string, any> = { clip: Video, reel: Video, screenshot: Camera };

function RejectDialog({ onConfirm, onCancel }: { onConfirm: (reason: string) => void; onCancel: () => void }) {
  const [reason, setReason] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onCancel}>
      <div
        className="rounded-2xl p-5 w-full max-w-sm"
        style={{ background: "#0B1218", border: "1px solid rgba(255,255,255,0.12)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-bold text-white mb-3">Reject Submission</h3>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason for rejection (optional)"
          className="w-full text-sm rounded-lg p-2.5 mb-4"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", color: "#fff", minHeight: "80px" }}
        />
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="text-xs font-bold px-3 py-2 rounded-lg text-gray-400">Cancel</button>
          <button
            onClick={() => onConfirm(reason)}
            className="text-xs font-bold px-3 py-2 rounded-lg"
            style={{ background: "#f87171", color: "#1a0505" }}
          >
            Reject
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SubmissionReviewTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedBountyId, setSelectedBountyId] = useState<number | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);

  const { data: bounties = [] } = useQuery<IndieBounty[]>({ queryKey: ["/api/games/indie/bounties"] });

  const bountiesWithSubmissions = bounties;
  const activeBountyId = selectedBountyId ?? bountiesWithSubmissions[0]?.id ?? null;

  const { data: submissions = [], isLoading } = useQuery<Submission[]>({
    queryKey: ["/api/games/bounties", activeBountyId, "submissions"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/games/bounties/${activeBountyId}/submissions`);
      return res.json();
    },
    enabled: !!activeBountyId,
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, action, rejectionReason }: { id: number; action: "approve" | "reject"; rejectionReason?: string }) =>
      apiRequest("POST", `/api/games/submissions/${id}/review`, { action, rejectionReason }),
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/games/bounties", activeBountyId, "submissions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/games/indie/bounties"] });
      queryClient.invalidateQueries({ queryKey: ["/api/games/indie/overview"] });
      toast({
        title: vars.action === "approve" ? "Submission approved" : "Submission rejected",
        variant: "gamefolioSuccess" as any,
      });
      setRejectingId(null);
    },
    onError: () => toast({ title: "Error", description: "Failed to review submission", variant: "gamefolioError" as any }),
  });

  const pending = submissions.filter((s) => s.status === "pending");
  const reviewed = submissions.filter((s) => s.status !== "pending");

  return (
    <div className="space-y-4">
      {bounties.length === 0 ? (
        <div className="rounded-2xl p-10 text-center" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
          <ClipboardCheck className="w-8 h-8 mx-auto mb-3 text-gray-600" />
          <p className="text-sm text-gray-500">Create a bounty first to start reviewing submissions.</p>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-1.5 flex-wrap">
            {bounties.map((b) => (
              <button
                key={b.id}
                onClick={() => setSelectedBountyId(b.id)}
                className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full"
                style={{
                  background: activeBountyId === b.id ? "rgba(193,255,0,0.16)" : "rgba(255,255,255,0.05)",
                  color: activeBountyId === b.id ? NEON : "rgba(255,255,255,0.55)",
                }}
              >
                {b.title}
                {b.pendingSubmissions > 0 && (
                  <span
                    className="text-[10px] rounded-full px-1.5"
                    style={{ background: activeBountyId === b.id ? "rgba(10,15,28,0.3)" : "rgba(193,255,0,0.2)", color: activeBountyId === b.id ? "#0a0f1c" : NEON }}
                  >
                    {b.pendingSubmissions}
                  </span>
                )}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin" style={{ color: NEON }} /></div>
          ) : (
            <>
              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Pending Review ({pending.length})</h3>
                {pending.length === 0 ? (
                  <div className="rounded-xl p-6 text-center text-sm text-gray-500" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
                    Nothing waiting for review.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {pending.map((s) => {
                      const Icon = CONTENT_ICON[s.contentType] ?? Video;
                      return (
                        <div key={s.id} className="flex items-center gap-3 rounded-xl p-3" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
                          {s.avatarUrl ? (
                            <img src={s.avatarUrl} className="w-9 h-9 rounded-full object-cover shrink-0" />
                          ) : (
                            <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(255,255,255,0.06)" }}>
                              <Gamepad2 className="w-4 h-4 text-gray-500" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-white truncate">{s.displayName || s.username}</div>
                            <div className="text-xs text-gray-500 flex items-center gap-1">
                              <Icon className="w-3 h-3" /> {s.contentType} #{s.contentId}
                            </div>
                          </div>
                          <button
                            onClick={() => reviewMutation.mutate({ id: s.id, action: "approve" })}
                            disabled={reviewMutation.isPending}
                            className="flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-lg"
                            style={{ background: "rgba(74,222,128,0.14)", color: "#4ade80" }}
                          >
                            <Check className="w-3.5 h-3.5" /> Approve
                          </button>
                          <button
                            onClick={() => setRejectingId(s.id)}
                            disabled={reviewMutation.isPending}
                            className="flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-lg"
                            style={{ background: "rgba(248,113,113,0.1)", color: "#f87171" }}
                          >
                            <X className="w-3.5 h-3.5" /> Reject
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {reviewed.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 mt-4">Reviewed</h3>
                  <div className="space-y-2">
                    {reviewed.map((s) => (
                      <div key={s.id} className="flex items-center gap-3 rounded-xl p-3 opacity-70" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-white truncate">{s.displayName || s.username}</div>
                          <div className="text-xs text-gray-500">{s.contentType} #{s.contentId}</div>
                        </div>
                        <span
                          className="text-[10px] font-bold px-2 py-1 rounded-full uppercase"
                          style={{
                            color: s.status === "approved" ? "#4ade80" : "#f87171",
                            background: s.status === "approved" ? "rgba(74,222,128,0.12)" : "rgba(248,113,113,0.12)",
                          }}
                        >
                          {s.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {rejectingId !== null && (
        <RejectDialog
          onCancel={() => setRejectingId(null)}
          onConfirm={(reason) => reviewMutation.mutate({ id: rejectingId, action: "reject", rejectionReason: reason })}
        />
      )}
    </div>
  );
}
