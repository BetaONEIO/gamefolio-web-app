import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import {
  Target, ShieldCheck, Clock, Users, Key, ChevronRight, ChevronLeft,
  Zap, Copy, Check, Loader2, Lock,
  Film, Camera, MessageSquare, Star, AlertCircle,
  Trophy, Gift,
} from "lucide-react";
import { SiSteam } from "react-icons/si";

const NEON = "#B7FF18";
const PAGE_BG = "#070b10";
const CARD_BG = "rgba(255,255,255,0.04)";
const CARD_BORDER = "rgba(255,255,255,0.09)";

type View = "marketplace" | "detail" | "progress";
type MyTab = "active" | "submitted" | "completed" | "expired";
type MainTab = "marketplace" | "my";

const CONTENT_TYPE_ICON: Record<string, any> = {
  clip: Film, screenshot: Camera, feedback: MessageSquare,
  reel: Film, session: Zap, bug: AlertCircle, stream: Zap,
};

const CONTENT_TYPE_LABEL: Record<string, string> = {
  clip: "Gameplay Clip", screenshot: "Screenshot", feedback: "Feedback Form",
  reel: "Reel", session: "Play Session", bug: "Bug Report", stream: "Livestream",
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  enrolled:               { label: "Joined",                  color: "#94a3b8", bg: "rgba(148,163,184,0.12)" },
  demo_key_claimed:       { label: "Demo Key Claimed",        color: NEON,      bg: "rgba(183,255,24,0.12)" },
  in_progress:            { label: "In Progress",             color: "#60a5fa", bg: "rgba(96,165,250,0.12)" },
  submitted_for_review:   { label: "Submitted for Review",    color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  changes_requested:      { label: "Changes Requested",       color: "#f97316", bg: "rgba(249,115,22,0.12)" },
  completed_and_verified: { label: "All Bounties Verified",   color: NEON,      bg: "rgba(183,255,24,0.12)" },
  completed:              { label: "Completed",               color: "#4ade80", bg: "rgba(74,222,128,0.12)" },
  full_game_awarded:      { label: "Full Game Awarded",       color: "#a78bfa", bg: "rgba(167,139,250,0.12)" },
  rejected:               { label: "Rejected",                color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
  expired:                { label: "Expired",                 color: "#6b7280", bg: "rgba(107,114,128,0.1)"  },
};

function timeRemaining(endDate: string | null) {
  if (!endDate) return "Ongoing";
  const diff = new Date(endDate).getTime() - Date.now();
  if (diff <= 0) return "Ended";
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return `${days}d ${hours}h left`;
  return `${hours}h left`;
}

function CampaignCard({ campaign, onClick }: { campaign: any; onClick: () => void }) {
  const isGF = !!campaign.gamefolio_managed;
  const demoLeft = Number(campaign.demo_keys_remaining ?? 0);
  const fullLeft = Number(campaign.full_keys_remaining ?? 0);
  const spots = Number(campaign.participant_capacity) - Number(campaign.participant_count ?? 0);
  const bounties: any[] = campaign.bounties ?? [];
  const totalXp = bounties.reduce((a: number, b: any) => a + Number(b.xp_reward ?? 0), 0);

  return (
    <div
      className="rounded-2xl overflow-hidden cursor-pointer group transition-all hover:scale-[1.01]"
      style={{ background: CARD_BG, border: `1px solid ${isGF ? "rgba(183,255,24,0.18)" : CARD_BORDER}` }}
      onClick={onClick}
    >
      {/* Artwork / Banner */}
      <div className="relative h-28 overflow-hidden">
        {campaign.game_artwork_url ? (
          <img src={campaign.game_artwork_url} alt={campaign.game_name} className="w-full h-full object-cover opacity-70 group-hover:opacity-90 transition-opacity" />
        ) : isGF ? (
          <div className="w-full h-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, rgba(183,255,24,0.10) 0%, rgba(183,255,24,0.03) 100%)" }}>
            <Target size={32} color="rgba(183,255,24,0.25)" />
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.02)" }}>
            <Target size={28} color="rgba(255,255,255,0.1)" />
          </div>
        )}
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(7,11,16,0.9) 0%, transparent 60%)" }} />

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-wrap gap-1">
          {isGF ? (
            <span className="flex items-center gap-1 text-[9px] font-black px-1.5 py-0.5 rounded-full"
              style={{ color: "#070b10", background: NEON }}>
              <Target size={8} /> Gamefolio
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[9px] font-black px-1.5 py-0.5 rounded-full"
              style={{ color: "#070b10", background: NEON }}>
              <ShieldCheck size={8} /> GF Verified
            </span>
          )}
          {campaign.recommended && (
            <span className="flex items-center gap-1 text-[9px] font-black px-1.5 py-0.5 rounded-full"
              style={{ color: "#f59e0b", background: "rgba(245,158,11,0.18)" }}>
              <Star size={8} /> Recommended
            </span>
          )}
        </div>

        {/* Duration / ongoing */}
        <div className="absolute bottom-2 right-2 text-[10px] font-bold text-white/60 flex items-center gap-1">
          <Clock size={9} />
          {isGF ? "Always open" : campaign.end_date ? timeRemaining(campaign.end_date) : `${campaign.duration}d campaign`}
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* Title */}
        <div>
          {!isGF && <div className="text-[10px] font-bold uppercase tracking-wider text-white/40 mb-0.5">{campaign.game_name}</div>}
          <div className="text-base font-black text-white leading-tight">{campaign.template_name}</div>
          {campaign.description && (
            <div className="text-[11px] text-white/50 mt-1 line-clamp-2">{campaign.description}</div>
          )}
        </div>

        {/* Rewards row */}
        <div className="flex flex-wrap gap-1.5">
          {isGF ? (
            <>
              {totalXp > 0 && (
                <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg"
                  style={{ color: NEON, background: "rgba(183,255,24,0.1)" }}>
                  <Zap size={9} /> {totalXp.toLocaleString()} XP
                </span>
              )}
              <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg"
                style={{ color: "#a78bfa", background: "rgba(167,139,250,0.1)" }}>
                <Trophy size={9} /> Badge reward
              </span>
              <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg"
                style={{ color: "#94a3b8", background: "rgba(148,163,184,0.08)" }}>
                <Users size={9} /> Open to all
              </span>
            </>
          ) : (
            <>
              <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg"
                style={{ color: demoLeft > 0 ? NEON : "#6b7280", background: demoLeft > 0 ? "rgba(183,255,24,0.1)" : "rgba(107,114,128,0.1)" }}>
                <Key size={9} /> {demoLeft > 0 ? `${demoLeft} demo keys` : "No demo keys"}
              </span>
              <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg"
                style={{ color: fullLeft > 0 ? "#4ade80" : "#6b7280", background: fullLeft > 0 ? "rgba(74,222,128,0.1)" : "rgba(107,114,128,0.1)" }}>
                <Gift size={9} /> {fullLeft > 0 ? `${fullLeft} full-game keys` : "No full keys"}
              </span>
              <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg"
                style={{ color: "#94a3b8", background: "rgba(148,163,184,0.08)" }}>
                <Users size={9} /> {Math.max(0, spots)} places
              </span>
            </>
          )}
        </div>

        {/* Bounty type chips */}
        {bounties.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {[...new Set(bounties.map((b: any) => b.content_type).filter(Boolean))].slice(0, 4).map((ct: any) => {
              const Icon = CONTENT_TYPE_ICON[ct] ?? Target;
              return (
                <span key={ct} className="flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-md font-bold"
                  style={{ color: "rgba(255,255,255,0.5)", background: "rgba(255,255,255,0.06)" }}>
                  <Icon size={8} /> {CONTENT_TYPE_LABEL[ct] ?? ct}
                </span>
              );
            })}
          </div>
        )}

        {/* CTA */}
        <button
          className="w-full py-2.5 rounded-xl text-sm font-black flex items-center justify-center gap-1.5 transition-all hover:brightness-110"
          style={{ background: NEON, color: "#070b10" }}
          onClick={(e) => { e.stopPropagation(); onClick(); }}
        >
          {isGF
            ? <><Zap size={14} /> Join & Earn XP</>
            : demoLeft > 0
              ? <><Key size={14} /> View & Join</>
              : <><ChevronRight size={14} /> View Campaign</>}
        </button>
      </div>
    </div>
  );
}

