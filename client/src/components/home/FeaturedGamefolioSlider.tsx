import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Gamepad2, Video, Users, Star, Trophy, Zap, ExternalLink } from "lucide-react";

interface FeaturedData {
  user: {
    id: number;
    username: string;
    displayName: string | null;
    bio: string | null;
    avatarUrl: string | null;
    bannerUrl: string | null;
    accentColor: string | null;
    primaryColor: string | null;
    backgroundColor: string | null;
    avatarBorderColor: string | null;
    level: number | null;
    userType: string | null;
  };
  gamesPlayed: { id: number; name: string }[];
  latestClip: { id: number; thumbnailUrl: string | null } | null;
  clipCount: number;
}

function ProfileMiniCard({ data }: { data: FeaturedData }) {
  const { user, gamesPlayed, clipCount } = data;
  const accent = user.accentColor || "#C1FF00";
  const bg = user.backgroundColor || "#0B1218";
  const primary = user.primaryColor || "#02172C";
  const avatarBorder = user.avatarBorderColor || accent;
  const types = (user.userType || "").split(",").map(t => t.trim()).filter(Boolean);

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden select-none"
      style={{ background: `linear-gradient(160deg, ${primary} 0%, ${bg} 100%)`, border: `1.5px solid ${accent}33` }}>

      {/* Banner */}
      {user.bannerUrl && (
        <div className="absolute inset-x-0 top-0 h-20 sm:h-24 overflow-hidden">
          <img src={user.bannerUrl} alt="banner" className="w-full h-full object-cover opacity-60" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 40%, " + bg + ")" }} />
        </div>
      )}

      <div className="relative pt-8 sm:pt-10 px-4 pb-4">
        {/* Avatar */}
        <div className="relative inline-block mb-2">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden"
            style={{ border: `2.5px solid ${avatarBorder}`, boxShadow: `0 0 12px ${avatarBorder}55` }}>
            {user.avatarUrl
              ? <img src={user.avatarUrl} alt={user.username} className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-xl font-black"
                  style={{ background: accent, color: bg }}>{user.username[0].toUpperCase()}</div>
            }
          </div>
          {/* Level badge */}
          {user.level && (
            <div className="absolute -bottom-1 -right-1 text-[9px] font-black px-1.5 py-0.5 rounded-full"
              style={{ background: accent, color: bg, boxShadow: `0 2px 6px ${accent}66` }}>
              LVL {user.level}
            </div>
          )}
        </div>

        {/* Name */}
        <div className="mb-1.5">
          <div className="font-black text-white text-sm tracking-tight leading-none">
            {user.displayName || user.username}
          </div>
          <div className="text-[11px] mt-0.5" style={{ color: accent }}>@{user.username}</div>
        </div>

        {/* User types */}
        {types.length > 0 && (
          <div className="flex gap-1.5 flex-wrap mb-3">
            {types.map(t => (
              <span key={t} className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border"
                style={{ borderColor: accent + "44", color: accent, background: accent + "12" }}>
                {t}
              </span>
            ))}
          </div>
        )}

        {/* Divider */}
        <div className="h-px mb-3" style={{ background: `${accent}22` }} />

        {/* Games */}
        {gamesPlayed.length > 0 && (
          <div className="mb-3">
            <div className="text-[9px] font-bold uppercase text-gray-500 mb-1.5 tracking-wider">Playing</div>
            <div className="flex flex-wrap gap-1">
              {gamesPlayed.slice(0, 3).map(g => (
                <span key={g.id} className="text-[9px] font-medium px-1.5 py-0.5 rounded"
                  style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.7)" }}>
                  {g.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            { label: "Uploads", val: clipCount },
            { label: "Level", val: user.level ?? 1 },
            { label: "Games", val: gamesPlayed.length },
          ].map(({ label, val }) => (
            <div key={label} className="rounded-lg py-1.5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="font-black text-white text-sm leading-none">{val}</div>
              <div className="text-[8px] text-gray-500 uppercase tracking-wider mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function FeaturedGamefolioSlider() {
  const { data, isLoading } = useQuery<FeaturedData>({
    queryKey: ["/api/featured/gamefolio"],
    queryFn: async () => {
      const r = await fetch("/api/featured/gamefolio");
      if (!r.ok) throw new Error("Failed to fetch");
      return r.json();
    },
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="rounded-3xl overflow-hidden" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="p-4 sm:p-6 md:p-8 grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
          <Skeleton className="h-[280px] rounded-2xl" />
          <div className="space-y-3">
            <Skeleton className="h-4 w-28 rounded" />
            <Skeleton className="h-8 w-48 rounded" />
            <Skeleton className="h-4 w-36 rounded" />
            <div className="space-y-2 pt-2">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-5 w-56 rounded" />)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { user, gamesPlayed, clipCount } = data;
  const accent = user.accentColor || "#C1FF00";
  const types = (user.userType || "").split(",").map(t => t.trim()).filter(Boolean);
  const isStreamer = types.some(t => t.toLowerCase() === "streamer");

  const bullets: { icon: typeof Gamepad2; text: string }[] = [
    ...(gamesPlayed.length > 0
      ? [{ icon: Gamepad2, text: `Plays ${gamesPlayed.slice(0, 3).map(g => g.name).join(", ")}` }]
      : []),
    ...(isStreamer ? [{ icon: Video, text: "Streamer & content creator" }] : []),
    { icon: Zap, text: "Uploads gaming content regularly" },
    { icon: Trophy, text: `Level ${user.level ?? 1} Gamefolio member` },
    { icon: Star, text: "Official Gamefolio account" },
  ];

  return (
    <div className="relative rounded-3xl overflow-hidden"
      style={{
        background: "linear-gradient(135deg, rgba(193,255,0,0.04) 0%, rgba(10,15,28,0.8) 50%, rgba(2,23,44,0.9) 100%)",
        border: "1px solid rgba(193,255,0,0.12)",
        boxShadow: "0 0 60px rgba(193,255,0,0.04), inset 0 1px 0 rgba(255,255,255,0.04)",
      }}>

      {/* Subtle grid pattern overlay */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{ backgroundImage: "linear-gradient(rgba(193,255,0,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(193,255,0,0.5) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />

      {/* Glow orb top-right */}
      <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(193,255,0,0.08) 0%, transparent 70%)" }} />

      <div className="relative p-4 sm:p-6 md:p-8">
        {/* Header label */}
        <div className="flex items-center gap-2 mb-4 sm:mb-6">
          <div className="h-px flex-1" style={{ background: "linear-gradient(to right, rgba(193,255,0,0.3), transparent)" }} />
          <span className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400">Featured</span>
          <div className="h-px flex-1" style={{ background: "linear-gradient(to left, rgba(193,255,0,0.3), transparent)" }} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-8 items-center">
          {/* Left: profile card */}
          <div className="h-[260px] sm:h-[300px]">
            <ProfileMiniCard data={data} />
          </div>

          {/* Right: info panel */}
          <div className="space-y-4">
            <div>
              <div className="font-black text-2xl sm:text-3xl text-white leading-none tracking-tight">
                @{user.username}
              </div>
              {user.bio && user.bio !== "Just joined Gamefolio!" && (
                <div className="text-sm text-gray-400 mt-1 italic">{user.bio}</div>
              )}
              <div className="flex gap-2 mt-2 flex-wrap">
                {types.map(t => (
                  <span key={t} className="text-xs font-bold uppercase px-2.5 py-1 rounded-full"
                    style={{ background: `${accent}18`, color: accent, border: `1px solid ${accent}33` }}>
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {/* Bullets */}
            <div className="space-y-2.5">
              {bullets.map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: `${accent}18`, border: `1px solid ${accent}22` }}>
                    <Icon className="w-3.5 h-3.5" style={{ color: accent }} />
                  </div>
                  <span className="text-sm text-gray-200 font-medium leading-tight">{text}</span>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="pt-1">
              <Link href={`/profile/${user.username}`}
                className="inline-flex items-center gap-2 text-sm font-black px-5 py-2.5 rounded-xl transition-all hover:opacity-90 active:scale-95"
                style={{ background: accent, color: "#0a0f1c", boxShadow: `0 4px 20px ${accent}40` }}>
                View Profile
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
