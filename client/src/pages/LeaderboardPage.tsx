import { Trophy, Upload, Heart, MessageCircle, Calendar, Clock, Users } from "lucide-react";
import { ZapIconSvg } from "@/components/ui/ZapReactionIcon";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { CreatorCard, TrendingEntry, fmt } from "@/components/home/CreatorCard";

/* ─────────────────────── types ─────────────────────── */
interface PointsLeaderboardEntry {
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
  };
}

interface TopContributor {
  userId: number;
  periodType: string;
  period: string;
  year: number;
  totalPoints: number;
  uploadsCount: number;
  likesGivenCount: number;
  commentsCount: number;
  firesGivenCount: number;
  achievedAt: string;
  user: {
    id: number;
    username: string;
    displayName: string;
    avatarUrl?: string | null;
    nftProfileTokenId?: string | null;
    nftProfileImageUrl?: string | null;
  };
}

type TabType = "weekly" | "monthly" | "alltime";

const MYSTERY_LEGEND_CHANCE = 0.25;

/* ─────────────────────── helpers ─────────────────────── */
const NEON = "#B7FF1A";

const PODIUM_IMG: Record<1 | 2 | 3, string> = {
  1: "/podium-1st.webp",
  2: "/podium-2nd.webp",
  3: "/podium-3rd.webp",
};
const PODIUM_W: Record<1 | 2 | 3, number> = { 1: 393, 2: 357, 3: 321 };
const PODIUM_H: Record<1 | 2 | 3, number> = { 1: 123, 2: 105, 3: 90 };
const PODIUM_GLOW: Record<1 | 2 | 3, string> = {
  1: "drop-shadow(0 0 20px rgba(255,215,0,0.9)) drop-shadow(0 0 40px rgba(255,180,0,0.6)) drop-shadow(0 0 8px rgba(255,255,255,0.4))",
  2: "drop-shadow(0 0 16px rgba(192,192,192,0.85)) drop-shadow(0 0 32px rgba(160,160,160,0.55)) drop-shadow(0 0 6px rgba(255,255,255,0.3))",
  3: "drop-shadow(0 0 14px rgba(205,127,50,0.85)) drop-shadow(0 0 28px rgba(180,100,30,0.55)) drop-shadow(0 0 6px rgba(255,255,255,0.25))",
};

const MEDAL_COLORS: Record<1 | 2 | 3, string> = {
  1: "#FFD700",
  2: "#C0C0C0",
  3: "#CD7F32",
};

