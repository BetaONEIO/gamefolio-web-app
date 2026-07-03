import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { getQueryFn } from "@/lib/queryClient";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useMobile } from "@/hooks/use-mobile";
import { useSignedUrl } from "@/hooks/use-signed-url";
import { DailyXPChallenges } from "@/components/home/DailyXPChallenges";
import {
  Zap, Trophy, Flame, Gift, Clock, ChevronRight, Upload,
  Eye, Heart, MessageCircle, LogIn, Award, Star, ArrowUpRight,
  TrendingUp, Users, Swords, Circle, CheckCircle2,
} from "lucide-react";
import bronzeMedal from "@assets/Bronze-league-medal_1783092079649.png";
import silverMedal from "@assets/Silver-league-medal_1783092079651.png";
import goldMedal from "@assets/Gold-league-medal_1783092079650.png";
import platinumMedal from "@assets/Platinum-league-medal_1783092079650.png";
import onyxMedal from "@assets/Onyx-league-medal_1783092079650.png";
import diamondMedal from "@assets/Rainbow-league-medal_1783093739515.png";
import championMedal from "@assets/Gg-league-medal_1783092079650.png";

/* ─── Types ─── */

interface DashboardData {
  player: {
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    level: number;
    totalXP: number;
    currentPoints: number;
    pointsForNextLevel: number;
    pointsRemaining: number;
    progressPercent: number;
    league: string;
    leagueColor: string;
    rank: number | null;
    currentStreak: number;
    longestStreak: number;
    lootboxReady: boolean;
  };
  today: {
    clipsWatchedToday: number;
    watch5Done: boolean;
    watch20Done: boolean;
    commentedToday: boolean;
    likedToday: boolean;
    sharedToday: boolean;
    loginXPToday: number;
    streakBonusToday: number;
    lootboxOpenedToday: boolean;
    firstUploadOfDayDone: boolean;
    xpEarnedToday: number;
  };
  bounties: Array<{
    id: number;
    title: string;
    campaignTitle: string | null;
    description: string | null;
    endDate: string | null;
    status: string;
    requiredClips: number;
    requiredReels: number;
    requiredScreenshots: number;
    requiredViews: number;
    clipsUploaded: number;
    reelsUploaded: number;
    screenshotsUploaded: number;
    totalViews: number;
    xpEarned: number;
    progressPercent: number;
    joinStatus: string;
    gameName: string | null;
    gameImage: string | null;
  }>;
  recentActivity: Array<{
    id: number;
    xpAmount: number;
    source: string;
    description: string | null;
    createdAt: string;
  }>;
  social: {
    followersCount: number;
    followingCount: number;
    nearbyRivals: Array<{
      rank: number;
      userId: number;
      username: string;
      displayName: string | null;
      avatarUrl: string | null;
      totalXP: number;
      isMe: boolean;
    }>;
  };
  nextRewards: Array<{
    type: string;
    name: string;
    description: string;
    xpNeeded?: number;
    available?: boolean;
  }>;
  seasonLeague: {
    tier: "Bronze" | "Silver" | "Gold" | "Platinum" | "Onyx" | "Diamond" | "Champion";
    league: string;
    leagueIcon: string;
    leagueColor: string;
    seasonXP: number;
    seasonRank: number | null;
    totalSeasonPlayers: number;
    nextLeague?: string;
    nextLeagueIcon?: string;
    nextThreshold?: number;
    xpToNext?: number;
    progressPercent?: number;
    rankToNext?: number | null;
    championCutoffXP?: number | null;
    xpToChampion?: number | null;
    rankToChampion?: number | null;
    isTopRank?: boolean;
  };
}

/* ─── Design Tokens ─── */

const DARK_BG = "#0B1218";
const BORDER = "#1B2A33";
const TEXT_PRIMARY = "#F5F7F2";
const TEXT_MUTED = "#B8C0AE";
const ACCENT = "#B7FF1A";
const ACCENT_DARK = "#071013";

/* ─── Reusable Components ─── */

function SectionCard({ children, className = "", style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`rounded-2xl overflow-hidden ${className}`}
      style={{ background: DARK_BG, border: `1px solid ${BORDER}`, ...style }}
    >
      {children}
    </div>
  );
}

function SectionHeader({ icon: Icon, title, action }: { icon: typeof Zap; title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-5 pt-5 pb-3">
      <div className="flex items-center gap-2">
        <Icon className="w-5 h-5" style={{ color: ACCENT }} />
        <h3 className="text-sm font-black tracking-wide uppercase" style={{ color: TEXT_PRIMARY }}>
          {title}
        </h3>
      </div>
      {action}
    </div>
  );
}

