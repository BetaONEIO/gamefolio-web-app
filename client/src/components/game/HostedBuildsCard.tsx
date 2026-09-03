import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { Download, Play, Loader2, X, Monitor, Apple, Terminal } from "lucide-react";
import { formatBytes, PLATFORM_LABELS, type BuildPlatform, type BuildType } from "@shared/game-builds";

interface PublicBuild {
  id: number;
  buildType: BuildType;
  platform: BuildPlatform | null;
  channel: "demo" | "full";
  label: string;
  sizeBytes: number;
  storedBytes: number | null;
  downloadCount: number;
}

const PLATFORM_ICONS: Record<BuildPlatform, any> = {
  windows: Monitor,
  mac: Apple,
  linux: Terminal,
};

/**
 * "Play on Gamefolio" / "Download" for builds a developer hosts here.
 *
 * Renders nothing when a game has no approved builds, so it can be dropped into
 * the page unconditionally — the overwhelming majority of catalogue games link
 * out to Steam or itch and will never have one.
 */
export default function HostedBuildsCard({
  profileId,
  cardBg,
  cardBorder,
}: {
  profileId: number | null | undefined;
  cardBg: string;
  cardBorder: string;
}) {
  const { toast } = useToast();
  const [playing, setPlaying] = useState<{ id: number; url: string; label: string } | null>(null);
  const [pendingId, setPendingId] = useState<number | null>(null);

  const { data } = useQuery<{ builds: PublicBuild[] }>({
    queryKey: [`/api/game-builds/game/${profileId}`],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!profileId,
  });

  const builds = data?.builds ?? [];
  if (!profileId || builds.length === 0) return null;

  const webBuilds = builds.filter((b) => b.buildType === "web");
  const downloadBuilds = builds.filter((b) => b.buildType === "download");

  const play = async (build: PublicBuild) => {
    setPendingId(build.id);
    try {
      const res = await apiRequest("GET", `/api/game-builds/${build.id}/play`);
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message ?? "Could not open the build");
      const { url } = await res.json();
      setPlaying({ id: build.id, url, label: build.label });
    } catch (error: any) {
      toast({ title: "Could not start the game", description: error.message, variant: "destructive" });
    } finally {
      setPendingId(null);
    }
  };

  const download = async (build: PublicBuild) => {
    setPendingId(build.id);
    try {
      const res = await apiRequest("POST", `/api/game-builds/${build.id}/download`);
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message ?? "Could not start the download");
      const { url } = await res.json();
      window.location.href = url;
    } catch (error: any) {
      toast({ title: "Download failed", description: error.message, variant: "destructive" });
    } finally {
      setPendingId(null);
    }
  };

  return (
    <>
      <div className="rounded-2xl p-5 space-y-3" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
        <h3 className="text-[9px] uppercase tracking-widest font-bold text-white/40 mb-1">
          Play on Gamefolio
        </h3>

        {webBuilds.map((build) => (
          <button key={build.id} onClick={() => play(build)} disabled={pendingId === build.id}
            className="w-full flex items-center justify-between p-3 rounded-xl transition-colors group disabled:opacity-50"
            style={{ background: "rgba(183,255,24,0.10)", border: "1px solid rgba(183,255,24,0.35)" }}>
            <div className="flex items-center gap-3">
              {pendingId === build.id
                ? <Loader2 className="w-5 h-5 text-[#B7FF18] animate-spin" />
                : <Play className="w-5 h-5 text-[#B7FF18]" />}
              <div className="text-left">
                <div className="font-bold text-sm text-white">Play in browser</div>
                <div className="text-[11px] text-white/50">
                  {build.label}{build.channel === "demo" ? " · Demo" : ""}
                </div>
              </div>
            </div>
          </button>
        ))}

        {downloadBuilds.map((build) => {
          const Icon = build.platform ? PLATFORM_ICONS[build.platform] : Download;
          return (
            <button key={build.id} onClick={() => download(build)} disabled={pendingId === build.id}
              className="w-full flex items-center justify-between p-3 rounded-xl transition-colors group disabled:opacity-50"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="flex items-center gap-3">
                {pendingId === build.id
                  ? <Loader2 className="w-5 h-5 text-white/60 animate-spin" />
                  : <Icon className="w-5 h-5 text-white/60" />}
                <div className="text-left">
                  <div className="font-bold text-sm text-white">
                    {build.platform ? PLATFORM_LABELS[build.platform] : "Download"}
                    {build.channel === "demo" ? " demo" : ""}
                  </div>
                  <div className="text-[11px] text-white/50">
                    {build.label} · {formatBytes(build.storedBytes ?? build.sizeBytes)}
                  </div>
                </div>
              </div>
              <Download className="w-4 h-4 text-white/20 group-hover:text-white/60 transition-colors" />
            </button>
          );
        })}
      </div>

      {/*
        The build runs in an iframe pointed at the R2 public origin, never at
        this app's origin. That cross-origin boundary is the whole security
        model for running a stranger's JavaScript: `allow-same-origin` here
        grants the frame same-origin access to R2 (which Unity/Godot WebGL
        exports need for IndexedDB caching), NOT to Gamefolio's session,
        cookies or localStorage. Serving builds from our own domain would
        collapse that distinction.
      */}
      {playing && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-black">
          <div className="flex items-center justify-between px-4 py-2.5" style={{ background: cardBg }}>
            <span className="text-xs font-bold text-white truncate">{playing.label}</span>
            <button onClick={() => setPlaying(null)} aria-label="Close game"
              className="rounded-lg p-1.5 transition-colors hover:bg-white/10">
              <X className="w-4 h-4 text-white/70" />
            </button>
          </div>
          <iframe
            src={playing.url}
            title={playing.label}
            className="flex-1 w-full border-0"
            allow="autoplay; fullscreen; gamepad; xr-spatial-tracking"
            sandbox="allow-scripts allow-same-origin allow-pointer-lock allow-popups allow-downloads"
          />
        </div>
      )}
    </>
  );
}
