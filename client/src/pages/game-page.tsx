import { useState, useMemo, lazy, Suspense } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { useMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ClipWithUser, Game, GameBounty } from "@shared/schema";
import { Upload, ArrowLeft, Play, TrendingUp, Camera, Users, Clock, Calendar, CalendarDays, X, Mail } from "lucide-react";
import { BookmarkButton } from "@/components/engagement/BookmarkButton";
import VideoClipGridItem from "@/components/clips/VideoClipGridItem";
import { MobileTrendingViewer } from "@/components/clips/MobileTrendingViewer";
import MobileClipsViewerOverlay from "@/components/clips/MobileClipsViewerOverlay";
import { ScreenshotCard } from "@/components/screenshots/ScreenshotCard";
import { MobileScreenshotsViewer } from "@/components/screenshots/MobileScreenshotsViewer";
import { ScreenshotLightbox } from "@/components/screenshots/ScreenshotLightbox";
import {
  ArrowLeft, Play, Camera, Users, Clock, Calendar, CalendarDays,
  Trophy, Zap, Key, Star, Gift, Sword, Plus, Upload, X,
  ChevronRight, Loader2, Radio, Target, Shield, Flame,
  BarChart3, Video, Eye, TrendingUp,
} from "lucide-react";

const UploadPage = lazy(() => import("./UploadPage"));

const NEON = "#c1ff00";
const CARD_BG = "rgba(255,255,255,0.04)";
const CARD_BORDER = "rgba(255,255,255,0.09)";

