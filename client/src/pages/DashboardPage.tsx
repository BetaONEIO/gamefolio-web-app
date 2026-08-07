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
  BarChart2, Target, Film, Image as ImageIcon, Share2, Play,
} from "lucide-react";
import bronzeMedal from "@assets/Bronze-league-medal_1783092079649.png";
import silverMedal from "@assets/Silver-league-medal_1783092079651.png";
import goldMedal from "@assets/Gold-league-medal_1783092079650.png";
import platinumMedal from "@assets/Platinum-league-medal_1783092079650.png";
import onyxMedal from "@assets/Onyx-league-medal_1783092079650.png";
import diamondMedal from "@assets/Rainbow-league-medal_1783093739515.png";
import championMedal from "@assets/Gg-league-medal_1783092079650.png";

/* ─── Types ─── */

interface TopUpload {
  id: number;
  title: string;
  thumbnailUrl: string | null;
  views: number;
  likeCount: number;
  commentCount: number;
  createdAt: string;
  contentType: "clip" | "reel" | "screenshot";
}

interface DashGoal {
  type: string;
  label: string;
  detail: string;
  current: number;
  target: number;
  percent: number;
  unit: string;
  href: string | null;
  completed?: boolean;
  ready?: boolean;
}

interface SeasonXPBreakdownItem {
  source: string;
  eventCount: number;
  totalXP: number;
}

interface SeasonLeagueTier {
  name: string;
  icon: string;
  color: string;
  min: number;
  max: number;
  philosophy: string;
  reward: string;
  rankGate?: number;
}

interface SeasonMicroGoal {
  type: string;
  label: string;
  detail: string;
  current: number;
  target: number;
  progressPercent: number;
  href: string;
}

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
  creator: {
    totalViews: number;
    totalLikes: number;
    totalComments: number;
    totalUploads: number;
    newFollowersThisWeek: number;
    topClip: TopUpload | null;
    topReel: TopUpload | null;
    topScreenshot: TopUpload | null;
    recentUploads: TopUpload[];
  };
  goals: DashGoal[];
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
    seasonName?: string;
    seasonDateRange?: string;
    seasonEnd?: string;
    breakdown?: SeasonXPBreakdownItem[];
    tiers?: SeasonLeagueTier[];
    currentTier?: SeasonLeagueTier;
    microGoals?: SeasonMicroGoal[];
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
        style={{ border: `2px solid ${data.leagueColor}`, background: "#0d1a24" }}
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
          <span className="text-xs font-semibold mt-2 inline-block" style={{ color: ACCENT }}>
            Coming Soon
          </span>
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

