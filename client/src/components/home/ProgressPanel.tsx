import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Zap, Flame, Gift, Star, ChevronRight, Trophy } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface LevelProgress {
  level: number;
  currentXP: number;
  xpForCurrentLevel: number;
  xpForNextLevel: number;
  progressPercent: number;
  xpNeededForNextLevel: number;
}

interface LootboxStatus {
  canOpen: boolean;
  nextAvailableAt?: string | null;
  xpNeeded?: number;
}

function fmtXP(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

function StatPill({ icon, value, label, accent }: { icon: React.ReactNode; value: string | number; label: string; accent?: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <span style={{ color: accent || '#B7FF1A' }}>{icon}</span>
      <div>
        <div className="text-white font-black text-sm leading-none">{value}</div>
        <div className="text-white/40 text-[10px] mt-0.5 leading-none">{label}</div>
      </div>
    </div>
  );
}

export function ProgressPanel() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const { data: levelData, isLoading: isLoadingLevel } = useQuery<LevelProgress>({
    queryKey: [`/api/user/${user?.id}/level-progress`],
    queryFn: async () => {
      const r = await fetch(`/api/user/${user?.id}/level-progress`, { credentials: 'include' });
      if (!r.ok) throw new Error('Failed');
      return r.json();
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  const { data: lootboxStatus } = useQuery<LootboxStatus>({
    queryKey: ['/api/lootbox/status'],
    queryFn: async () => {
      const r = await fetch('/api/lootbox/status', { credentials: 'include' });
      if (!r.ok) throw new Error('Failed');
      return r.json();
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  if (!user) return null;

  const level = levelData?.level ?? user?.level ?? 1;
  const xpCurrent = levelData?.currentXP ?? 0;
  const xpNext = levelData?.xpForNextLevel ?? 1000;
  const xpNeeded = levelData?.xpNeededForNextLevel ?? xpNext - xpCurrent;
  const progress = levelData?.progressPercent ?? Math.min(100, Math.round((xpCurrent / xpNext) * 100));
  const streak = (user as any).currentStreak ?? 0;

  const journeyItems = [
    xpNeeded > 0 && `${fmtXP(xpNeeded)} XP until Level ${level + 1}`,
    streak === 0 && 'Start your upload streak today',
    lootboxStatus?.canOpen && '🎁 Loot box ready to open!',
    lootboxStatus?.xpNeeded && `Loot box unlocks in ${lootboxStatus.xpNeeded} XP`,
  ].filter(Boolean) as string[];

  return (
    <section className="px-4 sm:px-6 md:px-8 pt-6">
      <div className="rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(11,19,25,0.98) 0%, rgba(16,26,35,0.98) 100%)', border: '1px solid rgba(183,255,26,0.15)', boxShadow: '0 0 40px rgba(183,255,26,0.05)' }}>
        
        {/* Top bar */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-5 rounded-full" style={{ background: '#B7FF1A' }} />
            <span className="text-white font-black text-sm uppercase tracking-widest">Your Progress</span>
          </div>
          <button onClick={() => setLocation('/profile')} className="text-[11px] text-white/40 hover:text-white/70 flex items-center gap-1 transition-colors">
            View Profile <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        <div className="px-5 pb-5">
          {/* Level + XP bar row */}
          <div className="flex items-center gap-4 mb-4">
            {/* Level badge */}
            <div className="flex-shrink-0 relative">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #B7FF1A22 0%, #B7FF1A08 100%)', border: '2px solid #B7FF1A', boxShadow: '0 0 20px #B7FF1A30' }}>
                <span className="text-[#B7FF1A] font-black text-xl">{level}</span>
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: '#B7FF1A', boxShadow: '0 0 8px #B7FF1A80' }}>
                <Star className="w-2.5 h-2.5 text-black" fill="black" />
              </div>
            </div>

            {/* XP bar */}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-white font-bold text-sm">Level {level}</span>
                <span className="text-white/50 text-xs font-mono">{fmtXP(xpCurrent)} / {fmtXP(xpNext)} XP</span>
              </div>
              {isLoadingLevel ? (
                <Skeleton className="h-3 w-full rounded-full" />
              ) : (
                <div className="relative h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
                  <div
                    className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
                    style={{
                      width: `${progress}%`,
                      background: 'linear-gradient(90deg, #7aff00, #B7FF1A)',
                      boxShadow: '0 0 12px #B7FF1A80',
                    }}
                  />
                  {/* Shimmer */}
                  <div className="absolute inset-y-0 left-0 w-full rounded-full overflow-hidden pointer-events-none">
                    <div
                      className="absolute inset-y-0 w-16 rounded-full opacity-40"
                      style={{
                        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)',
                        left: `${progress - 8}%`,
                      }}
                    />
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between mt-1">
                <span className="text-white/30 text-[10px]">{progress}% to Level {level + 1}</span>
                <span className="text-[10px]" style={{ color: '#B7FF1A' }}>{fmtXP(xpNeeded)} XP to go</span>
              </div>
            </div>
          </div>

          {/* Stat pills row */}
          <div className="flex flex-wrap gap-2 mb-4">
            <StatPill icon={<Flame className="w-3.5 h-3.5" />} value={streak} label={streak === 1 ? 'Day Streak' : 'Day Streak'} accent="#FF6B35" />
            <StatPill icon={<Zap className="w-3.5 h-3.5" />} value={`${fmtXP(xpCurrent)} XP`} label="Total Earned" />
            {lootboxStatus?.canOpen ? (
              <button
                onClick={() => setLocation('/lootbox')}
                className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all hover:opacity-90 active:scale-95"
                style={{ background: 'linear-gradient(135deg, #B7FF1A22, #B7FF1A10)', border: '1px solid #B7FF1A50', boxShadow: '0 0 12px #B7FF1A30' }}
              >
                <span className="text-lg leading-none animate-bounce">🎁</span>
                <div>
                  <div className="text-[#B7FF1A] font-black text-xs leading-none">Open Now!</div>
                  <div className="text-white/40 text-[10px] mt-0.5 leading-none">Loot Box Ready</div>
                </div>
              </button>
            ) : (
              <StatPill icon={<Gift className="w-3.5 h-3.5" />} value={lootboxStatus?.xpNeeded ? `${lootboxStatus.xpNeeded} XP` : 'Locked'} label="Next Loot Box" accent="#9B59B6" />
            )}
          </div>

          {/* Continue Your Journey card */}
          {journeyItems.length > 0 && (
            <div className="rounded-xl p-3" style={{ background: 'rgba(183,255,26,0.05)', border: '1px solid rgba(183,255,26,0.12)' }}>
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="w-3.5 h-3.5" style={{ color: '#B7FF1A' }} />
                <span className="text-[11px] font-black uppercase tracking-widest" style={{ color: '#B7FF1A' }}>Continue Your Journey</span>
              </div>
              <div className="space-y-1.5">
                {journeyItems.slice(0, 3).map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: '#B7FF1A' }} />
                    <span className="text-white/60 text-xs">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