const TABS = [
  { id: "overview",  label: "Overview",  icon: BarChart3 },
  { id: "bounties",  label: "Bounties",  icon: Sword },
  { id: "clips",     label: "Clips",     icon: Play },
  { id: "reels",     label: "Reels",     icon: Video },
  { id: "creators",  label: "Creators",  icon: Users },
  { id: "streams",   label: "Streams",   icon: Radio },
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

function BountyCard({
  bounty, onAccept, accepting, alreadyAccepted
}: {
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

function FeaturedBountyCard({
  bounty, onAccept, accepting, alreadyAccepted
}: {
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

function CreateBountyDialog({
  open, onClose, gameId, onCreated
}: {
  open: boolean;
  onClose: () => void;
  gameId: number;
  onCreated: () => void;
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
          <div>
            <label style={labelStyle}>Bounty Title *</label>
            <input style={inputStyle} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Best Gameplay Montage" required />
          </div>
          <div>
            <label style={labelStyle}>Description</label>
            <textarea style={{ ...inputStyle, minHeight: "80px", resize: "vertical" }} value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe what creators need to do to earn the reward..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={labelStyle}>Reward Type</label>
              <select style={inputStyle} value={rewardType} onChange={e => setRewardType(e.target.value)}>
                <option value="game_key">Game Key</option>
                <option value="xp">XP Boost</option>
                <option value="badge">Creator Badge</option>
                <option value="featured">Featured Creator</option>
                <option value="early_access">Early Access</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Reward Value</label>
              <input style={inputStyle} value={rewardValue} onChange={e => setRewardValue(e.target.value)} placeholder="e.g. Steam Key, 500 XP" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label style={labelStyle}>Keys Available</label>
              <input style={inputStyle} type="number" min="0" value={keyCount} onChange={e => setKeyCount(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Creator Slots</label>
              <input style={inputStyle} type="number" min="1" value={creatorSlots} onChange={e => setCreatorSlots(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Difficulty</label>
              <select style={inputStyle} value={difficulty} onChange={e => setDifficulty(e.target.value)}>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>
          <div>
            <label style={labelStyle}>End Date (optional)</label>
            <input style={inputStyle} type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
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

const GamePage = () => {
  const [, navigate] = useLocation();
  const [match, params] = useRoute("/games/:gameSlug");
  const gameSlug = params?.gameSlug;
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

  const { data: game, isLoading: gameLoading } = useQuery<Game>({
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

  // "Ever" (all-time) is meant to show the full history for the game, not just
  // the top-20-by-engagement — since most clips/reels/screenshots tend to have
  // similar (often zero) engagement, the engagement-desc ordering ties back to
  // most-recent-first, making "Ever" look identical to "Most Recent" when it's
  // capped at the same small limit. Request a much larger page for "ever".
  const trendingLimit = timePeriod === 'ever' ? '500' : '20';

  const { data: trendingClips, isLoading: isLoadingClips } = useQuery<ClipWithUser[]>({
    queryKey: ["/api/clips/trending", timePeriod, game?.id],
    queryFn: async () => {
      const params = new URLSearchParams({
        period: timePeriod,
        limit: trendingLimit,
        gameId: game?.id?.toString() || '',
      });
      const response = await fetch(`/api/clips/trending?${params}`);
      if (!response.ok) throw new Error('Failed to fetch trending clips');
      return response.json();
    },
    enabled: activeTab === "clips" && !!game?.id,
  });

  const { data: trendingReels, isLoading: isLoadingReels } = useQuery<ClipWithUser[]>({
    queryKey: ["/api/reels/trending", timePeriod, game?.id],
    queryFn: async () => {
      const params = new URLSearchParams({
        period: timePeriod,
        limit: trendingLimit,
        gameId: game?.id?.toString() || '',
      });
      const response = await fetch(`/api/reels/trending?${params}`);
      if (!response.ok) throw new Error('Failed to fetch trending reels');
      return response.json();
    },
    enabled: activeTab === "reels" && !!game?.id,
  });

  const { data: screenshots, isLoading: isLoadingScreenshots } = useQuery<any[]>({
    queryKey: ["/api/games", game?.id, "screenshots", timePeriod],
    queryFn: async () => {
      const params = new URLSearchParams({
        period: timePeriod,
        limit: trendingLimit,
        gameId: game?.id?.toString() || '',
      });
      const response = await fetch(`/api/screenshots?${params}`);
      if (!response.ok) throw new Error('Failed to fetch screenshots');
      return response.json();
    },
    enabled: false,
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

  if (!match || !gameSlug) return <div className="p-8 text-center text-gray-400">Game not found</div>;

  if (gameLoading) {
    return (
      <div className="py-6 px-4 sm:px-6">
        <Skeleton className="h-8 w-32 mb-6" />
        <div className="flex gap-5 mb-8">
          <Skeleton className="w-28 h-28 rounded-[20px] flex-shrink-0" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-72" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-20" /><Skeleton className="h-8 w-20" />
            </div>
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
          <h1 className="text-2xl font-bold mb-2">Game not found</h1>
          <p className="text-gray-400">The game you're looking for doesn't exist.</p>
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

      {/* ── HEADER ── */}
      <div className="relative overflow-hidden" style={{ background: "linear-gradient(180deg, rgba(193,255,0,0.05) 0%, transparent 100%)" }}>
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute w-64 h-64 rounded-full blur-[80px]" style={{ background: "rgba(193,255,0,0.06)", top: "-20%", right: "10%" }} />
        </div>
        <div className="relative px-4 sm:px-6 pt-4 pb-0">
          <button onClick={() => navigate("/explore")} className="flex items-center gap-1 text-sm text-gray-400 hover:text-white mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" />Back to Explore
          </button>
          <BookmarkButton
            contentId={game.id}
            contentType="game"
            size={isMobile ? 20 : 24}
            className="absolute top-4 right-4 sm:right-6"
          />

          <div className="flex items-start gap-4 sm:gap-5 mb-5">
            {/* Square rounded game image */}
            <div className="flex-shrink-0 relative group">
              <div
                className="overflow-hidden transition-all duration-300"
                style={{
                  width: isMobile ? "96px" : "112px",
                  height: isMobile ? "96px" : "112px",
                  borderRadius: "20px",
                  border: `1.5px solid rgba(193,255,0,0.35)`,
                  boxShadow: "0 0 32px rgba(193,255,0,0.22), 0 8px 32px rgba(0,0,0,0.5)",
                }}
              >
                <img
                  src={game.imageUrl || `https://placehold.co/320x320/111/333?text=${encodeURIComponent(game.name.charAt(0))}`}
                  alt={game.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
            </div>

            {/* Game info */}
            <div className="flex-1 min-w-0 pt-1">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div className="min-w-0">
                  {game.isUserAdded && (
                    <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full mb-1.5"
                      style={{ background: "rgba(193,255,0,0.12)", color: NEON, border: "1px solid rgba(193,255,0,0.25)" }}>
                      <Sword className="w-2.5 h-2.5" />Indie Game
                    </span>
                  )}
                  <h1 className={`font-black text-white leading-tight truncate ${isMobile ? "text-xl" : "text-2xl"}`}>{game.name}</h1>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 mt-2 mb-3">
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <Play className="w-3 h-3" style={{ color: NEON }} />
                  {allClips.filter((c: any) => !c.videoType || c.videoType === "clip").length} clips
                </span>
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <Users className="w-3 h-3" style={{ color: NEON }} />
                  {uniqueCreators.length} creators
                </span>
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <Eye className="w-3 h-3" style={{ color: NEON }} />
                  {totalViews.toLocaleString()} views
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => setShowUploadDialog(true)}
                  className="font-bold text-xs"
                  style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", color: "#fff" }}>
                  <Upload className="w-3.5 h-3.5 mr-1.5" />Upload
                </Button>
                {canCreateBounty && (
                  <Button size="sm" onClick={() => setShowCreateBounty(true)}
                    className="font-bold text-xs"
                    style={{ background: NEON, color: "#0a0f1c", boxShadow: "0 4px 16px rgba(193,255,0,0.25)" }}>
                    <Plus className="w-3.5 h-3.5 mr-1.5" />Create Bounty
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* ── TAB BAR ── */}
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
      </div>

      {/* ── TAB CONTENT ── */}
      <div className="px-4 sm:px-6 pb-24">

        {/* ──── OVERVIEW ──── */}
        {activeTab === "overview" && (
          <div className="py-5 space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard value={bountyStats?.activeBounties ?? 0} label="Active Bounties" icon={Sword} />
              <StatCard value={allClips.filter((c: any) => !c.videoType || c.videoType === "clip").length} label="Clips" icon={Play} />
              <StatCard value={uniqueCreators.length} label="Creators" icon={Users} />
              <StatCard value={totalViews.toLocaleString()} label="Total Views" icon={Eye} />
            </div>

            {allClips.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-black text-white text-base">Recent Clips</h2>
                  <button onClick={() => setActiveTab("clips")} className="text-xs font-bold flex items-center gap-1" style={{ color: NEON }}>
                    View all <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {allClips.filter((c: any) => !c.videoType || c.videoType === "clip").slice(0, 6).map((clip: any) => (
                    <VideoClipGridItem key={clip.id} clip={clip} userId={user?.id} compact={false} clipsList={allClips as ClipWithUser[]} />
                  ))}
                </div>
              </div>
            )}

            {uniqueCreators.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-black text-white text-base">Top Creators</h2>
                  <button onClick={() => setActiveTab("creators")} className="text-xs font-bold flex items-center gap-1" style={{ color: NEON }}>
                    View all <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-3">
                  {uniqueCreators.slice(0, 6).map((creator: any) => (
                    <Link key={creator.id} href={`/profile/${creator.username}`}>
                      <div className="flex items-center gap-2 rounded-xl px-3 py-2 cursor-pointer transition-colors hover:bg-white/5"
                        style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
                        <Avatar className="w-7 h-7">
                          <AvatarImage src={creator.avatarUrl || ""} alt={creator.username} />
                          <AvatarFallback className="text-xs">{creator.username?.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="text-sm font-bold text-white leading-none">{creator.displayName || creator.username}</div>
                          <div className="text-[10px] text-gray-400">{creator.uploadCount} uploads</div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
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
              <StatCard value={allClips.length} label="Content Created" icon={Play} />
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
                {/* Featured bounty */}
                <FeaturedBountyCard
                  bounty={bounties[0]}
                  onAccept={handleAcceptBounty}
                  accepting={acceptingBountyId === bounties[0].id}
                  alreadyAccepted={acceptedBounties.has(bounties[0].id)}
                />

                {/* Remaining bounties */}
                {bounties.length > 1 && (
                  <div>
                    <h3 className="font-black text-white text-sm mb-3 flex items-center gap-2">
                      <Flame className="w-4 h-4" style={{ color: NEON }} />Open Bounties
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {bounties.slice(1).map(bounty => (
                        <BountyCard
                          key={bounty.id}
                          bounty={bounty}
                          onAccept={handleAcceptBounty}
                          accepting={acceptingBountyId === bounty.id}
                          alreadyAccepted={acceptedBounties.has(bounty.id)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
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
                <select
                  value={selectedUserId}
                  onChange={e => setSelectedUserId(e.target.value)}
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
                    onCardClick={isMobile ? (id) => { const idx = clipData.findIndex((c: any) => c.id === id); setMobileViewerIndex(idx >= 0 ? idx : 0); setMobileViewerClipId(id); setMobileViewerOpen(true); } : undefined} />
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

        {/* ──── CREATORS ──── */}
        {activeTab === "creators" && (
          <div className="py-5">
            {uniqueCreators.length === 0 ? (
              <div className="text-center py-16">
                <Users className="w-12 h-12 mx-auto mb-3 text-gray-600" />
                <h3 className="text-lg font-semibold mb-1">No creators yet</h3>
                <p className="text-gray-400 text-sm mb-4">Be the first creator to upload content for {game.name}</p>
                <Button onClick={() => setShowUploadDialog(true)} style={{ background: NEON, color: "#0a0f1c", fontWeight: 700 }}>
                  <Upload className="w-4 h-4 mr-2" />Upload Content
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {uniqueCreators.map((creator: any) => (
                  <Link key={creator.id} href={`/profile/${creator.username}`}>
                    <div className="flex items-center gap-3 rounded-xl p-4 cursor-pointer transition-all hover:scale-[1.01]"
                      style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
                      <Avatar className="w-11 h-11 flex-shrink-0">
                        <AvatarImage src={creator.avatarUrl || ""} alt={creator.username} />
                        <AvatarFallback>{creator.username?.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-white text-sm truncate">{creator.displayName || creator.username}</div>
                        <div className="text-xs text-gray-400">@{creator.username}</div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-sm font-black text-white">{creator.uploadCount}</div>
                        <div className="text-[10px] uppercase font-bold tracking-widest" style={{ color: NEON }}>Uploads</div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ──── STREAMS ──── */}
        {activeTab === "streams" && (
          <div className="py-5">
            <div className="text-center py-16 rounded-2xl"
              style={{ background: "rgba(193,255,0,0.03)", border: "1px dashed rgba(193,255,0,0.12)" }}>
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: "rgba(193,255,0,0.08)", border: "1px solid rgba(193,255,0,0.15)" }}>
                <Radio className="w-8 h-8" style={{ color: NEON }} />
              </div>
              <h3 className="text-lg font-black text-white mb-2">Live Streams</h3>
              <p className="text-sm text-gray-400 max-w-xs mx-auto mb-5">
                Live stream discovery for {game.name} is coming soon. Connect your Twitch or Kick to get featured here.
              </p>
              <Button onClick={() => navigate("/settings")}
                style={{ background: "rgba(255,255,255,0.07)", border: `1px solid ${CARD_BORDER}`, color: "#fff", fontWeight: 700 }}>
                Connect Streaming Accounts
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Contact banner for unverified user-added games */}
      {game.isUserAdded && game.showContactBanner && (
        <div className="mx-4 sm:mx-6 mb-4 rounded-xl p-4 flex items-start gap-3"
          style={{ background: "rgba(193,255,0,0.05)", border: "1px solid rgba(193,255,0,0.15)" }}>
          <Sword className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: NEON }} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white">Is this your game?</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Contact us to verify ownership and unlock full developer features.{" "}
              <a href={`mailto:support@gamefolio.com?subject=${encodeURIComponent(game.name)}`}
                className="underline" style={{ color: NEON }}>
                Email support@gamefolio.com
              </a>
            </p>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {selectedScreenshot && isMobile ? (
        <MobileScreenshotsViewer screenshots={[]} startId={selectedScreenshot.id} onBack={() => setSelectedScreenshot(null)} />
      ) : (
        <ScreenshotLightbox screenshot={selectedScreenshot} onClose={() => setSelectedScreenshot(null)} screenshots={[]} onNavigate={(s: any) => setSelectedScreenshot(s)} />
      )}

      {/* Upload dialog */}
      <Dialog open={showUploadDialog} onOpenChange={open => { if (!open) handleUploadClose(); else setShowUploadDialog(true); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
          <Suspense fallback={<div className="p-8 text-center"><Skeleton className="h-8 w-48 mx-auto mb-4" /><Skeleton className="h-4 w-64 mx-auto" /></div>}>
            <UploadPage />
          </Suspense>
        </DialogContent>
      </Dialog>

      {/* Create bounty dialog */}
      {game?.id && (
        <CreateBountyDialog
          open={showCreateBounty}
          onClose={() => setShowCreateBounty(false)}
          gameId={game.id}
          onCreated={() => {
            queryClient.invalidateQueries({ queryKey: ["/api/games", game.id, "bounties"] });
            queryClient.invalidateQueries({ queryKey: ["/api/games", game.id, "bounty-stats"] });
          }}
        />
      )}
    </>
  );
};

export default GamePage;
