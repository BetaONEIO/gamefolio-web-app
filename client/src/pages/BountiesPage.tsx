import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import {
  Target, ShieldCheck, Clock, Users, Key, ChevronRight, ChevronLeft,
  Zap, Copy, Check, Loader2, Lock,
  Film, Camera, MessageSquare, Star, AlertCircle,
  Trophy, Gift, Search, SlidersHorizontal, X, ChevronDown,
} from "lucide-react";
import { SiSteam } from "react-icons/si";

const NEON = "#B8FF1B";
const PAGE_BG = "#070b10";
const CARD_BG = "#0e1520";
const CARD_BORDER = "rgba(255,255,255,0.10)";

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

// ── Build requirement checklist from bounties ────────────────────────────────────────────────────
function bountyRequirements(bounties: any[]): string[] {
  const reqs: string[] = [];
  const seen = new Set<string>();
  for (const b of bounties) {
    const qty = Number(b.quantity ?? 1);
    const ct = b.content_type as string;
    if (seen.has(ct)) continue;
    seen.add(ct);
    if (ct === "clip")       reqs.push(`Upload ${qty} Gameplay Clip${qty !== 1 ? "s" : ""}`);
    else if (ct === "screenshot") reqs.push(`Upload ${qty} Screenshot${qty !== 1 ? "s" : ""}`);
    else if (ct === "feedback")   reqs.push("Submit Feedback");
    else if (ct === "reel")       reqs.push(`Upload ${qty} Reel${qty !== 1 ? "s" : ""}`);
    else if (ct === "stream")     reqs.push("Go Live on Stream");
    else if (ct === "session")    reqs.push("Complete a Play Session");
    else if (ct === "bug")        reqs.push(`File ${qty} Bug Report${qty !== 1 ? "s" : ""}`);
    else reqs.push(ct.charAt(0).toUpperCase() + ct.slice(1));
  }
  return reqs;
}

// ── Reward column ─────────────────────────────────────────────────────────
function RewardCol({ icon, label, value, active }: { icon: any; label: string; value: string; active: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1.5 py-3 rounded-xl"
      style={{ background: active ? "rgba(184,255,27,0.07)" : "rgba(255,255,255,0.04)", border: `1px solid ${active ? "rgba(184,255,27,0.20)" : "rgba(255,255,255,0.07)"}` }}>
      <div className="w-[54px] h-[54px] flex items-center justify-center">{icon}</div>
      <span className="text-[11px] font-black leading-tight text-center px-1" style={{ color: active ? NEON : "rgba(255,255,255,0.85)" }}>{value}</span>
      <span className="text-[9px] leading-tight text-center px-1" style={{ color: "rgba(255,255,255,0.32)" }}>{label}</span>
    </div>
  );
}

