import { useState, useMemo, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import {
  Target, ShieldCheck, Clock, Users, Key, ChevronRight, ChevronLeft,
  Zap, Copy, Check, Loader2, Lock,
  Film, Camera, MessageSquare, Star, AlertCircle,
  Trophy, Gift, Search, SlidersHorizontal, X, ChevronDown, Store,
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
function RewardCol({ icon, label, sublabel, value, active }: { icon: any; label: string; sublabel: string; value: string; active: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all duration-200 hover:scale-[1.04]"
      style={{ background: active ? "rgba(184,255,27,0.07)" : "rgba(255,255,255,0.04)", border: `1px solid ${active ? "rgba(184,255,27,0.20)" : "rgba(255,255,255,0.07)"}`, boxShadow: active ? "0 0 0 0 rgba(184,255,27,0)" : undefined }}>
      <div className="w-[54px] h-[54px] flex items-center justify-center">{icon}</div>
      <span className="text-[11px] font-black leading-tight text-center px-1" style={{ color: active ? NEON : "rgba(255,255,255,0.85)" }}>{value}</span>
      <span className="text-[9px] font-bold leading-tight text-center px-1" style={{ color: "rgba(255,255,255,0.40)" }}>{label}</span>
      <span className="text-[8px] leading-tight text-center px-1 uppercase tracking-wider" style={{ color: active ? "rgba(184,255,27,0.55)" : "rgba(255,255,255,0.20)" }}>{sublabel}</span>
    </div>
  );
}

// ── Requirement pill ──────────────────────────────────────────────────────
const REQ_ICON: Record<string, any> = {
  clip: Film, screenshot: Camera, feedback: MessageSquare,
  reel: Film, session: Zap, bug: AlertCircle, stream: Zap,
};
function reqPillLabel(ct: string, qty: number) {
  if (ct === "clip")       return `×${qty} Clips`;
  if (ct === "screenshot") return `×${qty} Screenshots`;
  if (ct === "feedback")   return "Feedback";
  if (ct === "reel")       return `×${qty} Reels`;
  if (ct === "stream")     return "Livestream";
  if (ct === "session")    return "Play Session";
  if (ct === "bug")        return `×${qty} Bug Reports`;
  return ct;
}

// ── Campaign card ─────────────────────────────────────────────────────────
function CampaignCard({ campaign, onClick }: { campaign: any; onClick: () => void }) {
  const demoLeft  = Number(campaign.demo_keys_remaining ?? 0);
  const fullLeft  = Number(campaign.full_keys_remaining ?? 0);
  const bounties: any[] = campaign.bounties ?? [];
  const totalXP = campaign.total_campaign_xp ?? bounties.reduce((a: number, b: any) => a + Number(b.xp_reward ?? 0), 0);
  const endDate = campaign.end_date ?? null;
  const tLeft = timeRemaining(endDate);
  const nearlyFull = demoLeft > 0 && demoLeft <= 5;
  const trending = Number(campaign.participant_count ?? 0) >= 10;

  // Deduplicated requirement pills from bounties
  const seen = new Set<string>();
  const pills: { ct: string; qty: number }[] = [];
  for (const b of bounties) {
    if (!seen.has(b.content_type)) {
      seen.add(b.content_type);
      pills.push({ ct: b.content_type, qty: Number(b.quantity ?? 1) });
    }
  }

  return (
    <div
      className="rounded-2xl overflow-hidden cursor-pointer group transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/60"
      style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(184,255,27,0.28)")}
      onMouseLeave={e => (e.currentTarget.style.borderColor = CARD_BORDER)}
      onClick={onClick}
    >
      {/* Hero artwork */}
      <div className="relative h-48 overflow-hidden">
        {campaign.game_artwork_url ? (
          <img src={campaign.game_artwork_url} alt={campaign.game_name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.05]" />
        ) : (
          <div className="w-full h-full flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #0d1624 0%, #0a1020 100%)" }}>
            <Target size={44} color="rgba(184,255,27,0.12)" />
          </div>
        )}
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, #0e1520 0%, rgba(14,21,32,0.18) 60%, transparent 100%)" }} />
        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full"
            style={{ background: NEON, color: "#070b10" }}>
            <ShieldCheck size={9} /> GF Verified
          </span>
          {trending && (
            <span className="inline-flex items-center gap-1 text-[9px] font-black px-1.5 py-0.5 rounded-full"
              style={{ background: "rgba(239,68,68,0.85)", color: "white" }}>
              <Flame size={8} /> Trending
            </span>
          )}
        </div>
        {nearlyFull && (
          <div className="absolute top-3 right-3">
            <span className="inline-flex items-center gap-1 text-[9px] font-black px-1.5 py-0.5 rounded-full"
              style={{ background: "rgba(245,158,11,0.90)", color: "#070b10" }}>
              ⚡ {demoLeft} Left
            </span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="px-5 pb-5 pt-4 space-y-3.5">
        {/* Title + description */}
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

        {/* Requirement pills — horizontal */}
        {pills.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {pills.map(({ ct, qty }) => {
              const Icon = REQ_ICON[ct] ?? Target;
              return (
                <span key={ct} className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg"
                  style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.70)", border: "1px solid rgba(255,255,255,0.09)" }}>
                  <Icon size={11} /> {reqPillLabel(ct, qty)}
                </span>
              );
            })}
          </div>
        )}

        {/* Urgency row */}
        <div className="flex items-center gap-3 text-[11px]">
          {demoLeft > 0 && (
            <span style={{ color: NEON }} className="font-bold">{demoLeft} / {Number(campaign.demo_key_total ?? demoLeft)} demo keys</span>
          )}
          {tLeft !== "Ended" && tLeft !== "Ongoing" && (
            <span className="text-white/35 flex items-center gap-1"><Clock size={10} /> {tLeft}</span>
          )}
          {Number(campaign.participant_count ?? 0) > 0 && (
            <span className="text-white/35 flex items-center gap-1"><Users size={10} /> {campaign.participant_count}</span>
          )}
        </div>

        {/* Rewards — 4 equal columns */}
        <div className="grid grid-cols-4 gap-1.5">
          <RewardCol
            icon={<img src="/icons/demo-key-icon.png" alt="Demo" className="w-[45px] h-[45px] object-contain" />}
            sublabel="Immediate" label="Demo Key"
            value={demoLeft > 0 ? `${demoLeft}` : "—"} active={demoLeft > 0} />
          <RewardCol
            icon={<img src="/icons/full-game-icon.png" alt="Full" className="w-[45px] h-[45px] object-contain" />}
            sublabel="Reward" label="Full Game"
            value={fullLeft > 0 ? `${fullLeft}` : "—"} active={fullLeft > 0} />
          <RewardCol
            icon={<Zap size={45} color={NEON} />}
            sublabel="Progress" label="XP"
            value={totalXP > 0 ? totalXP.toLocaleString() : "—"} active={totalXP > 0} />
          <RewardCol
            icon={<img src="/icons/token-icon.png" alt="Token" className="w-[45px] h-[45px] object-contain" />}
            sublabel="Bonus" label="GFT"
            value="—" active={false} />
        </div>

        {/* CTA */}
        <button
          className="w-full py-3 rounded-xl text-sm font-black tracking-wide flex items-center justify-center gap-2 transition-all hover:brightness-110 hover:scale-[1.01] active:scale-[0.98]"
          style={{ background: NEON, color: "#070b10" }}
          onClick={e => { e.stopPropagation(); onClick(); }}
        >
          <ShieldCheck size={15} /> Accept Mission
        </button>
      </div>
    </div>
  );
}