function XPBar({ percent, height = 8, animated = true }: { percent: number; height?: number; animated?: boolean }) {
  return (
    <div className="w-full rounded-full overflow-hidden" style={{ height, background: BORDER }}>
      <div
        className={`h-full rounded-full ${animated ? "transition-all duration-700 ease-out" : ""}`}
        style={{ width: `${Math.min(percent, 100)}%`, background: ACCENT }}
      />
    </div>
  );
}

function StatPill({ label, value, color = ACCENT, icon: Icon }: { label: string; value: string | number; color?: string; icon?: typeof Zap }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}` }}>
      {Icon && <Icon className="w-4 h-4" style={{ color }} />}
      <div>
        <div className="text-xs font-bold" style={{ color }}>{value}</div>
        <div className="text-[10px]" style={{ color: TEXT_MUTED }}>{label}</div>
      </div>
    </div>
  );
}

/* ─── Section 1: Player Overview ─── */

function SimpleAvatar({ url, name, size = "md" }: { url: string | null; name: string | null; size?: "sm" | "md" | "lg" | "xl" }) {
  const dim = size === "xl" ? "w-20 h-20" : size === "lg" ? "w-14 h-14" : size === "sm" ? "w-8 h-8" : "w-10 h-10";
  const { signedUrl } = useSignedUrl(url);
  return (
    <div className={`${dim} rounded-2xl border border-white/10 bg-[#0d1a24] overflow-hidden flex-shrink-0`}>
      <Avatar className="w-full h-full rounded-none">
        <AvatarImage src={signedUrl || undefined} className="object-cover" />
        <AvatarFallback className="bg-[#0d1a24] text-slate-400 rounded-none text-xs font-bold">
          {name?.charAt(0) ?? "?"}
        </AvatarFallback>
      </Avatar>
    </div>
  );
}

