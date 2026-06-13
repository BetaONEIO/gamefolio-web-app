import { useState, useMemo, lazy, Suspense } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { useMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ClipWithUser, Game, GameBounty } from "@shared/schema";
import VideoClipGridItem from "@/components/clips/VideoClipGridItem";
import { MobileTrendingViewer } from "@/components/clips/MobileTrendingViewer";
import MobileClipsViewerOverlay from "@/components/clips/MobileClipsViewerOverlay";
import { openExternal } from "@/lib/platform";
import {
  ArrowLeft, Play, Camera, Users, Clock, Eye,
  Trophy, Zap, Key, Star, Gift, Sword, Plus, Upload, X,
  ChevronRight, Loader2, Radio, Target, Shield, Flame,
  BarChart3, Video, Globe, Heart, Gamepad2, Check,
  Gamepad, Monitor, Smartphone,
} from "lucide-react";

const UploadPage = lazy(() => import("./UploadPage"));

const NEON = "#c1ff00";
const CARD_BG = "rgba(255,255,255,0.04)";
const CARD_BORDER = "rgba(255,255,255,0.09)";

const TABS = [
  { id: "overview",    label: "Overview",     icon: BarChart3 },
  { id: "clips",       label: "Clips",        icon: Play },
  { id: "reels",       label: "Reels",        icon: Video },
  { id: "screenshots", label: "Screenshots",  icon: Camera },
  { id: "bounties",    label: "Bounties",     icon: Sword },
] as const;

type TabId = typeof TABS[number]["id"];

const DIFFICULTY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  easy:   { label: "Easy",   color: "#4ade80", bg: "rgba(74,222,128,0.12)" },
  medium: { label: "Medium", color: "#facc15", bg: "rgba(250,204,21,0.12)" },
  hard:   { label: "Hard",   color: "#f87171", bg: "rgba(248,113,113,0.12)" },
};

const REWARD_ICONS: Record<string, any> = {
  game_key:      Key,
  xp:            Zap,
  badge:         Trophy,
  featured:      Star,
  early_access:  Shield,
  digital:       Gift,
};

function DifficultyBadge({ difficulty }: { difficulty?: string | null }) {
  const cfg = DIFFICULTY_CONFIG[difficulty ?? "medium"] ?? DIFFICULTY_CONFIG.medium;
  return (
    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
      style={{ color: cfg.color, background: cfg.bg, letterSpacing: "1.2px" }}>
      {cfg.label}
    </span>
  );
}

function StatCard({ value, label, icon: Icon }: { value: string | number; label: string; icon: any }) {
  return (
    <div className="flex-1 rounded-xl p-3 flex flex-col gap-1.5"
      style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
      <div className="flex items-center gap-1.5 mb-0.5">
        <Icon className="w-3 h-3" style={{ color: NEON }} />
      </div>
      <span className="text-xl font-black text-white leading-none">{value}</span>
      <span className="text-[9px] uppercase font-bold tracking-widest" style={{ color: NEON }}>{label}</span>
    </div>
  );
}

function FeatureTag({ label }: { label: string }) {
  return (
    <span className="px-3 py-1.5 rounded-lg text-xs font-bold"
      style={{ background: "rgba(193,255,0,0.08)", border: "1px solid rgba(193,255,0,0.2)", color: NEON }}>
      {label}
    </span>
  );
}

function PlatformIcon({ platform }: { platform: string }) {
  const icons: Record<string, any> = {
    steam: Gamepad2,
    epic: Gamepad,
    xbox: Gamepad,
    playstation: Gamepad,
    nintendo: Gamepad,
    mobile: Smartphone,
    pc: Monitor,
  };
  const Icon = icons[platform.toLowerCase()] || Gamepad;
  const names: Record<string, string> = {
    steam: "Steam", epic: "Epic Games", xbox: "Xbox", playstation: "PlayStation",
    nintendo: "Nintendo Switch", mobile: "Mobile", pc: "PC",
  };
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold"
      style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${CARD_BORDER}`, color: "rgba(255,255,255,0.7)" }}>
      <Icon className="w-3.5 h-3.5" />
      {names[platform.toLowerCase()] || platform}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{label}</span>
      <span className="text-sm font-bold text-white">{value}</span>
    </div>
  );
}

function BountyCard({ bounty, onAccept, accepting, alreadyAccepted }: {
  bounty: GameBounty & { participantCount?: number };
  onAccept: (id: number) => void;
  accepting: boolean;
  alreadyAccepted: boolean;
}) {
  const RewardIcon = REWARD_ICONS[bounty.rewardType ?? "game_key"] ?? Key;
  const slotsUsed = bounty.participantCount ?? 0;
  const totalSlots = bounty.creatorSlots ?? 10;
  const progress = Math.min((slotsUsed / totalSlots) * 100, 100);
  const isFull = slotsUsed >= totalSlots;

  return (
    <div className="rounded-2xl p-4 flex flex-col gap-3 relative overflow-hidden"
      style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${CARD_BORDER}` }}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-white text-sm leading-tight mb-1 truncate">{bounty.title}</h4>
          {bounty.description && (
            <p className="text-xs text-gray-400 line-clamp-2">{bounty.description}</p>
          )}
        </div>
        <DifficultyBadge difficulty={bounty.difficulty} />
      </div>

      <div className="flex items-center gap-2 rounded-lg px-3 py-2"
        style={{ background: "rgba(193,255,0,0.07)", border: "1px solid rgba(193,255,0,0.15)" }}>
        <RewardIcon className="w-4 h-4 flex-shrink-0" style={{ color: NEON }} />
        <span className="text-sm font-bold" style={{ color: NEON }}>
          {bounty.rewardValue || bounty.rewardType?.replace(/_/g, " ") || "Reward"}
        </span>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-[11px] text-gray-400">
          <span>{slotsUsed}/{totalSlots} creators</span>
          {bounty.endDate && (
            <span>Ends {new Date(bounty.endDate).toLocaleDateString()}</span>
          )}
        </div>
        <div className="h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
          <div className="h-full rounded-full transition-all"
            style={{ width: `${progress}%`, background: isFull ? "#f87171" : NEON }} />
        </div>
      </div>

      <Button
        size="sm"
        disabled={isFull || alreadyAccepted || accepting}
        onClick={() => onAccept(bounty.id)}
        className="w-full font-bold text-sm"
        style={isFull || alreadyAccepted ? {
          background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.3)", border: CARD_BORDER
        } : {
          background: NEON, color: "#0a0f1c", boxShadow: "0 8px 24px rgba(193,255,0,0.25)"
        }}
      >
        {accepting ? <Loader2 className="w-4 h-4 animate-spin" /> :
          alreadyAccepted ? "Accepted ✓" : isFull ? "Full" : "Accept Bounty"}
      </Button>
    </div>
  );
}

