import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Award,
  Camera,
  CheckCircle2,
  Eye,
  Globe,
  Loader2,
  MessageCircle,
  Play,
  Radio,
  Terminal,
  Upload,
  UserPlus,
  Users,
  Video,
} from "lucide-react";
import { SiEpicgames, SiSteam } from "react-icons/si";
import { FaPlaystation, FaWindows, FaXbox } from "react-icons/fa";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import VideoClipGridItem from "@/components/clips/VideoClipGridItem";
import type { ClipWithUser, Game } from "@shared/schema";

const UploadPage = lazy(() => import("./UploadPage"));

type TabId = "overview" | "clips" | "reels" | "screenshots" | "streamers";

const TABS: Array<{ id: TabId; label: string; icon: typeof Play }> = [
  { id: "overview", label: "OVERVIEW", icon: Terminal },
  { id: "clips", label: "CLIPS", icon: Play },
  { id: "reels", label: "REELS", icon: Video },
  { id: "screenshots", label: "SCREENSHOTS", icon: Camera },
  { id: "streamers", label: "STREAMERS", icon: Radio },
];

const ACCENT = "#B7FF18";
const PAGE_BG = "#0B1319";
const CARD_STYLE = {
  background: "rgba(255, 255, 255, 0.04)",
  border: "1px solid rgba(183, 255, 24, 0.15)",
  borderRadius: "12px",
  boxShadow: "0 4px 30px rgba(0, 0, 0, 0.1)",
  backdropFilter: "blur(10px)",
} as const;

function arrayValue(value: unknown, fallback: string[] = []) {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  if (typeof value !== "string" || !value.trim()) return fallback;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [value];
  } catch {
    return value.split(",").map((item) => item.trim()).filter(Boolean);
  }
}

