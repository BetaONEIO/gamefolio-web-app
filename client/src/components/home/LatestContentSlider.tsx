import { useState, useCallback, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { ClipWithUser } from "@shared/schema";
import { Play, ChevronLeft, ChevronRight, Pause, Volume2, VolumeX, Upload, ImageIcon, Film, Video, Maximize2, Sword, Info, X } from "lucide-react";
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
  const [showInfo, setShowInfo] = useState(false);
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
    queryKey: ["/api/clips/reels/trending", "slider"],
    queryFn: async () => {
      const r = await fetch("/api/clips/reels/trending?limit=10&period=ever", { credentials: "include" });
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
    if (e.deltaY <= 0) return;
    scrollCooldown.current = true;
    setTimeout(() => { scrollCooldown.current = false; }, 600);
    goNext();
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
      </div>

      {/* Main layout */}
      <div className="flex gap-4 flex-1 min-h-0">

        {/* VIDEO PLAYER */}
        <div className="flex-1 min-w-0 flex flex-col">
          <div
            ref={containerRef}
            className="relative rounded-2xl overflow-hidden flex-1 min-h-0 cursor-pointer group"
            style={{ background: "#000" }}
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
              {/* Info button */}
              {(gameImage || gameName) && (
                <button
                  onClick={(e) => { e.stopPropagation(); setShowInfo(v => !v); }}
                  className="w-7 h-7 rounded-full flex items-center justify-center transition-all"
                  style={{ background: showInfo ? NEON : "rgba(0,0,0,0.70)" }}
                  aria-label="Game info"
                >
                  <Info className="w-3 h-3" style={{ color: showInfo ? "#071013" : "white" }} />
                </button>
              )}
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

            {/* Game info overlay */}
            {showInfo && (gameImage || gameName) && (
              <div className="absolute inset-0 z-50 flex items-end justify-end pointer-events-none">
                <div className="absolute inset-0 pointer-events-auto" onClick={(e) => { e.stopPropagation(); setShowInfo(false); }} />
                <div
                  className="relative pointer-events-auto m-3 rounded-xl overflow-hidden flex flex-col"
                  style={{
                    width: "clamp(148px, 42%, 210px)",
                    background: "rgba(7,16,19,0.92)",
                    backdropFilter: "blur(14px)",
                    border: "1px solid rgba(255,255,255,0.10)",
                    animation: "gFadeIn 0.18s ease",
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Game artwork */}
                  <div className="relative flex-shrink-0 overflow-hidden" style={{ height: 88 }}>
                    {gameImage ? (
                      <img src={gameImage} alt={gameName} className="absolute inset-0 w-full h-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center" style={{ background: "#0A1117" }}>
                        <span className="text-white/20 text-2xl font-black">{gameName?.[0] ?? "?"}</span>
                      </div>
                    )}
                    <div className="absolute bottom-0 inset-x-0 px-2 py-1.5" style={{ background: "linear-gradient(to top,rgba(0,0,0,0.82) 0%,transparent 100%)" }}>
                      {gameName && <p className="text-[10px] font-black uppercase tracking-wide text-white line-clamp-1">{gameName}</p>}
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowInfo(false); }}
                      className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-black/60 hover:bg-black/85 flex items-center justify-center transition-colors"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-0 px-3 py-2.5">
                    {[
                      { icon: Film,      label: "CLIPS",  value: contentCounts?.clips },
                      { icon: Video,     label: "REELS",  value: contentCounts?.reels },
                      { icon: ImageIcon, label: "SHOTS",  value: contentCounts?.screenshots },
                    ].map(({ icon: Icon, label, value }) => (
                      <div key={label} className="flex flex-col items-center gap-0.5">
                        <Icon className="w-3 h-3" style={{ color: NEON }} />
                        <span className="text-sm font-black leading-tight text-white">{fmt(value)}</span>
                        <span className="text-[7px] font-bold tracking-wider" style={{ color: "rgba(255,255,255,0.35)" }}>{label}</span>
                      </div>
                    ))}
                  </div>
                  {/* Actions */}
                  <div className="px-3 pb-3 flex flex-col gap-1.5">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleBounties(); }}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-black transition-all hover:opacity-90 active:scale-95"
                      style={{ background: "#071013", color: NEON, border: `1px solid ${NEON}40` }}>
                      <Sword className="w-3.5 h-3.5" />
                      Bounties
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleUpload(); }}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-black transition-all hover:opacity-90 active:scale-95"
                      style={{ background: NEON, color: "#071013" }}>
                      <Upload className="w-3 h-3" />
                      Upload
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Scroll hint */}
            <div className="absolute top-3 right-3 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg"
                style={{ background: "rgba(0,0,0,0.55)" }}>
                <span className="text-[8px] text-white/40 font-bold">scroll</span>
                <ChevronRight className="w-3 h-3 text-white/50" />
              </div>
            </div>

            {/* Nav arrows — bottom centre */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); goPrev(); }}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-opacity hover:opacity-100 opacity-70"
                style={{ background: "rgba(0,0,0,0.70)", backdropFilter: "blur(4px)" }}>
                <ChevronLeft className="w-4 h-4 text-white" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); goNext(); }}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-opacity hover:opacity-100 opacity-70"
                style={{ background: "rgba(0,0,0,0.70)", backdropFilter: "blur(4px)" }}>
                <ChevronRight className="w-4 h-4 text-white" />
              </button>
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
            <div className="flex items-center gap-1 flex-shrink-0 pt-1" />
          </div>
        </div>


      </div>

      <style>{`
        @keyframes gFadeIn {
          from { opacity: 0; transform: scale(0.97); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