// ── Campaign card ─────────────────────────────────────────────────────────
function CampaignCard({ campaign, onClick }: { campaign: any; onClick: () => void }) {
  const demoLeft  = Number(campaign.demo_keys_remaining ?? 0);
  const fullLeft  = Number(campaign.full_keys_remaining ?? 0);
  const bounties: any[] = campaign.bounties ?? [];
  const reqs = bountyRequirements(bounties);
  const totalXP = campaign.total_campaign_xp ?? 0;

  return (
    <div
      className="rounded-2xl overflow-hidden cursor-pointer group transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/40"
      style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}
      onClick={onClick}
    >
      {/* Hero artwork */}
      <div className="relative h-48 overflow-hidden">
        {campaign.game_artwork_url ? (
          <img src={campaign.game_artwork_url} alt={campaign.game_name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
        ) : (
          <div className="w-full h-full flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #0d1624 0%, #0a1020 100%)" }}>
            <Target size={44} color="rgba(184,255,27,0.12)" />
          </div>
        )}
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, #0e1520 0%, rgba(14,21,32,0.18) 60%, transparent 100%)" }} />
        <div className="absolute top-3 left-3">
          <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full"
            style={{ background: NEON, color: "#070b10" }}>
            <ShieldCheck size={9} /> GF Verified
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="px-5 pb-5 pt-4 space-y-4">
        {/* Title */}
        <div>
          <h3 className="text-lg font-black text-white leading-tight tracking-tight">
            {campaign.game_name || campaign.template_name}
          </h3>
          {campaign.description && (
            <p className="text-[12px] mt-1 line-clamp-1" style={{ color: "rgba(255,255,255,0.45)" }}>
              {campaign.description}
            </p>
          )}
        </div>

        {/* Requirements checklist */}
        {reqs.length > 0 && (
          <div className="space-y-2">
            {reqs.map((req, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <span className="flex-shrink-0 w-[6px] h-[6px] rounded-full"
                  style={{ background: NEON, boxShadow: "0 0 6px rgba(184,255,27,0.55)" }} />
                <span className="text-[12px] font-medium leading-snug" style={{ color: "rgba(255,255,255,0.75)" }}>
                  {req}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Big XP badge */}
        {totalXP > 0 && (
          <div className="flex items-center gap-2">
            <Zap size={16} color={NEON} />
            <span className="text-sm font-black" style={{ color: NEON }}>
              Earn up to {totalXP.toLocaleString()} XP
            </span>
          </div>
        )}

        {/* Rewards — 4 equal columns */}
        <div className="grid grid-cols-4 gap-2">
          <RewardCol icon={<img src="/icons/demo-key-icon.png" alt="Demo" className="w-[45px] h-[45px] object-contain" />} label="Demo Key"  value={demoLeft  > 0 ? `${demoLeft}`  : "—"} active={demoLeft  > 0} />
          <RewardCol icon={<img src="/icons/full-game-icon.png" alt="Full" className="w-[45px] h-[45px] object-contain" />} label="Full Game" value={fullLeft  > 0 ? `${fullLeft}`  : "—"} active={fullLeft  > 0} />
          <RewardCol icon={<Zap size={45} color={NEON} />} label="Total XP"  value={totalXP > 0 ? `${totalXP.toLocaleString()}` : "—"} active={totalXP > 0} />
          <RewardCol icon={<img src="/icons/token-icon.png" alt="Token" className="w-[45px] h-[45px] object-contain" />} label="GFT / SKL" value="—" active={false} />
        </div>

        {/* CTA */}
        <button
          className="w-full py-3 rounded-xl text-sm font-black tracking-wide flex items-center justify-center gap-2 transition-all hover:brightness-110 active:scale-[0.98]"
          style={{ background: NEON, color: "#070b10" }}
          onClick={e => { e.stopPropagation(); onClick(); }}
        >
          Start Bounty
        </button>
      </div>
    </div>
  );
}

// ── Filter sidebar data ────────────────────────────────────────────────────
const FILTER_GROUPS = [
  {
    key: "rewards", label: "Rewards",
    options: [
      { key: "demo",    label: "Demo Available" },
      { key: "full",    label: "Full Game Reward" },
      { key: "xp",      label: "XP" },
      { key: "gft",     label: "GFT" },
      { key: "skl",     label: "SKL" },
      { key: "badge",   label: "Badge Rewards" },
    ],
  },
  {
    key: "requirements", label: "Requirements",
    options: [
      { key: "clip",       label: "Gameplay Clips" },
      { key: "reel",       label: "Reels" },
      { key: "screenshot", label: "Screenshots" },
      { key: "stream",     label: "Livestream" },
      { key: "review",     label: "Review" },
      { key: "feedback",   label: "Feedback" },
      { key: "bug",        label: "Bug Testing" },
    ],
  },
  {
    key: "genres", label: "Genres",
    options: [
      { key: "action",    label: "Action" },
      { key: "adventure", label: "Adventure" },
      { key: "horror",    label: "Horror" },
      { key: "rpg",       label: "RPG" },
      { key: "strategy",  label: "Strategy" },
      { key: "survival",  label: "Survival" },
      { key: "racing",    label: "Racing" },
      { key: "puzzle",    label: "Puzzle" },
      { key: "sandbox",   label: "Sandbox" },
      { key: "fps",       label: "FPS" },
    ],
  },
  {
    key: "platforms", label: "Platforms",
    options: [
      { key: "steam",  label: "Steam" },
      { key: "epic",   label: "Epic Games" },
      { key: "itch",   label: "itch.io" },
    ],
  },
  {
    key: "difficulty", label: "Difficulty",
    options: [
      { key: "quick",  label: "Quick" },
      { key: "medium", label: "Medium" },
      { key: "long",   label: "Long" },
    ],
  },
] as const;

function FilterSidebar({
  active, onChange,
}: {
  active: Set<string>;
  onChange: (next: Set<string>) => void;
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const toggle = (key: string) => {
    const next = new Set(active);
    if (next.has(key)) next.delete(key); else next.add(key);
    onChange(next);
  };
  const toggleGroup = (g: string) => {
    setCollapsed(prev => {
      const s = new Set(prev);
      if (s.has(g)) s.delete(g); else s.add(g);
      return s;
    });
  };

  return (
    <div className="space-y-1">
      {active.size > 0 && (
        <button
          onClick={() => onChange(new Set())}
          className="w-full flex items-center justify-center gap-1.5 py-2 mb-3 rounded-xl text-xs font-bold transition-all hover:brightness-110"
          style={{ background: "rgba(184,255,27,0.10)", color: NEON, border: `1px solid rgba(184,255,27,0.20)` }}>
          <X size={11} /> Clear filters
        </button>
      )}
      {FILTER_GROUPS.map(group => {
        const isOpen = !collapsed.has(group.key);
        return (
          <div key={group.key} className="rounded-xl overflow-hidden" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <button
              className="w-full flex items-center justify-between px-4 py-3 text-xs font-black uppercase tracking-wider text-white/60 hover:text-white/90 transition-colors"
              onClick={() => toggleGroup(group.key)}>
              {group.label}
              <ChevronDown size={12} className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
            </button>
            {isOpen && (
              <div className="px-3 pb-3 space-y-1">
                {group.options.map(opt => {
                  const on = active.has(opt.key);
                  return (
                    <button key={opt.key}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left transition-all"
                      style={{
                        background: on ? "rgba(184,255,27,0.10)" : "transparent",
                        color: on ? NEON : "rgba(255,255,255,0.55)",
                        fontWeight: on ? 700 : 500,
                      }}
                      onClick={() => toggle(opt.key)}>
                      <span className="w-3.5 h-3.5 rounded flex items-center justify-center flex-shrink-0 border transition-all"
                        style={{ borderColor: on ? NEON : "rgba(255,255,255,0.25)", background: on ? NEON : "transparent" }}>
                        {on && <Check size={9} color="#070b10" strokeWidth={3} />}
                      </span>
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
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
        <ChevronLeft size={16} /> Back to Bounty Hub
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
  const [mainTab, setMainTab]               = useState<MainTab>("marketplace");
  const [view, setView]                     = useState<View>("marketplace");
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [progressCampaign, setProgressCampaign] = useState<any>(null);
  const [search, setSearch]                 = useState("");
  const [activeFilters, setActiveFilters]   = useState<Set<string>>(new Set());
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const { data: allCampaigns = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/bounties"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  // Bounty Hub = indie only (Gamefolio-managed campaigns live elsewhere)
  const indieCampaigns = useMemo(
    () => allCampaigns.filter((c: any) => !c.gamefolio_managed),
    [allCampaigns],
  );

  // Apply search + filters
  const filtered = useMemo(() => {
    let list = indieCampaigns;

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((c: any) =>
        (c.game_name ?? "").toLowerCase().includes(q) ||
        (c.template_name ?? "").toLowerCase().includes(q) ||
        (c.description ?? "").toLowerCase().includes(q),
      );
    }

    if (activeFilters.size > 0) {
      list = list.filter((c: any) => {
        const bounties: any[] = c.bounties ?? [];
        const contentTypes = new Set(bounties.map((b: any) => b.content_type));
        const totalXp = bounties.reduce((a: number, b: any) => a + Number(b.xp_reward ?? 0), 0);
        const demoLeft = Number(c.demo_keys_remaining ?? 0);
        const fullLeft = Number(c.full_keys_remaining ?? 0);

        for (const f of activeFilters) {
          // Rewards
          if (f === "demo"  && demoLeft  === 0) return false;
          if (f === "full"  && fullLeft  === 0) return false;
          if (f === "xp"    && totalXp   === 0) return false;
          // Requirements
          if (f === "clip"       && !contentTypes.has("clip"))       return false;
          if (f === "reel"       && !contentTypes.has("reel"))       return false;
          if (f === "screenshot" && !contentTypes.has("screenshot")) return false;
          if (f === "stream"     && !contentTypes.has("stream"))     return false;
          if (f === "feedback"   && !contentTypes.has("feedback"))   return false;
          if (f === "bug"        && !contentTypes.has("bug"))        return false;
        }
        return true;
      });
    }

    return list;
  }, [indieCampaigns, search, activeFilters]);

  // ── Sub-views ──────────────────────────────────────────────────────────
  if (view === "detail" && selectedCampaign) {
    return (
      <CampaignDetail
        campaign={selectedCampaign}
        onBack={() => { setView("marketplace"); setSelectedCampaign(null); }}
        onJoined={() => { setView("marketplace"); setMainTab("my"); setSelectedCampaign(null); }}
      />
    );
  }
  if (view === "progress" && progressCampaign) {
    return (
      <CampaignProgress
        campaign={progressCampaign}
        onBack={() => { setView("marketplace"); setMainTab("my"); setProgressCampaign(null); }}
      />
    );
  }

  const activeFilterCount = activeFilters.size;

  return (
    <div className="min-h-screen" style={{ background: PAGE_BG }}>

      {/* ── Hero ── */}
      <div className="px-6 pt-8 pb-0">
        <div className="flex items-start gap-4 mb-5">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 mt-0.5"
            style={{ background: "rgba(184,255,27,0.10)", border: "1px solid rgba(184,255,27,0.18)" }}>
            <Target size={22} color={NEON} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight leading-none">Bounty Hub</h1>
            <p className="mt-1.5 text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>
              Discover indie game campaigns, earn rewards and help developers grow their games.
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "rgba(255,255,255,0.35)" }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search games..."
            className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-white placeholder:text-white/30 outline-none transition-all focus:ring-1"
            style={{
              background: "#111820",
              border: "1px solid rgba(255,255,255,0.10)",
              fontFamily: "inherit",
            }}
            onFocus={e => e.currentTarget.style.borderColor = "rgba(184,255,27,0.40)"}
            onBlur={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)"}
          />
          {search && (
            <button onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-white/10 transition-colors">
              <X size={13} style={{ color: "rgba(255,255,255,0.35)" }} />
            </button>
          )}
        </div>

        {/* Main tabs */}
        <div className="flex items-center justify-between mb-0">
          <div className="flex gap-0.5 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.05)" }}>
            {([
              { key: "marketplace", label: "Bounty Hub" },
              { key: "my",         label: "My Campaigns" },
            ] as { key: MainTab; label: string }[]).map(t => (
              <button key={t.key} onClick={() => setMainTab(t.key)}
                className="px-5 py-2 rounded-lg text-sm font-bold transition-all"
                style={mainTab === t.key
                  ? { background: NEON, color: "#070b10" }
                  : { color: "rgba(255,255,255,0.50)" }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Mobile filter toggle */}
          {mainTab === "marketplace" && (
            <button
              className="lg:hidden flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold transition-all"
              style={{
                background: activeFilterCount > 0 ? "rgba(184,255,27,0.12)" : "rgba(255,255,255,0.06)",
                color: activeFilterCount > 0 ? NEON : "rgba(255,255,255,0.60)",
                border: `1px solid ${activeFilterCount > 0 ? "rgba(184,255,27,0.25)" : "rgba(255,255,255,0.10)"}`,
              }}
              onClick={() => setShowMobileFilters(v => !v)}>
              <SlidersHorizontal size={14} />
              Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
            </button>
          )}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="px-6 pb-10 mt-5">
        {mainTab === "marketplace" ? (
          <div className="flex gap-6 items-start">

            {/* Filter sidebar — desktop */}
            <aside className="hidden lg:block w-52 flex-shrink-0 sticky top-6">
              <FilterSidebar active={activeFilters} onChange={setActiveFilters} />
            </aside>

            {/* Mobile filter drawer */}
            {showMobileFilters && (
              <div className="lg:hidden fixed inset-0 z-50 flex">
                <div className="absolute inset-0 bg-black/60" onClick={() => setShowMobileFilters(false)} />
                <div className="relative ml-auto w-72 h-full overflow-y-auto py-6 px-4"
                  style={{ background: "#0d1420", borderLeft: "1px solid rgba(255,255,255,0.10)" }}>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-black text-white">Filters</span>
                    <button onClick={() => setShowMobileFilters(false)}
                      className="p-1 rounded-lg hover:bg-white/10 transition-colors">
                      <X size={16} style={{ color: "rgba(255,255,255,0.50)" }} />
                    </button>
                  </div>
                  <FilterSidebar active={activeFilters} onChange={setActiveFilters} />
                </div>
              </div>
            )}

            {/* Cards */}
            <div className="flex-1 min-w-0">
              {/* Result count */}
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold" style={{ color: "rgba(255,255,255,0.35)" }}>
                  {isLoading ? "Loading…" : `${filtered.length} campaign${filtered.length !== 1 ? "s" : ""}`}
                </span>
                {activeFilterCount > 0 && (
                  <button onClick={() => setActiveFilters(new Set())}
                    className="text-xs font-bold flex items-center gap-1 transition-colors hover:opacity-80"
                    style={{ color: NEON }}>
                    <X size={10} /> Clear all
                  </button>
                )}
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-24">
                  <Loader2 size={30} className="animate-spin" style={{ color: "rgba(255,255,255,0.20)" }} />
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                    style={{ background: "rgba(184,255,27,0.07)", border: "1px solid rgba(184,255,27,0.14)" }}>
                    <Target size={28} color="rgba(184,255,27,0.40)" />
                  </div>
                  <div>
                    <div className="text-white font-black text-lg mb-1">
                      {search || activeFilterCount > 0 ? "No matching campaigns" : "No campaigns yet"}
                    </div>
                    <div className="text-sm max-w-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                      {search || activeFilterCount > 0
                        ? "Try different search terms or clear your filters."
                        : "Indie developers are launching campaigns soon. Check back shortly."}
                    </div>
                  </div>
                  {(search || activeFilterCount > 0) && (
                    <button onClick={() => { setSearch(""); setActiveFilters(new Set()); }}
                      className="px-4 py-2 rounded-xl text-sm font-bold transition-all hover:brightness-110"
                      style={{ background: NEON, color: "#070b10" }}>
                      Clear search & filters
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-2 gap-5">
                  {filtered.map((c: any) => (
                    <CampaignCard
                      key={c.id}
                      campaign={c}
                      onClick={() => { setSelectedCampaign(c); setView("detail"); }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <MyCampaigns
            onViewProgress={(c) => { setProgressCampaign(c); setView("progress"); }}
          />
        )}
      </div>
    </div>
  );
}
