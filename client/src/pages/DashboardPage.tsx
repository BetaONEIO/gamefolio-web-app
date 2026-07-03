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
}

/* ─── Design Tokens ─── */

const DARK_BG = "#0B1218";
const BORDER = "#1B2A33";
const TEXT_PRIMARY = "#F5F7F2";
const TEXT_MUTED = "#B8C0AE";
const ACCENT = "#B7FF1A";
const ACCENT_DARK = "#071013";

/* ─── Reusable Components ─── */

function SectionCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl overflow-hidden ${className}`}
      style={{ background: DARK_BG, border: `1px solid ${BORDER}` }}
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
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
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
    <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
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

function RankedSeason({ data, isLoading }: { data: DashboardData["player"] | undefined; isLoading: boolean }) {
  if (isLoading || !data) {
    return (
      <SectionCard>
        <SectionHeader icon={Trophy} title="Ranked Season" />
        <div className="px-5 pb-5 space-y-3">
          <Skeleton className="h-24 rounded-xl w-full" />
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard>
      <SectionHeader
        icon={Trophy}
        title="Ranked Season"
        action={
          <Link href="/leaderboard">
            <span className="text-xs font-semibold flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity" style={{ color: ACCENT }}>
              Leaderboard <ChevronRight className="w-3 h-3" />
            </span>
          </Link>
        }
      />
      <div className="px-5 pb-5">
        <div className="flex items-center gap-4 mb-4">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: `${data.leagueColor}15`, border: `1px solid ${data.leagueColor}30` }}
          >
            <Trophy className="w-8 h-8" style={{ color: data.leagueColor }} />
          </div>
          <div>
            <p className="text-xs font-medium mb-0.5" style={{ color: TEXT_MUTED }}>Current League</p>
            <h4 className="text-xl font-black" style={{ color: data.leagueColor }}>{data.league}</h4>
            <p className="text-xs" style={{ color: TEXT_MUTED }}>Level {data.level}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}` }}>
            <p className="text-[10px] font-medium mb-1" style={{ color: TEXT_MUTED }}>Next Player</p>
            <p className="text-sm font-bold" style={{ color: ACCENT }}>
              {Math.round(data.pointsRemaining).toLocaleString()} XP
            </p>
          </div>
          <div className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}` }}>
            <p className="text-[10px] font-medium mb-1" style={{ color: TEXT_MUTED }}>Next League</p>
            <p className="text-sm font-bold" style={{ color: data.leagueColor }}>
              {data.level >= 40 ? "Maxed" : data.level >= 30 ? "Legend" : data.level >= 20 ? "Diamond" : data.level >= 10 ? "Gold" : "Silver"}
            </p>
          </div>
        </div>

        {data.rank && (
          <div className="mt-3 p-3 rounded-xl flex items-center justify-between" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}` }}>
            <span className="text-xs font-medium" style={{ color: TEXT_MUTED }}>Global Rank</span>
            <span className="text-lg font-black" style={{ color: ACCENT }}>#{data.rank}</span>
          </div>
        )}
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
      <div className="relative" style={{ minHeight: isMobile ? 340 : 380 }}>
        <div
          className="absolute inset-0"
          style={{ backgroundImage: "url('/attached_assets/Flame_1783087368020.png')", backgroundSize: "cover", backgroundPosition: "center" }}
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,rgba(5,9,13,0.60) 0%,rgba(8,14,24,0.65) 45%,rgba(5,9,13,0.92) 100%)" }} />

        {/* Warm glow orb behind avatar */}
        <div className="absolute bottom-0 left-20 w-64 h-48 blur-3xl opacity-20 pointer-events-none"
          style={{ background: "radial-gradient(ellipse,#FF6B35,transparent 70%)" }} />

        <PlayerOverview data={data?.player} isLoading={isLoading} />
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
            <RankedSeason data={data?.player} isLoading={isLoading} />
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

            <RankedSeason data={data?.player} isLoading={isLoading} />

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
