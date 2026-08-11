import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Play, Gamepad2, ChevronRight, Circle } from "lucide-react";

interface GamePlayed {
  id: number;
  name: string;
}

interface LatestClip {
  id: number;
  title: string;
  thumbnailUrl: string | null;
  videoUrl: string;
  views: number;
  createdAt: string;
}

interface FeaturedGamefolioData {
  user: {
    id: number;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    bannerUrl: string | null;
    accentColor: string | null;
    bio: string | null;
  };
  gamesPlayed: GamePlayed[];
  latestClip: LatestClip | null;
  clipCount: number;
}

const NEON = "#B7FF1A";
const CARD_BG = "rgba(255,255,255,0.04)";
const CARD_BORDER = "rgba(255,255,255,0.08)";

export default function FeaturedGamefolioBanner() {
  const [clipHover, setClipHover] = useState(false);

  const { data, isLoading } = useQuery<FeaturedGamefolioData>({
    queryKey: ["/api/featured/gamefolio"],
    queryFn: async () => {
      const res = await fetch("/api/featured/gamefolio");
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
    staleTime: 1000 * 60 * 5,
  });

  if (isLoading) {
    return (
      <section className="rounded-2xl overflow-hidden" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
        <div className="flex flex-col md:flex-row">
          <div className="flex-1 p-6 flex items-center gap-4">
            <Skeleton className="w-16 h-16 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <div className="flex-1 p-6 space-y-3">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-44" />
          </div>
        </div>
      </section>
    );
  }

  if (!data) return null;

  const { user, gamesPlayed, latestClip, clipCount } = data;
  const accent = user.accentColor || NEON;

  return (
    <section
      className="rounded-2xl overflow-hidden relative"
      style={{
        background: `linear-gradient(135deg, rgba(11,19,25,0.95) 0%, rgba(15,25,18,0.9) 100%)`,
        border: `1px solid ${CARD_BORDER}`,
      }}
    >
      {/* Subtle neon accent line at top */}
      <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: `linear-gradient(90deg, transparent 0%, ${accent}66 50%, transparent 100%)` }} />

      <div className="flex flex-col md:flex-row p-5 md:p-6 gap-5 md:gap-8">
        {/* ── LEFT: User Profile ── */}
        <div className="flex items-center gap-4 flex-shrink-0">
          <Link href={`/profile/${user.username}`}>
            <div className="relative group cursor-pointer">
              <div
                className="rounded-full overflow-hidden"
                style={{
                  width: 64,
                  height: 64,
                  border: `2.5px solid ${accent}`,
                  boxShadow: `0 0 16px ${accent}44`,
                }}
              >
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.displayName || user.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xl font-bold" style={{ background: `${accent}22`, color: accent }}>
                    {(user.displayName || user.username).charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              {/* Verified badge */}
              <div
                className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
                style={{ background: accent, border: "2px solid #0B1319" }}
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 5L4 7L8 3" stroke="#0B1319" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
          </Link>

          <div>
            <Link href={`/profile/${user.username}`}>
              <h3 className="text-white font-black text-base md:text-lg tracking-tight hover:underline cursor-pointer" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {user.displayName || user.username}
              </h3>
            </Link>
            <p className="text-white/40 text-xs font-medium">@{user.username}</p>
            <div className="flex items-center gap-2 mt-1.5">
              <span
                className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full"
                style={{ background: `${accent}18`, color: accent, border: `1px solid ${accent}33` }}
              >
                Official
              </span>
              <span className="text-[10px] text-white/30 font-semibold">{clipCount} upload{clipCount !== 1 ? "s" : ""}</span>
            </div>
          </div>
        </div>

        {/* ── RIGHT: Games + Latest Reel ── */}
        <div className="flex-1 flex flex-col gap-3 min-w-0">
          {/* Games played */}
          <div className="flex items-start gap-2">
            <Gamepad2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: accent }} />
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/30 mb-1.5">What they play</p>
              <div className="flex flex-wrap gap-1.5">
                {gamesPlayed.map((game) => (
                  <span
                    key={game.id}
                    className="text-[11px] font-semibold px-2.5 py-1 rounded-md"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)" }}
                  >
                    {game.name}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Latest reel */}
          {latestClip && (
            <div className="flex items-start gap-2">
              <Play className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: accent }} />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/30 mb-1.5">Latest Reel</p>
                <Link href={`/clip/${latestClip.id}`}>
                  <div
                    className="flex items-center gap-3 rounded-xl overflow-hidden cursor-pointer group"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                    onMouseEnter={() => setClipHover(true)}
                    onMouseLeave={() => setClipHover(false)}
                  >
                    {/* Thumbnail */}
                    <div className="relative w-24 h-14 flex-shrink-0 overflow-hidden">
                      {latestClip.thumbnailUrl ? (
                        <img src={latestClip.thumbnailUrl} alt={latestClip.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.05)" }}>
                          <Play className="w-5 h-5 text-white/30" />
                        </div>
                      )}
                      {/* Play overlay */}
                      <div
                        className="absolute inset-0 flex items-center justify-center transition-opacity duration-200"
                        style={{ background: "rgba(0,0,0,0.4)", opacity: clipHover ? 1 : 0 }}
                      >
                        <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: accent }}>
                          <Play className="w-3.5 h-3.5 text-[#0B1319] fill-current" />
                        </div>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 pr-3 py-1">
                      <p className="text-white text-xs font-bold truncate group-hover:underline">{latestClip.title}</p>
                      <p className="text-white/30 text-[10px] font-medium">{latestClip.views.toLocaleString()} views</p>
                    </div>

                    <ChevronRight className="w-3.5 h-3.5 text-white/20 mr-2 flex-shrink-0 group-hover:text-white/50 transition-colors" />
                  </div>
                </Link>
              </div>
            </div>
          )}

          {/* If no clips yet, show a CTA */}
          {!latestClip && (
            <div className="flex items-start gap-2">
              <Circle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: accent }} />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/30 mb-1">Latest Reel</p>
                <p className="text-xs text-white/40 italic">No content yet — check back soon!</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
