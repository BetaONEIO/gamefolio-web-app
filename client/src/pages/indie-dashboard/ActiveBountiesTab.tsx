import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Gamepad2, Users, Key, Zap, Plus, Pause, Play, Square, Copy,
  Loader2, Sword, Clock,
} from "lucide-react";
import { NEON, CARD_BG, CARD_BORDER } from "./constants";

interface IndieBounty {
  id: number;
  gameId: number;
  title: string;
  campaignTitle: string | null;
  description: string | null;
  status: string;
  bountyType: string;
  endDate: string | null;
  startDate: string | null;
  createdAt: string;
  maxParticipants: number;
  demoKeysRemaining: number;
  fullKeysRemaining: number;
  totalXpAvailable: number;
  rewardMode: string;
  gameName: string | null;
  gameImageUrl: string | null;
  participantCount: number;
  pendingSubmissions: number;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  active: { label: "Active", color: "#4ade80", bg: "rgba(74,222,128,0.12)" },
  draft: { label: "Draft", color: "#facc15", bg: "rgba(250,204,21,0.12)" },
  paused: { label: "Paused", color: "#94a3b8", bg: "rgba(148,163,184,0.12)" },
  ended: { label: "Ended", color: "#f87171", bg: "rgba(248,113,113,0.12)" },
  cancelled: { label: "Cancelled", color: "#f87171", bg: "rgba(248,113,113,0.12)" },
};

const FILTERS = [
  { id: "", label: "All" },
  { id: "active", label: "Active" },
  { id: "paused", label: "Paused" },
  { id: "draft", label: "Draft" },
  { id: "ended", label: "Ended" },
];

export default function ActiveBountiesTab({ onCreateNew }: { onCreateNew: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("");

  const { data: bounties = [], isLoading } = useQuery<IndieBounty[]>({
    queryKey: ["/api/games/indie/bounties", statusFilter],
    queryFn: async () => {
      const url = statusFilter ? `/api/games/indie/bounties?status=${statusFilter}` : "/api/games/indie/bounties";
      const res = await apiRequest("GET", url);
      return res.json();
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/games/indie/bounties"] });
    queryClient.invalidateQueries({ queryKey: ["/api/games/indie/overview"] });
  };

  const pauseMutation = useMutation({
    mutationFn: ({ id, paused }: { id: number; paused: boolean }) =>
      apiRequest("POST", `/api/games/bounties/${id}/pause`, { paused }),
    onSuccess: () => { invalidate(); toast({ title: "Bounty updated", variant: "gamefolioSuccess" as any }); },
    onError: () => toast({ title: "Error", description: "Failed to update bounty", variant: "gamefolioError" as any }),
  });

  const endMutation = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/games/bounties/${id}/end`, {}),
    onSuccess: () => { invalidate(); toast({ title: "Bounty ended", variant: "gamefolioSuccess" as any }); },
    onError: () => toast({ title: "Error", description: "Failed to end bounty", variant: "gamefolioError" as any }),
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/games/bounties/${id}/duplicate`, {}),
    onSuccess: () => { invalidate(); toast({ title: "Bounty duplicated as draft", variant: "gamefolioSuccess" as any }); },
    onError: () => toast({ title: "Error", description: "Failed to duplicate bounty", variant: "gamefolioError" as any }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              className="text-xs font-bold px-3 py-1.5 rounded-full"
              style={{
                background: statusFilter === f.id ? "rgba(193,255,0,0.16)" : "rgba(255,255,255,0.05)",
                color: statusFilter === f.id ? NEON : "rgba(255,255,255,0.55)",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button
          onClick={onCreateNew}
          className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl"
          style={{ background: NEON, color: "#0a0f1c" }}
        >
          <Plus className="w-3.5 h-3.5" /> New Bounty
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin" style={{ color: NEON }} /></div>
      ) : bounties.length === 0 ? (
        <div className="rounded-2xl p-10 text-center" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
          <Sword className="w-8 h-8 mx-auto mb-3 text-gray-600" />
          <p className="text-sm text-gray-500">No bounties found for this filter.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {bounties.map((b) => {
            const cfg = STATUS_CONFIG[b.status] ?? STATUS_CONFIG.active;
            return (
              <div key={b.id} className="rounded-2xl p-4" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
                <div className="flex items-start gap-3 mb-3">
                  {b.gameImageUrl ? (
                    <img src={b.gameImageUrl} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(255,255,255,0.06)" }}>
                      <Gamepad2 className="w-4 h-4 text-gray-500" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-white truncate">{b.title}</div>
                    <div className="text-xs text-gray-500 truncate">{b.gameName ?? "Unknown game"}</div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide shrink-0" style={{ color: cfg.color, background: cfg.bg }}>
                    {cfg.label}
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2 mb-3">
                  <div className="text-center rounded-lg p-2" style={{ background: "rgba(255,255,255,0.03)" }}>
                    <Users className="w-3.5 h-3.5 mx-auto mb-1 text-gray-500" />
                    <div className="text-xs font-bold text-white">{b.participantCount}</div>
                  </div>
                  <div className="text-center rounded-lg p-2" style={{ background: "rgba(255,255,255,0.03)" }}>
                    <Key className="w-3.5 h-3.5 mx-auto mb-1 text-gray-500" />
                    <div className="text-xs font-bold text-white">{b.demoKeysRemaining}</div>
                  </div>
                  <div className="text-center rounded-lg p-2" style={{ background: "rgba(255,255,255,0.03)" }}>
                    <Zap className="w-3.5 h-3.5 mx-auto mb-1 text-gray-500" />
                    <div className="text-xs font-bold text-white">{b.totalXpAvailable.toLocaleString()}</div>
                  </div>
                  <div className="text-center rounded-lg p-2" style={{ background: b.pendingSubmissions > 0 ? "rgba(193,255,0,0.08)" : "rgba(255,255,255,0.03)" }}>
                    <Clock className="w-3.5 h-3.5 mx-auto mb-1" style={{ color: b.pendingSubmissions > 0 ? NEON : "#6b7280" }} />
                    <div className="text-xs font-bold" style={{ color: b.pendingSubmissions > 0 ? NEON : "#fff" }}>{b.pendingSubmissions}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {(b.status === "active" || b.status === "paused") && (
                    <button
                      onClick={() => pauseMutation.mutate({ id: b.id, paused: b.status === "active" })}
                      disabled={pauseMutation.isPending}
                      className="flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-lg"
                      style={{ background: "rgba(255,255,255,0.06)", color: "#fff" }}
                    >
                      {b.status === "active" ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                      {b.status === "active" ? "Pause" : "Resume"}
                    </button>
                  )}
                  {b.status !== "ended" && (
                    <button
                      onClick={() => endMutation.mutate(b.id)}
                      disabled={endMutation.isPending}
                      className="flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-lg"
                      style={{ background: "rgba(248,113,113,0.1)", color: "#f87171" }}
                    >
                      <Square className="w-3 h-3" /> End
                    </button>
                  )}
                  <button
                    onClick={() => duplicateMutation.mutate(b.id)}
                    disabled={duplicateMutation.isPending}
                    className="flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-lg ml-auto"
                    style={{ background: "rgba(255,255,255,0.06)", color: "#fff" }}
                  >
                    <Copy className="w-3 h-3" /> Duplicate
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