function PlayerOverview({ data, isLoading }: { data: DashboardData["player"] | undefined; isLoading: boolean }) {
  if (isLoading || !data) {
    return (
      <div className="relative max-w-7xl mr-auto ml-[8%] px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4 mb-6">
          <Skeleton className="w-20 h-20 rounded-2xl bg-white/20" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-6 w-48 bg-white/20" />
            <Skeleton className="h-4 w-32 bg-white/20" />
            <Skeleton className="h-3 w-full bg-white/20" />
          </div>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          <Skeleton className="h-16 rounded-xl bg-white/20" />
          <Skeleton className="h-16 rounded-xl bg-white/20" />
          <Skeleton className="h-16 rounded-xl bg-white/20" />
          <Skeleton className="h-16 rounded-xl bg-white/20" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="relative max-w-7xl mr-auto ml-[8%] px-4 sm:px-6 lg:px-8">
        {/* Top row: avatar + welcome + level */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative">
            <SimpleAvatar url={data.avatarUrl} name={data.displayName || data.username} size="xl" />
            <div
              className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider"
              style={{ background: data.leagueColor, color: ACCENT_DARK }}
            >
              {data.league}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium mb-0.5 text-white/60">Welcome back</p>
            <h2 className="text-xl sm:text-2xl font-black truncate text-white">
              {data.displayName || data.username}
            </h2>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-xs font-bold" style={{ color: ACCENT }}>Level {data.level}</span>
              {data.rank && (
                <span className="text-xs font-medium text-white/50">
                  #{data.rank} Ranked
                </span>
              )}
            </div>
          </div>
        </div>

        {/* XP Progress */}
        <div className="mb-5 max-w-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-white/50">
              {Math.round(data.currentPoints).toLocaleString()} / {Math.round(data.pointsForNextLevel).toLocaleString()} XP
            </span>
            <span className="text-xs font-bold" style={{ color: ACCENT }}>
              {Math.round(data.pointsRemaining).toLocaleString()} until next
            </span>
          </div>
          <XPBar percent={data.progressPercent} height={10} />
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-w-xl">
          <StatPill label="Streak" value={`${data.currentStreak} Day${data.currentStreak !== 1 ? "s" : ""}`} color="#FF6B35" icon={Flame} />
          <StatPill label="League" value={data.league} color={data.leagueColor} icon={Trophy} />
          {data.rank && <StatPill label="Rank" value={`#${data.rank}`} color={ACCENT} icon={TrendingUp} />}
          <StatPill
            label="Lootbox"
            value={data.lootboxReady ? "Ready!" : "Locked"}
            color={data.lootboxReady ? ACCENT : TEXT_MUTED}
            icon={Gift}
          />
        </div>
      </div>

      {/* Current League panel — anchored to far right edge of banner */}
      <div
        className="hidden lg:flex absolute top-1/2 right-[18%] -translate-y-1/2 flex-col items-center justify-center gap-2 px-8 py-6 rounded-2xl flex-shrink-0"
        style={{ border: `1px solid ${BORDER}`, background: "rgba(255,255,255,0.03)" }}
      >
        <p className="text-xs font-medium text-white/60">Current League</p>
        <LeagueMedal tier={data.league} size={108} />
        <p className="text-sm font-black" style={{ color: data.leagueColor }}>{data.league}</p>
      </div>
    </>
  );
}

/* ─── Section 3: Active Bounties ─── */

function ActiveBounties({ bounties, isLoading }: { bounties: DashboardData["bounties"] | undefined; isLoading: boolean }) {
  if (isLoading) {
    return (
      <SectionCard>
        <SectionHeader icon={Swords} title="Active Bounties" />
        <div className="px-5 pb-5 space-y-3">
          <Skeleton className="h-32 rounded-xl w-full" />
        </div>
      </SectionCard>
    );
  }

  if (!bounties || bounties.length === 0) {
    return (
      <SectionCard>
        <SectionHeader icon={Swords} title="Active Bounties" />
        <div className="px-5 pb-5 text-center py-6">
          <Swords className="w-8 h-8 mx-auto mb-2 opacity-20" style={{ color: TEXT_MUTED }} />
          <p className="text-sm" style={{ color: TEXT_MUTED }}>No active bounties</p>
          <Link href="/explore">
            <span className="text-xs font-semibold mt-2 inline-block cursor-pointer hover:opacity-80" style={{ color: ACCENT }}>
              Browse Bounties
            </span>
          </Link>
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard>
      <SectionHeader icon={Swords} title="Active Bounties" />
      <div className="px-5 pb-5 space-y-3">
        {bounties.map((b) => {
          const hasEnd = b.endDate ? new Date(b.endDate) : null;
          const daysLeft = hasEnd
            ? Math.max(0, Math.ceil((hasEnd.getTime() - Date.now()) / 86400000))
            : null;

          return (
            <div
              key={b.id}
              className="rounded-xl p-4 transition-colors hover:bg-white/[0.02]"
              style={{ border: `1px solid ${BORDER}`, background: "rgba(255,255,255,0.02)" }}
            >
              <div className="flex items-start gap-3 mb-3">
                <div
                  className="w-12 h-16 rounded-lg bg-cover bg-center flex-shrink-0"
                  style={{ backgroundImage: b.gameImage ? `url(${b.gameImage})` : undefined, backgroundColor: BORDER }}
                />
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold truncate" style={{ color: TEXT_PRIMARY }}>{b.title}</h4>
                  {b.campaignTitle && (
                    <p className="text-xs truncate" style={{ color: TEXT_MUTED }}>{b.campaignTitle}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: `${ACCENT}15`, color: ACCENT }}>
                      +{b.xpEarned} XP
                    </span>
                    {daysLeft !== null && (
                      <span className="text-[10px] flex items-center gap-1" style={{ color: TEXT_MUTED }}>
                        <Clock className="w-3 h-3" />{daysLeft}d left
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Progress */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-medium" style={{ color: TEXT_MUTED }}>Progress</span>
                  <span className="text-[10px] font-bold" style={{ color: ACCENT }}>{b.progressPercent}%</span>
                </div>
                <XPBar percent={b.progressPercent} height={5} animated={false} />
              </div>

              {/* Mini stats */}
              <div className="flex items-center gap-3 text-[10px]" style={{ color: TEXT_MUTED }}>
                <span>{b.clipsUploaded}/{b.requiredClips} clips</span>
                <span>{b.reelsUploaded}/{b.requiredReels} reels</span>
                <span>{b.screenshotsUploaded}/{b.requiredScreenshots} shots</span>
              </div>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}

/* ─── Section 4: Ranked Season ─── */

const LEAGUE_MEDALS: Record<string, string> = {
  Bronze: bronzeMedal,
  Silver: silverMedal,
  Gold: goldMedal,
  Platinum: platinumMedal,
  Onyx: onyxMedal,
  Diamond: diamondMedal,
  Champion: championMedal,
};

const LEAGUE_STRUCTURE = [
  { name: "Bronze", range: "0 – 999 Season XP" },
  { name: "Silver", range: "1,000 – 2,999 Season XP" },
  { name: "Gold", range: "3,000 – 5,999 Season XP" },
  { name: "Platinum", range: "6,000 – 9,999 Season XP" },
  { name: "Onyx", range: "10,000+ Season XP" },
  { name: "Diamond", range: "Top 100 Players" },
  { name: "Champion", range: "Top 10 Players" },
];

function getLeagueGradient(league: string) {
  switch (league) {
    case "Bronze":   return "linear-gradient(90deg, #8B4513, #CD7F32, #D2691E)";
    case "Silver":   return "linear-gradient(90deg, #A0A0A0, #E8E8E8, #FFFFFF)";
    case "Gold":     return "linear-gradient(90deg, #B8860B, #FFD700, #FFA500)";
    case "Platinum": return "linear-gradient(90deg, #0288D1, #4FC3F7, #E1F5FE)";
    case "Onyx":     return "linear-gradient(90deg, #2E1065, #8B5CF6, #C4B5FD)";
    case "Diamond":  return "linear-gradient(90deg, #6366F1, #E0E7FF, #FFFFFF)";
    case "Champion": return "linear-gradient(90deg, #3F6212, #B7FF1A, #FEF08A)";
    default:         return "linear-gradient(90deg, #B7FF1A, #D9FF80)";
  }
}

const LEAGUE_MESH_COLORS: Record<string, [string, string, string]> = {
  Bronze:   ["#CD7F32", "#8B4513", "#D2691E"],
  Silver:   ["#E8E8E8", "#A0A0A0", "#FFFFFF"],
  Gold:     ["#FFD700", "#B8860B", "#FFA500"],
  Platinum: ["#4FC3F7", "#0288D1", "#E1F5FE"],
  Onyx:     ["#8B5CF6", "#2E1065", "#C4B5FD"],
  Diamond:  ["#E0E7FF", "#6366F1", "#FFFFFF"],
  Champion: ["#B7FF1A", "#3F6212", "#FEF08A"],
};

function getLeagueMeshBackground(league: string): React.CSSProperties {
  const [a, b, c] = LEAGUE_MESH_COLORS[league] ?? [ACCENT, "#3F6212", "#D9FF80"];
  return {
    backgroundColor: DARK_BG,
    backgroundImage: [
      `radial-gradient(ellipse 80% 60% at 12% 0%, ${a}33, transparent 60%)`,
      `radial-gradient(ellipse 70% 55% at 95% 15%, ${b}2E, transparent 65%)`,
      `radial-gradient(ellipse 65% 60% at 50% 110%, ${c}26, transparent 70%)`,
      `linear-gradient(160deg, ${a}14, transparent 55%)`,
    ].join(", "),
  };
}

const SUMMER_SHOWDOWN_END = new Date(2026, 7, 31, 23, 59, 59);

function useCountdownTo(target: Date) {
  const [diff, setDiff] = useState(Math.max(0, target.getTime() - Date.now()));
  useEffect(() => {
    const id = setInterval(() => setDiff(Math.max(0, target.getTime() - Date.now())), 1000);
    return () => clearInterval(id);
  }, [target]);
  const days    = Math.floor(diff / 86_400_000);
  const hours   = Math.floor((diff % 86_400_000) / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  const seconds = Math.floor((diff % 60_000) / 1000);
  return { days, hours, minutes, seconds };
}

function ShowdownCountdown() {
  const { days, hours, minutes, seconds } = useCountdownTo(SUMMER_SHOWDOWN_END);
  const units = [
    { label: "Days", value: days },
    { label: "Hrs", value: hours },
    { label: "Min", value: minutes },
    { label: "Sec", value: seconds },
  ];
  return (
    <div
      className="flex items-center justify-between rounded-xl p-3 mb-5"
      style={{ background: "rgba(0,0,0,0.22)", border: `1px solid ${BORDER}` }}
    >
      <div className="flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5" style={{ color: ACCENT }} />
        <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: TEXT_MUTED }}>
          Summer Showdown ends in
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        {units.map((u, i) => (
          <div key={u.label} className="flex items-center gap-1.5">
            <div className="flex flex-col items-center min-w-[30px]">
              <span className="text-sm font-black tabular-nums" style={{ color: TEXT_PRIMARY }}>
                {String(u.value).padStart(2, "0")}
              </span>
              <span className="text-[8px] uppercase tracking-wide" style={{ color: TEXT_MUTED }}>{u.label}</span>
            </div>
            {i < units.length - 1 && <span className="text-xs font-bold" style={{ color: TEXT_MUTED }}>:</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function LeagueMedal({ tier, size = 64 }: { tier: string; size?: number }) {
  const src = LEAGUE_MEDALS[tier] ?? bronzeMedal;
  return (
    <img
      src={src}
      alt={`${tier} League medal`}
      style={{ width: size, height: size, objectFit: "contain" }}
      className="flex-shrink-0 drop-shadow-[0_0_12px_rgba(0,0,0,0.4)]"
    />
  );
}

function RankedSeason({ data, isLoading }: { data: DashboardData["seasonLeague"] | undefined; isLoading: boolean }) {
  if (isLoading || !data) {
    return (
      <SectionCard>
        <SectionHeader icon={Trophy} title="League Progress" />
        <div className="px-5 pb-5 space-y-3">
          <Skeleton className="h-32 rounded-xl w-full" />
        </div>
      </SectionCard>
    );
  }

  const isChampion = data.tier === "Champion";
  const isDiamond = data.tier === "Diamond";
  const isOnyx = data.tier === "Onyx";
  const isBelowOnyx = !isChampion && !isDiamond && !isOnyx;

  return (
    <SectionCard style={getLeagueMeshBackground(data.league)}>
      <SectionHeader
        icon={Trophy}
        title="League Progress"
        action={
          <Link href="/leaderboard">
            <span className="text-xs font-semibold flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity" style={{ color: ACCENT }}>
              Leaderboard <ChevronRight className="w-3 h-3" />
            </span>
          </Link>
        }
      />
      <div className="px-5 pb-5">
        <ShowdownCountdown />
        {/* Current league badge */}
        <div className="flex items-center gap-4 mb-6">
          <LeagueMedal tier={data.league} size={80} />
          <div>
            <p className="text-xs font-medium mb-0.5" style={{ color: TEXT_MUTED }}>Current League</p>
            <h4 className="text-xl font-black" style={{ color: data.leagueColor }}>
              {data.league} League
            </h4>
            {data.seasonRank && (
              <p className="text-xs" style={{ color: TEXT_MUTED }}>Rank #{data.seasonRank.toLocaleString()}</p>
            )}
          </div>
        </div>

        {/* Bronze -> Onyx: medal-to-medal XP progress bar */}
        {isBelowOnyx && (
          <>
            <div className="flex items-center justify-center gap-3 sm:gap-5 mb-3">
              <div className="flex flex-col items-center gap-2 w-20 flex-shrink-0">
                <LeagueMedal tier={data.league} size={96} />
                <span className="text-[11px] font-bold text-center leading-tight" style={{ color: TEXT_PRIMARY }}>
                  {data.league} League
                </span>
              </div>
              <div className="flex-1">
                <div className="w-full rounded-full overflow-hidden h-2" style={{ background: "#FFFFFF" }}>
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${Math.min(data.progressPercent ?? 0, 100)}%`, background: getLeagueGradient(data.league) }}
                  />
                </div>
              </div>
              <div className="flex flex-col items-center gap-2 w-20 flex-shrink-0">
                <LeagueMedal tier={data.nextLeague ?? "Onyx"} size={96} />
                <span className="text-[11px] font-bold text-center leading-tight" style={{ color: TEXT_PRIMARY }}>
                  {data.nextLeague} League
                </span>
              </div>
            </div>
            <div className="flex items-center justify-center mb-3">
              <span className="text-xs font-bold" style={{ color: TEXT_PRIMARY }}>
                {data.seasonXP.toLocaleString()} / {(data.nextThreshold ?? 0).toLocaleString()} Season XP
              </span>
            </div>
            <div className="flex items-center justify-center rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}` }}>
              <span className="text-xs font-semibold" style={{ color: ACCENT }}>
                {(data.xpToNext ?? 0).toLocaleString()} XP until {data.nextLeague} League
              </span>
            </div>
          </>
        )}

        {/* Onyx: rank-based progress toward Diamond */}
        {isOnyx && (
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-3 sm:gap-5 mb-1">
              <div className="flex flex-col items-center gap-2 w-20 flex-shrink-0">
                <LeagueMedal tier="Onyx" size={96} />
                <span className="text-[11px] font-bold text-center leading-tight" style={{ color: TEXT_PRIMARY }}>
                  Onyx League
                </span>
              </div>
              <ArrowUpRight className="w-5 h-5 flex-shrink-0" style={{ color: TEXT_MUTED }} />
              <div className="flex flex-col items-center gap-2 w-20 flex-shrink-0">
                <LeagueMedal tier="Diamond" size={96} />
                <span className="text-[11px] font-bold text-center leading-tight" style={{ color: TEXT_PRIMARY }}>
                  Diamond League
                </span>
              </div>
            </div>
            <div className="p-4 rounded-xl text-center" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}` }}>
              <p className="text-[10px] font-medium mb-1 uppercase tracking-wide" style={{ color: TEXT_MUTED }}>Current Rank</p>
              <p className="text-3xl font-black" style={{ color: ACCENT }}>#{data.seasonRank?.toLocaleString()}</p>
            </div>
            <div className="flex items-center justify-center rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}` }}>
              <span className="text-xs font-semibold" style={{ color: ACCENT }}>
                Only {(data.rankToNext ?? 0).toLocaleString()} place{data.rankToNext === 1 ? "" : "s"} until Diamond
              </span>
            </div>
            <p className="text-[11px] text-center" style={{ color: TEXT_MUTED }}>
              Diamond League — Top 100 Players
            </p>
          </div>
        )}

        {/* Diamond: rank + XP cutoff to Champion */}
        {isDiamond && (
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-3 sm:gap-5 mb-1">
              <div className="flex flex-col items-center gap-2 w-20 flex-shrink-0">
                <LeagueMedal tier="Diamond" size={96} />
                <span className="text-[11px] font-bold text-center leading-tight" style={{ color: TEXT_PRIMARY }}>
                  Diamond League
                </span>
              </div>
              <ArrowUpRight className="w-5 h-5 flex-shrink-0" style={{ color: TEXT_MUTED }} />
              <div className="flex flex-col items-center gap-2 w-20 flex-shrink-0">
                <LeagueMedal tier="Champion" size={96} />
                <span className="text-[11px] font-bold text-center leading-tight" style={{ color: TEXT_PRIMARY }}>
                  Champion League
                </span>
              </div>
            </div>
            <div className="p-4 rounded-xl text-center" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}` }}>
              <p className="text-[10px] font-medium mb-1 uppercase tracking-wide" style={{ color: TEXT_MUTED }}>Current Rank</p>
              <p className="text-3xl font-black" style={{ color: ACCENT }}>#{data.seasonRank?.toLocaleString()}</p>
              <p className="text-[11px] mt-1" style={{ color: TEXT_MUTED }}>Champion requires Top 10</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}` }}>
                <p className="text-[10px] font-medium mb-1" style={{ color: TEXT_MUTED }}>Champion Cutoff</p>
                <p className="text-sm font-bold" style={{ color: TEXT_PRIMARY }}>
                  {(data.championCutoffXP ?? 0).toLocaleString()} XP
                </p>
              </div>
              <div className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}` }}>
                <p className="text-[10px] font-medium mb-1" style={{ color: TEXT_MUTED }}>Your XP</p>
                <p className="text-sm font-bold" style={{ color: TEXT_PRIMARY }}>{data.seasonXP.toLocaleString()} XP</p>
              </div>
            </div>
            <div className="flex items-center justify-center rounded-xl p-3" style={{ background: `${ACCENT}0D`, border: `1px solid ${ACCENT}30` }}>
              <span className="text-xs font-semibold" style={{ color: ACCENT }}>
                {(data.xpToChampion ?? 0).toLocaleString()} XP Needed
              </span>
            </div>
          </div>
        )}

        {/* Champion: top of the ladder */}
        {isChampion && (
          <div className="space-y-3">
            <div className="flex justify-center mb-1">
              <div className="flex flex-col items-center gap-2 w-24">
                <LeagueMedal tier="Champion" size={112} />
                <span className="text-xs font-bold text-center leading-tight" style={{ color: TEXT_PRIMARY }}>
                  Champion League
                </span>
              </div>
            </div>
            <div
              className="p-4 rounded-xl text-center"
              style={{ background: `${ACCENT}14`, border: `1px solid ${ACCENT}50` }}
            >
              <p className="text-[10px] font-medium mb-1 uppercase tracking-wide" style={{ color: TEXT_MUTED }}>Current Rank</p>
              <p className="text-3xl font-black" style={{ color: ACCENT }}>#{data.seasonRank?.toLocaleString()}</p>
              <p className="text-[11px] mt-1" style={{ color: TEXT_MUTED }}>
                {data.isTopRank ? "You're #1 this season!" : "You're in the Top 10 — pushing for #1"}
              </p>
            </div>
            <div className="flex items-center justify-between rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}` }}>
              <span className="text-xs font-semibold" style={{ color: TEXT_MUTED }}>Season XP</span>
              <span className="text-sm font-bold" style={{ color: TEXT_PRIMARY }}>{data.seasonXP.toLocaleString()} XP</span>
            </div>
          </div>
        )}

        {/* League structure legend */}
        <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${BORDER}` }}>
          <div className="flex flex-wrap gap-1.5">
            {LEAGUE_STRUCTURE.map((tier) => {
              const active = tier.name === data.league;
              const [leagueColor] = LEAGUE_MESH_COLORS[tier.name] ?? [ACCENT];
              return (
                <div
                  key={tier.name}
                  title={tier.range}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-semibold"
                  style={{
                    background: active ? `${leagueColor}26` : `${leagueColor}14`,
                    border: `1px solid ${active ? leagueColor : `${leagueColor}55`}`,
                    color: leagueColor,
                  }}
                >
                  <img src={LEAGUE_MEDALS[tier.name]} alt="" className="w-4 h-4 object-contain" />
                  <span>{tier.name}</span>
                </div>
              );
            })}
          </div>
          <p className="text-[10px] mt-2" style={{ color: TEXT_MUTED }}>
            Season XP and League reset each season. Lifetime XP, Level, and achievements are permanent.
          </p>
        </div>
      </div>
    </SectionCard>
  );
}

/* ─── Section 5: Next Rewards ─── */

function NextRewards({ rewards, isLoading }: { rewards: DashboardData["nextRewards"] | undefined; isLoading: boolean }) {
  if (isLoading) {
    return (
      <SectionCard>
        <SectionHeader icon={Gift} title="Next Rewards" />
        <div className="px-5 pb-5 grid grid-cols-2 gap-3">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      </SectionCard>
    );
  }

  const rewardIcons: Record<string, typeof Gift> = {
    level: Star,
    lootbox: Gift,
    badge: Award,
    cosmetic: Zap,
  };

  return (
    <SectionCard>
      <SectionHeader icon={Gift} title="Next Rewards" />
      <div className="px-5 pb-5 grid grid-cols-2 gap-3">
        {(rewards || []).map((r, i) => {
          const Icon = rewardIcons[r.type] || Gift;
          const isAvailable = r.available ?? (r.xpNeeded !== undefined && r.xpNeeded <= 0);
          return (
            <div
              key={i}
              className="rounded-xl p-4 transition-colors hover:bg-white/[0.03]"
              style={{
                background: isAvailable ? `${ACCENT}08` : "rgba(255,255,255,0.02)",
                border: `1px solid ${isAvailable ? `${ACCENT}25` : BORDER}`,
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon className="w-4 h-4" style={{ color: isAvailable ? ACCENT : TEXT_MUTED }} />
                <span className="text-xs font-bold" style={{ color: TEXT_PRIMARY }}>{r.name}</span>
              </div>
              <p className="text-[10px] mb-2" style={{ color: TEXT_MUTED }}>{r.description}</p>
              {r.xpNeeded !== undefined && r.xpNeeded > 0 && (
                <span className="text-[10px] font-bold" style={{ color: ACCENT }}>{r.xpNeeded.toLocaleString()} XP to go</span>
              )}
              {isAvailable && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: ACCENT, color: ACCENT_DARK }}>Ready!</span>
              )}
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}

/* ─── Section 6: Recent XP Activity ─── */

const ACTIVITY_ICONS: Record<string, typeof Zap> = {
  watch_clip_counted: Eye,
  like: Heart,
  comment: MessageCircle,
  share_given: ArrowUpRight,
  upload: Upload,
  daily_login: LogIn,
  lootbox_bonus: Gift,
  streak_milestone: Flame,
  view: Eye,
  other: Zap,
};

function RecentActivity({ activity, isLoading }: { activity: DashboardData["recentActivity"] | undefined; isLoading: boolean }) {
  if (isLoading) {
    return (
      <SectionCard>
        <SectionHeader icon={Zap} title="Recent XP Activity" />
        <div className="px-5 pb-5 space-y-3">
          <Skeleton className="h-10 rounded-xl w-full" />
          <Skeleton className="h-10 rounded-xl w-full" />
          <Skeleton className="h-10 rounded-xl w-full" />
        </div>
      </SectionCard>
    );
  }

  if (!activity || activity.length === 0) {
    return (
      <SectionCard>
        <SectionHeader icon={Zap} title="Recent XP Activity" />
        <div className="px-5 pb-5 text-center py-6">
          <Zap className="w-8 h-8 mx-auto mb-2 opacity-20" style={{ color: TEXT_MUTED }} />
          <p className="text-sm" style={{ color: TEXT_MUTED }}>No recent activity</p>
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard>
      <SectionHeader icon={Zap} title="Recent XP Activity" />
      <div className="px-5 pb-5 space-y-2">
        {activity.slice(0, 10).map((item) => {
          const Icon = ACTIVITY_ICONS[item.source] || Zap;
          return (
            <div
              key={item.id}
              className="flex items-center gap-3 p-3 rounded-xl"
              style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: `${ACCENT}10` }}
              >
                <Icon className="w-4 h-4" style={{ color: ACCENT }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: TEXT_PRIMARY }}>
                  {item.description || item.source.replace(/_/g, " ")}
                </p>
                <p className="text-[10px]" style={{ color: TEXT_MUTED }}>
                  {new Date(item.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </p>
              </div>
              <span className="text-sm font-bold shrink-0" style={{ color: ACCENT }}>+{item.xpAmount} XP</span>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}

/* ─── Section 7: Friends & Rivals ─── */

function FriendsRivals({ data, isLoading }: { data: DashboardData["social"] | undefined; isLoading: boolean }) {
  if (isLoading) {
    return (
      <SectionCard>
        <SectionHeader icon={Users} title="Rivals" />
        <div className="px-5 pb-5 space-y-3">
          <Skeleton className="h-14 rounded-xl w-full" />
          <Skeleton className="h-14 rounded-xl w-full" />
        </div>
      </SectionCard>
    );
  }

  const rivals = data?.nearbyRivals || [];

  return (
    <SectionCard>
      <SectionHeader
        icon={Users}
        title="Rivals"
        action={
          <Link href="/leaderboard">
            <span className="text-xs font-semibold flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity" style={{ color: ACCENT }}>
              Full Board <ChevronRight className="w-3 h-3" />
            </span>
          </Link>
        }
      />
      <div className="px-5 pb-5">
        {/* Social counts */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1 p-3 rounded-xl text-center" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}` }}>
            <div className="text-lg font-bold" style={{ color: TEXT_PRIMARY }}>{data?.followersCount ?? 0}</div>
            <div className="text-[10px]" style={{ color: TEXT_MUTED }}>Followers</div>
          </div>
          <div className="flex-1 p-3 rounded-xl text-center" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}` }}>
            <div className="text-lg font-bold" style={{ color: TEXT_PRIMARY }}>{data?.followingCount ?? 0}</div>
            <div className="text-[10px]" style={{ color: TEXT_MUTED }}>Following</div>
          </div>
        </div>

        {/* Nearby rivals */}
        {rivals.length > 0 ? (
          <div className="space-y-2">
            {rivals.map((r) => (
              <Link key={r.userId} href={`/profile/${r.username}`}>
                <div
                  className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${
                    r.isMe ? "bg-white/[0.04]" : "hover:bg-white/[0.02]"
                  }`}
                  style={{ border: `1px solid ${r.isMe ? `${ACCENT}20` : BORDER}` }}
                >
                  <div className="w-6 text-center text-xs font-black" style={{ color: r.isMe ? ACCENT : TEXT_MUTED }}>
                    #{r.rank}
                  </div>
                  <SimpleAvatar url={r.avatarUrl} name={r.displayName || r.username} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${r.isMe ? "font-bold" : ""}`} style={{ color: r.isMe ? ACCENT : TEXT_PRIMARY }}>
                      {r.displayName || r.username}{r.isMe ? " (You)" : ""}
                    </p>
                  </div>
                  <span className="text-xs font-bold" style={{ color: TEXT_MUTED }}>
                    {r.totalXP.toLocaleString()} XP
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm" style={{ color: TEXT_MUTED }}>Climb the leaderboard to find rivals!</p>
          </div>
        )}
      </div>
    </SectionCard>
  );
}

/* ─── Main Page ─── */

export default function DashboardPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const isMobile = useMobile();

  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ["/api/dashboard"],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!user?.id,
  });

  // Redirect unauthenticated users
  useEffect(() => {
    if (!user && !isLoading) {
      setLocation("/auth");
    }
  }, [user, isLoading, setLocation]);

  if (!user) return null;

  return (
    <div className="min-h-screen" style={{ background: ACCENT_DARK }}>
      {/* Full-width hero banner */}
      <div className="relative flex flex-col" style={{ minHeight: isMobile ? 340 : 380 }}>
        <div
          className="absolute inset-0"
          style={{ backgroundImage: "url('/attached_assets/Flame_1783087368020.png')", backgroundSize: "cover", backgroundPosition: "center" }}
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,rgba(5,9,13,0.60) 0%,rgba(8,14,24,0.65) 45%,rgba(5,9,13,0.92) 100%)" }} />

        {/* Warm glow orb behind avatar */}
        <div className="absolute bottom-0 left-20 w-64 h-48 blur-3xl opacity-20 pointer-events-none"
          style={{ background: "radial-gradient(ellipse,#FF6B35,transparent 70%)" }} />

        <div className="relative w-full flex-1 flex flex-col justify-center">
          <PlayerOverview data={data?.player} isLoading={isLoading} />
        </div>
      </div>

      {/* Content area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {isMobile ? (
          /* Mobile: stacked single column */
          <div className="space-y-5 pb-24">
            <div className="-mx-4 sm:-mx-6">
              <DailyXPChallenges />
            </div>
            <ActiveBounties bounties={data?.bounties} isLoading={isLoading} />
            <RankedSeason data={data?.seasonLeague} isLoading={isLoading} />
            <NextRewards rewards={data?.nextRewards} isLoading={isLoading} />
            <RecentActivity activity={data?.recentActivity} isLoading={isLoading} />
            <FriendsRivals data={data?.social} isLoading={isLoading} />
          </div>
        ) : (
          /* Desktop: two-column layout */
          <div className="space-y-5 pb-8">
            <div className="-mx-4 sm:-mx-6 lg:-mx-8">
              <DailyXPChallenges />
            </div>

            <RankedSeason data={data?.seasonLeague} isLoading={isLoading} />

            <div className="grid grid-cols-12 gap-5">
              {/* Left column (wider) */}
              <div className="col-span-8 space-y-5">
                <div className="grid grid-cols-2 gap-5">
                  <ActiveBounties bounties={data?.bounties} isLoading={isLoading} />
                  <NextRewards rewards={data?.nextRewards} isLoading={isLoading} />
                </div>

                <RecentActivity activity={data?.recentActivity} isLoading={isLoading} />
              </div>

              {/* Right column (narrower) */}
              <div className="col-span-4 space-y-5">
                <FriendsRivals data={data?.social} isLoading={isLoading} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