function formatCount(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}K`;
  return value.toLocaleString();
}

function EmptyState({ icon: Icon, title, description }: { icon: typeof Camera; title: string; description: string }) {
  return (
    <div className="py-20 text-center rounded-xl border border-dashed border-white/10 bg-white/[0.02]">
      <Icon className="mx-auto mb-4 h-9 w-9 text-white/25" />
      <h3 className="text-lg font-bold text-white">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-white/45">{description}</p>
    </div>
  );
}

function DesignedIndieGamePage() {
  const [, params] = useRoute("/games/:gameSlug");
  const [, legacyParams] = useRoute("/indie-games/:slug");
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const gameSlug = params?.gameSlug ?? legacyParams?.slug;
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [uploadOpen, setUploadOpen] = useState(false);

  const { data: game, isLoading: gameLoading } = useQuery<Game & { indieMeta?: any }>({
    queryKey: ["/api/games/slug", gameSlug],
    queryFn: async () => {
      const response = await fetch(`/api/games/slug/${encodeURIComponent(gameSlug || "")}`, { credentials: "include" });
      if (!response.ok) throw new Error("Game not found");
      return response.json();
    },
    enabled: !!gameSlug,
    retry: false,
  });

  const { data: indieProfileData, isLoading: profileLoading } = useQuery<{ profile: any; user: any } | null>({
    queryKey: ["/api/games", game?.id, "indie-profile"],
    queryFn: async () => {
      const response = await fetch(`/api/games/${game?.id}/indie-profile`, { credentials: "include" });
      if (response.status === 404) return null;
      if (!response.ok) throw new Error("Unable to load game profile");
      return response.json();
    },
    enabled: !!game?.id,
  });

  const { data: clips = [], isLoading: clipsLoading } = useQuery<ClipWithUser[]>({
    queryKey: ["/api/games", game?.id, "clips"],
    queryFn: async () => {
      const response = await fetch(`/api/games/${game?.id}/clips`, { credentials: "include" });
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!game?.id,
  });

  const { data: screenshots = [], isLoading: screenshotsLoading } = useQuery<any[]>({
    queryKey: ["/api/games", game?.id, "screenshots"],
    queryFn: async () => {
      const response = await fetch(`/api/games/${game?.id}/screenshots`, { credentials: "include" });
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!game?.id && activeTab === "screenshots",
  });

  const profile = indieProfileData?.profile ?? {};
  const developer = indieProfileData?.user ?? {};
  const meta = game?.indieMeta ?? {};
  const genres = arrayValue(profile.genres ?? meta.genres, ["Indie"]);
  const platforms = arrayValue(profile.platforms ?? meta.platforms, []);
  const features = arrayValue(profile.keyFeatures ?? meta.features);
  const title = game?.name ?? "Game";
  const developerName = profile.studioName ?? meta.developerName ?? "Indie Developer";
  const developerHandle = developer.username;
  const description =
    profile.fullDescription ??
    profile.shortDescription ??
    meta.description ??
    "An exciting indie game featured on Gamefolio.";
  const communityUploads = clips.length;
  const totalViews = clips.reduce((sum, clip) => sum + Number(clip.views ?? 0), 0);
  const followerCount = Number(meta.followers ?? 0);
  const clipItems = clips.filter((clip) => !clip.videoType || clip.videoType === "clip");
  const reelItems = clips.filter((clip) => clip.videoType === "reel");
  const canManage = !!user && user.id === developer.id;
  const publicUrl = `${window.location.origin}/games/${encodeURIComponent(gameSlug || "")}`;

  useEffect(() => {
    if (!game || !gameSlug) return;
    document.title = `${game.name} | Gamefolio`;
    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = publicUrl;
  }, [game, gameSlug, publicUrl]);

  const tags = useMemo(() => [...genres, ...features].filter(Boolean).slice(0, 4), [features, genres]);

  const share = async () => {
    if (navigator.share) {
      await navigator.share({ title, url: publicUrl }).catch(() => undefined);
      return;
    }
    await navigator.clipboard?.writeText(publicUrl);
    toast({ title: "Link copied", description: "The public game page link is ready to share." });
  };

  const openUpload = () => {
    if (!game) return;
    sessionStorage.setItem("uploadGameId", String(game.id));
    sessionStorage.setItem("uploadGameName", game.name);
    sessionStorage.setItem("uploadGameImage", game.imageUrl || "");
    setUploadOpen(true);
  };

  const closeUpload = () => {
    setUploadOpen(false);
    sessionStorage.removeItem("uploadGameId");
    sessionStorage.removeItem("uploadGameName");
    sessionStorage.removeItem("uploadGameImage");
  };

  if (gameLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-[#0B1319] p-6 md:p-12">
        <div className="mx-auto max-w-5xl space-y-5 pt-20">
          <Skeleton className="mx-auto h-8 w-64 bg-white/10" />
          <Skeleton className="mx-auto h-24 w-2/3 bg-white/10" />
          <div className="flex justify-center gap-3"><Skeleton className="h-12 w-32 bg-white/10" /><Skeleton className="h-12 w-32 bg-white/10" /></div>
        </div>
      </div>
    );
  }

  if (!game || !indieProfileData) {
    return <div className="flex min-h-[60vh] items-center justify-center bg-[#0B1319] p-8 text-white/60">Game not found.</div>;
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#0B1319] text-white" style={{ fontFamily: "Inter, sans-serif" }}>
      <style>{`
        @keyframes gamefolio-scanline { from { transform: translateY(-100%); } to { transform: translateY(100vh); } }
        @keyframes gamefolio-pulse { 0%,100% { box-shadow: 0 0 20px rgba(183,255,24,.2); } 50% { box-shadow: 0 0 40px rgba(183,255,24,.4); } }
        .gamefolio-scanline { animation: gamefolio-scanline 8s linear infinite; }
        .gamefolio-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
        .gamefolio-scrollbar::-webkit-scrollbar-track { background: #0B1319; }
        .gamefolio-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,.12); border-radius: 4px; }
      `}</style>

      <section
        className="relative flex min-h-[520px] items-center justify-center overflow-hidden border-b border-white/5 px-6 pb-20 pt-24 md:px-12"
        style={{ background: "linear-gradient(135deg, #0B1319 0%, #1a0b30 50%, #0d1f2d 100%)" }}
      >
        <div className="gamefolio-scanline pointer-events-none absolute left-0 top-0 z-10 h-2 w-full bg-gradient-to-b from-transparent via-[#B7FF18]/30 to-transparent" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.15)_0%,transparent_50%)]" />
        <div className="relative z-20 mx-auto flex w-full max-w-5xl flex-col items-center text-center">
          <div className="mb-6 flex flex-wrap justify-center gap-3">
            {tags.map((tag) => (
              <span key={tag} className="rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#0B1319]" style={{ background: ACCENT }}>
                {tag}
              </span>
            ))}
          </div>

          <div className="mb-7 flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border border-[#B7FF18]/60 bg-black/20 shadow-[0_0_30px_rgba(183,255,24,.25)]">
            <img src={game.imageUrl || ""} alt={title} className="h-full w-full object-cover" onError={(event) => { event.currentTarget.style.display = "none"; }} />
            <span className="absolute -z-0 text-3xl font-black text-[#B7FF18]/60">{title.slice(0, 1)}</span>
          </div>
          <h1 className="text-5xl font-black tracking-tighter text-transparent drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] md:text-8xl" style={{ backgroundImage: "linear-gradient(135deg, #fff, #9ca3af)", WebkitBackgroundClip: "text" }}>
            {title.toUpperCase()}
          </h1>
          <Link href={developerHandle ? `/developer/${encodeURIComponent(developerHandle)}` : "#"} className="mt-4 text-sm font-semibold text-white/60 transition-colors hover:text-[#B7FF18]">
            {developerName}
          </Link>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <button onClick={() => developerHandle ? navigate(`/developer/${encodeURIComponent(developerHandle)}`) : undefined} className="flex items-center justify-center gap-2 rounded-lg px-8 py-3.5 font-bold text-black transition-transform hover:scale-105" style={{ background: ACCENT, animation: "gamefolio-pulse 4s infinite" }}>
              <UserPlus size={18} /> Follow
            </button>
            <button onClick={() => developerHandle ? navigate(`/developer/${encodeURIComponent(developerHandle)}`) : undefined} className="flex items-center justify-center gap-2 rounded-lg border border-white/20 px-8 py-3.5 font-bold text-white transition-colors hover:bg-white/5">
              <MessageCircle size={18} /> Message
            </button>
          </div>

          <div className="mt-8 grid w-full max-w-3xl grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { label: "Followers", value: formatCount(followerCount), icon: Users },
              { label: "Total Views", value: formatCount(totalViews), icon: Eye },
              { label: "Community Uploads", value: formatCount(communityUploads), icon: Award },
            ].map((stat) => (
              <div key={stat.label} className="flex items-center gap-3 rounded-lg px-6 py-4 text-left" style={CARD_STYLE}>
                <stat.icon size={22} color={ACCENT} className="opacity-90" />
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-white/60">{stat.label}</div>
                  <div className="text-xl font-bold">{stat.value}</div>
                </div>
              </div>
            ))}
          </div>

          {platforms.length > 0 && (
            <div className="mt-6 flex w-full flex-wrap items-center justify-center gap-4 border-t border-white/10 pt-6">
              {platforms.map((platform) => {
                const normalized = platform.toLowerCase();
                const Icon = normalized.includes("windows") || normalized === "pc" ? FaWindows : normalized.includes("play") ? FaPlaystation : FaXbox;
                return <div key={platform} className="flex items-center gap-1.5 text-xs font-medium text-white/70"><Icon size={14} className="text-[#B7FF18]" />{platform}</div>;
              })}
            </div>
          )}
        </div>
      </section>

      <nav className="sticky top-0 z-40 border-b border-white/10 bg-[#0B1319]/80 px-4 backdrop-blur-xl md:px-6">
        <div className="gamefolio-scrollbar mx-auto flex max-w-6xl overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`relative flex shrink-0 items-center gap-2 px-5 py-5 text-xs font-bold tracking-[0.18em] transition-colors md:px-6 md:text-sm ${activeTab === tab.id ? "text-white" : "text-white/45 hover:text-white/80"}`}>
                <Icon size={14} />
                {tab.label}
                {activeTab === tab.id && <span className="absolute bottom-0 left-0 h-1 w-full bg-[#B7FF18] shadow-[0_0_20px_rgba(183,255,24,.4)]" />}
              </button>
            );
          })}
        </div>
      </nav>

      {activeTab === "overview" && (
        <section className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-6 py-16 lg:grid-cols-3">
          <div className="space-y-10 lg:col-span-2">
            <div>
              <h2 className="mb-4 text-2xl font-bold">Overview</h2>
              <p className="text-lg leading-relaxed text-white/70">{description}</p>
            </div>
            <div>
              <h2 className="mb-4 text-2xl font-bold">Key Features</h2>
              {features.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {features.map((feature) => <div key={feature} className="flex items-start gap-3 rounded-lg p-4" style={CARD_STYLE}><CheckCircle2 color={ACCENT} size={20} className="mt-0.5 shrink-0" /><span className="text-sm font-medium">{feature}</span></div>)}
                </div>
              ) : <p className="text-sm text-white/45">The developer has not added feature details yet.</p>}
            </div>
          </div>
          <div className="space-y-6">
            <div className="space-y-6 p-6" style={{ ...CARD_STYLE, animation: "gamefolio-pulse 4s infinite" }}>
              <div>
                <div className="mb-1 text-xs uppercase tracking-wider text-white/60">Developer</div>
                {developerHandle ? <Link href={`/developer/${encodeURIComponent(developerHandle)}`} className="flex items-center gap-2 text-xl font-bold hover:text-[#B7FF18]"><Terminal size={18} color={ACCENT} />{developerName}</Link> : <div className="flex items-center gap-2 text-xl font-bold"><Terminal size={18} color={ACCENT} />{developerName}</div>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><div className="mb-1 text-xs uppercase tracking-wider text-white/50">Release Date</div><div className="font-medium">{profile.releaseDate ?? meta.releaseDate ?? "TBA"}</div></div>
                <div><div className="mb-1 text-xs uppercase tracking-wider text-white/50">Genre</div><div className="font-medium">{genres[0] ?? "Indie"}</div></div>
              </div>
            </div>

            <div className="space-y-4 p-6" style={CARD_STYLE}>
              <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-white/50">Store Links</h3>
              {profile.steamUrl || meta.steamUrl ? <a href={profile.steamUrl ?? meta.steamUrl} target="_blank" rel="noreferrer" className="flex w-full items-center gap-3 rounded-md border border-white/5 bg-[#171a21] p-3 font-semibold text-[#c7d5e0] transition-colors hover:bg-[#2a303c]"><SiSteam size={24} />Steam</a> : null}
              {profile.epicUrl || meta.epicUrl ? <a href={profile.epicUrl ?? meta.epicUrl} target="_blank" rel="noreferrer" className="flex w-full items-center gap-3 rounded-md border border-white/5 bg-[#121212] p-3 font-semibold transition-colors hover:bg-[#2a2a2a]"><SiEpicgames size={24} />Epic Games</a> : null}
              {profile.websiteUrl || meta.website ? <a href={profile.websiteUrl ?? meta.website} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-md border border-white/5 bg-white/[0.03] p-3 font-semibold text-white/80 transition-colors hover:bg-white/[0.08]"><Globe size={21} color={ACCENT} />Official Website</a> : null}
              {!profile.steamUrl && !meta.steamUrl && !profile.epicUrl && !meta.epicUrl && !profile.websiteUrl && !meta.website && <p className="text-sm text-white/45">Store links will appear here when the developer adds them.</p>}
            </div>
          </div>
        </section>
      )}

      {activeTab === "clips" && (
        <section className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="mb-6 text-2xl font-bold">Clips</h2>
          {clipsLoading ? <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[#B7FF18]" /></div> : clipItems.length > 0 ? <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">{clipItems.map((clip) => <VideoClipGridItem key={clip.id} clip={clip} clipsList={clipItems} customAccentColor={ACCENT} />)}</div> : <EmptyState icon={Video} title="No clips yet" description="Community clips will appear here when players start sharing." />}
        </section>
      )}

      {activeTab === "reels" && (
        <section className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="mb-6 text-2xl font-bold">Reels</h2>
          {clipsLoading ? <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[#B7FF18]" /></div> : reelItems.length > 0 ? <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">{reelItems.map((clip) => <VideoClipGridItem key={clip.id} clip={clip} reelsList={reelItems} customAccentColor={ACCENT} />)}</div> : <EmptyState icon={Play} title="No reels yet" description="Short-form game moments will appear here when the community posts them." />}
        </section>
      )}

      {activeTab === "screenshots" && (
        <section className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="mb-6 text-2xl font-bold">Screenshots</h2>
          {screenshotsLoading ? <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[#B7FF18]" /></div> : screenshots.length > 0 ? <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{screenshots.map((screenshot: any, index: number) => <button key={screenshot.id ?? index} className="group aspect-video overflow-hidden rounded-lg border border-white/10 bg-white/[0.03]" onClick={() => window.open(screenshot.imageUrl, "_blank", "noopener,noreferrer")}><img src={screenshot.imageUrl} alt={screenshot.title ?? `${title} screenshot ${index + 1}`} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" /></button>)}</div> : <EmptyState icon={Camera} title="No screenshots yet" description="The developer has not published screenshots for this game yet." />}
        </section>
      )}

      {activeTab === "streamers" && (
        <section className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="mb-6 text-2xl font-bold">Streamers Playing</h2>
          <EmptyState icon={Radio} title="No streamers yet" description="Live creator activity will appear here when streamers feature this game." />
        </section>
      )}

      <div className="fixed bottom-6 right-6 z-30 flex flex-col gap-3 sm:flex-row">
        <button onClick={share} className="flex items-center justify-center gap-2 rounded-lg border border-white/20 bg-[#0B1319]/90 px-4 py-3 text-sm font-bold text-white shadow-xl backdrop-blur transition-colors hover:bg-white/10"><Users size={16} />Share</button>
        <button onClick={openUpload} className="flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-bold text-[#0B1319] shadow-xl transition-transform hover:scale-105" style={{ background: ACCENT }}><Upload size={16} />Upload</button>
        {canManage && <Link href={`/manage/games/${encodeURIComponent(gameSlug || "")}`} className="flex items-center justify-center gap-2 rounded-lg border border-[#B7FF18]/40 bg-[#0B1319]/90 px-4 py-3 text-sm font-bold text-[#B7FF18] shadow-xl backdrop-blur hover:bg-[#B7FF18]/10"><Terminal size={16} />Dashboard</Link>}
      </div>

      <Dialog open={uploadOpen} onOpenChange={(open) => !open && closeUpload()}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto bg-[#0B1218] p-0">
          <Suspense fallback={<div className="p-8 text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin text-[#B7FF18]" /></div>}>
            <UploadPage />
          </Suspense>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default DesignedIndieGamePage;