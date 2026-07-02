import { useState, useEffect, useMemo, useRef } from "react";
import {
  Trophy, Crown, Gem, Shield, Flame, TrendingUp, TrendingDown, Minus,
  Calendar, Clock, Users, Upload, Heart, MessageCircle, Star, Award,
  Play, Camera, Image as ImageIcon, Gamepad2, ChevronRight, Sparkles,
  ArrowUp, ArrowDown, Medal, Zap, Target,
} from "lucide-react";
import { ZapIconSvg } from "@/components/ui/ZapReactionIcon";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { CreatorCard, TrendingEntry, CREATOR_CARD_STYLES } from "@/components/home/CreatorCard";

// ─── Types ─────────────────────────────────────────────────────────────────

interface LeaderboardEntry {
  userId: number;
  uploadsCount: number;
  likesGivenCount: number;
  commentsCount: number;
  firesGivenCount: number;
  totalPoints: number;
  rank: number;
  user: {
    id: number;
    username: string;
    displayName: string;
    avatarUrl?: string | null;
    nftProfileTokenId?: string | null;
    nftProfileImageUrl?: string | null;
    activeProfilePicType?: string | null;
    level?: number | null;
    accentColor?: string | null;
  };
}

interface TopContributor {
  userId: number;
  periodType: string;
  period: string;
  year: number;
  totalPoints: number;
  uploadsCount: number;
  achievedAt: string;
  user: {
    id: number;
    username: string;
    displayName: string;
    avatarUrl?: string | null;
    nftProfileTokenId?: string | null;
    nftProfileImageUrl?: string | null;
    activeProfilePicType?: string | null;
  };
}

type TabType = "weekly" | "monthly" | "alltime";

// ─── Helpers ───────────────────────────────────────────────────────────────

function getLeague(rank: number) {
  if (rank <= 10)   return { name: "Diamond",  icon: "👑", color: "#A8EDFF", gradient: "from-cyan-400/30 to-blue-500/10",   border: "border-cyan-400/40",  glow: "shadow-[0_0_20px_rgba(168,237,255,0.3)]" };
  if (rank <= 100)  return { name: "Platinum", icon: "💎", color: "#E5E4E2", gradient: "from-slate-300/30 to-slate-400/10",  border: "border-slate-300/40",  glow: "shadow-[0_0_16px_rgba(229,228,226,0.25)]" };
  if (rank <= 500)  return { name: "Gold",     icon: "🥇", color: "#FFD700", gradient: "from-yellow-400/30 to-amber-500/10", border: "border-yellow-400/40", glow: "shadow-[0_0_16px_rgba(255,215,0,0.25)]" };
  if (rank <= 2000) return { name: "Silver",   icon: "🥈", color: "#C0C0C0", gradient: "from-gray-400/30 to-gray-500/10",   border: "border-gray-400/40",   glow: "shadow-[0_0_14px_rgba(192,192,192,0.2)]" };
  return                   { name: "Bronze",   icon: "🥉", color: "#CD7F32", gradient: "from-orange-700/30 to-orange-800/10",border: "border-orange-700/40", glow: "shadow-[0_0_14px_rgba(205,127,50,0.2)]" };
}

function getSeasonInfo() {
  const now = new Date();
  const year = now.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const weekOfYear = Math.ceil(
    ((now.getTime() - startOfYear.getTime()) / 86_400_000 + startOfYear.getDay() + 1) / 7
  );
  const seasonNumber = Math.ceil(weekOfYear / 4);
  const weekInSeason = ((weekOfYear - 1) % 4) + 1;
  const seasonNames = [
    "Winter Rising", "Frostfire Clash", "Spring Surge", "Storm Season",
    "Blaze", "Summer Sprint", "Summer Showdown", "Ember Season",
    "Harvest", "Shadow Season", "Neon Siege", "Winter Finals",
  ];
  return { number: seasonNumber, name: seasonNames[now.getMonth()], weekInSeason };
}

function getSeasonEndDate() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
}