function CampaignDetail({ campaign, onBack, onJoined }: { campaign: any; onBack: () => void; onJoined: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [accepted, setAccepted] = useState(false);

  const isGF = !!campaign.gamefolio_managed;
  const bounties: any[] = campaign.bounties ?? [];
  const mandatory = bounties.filter((b: any) => b.mandatory);
  const optional = bounties.filter((b: any) => !b.mandatory);
  const totalXp = bounties.reduce((acc: number, b: any) => acc + Number(b.xp_reward ?? 0), 0);
  const demoLeft = Number(campaign.demo_keys_remaining ?? 0);
  const fullLeft = Number(campaign.full_keys_remaining ?? 0);
  const spots = Number(campaign.participant_capacity) - Number(campaign.participant_count ?? 0);

  const joinMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/bounties/${campaign.id}/join`, {}),
    onSuccess: async (res) => {
      const data = await res.json();
      qc.invalidateQueries({ queryKey: ["/api/bounties/my/campaigns"] });
      toast({ title: "Joined!", description: data.message });
      onJoined();
    },
    onError: async (err: any) => {
      const msg = err?.message ?? "Failed to join campaign";
      toast({ title: "Could not join", description: msg, variant: "destructive" });
    },
  });

  return (
    <div className="min-h-screen" style={{ background: PAGE_BG }}>
      {/* Back button */}
      <button onClick={onBack} className="flex items-center gap-2 p-4 text-white/50 hover:text-white transition-colors text-sm font-bold">
        <ChevronLeft size={16} /> Back to Marketplace
      </button>

      {/* Hero */}
      <div className="relative h-48 overflow-hidden">
        {campaign.game_artwork_url ? (
          <img src={campaign.game_artwork_url} alt={campaign.game_name} className="w-full h-full object-cover opacity-40" />
        ) : isGF ? (
          <div className="w-full h-full" style={{ background: "linear-gradient(135deg, rgba(183,255,24,0.08) 0%, rgba(183,255,24,0.02) 100%)" }} />
        ) : (
          <div className="w-full h-full" style={{ background: "linear-gradient(135deg, rgba(96,165,250,0.06) 0%, transparent 100%)" }} />
        )}
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, #070b10 0%, transparent 50%)" }} />
        <div className="absolute bottom-4 left-4">
          <div className="flex items-center gap-2 mb-1">
            {isGF ? (
              <span className="flex items-center gap-1 text-[10px] font-black px-1.5 py-0.5 rounded-full"
                style={{ color: "#070b10", background: NEON }}>
                <Target size={8} /> Gamefolio Bounty
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[10px] font-black px-1.5 py-0.5 rounded-full"
                style={{ color: "#070b10", background: NEON }}>
                <ShieldCheck size={8} /> Gamefolio Verified
              </span>
            )}
          </div>
          {!isGF && <div className="text-white/50 text-xs font-bold mb-0.5">{campaign.game_name}</div>}
          <div className="text-2xl font-black text-white">{campaign.template_name}</div>
        </div>
      </div>

      <div className="px-4 pb-8 space-y-5 max-w-2xl mx-auto">
        {/* Stats row — different for GF-managed vs indie */}
        {isGF ? (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "XP Reward", value: totalXp > 0 ? `${totalXp.toLocaleString()} XP` : "XP", icon: Zap, color: NEON },
              { label: "Bounties", value: bounties.length, icon: Target, color: "#60a5fa" },
              { label: "Open to", value: "All", icon: Users, color: "#a78bfa" },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="rounded-xl p-3 text-center" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
                <Icon size={16} color={color} className="mx-auto mb-1" />
                <div className="text-sm font-black" style={{ color }}>{value}</div>
                <div className="text-[10px] text-white/40 font-bold">{label}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Demo Keys", value: demoLeft, icon: Key, color: NEON },
              { label: "Full Keys", value: fullLeft, icon: Gift, color: "#4ade80" },
              { label: "Places Left", value: Math.max(0, spots), icon: Users, color: "#60a5fa" },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="rounded-xl p-3 text-center" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
                <Icon size={16} color={color} className="mx-auto mb-1" />
                <div className="text-lg font-black" style={{ color }}>{value}</div>
                <div className="text-[10px] text-white/40 font-bold">{label}</div>
              </div>
            ))}
          </div>
        )}

        {/* About */}
        {campaign.description && (
          <div className="rounded-xl p-4" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
            <div className="text-xs font-bold uppercase tracking-wider text-white/40 mb-2">About this Campaign</div>
            <div className="text-sm text-white/70">{campaign.description}</div>
            {campaign.best_use_case && (
              <div className="mt-2 text-xs text-white/40 italic">{campaign.best_use_case}</div>
            )}
          </div>
        )}

        {/* Reward structure */}
        <div className="rounded-xl p-4 space-y-3" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
          <div className="text-xs font-bold uppercase tracking-wider text-white/40">Reward Structure</div>
          {isGF ? (
            <>
              {totalXp > 0 && (
                <div className="rounded-lg p-3 space-y-1" style={{ background: "rgba(183,255,24,0.06)", border: "1px solid rgba(183,255,24,0.15)" }}>
                  <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: NEON }}>XP Reward</div>
                  <div className="text-sm text-white font-bold flex items-center gap-2"><Zap size={14} color={NEON} /> {totalXp.toLocaleString()} XP total across all bounties</div>
                </div>
              )}
              <div className="rounded-lg p-3 space-y-1" style={{ background: "rgba(167,139,250,0.06)", border: "1px solid rgba(167,139,250,0.15)" }}>
                <div className="text-[10px] font-bold uppercase tracking-wider text-purple-400">Completion Reward</div>
                <div className="text-sm text-white font-bold flex items-center gap-2">
                  <Trophy size={14} className="text-purple-400" />
                  {campaign.completion_reward_description ?? "Profile badge on completion"}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="rounded-lg p-3 space-y-1" style={{ background: "rgba(183,255,24,0.06)", border: "1px solid rgba(183,255,24,0.15)" }}>
                <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: NEON }}>Access Reward</div>
                <div className="text-sm text-white font-bold flex items-center gap-2"><Key size={14} color={NEON} /> 1 Steam demo key when you join</div>
              </div>
              <div className="rounded-lg p-3 space-y-1" style={{ background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.15)" }}>
                <div className="text-[10px] font-bold uppercase tracking-wider text-green-400">Completion Reward</div>
                <div className="text-sm text-white font-bold flex items-center gap-2">
                  <Gift size={14} className="text-green-400" />
                  {campaign.completion_reward_description ?? "1 full-game key after all mandatory bounties are verified"}
                </div>
              </div>
              {totalXp > 0 && (
                <div className="rounded-lg p-3 space-y-1" style={{ background: "rgba(96,165,250,0.06)", border: "1px solid rgba(96,165,250,0.15)" }}>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-blue-400">Additional Rewards</div>
                  <div className="text-sm text-white font-bold flex items-center gap-2"><Zap size={14} className="text-blue-400" /> {totalXp.toLocaleString()} XP total</div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Mandatory bounties */}
        {mandatory.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-white/40">Required Bounties</div>
            {mandatory.map((b: any) => {
              const Icon = CONTENT_TYPE_ICON[b.content_type] ?? Target;
              return (
                <div key={b.id} className="flex items-center gap-3 rounded-xl p-3" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(183,255,24,0.1)" }}>
                    <Icon size={14} color={NEON} />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-bold text-white">{b.title}</div>
                    {b.description && <div className="text-[11px] text-white/50">{b.description}</div>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-[10px] font-black" style={{ color: NEON }}>×{b.quantity}</div>
                    {b.xp_reward > 0 && <div className="text-[10px] text-white/40">+{b.xp_reward} XP</div>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {optional.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-white/40">Optional Bounties</div>
            {optional.map((b: any) => {
              const Icon = CONTENT_TYPE_ICON[b.content_type] ?? Target;
              return (
                <div key={b.id} className="flex items-center gap-3 rounded-xl p-3 opacity-70" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,255,255,0.04)" }}>
                    <Icon size={14} className="text-white/40" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-bold text-white/70">{b.title}</div>
                    {b.description && <div className="text-[11px] text-white/40">{b.description}</div>}
                  </div>
                  <div className="text-[10px] text-white/30">Optional</div>
                </div>
              );
            })}
          </div>
        )}

        {/* Terms + Join */}
        {user ? (
          <>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={accepted}
                onChange={e => setAccepted(e.target.checked)}
                className="mt-0.5 accent-[#B7FF18]"
              />
              <span className="text-sm text-white/60">
                I agree to the Gamefolio Bounty Programme terms. I understand that Gamefolio will verify my submissions and that demo and full-game keys are single-use and non-transferable.
              </span>
            </label>
            <button
              disabled={!accepted || joinMutation.isPending || (!isGF && demoLeft === 0)}
              onClick={() => joinMutation.mutate()}
              className="w-full py-4 rounded-xl text-base font-black flex items-center justify-center gap-2 transition-all disabled:opacity-50 hover:brightness-110"
              style={{ background: NEON, color: "#070b10" }}
            >
              {joinMutation.isPending
                ? <><Loader2 size={18} className="animate-spin" /> Joining...</>
                : isGF
                  ? <><Zap size={18} /> Join & Start Earning XP</>
                  : demoLeft === 0
                    ? "No Demo Keys Available"
                    : <><Key size={18} /> Join Campaign & Claim Demo Key</>}
            </button>
          </>
        ) : (
          <div className="rounded-xl p-4 text-center" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
            <Lock size={20} className="mx-auto mb-2 text-white/30" />
            <div className="text-sm font-bold text-white/60 mb-1">Sign in to join this campaign</div>
            <a href="/auth" className="text-sm font-black" style={{ color: NEON }}>Sign In →</a>
          </div>
        )}
      </div>
    </div>
  );
}

function CampaignProgress({ campaign: cp, onBack }: { campaign: any; onBack: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [copiedDemo, setCopiedDemo] = useState(false);
  const [copiedFull, setCopiedFull] = useState(false);
  const [expandedBounty, setExpandedBounty] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState<number | null>(null);
  const [submitUrl, setSubmitUrl] = useState("");

  const { data: progress, isLoading } = useQuery<any>({
    queryKey: ["/api/bounties/my", cp.instance_id],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const claimFullMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/bounties/my/${cp.instance_id}/claim-full-key`, {}),
    onSuccess: async (res) => {
      const data = await res.json();
      qc.invalidateQueries({ queryKey: ["/api/bounties/my/campaigns"] });
      qc.invalidateQueries({ queryKey: ["/api/bounties/my", cp.instance_id] });
      toast({ title: "🎉 Full-game key claimed!", description: `Your key: ${data.fullKey}` });
    },
    onError: async (err: any) => {
      toast({ title: "Could not claim key", description: err?.message ?? "Error", variant: "destructive" });
    },
  });

  const submitMutation = useMutation({
    mutationFn: ({ bountyId, url }: { bountyId: number; url: string }) =>
      apiRequest("POST", `/api/bounties/my/${cp.instance_id}/submit/${bountyId}`, { contentUrl: url }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/bounties/my", cp.instance_id] });
      qc.invalidateQueries({ queryKey: ["/api/bounties/my/campaigns"] });
      setSubmitting(null);
      setSubmitUrl("");
      toast({ title: "Submitted for review", description: "Gamefolio will verify your submission" });
    },
    onError: async (err: any) => {
      toast({ title: "Submission failed", description: err?.message ?? "Error", variant: "destructive" });
    },
  });

  const copyKey = (key: string, setter: (v: boolean) => void) => {
    navigator.clipboard.writeText(key).then(() => {
      setter(true);
      setTimeout(() => setter(false), 2000);
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: PAGE_BG }}>
        <Loader2 size={28} className="animate-spin text-white/30" />
      </div>
    );
  }

  const data = progress ?? cp;
  const bounties: any[] = data.bounties ?? [];
  const mandatory = bounties.filter((b: any) => b.mandatory);
  const optional = bounties.filter((b: any) => !b.mandatory);
  const approvedCount = mandatory.filter((b: any) => Number(b.approved_count ?? 0) >= Number(b.quantity ?? 1)).length;
  const pct = mandatory.length > 0 ? Math.round((approvedCount / mandatory.length) * 100) : 0;
  const statusCfg = STATUS_CONFIG[data.participant_status] ?? STATUS_CONFIG.enrolled;
  const canClaimFull = pct === 100 && !data.full_key_value;
  const allApproved = pct === 100;

  return (
    <div className="min-h-screen" style={{ background: PAGE_BG }}>
      <button onClick={onBack} className="flex items-center gap-2 p-4 text-white/50 hover:text-white transition-colors text-sm font-bold">
        <ChevronLeft size={16} /> Back to My Campaigns
      </button>

      {/* Campaign header */}
      <div className="relative h-36 overflow-hidden">
        {data.game_artwork_url ? (
          <img src={data.game_artwork_url} alt="" className="w-full h-full object-cover opacity-30" />
        ) : (
          <div className="w-full h-full" style={{ background: "rgba(183,255,24,0.04)" }} />
        )}
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, #070b10 0%, transparent 60%)" }} />
        <div className="absolute bottom-4 left-4">
          <div className="text-white/40 text-[11px] font-bold">{data.game_name}</div>
          <div className="text-xl font-black text-white">{data.template_name ?? cp.template_name}</div>
          <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full mt-1"
            style={{ color: statusCfg.color, background: statusCfg.bg }}>
            {statusCfg.label}
          </span>
        </div>
      </div>

      <div className="px-4 pb-8 space-y-4 max-w-2xl mx-auto">
        {/* Progress bar */}
        <div className="rounded-xl p-4" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-black text-white">Mandatory Progress</div>
            <div className="text-sm font-black" style={{ color: NEON }}>{approvedCount}/{mandatory.length}</div>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: NEON }} />
          </div>
          {data.deadline && (
            <div className="text-[11px] text-white/40 mt-2 flex items-center gap-1">
              <Clock size={10} /> Deadline: {new Date(data.deadline).toLocaleDateString()}
            </div>
          )}
        </div>

        {/* Demo Key */}
        {data.demo_key_value && (
          <div className="rounded-xl p-4" style={{ background: "rgba(183,255,24,0.06)", border: "1px solid rgba(183,255,24,0.2)" }}>
            <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: NEON }}>Your Demo Key</div>
            <div className="flex items-center gap-2">
              <div className="flex-1 font-mono text-sm text-white bg-black/30 rounded-lg px-3 py-2 break-all">{data.demo_key_value}</div>
              <button onClick={() => copyKey(data.demo_key_value, setCopiedDemo)}
                className="p-2 rounded-lg transition-colors hover:bg-white/10">
                {copiedDemo ? <Check size={16} color={NEON} /> : <Copy size={16} className="text-white/60" />}
              </button>
              {data.game_steam_app_id && (
                <a href={`https://store.steampowered.com/app/${data.game_steam_app_id}`} target="_blank" rel="noopener noreferrer"
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                  <SiSteam size={16} className="text-white/60" />
                </a>
              )}
            </div>
          </div>
        )}

        {/* Full Key or CTA */}
        {data.full_key_value ? (
          <div className="rounded-xl p-4" style={{ background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.2)" }}>
            <div className="text-[10px] font-bold uppercase tracking-wider text-green-400 mb-2">Full-Game Key Earned!</div>
            <div className="flex items-center gap-2">
              <div className="flex-1 font-mono text-sm text-white bg-black/30 rounded-lg px-3 py-2 break-all">{data.full_key_value}</div>
              <button onClick={() => copyKey(data.full_key_value, setCopiedFull)}
                className="p-2 rounded-lg transition-colors hover:bg-white/10">
                {copiedFull ? <Check size={16} className="text-green-400" /> : <Copy size={16} className="text-white/60" />}
              </button>
            </div>
          </div>
        ) : canClaimFull ? (
          <button
            onClick={() => claimFullMutation.mutate()}
            disabled={claimFullMutation.isPending}
            className="w-full py-3.5 rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-all hover:brightness-110"
            style={{ background: "#4ade80", color: "#052e16" }}
          >
            {claimFullMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Gift size={16} />}
            Claim Your Full-Game Key
          </button>
        ) : allApproved ? (
          <div className="rounded-xl p-3 text-center text-sm text-white/50" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
            All bounties approved — claim your full-game key above
          </div>
        ) : null}

        {/* Mandatory Bounties */}
        {mandatory.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-white/40">Required Bounties</div>
            {mandatory.map((b: any) => {
              const Icon = CONTENT_TYPE_ICON[b.content_type] ?? Target;
              const approved = Number(b.approved_count ?? 0);
              const qty = Number(b.quantity ?? 1);
              const done = approved >= qty;
              const subs: any[] = b.submissions ?? [];
              const lastSub = subs[0];
              const isExpanded = expandedBounty === b.id;
              const isSubmitting = submitting === b.id;

              const subStatusCfg = lastSub ? (STATUS_CONFIG[lastSub.status] ?? { label: lastSub.status, color: "#94a3b8", bg: "" }) : null;

              return (
                <div key={b.id} className="rounded-xl overflow-hidden" style={{ background: CARD_BG, border: `1px solid ${done ? "rgba(74,222,128,0.3)" : CARD_BORDER}` }}>
                  <div className="flex items-center gap-3 p-3 cursor-pointer" onClick={() => setExpandedBounty(isExpanded ? null : b.id)}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: done ? "rgba(74,222,128,0.12)" : "rgba(183,255,24,0.08)" }}>
                      {done ? <Check size={14} className="text-green-400" /> : <Icon size={14} color={NEON} />}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-bold text-white">{b.title}</div>
                      {subStatusCfg && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                          style={{ color: subStatusCfg.color, background: subStatusCfg.bg }}>
                          {subStatusCfg.label}
                        </span>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-black" style={{ color: done ? "#4ade80" : NEON }}>{approved}/{qty}</div>
                      <ChevronRight size={14} className={`text-white/30 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-3 pb-3 border-t border-white/05 pt-3 space-y-3">
                      {b.description && <div className="text-xs text-white/50">{b.description}</div>}

                      {/* Submission history */}
                      {subs.length > 0 && (
                        <div className="space-y-1.5">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-white/30">Submissions</div>
                          {subs.map((s: any, i: number) => {
                            const sCfg = STATUS_CONFIG[s.status] ?? { label: s.status, color: "#94a3b8", bg: "" };
                            return (
                              <div key={i} className="flex items-center gap-2 rounded-lg p-2" style={{ background: "rgba(255,255,255,0.03)" }}>
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ color: sCfg.color, background: sCfg.bg }}>{sCfg.label}</span>
                                {s.content_url && <a href={s.content_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-white/40 hover:text-white truncate max-w-[160px]">{s.content_url}</a>}
                                {s.review_notes && <div className="text-[10px] text-orange-400 ml-auto">{s.review_notes}</div>}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Submit button/form */}
                      {!done && (
                        isSubmitting ? (
                          <div className="space-y-2">
                            <input
                              value={submitUrl}
                              onChange={e => setSubmitUrl(e.target.value)}
                              placeholder="Paste content URL or Gamefolio link"
                              className="w-full px-3 py-2 rounded-lg text-sm text-white bg-black/30 border border-white/10 focus:border-white/30 outline-none"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => submitMutation.mutate({ bountyId: b.id, url: submitUrl })}
                                disabled={!submitUrl.trim() || submitMutation.isPending}
                                className="flex-1 py-2 rounded-lg text-sm font-black transition-all hover:brightness-110 disabled:opacity-50"
                                style={{ background: NEON, color: "#070b10" }}>
                                {submitMutation.isPending ? <Loader2 size={14} className="animate-spin mx-auto" /> : "Submit"}
                              </button>
                              <button onClick={() => { setSubmitting(null); setSubmitUrl(""); }}
                                className="px-4 py-2 rounded-lg text-sm text-white/50 border border-white/10 hover:text-white">
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => setSubmitting(b.id)}
                            className="w-full py-2 rounded-lg text-sm font-black transition-all hover:brightness-110"
                            style={{ background: "rgba(183,255,24,0.1)", color: NEON, border: `1px solid rgba(183,255,24,0.2)` }}>
                            Submit Content
                          </button>
                        )
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Optional */}
        {optional.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-white/40">Optional Bounties</div>
            {optional.map((b: any) => {
              const Icon = CONTENT_TYPE_ICON[b.content_type] ?? Target;
              const approved = Number(b.approved_count ?? 0);
              const qty = Number(b.quantity ?? 1);
              const done = approved >= qty;
              return (
                <div key={b.id} className="flex items-center gap-3 p-3 rounded-xl opacity-70" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,255,255,0.04)" }}>
                    {done ? <Check size={14} className="text-green-400" /> : <Icon size={14} className="text-white/40" />}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-bold text-white/70">{b.title}</div>
                  </div>
                  <div className="text-sm font-black text-white/40">{approved}/{qty}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function MyCampaigns({ onViewProgress }: { onViewProgress: (campaign: any) => void }) {
  const [myTab, setMyTab] = useState<MyTab>("active");
  const { user } = useAuth();

  const { data: campaigns = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/bounties/my/campaigns"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!user,
  });

  const filter = (statuses: string[]) => (campaigns as any[]).filter(c => statuses.includes(c.participant_status));
  const tabs: { key: MyTab; label: string; statuses: string[] }[] = [
    { key: "active",    label: "Active",    statuses: ["enrolled", "demo_key_claimed", "in_progress", "changes_requested"] },
    { key: "submitted", label: "Submitted", statuses: ["submitted_for_review"] },
    { key: "completed", label: "Completed", statuses: ["completed_and_verified", "completed", "full_game_awarded"] },
    { key: "expired",   label: "Expired",   statuses: ["rejected", "expired", "cancelled"] },
  ];

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-3">
        <Lock size={32} className="text-white/20" />
        <div className="text-white/40 font-bold">Sign in to see your campaigns</div>
        <a href="/auth" className="text-sm font-black" style={{ color: NEON }}>Sign In →</a>
      </div>
    );
  }

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-white/30" /></div>;
  }

  const currentCampaigns = filter(tabs.find(t => t.key === myTab)!.statuses);

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.04)" }}>
        {tabs.map(t => {
          const count = filter(t.statuses).length;
          return (
            <button key={t.key} onClick={() => setMyTab(t.key)}
              className="flex-1 py-2 rounded-lg text-xs font-bold transition-all relative"
              style={myTab === t.key
                ? { background: NEON, color: "#070b10" }
                : { color: "rgba(255,255,255,0.5)" }}>
              {t.label}
              {count > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center"
                  style={{ background: myTab === t.key ? "#070b10" : NEON, color: myTab === t.key ? NEON : "#070b10" }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {currentCampaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-2">
          <Trophy size={28} className="text-white/20" />
          <div className="text-white/40 text-sm font-bold">No {myTab} campaigns</div>
          {myTab === "active" && <div className="text-white/30 text-xs">Browse the Marketplace to find and join campaigns</div>}
        </div>
      ) : (
        <div className="space-y-3">
          {currentCampaigns.map((c: any) => {
            const statusCfg = STATUS_CONFIG[c.participant_status] ?? STATUS_CONFIG.enrolled;
            const mandatory = Number(c.mandatory_bounty_count ?? 0);
            const approved = Number(c.approved_bounties ?? 0);
            const pct = mandatory > 0 ? Math.round((approved / mandatory) * 100) : 0;

            return (
              <div key={c.instance_id} className="rounded-xl p-4 space-y-3" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
                <div className="flex items-start gap-3">
                  {c.game_artwork_url ? (
                    <img src={c.game_artwork_url} alt="" className="w-12 h-14 object-cover rounded-lg flex-shrink-0" />
                  ) : (
                    <div className="w-12 h-14 rounded-lg flex-shrink-0 flex items-center justify-center" style={{ background: "rgba(183,255,24,0.06)" }}>
                      <Target size={18} color="rgba(183,255,24,0.3)" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] text-white/40 font-bold">{c.game_name}</div>
                    <div className="text-sm font-black text-white leading-tight">{c.template_name}</div>
                    <span className="inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-full mt-1"
                      style={{ color: statusCfg.color, background: statusCfg.bg }}>
                      {statusCfg.label}
                    </span>
                  </div>
                </div>

                {/* Progress */}
                {mandatory > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-[11px] text-white/40">Bounty Progress</div>
                      <div className="text-[11px] font-black" style={{ color: NEON }}>{approved}/{mandatory}</div>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: NEON }} />
                    </div>
                  </div>
                )}

                {/* Demo key status */}
                {c.demo_key_value && (
                  <div className="text-[11px] flex items-center gap-1.5" style={{ color: NEON }}>
                    <Key size={11} /> Demo key active
                  </div>
                )}
                {c.full_key_value && (
                  <div className="text-[11px] flex items-center gap-1.5 text-green-400">
                    <Gift size={11} /> Full-game key claimed
                  </div>
                )}

                <button
                  onClick={() => onViewProgress(c)}
                  className="w-full py-2.5 rounded-xl text-sm font-black flex items-center justify-center gap-1.5 transition-all hover:brightness-110"
                  style={{ background: NEON, color: "#070b10" }}>
                  <ChevronRight size={15} />
                  {myTab === "completed" ? "View Campaign" : "Continue Campaign"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function BountiesPage() {
  const [mainTab, setMainTab] = useState<MainTab>("marketplace");
  const [view, setView] = useState<View>("marketplace");
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [progressCampaign, setProgressCampaign] = useState<any>(null);
  const [filter, setFilter] = useState("all");

  const { data: campaigns = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/bounties"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const FILTERS = [
    { key: "all",          label: "All" },
    { key: "gamefolio",    label: "🎮 Gamefolio" },
    { key: "recommended",  label: "Recommended" },
    { key: "indie",        label: "Indie Games" },
    { key: "demo_available", label: "Demo Available" },
    { key: "full_game",    label: "Full-Game Reward" },
  ];

  const filtered = filter === "all" ? campaigns :
    filter === "gamefolio" ? campaigns.filter((c: any) => c.gamefolio_managed) :
    filter === "indie" ? campaigns.filter((c: any) => !c.gamefolio_managed) :
    filter === "recommended" ? campaigns.filter((c: any) => c.recommended) :
    filter === "demo_available" ? campaigns.filter((c: any) => Number(c.demo_keys_remaining) > 0) :
    filter === "full_game" ? campaigns.filter((c: any) => c.completion_reward === "full_game_key") :
    campaigns;

  // Campaign Detail view
  if (view === "detail" && selectedCampaign) {
    return (
      <CampaignDetail
        campaign={selectedCampaign}
        onBack={() => { setView("marketplace"); setSelectedCampaign(null); }}
        onJoined={() => { setView("marketplace"); setMainTab("my"); setSelectedCampaign(null); }}
      />
    );
  }

  // Campaign Progress view
  if (view === "progress" && progressCampaign) {
    return (
      <CampaignProgress
        campaign={progressCampaign}
        onBack={() => { setView("marketplace"); setMainTab("my"); setProgressCampaign(null); }}
      />
    );
  }

  return (
    <div className="min-h-screen" style={{ background: PAGE_BG }}>
      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(183,255,24,0.12)" }}>
            <Target size={20} color={NEON} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">Bounties</h1>
            <div className="text-xs text-white/40">Play games. Complete bounties. Earn rewards.</div>
          </div>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="px-4 mb-4">
        <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: "rgba(255,255,255,0.04)" }}>
          {[
            { key: "marketplace", label: "Marketplace" },
            { key: "my",          label: "My Campaigns" },
          ].map(t => (
            <button key={t.key} onClick={() => setMainTab(t.key as MainTab)}
              className="px-5 py-2 rounded-lg text-sm font-bold transition-all"
              style={mainTab === t.key
                ? { background: NEON, color: "#070b10" }
                : { color: "rgba(255,255,255,0.5)" }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pb-8">
        {mainTab === "marketplace" ? (
          <>
            {/* Filter chips */}
            <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide mb-4">
              {FILTERS.map(f => (
                <button key={f.key} onClick={() => setFilter(f.key)}
                  className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all"
                  style={filter === f.key
                    ? { background: NEON, color: "#070b10" }
                    : { background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)", border: `1px solid ${CARD_BORDER}` }}>
                  {f.label}
                </button>
              ))}
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 size={28} className="animate-spin text-white/30" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-4 text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "rgba(183,255,24,0.08)" }}>
                  <Target size={28} color="rgba(183,255,24,0.4)" />
                </div>
                <div>
                  <div className="text-white font-black text-lg mb-1">No live campaigns yet</div>
                  <div className="text-white/40 text-sm max-w-xs">
                    Gamefolio Bounty Campaigns are created by indie developers and verified by Gamefolio.
                    Check back soon — campaigns are being added regularly.
                  </div>
                </div>
                <div className="rounded-xl p-4 max-w-xs text-left space-y-2" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-white/30">How it works</div>
                  {["Join a campaign and claim a free demo key", "Complete the required bounties (clips, screenshots, feedback)", "Get verified by Gamefolio and earn a full-game key + XP"].map((s, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-white/60">
                      <span className="w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ background: "rgba(183,255,24,0.15)", color: NEON }}>{i + 1}</span>
                      {s}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filtered.map((c: any) => (
                  <CampaignCard
                    key={c.id}
                    campaign={c}
                    onClick={() => { setSelectedCampaign(c); setView("detail"); }}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <MyCampaigns
            onViewProgress={(c) => { setProgressCampaign(c); setView("progress"); }}
          />
        )}
      </div>
    </div>
  );
}
