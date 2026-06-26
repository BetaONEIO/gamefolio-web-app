import { useState, useCallback, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { ClipWithUser } from "@shared/schema";
import { Play, ChevronLeft, ChevronRight, Pause, Volume2, VolumeX, Upload, ImageIcon, Film, Video, Maximize2, Sword } from "lucide-react";
import { ZapIconSvg } from "@/components/ui/ZapReactionIcon";
import { Link, useLocation } from "wouter";

const NEON = "#B7FF1A";

interface ContentCounts { clips: number; reels: number; screenshots: number; }

function fmt(n: number | undefined): string {
  if (n === undefined || n === null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

export default function LatestContentSlider() {
  const [mode, setMode] = useState<"clips" | "reels">("clips");
  const [activeIndex, setActiveIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const scrollCooldown = useRef(false);
  const [, navigate] = useLocation();

  const { data: clipsData, isLoading: clipsLoading } = useQuery<ClipWithUser[]>({
    queryKey: ["/api/clips/trending", "slider"],
    queryFn: async () => {
      const r = await fetch("/api/clips/trending?limit=10&period=week", { credentials: "include" });
      if (!r.ok) throw new Error("Failed");
      const data = await r.json();
      return Array.isArray(data) ? data.filter((c: ClipWithUser) => c.videoType !== "reel") : [];
    },
    staleTime: 120_000,
  });

  const { data: reelsData, isLoading: reelsLoading } = useQuery<ClipWithUser[]>({
    queryKey: ["/api/reels/trending", "slider"],
    queryFn: async () => {
      const r = await fetch("/api/reels/trending?limit=10&period=week", { credentials: "include" });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    staleTime: 120_000,
  });

  const items = mode === "clips"
    ? (Array.isArray(clipsData) ? clipsData.slice(0, 10) : [])
    : (Array.isArray(reelsData) ? reelsData.slice(0, 10) : []);

  const isLoading = mode === "clips" ? clipsLoading : reelsLoading;
  const current = items.length > 0 ? items[activeIndex] : null;
  const gameId = current?.gameId ?? current?.game?.id ?? null;

  const { data: contentCounts } = useQuery<ContentCounts>({
    queryKey: ["/api/games", gameId, "content-counts"],
    queryFn: async () => {
      const r = await fetch(`/api/games/${gameId}/content-counts`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    enabled: !!gameId,
    staleTime: 60_000,
  });

  const stopVideo = useCallback(() => {
    if (videoRef.current) { videoRef.current.pause(); videoRef.current.src = ""; }
    setPlaying(false);
  }, []);

  const nav = useCallback((dir: 1 | -1) => {
    stopVideo();
    setActiveIndex(i => (i + dir + items.length) % items.length);
  }, [items.length, stopVideo]);

  const goTo = useCallback((i: number) => { stopVideo(); setActiveIndex(i); }, [stopVideo]);
  const goPrev = useCallback(() => nav(-1), [nav]);
  const goNext = useCallback(() => nav(1), [nav]);

  useEffect(() => { stopVideo(); setActiveIndex(0); }, [mode]);

  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) diff > 0 ? goNext() : goPrev();
    touchStartX.current = null;
  };

  const handleVideoWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (scrollCooldown.current) return;
    scrollCooldown.current = true;
    setTimeout(() => { scrollCooldown.current = false; }, 600);
    if (e.deltaY > 0) goNext(); else goPrev();
  };

  useEffect(() => {
    if (!current?.videoUrl) return;
    const outer = setTimeout(() => {
      setPlaying(true);
      const inner = setTimeout(() => {
        if (videoRef.current) { videoRef.current.muted = true; videoRef.current.play().catch(() => {}); }
      }, 50);
      return () => clearTimeout(inner);
    }, 150);
    return () => clearTimeout(outer);
  }, [current?.id]);

  const handlePlayClick = () => {
    if (!playing) {
      setPlaying(true);
      setTimeout(() => {
        if (videoRef.current) { videoRef.current.muted = muted; videoRef.current.play().catch(() => {}); }
      }, 50);
    } else {
      if (videoRef.current?.paused) videoRef.current.play().catch(() => {});
      else videoRef.current?.pause();
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !muted;
    setMuted(next);
    if (videoRef.current) videoRef.current.muted = next;
  };

  const handleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else el.requestFullscreen().catch(() => {});
  };

  const handleUpload = () => {
    if (!current) return;
    const gImg = current.game?.imageUrl || current.gameImageUrl || "";
    const gName = current.game?.name || current.gameName || "";
    const gId = current.gameId?.toString() || current.game?.id?.toString() || "";
    if (gId) sessionStorage.setItem("uploadGameId", gId);
    if (gName) sessionStorage.setItem("uploadGameName", gName);
    if (gImg) sessionStorage.setItem("uploadGameImage", gImg);
    navigate("/upload");
  };

  const handleBounties = () => {
    if (!current) return;
    const gName = current.game?.name || current.gameName || "";
    if (gName) {
      const slug = gName.toLowerCase().replace(/[^a-z0-9]/g, "");
      navigate(`/games/${slug}`);
    } else {
      navigate("/explore");
    }
  };

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="flex gap-4 w-full">
          <div className="flex-1 h-full rounded-2xl bg-white/5 animate-pulse" style={{ minHeight: 200 }} />
          <div className="w-32 rounded-2xl bg-white/5 animate-pulse" style={{ minHeight: 200 }} />
        </div>
      </div>
    );
  }

  if (!current || items.length === 0) return null;

  const gameImage = current.game?.imageUrl || current.gameImageUrl || null;
  const gameName = current.game?.name || current.gameName || "";
  const avatarUrl = current.user?.avatarUrl || null;
  const username = current.user?.username || "";

  return (
    <div className="w-full h-full flex flex-col" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>

      {/* Header */}
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <ZapIconSvg active={true} size={16} />
          <span className="text-base font-black text-white">Trending</span>
          <div className="flex items-center gap-0.5 p-0.5 rounded-full ml-1"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <button onClick={() => setMode("clips")}
              className="px-3 py-1 rounded-full text-[11px] font-black transition-all"
              style={mode === "clips" ? { background: NEON, color: "#071013" } : { color: "rgba(255,255,255,0.5)" }}>
              Clips
            </button>
            <button onClick={() => setMode("reels")}
              className="px-3 py-1 rounded-full text-[11px] font-black transition-all"
              style={mode === "reels" ? { background: NEON, color: "#071013" } : { color: "rgba(255,255,255,0.5)" }}>
              Reels
            </button>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={goPrev} className="w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <ChevronLeft className="w-3.5 h-3.5 text-white" />
          </button>
          <button onClick={goNext} className="w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <ChevronRight className="w-3.5 h-3.5 text-white" />
          </button>
        </div>
      </div>

      {/* Main layout */}
      <div className="flex gap-4 flex-1 min-h-0">

        {/* VIDEO PLAYER */}
        <div className="flex-1 min-w-0 flex flex-col">
          <div
            ref={containerRef}
            className="relative rounded-2xl overflow-hidden flex-1 min-h-0 cursor-pointer group"
            style={{ background: "#0B1218" }}
            onClick={handlePlayClick}
            onWheel={handleVideoWheel}
          >
            {/* Blurred bg */}
            {current.thumbnailUrl && !playing && (
              <img src={current.thumbnailUrl} alt="" className="absolute inset-0 w-full h-full object-cover"
                style={{ filter: "blur(18px)", opacity: 0.2, transform: "scale(1.08)" }} />
            )}

            {/* Thumbnail */}
            {!playing && (
              <img src={current.thumbnailUrl || `/api/clips/${current.id}/thumbnail`}
                alt={current.title}
                className="absolute inset-0 w-full h-full object-contain z-10" />
            )}

            {/* Video */}
            {playing && current.videoUrl && (
              <video ref={videoRef} src={current.videoUrl}
                className="absolute inset-0 w-full h-full z-10"
                style={{ objectFit: "contain", background: "#000" }}
                autoPlay muted={muted} playsInline loop
                onEnded={() => setPlaying(false)} />
            )}

            {/* Play overlay */}
            {!playing && (
              <div className="absolute inset-0 z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/20">
                <div className="w-16 h-16 rounded-full flex items-center justify-center shadow-xl"
                  style={{ background: "rgba(183,255,26,0.95)" }}>
                  <Play className="w-8 h-8 text-[#071013] fill-[#071013] ml-0.5" />
                </div>
              </div>
            )}

            {/* Pause overlay */}
            {playing && (
              <div className="absolute inset-0 z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center bg-black/20">
                <div className="w-14 h-14 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(0,0,0,0.6)" }}>
                  <Pause className="w-7 h-7 text-white fill-white" />
                </div>
              </div>
            )}

            {/* Avatar watermark — bigger, bottom-left */}
            {avatarUrl && (
              <Link
                href={`/profile/${username}`}
                onClick={e => e.stopPropagation()}
                className="absolute bottom-3 left-3 z-40 flex items-center gap-2 rounded-full px-2 py-1.5 transition-opacity hover:opacity-100"
                style={{ background: "rgba(0,0,0,0.55)", opacity: 0.65, backdropFilter: "blur(6px)" }}
              >
                <img src={avatarUrl} alt={username}
                  className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                  style={{ border: `1.5px solid ${NEON}70` }} />
                <span className="text-xs font-black leading-none pr-1" style={{ color: NEON }}>@{username}</span>
              </Link>
            )}

            {/* Bottom-right controls */}
            <div className="absolute bottom-3 right-3 z-40 flex items-center gap-1.5">
              {playing && (
                <button onClick={toggleMute}
                  className="w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(0,0,0,0.7)" }}>
                  {muted ? <VolumeX className="w-3 h-3 text-white" /> : <Volume2 className="w-3 h-3 text-white" />}
                </button>
              )}
              {!playing && (
                <div className="px-2 py-0.5 rounded text-[10px] font-black text-white"
                  style={{ background: "rgba(0,0,0,0.75)" }}>
                  {formatDuration(current.duration || 0)}
                </div>
              )}
              <button onClick={handleFullscreen}
                className="w-7 h-7 rounded-full flex items-center justify-center"
                style={{ background: "rgba(0,0,0,0.7)" }}>
                <Maximize2 className="w-3 h-3 text-white" />
              </button>
            </div>

            {/* Scroll hint */}
            <div className="absolute top-3 right-3 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
              <div className="flex flex-col gap-0.5 items-center px-2 py-1 rounded-lg"
                style={{ background: "rgba(0,0,0,0.55)" }}>
                <ChevronLeft className="w-3 h-3 text-white/50 -rotate-90" />
                <span className="text-[8px] text-white/40 font-bold">scroll</span>
                <ChevronLeft className="w-3 h-3 text-white/50 rotate-90" />
              </div>
            </div>
          </div>

          {/* Info + dots */}
          <div className="mt-2.5 flex items-start justify-between gap-2 flex-shrink-0">
            <div className="min-w-0">
              <h3 className="text-sm font-black text-white leading-tight truncate">{current.title}</h3>
              <Link href={`/profile/${username}`}
                className="text-xs font-bold transition-opacity hover:opacity-80"
                style={{ color: NEON }}
                onClick={e => e.stopPropagation()}>
                @{username}
              </Link>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0 pt-1">
              {items.slice(0, 8).map((_, i) => (
                <button key={i} onClick={() => goTo(i)} className="rounded-full transition-all duration-300"
                  style={{ width: i === activeIndex ? 16 : 5, height: 5, background: i === activeIndex ? NEON : "rgba(255,255,255,0.2)" }} />
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div
          key={`panel-${activeIndex}-${mode}`}
          className="flex-shrink-0 flex flex-col gap-2.5"
          style={{ width: "22%", animation: "gFadeIn 0.35s ease-out" }}
        >
          {/* — GAME — divider */}
          <div className="w-full flex items-center gap-1.5">
            <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.12)" }} />
            <span className="text-[9px] font-black tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.35)" }}>Game</span>
            <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.12)" }} />
          </div>

          {/* Game thumbnail — 4:3 */}
          <div className="w-full rounded-xl overflow-hidden flex-shrink-0"
            style={{ aspectRatio: "4/3", boxShadow: "0 6px 24px rgba(0,0,0,0.5)" }}>
            {gameImage ? (
              <img src={gameImage} alt={gameName} className="w-full h-full object-contain" />
            ) : (
              <div className="w-full h-full bg-white/10 flex items-center justify-center">
                <span className="text-white/20 text-2xl font-black">{gameName?.[0] ?? "?"}</span>
              </div>
            )}
          </div>

          {/* Game name */}
          {gameName && (
            <span className="text-[10px] font-black text-white/60 text-center leading-tight line-clamp-1 w-full">{gameName}</span>
          )}

          {/* Content stats — styled like CreatorCard stats box */}
          <div className="w-full grid grid-cols-3 rounded-xl py-2 flex-shrink-0"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
            {[
              { icon: Film,      label: "CLIPS",  value: contentCounts?.clips },
              { icon: Video,     label: "REELS",  value: contentCounts?.reels },
              { icon: ImageIcon, label: "SHOTS",  value: contentCounts?.screenshots },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex flex-col items-center gap-0.5 px-1">
                <Icon className="w-3 h-3" style={{ color: NEON }} />
                <span className="text-sm font-black leading-tight text-white">{fmt(value)}</span>
                <span className="text-[7px] font-bold tracking-wider" style={{ color: "rgba(255,255,255,0.35)" }}>{label}</span>
              </div>
            ))}
          </div>

          {/* Bounties button — animated neon glow */}
          <button
            onClick={handleBounties}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-black bounty-glow-btn"
            style={{ background: NEON, color: "#071013" }}>
            <Sword className="w-3.5 h-3.5" />
            Bounties
          </button>

          {/* Upload button */}
          <button
            onClick={handleUpload}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-[10px] font-black transition-all hover:opacity-90 active:scale-95"
            style={{ background: NEON, color: "#071013" }}>
            <Upload className="w-3 h-3" />
            Upload Content
          </button>
        </div>

      </div>

      <style>{`
        @keyframes gFadeIn {
          from { opacity: 0; transform: scale(0.97); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes bountyPulse {
          0%, 100% { box-shadow: 0 0 8px 2px rgba(183,255,26,0.5), 0 0 20px 4px rgba(183,255,26,0.25); }
          50%       { box-shadow: 0 0 16px 4px rgba(183,255,26,0.8), 0 0 40px 10px rgba(183,255,26,0.4); }
        }
        .bounty-glow-btn {
          animation: bountyPulse 2s ease-in-out infinite;
          transition: opacity 0.15s, transform 0.1s;
        }
        .bounty-glow-btn:hover { opacity: 0.92; }
        .bounty-glow-btn:active { transform: scale(0.95); }
      `}</style>
    </div>
  );
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