function useCountdown(target: Date) {
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

function formatPoints(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toFixed(n % 1 === 0 ? 0 : 1);
}

function periodLabel(contributor: TopContributor) {
  if (contributor.periodType === "monthly") {
    const [y, m] = contributor.period.split("-");
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${months[parseInt(m) - 1]} ${y}`;
  }
  const m = contributor.period.match(/W(\d+)/);
  return `Week ${m ? m[1] : contributor.period}, ${contributor.year}`;
}

// ─── Sub-components ────────────────────────────────────────────────────────

function UserAvatar({ user, size = "md" }: { user: LeaderboardEntry["user"] | TopContributor["user"]; size?: "sm" | "md" | "lg" }) {
  const dim = size === "lg" ? "w-14 h-14" : size === "sm" ? "w-8 h-8" : "w-10 h-10";
  const radius = size === "lg" ? "rounded-xl" : "rounded-lg";
  if ((user as any).nftProfileTokenId && (user as any).nftProfileImageUrl && (user as any).activeProfilePicType === "nft") {
    return (
      <div className={`${dim} ${radius} border border-[#B7FF1A]/40 overflow-hidden flex-shrink-0`}>
        <img src={(user as any).nftProfileImageUrl} alt={user.displayName} className="w-full h-full object-cover" loading="lazy" />
      </div>
    );
  }
  return (
    <div className={`${dim} ${radius} border border-white/10 bg-[#0d1a24] overflow-hidden flex-shrink-0`}>
      <Avatar className="w-full h-full rounded-none">
        <AvatarImage src={(user as any).avatarUrl || undefined} className="object-cover" />
        <AvatarFallback className="bg-[#0d1a24] text-slate-400 rounded-none text-xs">
          {user.displayName?.charAt(0) ?? "?"}
        </AvatarFallback>
      </Avatar>
    </div>
  );
}

// ─── Section: Season Hero (banner + top-3 podium) ─────────────────────────

const PODIUM_GLOW: Record<number, string> = {
  1: "drop-shadow(0 0 22px rgba(255,215,0,0.9)) drop-shadow(0 6px 14px rgba(255,190,0,0.55))",
  2: "drop-shadow(0 0 16px rgba(210,210,210,0.85)) drop-shadow(0 5px 10px rgba(192,192,192,0.5))",
  3: "drop-shadow(0 0 14px rgba(205,127,50,0.85)) drop-shadow(0 5px 10px rgba(180,100,30,0.5))",
};

const PODIUM_IMG: Record<number, string> = {
  1: "/podium-1st.png",
  2: "/podium-2nd.png",
  3: "/podium-3rd.png",
};

const PODIUM_IMG_W: Record<number, string> = {
  1: "w-48",
  2: "w-36",
  3: "w-32",
};

function SeasonHero({ top3 }: { top3: TrendingEntry[] }) {
  // Podium order: 2nd left · 1st centre · 3rd right
  const ordered = [top3[1], top3[0], top3[2]].filter(Boolean) as TrendingEntry[];
  const podiumRank = (entry: TrendingEntry) => {
    const idx = [top3[1], top3[0], top3[2]].findIndex(e => e?.userId === entry.userId);
    return idx === 0 ? 2 : idx === 1 ? 1 : 3;
  };

  return (
    <div className="relative" style={{ minHeight: 560 }}>
      <div
        className="absolute inset-0"
        style={{ backgroundImage: "url('/electrical-bg.webp')", backgroundSize: "cover", backgroundPosition: "center" }}
      />
      {/* Gradient overlay */}
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,rgba(5,9,13,0.50) 0%,rgba(8,14,24,0.55) 45%,rgba(5,9,13,0.88) 100%)" }} />

      {/* Gold glow orb behind rank-1 */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-96 h-48 blur-3xl opacity-25 pointer-events-none"
        style={{ background: "radial-gradient(ellipse,#FFD700,transparent 70%)" }} />

      {/* Three-column podium */}
      <div className="relative flex items-end justify-center gap-6 sm:gap-10 lg:gap-16 px-4 pt-10 pb-0">
        {top3.length === 0 ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center">
              <div className={`w-[175px] sm:w-[195px] ${i !== 1 ? "mt-10" : ""}`}>
                <Skeleton className="h-64 rounded-2xl bg-slate-800" />
              </div>
              <Skeleton className="mt-1 h-20 w-36 bg-slate-800/60 rounded" />
            </div>
          ))
        ) : (
          ordered.map((entry) => {
            const rank = podiumRank(entry);
            const isCenter = rank === 1;
            return (
              <div
                key={entry.userId}
                className={`flex flex-col items-center flex-shrink-0 ${isCenter ? "" : "mt-10 sm:mt-14"} lb-card-${rank}`}
              >
                {/* Creator card */}
                <div
                  className={`${isCenter ? "w-[185px] sm:w-[215px]" : "w-[160px] sm:w-[185px]"}`}
                  style={{ filter: PODIUM_GLOW[rank] }}
                >
                  <CreatorCard entry={entry} period="week" />
                </div>
                {/* Rank trophy image */}
                <img
                  src={PODIUM_IMG[rank]}
                  alt={`#${rank}`}
                  className={`${PODIUM_IMG_W[rank]} object-contain -mt-1`}
                  draggable={false}
                />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─── Section: Season Info Bar (below banner) ───────────────────────────────

function SeasonInfoBar({ playerCount }: { playerCount: number }) {
  const season = useMemo(() => getSeasonInfo(), []);
  const seasonEnd = useMemo(() => getSeasonEndDate(), []);
  const { days, hours, minutes, seconds } = useCountdown(seasonEnd);

  return (
    <div className="bg-[#0a141e] border-b border-white/6 py-8 px-4 text-center">
      {/* Season badge */}
      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#B7FF1A]/30 bg-[#B7FF1A]/10 mb-4">
        <Trophy className="w-4 h-4 text-[#B7FF1A]" />
        <span className="text-xs font-bold text-[#B7FF1A] tracking-widest uppercase">Ranked Season {season.number}</span>
      </div>

      {/* Title */}
      <h1 className="text-3xl sm:text-4xl font-black text-white mb-1 tracking-tight">
        {season.name}
      </h1>
      <p className="text-slate-500 text-sm mb-6">Week {season.weekInSeason} of Season {season.number}</p>

      {/* Countdown */}
      <div className="mb-6">
        <p className="text-slate-600 text-[11px] uppercase tracking-widest mb-3">Season Ends In</p>
        <div className="flex items-center justify-center gap-2 sm:gap-4">
          {[
            { v: days,    l: "Days" },
            { v: hours,   l: "Hours" },
            { v: minutes, l: "Mins" },
            { v: seconds, l: "Secs" },
          ].map(({ v, l }, i) => (
            <div key={l} className="flex items-center gap-2 sm:gap-4">
              {i > 0 && <span className="text-slate-700 text-lg">•</span>}
              <div className="flex flex-col items-center">
                <div className="w-13 h-13 sm:w-15 sm:h-15 w-14 h-14 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center">
                  <span className="text-xl sm:text-2xl font-black text-white tabular-nums">{String(v).padStart(2, "0")}</span>
                </div>
                <span className="text-[10px] text-slate-600 mt-1 uppercase tracking-widest">{l}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-center gap-6 text-sm">
        <div className="flex items-center gap-2 text-slate-400">
          <Users className="w-4 h-4 text-[#B7FF1A]" />
          <span><strong className="text-white">{playerCount.toLocaleString()}</strong> Players Competing</span>
        </div>
        <div className="flex items-center gap-2 text-slate-400">
          <Trophy className="w-4 h-4 text-[#FFD700]" />
          <span><strong className="text-white">5,000</strong> GFT Prize Pool</span>
        </div>
      </div>
    </div>
  );
}

// ─── Section: Competitive Overview ────────────────────────────────────────

function CompetitiveOverview({ leaderboard, userId }: { leaderboard: LeaderboardEntry[]; userId: number }) {
  const myEntry = leaderboard.find(e => e.userId === userId);
  if (!myEntry) {
    return (
      <div className="mx-4 mb-6 p-6 rounded-2xl border border-[#B7FF1A]/20 bg-[#B7FF1A]/5 text-center">
        <Target className="w-8 h-8 text-[#B7FF1A] mx-auto mb-2 opacity-60" />
        <p className="text-slate-400 text-sm">Upload content or engage with posts this week to appear on the ranked leaderboard.</p>
      </div>
    );
  }
  const league = getLeague(myEntry.rank);
  const nextRankEntry = leaderboard.find(e => e.rank === myEntry.rank - 1);
  const xpToNextRank = nextRankEntry ? Math.ceil(nextRankEntry.totalPoints - myEntry.totalPoints) : null;

  const nextLeagueCutoff =
    myEntry.rank > 2000 ? 2000 :
    myEntry.rank > 500  ? 500  :
    myEntry.rank > 100  ? 100  :
    myEntry.rank > 10   ? 10   : null;
  const nextLeagueEntry = nextLeagueCutoff ? leaderboard.find(e => e.rank === nextLeagueCutoff) : null;
  const xpToNextLeague = nextLeagueEntry ? Math.max(0, Math.ceil(nextLeagueEntry.totalPoints - myEntry.totalPoints + 1)) : null;

  const stats = [
    { label: "Current Rank",  value: `#${myEntry.rank}`,               icon: <Trophy className="w-4 h-4 text-[#B7FF1A]" /> },
    { label: "Current League",value: `${league.icon} ${league.name}`,   icon: <Shield className="w-4 h-4" style={{ color: league.color }} /> },
    { label: "Season XP",     value: formatPoints(myEntry.totalPoints), icon: <Zap className="w-4 h-4 text-[#615fff]" /> },
    { label: "Uploads",       value: myEntry.uploadsCount.toString(),   icon: <Upload className="w-4 h-4 text-[#00bcff]" /> },
  ];

  return (
    <div className="px-4 mb-6">
      <div className={`rounded-2xl border bg-gradient-to-br ${league.gradient} ${league.border} ${league.glow} p-5`}>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-full flex items-center justify-center bg-white/10">
            <span className="text-sm">{league.icon}</span>
          </div>
          <h2 className="font-bold text-white text-base">Your Competitive Overview</h2>
          <span className="ml-auto text-xs font-semibold px-2.5 py-0.5 rounded-full border" style={{ color: league.color, borderColor: league.color + "50", background: league.color + "18" }}>
            {league.name} League
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {stats.map(s => (
            <div key={s.label} className="rounded-xl border border-white/8 bg-black/20 px-3 py-2.5">
              <div className="flex items-center gap-1.5 mb-1">{s.icon}<span className="text-[10px] text-slate-500 uppercase tracking-wider">{s.label}</span></div>
              <span className="font-black text-white text-lg">{s.value}</span>
            </div>
          ))}
        </div>

        {/* Motivational messages */}
        <div className="space-y-2">
          {xpToNextRank !== null && xpToNextRank > 0 && (
            <div className="flex items-center gap-2 text-xs text-slate-300 bg-white/5 rounded-lg px-3 py-2">
              <ArrowUp className="w-3.5 h-3.5 text-[#B7FF1A] flex-shrink-0" />
              <span>Only <strong className="text-[#B7FF1A]">{formatPoints(xpToNextRank)} XP</strong> until you move up to Rank #{myEntry.rank - 1}</span>
            </div>
          )}
          {xpToNextLeague !== null && xpToNextLeague > 0 && nextLeagueCutoff && (
            <div className="flex items-center gap-2 text-xs text-slate-300 bg-white/5 rounded-lg px-3 py-2">
              <TrendingUp className="w-3.5 h-3.5 text-[#FFD700] flex-shrink-0" />
              <span><strong className="text-[#FFD700]">{formatPoints(xpToNextLeague)} XP</strong> until {getLeague(nextLeagueCutoff).icon} {getLeague(nextLeagueCutoff).name} League (Top {nextLeagueCutoff})</span>
            </div>
          )}
          {myEntry.rank <= 10 && (
            <div className="flex items-center gap-2 text-xs text-slate-300 bg-[#B7FF1A]/10 rounded-lg px-3 py-2">
              <Crown className="w-3.5 h-3.5 text-[#B7FF1A] flex-shrink-0" />
              <span className="text-[#B7FF1A] font-semibold">You are in Diamond League — an elite Top 10 player this season! 👑</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Section: Ranked Leagues ───────────────────────────────────────────────

const LEAGUES = [
  { icon: "👑", name: "Diamond",  range: "Top 10",    color: "#A8EDFF", bg: "from-cyan-400/20 to-blue-500/5",   border: "border-cyan-400/30",  rewards: "Champion Trophy + 2,500 GFT" },
  { icon: "💎", name: "Platinum", range: "Top 100",   color: "#E5E4E2", bg: "from-slate-300/20 to-slate-400/5", border: "border-slate-300/30", rewards: "Platinum Badge + 1,000 GFT" },
  { icon: "🥇", name: "Gold",     range: "Top 500",   color: "#FFD700", bg: "from-yellow-400/20 to-amber-500/5",border: "border-yellow-400/30", rewards: "Gold Medal + 500 GFT" },
  { icon: "🥈", name: "Silver",   range: "Top 2,000", color: "#C0C0C0", bg: "from-gray-400/20 to-gray-500/5",   border: "border-gray-400/30",  rewards: "Silver Badge + 200 GFT" },
  { icon: "🥉", name: "Bronze",   range: "All Others",color: "#CD7F32", bg: "from-orange-700/20 to-orange-800/5",border: "border-orange-700/30",rewards: "Bronze Badge + 50 GFT" },
];

function RankedLeagues({ leaderboard, userId }: { leaderboard: LeaderboardEntry[]; userId?: number }) {
  const myEntry = userId ? leaderboard.find(e => e.userId === userId) : null;
  const myLeague = myEntry ? getLeague(myEntry.rank).name : null;

  return (
    <section className="px-4 mb-8">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="w-5 h-5 text-[#B7FF1A]" />
        <h2 className="text-xl font-black text-white">Ranked Leagues</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
        {LEAGUES.map(l => (
          <div
            key={l.name}
            className={`rounded-2xl border bg-gradient-to-br ${l.bg} ${l.border} p-4 flex flex-col items-center text-center gap-2 relative ${l.name === myLeague ? "ring-2 ring-[#B7FF1A]/60 ring-offset-1 ring-offset-[#0B1218]" : ""}`}
          >
            {l.name === myLeague && (
              <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-[#B7FF1A] text-black text-[10px] font-black whitespace-nowrap">YOU</div>
            )}
            <span className="text-3xl">{l.icon}</span>
            <div>
              <div className="font-black text-sm" style={{ color: l.color }}>{l.name}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">{l.range}</div>
            </div>
            <div className="text-[10px] text-slate-400 leading-tight">{l.rewards}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Section: Live Leaderboard ─────────────────────────────────────────────

function LeaderboardRow({ entry, isCurrentUser }: { entry: LeaderboardEntry; isCurrentUser: boolean }) {
  const league = getLeague(entry.rank);
  const isTop3 = entry.rank <= 3;
  const rankColors: Record<number, string> = { 1: "#FFD700", 2: "#C0C0C0", 3: "#CD7F32" };
  const rankColor = rankColors[entry.rank] ?? "#6b7280";

  return (
    <Link href={`/profile/${entry.user.username}`}>
      <div
        className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-all hover:scale-[1.01] cursor-pointer mb-2 ${
          isCurrentUser
            ? "border-[#B7FF1A]/40 bg-[#B7FF1A]/8"
            : isTop3
            ? "border-white/10 bg-white/3"
            : "border-white/5 bg-[#0a1520]/60"
        }`}
      >
        {/* Rank */}
        <div className="w-9 flex-shrink-0 text-center">
          {entry.rank <= 3 ? (
            <div className="w-8 h-8 rounded-lg flex items-center justify-center mx-auto" style={{ background: `${rankColor}22`, border: `1px solid ${rankColor}55` }}>
              <span className="text-sm font-black" style={{ color: rankColor }}>{entry.rank}</span>
            </div>
          ) : (
            <span className="text-sm font-bold text-slate-500">#{entry.rank}</span>
          )}
        </div>

        {/* Avatar */}
        <UserAvatar user={entry.user} size="sm" />

        {/* Name + stats */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className={`font-bold text-sm truncate ${isCurrentUser ? "text-[#B7FF1A]" : "text-white"}`}>
              {entry.user.displayName}
            </span>
            {isCurrentUser && <span className="text-[10px] font-bold text-black bg-[#B7FF1A] px-1.5 py-0.5 rounded-full flex-shrink-0">YOU</span>}
          </div>
          <div className="flex items-center gap-2.5 mt-0.5">
            <div className="flex items-center gap-1">
              <Upload className="w-2.5 h-2.5 text-[#00bcff]" />
              <span className="text-[10px] font-semibold text-[#00bcff]">{entry.uploadsCount}</span>
            </div>
            <div className="flex items-center gap-1">
              <Heart className="w-2.5 h-2.5 text-[#ff2056] fill-[#ff2056]" />
              <span className="text-[10px] font-semibold text-[#ff2056]">{entry.likesGivenCount}</span>
            </div>
            <div className="flex items-center gap-1">
              <ZapIconSvg className="w-2.5 h-2.5" active={true} />
              <span className="text-[10px] font-semibold text-[#ff6900]">{entry.firesGivenCount}</span>
            </div>
          </div>
        </div>

        {/* League badge */}
        <div className="hidden sm:flex items-center gap-1 flex-shrink-0">
          <span className="text-xs">{league.icon}</span>
          <span className="text-[10px] font-semibold" style={{ color: league.color }}>{league.name}</span>
        </div>

        {/* XP */}
        <div className="flex-shrink-0 text-right">
          <div className="text-sm font-black text-white">{formatPoints(entry.totalPoints)}</div>
          <div className="text-[10px] text-slate-500">XP</div>
        </div>
      </div>
    </Link>
  );
}

// ─── Bar Chart ─────────────────────────────────────────────────────────────

const BAR_RANK_COLORS: Record<number, { bar: string; glow: string; badge: string }> = {
  1: { bar: "from-yellow-300 via-yellow-500 to-amber-600",   glow: "rgba(255,215,0,0.45)",  badge: "#FFD700" },
  2: { bar: "from-slate-200 via-slate-400 to-slate-600",     glow: "rgba(192,192,192,0.35)", badge: "#C0C0C0" },
  3: { bar: "from-amber-500 via-amber-700 to-amber-900",     glow: "rgba(205,127,50,0.35)",  badge: "#CD7F32" },
};
const BAR_ME_COLOR  = { bar: "from-[#B7FF1A] via-[#8be800] to-[#5fa800]",       glow: "rgba(183,255,26,0.55)" };
const BAR_DEF_COLOR = { bar: "from-[#B7FF1A]/80 via-[#B7FF1A]/50 to-[#B7FF1A]/20", glow: "rgba(183,255,26,0.2)" };

const MAX_BAR_H = 320; // px — taller bars

function XPBarChart({ entries, userId }: { entries: LeaderboardEntry[]; userId?: number }) {
  const maxPts = Math.max(...entries.map(e => e.totalPoints), 1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragging  = useRef(false);
  const startX    = useRef(0);
  const scrollLeft = useRef(0);

  const onMouseDown = (e: React.MouseEvent) => {
    dragging.current  = true;
    startX.current    = e.pageX - (scrollRef.current?.offsetLeft ?? 0);
    scrollLeft.current = scrollRef.current?.scrollLeft ?? 0;
    if (scrollRef.current) scrollRef.current.style.cursor = "grabbing";
  };
  const onMouseUp = () => {
    dragging.current = false;
    if (scrollRef.current) scrollRef.current.style.cursor = "grab";
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging.current || !scrollRef.current) return;
    e.preventDefault();
    const x   = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX.current) * 1.5;
    scrollRef.current.scrollLeft = scrollLeft.current - walk;
  };

  return (
    <div
      ref={scrollRef}
      className="overflow-x-auto pb-4 select-none"
      style={{ cursor: "grab" }}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onMouseMove={onMouseMove}
    >
      <div className="flex items-end gap-3 min-w-max px-4 pb-1" style={{ paddingTop: 32 }}>
        {entries.map((entry, i) => {
          const rank   = i + 1;
          const isMe   = entry.userId === userId;
          const isTop3 = rank <= 3;
          const pct    = entry.totalPoints / maxPts;
          const barH   = Math.max(Math.round(pct * MAX_BAR_H), 14);
          const colors = isTop3 ? BAR_RANK_COLORS[rank] : isMe ? BAR_ME_COLOR : BAR_DEF_COLOR;
          const medals: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

          return (
            <Link key={entry.userId} href={`/profile/${entry.user.username}`}>
              <div className="flex flex-col items-center gap-1.5 group cursor-pointer select-none" style={{ width: 76 }}>
                {/* XP label */}
                <span className="text-[10px] font-bold text-slate-400 group-hover:text-white transition-colors leading-none">
                  {formatPoints(entry.totalPoints)}
                </span>

                {/* Bar */}
                <div
                  className={`w-14 rounded-t-xl bg-gradient-to-t ${colors.bar} border border-white/15 group-hover:brightness-110 transition-all relative`}
                  style={{
                    height: barH,
                    boxShadow: `0 0 16px ${colors.glow}`,
                  }}
                >
                  {/* Medal emoji above top-3 */}
                  {isTop3 && (
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xl leading-none select-none">
                      {medals[rank]}
                    </div>
                  )}
                  {/* YOU chip */}
                  {isMe && (
                    <div className={`absolute ${isTop3 ? "-bottom-5" : "-top-5"} left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-black bg-[#B7FF1A] text-black px-1.5 py-0.5 rounded-full`}>
                      YOU
                    </div>
                  )}
                </div>

                {/* Avatar — larger */}
                <div className="w-12 h-12 rounded-full overflow-hidden ring-2 ring-white/10 group-hover:ring-[#B7FF1A]/50 transition-all flex-shrink-0">
                  {entry.user.avatarUrl ? (
                    <img src={entry.user.avatarUrl} alt={entry.user.displayName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-slate-700 flex items-center justify-center">
                      <span className="text-base font-black text-white">{entry.user.displayName[0]?.toUpperCase()}</span>
                    </div>
                  )}
                </div>

                {/* Username */}
                <span className="text-[10px] font-semibold text-slate-400 group-hover:text-white transition-colors text-center leading-tight w-full truncate">
                  {entry.user.displayName.length > 8
                    ? entry.user.displayName.slice(0, 7) + "…"
                    : entry.user.displayName}
                </span>

                {/* Rank */}
                <span
                  className="text-[9px] font-black leading-none"
                  style={{ color: isTop3 ? BAR_RANK_COLORS[rank].badge : isMe ? "#B7FF1A" : "#4b5563" }}
                >
                  #{rank}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function LiveLeaderboard({ userId }: { userId?: number }) {
  const [tab, setTab] = useState<TabType>("alltime");

  const tabs: { key: TabType; label: string }[] = [
    { key: "weekly",  label: "This Week"  },
    { key: "monthly", label: "This Month" },
    { key: "alltime", label: "All Time"   },
  ];

  const MIN_PERIOD_ENTRIES = 3; // below this, fall back to previous period

  const { data: weeklyData,    isLoading: wl  } = useQuery<LeaderboardEntry[]>({
    queryKey: ["/api/leaderboard/weekly/current",  "chart"],
    queryFn: () => fetch("/api/leaderboard/weekly/current?limit=100").then(r => r.json()),
  });
  const { data: prevWeekData,  isLoading: pwl } = useQuery<LeaderboardEntry[]>({
    queryKey: ["/api/leaderboard/weekly/previous", "chart"],
    queryFn: () => fetch("/api/leaderboard/weekly/previous?limit=100").then(r => r.json()),
    enabled: !wl && Array.isArray(weeklyData) && weeklyData.length < MIN_PERIOD_ENTRIES,
  });
  const { data: monthlyData,   isLoading: ml  } = useQuery<LeaderboardEntry[]>({
    queryKey: ["/api/leaderboard/monthly/current", "chart"],
    queryFn: () => fetch("/api/leaderboard/monthly/current?limit=100").then(r => r.json()),
  });
  const { data: prevMonthData, isLoading: pml } = useQuery<LeaderboardEntry[]>({
    queryKey: ["/api/leaderboard/monthly/previous", "chart"],
    queryFn: () => fetch("/api/leaderboard/monthly/previous?limit=100").then(r => r.json()),
    enabled: !ml && Array.isArray(monthlyData) && monthlyData.length < MIN_PERIOD_ENTRIES,
  });
  const { data: alltimeData,   isLoading: al  } = useQuery<LeaderboardEntry[]>({
    queryKey: ["/api/leaderboard", "lb"],
    queryFn: () => fetch("/api/leaderboard?limit=100").then(r => r.json()),
  });

  const isLoading =
    tab === "weekly"  ? (wl || (Array.isArray(weeklyData)  && weeklyData.length  < MIN_PERIOD_ENTRIES && pwl)) :
    tab === "monthly" ? (ml || (Array.isArray(monthlyData) && monthlyData.length < MIN_PERIOD_ENTRIES && pml)) :
                        al;

  const weeklySparse  = !wl  && Array.isArray(weeklyData)  && weeklyData.length  < MIN_PERIOD_ENTRIES;
  const monthlySparse = !ml  && Array.isArray(monthlyData) && monthlyData.length < MIN_PERIOD_ENTRIES;

  const usingPrevWeek  = tab === "weekly"  && weeklySparse;
  const usingPrevMonth = tab === "monthly" && monthlySparse;
  const usingFallback  = usingPrevWeek || usingPrevMonth;

  const entries: LeaderboardEntry[] =
    tab === "weekly"  ? (weeklySparse  ? (Array.isArray(prevWeekData)  ? prevWeekData  : []) : (Array.isArray(weeklyData)  ? weeklyData  : [])) :
    tab === "monthly" ? (monthlySparse ? (Array.isArray(prevMonthData) ? prevMonthData : []) : (Array.isArray(monthlyData) ? monthlyData : [])) :
                        (Array.isArray(alltimeData) ? alltimeData : []);

  const tabSubtitle: Record<TabType, string> = {
    weekly:  usingPrevWeek  ? "Showing last week · this week just started" : "XP earned this week",
    monthly: usingPrevMonth ? "Showing last month · this month just started" : "XP earned this month",
    alltime: "Total season XP",
  };

  return (
    <section className="mb-0">
      {/* Header row — padded */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3 px-4 sm:px-6 lg:px-10">
        <div className="flex items-center gap-2 flex-wrap">
          <TrendingUp className="w-5 h-5 text-[#B7FF1A]" />
          <h2 className="text-xl font-black text-white">Live Leaderboard</h2>
          <span className="text-xs text-slate-500 mt-0.5">{tabSubtitle[tab]}</span>
          {usingFallback && (
            <span className="text-[10px] bg-[#B7FF1A]/10 text-[#B7FF1A]/70 border border-[#B7FF1A]/20 px-2 py-0.5 rounded-full">
              {usingPrevWeek ? "showing last week" : "showing last month"}
            </span>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl bg-white/5 border border-white/8">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                tab === t.key ? "bg-[#B7FF1A] text-black" : "text-slate-400 hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart area — full width, no side padding so scroll isn't clipped */}
      {isLoading && !usingFallback ? (
        <div className="overflow-x-auto pb-4 px-4">
          <div className="flex items-end gap-3 min-w-max" style={{ height: MAX_BAR_H + 110, paddingTop: 32 }}>
            {Array.from({ length: 20 }).map((_, i) => {
              const h = Math.max(40, Math.round(MAX_BAR_H * Math.max(0.15, 1 - i * 0.045)));
              return (
                <div key={i} className="flex flex-col items-center gap-1.5" style={{ width: 76 }}>
                  <Skeleton className="w-10 h-3 rounded bg-slate-800" />
                  <Skeleton className="w-14 rounded-t-xl bg-slate-800" style={{ height: h }} />
                  <Skeleton className="w-12 h-12 rounded-full bg-slate-800" />
                  <Skeleton className="w-14 h-2.5 rounded bg-slate-800" />
                </div>
              );
            })}
          </div>
        </div>
      ) : entries.length === 0 ? (
        <div className="mx-4 text-center py-16 rounded-2xl border border-white/5 bg-white/2">
          <Star className="w-10 h-10 mx-auto mb-3 text-slate-600" />
          <p className="text-sm font-semibold text-slate-400">No activity yet for this period</p>
          <p className="text-xs text-slate-600 mt-1">Earn XP by uploading content to appear here</p>
        </div>
      ) : (
        <>
          <div className="w-full h-px bg-white/8 mb-1" />
          <XPBarChart entries={entries} userId={userId} />
          <p className="text-[10px] text-slate-600 mt-1 text-center pb-2">
            {entries.length} players · drag or scroll to explore · click a bar to visit profile
          </p>
        </>
      )}
    </section>
  );
}

// ─── Section: Rival Section ────────────────────────────────────────────────

function RivalSection({ leaderboard, userId }: { leaderboard: LeaderboardEntry[]; userId: number }) {
  const myIndex = leaderboard.findIndex(e => e.userId === userId);
  if (myIndex < 0) return null;

  const me    = leaderboard[myIndex];
  const above = myIndex > 0 ? leaderboard[myIndex - 1] : null;
  const below = myIndex < leaderboard.length - 1 ? leaderboard[myIndex + 1] : null;
  const xpGap = above ? Math.max(0, Math.ceil(above.totalPoints - me.totalPoints)) : null;

  const RivalCard = ({
    entry, label, highlight
  }: { entry: LeaderboardEntry; label: string; highlight?: boolean }) => (
    <Link href={`/profile/${entry.user.username}`}>
      <div className={`flex items-center gap-3 rounded-xl border p-4 transition-all hover:scale-[1.02] cursor-pointer ${
        highlight ? "border-[#B7FF1A]/40 bg-[#B7FF1A]/8" : "border-white/8 bg-white/3"
      }`}>
        <span className={`text-[10px] font-bold uppercase tracking-wider w-14 flex-shrink-0 ${highlight ? "text-[#B7FF1A]" : "text-slate-500"}`}>{label}</span>
        <UserAvatar user={entry.user} size="sm" />
        <div className="flex-1 min-w-0">
          <div className={`font-bold text-sm truncate ${highlight ? "text-[#B7FF1A]" : "text-white"}`}>{entry.user.displayName}</div>
          <div className="text-[10px] text-slate-500">Rank #{entry.rank}</div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-sm font-black text-white">{formatPoints(entry.totalPoints)}</div>
          <div className="text-[10px] text-slate-500">XP</div>
        </div>
      </div>
    </Link>
  );

  return (
    <section className="px-4 mb-8">
      <div className="flex items-center gap-2 mb-4">
        <Target className="w-5 h-5 text-[#B7FF1A]" />
        <h2 className="text-xl font-black text-white">Your Rivals</h2>
      </div>
      <div className="rounded-2xl border border-white/8 bg-[#0a1520]/80 p-4 space-y-2">
        {above && <RivalCard entry={above} label="Above You" />}
        <RivalCard entry={me} label="You" highlight />
        {below && <RivalCard entry={below} label="Below You" />}
        {xpGap !== null && xpGap > 0 && (
          <div className="pt-1 flex items-center gap-2 text-xs text-slate-400 bg-white/3 rounded-lg px-3 py-2.5">
            <Flame className="w-3.5 h-3.5 text-[#ff6900] flex-shrink-0" />
            <span>You need <strong className="text-white">{formatPoints(xpGap)} more XP</strong> to overtake <strong className="text-white">{above!.user.displayName}</strong> and move to Rank #{above!.rank}</span>
          </div>
        )}
        {xpGap === 0 && (
          <div className="pt-1 flex items-center gap-2 text-xs text-[#B7FF1A] bg-[#B7FF1A]/10 rounded-lg px-3 py-2.5">
            <Crown className="w-3.5 h-3.5 flex-shrink-0" />
            <span>You are <strong>tied for position</strong> with the player above you!</span>
          </div>
        )}
      </div>
    </section>
  );
}

// ─── Section: Season Rewards ───────────────────────────────────────────────

const REWARDS = [
  {
    rank: 1, label: "1st Place", icon: "🥇", color: "#FFD700", bg: "from-yellow-400/20 to-amber-500/5", border: "border-yellow-400/30",
    items: ["Exclusive Champion Trophy", "Animated Gold Medal", "Champion Badge", "Exclusive Profile Banner", "2,500 GFT", "Legendary Loot Box"],
  },
  {
    rank: 2, label: "2nd Place", icon: "🥈", color: "#C0C0C0", bg: "from-gray-300/20 to-gray-400/5", border: "border-gray-300/30",
    items: ["Silver Medal", "Exclusive Badge", "1,500 GFT", "Epic Loot Box"],
  },
  {
    rank: 3, label: "3rd Place", icon: "🥉", color: "#CD7F32", bg: "from-orange-600/20 to-orange-700/5", border: "border-orange-600/30",
    items: ["Bronze Medal", "Exclusive Badge", "750 GFT", "Rare Loot Box"],
  },
  {
    rank: 0, label: "Diamond League", icon: "👑", color: "#A8EDFF", bg: "from-cyan-400/20 to-blue-500/5", border: "border-cyan-400/30",
    items: ["Diamond Crown Badge", "Exclusive Diamond Banner", "500 GFT", "Season Profile Frame"],
  },
  {
    rank: 0, label: "Gold League", icon: "🥇", color: "#FFD700", bg: "from-yellow-400/15 to-amber-500/5", border: "border-yellow-400/20",
    items: ["Gold League Badge", "Season Profile Frame", "200 GFT"],
  },
  {
    rank: 0, label: "Silver League", icon: "🥈", color: "#C0C0C0", bg: "from-gray-300/15 to-gray-400/5", border: "border-gray-300/20",
    items: ["Silver League Badge", "75 GFT"],
  },
];

function SeasonRewards() {
  return (
    <section className="px-4 mb-8">
      <div className="flex items-center gap-2 mb-4">
        <Medal className="w-5 h-5 text-[#B7FF1A]" />
        <h2 className="text-xl font-black text-white">Season Rewards</h2>
        <span className="ml-auto text-xs text-slate-500 italic">Awarded at season end</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {REWARDS.map(r => (
          <div key={r.label} className={`rounded-2xl border bg-gradient-to-br ${r.bg} ${r.border} p-4`}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">{r.icon}</span>
              <span className="font-black text-sm" style={{ color: r.color }}>{r.label}</span>
            </div>
            <ul className="space-y-1">
              {r.items.map(item => (
                <li key={item} className="flex items-center gap-2 text-xs text-slate-300">
                  <span className="w-1 h-1 rounded-full bg-current flex-shrink-0" style={{ color: r.color }} />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Section: Hall of Champions ────────────────────────────────────────────

function HallOfChampions() {
  const { data: weeklyData }  = useQuery<TopContributor[]>({ queryKey: ["/api/leaderboard/top-contributors/weekly"],  queryFn: () => fetch("/api/leaderboard/top-contributors/weekly?limit=30").then(r => r.json())  });
  const { data: monthlyData } = useQuery<TopContributor[]>({ queryKey: ["/api/leaderboard/top-contributors/monthly"], queryFn: () => fetch("/api/leaderboard/top-contributors/monthly?limit=12").then(r => r.json()) });
  const [champTab, setChampTab] = useState<"weekly" | "monthly">("weekly");

  const list = champTab === "weekly" ? (weeklyData ?? []) : (monthlyData ?? []);

  return (
    <section className="px-4 mb-8">
      <div className="flex items-center gap-2 mb-2">
        <Crown className="w-5 h-5 text-[#FFD700]" />
        <h2 className="text-xl font-black text-white">Hall of Champions</h2>
      </div>
      <p className="text-slate-500 text-xs mb-4 ml-7">Every season result is permanently recorded.</p>

      {/* Tab toggle */}
      <div className="flex gap-1 p-1 rounded-xl bg-white/5 border border-white/8 mb-4 w-fit">
        {(["weekly", "monthly"] as const).map(t => (
          <button
            key={t}
            onClick={() => setChampTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              champTab === t ? "bg-[#FFD700] text-black" : "text-slate-400 hover:text-white"
            }`}
          >
            {t === "weekly" ? "Weekly" : "Monthly"}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <Trophy className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No champions recorded yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {list.map(c => (
            <Link key={`${c.userId}-${c.period}`} href={`/profile/${c.user.username}`}>
              <div className="flex items-center gap-4 px-4 py-4 rounded-xl border border-[#FFD700]/15 bg-[#FFD700]/5 hover:border-[#FFD700]/30 transition-all cursor-pointer">
                {/* Period label */}
                <div className="w-20 flex-shrink-0">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">Champion</div>
                  <div className="text-xs font-bold text-[#FFD700]">{periodLabel(c)}</div>
                </div>

                {/* Trophy */}
                <div className="w-7 h-7 rounded-full bg-[#FFD700]/20 border border-[#FFD700]/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm">🥇</span>
                </div>

                <UserAvatar user={c.user} size="sm" />

                <div className="flex-1 min-w-0">
                  <div className="font-bold text-white text-sm truncate">{c.user.displayName}</div>
                  <div className="text-[10px] text-slate-500">@{c.user.username}</div>
                </div>

                <div className="flex-shrink-0 px-2.5 py-1 rounded-lg bg-gradient-to-b from-[#fdc700] to-[#d08700]">
                  <span className="text-xs font-black text-black">{formatPoints(c.totalPoints)} pts</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

// ─── Section: Season Categories ────────────────────────────────────────────

const CATEGORIES = [
  { icon: "🎥", title: "Clip Champion",         desc: "Most clips uploaded this season" },
  { icon: "📱", title: "Reel Champion",          desc: "Most reels uploaded this season" },
  { icon: "📸", title: "Screenshot Champion",    desc: "Most screenshots shared" },
  { icon: "❤️", title: "Community Favourite",    desc: "Most likes received" },
  { icon: "🔥", title: "Most Fire Reactions",    desc: "Most 🔥 reactions collected" },
  { icon: "🎮", title: "Indie Game Champion",    desc: "Most content from indie titles" },
  { icon: "🏅", title: "Rising Creator",         desc: "Biggest rank climb this season" },
  { icon: "💬", title: "Most Helpful Member",    desc: "Most comments given" },
];

function SeasonCategories() {
  return (
    <section className="px-4 mb-8">
      <div className="flex items-center gap-2 mb-2">
        <Star className="w-5 h-5 text-[#B7FF1A]" />
        <h2 className="text-xl font-black text-white">Season Awards</h2>
      </div>
      <p className="text-slate-500 text-xs mb-4 ml-7">Special recognition beyond the overall leaderboard.</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {CATEGORIES.map(c => (
          <div key={c.title} className="rounded-xl border border-white/8 bg-white/3 px-4 py-4">
            <span className="text-2xl block mb-2">{c.icon}</span>
            <div className="font-bold text-white text-xs mb-1">{c.title}</div>
            <div className="text-[10px] text-slate-500 leading-snug">{c.desc}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Section: Achievement Cabinet ─────────────────────────────────────────

const ACHIEVEMENTS = [
  { icon: "🏆", label: "Weekly Champion",     count: "×1 awarded" },
  { icon: "🥇", label: "Monthly Champion",    count: "×1 awarded" },
  { icon: "🔥", label: "50 Day Streak",       count: "Keep going!" },
  { icon: "🎥", label: "500 Clips",           count: "Upload milestone" },
  { icon: "📱", label: "250 Reels",           count: "Upload milestone" },
  { icon: "💰", label: "20 Bounties",         count: "Bounty hunter" },
  { icon: "⭐", label: "Level 100",           count: "Max level" },
  { icon: "👑", label: "Diamond League",      count: "Top 10 finish" },
];

function AchievementCabinet() {
  return (
    <section className="px-4 mb-8">
      <div className="flex items-center gap-2 mb-2">
        <Award className="w-5 h-5 text-[#B7FF1A]" />
        <h2 className="text-xl font-black text-white">Achievement Cabinet</h2>
      </div>
      <p className="text-slate-500 text-xs mb-4 ml-7">Permanent achievements earned through competition — visible on your profile.</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {ACHIEVEMENTS.map(a => (
          <div key={a.label} className="rounded-xl border border-white/8 bg-white/3 px-4 py-4 flex flex-col items-center text-center gap-1.5 opacity-50">
            <span className="text-2xl">{a.icon}</span>
            <div className="font-semibold text-white text-xs">{a.label}</div>
            <div className="text-[10px] text-slate-500">{a.count}</div>
          </div>
        ))}
      </div>
      <p className="text-slate-600 text-[10px] mt-3 ml-1">Achievements shown above are unlocked by reaching these milestones in the competition.</p>
    </section>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────

const RS_STYLES = `
@keyframes rs-float { 0%,100%{transform:translateY(0px);} 50%{transform:translateY(-6px);} }
@keyframes rs-glow-pulse { 0%,100%{opacity:.6;} 50%{opacity:1;} }
.rs-hero-trophy { animation: rs-float 3.5s ease-in-out infinite; }
.rs-section-divider { background: linear-gradient(90deg, transparent, rgba(183,255,26,0.2), transparent); height:1px; margin:0 1rem 2rem; }
`;

export default function LeaderboardPage() {
  const { user } = useAuth();

  // Top 3 enriched entries for the banner podium
  const { data: top3Data } = useQuery<TrendingEntry[]>({
    queryKey: ["/api/trending-gamefolios/banner"],
    queryFn: () => fetch("/api/trending-gamefolios?period=week&limit=3").then(r => r.json()),
  });

  // Weekly leaderboard (large limit) for rival + competitive overview
  const { data: weeklyData } = useQuery<LeaderboardEntry[]>({
    queryKey: ["/api/leaderboard/weekly/current/full"],
    queryFn: () => fetch("/api/leaderboard/weekly/current?limit=200").then(r => r.json()),
  });

  // All-time player count for the hero
  const { data: alltimeData } = useQuery<LeaderboardEntry[]>({
    queryKey: ["/api/leaderboard"],
    queryFn: () => fetch("/api/leaderboard?limit=200").then(r => r.json()),
  });

  const top3 = top3Data ?? [];
  const leaderboard = weeklyData ?? [];
  const playerCount = alltimeData?.length ?? weeklyData?.length ?? 0;

  return (
    <div className="min-h-screen bg-[#0B1218] overflow-y-auto">
      <style>{RS_STYLES}{CREATOR_CARD_STYLES}</style>

      {/* Banner — electrical bg + top 3 creator cards */}
      <SeasonHero top3={top3} />

      {/* Season info bar — below the banner image */}
      <SeasonInfoBar playerCount={playerCount} />

      {/* ── Live Leaderboard — directly under Summer Showdown ── */}
      <div className="w-full border-b border-white/5 pt-8 pb-6 bg-[#060c12]">
        <LiveLeaderboard userId={user?.id} />
      </div>

      {/* Narrow sections */}
      <div className="max-w-3xl mx-auto pt-6">

        {/* Competitive Overview — logged-in only */}
        {user && leaderboard.length > 0 && (
          <>
            <CompetitiveOverview leaderboard={leaderboard} userId={user.id} />
            <div className="rs-section-divider" />
          </>
        )}
        {!user && (
          <div className="mx-4 mb-6 p-5 rounded-2xl border border-[#B7FF1A]/20 bg-[#B7FF1A]/5 text-center">
            <Trophy className="w-7 h-7 text-[#B7FF1A] mx-auto mb-2 opacity-70" />
            <p className="text-sm text-slate-300 font-medium mb-1">Join the competition</p>
            <p className="text-xs text-slate-500">Sign in to see your rank, league, rivals, and how close you are to the next tier.</p>
          </div>
        )}

        {/* Ranked Leagues */}
        <RankedLeagues leaderboard={leaderboard} userId={user?.id} />
      </div>

      {/* Narrow sections continued */}
      <div className="max-w-3xl mx-auto pb-20">
        <div className="rs-section-divider mt-4" />

        {/* Rival Section — logged-in only */}
        {user && leaderboard.length > 0 && (
          <>
            <RivalSection leaderboard={leaderboard} userId={user.id} />
            <div className="rs-section-divider" />
          </>
        )}

        {/* Season Rewards */}
        <SeasonRewards />
        <div className="rs-section-divider" />

        {/* Hall of Champions */}
        <HallOfChampions />
        <div className="rs-section-divider" />

        {/* Season Categories */}
        <SeasonCategories />
        <div className="rs-section-divider" />

        {/* Achievement Cabinet */}
        <AchievementCabinet />
      </div>
    </div>
  );
}