function ShowdownCountdown({ seasonName, seasonEnd }: { seasonName?: string; seasonEnd?: string }) {
  const target = seasonEnd ? new Date(seasonEnd) : new Date();
  const { days, hours, minutes, seconds } = useCountdownTo(target);
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
           {seasonName ?? "Ranked Season"} ends in
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

const SEASON_XP_SOURCE_INFO: Record<string, { label: string; rule: string }> = {
  view: { label: "Content views", rule: "1 XP per valid view" },
  upload: { label: "Clip & reel uploads", rule: "250 XP per upload" },
  screenshot_upload: { label: "Screenshot uploads", rule: "100 XP per upload" },
  like_received: { label: "Likes received", rule: "XP from content engagement" },
  fire_received: { label: "Fires received", rule: "50 XP per unique fire" },
  lootbox: { label: "Lootboxes", rule: "XP based on the lootbox reward" },
  referral: { label: "Referrals", rule: "500 XP per successful referral" },
  referral_bonus: { label: "Referral signup bonus", rule: "100 XP for signing up with a referral" },
  daily_login: { label: "Daily login", rule: "XP from daily login activity" },
  welcome_bonus: { label: "Welcome bonus", rule: "One-time welcome XP" },
  mac_bonus: { label: "Bonus XP", rule: "Promotional bonus XP" },
  other: { label: "Other XP", rule: "Bounties and other approved rewards" },
};

function SeasonXPBreakdown({
  seasonXP,
  breakdown,
}: {
  seasonXP: number;
  breakdown: SeasonXPBreakdownItem[] | undefined;
}) {
  const items = breakdown ?? [];
  const breakdownTotal = items.reduce((sum, item) => sum + item.totalXP, 0);

  return (
    <details className="mt-4 rounded-xl" style={{ background: "rgba(255,255,255,0.025)", border: `1px solid ${BORDER}` }}>
      <summary
        className="flex cursor-pointer list-none items-center justify-between gap-3 p-3.5"
        style={{ color: TEXT_PRIMARY }}
      >
        <span className="flex items-center gap-2">
          <BarChart2 className="w-4 h-4" style={{ color: ACCENT }} />
          <span className="text-xs font-bold">How your Season XP is earned</span>
        </span>
        <span className="text-[10px] font-semibold" style={{ color: TEXT_MUTED }}>
          {items.length} source{items.length === 1 ? "" : "s"} <span className="ml-1 text-white/30">＋</span>
        </span>
      </summary>
      <div className="space-y-2 border-t px-3.5 pb-3.5 pt-3" style={{ borderColor: BORDER }}>
        {items.length === 0 ? (
          <p className="py-2 text-xs" style={{ color: TEXT_MUTED }}>
            No Season XP has been earned yet this season.
          </p>
        ) : (
          items.map((item) => {
            const info = SEASON_XP_SOURCE_INFO[item.source] ?? {
              label: item.source.replace(/_/g, " "),
              rule: "Approved XP reward",
            };
            const share = seasonXP > 0 ? Math.round((item.totalXP / seasonXP) * 100) : 0;
            return (
              <div key={item.source} className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs font-semibold" style={{ color: TEXT_PRIMARY }}>
                      {info.label}
                    </span>
                    <span className="shrink-0 text-xs font-black tabular-nums" style={{ color: ACCENT }}>
                      +{item.totalXP.toLocaleString()} XP
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center justify-between gap-2">
                    <span className="truncate text-[10px]" style={{ color: TEXT_MUTED }}>
                      {item.eventCount.toLocaleString()} event{item.eventCount === 1 ? "" : "s"} · {info.rule}
                    </span>
                    <span className="shrink-0 text-[10px]" style={{ color: TEXT_MUTED }}>{share}%</span>
                  </div>
                  <div className="mt-1 h-1 overflow-hidden rounded-full" style={{ background: BORDER }}>
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${Math.min(share, 100)}%`, background: ACCENT }}
                    />
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div className="flex items-center justify-between border-t pt-2" style={{ borderColor: BORDER }}>
          <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: TEXT_MUTED }}>Breakdown total</span>
          <span className="text-xs font-black tabular-nums" style={{ color: TEXT_PRIMARY }}>
            {breakdownTotal.toLocaleString()} / {seasonXP.toLocaleString()} XP
          </span>
        </div>
      </div>
    </details>
  );
}

function LeagueJourney({
  currentLeague,
  nextLeague,
  tiers,
}: {
  currentLeague: string;
  nextLeague?: string;
  tiers: SeasonLeagueTier[] | undefined;
}) {
  const journey = tiers ?? [];
  return (
    <details className="mt-4 rounded-xl" style={{ background: "rgba(255,255,255,0.025)", border: `1px solid ${BORDER}` }}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3.5">
        <span className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4" style={{ color: ACCENT }} />
          <span className="text-xs font-bold" style={{ color: TEXT_PRIMARY }}>League journey</span>
        </span>
        <span className="text-[10px] font-semibold" style={{ color: TEXT_MUTED }}>XP & rewards <span className="ml-1 text-white/30">＋</span></span>
      </summary>
      <div className="border-t px-3.5 pb-3.5 pt-2" style={{ borderColor: BORDER }}>
        <div className="mb-4 flex items-start">
          {journey.map((tier, index) => {
            const active = tier.name === currentLeague;
            const next = tier.name === nextLeague;
            const unlocked = (tiers?.findIndex((item) => item.name === currentLeague) ?? 0) >= index;
            return (
              <div key={tier.name} className="flex min-w-0 flex-1 items-start">
                <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-full text-lg transition-all ${active ? "ring-2 ring-offset-2 ring-offset-[#0B1218]" : ""} ${tier.name === "Champion" ? "animate-pulse" : ""}`}
                    style={{
                      background: `${tier.color}${active || next ? "30" : "14"}`,
                      border: `1px solid ${tier.color}${active || next ? "B0" : "40"}`,
                      boxShadow: active ? `0 0 16px ${tier.color}70` : undefined,
                      outlineColor: active ? tier.color : undefined,
                      opacity: unlocked || next ? 1 : 0.5,
                    }}
                  >
                    {tier.icon}
                  </div>
                  <span className="truncate text-[9px] font-bold" style={{ color: active ? tier.color : TEXT_MUTED }}>
                    {tier.name}
                  </span>
                  <span className="text-[8px] tabular-nums" style={{ color: TEXT_MUTED }}>
                    {tier.min.toLocaleString()} XP
                  </span>
                </div>
                {index < journey.length - 1 && (
                  <div className="mt-4 h-px min-w-1 flex-1" style={{ background: unlocked ? tier.color : BORDER }} />
                )}
              </div>
            );
          })}
        </div>
        <div className="space-y-0">
          {journey.map((tier) => {
            const active = tier.name === currentLeague;
            const [leagueColor] = LEAGUE_MESH_COLORS[tier.name] ?? [tier.color];
          return (
            <div
              key={tier.name}
              className="flex items-center gap-2.5 border-b py-2.5 last:border-b-0"
              style={{ borderColor: BORDER, opacity: active ? 1 : 0.82 }}
            >
              <img src={LEAGUE_MEDALS[tier.name]} alt="" className="h-8 w-8 object-contain" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold" style={{ color: active ? leagueColor : TEXT_PRIMARY }}>
                    {tier.name}
                    {active && <span className="ml-1.5 text-[9px] uppercase tracking-wide" style={{ color: ACCENT }}>Current</span>}
                  </span>
                  <span className="shrink-0 text-xs font-black tabular-nums" style={{ color: leagueColor }}>
                    {tier.min.toLocaleString()}+ XP
                  </span>
                </div>
                <p className="mt-0.5 text-[10px]" style={{ color: TEXT_MUTED }}>
                  {tier.philosophy} · Reward: {tier.reward}
                  {tier.rankGate ? ` · Top ${tier.rankGate}` : ""}
                </p>
              </div>
            </div>
          );
          })}
        </div>
        <p className="pt-2 text-[10px]" style={{ color: TEXT_MUTED }}>
          Season XP resets each season. Diamond and Champion require both their XP threshold and the listed leaderboard rank.
        </p>
      </div>
    </details>
  );
}

function SeasonMicroGoals({ goals }: { goals: SeasonMicroGoal[] | undefined }) {
  if (!goals?.length) return null;
  return (
    <div className="mt-4 rounded-xl p-3.5" style={{ background: "rgba(255,255,255,0.025)", border: `1px solid ${BORDER}` }}>
      <div className="mb-3 flex items-center gap-2">
        <Target className="h-4 w-4" style={{ color: ACCENT }} />
        <span className="text-xs font-bold" style={{ color: TEXT_PRIMARY }}>Next goals</span>
      </div>
      <div className="space-y-2.5">
        {goals.slice(0, 3).map((goal) => (
          <Link key={goal.type} href={goal.href}>
            <div className="rounded-lg p-2.5 transition-colors hover:bg-white/[0.04]" style={{ background: "rgba(255,255,255,0.025)" }}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold" style={{ color: TEXT_PRIMARY }}>{goal.label}</span>
                <ChevronRight className="h-3.5 w-3.5 shrink-0" style={{ color: ACCENT }} />
              </div>
              <p className="mt-0.5 text-[10px]" style={{ color: TEXT_MUTED }}>{goal.detail}</p>
              <div className="mt-2 h-1 overflow-hidden rounded-full" style={{ background: BORDER }}>
                <div className="h-full rounded-full" style={{ width: `${Math.min(100, goal.progressPercent)}%`, background: ACCENT }} />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
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
        <ShowdownCountdown seasonName={data.seasonName} seasonEnd={data.seasonEnd} />
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

        <SeasonXPBreakdown seasonXP={data.seasonXP} breakdown={data.breakdown} />
        <SeasonMicroGoals goals={data.microGoals} />
        <LeagueJourney currentLeague={data.league} nextLeague={data.nextLeague} tiers={data.tiers} />

        {/* League structure legend */}
        <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${BORDER}` }}>
          <div className="flex flex-wrap gap-1.5">
            {(data.tiers ?? []).map((tier) => {
              const active = tier.name === data.league;
              const leagueColor = tier.color;
              return (
                <div
                  key={tier.name}
                  title={`${tier.min.toLocaleString()}+ Season XP${tier.rankGate ? ` · Top ${tier.rankGate}` : ""}`}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[12.5px] font-semibold"
                  style={{
                    background: active ? `${leagueColor}26` : `${leagueColor}14`,
                    color: leagueColor,
                  }}
                >
                  <img src={LEAGUE_MEDALS[tier.name]} alt="" className="w-[30px] h-[30px] object-contain" />
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

/* ─── Section: Creator Analytics ─── */

function formatStat(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function CreatorAnalytics({
  creator,
  followersCount,
  isLoading,
}: {
  creator: DashboardData["creator"] | undefined;
  followersCount: number;
  isLoading: boolean;
}) {
  const stats = [
    {
      label: "Total Views",
      value: creator?.totalViews ?? 0,
      icon: Eye,
      sub: "lifetime",
    },
    {
      label: "Likes Received",
      value: creator?.totalLikes ?? 0,
      icon: Heart,
      sub: "lifetime",
    },
    {
      label: "Comments",
      value: creator?.totalComments ?? 0,
      icon: MessageCircle,
      sub: "lifetime",
    },
    {
      label: "New Followers",
      value: creator?.newFollowersThisWeek ?? 0,
      icon: Users,
      sub: "this week",
      highlight: (creator?.newFollowersThisWeek ?? 0) > 0,
    },
    {
      label: "Followers",
      value: followersCount,
      icon: Users,
      sub: "total",
    },
  ];

  return (
    <SectionCard>
      <SectionHeader
        icon={BarChart2}
        title="Creator Analytics"
        action={
          <Link href="/profile">
            <span className="text-xs font-semibold flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity" style={{ color: ACCENT }}>
              My Profile <ChevronRight className="w-3 h-3" />
            </span>
          </Link>
        }
      />
      <div className="px-5 pb-5">
        {isLoading ? (
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {stats.map((s) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.label}
                  className="rounded-xl p-3 flex flex-col gap-1"
                  style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}` }}
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: s.highlight ? ACCENT : TEXT_MUTED }} />
                    <span className="text-[10px] uppercase tracking-wide font-semibold" style={{ color: TEXT_MUTED }}>
                      {s.label}
                    </span>
                  </div>
                  <div
                    className="text-xl font-black tabular-nums"
                    style={{ color: s.highlight ? ACCENT : TEXT_PRIMARY }}
                  >
                    {formatStat(s.value)}
                  </div>
                  <div className="text-[10px]" style={{ color: TEXT_MUTED }}>{s.sub}</div>
                  {s.highlight && s.value > 0 && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <TrendingUp className="w-3 h-3" style={{ color: "#4ADE80" }} />
                      <span className="text-[10px] font-bold" style={{ color: "#4ADE80" }}>
                        +{s.value} this week
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </SectionCard>
  );
}

/* ─── Section: Upload Performance ─── */

function ContentTypeIcon({ type }: { type: string }) {
  if (type === "reel") return <Film className="w-3.5 h-3.5" style={{ color: TEXT_MUTED }} />;
  if (type === "screenshot") return <ImageIcon className="w-3.5 h-3.5" style={{ color: TEXT_MUTED }} />;
  return <Play className="w-3.5 h-3.5" style={{ color: TEXT_MUTED }} />;
}

function TopUploadCard({
  upload,
  label,
  icon: Icon,
  isLoading,
}: {
  upload: TopUpload | null;
  label: string;
  icon: React.ElementType;
  isLoading: boolean;
}) {
  if (isLoading) {
    return <Skeleton className="h-52 rounded-xl" />;
  }

  if (!upload) {
    return (
      <div
        className="rounded-xl p-4 flex flex-col items-center justify-center text-center gap-2"
        style={{ background: "rgba(255,255,255,0.02)", border: `1px dashed ${BORDER}`, minHeight: 208 }}
      >
        <Upload className="w-5 h-5 opacity-20" style={{ color: TEXT_MUTED }} />
        <p className="text-xs" style={{ color: TEXT_MUTED }}>No {label.toLowerCase()} yet</p>
        <Link href="/upload">
          <span className="text-[10px] font-bold" style={{ color: ACCENT }}>Upload Now →</span>
        </Link>
      </div>
    );
  }

  const href =
    upload.contentType === "screenshot"
      ? `/screenshots/${upload.id}`
      : `/clips/${upload.id}`;

  return (
    <Link href={href}>
      <div
        className="rounded-xl overflow-hidden cursor-pointer transition-opacity hover:opacity-90"
        style={{ border: `1px solid ${BORDER}`, background: "rgba(255,255,255,0.02)" }}
      >
        {/* Tall thumbnail */}
        <div className="relative bg-[#0d1a24] overflow-hidden" style={{ height: 200 }}>
          {upload.thumbnailUrl ? (
            <img
              src={upload.thumbnailUrl}
              alt={upload.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ContentTypeIcon type={upload.contentType} />
            </div>
          )}
          {/* Label badge top-left */}
          <div
            className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-md"
            style={{ background: "rgba(0,0,0,0.75)" }}
          >
            <Icon className="w-3 h-3" style={{ color: ACCENT }} />
            <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: TEXT_PRIMARY }}>{label}</span>
          </div>
          {/* Views badge bottom-right */}
          <div
            className="absolute bottom-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded"
            style={{ background: "rgba(0,0,0,0.75)" }}
          >
            <Eye className="w-2.5 h-2.5" style={{ color: TEXT_MUTED }} />
            <span className="text-[10px] font-bold" style={{ color: TEXT_PRIMARY }}>
              {formatStat(upload.views)}
            </span>
          </div>
        </div>
        {/* Details */}
        <div className="px-3 py-2.5 flex items-center justify-between gap-3">
          <p className="text-xs font-bold truncate" style={{ color: TEXT_PRIMARY }}>
            {upload.title}
          </p>
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="flex items-center gap-1">
              <Heart className="w-3 h-3" style={{ color: TEXT_MUTED }} />
              <span className="text-[11px]" style={{ color: TEXT_MUTED }}>{formatStat(upload.likeCount)}</span>
            </div>
            <div className="flex items-center gap-1">
              <MessageCircle className="w-3 h-3" style={{ color: TEXT_MUTED }} />
              <span className="text-[11px]" style={{ color: TEXT_MUTED }}>{formatStat(upload.commentCount)}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

function UploadPerformance({
  creator,
  isLoading,
}: {
  creator: DashboardData["creator"] | undefined;
  isLoading: boolean;
}) {
  return (
    <SectionCard>
      <SectionHeader
        icon={TrendingUp}
        title="Upload Performance"
        action={
          <Link href="/upload">
            <span className="text-xs font-semibold flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity" style={{ color: ACCENT }}>
              Upload <ChevronRight className="w-3 h-3" />
            </span>
          </Link>
        }
      />
      <div className="px-5 pb-5">
        {/* Top 3 uploads – single column for large previews */}
        <p className="text-[10px] uppercase tracking-wider font-semibold mb-3" style={{ color: TEXT_MUTED }}>
          Best Performers
        </p>
        <div className="space-y-3 mb-5">
          <TopUploadCard upload={creator?.topClip ?? null} label="Top Clip" icon={Play} isLoading={isLoading} />
          <TopUploadCard upload={creator?.topReel ?? null} label="Top Reel" icon={Film} isLoading={isLoading} />
          <TopUploadCard upload={creator?.topScreenshot ?? null} label="Top Screenshot" icon={ImageIcon} isLoading={isLoading} />
        </div>

        {/* Recent uploads */}
        {(creator?.recentUploads ?? []).length > 0 && (
          <>
            <div className="pt-4 mb-3" style={{ borderTop: `1px solid ${BORDER}` }}>
              <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: TEXT_MUTED }}>
                Recent Uploads
              </p>
            </div>
            <div className="space-y-2">
              {(creator?.recentUploads ?? []).slice(0, 4).map((u) => {
                const href =
                  u.contentType === "screenshot"
                    ? `/screenshots/${u.id}`
                    : `/clips/${u.id}`;
                return (
                  <Link key={`${u.contentType}-${u.id}`} href={href}>
                    <div
                      className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors hover:bg-white/[0.02]"
                      style={{ border: `1px solid ${BORDER}`, background: "rgba(255,255,255,0.015)" }}
                    >
                      <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-[#0d1a24]">
                        {u.thumbnailUrl ? (
                          <img src={u.thumbnailUrl} alt={u.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ContentTypeIcon type={u.contentType} />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate" style={{ color: TEXT_PRIMARY }}>{u.title}</p>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-[10px] flex items-center gap-1" style={{ color: TEXT_MUTED }}>
                            <Eye className="w-2.5 h-2.5" />{formatStat(u.views)}
                          </span>
                          <span className="text-[10px] flex items-center gap-1" style={{ color: TEXT_MUTED }}>
                            <Heart className="w-2.5 h-2.5" />{formatStat(u.likeCount)}
                          </span>
                        </div>
                      </div>
                      <div className="text-[10px] capitalize px-1.5 py-0.5 rounded" style={{ background: `${ACCENT}12`, color: ACCENT }}>
                        {u.contentType}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </div>
    </SectionCard>
  );
}

function CreatorPerformancePanel({
  creator,
  followersCount,
  isLoading,
  isOpen,
  onToggle,
}: {
  creator: DashboardData["creator"] | undefined;
  followersCount: number;
  isLoading: boolean;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}
    >
      {/* Creator Analytics tab */}
      <div
        className="flex items-end border-b"
        style={{ borderColor: BORDER, minHeight: 48 }}
      >
        <button
          type="button"
          role="tab"
          aria-selected={isOpen}
          aria-controls="creator-analytics-panel"
          onClick={onToggle}
          className="inline-flex items-center gap-2 px-5 py-3 text-xs font-bold"
          style={{
            color: isOpen ? TEXT_PRIMARY : TEXT_MUTED,
            background: isOpen ? "rgba(183,255,26,0.14)" : "rgba(255,255,255,0.025)",
            clipPath: "polygon(12px 0, 100% 0, calc(100% - 12px) 100%, 0 100%)",
            paddingRight: 28,
            position: "relative",
          }}
        >
          <BarChart2 className="w-3.5 h-3.5" style={{ color: ACCENT }} />
          Creator Analytics
          <span
            className="absolute inset-x-4 bottom-0 h-0.5"
            style={{ background: ACCENT, opacity: isOpen ? 1 : 0 }}
          />
        </button>
      </div>

      {isOpen && (
        <div id="creator-analytics-panel" role="tabpanel" className="p-5 space-y-5">
          <CreatorAnalytics creator={creator} followersCount={followersCount} isLoading={isLoading} />
          <UploadPerformance creator={creator} isLoading={isLoading} />
        </div>
      )}
    </div>
  );
}

/* ─── Section: Goals ─── */

const GOAL_ICONS: Record<string, typeof Target> = {
  league: Trophy,
  followers: Users,
  views: Eye,
  daily_upload: Upload,
  lootbox: Gift,
};

function Goals({ goals, isLoading }: { goals: DashGoal[] | undefined; isLoading: boolean }) {
  if (isLoading) {
    return (
      <SectionCard>
        <SectionHeader icon={Target} title="Goals & Milestones" />
        <div className="px-5 pb-5 space-y-3">
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard>
      <SectionHeader icon={Target} title="Goals & Milestones" />
      <div className="px-5 pb-5 space-y-3">
        {(goals ?? []).map((goal) => {
          const Icon = GOAL_ICONS[goal.type] ?? Target;
          const isDone = goal.completed || goal.percent >= 100;
          const isReady = goal.ready && !goal.completed;

          const inner = (
            <div
              key={goal.type}
              className="rounded-xl p-3.5 transition-colors hover:bg-white/[0.02]"
              style={{
                background: isDone
                  ? `${ACCENT}08`
                  : isReady
                  ? `${ACCENT}05`
                  : "rgba(255,255,255,0.02)",
                border: `1px solid ${isDone || isReady ? `${ACCENT}25` : BORDER}`,
                cursor: goal.href ? "pointer" : "default",
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: isDone ? `${ACCENT}18` : "rgba(255,255,255,0.05)" }}
                  >
                    <Icon className="w-3.5 h-3.5" style={{ color: isDone ? ACCENT : TEXT_MUTED }} />
                  </div>
                  <div>
                    <p className="text-xs font-bold" style={{ color: isDone ? ACCENT : TEXT_PRIMARY }}>
                      {goal.label}
                    </p>
                    <p className="text-[10px]" style={{ color: TEXT_MUTED }}>{goal.detail}</p>
                  </div>
                </div>
                <div className="flex-shrink-0 ml-3">
                  {isDone ? (
                    <CheckCircle2 className="w-4 h-4" style={{ color: ACCENT }} />
                  ) : (
                    <span className="text-[11px] font-black tabular-nums" style={{ color: ACCENT }}>
                      {goal.percent}%
                    </span>
                  )}
                </div>
              </div>
              <div className="w-full rounded-full overflow-hidden" style={{ height: 5, background: BORDER }}>
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${Math.min(goal.percent, 100)}%`,
                    background: isDone ? ACCENT : `linear-gradient(90deg, ${ACCENT}88, ${ACCENT})`,
                  }}
                />
              </div>
            </div>
          );

          return goal.href ? (
            <Link key={goal.type} href={goal.href}>{inner}</Link>
          ) : (
            <div key={goal.type}>{inner}</div>
          );
        })}
      </div>
    </SectionCard>
  );
}

/* ─── Main Page ─── */

export default function DashboardPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const isMobile = useMobile();
  const [showCreatorAnalytics, setShowCreatorAnalytics] = useState(false);

  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ["/api/dashboard"],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!user?.id,
  });

  // Redirect users to their profile-type dashboard based on onboarding selection
  useEffect(() => {
    const types = user?.userType?.split(",") ?? [];
    if (types.includes("indie_developer")) {
      setLocation("/studio-dashboard");
    } else if (types.includes("streamer")) {
      setLocation("/streamer/dashboard");
    }
  }, [user, setLocation]);

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
            <CreatorPerformancePanel
              creator={data?.creator}
              followersCount={data?.social?.followersCount ?? 0}
              isLoading={isLoading}
              isOpen={showCreatorAnalytics}
              onToggle={() => setShowCreatorAnalytics((open) => !open)}
            />
            <div className="-mx-4 sm:-mx-6">
              <DailyXPChallenges />
            </div>
            <RankedSeason data={data?.seasonLeague} isLoading={isLoading} />
            <FriendsRivals data={data?.social} isLoading={isLoading} />
            <Goals goals={data?.goals} isLoading={isLoading} />
            <NextRewards rewards={data?.nextRewards} isLoading={isLoading} />
            <RecentActivity activity={data?.recentActivity} isLoading={isLoading} />
            {(data?.bounties ?? []).length > 0 && (
              <ActiveBounties bounties={data?.bounties} isLoading={isLoading} />
            )}
          </div>
        ) : (
          /* Desktop: structured layout */
          <div className="space-y-5 pb-8">
            <CreatorPerformancePanel
              creator={data?.creator}
              followersCount={data?.social?.followersCount ?? 0}
              isLoading={isLoading}
              isOpen={showCreatorAnalytics}
              onToggle={() => setShowCreatorAnalytics((open) => !open)}
            />
            <div className="-mx-4 sm:-mx-6 lg:-mx-8">
              <DailyXPChallenges />
            </div>
            <RankedSeason data={data?.seasonLeague} isLoading={isLoading} />
            <FriendsRivals data={data?.social} isLoading={isLoading} />
            <div className="grid grid-cols-12 gap-5">
              <div className="col-span-7">
                <Goals goals={data?.goals} isLoading={isLoading} />
              </div>
              <div className="col-span-5">
                <NextRewards rewards={data?.nextRewards} isLoading={isLoading} />
              </div>
            </div>
            <div className="space-y-5">
              <RecentActivity activity={data?.recentActivity} isLoading={isLoading} />
              {(data?.bounties ?? []).length > 0 && (
                <ActiveBounties bounties={data?.bounties} isLoading={isLoading} />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