function FeaturedBountyCard({ bounty, onAccept, accepting, alreadyAccepted }: {
  bounty: GameBounty & { participantCount?: number };
  onAccept: (id: number) => void;
  accepting: boolean;
  alreadyAccepted: boolean;
}) {
  const RewardIcon = REWARD_ICONS[bounty.rewardType ?? "game_key"] ?? Key;
  const slotsUsed = bounty.participantCount ?? 0;
  const totalSlots = bounty.creatorSlots ?? 10;
  const progress = Math.min((slotsUsed / totalSlots) * 100, 100);
  const isFull = slotsUsed >= totalSlots;

  return (
    <div className="rounded-2xl overflow-hidden relative"
      style={{ background: "linear-gradient(135deg, rgba(193,255,0,0.10) 0%, rgba(120,40,200,0.12) 100%)", border: "1px solid rgba(193,255,0,0.25)", boxShadow: "0 0 40px rgba(193,255,0,0.08)" }}>
      <div className="absolute top-0 right-0 w-48 h-48 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(ellipse, rgba(193,255,0,0.08) 0%, transparent 70%)", transform: "translate(30%, -30%)" }} />
      <div className="p-5 relative z-10">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Star className="w-4 h-4" style={{ color: NEON }} />
              <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: NEON }}>Featured Bounty</span>
            </div>
            <h3 className="text-xl font-black text-white leading-tight">{bounty.title}</h3>
          </div>
          <DifficultyBadge difficulty={bounty.difficulty} />
        </div>

        {bounty.description && (
          <p className="text-sm text-gray-300 mb-4 leading-relaxed">{bounty.description}</p>
        )}

        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center gap-2 rounded-xl px-4 py-2.5 flex-1"
            style={{ background: "rgba(193,255,0,0.1)", border: "1px solid rgba(193,255,0,0.2)" }}>
            <RewardIcon className="w-5 h-5" style={{ color: NEON }} />
            <div>
              <div className="text-[9px] uppercase font-bold text-gray-400 tracking-widest">Reward</div>
              <div className="text-sm font-black" style={{ color: NEON }}>
                {bounty.rewardValue || bounty.rewardType?.replace(/_/g, " ") || "Reward"}
              </div>
            </div>
          </div>
          <div className="rounded-xl px-4 py-2.5"
            style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${CARD_BORDER}` }}>
            <div className="text-[9px] uppercase font-bold text-gray-400 tracking-widest">Slots</div>
            <div className="text-sm font-black text-white">{totalSlots - slotsUsed} left</div>
          </div>
          {bounty.endDate && (
            <div className="rounded-xl px-4 py-2.5"
              style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${CARD_BORDER}` }}>
              <div className="text-[9px] uppercase font-bold text-gray-400 tracking-widest">Ends</div>
              <div className="text-sm font-black text-white">{new Date(bounty.endDate).toLocaleDateString()}</div>
            </div>
          )}
        </div>

        <div className="space-y-1.5 mb-4">
          <div className="flex justify-between text-xs text-gray-400">
            <span>{slotsUsed} of {totalSlots} creator slots filled</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-2 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
            <div className="h-full rounded-full transition-all"
              style={{ width: `${progress}%`, background: isFull ? "#f87171" : NEON, boxShadow: isFull ? "none" : "0 0 10px rgba(193,255,0,0.5)" }} />
          </div>
        </div>

        <Button
          disabled={isFull || alreadyAccepted || accepting}
          onClick={() => onAccept(bounty.id)}
          className="w-full py-3 font-black text-sm"
          style={isFull || alreadyAccepted ? {
            background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.3)", border: CARD_BORDER
          } : {
            background: NEON, color: "#0a0f1c", boxShadow: "0 12px 32px rgba(193,255,0,0.3)"
          }}
        >
          {accepting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          {accepting ? "Accepting..." : alreadyAccepted ? "Bounty Accepted ✓" : isFull ? "All Slots Filled" : "Accept Bounty →"}
        </Button>
      </div>
    </div>
  );
}