// ── Featured bounty (cinematic hero) ──────────────────────────────────────
function FeaturedSlider({ campaigns, onSelect }: { campaigns: any[]; onSelect: (c: any) => void }) {
  const [idx, setIdx] = useState(0);
  const [fading, setFading] = useState(false);

  const goTo = useCallback((next: number) => {
    setFading(true);
    setTimeout(() => {
      setIdx(next);
      setFading(false);
    }, 220);
  }, []);

  const prev = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    goTo((idx - 1 + campaigns.length) % campaigns.length);
  }, [idx, campaigns.length, goTo]);

  const next = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    goTo((idx + 1) % campaigns.length);
  }, [idx, campaigns.length, goTo]);

  useEffect(() => {
    if (campaigns.length < 2) return;
    const t = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setIdx(i => (i + 1) % campaigns.length);
        setFading(false);
      }, 220);
    }, 5000);
    return () => clearInterval(t);
  }, [campaigns.length]);

  if (campaigns.length === 0) return null;
  const campaign = campaigns[idx];
  const demoLeft = Number(campaign.demo_keys_remaining ?? 0);
  const bounties: any[] = campaign.bounties ?? [];
  const totalXP = campaign.total_campaign_xp ?? bounties.reduce((a: number, b: any) => a + Number(b.xp_reward ?? 0), 0);
  const fullLeft = Number(campaign.full_keys_remaining ?? 0);

  return (
    <div className="relative overflow-hidden cursor-pointer group" style={{ height: 380 }}
      onClick={() => onSelect(campaign)}>

      {/* Background image — fades between slides */}
      <div className="absolute inset-0 transition-opacity duration-300" style={{ opacity: fading ? 0 : 1 }}>
        {campaign.game_artwork_url ? (
          <img src={campaign.game_artwork_url} alt={campaign.game_name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
            style={{ opacity: 0.60 }} />
        ) : (
          <div className="w-full h-full" style={{ background: "linear-gradient(135deg, rgba(184,255,27,0.12) 0%, rgba(7,11,16,1) 100%)" }} />
        )}
      </div>

      {/* Gradients (always on) */}
      <div className="absolute inset-0" style={{ background: "linear-gradient(to top, #070b10 0%, rgba(7,11,16,0.60) 50%, transparent 100%)" }} />
      <div className="absolute inset-0" style={{ background: "linear-gradient(to right, #070b10 0%, transparent 70%)" }} />

      {/* Slide content */}
      <div className="absolute inset-0 flex flex-col justify-end px-8 pb-7 transition-opacity duration-300"
        style={{ opacity: fading ? 0 : 1 }}>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-sm"
            style={{ color: NEON, background: "rgba(184,255,27,0.12)", border: "1px solid rgba(184,255,27,0.25)" }}>
            ⭐ Featured Campaign
          </span>
          <span className="flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full"
            style={{ background: NEON, color: "#070b10" }}>
            <ShieldCheck size={9} /> GF Verified
          </span>
        </div>

        {campaign.game_name && (
          <div className="text-sm font-bold mb-0.5" style={{ color: "rgba(255,255,255,0.50)" }}>{campaign.game_name}</div>
        )}
        <h2 className="text-4xl font-black text-white leading-tight tracking-tight mb-2 max-w-lg">
          {campaign.template_name}
        </h2>
        {campaign.description && (
          <p className="text-sm mb-4 max-w-md line-clamp-1" style={{ color: "rgba(255,255,255,0.55)" }}>
            {campaign.description}
          </p>
        )}

        <div className="flex items-center gap-4 mb-5">
          {demoLeft > 0 && (
            <div className="flex items-center gap-1.5">
              <img src="/icons/demo-key-icon.png" alt="" className="w-5 h-5 object-contain" />
              <span className="text-xs font-black" style={{ color: NEON }}>Demo Key</span>
            </div>
          )}
          {fullLeft > 0 && (
            <div className="flex items-center gap-1.5">
              <img src="/icons/full-game-icon.png" alt="" className="w-5 h-5 object-contain" />
              <span className="text-xs font-bold text-white/70">Full Game</span>
            </div>
          )}
          {totalXP > 0 && (
            <div className="flex items-center gap-1.5">
              <Zap size={16} color={NEON} />
              <span className="text-xs font-bold text-white/70">{totalXP.toLocaleString()} XP</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <img src="/icons/token-icon.png" alt="" className="w-5 h-5 object-contain" />
            <span className="text-xs font-bold text-white/70">GFT</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-black transition-all hover:brightness-110 hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: NEON, color: "#070b10" }}
            onClick={e => { e.stopPropagation(); onSelect(campaign); }}>
            <ShieldCheck size={16} /> Accept Mission
          </button>
          <span className="text-xs text-white/40 font-bold">
            {demoLeft > 0 ? `${demoLeft} demo keys remaining` : "Open campaign"}
          </span>
        </div>
      </div>

      {/* Prev / Next arrows */}
      {campaigns.length > 1 && (
        <>
          <button
            className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center w-9 h-9 rounded-full transition-all hover:scale-110"
            style={{ background: "rgba(0,0,0,0.50)", border: "1px solid rgba(255,255,255,0.15)" }}
            onClick={prev}>
            <ChevronLeft size={18} className="text-white" />
          </button>
          <button
            className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center justify-center w-9 h-9 rounded-full transition-all hover:scale-110"
            style={{ background: "rgba(0,0,0,0.50)", border: "1px solid rgba(255,255,255,0.15)" }}
            onClick={next}>
            <ChevronRight size={18} className="text-white" />
          </button>
        </>
      )}

      {/* Dot indicators */}
      {campaigns.length > 1 && (
        <div className="absolute bottom-5 right-8 flex items-center gap-2">
          {campaigns.map((_, i) => (
            <button key={i}
              className="rounded-full transition-all duration-300"
              style={{
                width: i === idx ? 20 : 6,
                height: 6,
                background: i === idx ? NEON : "rgba(255,255,255,0.30)",
              }}
              onClick={e => { e.stopPropagation(); goTo(i); }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Community stats strip ─────────────────────────────────────────────────
function CommunityStats({ campaigns }: { campaigns: any[] }) {
  const activeCampaigns = campaigns.length;
  const creatorsPlaying = campaigns.reduce((a, c) => a + Number(c.participant_count ?? 0), 0);
  const demoKeysClaimed = campaigns.reduce((a, c) => {
    const total = Number(c.demo_key_total ?? c.demo_keys_remaining ?? 0);
    const remaining = Number(c.demo_keys_remaining ?? 0);
    return a + Math.max(0, total - remaining);
  }, 0);
  const clipsSubmitted = campaigns.reduce((a, c) => a + Number(c.total_submissions ?? 0), 0);
  const completedCampaigns = campaigns.reduce((a, c) => a + Number(c.completed_count ?? 0), 0);

  const stats = [
    { icon: <Target size={15} color={NEON} />, label: "Active Campaigns", value: activeCampaigns.toLocaleString() },
    { icon: <Users size={15} color={NEON} />, label: "Creators Playing", value: creatorsPlaying.toLocaleString() },
    { icon: <Film size={15} color={NEON} />, label: "Clips Submitted", value: clipsSubmitted > 0 ? clipsSubmitted.toLocaleString() : "—" },
    { icon: <img src="/icons/demo-key-icon.png" alt="" className="w-3.5 h-3.5 object-contain" />, label: "Demo Keys Claimed", value: demoKeysClaimed.toLocaleString() },
    { icon: <Trophy size={15} color={NEON} />, label: "Campaigns Completed", value: completedCampaigns > 0 ? completedCampaigns.toLocaleString() : "—" },
  ];

  return (
    <div className="flex overflow-x-auto" style={{ borderTop: "1px solid rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
      {stats.map((s, i) => (
        <div key={s.label} className="flex items-center gap-2.5 px-6 py-4 flex-1 min-w-[160px]" style={{ borderRight: i < stats.length - 1 ? "1px solid rgba(255,255,255,0.06)" : undefined }}>
          <div className="flex-shrink-0">{s.icon}</div>
          <div>
            <div className="text-sm font-black text-white leading-none">{s.value}</div>
            <div className="text-[10px] font-bold mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>{s.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Filter sidebar data ────────────────────────────────────────────────────
const FILTER_GROUPS = [
  {
    key: "status", label: "Campaign Status",
    options: [
      { key: "status_demo",     label: "Demo Available" },
      { key: "status_nearly",   label: "Nearly Full" },
      { key: "status_ending",   label: "Ending Soon" },
      { key: "status_new",      label: "New" },
      { key: "status_featured", label: "Featured" },
    ],
  },
  {
    key: "rewards", label: "Rewards",
    options: [
      { key: "demo",    label: "Demo Key" },
      { key: "full",    label: "Full Game" },
      { key: "xp",      label: "XP" },
      { key: "gft",     label: "GFT" },
      { key: "badge",   label: "Badge" },
    ],
  },
  {
    key: "requirements", label: "Requirements",
    options: [
      { key: "clip",       label: "Gameplay Clips" },
      { key: "screenshot", label: "Screenshots" },
      { key: "reel",       label: "Reels" },
      { key: "stream",     label: "Livestream" },
      { key: "feedback",   label: "Feedback" },
      { key: "bug",        label: "Bug Testing" },
    ],
  },
  {
    key: "genres", label: "Genres",
    options: [
      { key: "fps",       label: "FPS" },
      { key: "horror",    label: "Horror" },
      { key: "rpg",       label: "RPG" },
      { key: "racing",    label: "Racing" },
      { key: "strategy",  label: "Strategy" },
      { key: "survival",  label: "Survival" },
      { key: "puzzle",    label: "Puzzle" },
      { key: "action",    label: "Action" },
      { key: "adventure", label: "Adventure" },
    ],
  },
  {
    key: "difficulty", label: "Campaign Difficulty",
    options: [
      { key: "quick",    label: "Quick" },
      { key: "standard", label: "Standard" },
      { key: "premium",  label: "Premium" },
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
  const [showModal, setShowModal] = useState(false);

  const isGF = !!campaign.gamefolio_managed;
  const bounties: any[] = campaign.bounties ?? [];
  const mandatory = bounties.filter((b: any) => b.mandatory);
  const optional = bounties.filter((b: any) => !b.mandatory);
  const totalXp = bounties.reduce((acc: number, b: any) => acc + Number(b.xp_reward ?? 0), 0);
  const demoLeft = Number(campaign.demo_keys_remaining ?? 0);
  const fullLeft = Number(campaign.full_keys_remaining ?? 0);
  const timeLeft = timeRemaining(campaign.end_date ?? null);
  const canAccept = isGF ? true : demoLeft > 0;

  const joinMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/bounties/${campaign.id}/join`, {}),
    onSuccess: async (res) => {
      const data = await res.json();
      qc.invalidateQueries({ queryKey: ["/api/bounties/my/campaigns"] });
      toast({ title: "Mission Accepted!", description: data.message });
      setShowModal(false);
      onJoined();
    },
    onError: async (err: any) => {
      const msg = err?.message ?? "Failed to join campaign";
      toast({ title: "Could not join", description: msg, variant: "destructive" });
      setShowModal(false);
    },
  });

  function objectiveLabel(b: any) {
    const qty = Number(b.quantity ?? 1);
    const ct = b.content_type as string;
    if (ct === "clip")       return `Upload ${qty} Gameplay Clip${qty !== 1 ? "s" : ""}`;
    if (ct === "screenshot") return `Upload ${qty} Screenshot${qty !== 1 ? "s" : ""}`;
    if (ct === "feedback")   return "Submit First Impressions";
    if (ct === "reel")       return `Upload ${qty} Reel${qty !== 1 ? "s" : ""}`;
    if (ct === "stream")     return "Go Live on Stream";
    if (ct === "session")    return "Complete a Play Session";
    if (ct === "bug")        return `File ${qty} Bug Report${qty !== 1 ? "s" : ""}`;
    return b.title ?? ct;
  }

  return (
    <div className="min-h-screen" style={{ background: PAGE_BG }}>
      {/* Back */}
      <button onClick={onBack} className="flex items-center gap-2 px-5 py-3 text-white/50 hover:text-white transition-colors text-sm font-bold">
        <ChevronLeft size={16} /> Back to Bounty Hub
      </button>

      {/* ── 1. HERO ── */}
      <div className="relative overflow-hidden" style={{ height: 340 }}>
        {campaign.game_artwork_url ? (
          <img src={campaign.game_artwork_url} alt={campaign.game_name} className="w-full h-full object-cover" style={{ opacity: 0.55 }} />
        ) : (
          <div className="w-full h-full" style={{ background: "linear-gradient(135deg, rgba(184,255,27,0.10) 0%, rgba(184,255,27,0.02) 100%)" }} />
        )}
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, #070b10 0%, rgba(7,11,16,0.55) 55%, transparent 100%)" }} />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to right, #070b10 0%, transparent 65%)" }} />
        <div className="absolute bottom-0 left-0 right-0 px-6 pb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-full" style={{ color: "#070b10", background: NEON }}>
              <ShieldCheck size={9} /> GF Verified
            </span>
            {campaign.platform && (
              <span className="text-[11px] font-bold text-white/40">{campaign.platform}</span>
            )}
          </div>
          {campaign.game_name && (
            <div className="text-sm font-bold text-white/50 mb-0.5">{campaign.game_name}</div>
          )}
          <div className="text-3xl font-black text-white leading-tight mb-3">{campaign.template_name}</div>
          <div className="flex items-center gap-5 flex-wrap">
            {timeLeft !== "Ended" && timeLeft !== "Ongoing" && (
              <div className="flex items-center gap-1.5 text-xs text-white/55">
                <Clock size={12} /><span>{timeLeft}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 text-xs text-white/55">
              <Users size={12} /><span>{campaign.participant_count ?? 0} creators joined</span>
            </div>
            {!isGF && demoLeft > 0 && (
              <div className="flex items-center gap-1.5 text-xs font-black" style={{ color: NEON }}>
                <Key size={12} /><span>{demoLeft} demo keys left</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Description — below hero, no card */}
      {campaign.description && (
        <div className="px-6 pt-5 pb-1 max-w-3xl mx-auto">
          <p className="text-sm text-white/60 leading-relaxed">{campaign.description}</p>
        </div>
      )}

      <div className="px-5 pb-14 mt-8 space-y-10 max-w-3xl mx-auto">

        {/* ── 3. WHAT YOU'LL EARN ── */}
        <section>
          <div className="text-xl font-black text-white mb-4">What You'll Earn</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-2xl p-4 flex flex-col items-center text-center gap-2.5" style={{ background: CARD_BG, border: "1px solid rgba(184,255,27,0.22)" }}>
              <img src="/icons/demo-key-icon.png" alt="Demo Key" className="w-16 h-16 object-contain" />
              <div className="text-sm font-black text-white">Demo Key</div>
              <div className="text-[11px] text-white/45 leading-snug">Receive immediately after accepting</div>
            </div>
            <div className="rounded-2xl p-4 flex flex-col items-center text-center gap-2.5" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
              <img src="/icons/full-game-icon.png" alt="Full Game" className="w-16 h-16 object-contain" />
              <div className="text-sm font-black text-white">Full Game</div>
              <div className="text-[11px] text-white/45 leading-snug">Unlocked after completing the campaign</div>
            </div>
            <div className="rounded-2xl p-4 flex flex-col items-center text-center gap-2.5" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
              <div className="w-16 h-16 flex items-center justify-center rounded-2xl" style={{ background: "rgba(184,255,27,0.10)" }}>
                <Zap size={34} color={NEON} />
              </div>
              <div className="text-sm font-black text-white">{totalXp > 0 ? `${totalXp.toLocaleString()} XP` : "XP"}</div>
              <div className="text-[11px] text-white/45 leading-snug">Awarded throughout the campaign</div>
            </div>
            <div className="rounded-2xl p-4 flex flex-col items-center text-center gap-2.5" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
              <img src="/icons/token-icon.png" alt="GFT" className="w-16 h-16 object-contain" />
              <div className="text-sm font-black text-white">GFT / SKL</div>
              <div className="text-[11px] text-white/45 leading-snug">Completion reward</div>
            </div>
          </div>
        </section>

        {/* ── 4. MISSION OBJECTIVES ── */}
        {mandatory.length > 0 && (
          <section>
            <div className="text-xl font-black text-white mb-4">Mission Objectives</div>
            <div className="space-y-2">
              {mandatory.map((b: any, idx: number) => {
                const Icon = CONTENT_TYPE_ICON[b.content_type] ?? Target;
                return (
                  <div key={b.id} className="flex items-center gap-4 rounded-2xl px-5 py-4" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
                    <div className="text-base font-black w-5 flex-shrink-0 text-center" style={{ color: NEON }}>{idx + 1}</div>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(184,255,27,0.10)" }}>
                      <Icon size={17} color={NEON} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-black text-white">{objectiveLabel(b)}</div>
                      {b.description && <div className="text-[11px] text-white/40 mt-0.5 truncate">{b.description}</div>}
                    </div>
                    {b.xp_reward > 0 && (
                      <div className="text-xs font-black flex-shrink-0" style={{ color: NEON }}>+{b.xp_reward} XP</div>
                    )}
                  </div>
                );
              })}
            </div>
            {optional.length > 0 && (
              <div className="mt-5">
                <div className="text-[11px] font-black uppercase tracking-widest text-white/35 mb-3">Bonus Objectives</div>
                <div className="space-y-2">
                  {optional.map((b: any) => {
                    const Icon = CONTENT_TYPE_ICON[b.content_type] ?? Target;
                    return (
                      <div key={b.id} className="flex items-center gap-4 rounded-2xl px-5 py-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,255,255,0.05)" }}>
                          <Icon size={17} className="text-white/35" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold text-white/65">{objectiveLabel(b)}</div>
                          {b.description && <div className="text-[11px] text-white/30 mt-0.5">{b.description}</div>}
                        </div>
                        {b.xp_reward > 0 && (
                          <div className="text-xs font-bold flex-shrink-0 text-white/35">+{b.xp_reward} XP</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        )}

        {/* ── 5. CAMPAIGN SUMMARY ── */}
        <section>
          <div className="text-xl font-black text-white mb-4">Campaign Summary</div>
          <div className="rounded-2xl overflow-hidden" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
            {([
              { label: "Demo Keys Remaining", value: `${demoLeft}`, icon: <img src="/icons/demo-key-icon.png" alt="" className="w-8 h-8 object-contain" />, hi: demoLeft > 0 },
              { label: "Full Game Keys Remaining", value: `${fullLeft}`, icon: <img src="/icons/full-game-icon.png" alt="" className="w-8 h-8 object-contain" />, hi: false },
              { label: "Creators Joined", value: String(campaign.participant_count ?? 0), icon: <Users size={20} color={NEON} />, hi: false },
              { label: "Time Remaining", value: timeLeft, icon: <Clock size={20} color={NEON} />, hi: false },
            ] as const).map((row, i, arr) => (
              <div key={row.label} className="flex items-center gap-4 px-5 py-4" style={{ borderBottom: i < arr.length - 1 ? `1px solid ${CARD_BORDER}` : undefined }}>
                <div className="w-9 h-9 flex items-center justify-center flex-shrink-0">{row.icon}</div>
                <div className="flex-1 text-sm font-bold text-white/55">{row.label}</div>
                <div className="text-sm font-black" style={{ color: row.hi ? NEON : "white" }}>{row.value}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── 6. HOW IT WORKS ── */}
        <section>
          <div className="text-xl font-black text-white mb-4">How It Works</div>
          <div className="grid grid-cols-4 gap-2">
            {([
              { icon: <ShieldCheck size={22} color={NEON} />, label: "Accept Mission" },
              { icon: <img src="/icons/demo-key-icon.png" alt="" className="w-6 h-6 object-contain" />, label: "Receive Demo Key" },
              { icon: <Target size={22} color={NEON} />, label: "Complete Objectives" },
              { icon: <Trophy size={22} color={NEON} />, label: "Unlock Rewards" },
            ] as const).map((step, i, arr) => (
              <div key={step.label} className="flex flex-col items-center text-center gap-2">
                <div className="relative w-full flex items-center justify-center">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "rgba(184,255,27,0.10)", border: "1px solid rgba(184,255,27,0.18)" }}>
                    {step.icon}
                  </div>
                  {i < arr.length - 1 && (
                    <div className="absolute left-full top-1/2 -translate-y-1/2 w-full flex items-center justify-center pointer-events-none" style={{ zIndex: 0 }}>
                      <ChevronRight size={14} className="text-white/20" style={{ marginLeft: "-50%" }} />
                    </div>
                  )}
                </div>
                <div className="text-[11px] font-bold text-white/60 leading-tight">{step.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── 7+8. AGREEMENT + CTA ── */}
        {user ? (
          <section className="space-y-4">
            <p className="text-[12px] text-white/35 leading-relaxed">
              By accepting this mission you agree to: use the demo key yourself · submit genuine gameplay content · follow the{" "}
              <span style={{ color: NEON }} className="font-bold">Gamefolio Community Guidelines</span>.
            </p>
            <button
              disabled={!canAccept}
              onClick={() => setShowModal(true)}
              className="w-full py-4 rounded-2xl text-base font-black flex items-center justify-center gap-2 transition-all hover:brightness-110 active:scale-[0.99] disabled:opacity-40"
              style={{ background: NEON, color: "#070b10" }}
            >
              {!canAccept
                ? "No Demo Keys Available"
                : isGF
                  ? <><Zap size={20} /> Accept Mission</>
                  : <><ShieldCheck size={20} /> Accept Mission</>}
            </button>
          </section>
        ) : (
          <div className="rounded-2xl p-6 text-center" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
            <Lock size={24} className="mx-auto mb-3 text-white/25" />
            <div className="text-sm font-bold text-white/55 mb-2">Sign in to accept this mission</div>
            <a href="/auth" className="text-sm font-black" style={{ color: NEON }}>Sign In →</a>
          </div>
        )}
      </div>

      {/* ── CONFIRMATION MODAL ── */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          style={{ background: "rgba(0,0,0,0.80)" }}
          onClick={() => setShowModal(false)}
        >
          <div
            className="w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 space-y-5"
            style={{ background: "#0e1520", border: "1px solid rgba(184,255,27,0.18)" }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <img src="/icons/demo-key-icon.png" alt="" className="w-11 h-11 object-contain" />
              <div>
                <div className="text-lg font-black text-white">Claim Demo Key</div>
                <div className="text-xs text-white/45">Gamefolio Verified Campaign</div>
              </div>
            </div>
            <p className="text-sm text-white/60">You are about to join this campaign. You will immediately receive one demo key.</p>
            <div className="rounded-xl p-4 space-y-3" style={{ background: "rgba(184,255,27,0.05)", border: "1px solid rgba(184,255,27,0.12)" }}>
              <div className="text-[10px] font-black uppercase tracking-widest text-white/35 mb-1">Complete the mission to unlock</div>
              {[
                { icon: <img src="/icons/full-game-icon.png" alt="" className="w-5 h-5 object-contain" />, text: "Full Game Key" },
                { icon: <Zap size={16} color={NEON} />, text: totalXp > 0 ? `${totalXp.toLocaleString()} XP` : "XP Rewards" },
                { icon: <img src="/icons/token-icon.png" alt="" className="w-5 h-5 object-contain" />, text: "GFT / SKL Tokens" },
              ].map(({ icon, text }) => (
                <div key={text} className="flex items-center gap-2.5 text-sm text-white/75">
                  {icon}<span>{text}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-3.5 rounded-xl text-sm font-black text-white/55 transition-colors hover:text-white"
                style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.10)" }}
              >
                Cancel
              </button>
              <button
                onClick={() => joinMutation.mutate()}
                disabled={joinMutation.isPending}
                className="flex-1 py-3.5 rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-all hover:brightness-110 disabled:opacity-60"
                style={{ background: NEON, color: "#070b10" }}
              >
                {joinMutation.isPending
                  ? <Loader2 size={16} className="animate-spin" />
                  : <><ShieldCheck size={16} /> Accept Mission</>}
              </button>
            </div>
          </div>
        </div>
      )}
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
      const now = Date.now();
      list = list.filter((c: any) => {
        const bounties: any[] = c.bounties ?? [];
        const contentTypes = new Set(bounties.map((b: any) => b.content_type));
        const totalXp = bounties.reduce((a: number, b: any) => a + Number(b.xp_reward ?? 0), 0);
        const demoLeft = Number(c.demo_keys_remaining ?? 0);
        const fullLeft = Number(c.full_keys_remaining ?? 0);
        const totalSlots = Number(c.demo_key_total ?? 0) + Number(c.full_key_total ?? 0);
        const totalTaken = totalSlots - demoLeft - fullLeft;
        const fillPct = totalSlots > 0 ? totalTaken / totalSlots : 0;
        const endMs = c.end_date ? new Date(c.end_date).getTime() : null;
        const daysLeft = endMs ? (endMs - now) / 86400000 : Infinity;
        const ageMs = c.created_at ? now - new Date(c.created_at).getTime() : Infinity;
        const agedays = ageMs / 86400000;

        for (const f of activeFilters) {
          // Campaign Status
          if (f === "status_demo"     && demoLeft === 0) return false;
          if (f === "status_nearly"   && fillPct < 0.75) return false;
          if (f === "status_ending"   && daysLeft > 7)   return false;
          if (f === "status_new"      && agedays > 14)   return false;
          if (f === "status_featured" && !c.is_featured) return false;
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

  // Top 3 trending campaigns for the hero slider
  const featuredSlides = useMemo(() => {
    const sorted = [...indieCampaigns].sort(
      (a: any, b: any) => Number(b.participant_count ?? 0) - Number(a.participant_count ?? 0),
    );
    // Pinned featured campaign always first
    const pinned = sorted.find((c: any) => c.is_featured);
    const rest = sorted.filter((c: any) => !c.is_featured);
    const ordered = pinned ? [pinned, ...rest] : sorted;
    return ordered.slice(0, 3);
  }, [indieCampaigns]);


  const openDetail = (c: any) => { setSelectedCampaign(c); setView("detail"); };

  return (
    <div className="min-h-screen" style={{ background: PAGE_BG }}>

      {/* ── Featured Slider (top 3 trending, auto-rotating) ── */}
      {mainTab === "marketplace" && !isLoading && featuredSlides.length > 0 && (
        <FeaturedSlider campaigns={featuredSlides} onSelect={openDetail} />
      )}

      {/* ── Community Stats strip ── */}
      {mainTab === "marketplace" && !isLoading && indieCampaigns.length > 0 && (
        <CommunityStats campaigns={indieCampaigns} />
      )}

      {/* ── Page header + tabs + search ── */}
      <div className="px-6 pt-6 pb-0">
        <div className="flex items-center justify-between mb-5">
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

      {/* ── Marketplace grid ── */}
      <div className="px-6 pb-10 mt-2">
        {mainTab === "marketplace" ? (
          <>
            {/* Marketplace header + search */}
            <div className="flex items-center gap-3 mb-4">
              <Store size={16} color={NEON} />
              <span className="text-base font-black text-white">Marketplace</span>
            </div>
            <div className="relative mb-5">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "rgba(255,255,255,0.35)" }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search games..."
                className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-white placeholder:text-white/30 outline-none transition-all"
                style={{ background: "#111820", border: "1px solid rgba(255,255,255,0.10)", fontFamily: "inherit" }}
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

            <div className="flex gap-6 items-start">
              {/* Filter sidebar — desktop, sticky */}
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

              {/* Campaign grid */}
              <div className="flex-1 min-w-0">
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
                        onClick={() => openDetail(c)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
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