function useCountdown(targetMs: number) {
  const [remaining, setRemaining] = useState(targetMs - Date.now());
  useEffect(() => {
    const id = setInterval(() => setRemaining(targetMs - Date.now()), 1000);
    return () => clearInterval(id);
  }, [targetMs]);
  const s = Math.max(0, Math.floor(remaining / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return { d, h, m, sec };
}

function nextMonday(): number {
  const now = new Date();
  const day = now.getUTCDay(); // 0=Sun…6=Sat
  const daysUntil = day === 0 ? 1 : 8 - day;
  const next = new Date(now);
  next.setUTCDate(now.getUTCDate() + daysUntil);
  next.setUTCHours(0, 0, 0, 0);
  return next.getTime();
}

function nextFirstOfMonth(): number {
  const now = new Date();
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return next.getTime();
}

/* ─────────────────────── main component ─────────────────────── */
const LeaderboardPage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("weekly");
  const [showMysteryLegend] = useState(() => Math.random() < MYSTERY_LEGEND_CHANCE);

  const weeklyCountdown = useCountdown(nextMonday());
  const monthlyCountdown = useCountdown(nextFirstOfMonth());

  /* data fetching */
  const { data: weeklyTrending, isLoading: weeklyLoading } = useQuery<TrendingEntry[]>({
    queryKey: ["/api/trending-gamefolios", "week", 10],
    queryFn: async () => {
      const r = await fetch("/api/trending-gamefolios?period=week&limit=10");
      if (!r.ok) throw new Error("Failed to fetch");
      return r.json();
    },
    staleTime: 120_000,
  });

  const { data: monthlyTrending, isLoading: monthlyLoading } = useQuery<TrendingEntry[]>({
    queryKey: ["/api/trending-gamefolios", "month", 10],
    queryFn: async () => {
      const r = await fetch("/api/trending-gamefolios?period=month&limit=10");
      if (!r.ok) throw new Error("Failed to fetch");
      return r.json();
    },
    staleTime: 120_000,
  });

  const { data: allTimeData, isLoading: allTimeLoading } = useQuery<PointsLeaderboardEntry[]>({
    queryKey: ["/api/leaderboard"],
    queryFn: async () => {
      const r = await fetch("/api/leaderboard");
      if (!r.ok) throw new Error("Failed to fetch leaderboard");
      return r.json();
    },
  });

  const { data: historicMonthlyData } = useQuery<TopContributor[]>({
    queryKey: ["/api/leaderboard/top-contributors/monthly"],
    queryFn: async () => {
      const r = await fetch("/api/leaderboard/top-contributors/monthly?limit=50");
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
  });

  const { data: historicWeeklyData } = useQuery<TopContributor[]>({
    queryKey: ["/api/leaderboard/top-contributors/weekly"],
    queryFn: async () => {
      const r = await fetch("/api/leaderboard/top-contributors/weekly?limit=50");
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
  });

  const trendingData = activeTab === "weekly" ? weeklyTrending : monthlyTrending;
  const trendingLoading = activeTab === "weekly" ? weeklyLoading : monthlyLoading;
  const top3 = trendingData?.slice(0, 3) ?? [];
  const rest = trendingData?.slice(3) ?? [];

  const countdown = activeTab === "weekly" ? weeklyCountdown : monthlyCountdown;

  /* ── Podium column: card + trophy image ── */
  const PodiumSlot = ({ entry, rank }: { entry: TrendingEntry; rank: 1 | 2 | 3 }) => {
    const w = PODIUM_W[rank];
    const h = PODIUM_H[rank];
    const scale = rank === 1 ? "scale-100" : rank === 2 ? "scale-[0.91]" : "scale-[0.82]";
    const elevate = rank === 1 ? "-mt-8" : "mt-4";

    return (
      <div className={`flex flex-col items-center ${elevate}`} style={{ flex: "0 0 auto", width: w }}>
        {/* rank badge */}
        <div
          className="text-[11px] font-black px-2.5 py-0.5 rounded-full mb-1.5 uppercase tracking-wider"
          style={{ background: `${MEDAL_COLORS[rank]}22`, color: MEDAL_COLORS[rank], border: `1px solid ${MEDAL_COLORS[rank]}55` }}
        >
          #{rank}
        </div>

        {/* card */}
        <div className={`w-full ${scale}`} style={{ transformOrigin: "top center" }}>
          <CreatorCard entry={entry} rank={rank} />
        </div>

        {/* podium trophy */}
        <img
          src={PODIUM_IMG[rank]}
          alt={`#${rank} podium`}
          style={{
            width: w,
            height: h,
            objectFit: "contain",
            marginTop: -22,
            filter: PODIUM_GLOW[rank],
            position: "relative",
            zIndex: 10,
          }}
        />
      </div>
    );
  };

  /* ── Top-10 list row (ranks 4+) ── */
  const ListRow = ({ entry, index }: { entry: TrendingEntry; index: number }) => {
    const rank = index + 4;
    const avatarSrc = entry.user.avatarUrl ?? undefined;
    return (
      <Link href={`/profile/${entry.user.username}`}>
        <div
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all hover:scale-[1.01]"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          {/* rank */}
          <div className="w-7 flex-shrink-0 text-center">
            <span className="text-xs font-black text-gray-500">#{rank}</span>
          </div>

          {/* avatar */}
          <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 border border-white/10">
            <Avatar className="w-full h-full rounded-none">
              <AvatarImage src={avatarSrc} className="object-cover" />
              <AvatarFallback className="bg-[#1a2a35] text-gray-400 text-xs rounded-none">
                {(entry.user.displayName || entry.user.username)?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>

          {/* name */}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-white truncate">
              {entry.user.displayName || entry.user.username}
            </div>
            <div className="text-[10px] text-gray-500 truncate">@{entry.user.username}</div>
          </div>

          {/* followers */}
          <div className="flex items-center gap-1 text-gray-400 flex-shrink-0">
            <Users className="w-3 h-3" />
            <span className="text-[10px] font-bold">{fmt(entry.followersCount ?? 0)}</span>
          </div>

          {/* XP */}
          <div className="flex-shrink-0 flex items-center gap-1">
            <ZapIconSvg className="w-3.5 h-3.5" active={true} />
            <span className="text-xs font-black" style={{ color: NEON }}>
              {fmt(entry.totalPoints)}
            </span>
          </div>
        </div>
      </Link>
    );
  };

  /* ── All-time simple card ── */
  const getRankStyles = (rank: number) => {
    if (rank === 1) return { cardBorder: "border-[#f0b100]/20", scoreBg: "from-[#fdc700] to-[#d08700]", scoreText: "text-black" };
    if (rank === 2) return { cardBorder: "border-[#c0c0c0]/30", scoreBg: "from-[#e8e8e8] to-[#a8a8a8]", scoreText: "text-slate-800" };
    if (rank === 3) return { cardBorder: "border-[#f54900]/20", scoreBg: "from-[#ff6900] to-[#ca3500]", scoreText: "text-white" };
    return { cardBorder: "border-white/5", scoreBg: "from-[#615fff] to-[#9810fa]", scoreText: "text-white" };
  };

  const AllTimeCard = ({ entry }: { entry: PointsLeaderboardEntry }) => {
    const s = getRankStyles(entry.rank);
    const avatarSrc = entry.user.avatarUrl ?? undefined;
    return (
      <Link href={`/profile/${entry.user.username}`}>
        <div
          className={`flex items-center gap-3 px-4 py-4 rounded-xl border ${s.cardBorder} cursor-pointer transition-all hover:scale-[1.01]`}
          style={{ background: "rgba(255,255,255,0.03)" }}
        >
          <div className="w-8 text-center">
            {entry.rank <= 3 ? (
              <span style={{ color: MEDAL_COLORS[entry.rank as 1 | 2 | 3], fontWeight: 900, fontSize: 14 }}>#{entry.rank}</span>
            ) : (
              <span className="text-xs font-bold text-gray-500">#{entry.rank}</span>
            )}
          </div>
          <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 border border-white/10">
            <Avatar className="w-full h-full rounded-none">
              <AvatarImage src={avatarSrc} className="object-cover" />
              <AvatarFallback className="bg-[#1a2a35] text-gray-400 rounded-none text-xs">
                {entry.user.displayName?.charAt(0)}
              </AvatarFallback>
            </Avatar>
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-white text-sm truncate">{entry.user.displayName}</div>
            <div className="text-[10px] text-gray-500 flex items-center gap-2 mt-0.5">
              <span className="flex items-center gap-0.5"><Upload className="w-2.5 h-2.5 text-[#00bcff]" />{entry.uploadsCount}</span>
              <span className="flex items-center gap-0.5"><Heart className="w-2.5 h-2.5 text-[#ff2056] fill-[#ff2056]" />{entry.likesGivenCount}</span>
              <span className="flex items-center gap-0.5"><MessageCircle className="w-2.5 h-2.5 text-[#00d492]" />{entry.commentsCount}</span>
            </div>
          </div>
          <div className={`w-12 h-8 rounded-lg flex items-center justify-center bg-gradient-to-b ${s.scoreBg}`}>
            <span className={`text-xs font-black ${s.scoreText}`}>{Math.round(entry.totalPoints)}</span>
          </div>
        </div>
      </Link>
    );
  };

  /* ── Historic winner row ── */
  const HistoricRow = ({ contributor, type }: { contributor: TopContributor; type: "monthly" | "weekly" }) => {
    const formatPeriod = () => {
      if (type === "monthly") {
        const [year, month] = contributor.period.split("-");
        const names = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
        return `${names[parseInt(month) - 1] || month} ${year}`;
      }
      const m = contributor.period.match(/W(\d+)/);
      return `Week ${m ? m[1] : contributor.period}, ${contributor.year}`;
    };
    const avatarSrc = contributor.user.avatarUrl ?? undefined;
    return (
      <Link href={`/profile/${contributor.user.username}`}>
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-white/5 transition-colors"
          style={{ border: "1px solid rgba(240,177,0,0.1)" }}>
          <Trophy className="w-4 h-4 flex-shrink-0" style={{ color: "#f0b100" }} />
          <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 border border-[#f0b100]/20">
            <Avatar className="w-full h-full rounded-none">
              <AvatarImage src={avatarSrc} className="object-cover" />
              <AvatarFallback className="bg-[#1a2a35] text-gray-400 rounded-none text-xs">
                {contributor.user.displayName?.charAt(0)}
              </AvatarFallback>
            </Avatar>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-white truncate">{contributor.user.displayName}</div>
            <div className="text-[10px] text-gray-500">{formatPeriod()}</div>
          </div>
          <div className="flex-shrink-0 px-2 py-0.5 rounded-md text-xs font-black text-black"
            style={{ background: "linear-gradient(to bottom, #fdc700, #d08700)" }}>
            {Number.isInteger(contributor.totalPoints) ? contributor.totalPoints : contributor.totalPoints.toFixed(1)}
          </div>
        </div>
      </Link>
    );
  };

  /* ── Skeleton ── */
  const PodiumSkeleton = () => (
    <div className="flex items-end justify-center gap-4 px-4 py-6">
      {[357, 393, 321].map((w, i) => (
        <div key={i} className="flex flex-col items-center gap-2" style={{ width: w }}>
          <Skeleton className="rounded-2xl bg-white/5" style={{ width: w, height: 280 }} />
          <Skeleton className="bg-white/5" style={{ width: w * 0.8, height: 80 }} />
        </div>
      ))}
    </div>
  );

  /* ── Countdown display ── */
  const CountdownBadge = ({ tab }: { tab: "weekly" | "monthly" }) => {
    const c = tab === "weekly" ? weeklyCountdown : monthlyCountdown;
    const label = tab === "weekly"
      ? `${c.d}d ${c.h}h ${c.m}m`
      : `${c.d}d ${c.h}h`;
    return (
      <div className="flex items-center gap-1.5 text-xs text-gray-400">
        <Clock className="w-3.5 h-3.5" />
        <span>Resets in <span className="font-black text-white">{label}</span></span>
      </div>
    );
  };

  return (
    <div className="min-h-screen pb-32" style={{ background: "#0B1319" }}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-10">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mb-6">
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight">Leaderboard</h1>
            <p className="text-sm text-gray-400 mt-1">Top gamers ranked by XP, content & community engagement</p>
          </div>
          {activeTab !== "alltime" && (
            <CountdownBadge tab={activeTab as "weekly" | "monthly"} />
          )}
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-1 p-1 rounded-full mb-8 w-fit"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
          {(["weekly", "monthly", "alltime"] as TabType[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-5 py-2 rounded-full text-sm font-black transition-all"
              style={activeTab === tab
                ? { background: NEON, color: "#071013" }
                : { color: "rgba(255,255,255,0.5)" }}
            >
              {tab === "weekly" ? "This Week" : tab === "monthly" ? "This Month" : "All Time"}
            </button>
          ))}
        </div>

        {/* ══ WEEKLY / MONTHLY VIEW ══ */}
        {activeTab !== "alltime" && (
          <>
            {trendingLoading ? (
              <PodiumSkeleton />
            ) : !trendingData || trendingData.length === 0 ? (
              <div className="text-center py-20">
                <Trophy className="w-14 h-14 mx-auto mb-4 text-gray-600" />
                <h3 className="text-lg font-bold text-white mb-1">No Rankings Yet</h3>
                <p className="text-sm text-gray-400">Start uploading to appear here!</p>
              </div>
            ) : (
              <>
                {/* ── Podium ── */}
                <div className="overflow-x-auto pb-4">
                  <div
                    className="flex items-end justify-center"
                    style={{ gap: 16, minWidth: "fit-content", margin: "0 auto" }}
                  >
                    {/* order: #2, #1, #3 */}
                    {([1, 0, 2] as const).map(idx => {
                      const entry = top3[idx];
                      if (!entry) return null;
                      const rank = (idx + 1) as 1 | 2 | 3;
                      return <PodiumSlot key={entry.userId} entry={entry} rank={rank} />;
                    })}
                  </div>
                </div>

                {/* ── Ranks 4-10 ── */}
                {rest.length > 0 && (
                  <div className="mt-6 mb-2">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                        {activeTab === "weekly" ? "Top 10 This Week" : "Top 10 This Month"}
                      </span>
                      <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
                    </div>
                    <div className="space-y-1.5">
                      {rest.map((entry, i) => (
                        <ListRow key={entry.userId} entry={entry} index={i} />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* ══ ALL-TIME VIEW ══ */}
        {activeTab === "alltime" && (
          <div className="space-y-2 mb-8">
            {allTimeLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-xl bg-white/5" />
              ))
            ) : !allTimeData || allTimeData.length === 0 ? (
              <div className="text-center py-20">
                <Trophy className="w-14 h-14 mx-auto mb-4 text-gray-600" />
                <h3 className="text-lg font-bold text-white mb-1">No Rankings Yet</h3>
                <p className="text-sm text-gray-400">Start uploading to appear here!</p>
              </div>
            ) : (
              allTimeData.map(entry => <AllTimeCard key={entry.userId} entry={entry} />)
            )}
          </div>
        )}

        {/* ── Mystery legend easter egg ── */}
        {showMysteryLegend && (
          <Link href="/mac">
            <div className="group mb-8 mt-2 flex items-center justify-center text-center cursor-pointer select-none opacity-30 hover:opacity-100 transition-opacity"
              data-testid="leaderboard-mystery-legend">
              <span className="text-xs italic text-gray-500 group-hover:text-[#B7FF1A] transition-colors">
                ✨ ??? — a mysterious cat sits beyond the board at 999,999 XP 🐾
              </span>
            </div>
          </Link>
        )}

        {/* ── Historic Winners ── */}
        <div className="mt-10 mb-8">
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="w-5 h-5" style={{ color: "#f0b100" }} />
            <h2 className="text-xl font-black text-white">Hall of Fame</h2>
          </div>
          <p className="text-xs text-gray-400 mb-4">Past weekly and monthly champions</p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-4 h-4 text-gray-300" />
                <h3 className="text-sm font-black text-white">Monthly Champions</h3>
              </div>
              {historicMonthlyData && historicMonthlyData.length > 0 ? (
                <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
                  {historicMonthlyData.map(c => (
                    <HistoricRow key={`${c.userId}-${c.period}`} contributor={c} type="monthly" />
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500 text-sm">No historic monthly winners yet</div>
              )}
            </div>

            <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-gray-300" />
                <h3 className="text-sm font-black text-white">Weekly Champions</h3>
              </div>
              {historicWeeklyData && historicWeeklyData.length > 0 ? (
                <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
                  {historicWeeklyData.map(c => (
                    <HistoricRow key={`${c.userId}-${c.period}`} contributor={c} type="weekly" />
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500 text-sm">No historic weekly winners yet</div>
              )}
            </div>
          </div>
        </div>

        {/* ── How Rankings Work ── */}
        <div className="mb-8">
          <h2 className="text-xl font-black text-white mb-1">How Rankings Work</h2>
          <p className="text-xs text-gray-400 mb-4">Earn XP by contributing and engaging with the community</p>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { icon: <Upload className="w-5 h-5 text-[#00bcff]" />, pts: "+10", label: "Clips Uploaded", sub: "Share your gaming moments", bg: "rgba(0,188,255,0.08)" },
              { icon: <Heart className="w-5 h-5 text-[#ff2056]" fill="#ff2056" />, pts: "+2", label: "Likes Given", sub: "Appreciate others' content", bg: "rgba(255,32,86,0.08)" },
              { icon: <MessageCircle className="w-5 h-5 text-[#00d492]" />, pts: "+5", label: "Comments Made", sub: "Engage with the community", bg: "rgba(0,212,146,0.08)" },
              { icon: <ZapIconSvg className="w-5 h-5" active />, pts: "+3", label: "Fire Reactions", sub: "Give epic reactions", bg: "rgba(255,105,0,0.08)" },
            ].map(item => (
              <div key={item.label} className="rounded-2xl p-4 flex flex-col items-center text-center"
                style={{ background: item.bg, border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center mb-2"
                  style={{ background: "rgba(255,255,255,0.06)" }}>
                  {item.icon}
                </div>
                <span className="text-lg font-black text-white mb-0.5">{item.pts}</span>
                <span className="text-xs font-bold text-gray-300">{item.label}</span>
                <span className="text-[10px] text-gray-500 mt-0.5">{item.sub}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── CTA ── */}
        <div className="rounded-2xl p-6 mb-8"
          style={{ background: "linear-gradient(135deg, rgba(183,255,26,0.08) 0%, rgba(120,40,200,0.08) 100%)", border: "1px solid rgba(183,255,26,0.15)" }}>
          <div className="flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mb-3"
              style={{ background: "rgba(183,255,26,0.15)" }}>
              <ZapIconSvg className="w-7 h-7" active />
            </div>
            <h3 className="text-xl font-black text-white mb-1">Ready to Climb the Rankings?</h3>
            <p className="text-sm text-gray-400 leading-5 mb-5 max-w-xs">
              Upload your best gaming moments and engage with the community to earn XP and rise to the top!
            </p>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto sm:justify-center">
              <Link href="/upload">
                <Button className="w-full sm:w-44 h-11 rounded-full font-black text-sm"
                  style={{ background: NEON, color: "#071013" }}>
                  Upload Your Clip
                </Button>
              </Link>
              <Link href="/explore">
                <Button variant="outline" className="w-full sm:w-44 h-11 rounded-full font-black text-sm border-white/10 text-white"
                  style={{ background: "rgba(255,255,255,0.05)" }}>
                  Explore Content
                </Button>
              </Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default LeaderboardPage;
