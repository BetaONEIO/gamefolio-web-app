import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ClipWithUser } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { useLocation, Link } from "wouter";
import { EmailVerificationBanner } from "@/components/auth/EmailVerificationBanner";
import { useMobile } from "@/hooks/use-mobile";
import { EcosystemActivityRail } from "@/components/home/EcosystemActivityRail";
import { CreatorCard, CREATOR_CARD_STYLES, TrendingEntry } from "@/components/home/CreatorCard";
import { LazySection } from "@/components/ui/lazy-section";
import LatestContentSlider from "@/components/home/LatestContentSlider";

// New section components
import { ProgressPanel } from "@/components/home/ProgressPanel";
import { ChallengesAndBounties } from "@/components/home/ChallengesAndBounties";
import { CommunityFeed } from "@/components/home/CommunityFeed";
import { TrendingSection } from "@/components/home/TrendingSection";
import { DiscoverSection } from "@/components/home/DiscoverSection";

interface DbHeroSlide {
  id: number;
  title: string;
  subtitle: string | null;
  buttonText: string | null;
  buttonLink: string | null;
  imageUrl: string;
  displayOrder: number;
  isActive: boolean;
}

type AnySlide = DbHeroSlide | { type: 'leaderboard'; id: 'leaderboard' } | { type: 'latestContent'; id: 'latestContent' };

interface LeaderboardWinner {
  userId: number;
  rank: number;
  uploadsCount: number;
  totalPoints: number;
  followersCount?: number;
  followingCount?: number;
  clipsCount?: number;
  reelsCount?: number;
  screenshotsCount?: number;
  user: {
    id: number;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    bannerUrl: string | null;
    accentColor: string | null;
    avatarBorderColor: string | null;
    level: number | null;
    emailVerified?: boolean | null;
    backgroundColor: string | null;
    primaryColor: string | null;
    profileBackgroundGradient: boolean | null;
    profileBackgroundImageUrl: string | null;
  };
}

const LEADERBOARD_STYLES = `
@keyframes lb-sparkle {
  0%, 100% { transform: scale(1) translateY(0); opacity: 0.9; }
  50% { transform: scale(1.4) translateY(-5px); opacity: 0.4; }
}
@keyframes lb-orbit {
  from { transform: rotate(0deg) translateX(105px) rotate(0deg); }
  to   { transform: rotate(360deg) translateX(105px) rotate(-360deg); }
}
@keyframes lb-pulse-gold {
  0%, 100% { box-shadow: 0 0 24px 6px rgba(255,200,50,0.4); }
  50%       { box-shadow: 0 0 40px 12px rgba(255,200,50,0.65); }
}
@keyframes lb-glow-silver {
  0%, 100% { box-shadow: 0 0 18px 4px rgba(192,192,192,0.3); }
  50%       { box-shadow: 0 0 30px 8px rgba(192,192,192,0.5); }
}
@keyframes lb-glow-bronze {
  0%, 100% { box-shadow: 0 0 18px 4px rgba(205,127,50,0.3); }
  50%       { box-shadow: 0 0 30px 8px rgba(205,127,50,0.5); }
}
.lb-card-1 .fire-card { border-color: rgba(255,215,0,0.75) !important; animation: lb-pulse-gold 2.4s ease-in-out infinite; }
.lb-card-2 .fire-card { border-color: rgba(192,192,192,0.65) !important; animation: lb-glow-silver 2.8s ease-in-out infinite; }
.lb-card-3 .fire-card { border-color: rgba(205,127,50,0.65) !important; animation: lb-glow-bronze 3.2s ease-in-out infinite; }
.lb-spark  { position:absolute; width:6px; height:6px; border-radius:50%; pointer-events:none; }
.lb-spark:nth-child(1) { animation: lb-orbit 4.5s linear infinite, lb-sparkle 1.2s ease-in-out infinite; background:#FFD700; top:50%; left:50%; margin:-3px; animation-delay:0s,0s; }
.lb-spark:nth-child(2) { animation: lb-orbit 4.5s linear infinite, lb-sparkle 1.2s ease-in-out infinite; background:#B7FF18; top:50%; left:50%; margin:-3px; animation-delay:-0.75s,-0.3s; }
.lb-spark:nth-child(3) { animation: lb-orbit 4.5s linear infinite, lb-sparkle 1.2s ease-in-out infinite; background:#fff; top:50%; left:50%; margin:-3px; animation-delay:-1.5s,-0.6s; }
.lb-spark:nth-child(4) { animation: lb-orbit 4.5s linear infinite, lb-sparkle 1.2s ease-in-out infinite; background:#FFD700; top:50%; left:50%; margin:-3px; animation-delay:-2.25s,-0.9s; }
.lb-spark:nth-child(5) { animation: lb-orbit 4.5s linear infinite, lb-sparkle 1.2s ease-in-out infinite; background:#B7FF18; top:50%; left:50%; margin:-3px; animation-delay:-3s,-1.1s; }
.lb-spark:nth-child(6) { animation: lb-orbit 6.5s linear infinite, lb-sparkle 1.8s ease-in-out infinite; background:#fff; top:50%; left:50%; margin:-3px; animation-delay:-3.75s,-1.4s; }
`;