function CreateBountyDialog({ open, onClose, gameId, onCreated }: {
  open: boolean; onClose: () => void; gameId: number; onCreated: () => void;
}) {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [rewardType, setRewardType] = useState("game_key");
  const [rewardValue, setRewardValue] = useState("");
  const [keyCount, setKeyCount] = useState("1");
  const [creatorSlots, setCreatorSlots] = useState("10");
  const [difficulty, setDifficulty] = useState("medium");
  const [endDate, setEndDate] = useState("");

  const mutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", `/api/games/${gameId}/bounties`, data),
    onSuccess: () => {
      toast({ title: "Bounty created!", description: "Your bounty is now live for creators to accept.", variant: "gamefolioSuccess" });
      onCreated();
      onClose();
      setTitle(""); setDescription(""); setRewardValue(""); setKeyCount("1"); setCreatorSlots("10"); setEndDate("");
    },
    onError: () => toast({ title: "Error", description: "Failed to create bounty.", variant: "gamefolioError" }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    mutation.mutate({ title, description, rewardType, rewardValue, keyCount: parseInt(keyCount) || 0, creatorSlots: parseInt(creatorSlots) || 10, difficulty, endDate: endDate || undefined });
  };

  const inputStyle = { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", color: "#fff", borderRadius: "10px", padding: "10px 14px", width: "100%", outline: "none", fontSize: "14px" };
  const labelStyle = { fontSize: "11px", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "1px", color: "rgba(255,255,255,0.5)", display: "block", marginBottom: "6px" };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0" style={{ background: "#0B1218", border: "1px solid rgba(193,255,0,0.2)" }}>
        <DialogHeader className="px-6 pt-6 pb-0">
          <div className="flex items-center gap-2 mb-1">
            <Sword className="w-5 h-5" style={{ color: NEON }} />
            <DialogTitle className="text-white font-black text-lg">Create Bounty</DialogTitle>
          </div>
          <p className="text-sm text-gray-400">Launch a creator campaign and reward creators who make content for your game.</p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div><label style={labelStyle}>Bounty Title *</label><input style={inputStyle} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Best Gameplay Montage" required /></div>
          <div><label style={labelStyle}>Description</label><textarea style={{ ...inputStyle, minHeight: "80px", resize: "vertical" }} value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe what creators need to do to earn the reward..." /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label style={labelStyle}>Reward Type</label>
              <select style={inputStyle} value={rewardType} onChange={e => setRewardType(e.target.value)}>
                <option value="game_key">Game Key</option><option value="xp">XP Boost</option><option value="badge">Creator Badge</option><option value="featured">Featured Creator</option><option value="early_access">Early Access</option>
              </select>
            </div>
            <div><label style={labelStyle}>Reward Value</label><input style={inputStyle} value={rewardValue} onChange={e => setRewardValue(e.target.value)} placeholder="e.g. Steam Key, 500 XP" /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><label style={labelStyle}>Keys Available</label><input style={inputStyle} type="number" min="0" value={keyCount} onChange={e => setKeyCount(e.target.value)} /></div>
            <div><label style={labelStyle}>Creator Slots</label><input style={inputStyle} type="number" min="1" value={creatorSlots} onChange={e => setCreatorSlots(e.target.value)} /></div>
            <div><label style={labelStyle}>Difficulty</label>
              <select style={inputStyle} value={difficulty} onChange={e => setDifficulty(e.target.value)}>
                <option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
              </select>
            </div>
          </div>
          <div><label style={labelStyle}>End Date (optional)</label><input style={inputStyle} type="date" value={endDate} onChange={e => setEndDate(e.target.value)} /></div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="ghost" className="flex-1 text-gray-400" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending || !title.trim()} className="flex-1 font-black"
              style={{ background: NEON, color: "#0a0f1c", boxShadow: "0 8px 24px rgba(193,255,0,0.25)" }}>
              {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              Create Bounty
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ───────────────────────────────────────────────────────────────
   INDIE GAME PROFILE PAGE
   ─────────────────────────────────────────────────────────────── */

interface IndieGameMeta {
  developerName: string;
  description: string;
  developerDescription: string;
  releaseDate: string;
  genres: string[];
  platforms: string[];
  features: string[];
  website: string;
  discordUrl: string;
  steamUrl: string;
  verifiedDeveloper: boolean;
  trailerUrl?: string;
  followers: number;
  publisher?: string;
}

const IndieGamePage = () => {
  const [, navigate] = useLocation();
  const [match, params] = useRoute("/indie-games/:slug");
  const gameSlug = params?.slug;
  const isMobile = useMobile();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [timePeriod, setTimePeriod] = useState<"recent" | "1w" | "1m" | "ever">("recent");
  const [selectedUserId, setSelectedUserId] = useState("all");
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showCreateBounty, setShowCreateBounty] = useState(false);
  const [mobileViewerOpen, setMobileViewerOpen] = useState(false);
  const [mobileViewerIndex, setMobileViewerIndex] = useState(0);
  const [mobileViewerClipId, setMobileViewerClipId] = useState<number | null>(null);
  const [selectedScreenshot, setSelectedScreenshot] = useState<any>(null);
  const [acceptingBountyId, setAcceptingBountyId] = useState<number | null>(null);
  const [acceptedBounties, setAcceptedBounties] = useState<Set<number>>(new Set());

  const { data: game, isLoading: gameLoading } = useQuery<Game & { indieMeta?: IndieGameMeta }>({
    queryKey: ["/api/games/slug", gameSlug],
    queryFn: async () => {
      const r = await fetch(`/api/games/slug/${gameSlug}`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed to fetch game");
      return r.json();
    },
    enabled: !!gameSlug,
  });

  const { data: clips } = useQuery<ClipWithUser[]>({
    queryKey: ["/api/games", game?.id, "clips"],
    queryFn: async () => {
      const r = await fetch(`/api/games/${game?.id}/clips`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed to fetch clips");
      return r.json();
    },
    enabled: !!game?.id,
  });

  const { data: trendingClips, isLoading: isLoadingClips } = useQuery<ClipWithUser[]>({
    queryKey: ["/api/clips/trending", timePeriod, game?.id],
    queryFn: async () => {
      const p = new URLSearchParams({ period: timePeriod, limit: "20", gameId: game?.id?.toString() || "" });
      const r = await fetch(`/api/clips/trending?${p}`);
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    enabled: activeTab === "clips" && !!game?.id,
  });

  const { data: trendingReels, isLoading: isLoadingReels } = useQuery<ClipWithUser[]>({
    queryKey: ["/api/reels/trending", timePeriod, game?.id],
    queryFn: async () => {
      const p = new URLSearchParams({ period: timePeriod, limit: "20", gameId: game?.id?.toString() || "" });
      const r = await fetch(`/api/reels/trending?${p}`);
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    enabled: activeTab === "reels" && !!game?.id,
  });

  const { data: allScreenshots, isLoading: isLoadingScreenshots } = useQuery<any[]>({
    queryKey: ["/api/games", game?.id, "screenshots"],
    queryFn: async () => {
      const r = await fetch(`/api/games/${game?.id}/screenshots`, { credentials: "include" });
      if (!r.ok) return [];
      return r.json();
    },
    enabled: activeTab === "screenshots" && !!game?.id,
  });

  const { data: bounties = [], isLoading: bountiesLoading } = useQuery<(GameBounty & { participantCount?: number })[]>({
    queryKey: ["/api/games", game?.id, "bounties"],
    queryFn: async () => {
      const r = await fetch(`/api/games/${game?.id}/bounties`, { credentials: "include" });
      if (!r.ok) return [];
      return r.json();
    },
    enabled: !!game?.id,
  });

  const { data: bountyStats } = useQuery({
    queryKey: ["/api/games", game?.id, "bounty-stats"],
    queryFn: async () => {
      const r = await fetch(`/api/games/${game?.id}/bounty-stats`, { credentials: "include" });
      if (!r.ok) return { activeBounties: 0, creatorsJoined: 0, keysAvailable: 0 };
      return r.json();
    },
    enabled: !!game?.id,
  });

  const acceptMutation = useMutation({
    mutationFn: (bountyId: number) => apiRequest("POST", `/api/games/bounties/${bountyId}/accept`, {}),
    onSuccess: (_, bountyId) => {
      setAcceptedBounties(prev => new Set([...prev, bountyId]));
      setAcceptingBountyId(null);
      queryClient.invalidateQueries({ queryKey: ["/api/games", game?.id, "bounties"] });
      queryClient.invalidateQueries({ queryKey: ["/api/games", game?.id, "bounty-stats"] });
      toast({ title: "Bounty accepted!", description: "Get creating and claim your reward.", variant: "gamefolioSuccess" });
    },
    onError: () => {
      setAcceptingBountyId(null);
      toast({ title: "Error", description: "Could not accept bounty.", variant: "gamefolioError" });
    },
  });

  const handleAcceptBounty = (bountyId: number) => {
    if (!user) { toast({ title: "Sign in required", description: "Sign in to accept bounties.", variant: "gamefolioError" }); return; }
    setAcceptingBountyId(bountyId);
    acceptMutation.mutate(bountyId);
  };

  const allClips = useMemo(() => clips ?? [], [clips]);
  const clipData = useMemo(() => {
    const src = (trendingClips?.length ? trendingClips : allClips).filter((c: any) => !c.videoType || c.videoType === "clip");
    if (selectedUserId === "all") return src;
    return src.filter((c: any) => c.user?.id === parseInt(selectedUserId));
  }, [trendingClips, allClips, selectedUserId]);

  const reelData = useMemo(() => {
    const src = (trendingReels?.length ? trendingReels : allClips).filter((c: any) => c.videoType === "reel");
    if (selectedUserId === "all") return src;
    return src.filter((c: any) => c.user?.id === parseInt(selectedUserId));
  }, [trendingReels, allClips, selectedUserId]);

  const uniqueCreators = useMemo(() => {
    const map = new Map<number, any>();
    [...allClips].forEach((item: any) => {
      if (item.user?.id && !map.has(item.user.id)) map.set(item.user.id, { ...item.user, uploadCount: 0 });
      if (item.user?.id) map.get(item.user.id).uploadCount++;
    });
    return Array.from(map.values()).sort((a, b) => b.uploadCount - a.uploadCount);
  }, [allClips]);

  const totalViews = useMemo(() => allClips.reduce((acc: number, c: any) => acc + (c.views || 0), 0), [allClips]);

  const canCreateBounty = !!user && (user.isAdmin || (user as any).userType === "indie" || (user as any).userType === "indie_developer");

  const handleUploadClose = () => {
    setShowUploadDialog(false);
    if (game?.id) {
      queryClient.invalidateQueries({ queryKey: ["/api/games", game.id, "clips"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clips/trending", timePeriod, game.id] });
    }
  };

  // Mock indie metadata for UI (until backend supports it)
  const meta: IndieGameMeta = game?.indieMeta ?? {
    developerName: "Indie Developer",
    description: "An exciting indie game featured on Gamefolio. Join the community to discover clips, reels, and bounties created by passionate players.",
    developerDescription: "A passionate indie developer creating unique gaming experiences.",
    releaseDate: "2024",
    genres: ["Indie", "Action", "Adventure"],
    platforms: ["steam", "pc"],
    features: ["Singleplayer", "Co-op", "Multiplayer", "PvP", "Open World"],
    website: "",
    discordUrl: "",
    steamUrl: "",
    verifiedDeveloper: false,
    trailerUrl: undefined,
    followers: 0,
    publisher: "Indie Publisher",
  };

  if (!match || !gameSlug) return <div className="p-8 text-center text-gray-400">Indie game not found</div>;

  if (gameLoading) {
    return (
      <div className="py-6 px-4 sm:px-6">
        <Skeleton className="h-8 w-32 mb-6" />
        <div className="flex gap-5 mb-8">
          <Skeleton className="w-28 h-28 rounded-[20px] flex-shrink-0" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-72" />
            <div className="flex gap-2"><Skeleton className="h-8 w-20" /><Skeleton className="h-8 w-20" /></div>
          </div>
        </div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="py-6 px-4 sm:px-6">
        <button onClick={() => navigate("/explore")} className="flex items-center gap-1 text-sm text-gray-400 hover:text-white mb-6">
          <ArrowLeft className="w-4 h-4" />Back to Explore
        </button>
        <div className="text-center py-16">
          <h1 className="text-2xl font-bold mb-2">Indie game not found</h1>
          <p className="text-gray-400">The indie game you're looking for doesn't exist yet.</p>
        </div>
      </div>
    );
  }

  const periodButtons = (["recent", "1w", "1m", "ever"] as const).map(p => ({
    id: p, label: p === "recent" ? (isMobile ? "New" : "Recent") : p === "ever" ? "All Time" : p.toUpperCase()
  }));

  return (
    <>
      {isMobile && mobileViewerOpen && clipData.length > 0 && (
        activeTab === "clips" ? (
          <MobileClipsViewerOverlay
            clips={clipData as ClipWithUser[]}
            startClipId={mobileViewerClipId ?? (clipData as ClipWithUser[])[mobileViewerIndex]?.id ?? 0}
            onBack={() => setMobileViewerOpen(false)}
          />
        ) : (
          <MobileTrendingViewer
            content={reelData as ClipWithUser[]}
            initialIndex={mobileViewerIndex}
            onClose={() => setMobileViewerOpen(false)}
          />
        )
      )}

      {/* ── HERO BANNER ── */}
      <div className="relative">
        <div className="h-48 sm:h-56 relative overflow-hidden">
          <img
            src={game.imageUrl || "https://placehold.co/1200x400/0B1218/333?text=Game+Banner"}
            alt={game.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0"
            style={{ background: "linear-gradient(to bottom, transparent 0%, rgba(7,16,19,0.6) 60%, #071013 100%)" }} />
        </div>
      </div>

      {/* ── PROFILE HEADER ── */}
      <div className="relative px-4 sm:px-6 -mt-16 sm:-mt-20 mb-4">
        <div className="flex items-start gap-4 sm:gap-5">
          {/* Square rounded game image */}
          <div className="flex-shrink-0 relative z-10">
            <div
              className="overflow-hidden"
              style={{
                width: isMobile ? "96px" : "128px",
                height: isMobile ? "96px" : "128px",
                borderRadius: "24px",
                border: `2px solid rgba(193,255,0,0.45)`,
                boxShadow: "0 0 40px rgba(193,255,0,0.28), 0 12px 40px rgba(0,0,0,0.6)",
              }}
            >
              <img
                src={game.imageUrl || `https://placehold.co/320x320/111/333?text=${encodeURIComponent(game.name.charAt(0))}`}
                alt={game.name}
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Game info */}
          <div className="flex-1 min-w-0 pt-2 sm:pt-4">
            <div className="flex items-start gap-2 flex-wrap mb-1">
              <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
                style={{ background: "rgba(193,255,0,0.12)", color: NEON, border: "1px solid rgba(193,255,0,0.25)" }}>
                <Sword className="w-2.5 h-2.5" />Indie Game
              </span>
              {meta.verifiedDeveloper && (
                <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(59,130,246,0.12)", color: "#60a5fa", border: "1px solid rgba(59,130,246,0.25)" }}>
                  <Check className="w-2.5 h-2.5" />Verified Developer
                </span>
              )}
            </div>

            <h1 className={`font-black text-white leading-tight ${isMobile ? "text-xl" : "text-3xl"}`}>{game.name}</h1>
            <p className="text-sm text-gray-400 mt-1">{meta.developerName}</p>

            {/* Genre tags */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {meta.genres.map(g => (
                <span key={g} className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)", border: `1px solid ${CARD_BORDER}` }}>
                  {g}
                </span>
              ))}
            </div>

            {/* Platform icons */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {meta.platforms.map(p => <PlatformIcon key={p} platform={p} />)}
            </div>
          </div>
        </div>

        {/* Hero Actions */}
        <div className="flex flex-wrap gap-2 mt-4">
          <Button size="sm" className="font-bold text-xs"
            style={{ background: NEON, color: "#0a0f1c", boxShadow: "0 4px 16px rgba(193,255,0,0.25)" }}>
            <Gamepad2 className="w-3.5 h-3.5 mr-1.5" />Get Gaming on Indie
          </Button>
          <Button size="sm" className="font-bold text-xs"
            style={{ background: "rgba(255,255,255,0.07)", border: `1px solid ${CARD_BORDER}`, color: "#fff" }}>
            <Heart className="w-3.5 h-3.5 mr-1.5" />Follow Game
          </Button>
          {meta.steamUrl && (
            <Button size="sm" className="font-bold text-xs"
              onClick={() => openExternal(meta.steamUrl)}
              style={{ background: "rgba(255,255,255,0.07)", border: `1px solid ${CARD_BORDER}`, color: "#fff" }}>
              <Gamepad2 className="w-3.5 h-3.5 mr-1.5" />Steam
            </Button>
          )}
          {meta.website && (
            <Button size="sm" className="font-bold text-xs"
              onClick={() => openExternal(meta.website)}
              style={{ background: "rgba(255,255,255,0.07)", border: `1px solid ${CARD_BORDER}`, color: "#fff" }}>
              <Globe className="w-3.5 h-3.5 mr-1.5" />Website
            </Button>
          )}
          {meta.discordUrl && (
            <Button size="sm" className="font-bold text-xs"
              onClick={() => openExternal(meta.discordUrl)}
              style={{ background: "rgba(255,255,255,0.07)", border: `1px solid ${CARD_BORDER}`, color: "#fff" }}>
              <Users className="w-3.5 h-3.5 mr-1.5" />Discord
            </Button>
          )}
          <Button size="sm" onClick={() => setShowUploadDialog(true)}
            className="font-bold text-xs"
            style={{ background: "rgba(255,255,255,0.07)", border: `1px solid ${CARD_BORDER}`, color: "#fff" }}>
            <Upload className="w-3.5 h-3.5 mr-1.5" />Upload
          </Button>
          {canCreateBounty && (
            <Button size="sm" onClick={() => setShowCreateBounty(true)}
              className="font-bold text-xs"
              style={{ background: "rgba(193,255,0,0.15)", border: "1px solid rgba(193,255,0,0.3)", color: NEON }}>
              <Plus className="w-3.5 h-3.5 mr-1.5" />Create Bounty
            </Button>
          )}
        </div>
      </div>

      {/* ── STATS ── */}
      <div className="px-4 sm:px-6 mb-4">
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          <StatCard value={meta.followers.toLocaleString()} label="Followers" icon={Users} />
          <StatCard value={totalViews.toLocaleString()} label="Total Views" icon={Eye} />
          <StatCard value={allClips.filter((c: any) => !c.videoType || c.videoType === "clip").length} label="Clips" icon={Play} />
          <StatCard value={allClips.filter((c: any) => c.videoType === "reel").length} label="Reels" icon={Video} />
          <StatCard value={uniqueCreators.length} label="Creators" icon={Users} />
          <StatCard value={0} label="Streams" icon={Radio} />
        </div>
      </div>

      {/* ── TAB BAR ── */}
      <div className="px-4 sm:px-6">
        <div className="flex gap-0 overflow-x-auto scrollbar-none -mx-4 sm:-mx-6 px-4 sm:px-6"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-1.5 px-4 py-3 text-sm font-bold whitespace-nowrap flex-shrink-0 transition-all relative"
                style={{ color: isActive ? NEON : "rgba(255,255,255,0.4)" }}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" style={{ background: NEON, boxShadow: "0 0 8px rgba(193,255,0,0.7)" }} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── TAB CONTENT ── */}
      <div className="px-4 sm:px-6 pb-24">

        {/* ──── OVERVIEW ──── */}
        {activeTab === "overview" && (
          <div className="py-5 space-y-8">
            {/* About The Game */}
            <div>
              <h2 className="font-black text-white text-lg mb-3">About The Game</h2>
              <div className="rounded-2xl p-5" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
                <p className="text-sm text-gray-300 leading-relaxed mb-4">{meta.description}</p>
                <div className="h-px my-4" style={{ background: "rgba(255,255,255,0.06)" }} />
                <div className="flex items-start gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(193,255,0,0.1)" }}>
                    <Users className="w-4 h-4" style={{ color: NEON }} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Developer</p>
                    <p className="text-sm text-white">{meta.developerDescription}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Features */}
            <div>
              <h2 className="font-black text-white text-lg mb-3">Features</h2>
              <div className="flex flex-wrap gap-2">
                {meta.features.map(f => <FeatureTag key={f} label={f} />)}
                {meta.features.length === 0 && (
                  <>
                    <FeatureTag label="Co-op" /><FeatureTag label="Multiplayer" /><FeatureTag label="Singleplayer" />
                    <FeatureTag label="Survival" /><FeatureTag label="PvP" /><FeatureTag label="Crafting" />
                    <FeatureTag label="Open World" />
                  </>
                )}
              </div>
            </div>

            {/* Trailer */}
            {meta.trailerUrl && (
              <div>
                <h2 className="font-black text-white text-lg mb-3">Trailer</h2>
                <div className="rounded-2xl overflow-hidden aspect-video" style={{ border: `1px solid ${CARD_BORDER}` }}>
                  <iframe src={meta.trailerUrl} className="w-full h-full" allowFullScreen />
                </div>
              </div>
            )}

            {/* Official Screenshots */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-black text-white text-lg">Official Screenshots</h2>
                <button onClick={() => setActiveTab("screenshots")}
                  className="text-xs font-bold flex items-center gap-1" style={{ color: NEON }}>
                  View all <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {Array(4).fill(0).map((_, i) => (
                  <div key={i} className="aspect-video rounded-xl overflow-hidden"
                    style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${CARD_BORDER}` }}>
                    <img src={game.imageUrl || "https://placehold.co/400x225/0B1218/333?text=Screenshot"}
                      alt={`Screenshot ${i + 1}`} className="w-full h-full object-cover opacity-60" />
                  </div>
                ))}
              </div>
            </div>

            {/* Game Information */}
            <div>
              <h2 className="font-black text-white text-lg mb-3">Game Information</h2>
              <div className="rounded-2xl p-5" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
                <InfoRow label="Developer" value={meta.developerName} />
                <InfoRow label="Publisher" value={meta.publisher || "Independent"} />
                <InfoRow label="Release Date" value={meta.releaseDate} />
                <InfoRow label="Platforms" value={meta.platforms.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(", ")} />
                <InfoRow label="Genres" value={meta.genres.join(", ")} />
                {meta.website && <InfoRow label="Website" value={meta.website} />}
                {meta.discordUrl && <InfoRow label="Discord" value={meta.discordUrl} />}
                {meta.steamUrl && <InfoRow label="Steam" value={meta.steamUrl} />}
              </div>
            </div>

            {/* Community Stats */}
            <div>
              <h2 className="font-black text-white text-lg mb-3">Community</h2>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <StatCard value={totalViews.toLocaleString()} label="Total Views" icon={Eye} />
                <StatCard value={allClips.filter((c: any) => !c.videoType || c.videoType === "clip").length} label="Total Clips" icon={Play} />
                <StatCard value={allClips.filter((c: any) => c.videoType === "reel").length} label="Total Reels" icon={Video} />
                <StatCard value={uniqueCreators.length} label="Active Creators" icon={Users} />
                <StatCard value={0} label="Livestream Hours" icon={Clock} />
              </div>
            </div>
          </div>
        )}

        {/* ──── CLIPS ──── */}
        {activeTab === "clips" && (
          <div className="py-5 space-y-4">
            <div className="flex flex-wrap gap-2 items-center justify-between">
              <div className="flex gap-1.5 flex-wrap">
                {periodButtons.map(p => (
                  <button key={p.id} onClick={() => setTimePeriod(p.id)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                    style={timePeriod === p.id
                      ? { background: NEON, color: "#0a0f1c" }
                      : { background: CARD_BG, color: "rgba(255,255,255,0.5)", border: `1px solid ${CARD_BORDER}` }}>
                    {p.label}
                  </button>
                ))}
              </div>
              {uniqueCreators.length > 1 && (
                <select value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)}
                  className="text-xs rounded-lg px-3 py-1.5 font-bold"
                  style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, color: "rgba(255,255,255,0.7)" }}>
                  <option value="all">All Creators</option>
                  {uniqueCreators.map((c: any) => <option key={c.id} value={c.id}>{c.displayName || c.username}</option>)}
                </select>
              )}
            </div>

            {isLoadingClips ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array(6).fill(0).map((_, i) => <Skeleton key={i} className="aspect-video rounded-xl" />)}
              </div>
            ) : clipData.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {(clipData as ClipWithUser[]).map(clip => (
                  <VideoClipGridItem key={clip.id} clip={clip} userId={user?.id} compact={false}
                    clipsList={clipData as ClipWithUser[]}
                    onCardClick={isMobile ? (id) => {
                      const idx = clipData.findIndex((c: any) => c.id === id);
                      setMobileViewerIndex(idx >= 0 ? idx : 0);
                      setMobileViewerClipId(id);
                      setMobileViewerOpen(true);
                    } : undefined} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <Play className="w-12 h-12 mx-auto mb-3 text-gray-600" />
                <h3 className="text-lg font-semibold mb-1">No clips found</h3>
                <p className="text-gray-400 text-sm mb-4">Be the first to upload a clip for {game.name}</p>
                <Button onClick={() => setShowUploadDialog(true)} style={{ background: NEON, color: "#0a0f1c", fontWeight: 700 }}>
                  <Upload className="w-4 h-4 mr-2" />Upload Clip
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ──── REELS ──── */}
        {activeTab === "reels" && (
          <div className="py-5 space-y-4">
            <div className="flex gap-1.5 flex-wrap">
              {periodButtons.map(p => (
                <button key={p.id} onClick={() => setTimePeriod(p.id)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                  style={timePeriod === p.id
                    ? { background: NEON, color: "#0a0f1c" }
                    : { background: CARD_BG, color: "rgba(255,255,255,0.5)", border: `1px solid ${CARD_BORDER}` }}>
                  {p.label}
                </button>
              ))}
            </div>

            {isLoadingReels ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {Array(6).fill(0).map((_, i) => <Skeleton key={i} className="aspect-[9/16] rounded-xl" />)}
              </div>
            ) : reelData.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {(reelData as ClipWithUser[]).map(reel => (
                  <VideoClipGridItem key={reel.id} clip={reel} userId={user?.id} compact={false} reelsList={reelData} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <Video className="w-12 h-12 mx-auto mb-3 text-gray-600" />
                <h3 className="text-lg font-semibold mb-1">No reels found</h3>
                <p className="text-gray-400 text-sm mb-4">Upload vertical reels for {game.name}</p>
                <Button onClick={() => setShowUploadDialog(true)} style={{ background: NEON, color: "#0a0f1c", fontWeight: 700 }}>
                  <Upload className="w-4 h-4 mr-2" />Upload Reel
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ──── SCREENSHOTS ──── */}
        {activeTab === "screenshots" && (
          <div className="py-5 space-y-6">
            {/* Official Screenshots */}
            <div>
              <h3 className="font-black text-white text-base mb-3 flex items-center gap-2">
                <Camera className="w-4 h-4" style={{ color: NEON }} />Official Screenshots
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {Array(3).fill(0).map((_, i) => (
                  <div key={i} className="aspect-video rounded-xl overflow-hidden cursor-pointer"
                    style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${CARD_BORDER}` }}
                    onClick={() => setSelectedScreenshot({ id: i, imageUrl: game.imageUrl || "https://placehold.co/400x225/0B1218/333?text=Screenshot", title: `Official Screenshot ${i + 1}` })}>
                    <img src={game.imageUrl || "https://placehold.co/400x225/0B1218/333?text=Screenshot"}
                      alt={`Official ${i + 1}`} className="w-full h-full object-cover opacity-60 hover:opacity-100 transition-opacity" />
                  </div>
                ))}
              </div>
            </div>

            {/* Community Screenshots */}
            <div>
              <h3 className="font-black text-white text-base mb-3 flex items-center gap-2">
                <Users className="w-4 h-4" style={{ color: NEON }} />Community Screenshots
              </h3>
              {isLoadingScreenshots ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {Array(6).fill(0).map((_, i) => <Skeleton key={i} className="aspect-video rounded-xl" />)}
                </div>
              ) : allScreenshots && allScreenshots.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {allScreenshots.map((shot: any) => (
                    <div key={shot.id} className="aspect-video rounded-xl overflow-hidden cursor-pointer"
                      style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${CARD_BORDER}` }}
                      onClick={() => setSelectedScreenshot(shot)}>
                      <img src={shot.imageUrl} alt={shot.title} className="w-full h-full object-cover hover:opacity-90 transition-opacity" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: `1px dashed ${CARD_BORDER}` }}>
                  <Camera className="w-10 h-10 mx-auto mb-3 text-gray-600" />
                  <p className="text-sm text-gray-400">No community screenshots yet</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ──── BOUNTIES ──── */}
        {activeTab === "bounties" && (
          <div className="py-5 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="font-black text-white text-base flex items-center gap-2">
                <Sword className="w-5 h-5" style={{ color: NEON }} />Creator Mission Board
              </h2>
              {canCreateBounty && (
                <Button size="sm" onClick={() => setShowCreateBounty(true)}
                  className="font-bold text-xs"
                  style={{ background: NEON, color: "#0a0f1c", boxShadow: "0 4px 16px rgba(193,255,0,0.25)" }}>
                  <Plus className="w-3.5 h-3.5 mr-1.5" />Create Bounty
                </Button>
              )}
            </div>

            {/* Bounty stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard value={bountyStats?.activeBounties ?? 0} label="Active Bounties" icon={Target} />
              <StatCard value={bountyStats?.creatorsJoined ?? 0} label="Creators Joined" icon={Users} />
              <StatCard value={bountyStats?.keysAvailable ?? 0} label="Keys Available" icon={Key} />
              <StatCard value={allClips.length} label="Content Generated" icon={Play} />
            </div>

            {bountiesLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-48 rounded-2xl" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Skeleton className="h-52 rounded-2xl" /><Skeleton className="h-52 rounded-2xl" />
                </div>
              </div>
            ) : bounties.length === 0 ? (
              <div className="text-center py-16 rounded-2xl"
                style={{ background: "rgba(193,255,0,0.03)", border: "1px dashed rgba(193,255,0,0.15)" }}>
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                  style={{ background: "rgba(193,255,0,0.08)", border: "1px solid rgba(193,255,0,0.15)" }}>
                  <Sword className="w-8 h-8" style={{ color: NEON }} />
                </div>
                <h3 className="text-lg font-black text-white mb-2">No Active Bounties</h3>
                <p className="text-sm text-gray-400 mb-5 max-w-xs mx-auto">
                  {canCreateBounty
                    ? "Launch your first creator campaign to start growing your game's community."
                    : "No creator campaigns are running right now. Check back soon!"}
                </p>
                {canCreateBounty && (
                  <Button onClick={() => setShowCreateBounty(true)}
                    style={{ background: NEON, color: "#0a0f1c", fontWeight: 700, boxShadow: "0 8px 24px rgba(193,255,0,0.25)" }}>
                    <Plus className="w-4 h-4 mr-2" />Create First Bounty
                  </Button>
                )}
              </div>
            ) : (
              <>
                <FeaturedBountyCard
                  bounty={bounties[0]}
                  onAccept={handleAcceptBounty}
                  accepting={acceptingBountyId === bounties[0].id}
                  alreadyAccepted={acceptedBounties.has(bounties[0].id)}
                />
                {bounties.length > 1 && (
                  <div>
                    <h3 className="font-black text-white text-sm mb-3 flex items-center gap-2">
                      <Flame className="w-4 h-4" style={{ color: NEON }} />Open Bounties
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {bounties.slice(1).map(bounty => (
                        <BountyCard key={bounty.id} bounty={bounty} onAccept={handleAcceptBounty}
                          accepting={acceptingBountyId === bounty.id}
                          alreadyAccepted={acceptedBounties.has(bounty.id)} />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Dialogs */}
      <Dialog open={showUploadDialog} onOpenChange={(v) => !v && handleUploadClose()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0" style={{ background: "#0B1218", border: "1px solid rgba(193,255,0,0.2)" }}>
          <Suspense fallback={<div className="p-8 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></div>}>
            <UploadPage />
          </Suspense>
        </DialogContent>
      </Dialog>

      <CreateBountyDialog open={showCreateBounty} onClose={() => setShowCreateBounty(false)}
        gameId={game?.id ?? 0} onCreated={() => queryClient.invalidateQueries({ queryKey: ["/api/games", game?.id, "bounties"] })} />

      {/* Screenshot lightbox */}
      {selectedScreenshot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4" onClick={() => setSelectedScreenshot(null)}>
          <div className="relative max-w-4xl max-h-[90vh] w-full">
            <img src={selectedScreenshot.imageUrl} alt={selectedScreenshot.title}
              className="w-full h-full object-contain rounded-xl" />
            <button onClick={() => setSelectedScreenshot(null)}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default IndieGamePage;