const HomePage = () => {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const userId = user?.id;
  const isMobile = useMobile();

  // Hero carousel state
  const [currentSlide, setCurrentSlide] = useState(0);
  const slidesLengthRef = useRef(0);

  const { data: dbHeroSlides } = useQuery<DbHeroSlide[]>({
    queryKey: ["/api/hero-slides"],
    queryFn: async () => {
      const r = await fetch('/api/hero-slides');
      if (!r.ok) throw new Error('Failed');
      return r.json();
    },
    staleTime: 10000,
  });

  const { data: weeklyTop10 } = useQuery<LeaderboardWinner[]>({
    queryKey: ["/api/trending-gamefolios", "week", 10],
    queryFn: async () => {
      const r = await fetch("/api/trending-gamefolios?period=week&limit=10");
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    staleTime: 120_000,
  });
  const weeklyTop3 = weeklyTop10?.slice(0, 3);

  // Countdown to next Monday midnight (weekly leaderboard reset)
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);
  const resetCountdown = useMemo(() => {
    const d = new Date(nowMs);
    const daysUntilMonday = (8 - d.getDay()) % 7 || 7;
    const next = new Date(d);
    next.setDate(d.getDate() + daysUntilMonday);
    next.setHours(0, 0, 0, 0);
    const diff = next.getTime() - nowMs;
    return { days: Math.floor(diff / 86400000), hours: Math.floor((diff % 86400000) / 3600000) };
  }, [nowMs]);

  const activeSlides = useMemo<AnySlide[] | null>(() => {
    const base: AnySlide[] = dbHeroSlides && dbHeroSlides.length > 0
      ? dbHeroSlides.filter((s) => {
          const t = (s.title || "").toLowerCase();
          return !t.includes("build your gamefolio") && !t.includes("featured creator");
        })
      : [];
    const leaderboardSlide: AnySlide = { type: 'leaderboard', id: 'leaderboard' };
    const latestContentSlide: AnySlide = { type: 'latestContent', id: 'latestContent' };
    return [latestContentSlide, ...base, leaderboardSlide];
  }, [dbHeroSlides]);

  // Keep ref in sync so auto-advance interval can read length without stale closure
  useEffect(() => {
    slidesLengthRef.current = activeSlides?.length ?? 0;
  }, [activeSlides]);

  // Auto-advance
  useEffect(() => {
    const timer = setInterval(() => {
      const len = slidesLengthRef.current;
      if (len > 1) setCurrentSlide(prev => (prev + 1) % len);
    }, 8000);
    return () => clearInterval(timer);
  }, []);

  const prevSlide = useCallback(() => {
    if (!activeSlides) return;
    setCurrentSlide((prev) => (prev - 1 + activeSlides.length) % activeSlides.length);
  }, [activeSlides]);

  const nextSlide = useCallback(() => {
    if (!activeSlides) return;
    setCurrentSlide((prev) => (prev + 1) % activeSlides.length);
  }, [activeSlides]);

  return (
    <div className="pb-16 md:pb-8 hide-scrollbar">
      {/* Email Verification Banner */}
      {user && (
        <div className="mx-2 sm:mx-4 md:mx-6 mb-0">
          <EmailVerificationBanner />
        </div>
      )}

      {/* ── Hero Carousel ── */}
      <section className="mb-0 -mx-0">
        <div className="relative overflow-hidden">
          <div className="w-full bg-black relative min-h-[420px] sm:min-h-[560px] md:min-h-[640px] border-b-2 border-primary">
            {activeSlides && (
              <div className="relative w-full h-full min-h-[420px] sm:min-h-[560px] md:min-h-[640px]">
                {activeSlides.map((slide, idx) => {
                  const isLeaderboardSlide = 'type' in slide && slide.type === 'leaderboard';
                  const isLatestContentSlide = 'type' in slide && slide.type === 'latestContent';

                  return (
                    <div
                      key={slide.id}
                      className="absolute inset-0 transition-opacity duration-700 ease-in-out"
                      style={{ opacity: idx === currentSlide ? 1 : 0, zIndex: idx === currentSlide ? 1 : 0 }}
                    >
                      {isLeaderboardSlide ? (
                        /* ── Leaderboard slide ── */
                        <div className="absolute inset-0 overflow-hidden">
                          <div className="absolute inset-0" style={{ backgroundImage:"url('/electrical-bg.webp')", backgroundSize:"cover", backgroundPosition:"center" }} />
                          <div className="absolute inset-0" style={{ background:"linear-gradient(160deg,rgba(5,9,13,0.82) 0%,rgba(8,14,24,0.72) 55%,rgba(5,9,13,0.82) 100%)" }} />
                          <style>{LEADERBOARD_STYLES}{CREATOR_CARD_STYLES}</style>

                          <div className="relative h-full flex flex-col">
                            <div className="flex-shrink-0 pt-4 pb-2 px-4 flex items-center justify-between">
                              <h2 className="text-xl sm:text-2xl font-bold">Leaderboard</h2>
                              <div className="flex items-center gap-3">
                                <span className="text-[10px] text-white/40">⏱ Resets in: <span className="font-bold text-white/70">{resetCountdown.days}d {resetCountdown.hours}h</span></span>
                                <button
                                  onClick={() => setLocation('/leaderboard')}
                                  className="inline-flex items-center gap-1 text-[10px] font-black px-3 py-1 rounded-lg transition-all hover:opacity-90 active:scale-95"
                                  style={{ background:'#B7FF18', color:'#0B1319' }}>
                                  View All →
                                </button>
                              </div>
                            </div>

                            <div className="flex flex-row flex-1 min-h-0">
                              {/* Podium */}
                              <div className="flex flex-col items-center py-2 px-3 sm:px-5" style={{ width:'63%', flexShrink:0 }}>
                                <div className="relative w-full flex items-center justify-center" style={{ flex:'1 1 0', minHeight:0 }}>
                                  <div style={{ transform:'scale(0.96)', transformOrigin:'center center', display:'flex', alignItems:'flex-end', gap:'16px' }}>
                                    {(() => {
                                      const top3 = weeklyTop3 ?? [];
                                      const PODIUM_IMG: Record<1|2|3, string> = { 1: '/podium-1st.webp', 2: '/podium-2nd.webp', 3: '/podium-3rd.webp' };
                                      const PODIUM_W: Record<1|2|3, number> = { 1: 393, 2: 357, 3: 321 };
                                      const PODIUM_H: Record<1|2|3, number> = { 1: 123, 2: 105, 3: 90 };
                                      const PODIUM_GLOW: Record<1|2|3, string> = {
                                        1: 'drop-shadow(0 0 20px rgba(255,215,0,0.9)) drop-shadow(0 6px 14px rgba(255,190,0,0.55))',
                                        2: 'drop-shadow(0 0 16px rgba(210,210,210,0.85)) drop-shadow(0 5px 10px rgba(192,192,192,0.5))',
                                        3: 'drop-shadow(0 0 14px rgba(205,127,50,0.85)) drop-shadow(0 5px 10px rgba(180,100,30,0.5))',
                                      };
                                      const renderCard = (winner: LeaderboardWinner | undefined, rank: 1|2|3) => {
                                        const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉';
                                        const accentClr = rank === 1 ? '#FFD700' : rank === 2 ? '#C0C0C0' : '#CD7F32';
                                        const cardClass = `lb-card-${rank}`;
                                        const elevate = rank === 1 ? -28 : 0;
                                        if (!winner) {
                                          return (
                                            <div key={rank} style={{ display:'flex', flexDirection:'column', alignItems:'center', transform:`translateY(${elevate}px)` }}>
                                              <div className={cardClass}>
                                                <div className="fire-card flex flex-col items-center justify-center" style={{ width:228, height:408, borderRadius:16 }}>
                                                  <div className="absolute inset-0 rounded-[inherit] flex flex-col items-center justify-center gap-2" style={{ background:'rgba(11,19,25,0.95)' }}>
                                                    <div className="text-4xl">{medal}</div>
                                                    <div className="text-white/30 text-xs font-bold">Could be you!</div>
                                                  </div>
                                                </div>
                                              </div>
                                              <img src={PODIUM_IMG[rank]} alt={`#${rank}`} style={{ width: PODIUM_W[rank], height: PODIUM_H[rank], objectFit:'contain', marginTop:-22, filter:`brightness(0.7) ${PODIUM_GLOW[rank]}`, position:'relative', zIndex:10 }} />
                                            </div>
                                          );
                                        }
                                        const entry: TrendingEntry = {
                                          userId: winner.userId, rank: winner.rank,
                                          uploadsCount: winner.uploadsCount, totalPoints: winner.totalPoints,
                                          clipsCount: winner.clipsCount ?? winner.uploadsCount, reelsCount: winner.reelsCount ?? 0, screenshotsCount: winner.screenshotsCount ?? 0,
                                          followersCount: winner.followersCount ?? 0, followingCount: winner.followingCount ?? 0,
                                          user: {
                                            id: winner.user.id, username: winner.user.username, displayName: winner.user.displayName,
                                            avatarUrl: winner.user.avatarUrl, bannerUrl: winner.user.bannerUrl,
                                            avatarBorderColor: accentClr, accentColor: accentClr, level: winner.user.level,
                                            backgroundColor: winner.user.backgroundColor, primaryColor: winner.user.primaryColor,
                                            profileBackgroundGradient: winner.user.profileBackgroundGradient ?? false,
                                            profileBackgroundImageUrl: winner.user.profileBackgroundImageUrl,
                                          },
                                        };
                                        return (
                                          <div key={rank} style={{ display:'flex', flexDirection:'column', alignItems:'center', transform:`translateY(${elevate}px)` }}>
                                            <div className={`relative ${cardClass}`}>
                                              {rank === 1 && (
                                                <div className="absolute pointer-events-none" style={{ inset:'-10px', zIndex:10 }}>
                                                  {[1,2,3,4,5,6].map(i => <span key={i} className="lb-spark" />)}
                                                </div>
                                              )}
                                              <CreatorCard entry={entry} period="week" />
                                            </div>
                                            <img src={PODIUM_IMG[rank]} alt={`#${rank}`} style={{ width: PODIUM_W[rank], height: PODIUM_H[rank], objectFit:'contain', marginTop:-22, filter: PODIUM_GLOW[rank], position:'relative', zIndex:10 }} />
                                          </div>
                                        );
                                      };
                                      return (<>{renderCard(top3[1], 2)}{renderCard(top3[0], 1)}{renderCard(top3[2], 3)}</>);
                                    })()}
                                  </div>
                                </div>
                              </div>

                              {/* Divider */}
                              <div className="self-stretch w-px my-6 flex-shrink-0" style={{ background:'rgba(183,255,26,0.08)' }} />

                              {/* Top 10 list */}
                              <div className="flex-1 flex flex-col py-4 px-4 sm:px-5 overflow-hidden rounded-xl mx-2 my-2" style={{ background:'rgb(11,19,25)', border:'1px solid rgba(183,255,26,0.10)' }}>
                                <div className="text-[9px] font-black uppercase tracking-[0.2em] mb-3" style={{ color:'#B7FF18' }}>Top 10 This Week</div>
                                <div className="flex flex-col gap-0 overflow-y-auto flex-1">
                                  {(weeklyTop10 && weeklyTop10.length > 0 ? weeklyTop10 : Array.from({length:10}).map(() => null)).map((winner, idx) => {
                                    const rank = idx + 1;
                                    const medalEmoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null;
                                    const accentClr = rank === 1 ? '#FFD700' : rank === 2 ? '#C0C0C0' : rank === 3 ? '#CD7F32' : null;
                                    const isTop3 = rank <= 3;
                                    return (
                                      <div key={(winner as any)?.userId ?? idx}
                                        className="flex items-center gap-2.5 py-[6px] cursor-pointer rounded-lg px-2 transition-colors hover:bg-white/5"
                                        style={{ borderBottom:'1px solid rgba(255,255,255,0.05)', marginBottom:'1px' }}
                                        onClick={() => winner && setLocation(`/profile/${(winner as any).user.username}`)}>
                                        <div className="flex-shrink-0 w-6 text-center">
                                          {medalEmoji ? <span className="text-sm leading-none">{medalEmoji}</span> : <span className="text-[11px] font-black" style={{ color:'rgba(255,255,255,0.25)' }}>#{rank}</span>}
                                        </div>
                                        {winner ? (
                                          <div className="flex-shrink-0 w-7 h-7 rounded-full overflow-hidden" style={{ border: isTop3 ? `1.5px solid ${accentClr}60` : '1.5px solid rgba(255,255,255,0.1)' }}>
                                            {(winner as any).user.avatarUrl ? (
                                              <img src={(winner as any).user.avatarUrl} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                              <div className="w-full h-full flex items-center justify-center text-[10px] font-bold" style={{ background:'rgba(183,255,26,0.1)', color:'#B7FF18' }}>
                                                {((winner as any).user.displayName || (winner as any).user.username || '?')[0].toUpperCase()}
                                              </div>
                                            )}
                                          </div>
                                        ) : (
                                          <div className="flex-shrink-0 w-7 h-7 rounded-full" style={{ background:'rgba(255,255,255,0.05)' }} />
                                        )}
                                        <div className="flex-1 min-w-0">
                                          {winner ? (
                                            <>
                                              <div className="text-[11px] font-semibold text-white/90 truncate leading-tight">{(winner as any).user.displayName || (winner as any).user.username}</div>
                                              <div className="text-[9px] text-white/35 truncate">@{(winner as any).user.username}</div>
                                            </>
                                          ) : (
                                            <div className="h-3 w-20 rounded" style={{ background:'rgba(255,255,255,0.06)' }} />
                                          )}
                                        </div>
                                        {winner ? (
                                          <div className="flex-shrink-0 flex items-center gap-1">
                                            <span className="text-[10px] font-black" style={{ color: isTop3 ? accentClr! : 'rgba(183,255,26,0.7)' }}>
                                              ⚡ {(winner as any).totalPoints >= 1000 ? `${((winner as any).totalPoints/1000).toFixed(1)}K` : (winner as any).totalPoints}
                                            </span>
                                          </div>
                                        ) : (
                                          <div className="h-3 w-10 rounded" style={{ background:'rgba(255,255,255,0.06)' }} />
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                                <button onClick={() => setLocation('/leaderboard')} className="mt-3 w-full py-2 rounded-lg text-[11px] font-black tracking-wide transition-all hover:opacity-90 active:scale-95 flex-shrink-0" style={{ background:'#B7FF18', color:'#0B1319' }}>
                                  View Leaderboard →
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>

                      ) : isLatestContentSlide ? (
                        /* ── Latest Clips & Reels slider ── */
                        <div className="absolute inset-0 overflow-hidden bg-[#040C10] flex flex-col">
                          <div className="flex-1 min-h-0 overflow-hidden px-4 sm:px-8 py-4">
                            <LatestContentSlider />
                          </div>
                        </div>

                      ) : (
                        /* ── Regular image slide ── */
                        <>
                          <img src={(slide as DbHeroSlide).imageUrl} alt={(slide as DbHeroSlide).title} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 to-transparent">
                            <div className="flex flex-col items-start justify-center h-full max-w-3xl p-6 sm:p-8 md:p-12">
                              <h1 className="text-2xl sm:text-3xl md:text-5xl font-bold text-white mb-3 md:mb-4 leading-tight drop-shadow-md">
                                {(slide as DbHeroSlide).title}
                              </h1>
                              {(slide as DbHeroSlide).subtitle && (
                                <h2 className="text-lg sm:text-2xl md:text-3xl font-semibold text-primary mb-4 md:mb-6 leading-tight drop-shadow-lg">
                                  {(slide as DbHeroSlide).subtitle}
                                </h2>
                              )}
                              {(slide as DbHeroSlide).buttonText && (
                                <Button
                                  className="w-fit px-6 py-5 h-auto text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground mt-4"
                                  onClick={() => {
                                    const link = ((slide as DbHeroSlide).buttonLink || "").toLowerCase();
                                    if (link === '#pro' || link === '/pro' || link.includes('pro')) {
                                      window.dispatchEvent(new CustomEvent('open-pro-upgrade'));
                                    } else {
                                      setLocation((slide as DbHeroSlide).buttonLink!);
                                    }
                                  }}
                                >
                                  {(slide as DbHeroSlide).buttonText}
                                </Button>
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}

                {/* Carousel controls */}
                {activeSlides.length > 1 && (
                  <>
                    <button
                      onClick={prevSlide}
                      className="absolute left-3 top-1/2 -translate-y-1/2 z-10 bg-black/60 hover:bg-black/85 backdrop-blur-sm text-white rounded-full p-2.5 transition-colors shadow-lg"
                      aria-label="Previous slide"
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </button>
                    <button
                      onClick={nextSlide}
                      className="absolute right-3 top-1/2 -translate-y-1/2 z-10 bg-black/60 hover:bg-black/85 backdrop-blur-sm text-white rounded-full p-2.5 transition-colors shadow-lg"
                      aria-label="Next slide"
                    >
                      <ChevronRight className="h-6 w-6" />
                    </button>

                    {/* Dot indicators */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex gap-1.5">
                      {activeSlides.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setCurrentSlide(idx)}
                          className="rounded-full transition-all duration-300"
                          style={{
                            width: idx === currentSlide ? 20 : 6,
                            height: 6,
                            background: idx === currentSlide ? '#B7FF1A' : 'rgba(255,255,255,0.3)',
                          }}
                          aria-label={`Go to slide ${idx + 1}`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Live Activity Rail ── */}
      <EcosystemActivityRail />

      {/* ── Section 1: Your Progress ── */}
      <LazySection minHeight="200px" rootMargin="200px">
        <ProgressPanel />
      </LazySection>

      {/* ── Section 2: Challenges & Bounties ── */}
      <LazySection minHeight="400px" rootMargin="200px">
        <ChallengesAndBounties />
      </LazySection>

      {/* ── Section 3: Latest from the Community ── */}
      <LazySection minHeight="600px" rootMargin="300px">
        <CommunityFeed />
      </LazySection>

      {/* ── Section 4: Trending ── */}
      <LazySection minHeight="400px" rootMargin="300px">
        <TrendingSection />
      </LazySection>

      {/* ── Section 5: Discover ── */}
      <LazySection minHeight="280px" rootMargin="300px">
        <DiscoverSection />
      </LazySection>
    </div>
  );
};

export default HomePage;
