import React, { useState, useEffect, useMemo, useRef } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient, getQueryFn } from "@/lib/queryClient";
import { Game, User, UserWithStats, ClipWithUser, Screenshot } from "@shared/schema";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CustomAvatar } from "@/components/ui/custom-avatar";
import VideoClipGridItem from "@/components/clips/VideoClipGridItem";
import { NameTagDetailDialog } from "@/components/store/NameTagDetailDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { LevelBadgeWithProgress } from "@/components/profile/LevelBadgeWithProgress";
import { 
  Heart, 
  Users, 
  Youtube, 
  Gamepad,
  Gamepad2,
  UserCog,
  Share,
  X,
  UserPlus,
  UserCheck,
  Mail,
  Eye,
  Clock,
  Flame,
  Share2,
  User as UserIcon,
  MessageSquare,
  Flag,
  Home,
  Search,
  Loader2,
  Trophy,
  Video,
  Upload,
  Code,
  Coffee,
  Scroll,
  Pin,
  Hexagon,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Camera
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { 
  SiSteam,
  SiPlaystation,
  SiDiscord,
  SiEpicgames,
} from "react-icons/si";
import { FaXbox, FaPlaystation, FaYoutube, FaInstagram, FaFacebook } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogClose,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { ScreenshotCard } from "@/components/screenshots/ScreenshotCard";
import { ScreenshotLightbox } from "@/components/screenshots/ScreenshotLightbox";
import { LikeButton } from "@/components/engagement/LikeButton";
import { FireButton } from "@/components/engagement/FireButton";
import { ModeratorIcon } from "@/components/ui/moderator-icon";
import { ModeratorBadge } from "@/components/ui/moderator-badge";
import { VerificationBadge } from "@/components/ui/verification-badge";
import { ReportButton } from "@/components/reporting/ReportButton";
import { useProfilePictureLightbox } from "@/components/ui/profile-picture-lightbox";
import { BannerLightbox, useBannerLightbox } from "@/components/ui/banner-lightbox";
import { JoinGamefolioDialog } from "@/components/auth/JoinGamefolioDialog";
import ProUpgradeDialog from "@/components/ProUpgradeDialog";
import { useSignedUrl } from "@/hooks/use-signed-url";
import { useJoinDialog } from "@/hooks/use-join-dialog";
import { useClipDialog } from "@/hooks/use-clip-dialog";
import { formatDistance } from "date-fns";
import { cn } from "@/lib/utils";
import NotFound from "./not-found";
import MintedNftDetailScreen from "@/components/mint/MintedNftDetailScreen";
import { SKALE_NEBULA_TESTNET, NFT_CONTRACT_ADDRESS } from "@shared/contracts";

const GameSelectionDialog = React.lazy(() => import("@/components/games/GameSelectionDialog"));
const CommentSection = React.lazy(() => import("@/components/clips/CommentSection"));
const ClipShareDialog = React.lazy(() => import("@/components/clip/ClipShareDialog").then(m => ({ default: m.ClipShareDialog })));
const ScreenshotShareDialog = React.lazy(() => import("@/components/screenshot/ScreenshotShareDialog").then(m => ({ default: m.ScreenshotShareDialog })));
const GamefolioShareDialog = React.lazy(() => import("@/components/profile/GamefolioShareDialog").then(m => ({ default: m.GamefolioShareDialog })));
const MessageDialog = React.lazy(() => import("@/components/messages/MessageDialog").then(m => ({ default: m.MessageDialog })));
const ReportDialog = React.lazy(() => import("@/components/content/ReportDialog").then(m => ({ default: m.ReportDialog })));
const ProfilePictureLightbox = React.lazy(() => import("@/components/ui/profile-picture-lightbox").then(m => ({ default: m.ProfilePictureLightbox })));
const ScreenshotCommentSection = React.lazy(() => import("@/components/screenshots/ScreenshotCommentSection").then(m => ({ default: m.ScreenshotCommentSection })));

interface OwnedNft {
  tokenId: number;
  name: string;
  image: string | null;
  description?: string;
  attributes?: Array<{ trait_type: string; value: string | number }>;
  txHash?: string;
  mintedAt?: string;
  sold?: boolean;
  soldAt?: string | null;
  listedPrice?: number | null;
  listingActive?: boolean;
}

interface OwnedNftsData {
  nfts: OwnedNft[];
  count: number;
}

const RARE_TRAITS: Record<string, string[]> = {
  Background: ["Melting_gold", "Aurora", "Neon_city", "Galaxy", "Diamond"],
  Hand: ["Cyber_punk_sword", "Lightning_staff", "Golden_scepter", "Plasma_gun"],
  Skin: ["Diamond_skin", "Galaxy_skin", "Golden_skin", "Holographic_skin"],
  Costume: ["Legendary_armor", "Royal_cape", "Cyber_suit", "Dragon_scale"],
  Eyes: ["Laser_eyes", "Diamond_eyes", "Galaxy_eyes", "Fire_eyes"],
  Mouth: ["Golden_grill", "Diamond_teeth", "Flame_breath"],
  Headwear: ["Crown", "Halo", "Dragon_horns", "Diamond_tiara"],
};

function computeNftRarityScore(nft: OwnedNft): number {
  if (!nft.attributes || nft.attributes.length === 0) return 30;
  let score = 0;
  const traitCount = nft.attributes.length;
  score += Math.min(traitCount * 8, 40);
  for (const attr of nft.attributes) {
    const traitType = attr.trait_type;
    const traitValue = String(attr.value);
    const rareList = RARE_TRAITS[traitType];
    if (rareList && rareList.some(r => traitValue.toLowerCase().includes(r.toLowerCase()))) {
      score += 15;
    }
  }
  let hash = 0;
  const combo = nft.attributes.map(a => `${a.trait_type}:${a.value}`).join('|');
  for (let i = 0; i < combo.length; i++) {
    hash = ((hash << 5) - hash + combo.charCodeAt(i)) | 0;
  }
  score += Math.abs(hash % 20);
  return Math.min(score, 100);
}

function getNftRarity(nft: OwnedNft): { label: string; score: number } {
  const rarityAttr = nft.attributes?.find(a => a.trait_type.toLowerCase() === "rarity");
  if (rarityAttr) {
    const val = String(rarityAttr.value).toLowerCase();
    if (val === "legendary") return { label: "legendary", score: 95 };
    if (val === "epic") return { label: "epic", score: 80 };
    if (val === "rare") return { label: "rare", score: 55 };
    if (val === "common") return { label: "common", score: 25 };
  }
  const score = computeNftRarityScore(nft);
  if (score >= 85) return { label: "legendary", score };
  if (score >= 65) return { label: "epic", score };
  if (score >= 40) return { label: "rare", score };
  return { label: "common", score };
}

const rarityCardStyles: Record<string, { bg: string; glow: string; dotColor: string; textStyle: string; nameColor: string }> = {
  legendary: {
    bg: "bg-gradient-to-b from-[#f6cfff] via-[#cefafe] to-[#fff085]",
    glow: "shadow-[0_0_25px_rgba(236,72,153,0.4)]",
    dotColor: "bg-primary shadow-[0_0_8px_#A2F000]",
    textStyle: "bg-gradient-to-r from-[#B7FF1A] to-[#A2F000] bg-clip-text text-transparent font-black",
    nameColor: "text-slate-800",
  },
  epic: {
    bg: "bg-slate-900",
    glow: "",
    dotColor: "bg-primary shadow-[0_0_8px_#6FA800]",
    textStyle: "text-slate-400 font-normal",
    nameColor: "text-slate-50",
  },
  rare: {
    bg: "bg-gradient-to-b from-[#B7FF1A33] via-[#14532d4d] to-[#B7FF1A33]",
    glow: "",
    dotColor: "bg-primary shadow-[0_0_8px_#B7FF1A]",
    textStyle: "text-slate-400 font-normal",
    nameColor: "text-slate-50",
  },
  common: {
    bg: "bg-slate-900",
    glow: "",
    dotColor: "bg-slate-400/50 shadow-[0_0_8px_#1e293b]",
    textStyle: "text-slate-400 font-normal",
    nameColor: "text-slate-50",
  },
};

const userTypeConfig: Record<string, { label: string; icon: any; color: string }> = {
  streamer: { label: "Streamer", icon: Video, color: "bg-primary/20 text-primary border-primary/30" },
  gamer: { label: "Gamer", icon: Gamepad2, color: "bg-primary/20 text-primary border-primary/30" },
  professional_gamer: { label: "Professional Gamer", icon: Trophy, color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  content_creator: { label: "Content Creator", icon: Upload, color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  indie_developer: { label: "Indie Developer", icon: Code, color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" },
  viewer: { label: "Viewer", icon: Eye, color: "bg-gray-500/20 text-gray-400 border-gray-500/30" },
  filthy_casual: { label: "Filthy Casual", icon: Coffee, color: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  doom_scroller: { label: "Doom Scroller", icon: Scroll, color: "bg-red-500/20 text-red-400 border-red-500/30" },
};

const ProfilePage = () => {
  const params = useParams();
  const { username: rawUsername, screenshotId, shareCode, clipShareCode, reelShareCode } = params;
  // Normalize username by removing @ prefix if present (from /@username routes)
  const username = rawUsername?.startsWith('@') ? rawUsername.slice(1) : rawUsername;
  const [location, setLocation] = useLocation();
  
  // Block access to the gamefolio system user - redirect to home
  useEffect(() => {
    if (username?.toLowerCase() === "gamefolio") {
      setLocation("/");
    }
  }, [username, setLocation]);

  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const { lightboxData, openLightbox, closeLightbox } = useProfilePictureLightbox();
  const { lightboxData: bannerLightboxData, openLightbox: openBannerLightbox, closeLightbox: closeBannerLightbox } = useBannerLightbox();
  const isOwnProfile = currentUser?.username === username;

  // Handle highlighting content from share links
  const [highlightedContent, setHighlightedContent] = useState<{type: string, id: string} | null>(null);

  // Share dialog state for newly uploaded content
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareDialogType, setShareDialogType] = useState<'clip' | 'reel' | 'screenshot' | null>(null);
  const [shareDialogId, setShareDialogId] = useState<number | null>(null);
  const [proUpgradeOpen, setProUpgradeOpen] = useState(false);

  // Profile theme scope ref for dynamic styling
  const profileThemeScopeRef = useRef<HTMLDivElement>(null);
  const neoCanvasRef = useRef<HTMLCanvasElement>(null);

  // Screenshot lightbox state
  const [selectedScreenshot, setSelectedScreenshot] = useState<Screenshot | null>(null);
  const [hasLikedScreenshot, setHasLikedScreenshot] = useState(false);
  const [screenshotLikeCount, setScreenshotLikeCount] = useState(0);
  const [isScreenshotFire, setIsScreenshotFire] = useState(false);
  const [isScreenshotAnimating, setIsScreenshotAnimating] = useState(false);

  // Join dialog for guest interactions
  const { isOpen, actionType, openDialog, closeDialog } = useJoinDialog();
  
  // Clip dialog for opening clips/reels
  const { openClipDialog } = useClipDialog();

  // Profile picture action dialog state  
  const [profileActionDialogOpen, setProfileActionDialogOpen] = useState(false);
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [nameTagPreviewOpen, setNameTagPreviewOpen] = useState(false);
  
  // Profile section tab state (stats/bio vs collection)
  const [profileSectionTab, setProfileSectionTab] = useState<'stats' | 'collection'>('stats');
  const [streamExpanded, setStreamExpanded] = useState(false);
  const [selectedProfileNft, setSelectedProfileNft] = useState<OwnedNft | null>(null);

  // Screenshot action handlers
  const handleScreenshotLike = () => {
    if (!currentUser) {
      openDialog("like");
      return;
    }

    setHasLikedScreenshot(!hasLikedScreenshot);
    setScreenshotLikeCount(hasLikedScreenshot ? screenshotLikeCount - 1 : screenshotLikeCount + 1);

    // Trigger animation when liking (not unliking)
    if (!hasLikedScreenshot) {
      setIsScreenshotAnimating(true);
      setTimeout(() => setIsScreenshotAnimating(false), 2000);
    }

    toast({
      title: hasLikedScreenshot ? "Unliked" : "Liked!",
      description: hasLikedScreenshot ? "Removed from your liked screenshots" : "Added to your liked screenshots ❤️",
      variant: "default"
    });
  };

  const handleScreenshotFire = () => {
    if (!currentUser) {
      openDialog("like");  // Using 'like' as it's similar to fire reaction
      return;
    }

    setIsScreenshotFire(!isScreenshotFire);
    toast({
      title: isScreenshotFire ? "Removed fire" : "Added fire!",
      description: isScreenshotFire ? "This screenshot is no longer fire" : "You marked this screenshot as fire!",
      variant: "default",
    });
  };

  // Reset screenshot state when modal closes
  useEffect(() => {
    if (!selectedScreenshot) {
      setIsScreenshotFire(false);
      setHasLikedScreenshot(false);
      setScreenshotLikeCount(0);
    }
  }, [selectedScreenshot]);

  // Initialize screenshot like count when selected
  useEffect(() => {
    if (selectedScreenshot) {
      // In a real app, this would fetch the actual like count from the API
      setScreenshotLikeCount(0);
      setHasLikedScreenshot(false);
    }
  }, [selectedScreenshot]);

  useEffect(() => {
    // Check if there's a hash in the URL for content highlighting
    const hash = window.location.hash;
    if (hash) {
      const match = hash.match(/#(clip|screenshot|reel)-(\d+)/);
      if (match) {
        const [, type, id] = match;
        setHighlightedContent({ type, id });

        // Auto-scroll to the appropriate tab
        if (type === 'screenshot') {
          setActiveTab('screenshots');
        } else {
          setActiveTab('clips');
        }

        // Auto-open share dialog for newly uploaded content (only on own profile)
        if (isOwnProfile) {
          const contentId = parseInt(id);
          if (type === 'screenshot') {
            setShareDialogType('screenshot');
            setShareDialogId(contentId);
            setShareDialogOpen(true);
          } else if (type === 'clip' || type === 'reel') {
            setShareDialogType(type as 'clip' | 'reel');
            setShareDialogId(contentId);
            setShareDialogOpen(true);
          }
        }

        // Scroll to highlighted content after a short delay to ensure rendering
        setTimeout(() => {
          const element = document.getElementById(`${type}-${id}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Clear highlight after 5 seconds (longer since share dialog is open)
            setTimeout(() => setHighlightedContent(null), 5000);
          }
        }, 500);
      }
    }
  }, [location, isOwnProfile]);

  // Fetch user profile data with stats
  const { data: profile, isLoading: isLoadingProfile, error: profileError } = useQuery<UserWithStats>({
    queryKey: [`/api/users/${username}`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!username,
    retry: (failureCount, error: any) => {
      // Don't retry on 404 (user not found) or 403 (private profile)
      if (error?.status === 404 || error?.status === 403) {
        return false;
      }
      return failureCount < 3;
    },
  });

  // Get signed URL for profile avatar (private bucket)
  const { signedUrl: profileAvatarSignedUrl } = useSignedUrl(profile?.avatarUrl);
  const { signedUrl: screenshotSignedUrl } = useSignedUrl(selectedScreenshot?.imageUrl);
  const { signedUrl: bannerSignedUrl } = useSignedUrl(profile?.bannerUrl);
  const { signedUrl: bgImageSignedUrl } = useSignedUrl((profile as any)?.profileBackgroundImageUrl || null);

  // Fetch user's selected verification badge
  const { data: verificationBadgeData } = useQuery<{ verificationBadge: { id: number; name: string; imageUrl: string } | null }>({
    queryKey: [`/api/user/${profile?.id}/verification-badge`],
    queryFn: getQueryFn({ on401: 'returnNull' }),
    enabled: !!profile?.id,
  });

  const isStreamer = !!(profile?.userType?.split(',').map(t => t.trim()).includes('streamer'));
  const hasStreamSetup = !!(isStreamer && (profile?.twitchVerified || profile?.kickVerified));
  const { data: profileLiveStatus } = useQuery<{
    isLive: boolean;
    twitchLive: boolean;
    kickLive: boolean;
    activePlatform: string | null;
    activeChannel: string | null;
    twitchChannel: string | null;
    kickChannel: string | null;
  }>({
    queryKey: [`/api/user/${profile?.id}/live-status`],
    queryFn: getQueryFn({ on401: 'returnNull' }),
    enabled: !!profile?.id && hasStreamSetup,
    staleTime: 60 * 1000,
    refetchInterval: 2 * 60 * 1000,
  });

  const profileNftQueryKey = isOwnProfile ? "/api/nfts/owned" : `/api/nfts/user/${profile?.id}`;
  const { data: profileNftData, isLoading: profileNftsLoading, refetch: refetchProfileNfts } = useQuery<OwnedNftsData>({
    queryKey: [profileNftQueryKey],
    queryFn: getQueryFn({ on401: isOwnProfile ? "throw" : "returnNull" }),
    enabled: isOwnProfile ? !!currentUser : !!profile?.id,
    staleTime: 60_000,
  });

  // Follow state management with localStorage persistence for demo users
  const getStorageKey = () => `follow_${currentUser?.id}_${profile?.id}`;
  const getFollowerCountKey = () => `follower_count_${profile?.id}`;
  const getFollowingCountKey = () => `following_count_${currentUser?.id}`;

  // Use a state to manage the follow request status (following, requested, not_following)
  const [followRequestStatus, setFollowRequestStatus] = useState<
    'following' | 'requested' | 'not_following'
  >('not_following');
  const isFollowing = followRequestStatus === 'following';

  // Check if current user is following this profile
  const { data: followStatus, isLoading: isLoadingFollowStatus } = useQuery({
    queryKey: [`/api/users/${username}/follow-status`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !isOwnProfile && !!currentUser,
    refetchOnWindowFocus: false,
  });

  // Sync followRequestStatus state with server data (but prioritize localStorage for demo users)
  useEffect(() => {
    if (followStatus !== undefined && !isOwnProfile) {
      console.log('🔄 Syncing follow status. followStatus from server:', followStatus);
      
      // For demo users, prioritize localStorage state over server response
      if (currentUser?.id === 999 || profile?.id === 999) {
        const storageKey = getStorageKey();
        const storedState = localStorage.getItem(storageKey);
        if (storedState) {
          setFollowRequestStatus(storedState as 'following' | 'requested' | 'not_following');
          return;
        }
      }
      
      // For regular users, use server response
      if (followStatus.following) {
        setFollowRequestStatus('following');
      } else if (followStatus.requested) {
        setFollowRequestStatus('requested');
      } else {
        setFollowRequestStatus('not_following');
      } 
    }
  }, [followStatus, isOwnProfile, currentUser?.id, profile?.id]);

  // Determine if content should be hidden due to privacy settings
  const isPrivateProfile = profile?.isPrivate && !isOwnProfile;
  const canViewContent = !isPrivateProfile || isFollowing;

  // Fetch user clips (only if allowed to view content)
  const { data: clips, isLoading: isLoadingClips } = useQuery<ClipWithUser[]>({
    queryKey: [`/api/users/${username}/clips`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!username && canViewContent,
  });

  // Fetch user favorite games (only if allowed to view content)
  const { data: favoriteGames, isLoading: isLoadingFavorites } = useQuery<Game[]>({
    queryKey: [`/api/users/${username}/games/favorites`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!username && canViewContent,
  });

  // Fetch all games for screenshot lightbox
  const { data: games = [] } = useQuery<Game[]>({
    queryKey: ['/api/games'],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!selectedScreenshot, // Only fetch when screenshot lightbox is open
  });

  // Fetch user screenshots (only if allowed to view content)
  const { data: screenshots, isLoading: isLoadingScreenshots } = useQuery<Screenshot[]>({
    queryKey: [`/api/users/${profile?.id}/screenshots`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!profile?.id && canViewContent,
  });

  // Fetch user's selected name tag
  const { data: nameTagData } = useQuery<{ nameTag: { id: number; name: string; imageUrl: string; rarity: string; description?: string | null } | null }>({
    queryKey: ['/api/user', profile?.id, 'name-tag'],
    queryFn: async () => {
      const res = await fetch(`/api/user/${profile?.id}/name-tag`);
      if (!res.ok) return { nameTag: null };
      return res.json();
    },
    enabled: !!profile?.id,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  // Get signed URL for name tag image (private bucket)
  const { signedUrl: nameTagSignedUrl } = useSignedUrl(nameTagData?.nameTag?.imageUrl);

  // Fetch screenshot by shareCode (when shareCode is present in URL)
  const { data: screenshotByShareCode, isLoading: isLoadingScreenshotByShareCode } = useQuery<Screenshot>({
    queryKey: [`/api/screenshots/share/${shareCode}`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!shareCode,
  });

  // Fetch clip by shareCode (when clipShareCode is present in URL)
  const { data: clipByShareCode, isLoading: isLoadingClipByShareCode } = useQuery<ClipWithUser>({
    queryKey: [`/api/clips/share/${clipShareCode}`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!clipShareCode,
  });

  // Fetch reel by shareCode (when reelShareCode is present in URL)
  const { data: reelByShareCode, isLoading: isLoadingReelByShareCode } = useQuery<ClipWithUser>({
    queryKey: [`/api/reels/share/${reelShareCode}`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!reelShareCode,
  });

  // Delete clip mutation
  const deleteClipMutation = useMutation({
    mutationFn: async (clipId: number) => {
      const response = await apiRequest('DELETE', `/api/clips/${clipId}`);
      return response;
    },
    onSuccess: () => {
      // Invalidate clips data to refresh the UI
      queryClient.invalidateQueries({ queryKey: [`/api/users/${username}/clips`] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${username}`] });

      // Invalidate trending content cache so deleted clips don't show up
      queryClient.invalidateQueries({ queryKey: ['/api/clips/trending'] });
      queryClient.invalidateQueries({ queryKey: ['/api/clips/reels/trending'] });
      
      // Invalidate reels queries (for home page, trending page, etc.)
      queryClient.invalidateQueries({ queryKey: ['/api/reels/latest'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reels/trending'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reels'] });

      toast({
        title: "Clip deleted",
        description: "Your clip has been deleted successfully.",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete failed",
        description: error.message || "Failed to delete clip. Please try again.",
        variant: "gamefolioError",
      });
    },
  });

  // Pin/unpin clip mutation
  const pinClipMutation = useMutation({
    mutationFn: async (clipId: number) => {
      const response = await apiRequest('PATCH', `/api/clips/${clipId}/pin`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${username}/clips`] });
      toast({
        title: "Updated",
        description: "Clip pin status updated.",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed",
        description: error.message || "Failed to update pin status.",
        variant: "gamefolioError",
      });
    },
  });

  // Pin/unpin screenshot mutation
  const pinScreenshotMutation = useMutation({
    mutationFn: async (screenshotId: number) => {
      const response = await apiRequest('PATCH', `/api/screenshots/${screenshotId}/pin`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${profile?.id}/screenshots`] });
      toast({
        title: "Updated",
        description: "Screenshot pin status updated.",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed",
        description: error.message || "Failed to update pin status.",
        variant: "gamefolioError",
      });
    },
  });

  // Delete screenshot mutation
  const deleteScreenshotMutation = useMutation({
    mutationFn: async (screenshotId: number) => {
      const response = await apiRequest('DELETE', `/api/screenshots/${screenshotId}`);
      return response;
    },
    onSuccess: () => {
      // Invalidate screenshots data to refresh the UI
      queryClient.invalidateQueries({ queryKey: [`/api/users/${profile?.id}/screenshots`] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${username}`] });
      toast({
        title: "Screenshot deleted",
        description: "Your screenshot has been deleted successfully.",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete failed",
        description: error.message || "Failed to delete screenshot. Please try again.",
        variant: "gamefolioError",
      });
    },
  });

  // Set default tab from URL params or default to "clips"
  const getInitialTab = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    if (tabParam && ['clips', 'reels', 'screenshots', 'favorites', 'achievements'].includes(tabParam)) {
      return tabParam;
    }
    return "clips";
  };
  const [activeTab, setActiveTab] = useState(getInitialTab);

  // Sync tab state with URL for browser back/forward navigation
  const isInitialMount = useRef(true);
  useEffect(() => {
    // Skip on initial mount to avoid pushing duplicate history entry
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    
    const urlParams = new URLSearchParams(window.location.search);
    const currentTab = urlParams.get('tab');
    
    // Only update URL if tab actually changed
    if (currentTab !== activeTab && (activeTab !== 'clips' || currentTab)) {
      if (activeTab !== 'clips') {
        urlParams.set('tab', activeTab);
      } else {
        urlParams.delete('tab');
      }
      const newUrl = urlParams.toString() ? `${window.location.pathname}?${urlParams.toString()}` : window.location.pathname;
      window.history.pushState({ tab: activeTab }, '', newUrl);
    }
  }, [activeTab]);

  // Handle browser back/forward to restore tab state
  useEffect(() => {
    const handlePopState = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const tabParam = urlParams.get('tab');
      if (tabParam && ['clips', 'reels', 'screenshots', 'favorites', 'achievements'].includes(tabParam)) {
        setActiveTab(tabParam);
      } else {
        setActiveTab('clips');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Game selection dialog state
  const [showGameSelection, setShowGameSelection] = useState(false);

  // Handle screenshot URL parameters for automatic modal opening (both ID and shareCode)
  useEffect(() => {
    let screenshot: Screenshot | undefined = undefined;
    
    // Handle screenshotId-based URLs (/@username/screenshots/:screenshotId)
    if (screenshotId && screenshots && Array.isArray(screenshots) && screenshots.length > 0) {
      const screenshotIdNum = parseInt(screenshotId, 10);
      screenshot = screenshots.find(s => s.id === screenshotIdNum);
    }
    
    // Handle shareCode-based URLs (/@username/screenshot/:shareCode)
    if (shareCode && screenshotByShareCode) {
      screenshot = screenshotByShareCode;
    }
    
    if (screenshot) {
      // Open the screenshot modal
      setSelectedScreenshot({
        ...screenshot,
        user: screenshot.user || { id: profile?.id, username: profile?.username, displayName: profile?.displayName, avatarUrl: profile?.avatarUrl },
      });
      
      // Check for comment-related query parameters
      const urlParams = new URLSearchParams(window.location.search);
      
      // Switch to screenshots tab
      setActiveTab('screenshots');
      
      // Handle auto-opening comments if specified
      if (urlParams.get('openComments') === 'true') {
        // Comments will be handled in the screenshot modal - no additional state needed here
        // The CommentSection component will handle highlighting if highlightComment is present
      }
    }
  }, [screenshotId, shareCode, screenshots, screenshotByShareCode, setActiveTab]);

  // Handle clip URL parameters for automatic modal opening (shareCode only for now)
  useEffect(() => {
    let clip: ClipWithUser | undefined = undefined;
    
    // Handle shareCode-based URLs (/@username/clip/:clipShareCode)
    if (clipShareCode && clipByShareCode) {
      clip = clipByShareCode;
    }
    
    if (clip) {
      // Open the clip dialog
      openClipDialog(clip.id);
      
      // Switch to clips tab
      setActiveTab('clips');
    }
  }, [clipShareCode, clipByShareCode, openClipDialog, setActiveTab]);

  // Handle reel URL parameters for automatic modal opening (shareCode only for now)
  useEffect(() => {
    let reel: ClipWithUser | undefined = undefined;
    
    // Handle shareCode-based URLs (/@username/reel/:reelShareCode)
    if (reelShareCode && reelByShareCode) {
      reel = reelByShareCode;
    }
    
    if (reel) {
      // Open the reel dialog (reels use the same clip dialog)
      openClipDialog(reel.id);
      
      // Switch to clips tab (reels are also in clips tab)
      setActiveTab('clips');
    }
  }, [reelShareCode, reelByShareCode, openClipDialog, setActiveTab]);

  // Initialize follower/following counts from localStorage for demo users
  useEffect(() => {
    if (profile && (currentUser?.id === 999 || profile?.id === 999)) {
      // Check and update follower count from localStorage
      const followerCountKey = getFollowerCountKey();
      const storedFollowerCount = localStorage.getItem(followerCountKey);

      if (storedFollowerCount !== null) {
        queryClient.setQueryData([`/api/users/${username}`], (old: any) => {
          if (!old) return old;
          return {
            ...old,
            _count: {
              ...old._count,
              followers: parseInt(storedFollowerCount)
            }
          };
        });
      }

      // Update current user's following count only if viewing own profile
      if (currentUser?.username === username) {
        const followingCountKey = getFollowingCountKey();
        const storedFollowingCount = localStorage.getItem(followingCountKey);
        if (storedFollowingCount !== null) {
          queryClient.setQueryData([`/api/users/${username}`], (old: any) => {
            if (!old) return old;
            return {
              ...old,
              _count: {
                ...old._count,
                following: parseInt(storedFollowingCount)
              }
            };
          });
        }
      }
    }
  }, [profile, currentUser?.id, username]);

  // Add window focus listener to refresh follower count when someone might have followed the user
  useEffect(() => {
    const handleFocus = () => {
      // Only refresh if viewing your own profile and you're logged in
      if (currentUser?.username === username) {
        queryClient.invalidateQueries({ queryKey: [`/api/users/${username}`] });
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [currentUser?.username, username, queryClient]);

  // Add periodic polling to check for follower count updates when viewing your own profile
  useEffect(() => {
    if (currentUser?.username === username) {
      const interval = setInterval(() => {
        queryClient.invalidateQueries({ queryKey: [`/api/users/${username}`] });
      }, 30000); // Poll every 30 seconds

      return () => clearInterval(interval);
    }
  }, [currentUser?.username, username, queryClient]);

  // NEO theme: matrix rain canvas animation
  // Must be before early returns to satisfy Rules of Hooks
  const _neoAccent = (profile as any)?.accentColor?.toLowerCase();
  const _neoBgImg = bgImageSignedUrl || (profile as any)?.profileBackgroundImageUrl || '';
  const _isNeoActive = _neoAccent === '#00ff41' && !_neoBgImg;
  useEffect(() => {
    if (!_isNeoActive) return;
    const canvas = neoCanvasRef.current;
    if (!canvas) return;
    const setSize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    setSize();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const chars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    const fontSize = 14;
    let columns = Math.floor(canvas.width / fontSize);
    let drops: number[] = Array.from({ length: columns }, () => Math.floor(Math.random() * -canvas.height / fontSize));
    let animFrame: number;
    const draw = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < drops.length; i++) {
        const char = chars[Math.floor(Math.random() * chars.length)];
        const y = drops[i] * fontSize;
        ctx.fillStyle = drops[i] % 9 === 0 ? '#ccffcc' : (drops[i] % 4 === 0 ? '#55ff77' : '#00ff41');
        ctx.font = `${fontSize}px "JetBrains Mono", monospace`;
        ctx.fillText(char, i * fontSize, y);
        if (y > canvas.height && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      }
      animFrame = requestAnimationFrame(draw);
    };
    draw();
    const handleResize = () => {
      setSize();
      columns = Math.floor(canvas.width / fontSize);
      drops = Array.from({ length: columns }, () => Math.floor(Math.random() * -canvas.height / fontSize));
    };
    window.addEventListener('resize', handleResize);
    return () => { cancelAnimationFrame(animFrame); window.removeEventListener('resize', handleResize); };
  }, [_isNeoActive]);

  // Follow mutation
  const followMutation = useMutation({
    mutationFn: async ({ currentFollowStatus }: { currentFollowStatus: 'following' | 'requested' | 'not_following' }) => {
      console.log('Follow mutation triggered. Using passed followRequestStatus:', currentFollowStatus);
      if (currentFollowStatus === 'following' || currentFollowStatus === 'requested') {
        console.log('User is currently following or has a pending request, sending DELETE request to unfollow/cancel');
        const response = await fetch(`/api/users/${username}/follow`, {
          method: 'DELETE',
          credentials: 'include'
        });
        if (!response.ok) throw new Error('Failed to unfollow or cancel follow request');
        return { action: 'unfollowed' }; // Indicate that the follow relationship is removed
      } else {
        console.log('User is not following, sending POST request to follow');
        const response = await fetch(`/api/users/${username}/follow`, {
          method: 'POST',
          credentials: 'include'
        });
        if (!response.ok) throw new Error('Failed to follow user');
        const result = await response.json();
        // The result should indicate the new status ('following' or 'requested')
        return result; 
      }
    },
    onMutate: async () => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: [`/api/users/${username}`] });
      await queryClient.cancelQueries({ queryKey: [`/api/users/${username}/follow-status`] });

      // Snapshot the previous value
      const previousProfile = queryClient.getQueryData([`/api/users/${username}`]);
      const previousFollowStatus = followRequestStatus;

      // Optimistically update the UI based on the current state and the intended action
      let newFollowRequestStatus: 'following' | 'requested' | 'not_following';
      let newFollowerCount = (previousProfile as any)?._count?.followers || 0;

      if (isFollowing || previousFollowStatus === 'requested') {
        // If already following or requested, the action is to unfollow/cancel
        newFollowRequestStatus = 'not_following';
        newFollowerCount = Math.max(0, newFollowerCount - 1);
        console.log('Optimistically updating to: not_following');
      } else {
        // If not following, the action is to follow
        // The API will return 'following' or 'requested'
        // For optimistic update, we need to assume one. Let's assume 'requested' for private profiles
        // and 'following' for public ones, but the API response is the source of truth.
        // For now, let's use a placeholder and rely on onSuccess for the final state.
        // A better approach would be to check profile.isPrivate here.
        newFollowRequestStatus = profile?.isPrivate ? 'requested' : 'following';
        newFollowerCount = newFollowerCount + 1;
        console.log(`Optimistically updating to: ${newFollowRequestStatus}`);
      }

      setFollowRequestStatus(newFollowRequestStatus);

      // For demo users, persist the follow state in localStorage
      if (currentUser?.id === 999 || profile?.id === 999) {
        const storageKey = getStorageKey();
        localStorage.setItem(storageKey, newFollowRequestStatus);
      }

      // Optimistically update the profile data in cache
      queryClient.setQueryData([`/api/users/${username}`], (old: any) => {
        if (!old) return old;

        // For demo users, persist follower count in localStorage
        if (currentUser?.id === 999 || profile?.id === 999) {
          const followerCountKey = getFollowerCountKey();
          localStorage.setItem(followerCountKey, newFollowerCount.toString());
        }

        return {
          ...old,
          _count: {
            ...old._count,
            followers: newFollowerCount
          }
        };
      });

      // Optimistically update current user's following count if we have it
      if (currentUser?.username) {
        queryClient.setQueryData([`/api/users/${currentUser.username}`], (old: any) => {
          if (!old) return old;
          let newFollowingCount = Math.max(0, (old._count?.following || 0) + (newFollowRequestStatus === 'following' ? 1 : (previousFollowStatus === 'following' ? -1 : 0)));

          // For demo users, persist following count in localStorage
          if (currentUser?.id === 999 || profile?.id === 999) {
            const followingCountKey = getFollowingCountKey();
            localStorage.setItem(followingCountKey, newFollowingCount.toString());
          }

          return {
            ...old,
            _count: {
              ...old._count,
              following: newFollowingCount
            }
          };
        });
      }

      return { previousProfile, previousFollowStatus };
    },
    onError: (err, variables, context) => {
      console.error('Follow mutation failed:', err);
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousProfile) {
        queryClient.setQueryData([`/api/users/${username}`], context.previousProfile);
      }
      if (context?.previousFollowStatus) {
        setFollowRequestStatus(context.previousFollowStatus);
      }
      // Show error toast
      toast({
        description: (err as Error).message || "An error occurred. Please try again.",
        variant: "gamefolioError",
      });
    },
    onSuccess: (result) => {
      console.log('Follow mutation successful. Result:', result);
      
      // Update followRequestStatus based on the API response
      if (result.action === 'unfollowed') {
        setFollowRequestStatus('not_following');
        toast({
          description: `Follow request cancelled.`,
          variant: 'gamefolioSuccess'
        });
      } else if (result.status === 'following') {
        setFollowRequestStatus('following');
        toast({
          description: `You are now following ${profile?.displayName || username}!`,
          variant: 'gamefolioSuccess'
        });
      } else if (result.status === 'requested') {
        setFollowRequestStatus('requested');
        toast({
          description: `Follow request sent.`,
          variant: 'gamefolioSuccess'
        });
      }
    },
    onSettled: async () => {
      // Invalidate the target user's profile and follow status immediately
      queryClient.invalidateQueries({ queryKey: [`/api/users/${username}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${username}/follow-status`] });
      
      // Delay invalidating current user's profile to allow database aggregation to complete
      if (currentUser?.username) {
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: [`/api/users/${currentUser.username}`] });
        }, 100);
      }
    }
  });

  const handleFollowClick = () => {
    if (!currentUser) {
      openDialog("follow");
      return;
    }
    // Pass the current follow status before optimistic updates
    followMutation.mutate({ currentFollowStatus: followRequestStatus });
  };

  // Remove game from favorites mutation
  const removeGameMutation = useMutation({
    mutationFn: async (gameId: number) => {
      await apiRequest("DELETE", `/api/users/${profile?.id}/favorites/${gameId}`);
    },
    onSuccess: () => {
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: [`/api/users/${username}/games/favorites`] });
      queryClient.invalidateQueries({ queryKey: ["/api/user-game-favorites"] });

      toast({
        title: "Game removed from favorites",
        description: "The game has been removed from your favorites list",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to remove game",
        description: error.message || "Something went wrong",
        variant: "gamefolioError",
      });
    },
  });

  // Refs for tab positioning
  const clipsTabRef = useRef<HTMLButtonElement>(null);
  const reelsTabRef = useRef<HTMLButtonElement>(null);
  const screenshotsTabRef = useRef<HTMLButtonElement>(null);
  const favoritesTabRef = useRef<HTMLButtonElement>(null);
  const tabsListRef = useRef<HTMLDivElement>(null);

  // Calculate tab positions using percentage-based approach
  const getTabPosition = (tabName: string) => {
    const tabIndex = ['clips', 'reels', 'screenshots', 'favorites'].indexOf(tabName);
    
    // Full width underlines matching the highlighted area
    return {
      leftPercent: tabIndex * 25,
      widthPercent: 25
    };
  };

  const [tabPosition, setTabPosition] = useState(() => getTabPosition(activeTab));

  // Update tab position when active tab changes
  useEffect(() => {
    const position = getTabPosition(activeTab);
    setTabPosition(position);
  }, [activeTab]);

  // Update tab position on window resize for responsive behavior
  useEffect(() => {
    const handleResize = () => {
      const position = getTabPosition(activeTab);
      setTabPosition(position);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [activeTab]);

  // Memoize banner style to prevent unnecessary re-renders
  const resolvedBannerUrl = bannerSignedUrl || profile?.bannerUrl;
  const bannerStyle = useMemo(() => ({
    backgroundImage: resolvedBannerUrl 
      ? `url(${resolvedBannerUrl})` 
      : `linear-gradient(135deg, ${profile?.primaryColor || '#0f172a'}, ${profile?.accentColor || '#B7FF1A'}, transparent)`,
    backgroundColor: resolvedBannerUrl ? 'transparent' : (profile?.primaryColor || '#0f172a'),
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    boxShadow: 'inset 0 -10px 20px rgba(0, 0, 0, 0.2)',
  }), [resolvedBannerUrl, profile?.primaryColor, profile?.accentColor]);

  // DISABLED: Profile-scoped theme colors - now using global theme system
  // useEffect(() => {
  //   if (profile && profileThemeScopeRef.current) {
  //     const scope = profileThemeScopeRef.current;

  //     // Enhance isolation to prevent any global leakage
  //     scope.style.setProperty('contain', 'layout style paint');
  //     scope.style.setProperty('isolation', 'isolate');

  //     // Use requestAnimationFrame to batch updates and prevent visual flashing
  //     requestAnimationFrame(() => {
  //       // Ensure complete isolation - set CSS custom properties only on this element
  //       scope.style.setProperty('--user-accent-color', profile.accentColor || '#B7FF1A');
  //       scope.style.setProperty('--user-primary-color', profile.primaryColor || '#02172C');
  //       scope.style.setProperty('--user-avatar-border-color', profile.avatarBorderColor || '#B7FF1A');

  //       // Calculate alpha version of accent color for subtle effects
  //       const accentColor = profile.accentColor || '#B7FF1A';
  //       const alpha = `${accentColor}33`;
  //       scope.style.setProperty('--user-accent-color-alpha', alpha);
  //     });

  //     // Cleanup function to remove custom properties when component unmounts
  //     return () => {
  //       if (scope) {
  //         requestAnimationFrame(() => {
  //           scope.style.removeProperty('--user-accent-color');
  //           scope.style.removeProperty('--user-primary-color');
  //           scope.style.removeProperty('--user-avatar-border-color');
  //           scope.style.removeProperty('--user-accent-color-alpha');
  //           scope.style.removeProperty('contain');
  //           scope.style.removeProperty('isolation');
  //         });
  //       }
  //     };
  //   }
  // }, [profile?.accentColor, profile?.primaryColor, profile?.avatarBorderColor]);

  // Remove global body styling - keep theming scoped to profile only

  if (!username) {
    return <div>User not found</div>;
  }

  // Handle loading state
  if (isLoadingProfile || isLoadingFollowStatus) {
    return (
      <div className="container mx-auto py-4 md:py-6 px-4 md:px-6 space-y-8">
        <div className="flex items-center space-x-4">
          <Skeleton className="h-24 w-24 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="aspect-video w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  // Handle error states
  if (profileError) {
    const errorMessage = (profileError as Error)?.message || '';
    const is404Error = errorMessage.includes('404:') || errorMessage.includes('User not found');
    const is403Error = errorMessage.includes('403:') || errorMessage.includes('private');
    
    if (is404Error) {
      // User not found
      return (
        <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-secondary/20">
          <div className="max-w-2xl w-full text-center space-y-8">
            <div className="flex justify-center mb-8">
              <img
                src="/attached_assets/Gamefolio logo copy.png"
                alt="Gamefolio"
                className="h-24 w-auto drop-shadow-lg"
              />
            </div>
            <div className="space-y-4">
              <h1 className="text-6xl font-bold text-primary tracking-tight">404</h1>
              <h2 className="text-3xl font-semibold text-foreground">User Not Found</h2>
              <p className="text-lg text-muted-foreground max-w-md mx-auto leading-relaxed">
                The user "{username}" doesn't exist on Gamefolio. They may have changed their username or deleted their account.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8">
              <Button
                onClick={() => setLocation("/")}
                className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6 py-3"
                data-testid="button-home"
              >
                <Home className="mr-2 h-5 w-5" />
                Go Home
              </Button>
              <Button
                onClick={() => setLocation("/explore")}
                variant="outline"
                className="w-full sm:w-auto border-primary/20 hover:bg-primary/10 font-semibold px-6 py-3"
                data-testid="button-explore"
              >
                <Search className="mr-2 h-5 w-5" />
                Explore
              </Button>
            </div>
          </div>
        </div>
      );
    } else if (is403Error) {
      // Private profile - show limited profile info with follow button
      return (
        <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-secondary/20">
          <div className="max-w-2xl w-full text-center space-y-8">
            <div className="flex justify-center mb-8">
              <img
                src="/attached_assets/Gamefolio logo copy.png"
                alt="Gamefolio"
                className="h-16 w-auto drop-shadow-lg"
              />
            </div>
            <div className="space-y-4">
              <div className="flex justify-center mb-4">
                <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center">
                  <UserIcon className="h-12 w-12 text-muted-foreground" />
                </div>
              </div>
              <h1 className="text-4xl font-bold text-foreground">@{username}</h1>
              <h2 className="text-xl font-semibold text-muted-foreground">Private Profile</h2>
              <p className="text-lg text-muted-foreground max-w-md mx-auto leading-relaxed">
                This profile is private. Follow {username} to see their gaming content and activity.
              </p>
            </div>
            {currentUser && (
              <div className="flex justify-center pt-4">
                <Button
                  onClick={() => followMutation.mutate({ currentFollowStatus: followRequestStatus })}
                  disabled={followMutation.isPending}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 py-3"
                  data-testid="button-follow"
                >
                  {followMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : followRequestStatus === 'following' ? (
                    <>
                      <UserCheck className="mr-2 h-4 w-4" />
                      Following
                    </>
                  ) : followRequestStatus === 'requested' ? (
                    <>
                      <Clock className="mr-2 h-4 w-4" />
                      Pending
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Follow
                    </>
                  )}
                </Button>
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8">
              <Button
                onClick={() => setLocation("/")}
                variant="outline"
                className="w-full sm:w-auto border-primary/20 hover:bg-primary/10 font-semibold px-6 py-3"
                data-testid="button-home"
              >
                <Home className="mr-2 h-5 w-5" />
                Go Home
              </Button>
              <Button
                onClick={() => setLocation("/explore")}
                variant="outline"
                className="w-full sm:w-auto border-primary/20 hover:bg-primary/10 font-semibold px-6 py-3"
                data-testid="button-explore"
              >
                <Search className="mr-2 h-5 w-5" />
                Explore
              </Button>
            </div>
          </div>
        </div>
      );
    }
  }

  if (!profile) {
    return <NotFound />;
  }

  const accentColor = profile.accentColor || '#B7FF1A';
  const backgroundColor = profile.backgroundColor || '#121F2B';
  const cardColor = profile.cardColor || '#1E3A8A';

  const isMacTheme = accentColor?.toLowerCase() === '#0066ff' && backgroundColor?.toLowerCase() === '#f0f0f2';
  const isCartoonTheme = accentColor?.toLowerCase() === '#ff5e5e' && backgroundColor?.toLowerCase() === '#fffaec';

  const isLightBackground = (() => {
    const hex = backgroundColor.replace('#', '');
    if (hex.length !== 6) return false;
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;
    return (0.299 * r + 0.587 * g + 0.114 * b) > 0.5;
  })();

  const isZombieTheme = !isLightBackground && accentColor?.toLowerCase() === '#9ae600';
  const isCyberpunkTheme = !isLightBackground && accentColor?.toLowerCase() === '#00d3f2';
  const isNeoTheme = !isLightBackground && accentColor?.toLowerCase() === '#00ff41';
  const isGothicTheme = !isLightBackground && accentColor?.toLowerCase() === '#c27aff' && backgroundColor?.toLowerCase() === '#1e053a';
  const isBlocksTheme = !isLightBackground && accentColor?.toLowerCase() === '#B7FF1A' && backgroundColor?.toLowerCase() === '#1a1a1a';
  const isForestTheme = !isLightBackground && accentColor?.toLowerCase() === '#B7FF1A' && backgroundColor?.toLowerCase() === '#0a2f1f';
  const isWatermelonTheme = accentColor?.toLowerCase() === '#B7FF1A' && backgroundColor?.toLowerCase() === '#ff4d6d';
  const isElectricTheme = !isLightBackground && accentColor?.toLowerCase() === '#ffe033' && backgroundColor?.toLowerCase() === '#1a1200';

  const isDefaultTheme = !isWatermelonTheme && !isCartoonTheme && !isMacTheme && !isZombieTheme && !isCyberpunkTheme && !isNeoTheme && !isBlocksTheme && !isForestTheme && !isGothicTheme && !isElectricTheme && !isLightBackground;

  const platformBtnStyle = isWatermelonTheme
    ? { backgroundColor: '#ffb3c1', color: '#0d1a12', border: '3px solid #1d3932', borderRadius: '9999px' }
    : isCartoonTheme
    ? { backgroundColor: '#ffffff', color: '#1d1d1f', border: '3px solid #1d1d1f', borderRadius: '9999px', boxShadow: '3px 3px 0 #1d1d1f', fontFamily: "'Bricolage Grotesque', 'Arial Black', sans-serif", fontWeight: '800' }
    : isMacTheme
    ? { backgroundColor: 'rgba(0,122,255,0.08)', color: '#007aff', border: '1px solid rgba(0,122,255,0.3)', borderRadius: '8px' }
    : isLightBackground
    ? { backgroundColor: 'rgba(255,255,255,0.7)', color: accentColor, border: `1px solid ${accentColor}80` }
    : isZombieTheme
      ? { backgroundColor: 'rgba(15, 28, 8, 0.9)', color: '#9ae600', border: '1px solid #9ae60066' }
      : isCyberpunkTheme
        ? { backgroundColor: 'rgba(0,6,18,0.9)', color: '#00d3f2', border: '1px solid #00b8db55', fontFamily: "'Orbitron', sans-serif", fontSize: '0.6rem', letterSpacing: '0.8px', borderRadius: '2px' }
        : isNeoTheme
          ? { backgroundColor: 'rgba(0,8,0,0.9)', color: '#00ff41', border: '1px solid #00ff4155', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.65rem', letterSpacing: '0.5px', borderRadius: '2px' }
          : isBlocksTheme
            ? { backgroundColor: 'rgba(26,26,26,0.95)', color: '#B7FF1A', border: '2px solid #B7FF1A66', fontFamily: "'Press Start 2P', monospace", fontSize: '0.55rem', letterSpacing: '0.5px', borderRadius: '2px' }
            : isForestTheme
              ? { backgroundColor: 'rgba(232,213,183,0.85)', color: '#6B3A1F', border: '1px solid #c4a88266', borderRadius: '6px' }
              : isGothicTheme
              ? { backgroundColor: 'rgba(20,2,50,0.85)', color: '#c27aff', border: '1px solid #c27aff44', borderRadius: '9999px', boxShadow: '0 0 8px #c27aff22' }
              : isElectricTheme
              ? { backgroundColor: 'rgba(20,15,0,0.9)', color: '#ffe033', border: '1px solid #ffe03366', borderRadius: '9999px', boxShadow: '0 0 8px #ffe03333', fontFamily: "'Bangers', 'Impact', cursive", letterSpacing: '1px' }
              : { backgroundColor: `${accentColor}22`, color: '#ffffff', border: `1px solid ${accentColor}55` };

  const socialOutlineStyle = isWatermelonTheme
    ? { backgroundColor: '#ffffff', color: '#1d3932', border: '3px solid #1d3932', borderRadius: '9999px' }
    : isCartoonTheme
    ? platformBtnStyle
    : isMacTheme
    ? platformBtnStyle
    : isLightBackground
    ? { backgroundColor: 'rgba(255,255,255,0.9)', color: '#000000', border: '1.5px solid rgba(0,0,0,0.5)', borderRadius: '9999px' }
    : (isZombieTheme || isCyberpunkTheme || isNeoTheme || isBlocksTheme || isForestTheme || isGothicTheme || isElectricTheme)
      ? platformBtnStyle
      : { backgroundColor: '#ffffff', color: '#000000', border: '1.5px solid #000000', borderRadius: '9999px' };

  const platformBrandStyles: Record<string, React.CSSProperties> = {
    steam:       { backgroundColor: '#1b2838', color: '#c6d4df', border: '1px solid #1b2838', borderRadius: '9999px' },
    xbox:        { backgroundColor: '#107c10', color: '#ffffff', border: '1px solid #107c10', borderRadius: '9999px' },
    playstation: { backgroundColor: '#003087', color: '#ffffff', border: '1px solid #003087', borderRadius: '9999px' },
    epic:        { backgroundColor: '#2a2a2a', color: '#ffffff', border: '1px solid #444444', borderRadius: '9999px' },
    nintendo:    { backgroundColor: '#e60012', color: '#ffffff', border: '1px solid #e60012', borderRadius: '9999px' },
    discord:     { backgroundColor: '#5865F2', color: '#ffffff', border: '1px solid #5865F2', borderRadius: '9999px' },
    twitter:     { backgroundColor: '#000000', color: '#ffffff', border: '1px solid #000000', borderRadius: '9999px' },
    youtube:     { backgroundColor: '#FF0000', color: '#ffffff', border: '1px solid #FF0000', borderRadius: '9999px' },
    instagram:   { backgroundColor: '#E1306C', color: '#ffffff', border: '1px solid #E1306C', borderRadius: '9999px' },
    facebook:    { backgroundColor: '#1877F2', color: '#ffffff', border: '1px solid #1877F2', borderRadius: '9999px' },
  };

  const isNamedTheme = isWatermelonTheme || isCartoonTheme || isMacTheme || isZombieTheme || isCyberpunkTheme || isNeoTheme || isBlocksTheme || isForestTheme || isGothicTheme || isElectricTheme || isLightBackground;

  const avatarThemeColor = isWatermelonTheme ? '#ff6b6b'
    : isCartoonTheme ? '#ff6b35'
    : isMacTheme ? '#0071e3'
    : isZombieTheme ? '#9ae600'
    : isCyberpunkTheme ? '#00d3f2'
    : isNeoTheme ? '#9333ea'
    : isBlocksTheme ? '#B7FF1A'
    : isForestTheme ? '#4a7c59'
    : isGothicTheme ? '#c27aff'
    : isElectricTheme ? '#ffe033'
    : (accentColor || undefined);

  const getBtnStyle = (platform: string): React.CSSProperties => {
    if (!isNamedTheme) return platformBrandStyles[platform] ?? socialOutlineStyle;
    return socialOutlineStyle;
  };

  const shareButtonStyle = isWatermelonTheme ? {
    color: '#1d3932',
    background: '#ffb3c1',
    border: '3px solid #1d3932',
  } : isLightBackground ? {
    color: accentColor,
    background: 'rgba(255,255,255,0.37)',
    border: '0.556px solid rgba(255,255,255,0.8)',
  } : isZombieTheme ? {
    color: '#9ae600',
    background: 'rgba(15,28,8,0.8)',
    border: '1px solid #9ae60099',
  } : isCyberpunkTheme ? {
    color: '#00d3f2',
    background: 'rgba(0,6,18,0.8)',
    border: '1px solid #00d3f299',
    boxShadow: '0 0 10px #00d3f244',
  } : isNeoTheme ? {
    color: '#00ff41',
    background: 'rgba(0,8,0,0.8)',
    border: '1px solid #00ff4199',
    boxShadow: '0 0 10px #00ff4144',
  } : isBlocksTheme ? {
    color: '#B7FF1A',
    background: 'rgba(26,26,26,0.9)',
    border: '2px solid #B7FF1A99',
  } : isForestTheme ? {
    color: '#e8d5b7',
    background: 'rgba(14,45,28,0.85)',
    border: '1px solid rgba(164,118,66,0.5)',
  } : isMacTheme ? {
    color: '#007aff',
    background: 'rgba(255,255,255,0.85)',
    border: '1px solid rgba(0,122,255,0.4)',
    borderRadius: '6px',
  } : isElectricTheme ? {
    color: '#ffe033',
    background: 'rgba(20,15,0,0.85)',
    border: '1px solid #ffe03399',
    boxShadow: '0 0 12px #ffe03344',
  } : {
    color: accentColor || 'hsl(var(--primary))',
    background: 'rgba(0,0,0,0.5)',
    border: `1px solid ${accentColor ? accentColor + '80' : 'rgba(255,255,255,0.2)'}`,
  };

  const tabListStyle = isWatermelonTheme ? {
    background: '#ffb3c1',
    border: '5px solid #1d3932',
    borderRadius: '9999px',
    padding: '4px 8px',
  } : isMacTheme ? {
    background: 'linear-gradient(180deg, #ebebeb 0%, #d6d6d6 100%)',
    border: '1px solid #bdbdbd',
    borderRadius: '9999px',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.7)',
  } : isCartoonTheme ? {
    background: '#ffffff',
    border: '3px solid #1d1d1f',
    borderRadius: '12px',
    boxShadow: '4px 4px 0 #1d1d1f',
    padding: '2px 4px',
  } : isLightBackground ? {
    background: 'rgba(255,255,255,0.37)',
    border: '0.556px solid rgba(255,255,255,0.8)',
    boxShadow: '0 1px 2px -1px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.1)',
  } : isZombieTheme ? {
    background: 'rgba(15,28,8,0.9)',
    border: '1px solid #9ae60044',
    borderRadius: '9999px',
    padding: '4px 8px',
  } : isForestTheme ? {
    background: 'rgba(10,35,20,0.88)',
    border: '1.5px solid rgba(164,118,66,0.45)',
    borderRadius: '9999px',
    padding: '4px 8px',
  } : isGothicTheme ? {
    background: 'rgba(20,2,50,0.92)',
    border: '1px solid #c27aff44',
    borderRadius: '9999px',
    padding: '4px 8px',
    boxShadow: '0 0 18px #c27aff22',
  } : isElectricTheme ? {
    background: 'rgba(20,15,0,0.92)',
    border: '1px solid #ffe03344',
    borderRadius: '9999px',
    padding: '4px 8px',
    boxShadow: '0 0 18px #ffe03333, 0 0 4px #fff5 inset',
  } : undefined;

  const blocksTabColors: Record<string, string> = {
    clips: '#ef4444',
    reels: '#3b82f6',
    screenshots: '#B7FF1A',
    favorites: '#facc15',
  };
  const cartoonTabColors: Record<string, string> = {
    clips: '#ff5e5e',
    reels: '#3498db',
    screenshots: '#27ae60',
    favorites: '#f39c12',
  };
  const getTabStyle = (tabName: string) => ({
    backgroundColor: isCartoonTheme ? 'transparent' : activeTab === tabName ? (isBlocksTheme ? (blocksTabColors[tabName] || accentColor) : isForestTheme ? '#e8d5b7' : isMacTheme ? accentColor : accentColor) : 'transparent',
    color: isCartoonTheme ? (activeTab === tabName ? (cartoonTabColors[tabName] || '#1d1d1f') : 'rgba(0,0,0,0.25)') : activeTab === tabName ? (isBlocksTheme ? '#1a1a1a' : isWatermelonTheme ? '#0d1a12' : isForestTheme ? '#5C3317' : '#ffffff') : isWatermelonTheme ? '#0d1a12' : isForestTheme ? '#c4a882' : isLightBackground ? accentColor : undefined,
    ...(isCartoonTheme ? { fontFamily: "'Bricolage Grotesque', 'Arial Black', sans-serif", fontWeight: '800', letterSpacing: '-0.5px', fontSize: '1.1rem', borderBottom: activeTab === tabName ? `4px solid ${cartoonTabColors[tabName] || 'gold'}` : '4px solid transparent', borderRadius: '0', paddingBottom: '6px' } : {}),
    ...(isZombieTheme ? { fontFamily: "'Creepster', cursive", letterSpacing: '2px', fontSize: '0.8rem' } : {}),
    ...(isCyberpunkTheme ? { fontFamily: "'Orbitron', sans-serif", letterSpacing: '2.5px', fontSize: '0.7rem', fontWeight: '900', textTransform: 'uppercase' as const } : {}),
    ...(isNeoTheme ? { fontFamily: "'JetBrains Mono', monospace", letterSpacing: '1.5px', fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase' as const } : {}),
    ...(isBlocksTheme ? { fontFamily: "'Press Start 2P', monospace", fontSize: '0.55rem', letterSpacing: '0.5px', textTransform: 'uppercase' as const, borderRadius: '2px' } : {}),
    ...(isGothicTheme ? { fontFamily: "'Palatino Linotype', 'Book Antiqua', Palatino, serif", letterSpacing: '1.5px', fontSize: '0.78rem' } : {}),
    ...(isElectricTheme ? { fontFamily: "'Bangers', 'Impact', cursive", letterSpacing: '2px', fontSize: '0.85rem', textTransform: 'uppercase' as const } : {}),
  });

  const nameTagBgStyle = isWatermelonTheme ? {
    background: '#ffb3c1',
    border: '5px solid #1d3932',
    borderRadius: '9999px',
  } : isLightBackground ? {
    background: 'rgba(255,255,255,0.37)',
    border: '0.556px solid rgba(255,255,255,0.8)',
  } : isZombieTheme ? {
    background: '#1a1d1a',
    border: '1.667px solid #7ccf00',
    boxShadow: '0 0 12px #9ae60033',
  } : isCyberpunkTheme ? {
    background: '#020617',
    border: '0.556px solid #00b8db66',
    boxShadow: '0 0 14px #00d3f222',
  } : isNeoTheme ? {
    background: '#000800',
    border: '0.556px solid #00ff4166',
    boxShadow: '0 0 12px #00ff4122',
  } : isBlocksTheme ? {
    background: '#1a1a1a',
    border: '3px solid #B7FF1A',
    borderRadius: '4px',
    boxShadow: '4px 4px 0 #000',
  } : isForestTheme ? {
    background: '#1d3932',
    border: '1px solid rgba(164,118,66,0.4)',
  } : isMacTheme ? {
    background: 'rgba(0,122,255,0.1)',
    border: '1px solid rgba(0,122,255,0.3)',
    borderRadius: '8px',
  } : isCartoonTheme ? {
    background: '#ffffff',
    border: '3px solid #1d1d1f',
    borderRadius: '16px',
    boxShadow: '4px 4px 0 #1d1d1f',
  } : isGothicTheme ? {
    background: 'rgba(20,2,50,0.95)',
    border: '1px solid #c27aff55',
    boxShadow: '0 0 12px #c27aff33',
  } : isElectricTheme ? {
    background: 'rgba(15,12,0,0.95)',
    border: '1px solid #ffe03366',
    boxShadow: '0 0 14px #ffe03344',
  } : {
    background: 'rgba(30,30,30,0.85)',
    border: '1px solid rgba(255,255,255,0.12)',
  };
  const profileBackgroundImageUrl = bgImageSignedUrl || (profile as any).profileBackgroundImageUrl || '';
  const isMobileViewport = window.innerWidth <= 768;
  const profileBackgroundPosX = isMobileViewport
    ? ((profile as any).profileBackgroundPositionX || '50')
    : ((profile as any).profileBackgroundDesktopX || (profile as any).profileBackgroundPositionX || '50');
  const profileBackgroundPosY = isMobileViewport
    ? ((profile as any).profileBackgroundPositionY || '50')
    : ((profile as any).profileBackgroundDesktopY || (profile as any).profileBackgroundPositionY || '50');
  const hideBanner = !!(profile as any).hideBanner;

  const PROFILE_FONT_MAP: Record<string, { family: string; scale: number }> = {
    'default': { family: 'system-ui, sans-serif', scale: 1 },
    'inter': { family: "'Inter', sans-serif", scale: 1 },
    'roboto': { family: "'Roboto', sans-serif", scale: 1 },
    'poppins': { family: "'Poppins', sans-serif", scale: 1 },
    'montserrat': { family: "'Montserrat', sans-serif", scale: 1 },
    'oswald': { family: "'Oswald', sans-serif", scale: 1.1 },
    'playfair': { family: "'Playfair Display', serif", scale: 1 },
    'raleway': { family: "'Raleway', sans-serif", scale: 1 },
    'space-grotesk': { family: "'Space Grotesk', sans-serif", scale: 1 },
    'orbitron': { family: "'Orbitron', sans-serif", scale: 0.9 },
    'press-start': { family: "'Press Start 2P', cursive", scale: 0.55 },
    'russo-one': { family: "'Russo One', sans-serif", scale: 1 },
    'bungee-shade': { family: "'Bungee Shade', cursive", scale: 0.85 },
    'nabla': { family: "'Nabla', cursive", scale: 0.9 },
    'silkscreen': { family: "'Silkscreen', cursive", scale: 0.75 },
    'rubik-bubbles': { family: "'Rubik Bubbles', cursive", scale: 1 },
    'monoton': { family: "'Monoton', cursive", scale: 1 },
    'creepster': { family: "'Creepster', cursive", scale: 1.1 },
    'permanent-marker': { family: "'Permanent Marker', cursive", scale: 1.05 },
    'bangers': { family: "'Bangers', cursive", scale: 1.15 },
    'fredoka': { family: "'Fredoka', sans-serif", scale: 1 },
    'righteous': { family: "'Righteous', cursive", scale: 1.05 },
    'bungee-inline': { family: "'Bungee Inline', cursive", scale: 0.85 },
    'notable': { family: "'Notable', sans-serif", scale: 0.8 },
    'bungee-spice': { family: "'Bungee Spice', cursive", scale: 0.85 },
    'honk': { family: "'Honk', system-ui", scale: 0.9 },
  };
  const fontEntry = PROFILE_FONT_MAP[profile.profileFont || 'default'] || PROFILE_FONT_MAP['default'];
  const profileFontFamily = fontEntry.family;
  const profileFontScale = fontEntry.scale;

  const FONT_EFFECT_MAP: Record<string, string> = {
    'none': 'none',
    'drop-shadow': '2px 2px 4px rgba(0,0,0,0.8)',
    'hard-shadow': '3px 3px 0px rgba(0,0,0,0.9)',
    'neon-green': '0 0 7px #00ff00, 0 0 10px #00ff00, 0 0 21px #00ff00, 0 0 42px #00ff00',
    'neon-blue': '0 0 7px #00bfff, 0 0 10px #00bfff, 0 0 21px #00bfff, 0 0 42px #00bfff',
    'neon-pink': '0 0 7px #ff00de, 0 0 10px #ff00de, 0 0 21px #ff00de, 0 0 42px #ff00de',
    'neon-red': '0 0 7px #ff0000, 0 0 10px #ff0000, 0 0 21px #ff0000, 0 0 42px #ff1a1a',
    'neon-purple': '0 0 7px #bf00ff, 0 0 10px #bf00ff, 0 0 21px #bf00ff, 0 0 42px #bf00ff',
    'neon-yellow': '0 0 7px #ffff00, 0 0 10px #ffff00, 0 0 21px #ffff00, 0 0 42px #ffff00',
    'fire': '0 0 4px #ff4500, 0 0 11px #ff4500, 0 0 19px #ff6600, 0 0 40px #ff6600, 0 0 80px #ff8800',
    'ice': '0 0 5px #e0f7ff, 0 0 10px #a0d8ef, 0 0 20px #7ec8e3, 0 0 40px #45b7d1',
    'gold': '0 0 5px #ffd700, 0 0 10px #ffc400, 0 0 20px #ffaa00, 0 0 40px #ff8c00',
    'retro': '2px 2px 0 #ff0000, -2px -2px 0 #00bfff',
    'outline-white': '-1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff',
    'outline-black': '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, -2px 0 0 #000, 2px 0 0 #000, 0 -2px 0 #000, 0 2px 0 #000',
    'rainbow': '0 0 5px #ff0000, 0 0 10px #ff7700, 0 0 15px #ffff00, 0 0 20px #00ff00, 0 0 25px #0000ff, 0 0 30px #8b00ff',
  };
  const profileTextShadow = FONT_EFFECT_MAP[(profile as any).profileFontEffect || 'none'] || 'none';
  const profileFontColor = (profile as any).profileFontColor || '#FFFFFF';

  const FONT_ANIMATION_MAP: Record<string, string> = {
    'none': '',
    'bounce': 'animate-font-bounce',
    'shake': 'animate-font-shake',
    'pulse': 'animate-font-pulse',
    'float': 'animate-font-float',
    'wave': 'animate-font-wave',
    'flicker': 'animate-font-flicker',
    'rubberband': 'animate-font-rubberband',
    'jello': 'animate-font-jello',
    'swing': 'animate-font-swing',
  };
  const profileFontAnimClass = FONT_ANIMATION_MAP[(profile as any).profileFontAnimation || 'none'] || '';

  // Convert hex colors to RGB for opacity support
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };

  const getRelativeLuminance = (hex: string): number => {
    const rgb = hexToRgb(hex);
    if (!rgb) return 0;
    const toLinear = (c: number) => {
      const s = c / 255;
      return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * toLinear(rgb.r) + 0.7152 * toLinear(rgb.g) + 0.0722 * toLinear(rgb.b);
  };

  const statsTextColor = isLightBackground ? '#111827' : '#FFFFFF';
  const statsLabelColor = isLightBackground ? '#374151' : (accentColor || 'hsl(var(--primary))');

  // Darken a hex color by a percentage
  const darkenColor = (hex: string, percent: number) => {
    const rgb = hexToRgb(hex);
    if (!rgb) return hex;
    const factor = 1 - percent / 100;
    const r = Math.round(rgb.r * factor);
    const g = Math.round(rgb.g * factor);
    const b = Math.round(rgb.b * factor);
    return `rgb(${r}, ${g}, ${b})`;
  };

  const bgRgb = hexToRgb(backgroundColor);
  const accentRgb = hexToRgb(accentColor);
  const defaultThemeColor = profile.primaryColor || '#0B2232';

  const selectedProfileNftDetail = selectedProfileNft ? (() => {
    const { score } = getNftRarity(selectedProfileNft);
    return (
      <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm overflow-y-auto pt-4 md:pt-16">
        <MintedNftDetailScreen
          nft={{
            id: selectedProfileNft.tokenId,
            name: selectedProfileNft.name,
            imageUrl: selectedProfileNft.image || '',
            rarity: score,
            attributes: selectedProfileNft.attributes?.map(a => ({
              trait_type: a.trait_type,
              value: String(a.value),
            })),
          }}
          txHash={selectedProfileNft.txHash || ''}
          walletAddress={profile?.walletAddress || undefined}
          ownerUsername={profile?.username || username}
          onClose={() => setSelectedProfileNft(null)}
          onViewExplorer={() => {
            if (selectedProfileNft.txHash) {
              const SKALE_EXPLORER_BASE_URL = SKALE_NEBULA_TESTNET.blockExplorers.default.url;
              window.open(`${SKALE_EXPLORER_BASE_URL}/tx/${selectedProfileNft.txHash}`, '_blank');
            }
          }}
          initialSold={selectedProfileNft.sold || false}
          onSold={() => refetchProfileNfts()}
          mintedAt={selectedProfileNft.mintedAt}
          soldAt={selectedProfileNft.soldAt}
          listedPrice={selectedProfileNft.listedPrice}
          listingActive={selectedProfileNft.listingActive}
        />
      </div>
    );
  })() : null;

  return (
    <>
    {selectedProfileNftDetail}
    {isNeoTheme && !profileBackgroundImageUrl && (
      <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 0, pointerEvents: 'none' }} />
    )}
    {isNeoTheme && !profileBackgroundImageUrl && (
      <canvas ref={neoCanvasRef} className="neo-canvas" />
    )}
    {isNeoTheme && !profileBackgroundImageUrl && <div className="neo-vignette" />}
    {isNeoTheme && !profileBackgroundImageUrl && <div className="neo-scanline" />}
    <div 
      className={`min-h-screen pb-12 px-1 md:px-6 relative profile-theme-scope${isBlocksTheme && !profileBackgroundImageUrl ? ' blocks-bg' : ''}`}
      ref={profileThemeScopeRef}
      style={profileBackgroundImageUrl ? {
        backgroundImage: `url(${profileBackgroundImageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: `${profileBackgroundPosX}% ${profileBackgroundPosY}%`,
        backgroundAttachment: 'fixed',
        position: 'relative',
        zIndex: 1
      } : isNeoTheme ? {
        background: 'transparent',
        position: 'relative',
        zIndex: 1
      } : isBlocksTheme ? {
        background: '#87ceeb',
        position: 'relative',
        zIndex: 1
      } : isForestTheme ? {
        backgroundColor: '#0a2f1f',
        position: 'relative',
        zIndex: 1
      } : (profile as any).profileBackgroundGradient !== false ? {
        background: isLightBackground ? backgroundColor : `linear-gradient(180deg, ${defaultThemeColor} 0%, ${backgroundColor} 60%, ${backgroundColor} 100%)`,
        position: 'relative',
        zIndex: 1
      } : {
        backgroundColor: backgroundColor,
        position: 'relative',
        zIndex: 1
      }}
    >
      {/* Dark overlay for background image readability */}
      {profileBackgroundImageUrl && (
        <div className="fixed inset-0 bg-black/50 pointer-events-none" style={{ zIndex: 0 }} />
      )}
      {/* Birthday Banner */}
      {(() => {
        if (!profile?.birthday) return null;
        const now = new Date();
        const todayMMDD = `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        if (profile.birthday !== todayMMDD) return null;
        return (
          <div className="relative overflow-hidden rounded-xl mx-1 md:mx-0 mb-3" style={{
            background: 'linear-gradient(135deg, #B7FF1A 0%, #A2F000 50%, #EAB308 100%)',
            padding: '1px',
          }}>
            <div className="relative rounded-xl px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-center gap-3 text-center" style={{
              background: 'linear-gradient(135deg, rgba(183, 255, 26, 0.10) 0%, rgba(162, 240, 0, 0.10) 50%, rgba(234, 179, 8, 0.10) 100%)',
              backdropFilter: 'blur(10px)',
            }}>
              <span className="text-2xl sm:text-3xl animate-bounce" style={{ animationDuration: '2s' }}>🎂</span>
              <div>
                <p className="text-sm sm:text-base font-bold text-white">
                  {isOwnProfile ? "Happy Birthday! 🎉" : `It's ${profile.displayName}'s Birthday! 🎉`}
                </p>
                <p className="text-xs sm:text-sm text-white/70">
                  {isOwnProfile ? "Wishing you an amazing day from Gamefolio!" : "Wish them a happy birthday!"}
                </p>
              </div>
              <span className="text-2xl sm:text-3xl animate-bounce" style={{ animationDuration: '2.5s' }}>🎈</span>
            </div>
          </div>
        );
      })()}

      {/* Enhanced Banner with global theme colors */}
      <div 
        className={`h-44 sm:h-52 md:h-72 bg-cover bg-center overflow-hidden profile-banner relative -mx-1 md:-mx-8 ${resolvedBannerUrl ? 'cursor-pointer hover:brightness-110 transition-all duration-200' : ''}`}
        style={{
          ...bannerStyle,
          opacity: hideBanner ? 0 : 1,
          pointerEvents: hideBanner ? 'none' : undefined,
          transition: 'opacity 0.5s ease',
        }}
        onClick={() => {
          if (resolvedBannerUrl && profile?.displayName && profile?.username) {
            openBannerLightbox(resolvedBannerUrl, profile.displayName, profile.username);
          }
        }}
        data-testid="banner-image"
      >
        {/* Dynamic theme-based gradient overlay */}
        <div 
          className="absolute inset-0 opacity-60" 
          style={{
            background: `linear-gradient(135deg, hsl(var(--background))CC, hsl(var(--primary))88, transparent 70%)`,
          }}
        />

        {/* Theme-colored animated shimmer effect */}
        <div 
          className="absolute inset-0 opacity-30" 
          style={{
            background: `linear-gradient(45deg, transparent 30%, hsl(var(--primary))20, transparent 70%)`,
            backgroundSize: '200% 200%',
            animation: 'theme-shimmer 6s ease-in-out infinite',
          }}
        />

        {/* Enhanced particle system with theme colors - only show when no custom banner */}
        {!resolvedBannerUrl && (
        <div className="absolute inset-0 overflow-hidden opacity-25">
          <div 
            className="absolute w-4 h-4 rounded-full animate-float-1 bg-primary" 
            style={{
              top: '20%',
              left: '10%',
              animationDuration: '8s'
            }}
          ></div>
          <div 
            className="absolute w-6 h-6 rounded-full animate-float-2 bg-primary" 
            style={{
              top: '50%',
              right: '20%',
              animationDuration: '12s'
            }}
          ></div>
          <div 
            className="absolute w-3 h-3 rounded-full animate-float-3 bg-primary" 
            style={{
              bottom: '30%',
              left: '70%',
              animationDuration: '10s'
            }}
          ></div>
          <div 
            className="absolute w-5 h-5 rounded-full animate-pulse bg-background" 
            style={{
              top: '30%',
              right: '40%',
              animationDuration: '4s'
            }}
          ></div>
        </div>
        )}

        {/* Theme accent corner decorations - only show when no custom banner */}
        {!resolvedBannerUrl && (
        <>
        <div 
          className="absolute top-4 left-4 w-16 h-16 rounded-full opacity-20 animate-pulse"
          style={{
            background: `radial-gradient(circle, hsl(var(--primary)), transparent 70%)`,
            animationDuration: '3s'
          }}
        ></div>
        <div 
          className="absolute top-8 right-16 w-12 h-12 rounded-full opacity-15 animate-bounce"
          style={{
            background: `radial-gradient(circle, hsl(var(--card)), transparent 70%)`,
            animationDuration: '4s'
          }}
        ></div>
        </>
        )}

        {/* Bottom fade — merges banner into page background */}
        <div className="absolute bottom-0 left-0 right-0 h-40 pointer-events-none" style={{ background: `linear-gradient(to bottom, transparent, ${backgroundColor})` }} />
      </div>

      {/* Zombie theme animations */}
      {isZombieTheme && (
        <style>{`
          @keyframes zombieFlicker {
            0%,88%,92%,100% { opacity:1; filter:brightness(1); }
            89% { opacity:0.55; filter:brightness(1.6) saturate(2); }
            90%,91% { opacity:0.82; filter:brightness(0.75); }
          }

          @keyframes zombieGlow {
            0%,100% { box-shadow:0 0 18px #9ae60055, 0 0 40px #9ae60022; }
            50% { box-shadow:0 0 30px #9ae60099, 0 0 70px #9ae60044; }
          }
          .zombie-stats-card {
            animation: zombieFlicker 8s infinite 1.5s, zombieGlow 3.5s ease-in-out infinite;
          }
          /* ── Zombie fog layers ── */
          @keyframes zombieFogDrift1 {
            0%   { transform: translate(0%,    0%); }
            25%  { transform: translate(7%,   -5%); }
            50%  { transform: translate(3%,    8%); }
            75%  { transform: translate(-6%,   4%); }
            100% { transform: translate(0%,    0%); }
          }
          @keyframes zombieFogDrift2 {
            0%   { transform: translate(0%,    0%); }
            33%  { transform: translate(-9%,   6%); }
            66%  { transform: translate(6%,   -8%); }
            100% { transform: translate(0%,    0%); }
          }
          @keyframes zombieFogDrift3 {
            0%   { transform: translate(0%,    0%); }
            50%  { transform: translate(5%,    7%); }
            100% { transform: translate(0%,    0%); }
          }
          .zombie-fog-1 {
            position:fixed; inset:0; pointer-events:none; z-index:0;
            background:
              radial-gradient(ellipse 70% 50% at 20% 30%, #1a2e0a88 0%, transparent 70%),
              radial-gradient(ellipse 50% 60% at 80% 70%, #0d1a0577 0%, transparent 70%),
              radial-gradient(ellipse 80% 40% at 50% 90%, #9ae60020 0%, transparent 60%);
            animation: zombieFogDrift1 28s ease-in-out infinite;
          }
          .zombie-fog-2 {
            position:fixed; inset:0; pointer-events:none; z-index:0;
            background:
              radial-gradient(ellipse 60% 70% at 72% 18%, #9ae60016 0%, transparent 65%),
              radial-gradient(ellipse 45% 55% at 10% 78%, #1a2e0a66 0%, transparent 70%),
              radial-gradient(ellipse 90% 35% at 38% 52%, #0d1a0544 0%, transparent 60%);
            animation: zombieFogDrift2 35s ease-in-out infinite;
          }
          .zombie-fog-3 {
            position:fixed; inset:0; pointer-events:none; z-index:0;
            background:
              radial-gradient(ellipse 55% 80% at 85% 42%, #9ae60012 0%, transparent 68%),
              radial-gradient(ellipse 75% 45% at 14% 58%, #1a2e0a55 0%, transparent 65%);
            animation: zombieFogDrift3 44s ease-in-out infinite;
          }
          .zombie-bg-pulse {
            position:fixed;
            inset:0;
            pointer-events:none;
            z-index:0;
            opacity:0.35;
            background-image:
              linear-gradient(0deg, #9ae60038 1px, transparent 1px),
              linear-gradient(90deg, #9ae60038 1px, transparent 1px);
            background-size:48px 48px;
          }
          @keyframes zombieMeshSweep {
            0%   { transform: rotate(20deg) translateX(-200vw); }
            100% { transform: rotate(20deg) translateX(200vw); }
          }
          .zombie-mesh-sweep {
            position:fixed;
            top:-50vh;
            left:-50vw;
            width:200vw;
            height:200vh;
            pointer-events:none;
            z-index:0;
            background: linear-gradient(
              90deg,
              transparent 0%,
              transparent 42%,
              #9ae60008 46%,
              #9ae60055 49%,
              #9ae600bb 50%,
              #9ae60055 51%,
              #9ae60008 54%,
              transparent 58%,
              transparent 100%
            );
            animation: zombieMeshSweep 7s ease-in-out infinite;
          }
        `}</style>
      )}
      {isZombieTheme && !profileBackgroundImageUrl && <div className="zombie-fog-1" />}
      {isZombieTheme && !profileBackgroundImageUrl && <div className="zombie-fog-2" />}
      {isZombieTheme && !profileBackgroundImageUrl && <div className="zombie-fog-3" />}
      {isZombieTheme && !profileBackgroundImageUrl && <div className="zombie-bg-pulse" />}
      {isZombieTheme && !profileBackgroundImageUrl && <div className="zombie-mesh-sweep" />}
      {/* Cyberpunk theme animations */}
      {isCyberpunkTheme && (
        <style>{`
          @keyframes cyberBorderGlow {
            0%,100% { box-shadow:0 0 12px #00d3f266, 0 0 32px #00d3f222; border-color:#00b8db; }
            50%      { box-shadow:0 0 14px #e12afb77, 0 0 36px #e12afb22; border-color:#e12afb; }
          }
          .cyber-stats-card {
            position:relative;
            animation: cyberBorderGlow 4s ease-in-out infinite;
          }
          .cyber-stats-card::before,.cyber-stats-card::after {
            content:'';
            position:absolute;
            width:10px;
            height:10px;
            pointer-events:none;
          }
          .cyber-stats-card::before { top:-1px; left:-1px; border-top:1.667px solid #ffffff88; border-left:1.667px solid #ffffff88; }
          .cyber-stats-card::after  { bottom:-1px; right:-1px; border-bottom:1.667px solid #ffffff88; border-right:1.667px solid #ffffff88; }
          /* ── Diamond mesh base ── */
          @keyframes cyberNodePulse {
            0%,100% { opacity:0.18; transform:scale(1); }
            50%      { opacity:0.32; transform:scale(1.012); }
          }
          .cyber-bg-mesh {
            position:fixed; inset:0; pointer-events:none; z-index:0;
            background-image:
              radial-gradient(circle, #00d3f228 1.5px, transparent 1.5px),
              linear-gradient(45deg,  #00b8db1a 1px, transparent 1px),
              linear-gradient(-45deg, #e12afb14 1px, transparent 1px);
            background-size:48px 48px, 48px 48px, 48px 48px;
            animation: cyberNodePulse 4s ease-in-out infinite;
          }
          /* ── Diagonal scan sweep (cyan→magenta) ── */
          @keyframes cyberScanSweep {
            0%   { transform: rotate(15deg) translateX(-200vw); }
            100% { transform: rotate(15deg) translateX(200vw); }
          }
          .cyber-scan-sweep {
            position:fixed; top:-50vh; left:-50vw; width:200vw; height:200vh;
            pointer-events:none; z-index:0;
            background: linear-gradient(
              90deg,
              transparent 0%, transparent 44%,
              #00d3f206 46%, #00d3f255 48%,
              #e12afbcc 50%,
              #00d3f255 52%, #00d3f206 54%,
              transparent 56%, transparent 100%
            );
            animation: cyberScanSweep 9s linear infinite;
          }
          /* ── Glitch scanlines base ── */
          .cyber-scanlines {
            position:fixed; inset:0; pointer-events:none; z-index:0;
            background: repeating-linear-gradient(
              0deg,
              transparent,
              transparent 3px,
              rgba(0,0,0,0.18) 3px,
              rgba(0,0,0,0.18) 4px
            );
          }
          /* ── RGB chromatic-aberration channels ── */
          @keyframes cyberRGBR {
            0%,79%  { transform:translate(0,0); opacity:0; }
            80%     { transform:translate(7px,0); opacity:0.45; }
            81%     { transform:translate(-4px,1px); opacity:0.3; }
            82%     { transform:translate(0,0); opacity:0; }
            91%     { transform:translate(5px,-1px); opacity:0.35; }
            92%     { transform:translate(0,0); opacity:0; }
            100%    { opacity:0; }
          }
          @keyframes cyberRGBB {
            0%,79%  { transform:translate(0,0); opacity:0; }
            80%     { transform:translate(-7px,0); opacity:0.45; }
            81%     { transform:translate(4px,-1px); opacity:0.3; }
            82%     { transform:translate(0,0); opacity:0; }
            91%     { transform:translate(-5px,1px); opacity:0.35; }
            92%     { transform:translate(0,0); opacity:0; }
            100%    { opacity:0; }
          }
          .cyber-rgb-red {
            position:fixed; inset:0; pointer-events:none; z-index:0;
            background:
              linear-gradient(180deg, transparent 15%, #ff004422 15.4%, transparent 15.8%),
              linear-gradient(180deg, transparent 48%, #ff003318 48.5%, transparent 49%),
              linear-gradient(180deg, transparent 72%, #ff005522 72.4%, transparent 72.8%);
            mix-blend-mode: screen;
            animation: cyberRGBR 8s step-start infinite;
          }
          .cyber-rgb-blue {
            position:fixed; inset:0; pointer-events:none; z-index:0;
            background:
              linear-gradient(180deg, transparent 15%, #0055ff22 15.4%, transparent 15.8%),
              linear-gradient(180deg, transparent 48%, #0033ff18 48.5%, transparent 49%),
              linear-gradient(180deg, transparent 72%, #0077ff22 72.4%, transparent 72.8%);
            mix-blend-mode: screen;
            animation: cyberRGBB 8s step-start infinite;
          }
          /* ── Horizontal glitch tear lines ── */
          @keyframes cyberGlitchTear {
            0%,74%  { transform:translateX(0); opacity:0.55; }
            75%     { transform:translateX(-12px); opacity:0.8; }
            75.5%   { transform:translateX(9px);  opacity:0.7; }
            76%     { transform:translateX(-6px);  opacity:0.6; }
            76.5%   { transform:translateX(0);     opacity:0.55; }
            88%     { transform:translateX(0);     opacity:0.55; }
            88.5%   { transform:translateX(16px);  opacity:0.9; }
            89%     { transform:translateX(-8px);  opacity:0.7; }
            89.5%   { transform:translateX(4px);   opacity:0.6; }
            90%     { transform:translateX(0);     opacity:0.55; }
            100%    { transform:translateX(0);     opacity:0.55; }
          }
          .cyber-glitch-lines {
            position:fixed; inset:0; pointer-events:none; z-index:0;
            background:
              linear-gradient(180deg, transparent 22%,   #00d3f214 22.25%, transparent 22.5%),
              linear-gradient(180deg, transparent 41%,   #e12afb11 41.3%,  transparent 41.6%),
              linear-gradient(180deg, transparent 63%,   #00d3f212 63.2%,  transparent 63.4%),
              linear-gradient(180deg, transparent 85.5%, #e12afb14 85.8%,  transparent 86.1%);
            animation: cyberGlitchTear 7s step-start infinite;
          }
          /* ── Digital interference noise ── */
          @keyframes cyberInterference {
            0%   { opacity:0.06; background-position: 0 0; }
            25%  { opacity:0.09; background-position: 3px -2px; }
            50%  { opacity:0.06; background-position: -2px 4px; }
            75%  { opacity:0.08; background-position: 4px 1px; }
            100% { opacity:0.06; background-position: 0 0; }
          }
          .cyber-interference {
            position:fixed; inset:0; pointer-events:none; z-index:0;
            background-image:
              repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(0,211,242,0.08) 1px, rgba(0,211,242,0.08) 2px),
              repeating-linear-gradient(90deg, transparent, transparent 1px, rgba(225,42,251,0.05) 1px, rgba(225,42,251,0.05) 2px);
            background-size: 4px 4px, 4px 4px;
            animation: cyberInterference 0.15s step-start infinite;
          }
          .cyber-gradient-text {
            background: linear-gradient(270deg, #00d3f2 0%, #e12afb 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
          }
          .cyber-platform-section span {
            background: linear-gradient(270deg, #00d3f2 0%, #e12afb 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
          }
          @keyframes cyberIconColorCycle {
            0%,100% { color: #00d3f2; filter: drop-shadow(0 0 3px #00d3f277); }
            50%      { color: #e12afb; filter: drop-shadow(0 0 3px #e12afb77); }
          }
          .cyber-platform-section svg {
            animation: cyberIconColorCycle 4s ease-in-out infinite;
          }
          @keyframes cyberTabGlow {
            0%,100% { box-shadow:0 0 8px #00d3f244, inset 0 0 8px #00d3f211; border-color:#00b8db88; }
            50%      { box-shadow:0 0 14px #e12afb55, inset 0 0 10px #e12afb11; border-color:#e12afb88; }
          }
          .cyber-tab-list {
            background: #020617 !important;
            border: 1px solid #00b8db88 !important;
            border-radius: 4px !important;
            animation: cyberTabGlow 4s ease-in-out infinite;
            clip-path: polygon(12px 0%, 100% 0%, calc(100% - 12px) 100%, 0% 100%);
          }
        `}</style>
      )}
      {isCyberpunkTheme && !profileBackgroundImageUrl && <div className="cyber-bg-mesh" />}
      {isCyberpunkTheme && !profileBackgroundImageUrl && <div className="cyber-scan-sweep" />}
      {isCyberpunkTheme && !profileBackgroundImageUrl && <div className="cyber-scanlines" />}
      {isCyberpunkTheme && !profileBackgroundImageUrl && <div className="cyber-rgb-red" />}
      {isCyberpunkTheme && !profileBackgroundImageUrl && <div className="cyber-rgb-blue" />}
      {isCyberpunkTheme && !profileBackgroundImageUrl && <div className="cyber-glitch-lines" />}
      {isCyberpunkTheme && !profileBackgroundImageUrl && <div className="cyber-interference" />}
      {/* NEO / Matrix theme */}
      {isNeoTheme && (
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap');
          @keyframes neoGlow {
            0%,100% { box-shadow: 0 0 8px #00ff4144, 0 0 24px #00ff4111; border-color: #00ff4188; }
            50%      { box-shadow: 0 0 16px #00ff4177, 0 0 40px #00ff4122; border-color: #00ff41cc; }
          }
          @keyframes neoScanline {
            0%   { transform: translateY(-100%); }
            100% { transform: translateY(100vh); }
          }
          @keyframes neoFlicker {
            0%,100% { opacity: 1; }
            92%     { opacity: 1; }
            93%     { opacity: 0.85; }
            94%     { opacity: 1; }
            96%     { opacity: 0.9; }
            97%     { opacity: 1; }
          }
          .neo-canvas {
            position: fixed; inset: 0; pointer-events: none; z-index: 0;
            opacity: 0.18;
            animation: neoFlicker 8s step-start infinite;
          }
          .neo-vignette {
            position: fixed; inset: 0; pointer-events: none; z-index: 0;
            background: radial-gradient(ellipse 85% 85% at 50% 50%, transparent 55%, rgba(0,0,0,0.72) 100%);
          }
          .neo-scanline {
            position: fixed; left: 0; width: 100%; height: 2px; pointer-events: none; z-index: 0;
            background: linear-gradient(180deg, transparent 0%, #00ff4122 50%, transparent 100%);
            animation: neoScanline 6s linear infinite;
          }
          .neo-stats-card {
            animation: neoGlow 3s ease-in-out infinite;
          }
          .neo-tab-list {
            background: #000800 !important;
            border: 1px solid #00ff4177 !important;
            border-radius: 2px !important;
            animation: neoGlow 3s ease-in-out infinite;
          }
          .neo-gradient-text {
            background: linear-gradient(90deg, #00ff41 0%, #88ffaa 50%, #00ff41 100%);
            background-size: 200% auto;
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            animation: neoTextShift 4s linear infinite;
          }
          @keyframes neoTextShift {
            0%   { background-position: 0% center; }
            100% { background-position: 200% center; }
          }
          .neo-platform-section span {
            color: #00ff41;
          }
          .neo-platform-section svg {
            color: #00ff41;
            filter: drop-shadow(0 0 4px #00ff4188);
          }
        `}</style>
      )}
      {/* Blocks / Minecraft theme */}
      {isBlocksTheme && (
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
          @keyframes blocksGlow {
            0%,100% { box-shadow: 0 0 0 3px #B7FF1A66, 6px 6px 0 #000; }
            50%      { box-shadow: 0 0 0 3px #B7FF1Aaa, 6px 6px 0 #000; }
          }
          .blocks-stats-card {
            border: 3px solid #B7FF1A !important;
            border-radius: 4px !important;
            animation: blocksGlow 2s ease-in-out infinite;
          }
          .blocks-tab-list {
            background: #2a2a2a !important;
            border: 3px solid #B7FF1A !important;
            border-radius: 4px !important;
            box-shadow: 6px 6px 0 #000 !important;
          }
          .blocks-tab-list [data-state="active"] {
            border-radius: 2px !important;
            box-shadow: inset 0 -3px 0 rgba(0,0,0,0.35) !important;
          }
          .blocks-platform-section > div {
            box-shadow: 3px 3px 0 #000 !important;
          }
          .blocks-platform-section span {
            font-family: 'Press Start 2P', monospace;
            font-size: 0.5rem;
            color: #B7FF1A;
          }
          .blocks-platform-section svg {
            color: #B7FF1A;
          }
          .blocks-bg::before {
            content: '';
            position: fixed;
            inset: 0;
            pointer-events: none;
            z-index: 0;
            background-image:
              linear-gradient(white, white),
              linear-gradient(white, white),
              linear-gradient(white, white),
              linear-gradient(#5ea832, #5ea832),
              linear-gradient(#8b5e3c, #8b5e3c),
              linear-gradient(#6b4a2e, #6b4a2e),
              linear-gradient(180deg, #5ba3d0 0%, #87ceeb 55%, #b4daf5 100%);
            background-size:
              96px 32px,
              72px 24px,
              80px 28px,
              100% 16px,
              100% 32px,
              100% 16px,
              100% 100%;
            background-position:
              8% 12%,
              52% 6%,
              80% 20%,
              0 calc(100% - 48px),
              0 calc(100% - 32px),
              0 calc(100% - 16px),
              0 0;
            background-repeat: no-repeat;
          }
          .blocks-nft-header {
            background: #2a2a2a !important;
            border: 3px solid #a855f7 !important;
            border-radius: 4px !important;
            box-shadow: 6px 6px 0 #000 !important;
          }
          .blocks-nft-card {
            border: 3px solid #000 !important;
            border-radius: 4px !important;
            box-shadow: 4px 4px 0 #000 !important;
            transition: box-shadow 0.1s, transform 0.1s !important;
          }
          .blocks-nft-card:hover {
            box-shadow: 6px 6px 0 #000 !important;
            transform: translate(-2px, -2px) !important;
          }
          .image-rendering-pixelated {
            image-rendering: pixelated;
          }
        `}</style>
      )}
      {/* Watermelon theme */}
      {isWatermelonTheme && (
        <style>{`
          .watermelon-stats-card {
            border-radius: 9999px !important;
            background: #ffb3c1 !important;
            border: 5px solid #1d3932 !important;
            padding-left: 8px !important;
            padding-right: 8px !important;
          }
          .watermelon-stat-item {
            padding: 4px 20px;
            text-align: center;
          }
          .watermelon-stat-item:not(:last-child) {
            border-right: 2px solid rgba(0,0,0,0.12);
            padding-right: 20px;
          }
          .watermelon-tab-list {
            border-radius: 9999px !important;
            background: #ffb3c1 !important;
            border: 5px solid #1d3932 !important;
            padding: 4px 8px !important;
          }
          .watermelon-platform-section > div {
            background: #1d3932cc !important;
            border: 2px solid #1d3932 !important;
            border-radius: 9999px !important;
          }
          .watermelon-platform-section span {
            color: #B7FF1A !important;
          }
          .watermelon-platform-section svg {
            color: #B7FF1A !important;
          }
        `}</style>
      )}
      {/* Electric theme animations */}
      {isElectricTheme && (
        <style>{`
          @keyframes electricCardGlow {
            0%,100% { box-shadow: 0 0 12px #ffe03366, 0 0 28px #ffe03322; }
            50%      { box-shadow: 0 0 22px #ffe033cc, 0 0 55px #ffe03355, 0 0 90px #fff81022; }
          }
          .electric-stats-card {
            animation: electricCardGlow 1.8s ease-in-out infinite;
          }
          @keyframes lightningStrike1 {
            0%,82%,100%  { opacity:0; }
            83%  { opacity:1; }
            84%  { opacity:0.35; }
            85%  { opacity:0.9; }
            86%  { opacity:0; }
          }
          @keyframes lightningStrike2 {
            0%,90%,100%  { opacity:0; }
            91%  { opacity:0.9; }
            92%  { opacity:0.25; }
            93%  { opacity:0; }
          }
          @keyframes lightningStrike3 {
            0%,73%,100%  { opacity:0; }
            74%  { opacity:0.7; }
            75%  { opacity:0; }
          }
          @keyframes electricFlash1 {
            0%,82%,100% { opacity:0; }
            83% { opacity:0.18; }
            84% { opacity:0; }
            85% { opacity:0.10; }
            86% { opacity:0; }
          }
          @keyframes electricFlash2 {
            0%,90%,100% { opacity:0; }
            91% { opacity:0.15; }
            92% { opacity:0; }
          }
          @keyframes electricPlasma1 {
            0%,100% { transform: translate(0,0) scale(1); }
            33%     { transform: translate(4%,-3%) scale(1.03); }
            66%     { transform: translate(-3%,4%) scale(0.97); }
          }
          @keyframes electricPlasma2 {
            0%,100% { transform: translate(0,0) scale(1); }
            50%     { transform: translate(-5%,-2%) scale(1.02); }
          }
          @keyframes electricPlasma3 {
            0%,100% { transform: translate(0,0); }
            40%     { transform: translate(3%,5%); }
            80%     { transform: translate(-4%,-3%); }
          }
          .electric-bolt-1 {
            position:fixed; inset:0; pointer-events:none; z-index:2;
            background: linear-gradient(
              65deg,
              transparent 0%, transparent 28%,
              rgba(255,248,100,0.04) 33%,
              rgba(255,248,100,0.92) 36%,
              rgba(255,255,255,1) 36.8%,
              rgba(255,248,100,0.92) 37.5%,
              rgba(255,248,100,0.04) 42%,
              transparent 47%, transparent 100%
            );
            animation: lightningStrike1 6s linear infinite;
          }
          .electric-bolt-2 {
            position:fixed; inset:0; pointer-events:none; z-index:2;
            background: linear-gradient(
              -52deg,
              transparent 0%, transparent 52%,
              rgba(255,248,100,0.04) 57%,
              rgba(255,248,100,0.88) 60%,
              rgba(255,255,255,0.98) 60.8%,
              rgba(255,248,100,0.88) 61.5%,
              rgba(255,248,100,0.04) 66%,
              transparent 71%, transparent 100%
            );
            animation: lightningStrike2 8s linear infinite 1.8s;
          }
          .electric-bolt-3 {
            position:fixed; inset:0; pointer-events:none; z-index:2;
            background: linear-gradient(
              78deg,
              transparent 0%, transparent 68%,
              rgba(255,248,100,0.03) 71%,
              rgba(255,248,100,0.75) 74%,
              rgba(255,255,255,0.92) 74.8%,
              rgba(255,248,100,0.75) 75.5%,
              rgba(255,248,100,0.03) 79%,
              transparent 83%, transparent 100%
            );
            animation: lightningStrike3 10s linear infinite 4.5s;
          }
          .electric-flash-1 {
            position:fixed; inset:0; pointer-events:none; z-index:1;
            background: rgba(255,240,50,0.14);
            animation: electricFlash1 6s linear infinite;
          }
          .electric-flash-2 {
            position:fixed; inset:0; pointer-events:none; z-index:1;
            background: rgba(255,240,50,0.12);
            animation: electricFlash2 8s linear infinite 1.8s;
          }
          .electric-plasma-1 {
            position:fixed; inset:0; pointer-events:none; z-index:0;
            background:
              radial-gradient(ellipse 60% 40% at 15% 25%, rgba(255,224,51,0.14) 0%, transparent 70%),
              radial-gradient(ellipse 45% 55% at 85% 70%, rgba(255,224,51,0.09) 0%, transparent 70%),
              radial-gradient(ellipse 80% 35% at 50% 95%, rgba(255,200,0,0.07) 0%, transparent 60%);
            animation: electricPlasma1 9s ease-in-out infinite;
          }
          .electric-plasma-2 {
            position:fixed; inset:0; pointer-events:none; z-index:0;
            background:
              radial-gradient(ellipse 50% 70% at 78% 18%, rgba(255,224,51,0.11) 0%, transparent 65%),
              radial-gradient(ellipse 40% 50% at 10% 82%, rgba(255,224,51,0.08) 0%, transparent 70%),
              radial-gradient(ellipse 90% 30% at 40% 55%, rgba(255,200,0,0.06) 0%, transparent 60%);
            animation: electricPlasma2 13s ease-in-out infinite;
          }
          .electric-plasma-3 {
            position:fixed; inset:0; pointer-events:none; z-index:0;
            opacity:0.4;
            background-image:
              linear-gradient(0deg, rgba(255,224,51,0.06) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,224,51,0.06) 1px, transparent 1px);
            background-size: 50px 50px;
            animation: electricPlasma3 20s ease-in-out infinite;
          }
        `}</style>
      )}
      {isElectricTheme && !profileBackgroundImageUrl && <div className="electric-plasma-1" />}
      {isElectricTheme && !profileBackgroundImageUrl && <div className="electric-plasma-2" />}
      {isElectricTheme && !profileBackgroundImageUrl && <div className="electric-plasma-3" />}
      {isElectricTheme && <div className="electric-bolt-1" />}
      {isElectricTheme && <div className="electric-bolt-2" />}
      {isElectricTheme && <div className="electric-bolt-3" />}
      {isElectricTheme && <div className="electric-flash-1" />}
      {isElectricTheme && <div className="electric-flash-2" />}
      {/* Share button - positioned on banner top right for mobile */}
      <div className="block md:hidden absolute top-4 right-4 z-30">
        <React.Suspense fallback={null}>
          <GamefolioShareDialog 
            username={profile.username}
            userId={profile.id}
            userProfile={{
              displayName: profile.displayName,
              bio: profile.bio,
              avatarUrl: profileAvatarSignedUrl || profile.avatarUrl,
              bannerUrl: profile.bannerUrl,
              selectedAvatarBorderId: profile.selectedAvatarBorderId,
              avatarBorderColor: profile.avatarBorderColor,
              nftProfileTokenId: profile.nftProfileTokenId,
              nftProfileImageUrl: profile.nftProfileImageUrl,
              emailVerified: profile.emailVerified,
              role: profile.role,
              isPro: profile.isPro,
              selectedVerificationBadgeId: profile.selectedVerificationBadgeId,
              userType: profile.userType,
              showUserType: profile.showUserType,
              accentColor: profile.accentColor,
              backgroundColor: profile.backgroundColor,
              cardColor: profile.cardColor,
              primaryColor: profile.primaryColor
            }}
            userStats={{
              clips: profile._count?.clips || 0,
              followers: profile._count?.followers || 0,
              following: profile._count?.following || 0
            }}
            favoriteGames={favoriteGames?.slice(0, 5).map(g => ({ id: g.id, name: g.name, imageUrl: g.imageUrl }))}
            trigger={
              <Button
                variant="ghost"
                size="sm"
                className="p-2 h-10 w-10 rounded-full hover:opacity-90 backdrop-blur-sm"
                style={shareButtonStyle}
              >
                <Share2 className="w-5 h-5" />
              </Button>
            }
          />
        </React.Suspense>
      </div>

      {/* Profile Info - positioned below banner with overlapping profile picture */}
      <div
        className="max-w-[98%] md:max-w-[90%] mx-auto relative z-20"
      >

        {/* Mobile Layout - Left-aligned like reference design */}
        <div className="block md:hidden pb-6 relative" style={{ marginTop: '-80px', paddingTop: '0px' }}>
          {/* Profile Picture - Left aligned on Mobile */}
          <div className="flex mb-2 justify-start pl-4">
            {/* Explicit dimensions to ensure circular glow renders correctly - matches profile avatar sizes */}
            <div className="relative h-28 w-28">
              {/* Circular glow removed on mobile per user request */}
              <div 
                className="relative z-10 cursor-pointer h-full w-full"
                onClick={() => {
                  if (profile.nftProfileTokenId && profileNftData?.nfts) {
                    const nft = profileNftData.nfts.find(n => n.tokenId === profile.nftProfileTokenId);
                    if (nft) {
                      setSelectedProfileNft(nft);
                      return;
                    }
                  }
                  profileAvatarSignedUrl && openLightbox(profileAvatarSignedUrl, profile.displayName, profile.username);
                }}
              >
                <CustomAvatar 
                  user={profile}
                  size="mobile-profile"
                  borderIntensity="strong"
                  showAvatarBorderOverlay={true}
                  showLiveOverlay={!!(isStreamer && (profile?.twitchVerified || profile?.kickVerified))}
                  isLive={profileLiveStatus?.isLive ?? false}
                  themeColor={avatarThemeColor}
                  className="h-full w-full"
                />
              </div>
              {/* Online status indicator - green circle at the edge of the circular avatar glow position */}
              {!selectedProfileNft && !lightboxData.isOpen && (
              <div className="absolute z-30" style={{ top: '-2px', right: '-2px' }}>
                <div className="w-3 h-3 rounded-full bg-primary shadow-[0_0_0_2px_rgba(0,0,0,0.8)]"></div>
              </div>
              )}
              {/* Level Badge with Progress - positioned halfway on/off bottom border */}
              {!selectedProfileNft && !lightboxData.isOpen && (
              <div className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 scale-75" style={{ top: '100%' }}>
                <LevelBadgeWithProgress 
                  userId={profile.id}
                  level={profile.level || 1}
                  size="small"
                  username={profile.username}
                />
              </div>
              )}
            </div>
          </div>

          {/* Name Tag - Mobile view for own profile (absolute positioned) */}
          {isOwnProfile && nameTagData?.nameTag && nameTagSignedUrl && (
            <div 
              className="absolute right-2 flex md:hidden flex-col items-end gap-2 cursor-pointer"
              style={{ top: '88px' }}
              onClick={() => setNameTagPreviewOpen(true)}
            >
              <div className="flex flex-col items-center">
                <div className="relative flex flex-col items-center">
                  <div 
                    className="rounded-md"
                    style={{
                      width: '120px',
                      height: '28px',
                      ...nameTagBgStyle,
                      ...(isLightBackground ? {} : { boxShadow: '0 2px 10px rgba(0, 0, 0, 0.3)' })
                    }}
                  />
                  <img 
                    src={nameTagSignedUrl} 
                    alt={nameTagData?.nameTag?.name || 'Name Tag'}
                    title={nameTagData?.nameTag?.description || nameTagData?.nameTag?.name}
                    className="absolute z-10 hover:scale-105 transition-transform"
                    style={{
                      width: '140px',
                      height: 'auto',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)'
                    }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
                <span
                  className="text-[10px] mt-1 uppercase tracking-widest transition-colors"
                  style={isCyberpunkTheme ? { background: 'linear-gradient(270deg,#00d3f2,#e12afb)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', fontFamily: "'Orbitron', sans-serif", letterSpacing: '1.4px' } : { color: 'rgba(255,255,255,0.4)' }}
                >Nametag</span>
              </div>
            </div>
          )}

          {/* Action buttons for mobile - Message icon and Follow button below banner */}
          {!isOwnProfile && currentUser && (
            <div className="absolute right-2 flex flex-col items-end gap-2" style={{ top: '88px' }}>
              <div className="flex items-center gap-2">
                {/* Message icon button */}
                <Button 
                  onClick={() => {
                    console.log('🎯 MESSAGE BUTTON CLICKED - Opening message dialog for:', username);
                    setMessageDialogOpen(true);
                  }}
                  variant="outline"
                  size="sm"
                  className="h-9 w-9 p-0 rounded-full border-border hover:bg-primary/10"
                >
                  <MessageSquare className="h-4 w-4" />
                </Button>
                {/* Follow button */}
                <Button 
                  onClick={handleFollowClick}
                  variant={followRequestStatus === 'following' ? "outline" : "default"}
                  size="sm"
                  disabled={followMutation.isPending}
                  className="px-4 rounded-full font-semibold"
                  style={followRequestStatus === 'following' ? {
                    borderColor: 'hsl(var(--border))',
                    color: 'hsl(var(--foreground))',
                    backgroundColor: 'transparent',
                  } : followRequestStatus === 'requested' ? {
                    borderColor: 'hsl(var(--border))',
                    color: 'hsl(var(--foreground))',
                    backgroundColor: 'transparent',
                  } : {
                    backgroundColor: 'hsl(var(--foreground))',
                    color: 'hsl(var(--background))',
                  }}
                >
                  {followMutation.isPending ? (
                    <div className="w-4 h-4 rounded-full border-2 border-t-transparent border-current animate-spin"></div>
                  ) : followRequestStatus === 'following' ? "Following" : 
                     followRequestStatus === 'requested' ? "Pending" : 
                     "Follow"}
                </Button>
              </div>
              {/* Name Tag - Mobile view for other users (below follow buttons) */}
              {nameTagData?.nameTag && nameTagSignedUrl && (
                <div 
                  className="flex flex-col items-center mt-2 cursor-pointer"
                  onClick={() => setNameTagPreviewOpen(true)}
                >
                  <div className="relative flex flex-col items-center">
                    <div 
                      className="rounded-md"
                      style={{
                        width: '120px',
                        height: '28px',
                        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%)',
                        border: '1px solid rgba(148, 163, 184, 0.2)',
                        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.3)'
                      }}
                    />
                    <img 
                      src={nameTagSignedUrl} 
                      alt={nameTagData?.nameTag?.name || 'Name Tag'}
                      title={nameTagData?.nameTag?.description || nameTagData?.nameTag?.name}
                      className="absolute z-10 hover:scale-105 transition-transform"
                      style={{
                        width: '140px',
                        height: 'auto',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)'
                      }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                  <span
                    className="text-[10px] mt-1 uppercase tracking-widest transition-colors"
                    style={isCyberpunkTheme ? { background: 'linear-gradient(270deg,#00d3f2,#e12afb)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', fontFamily: "'Orbitron', sans-serif", letterSpacing: '1.4px' } : { color: 'rgba(255,255,255,0.4)' }}
                  >Nametag</span>
                </div>
              )}
            </div>
          )}
          

          {/* Username and Display Name - Left aligned on Mobile */}
          <div className="flex flex-col items-start gap-0.5 mb-2 mt-8 pl-4">
            <div className="flex items-center gap-2">
              <h1 className={`font-bold ${profileFontAnimClass}`} style={{ fontFamily: profileFontFamily, textShadow: isMacTheme ? 'none' : profileTextShadow, color: isWatermelonTheme ? '#ffffff' : isMacTheme ? '#1a1a1a' : isLightBackground ? accentColor : profileFontColor, fontSize: `${1.25 * profileFontScale}rem`, lineHeight: `${1.75 * profileFontScale}rem` }}>{profile.displayName}</h1>
              <VerificationBadge
                isVerified={!!verificationBadgeData?.verificationBadge}
                badgeImageUrl={verificationBadgeData?.verificationBadge?.imageUrl}
                badgeName={verificationBadgeData?.verificationBadge?.name}
                size="lg"
              />
              <ModeratorBadge 
                isModerator={(profile.role === "moderator" || profile.role === "admin") && !verificationBadgeData?.verificationBadge} 
                size="lg" 
              />
            </div>
            <span className="text-sm font-normal" style={{ color: isLightBackground ? accentColor : 'rgba(255,255,255,0.6)' }}>@{profile.username}</span>
            {/* User type badges on their own line */}
            {profile.userType && profile.showUserType !== false && (
              <div className="flex items-center gap-2 flex-wrap mt-3 mb-2">
                {(() => {
                  const userTypes = profile.userType!.split(',').map(t => t.trim()).filter(Boolean);
                  const displayTypes = userTypes.slice(0, 2);
                  
                  return displayTypes.map((type, index) => {
                    const config = userTypeConfig[type];
                    if (!config) return null;
                    const IconComponent = config.icon;
                    return (
                      <Badge 
                        key={`${type}-${index}`}
                        variant="outline" 
                        className="border text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-[0.5px]"
                        style={isLightBackground ? {
                          backgroundColor: 'rgba(255,255,255,0.6)',
                          color: '#ff2056',
                          border: '0.556px solid #fda5d5',
                          boxShadow: '0 1px 2px -1px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.1)',
                        } : {
                          backgroundColor: `${accentColor || '#00bba7'}1a`,
                          color: accentColor || '#00d5be',
                          borderColor: `${accentColor || '#00bba7'}66`,
                        }}
                      >
                        <IconComponent className="w-3 h-3 mr-1.5" />
                        {config.label}
                      </Badge>
                    );
                  });
                })()}
              </div>
            )}
          </div>

          {/* Bio — below the streamer badge, outside the card */}
          {profile.bio && (
            <div className="mx-4 mt-2 mb-1">
              <p className={`text-sm pr-4 ${isLightBackground ? '' : 'text-slate-300'}`} style={{ color: isLightBackground ? '#1d293d' : undefined }}>{profile.bio}</p>
            </div>
          )}

          {/* Profile Info Card — stats only, Collection button on top-right border */}
          <div className="relative mx-4 mt-2 mb-1">
            {/* Collection button pinned to top-right border of the card */}
            <button 
              onClick={() => setProfileSectionTab(profileSectionTab === 'collection' ? 'stats' : 'collection')}
              className="absolute -top-3 -right-1 z-10 px-4 py-1.5 text-[10px] font-black rounded-full uppercase tracking-[0.8px] hover:opacity-90 transition-opacity"
              style={{ 
                background: profileSectionTab === 'collection'
                  ? (isWatermelonTheme ? '#1d3932' : isZombieTheme ? '#0d1a00' : isCyberpunkTheme ? '#020617' : isNeoTheme ? '#000800' : isBlocksTheme ? '#1a1a1a' : isForestTheme ? '#e8d5b7' : isGothicTheme ? '#0d0118' : '#1a1a2e')
                  : isWatermelonTheme
                    ? '#ffb3c1'
                    : isLightBackground
                      ? 'linear-gradient(270deg, #ff637e 0%, #f6339a 100%)'
                      : isZombieTheme
                        ? 'linear-gradient(180deg, #2a5000 0%, #162b00 100%)'
                        : isCyberpunkTheme
                          ? 'rgba(2,6,23,0.9)'
                          : isNeoTheme
                            ? 'linear-gradient(180deg, #003300 0%, #001400 100%)'
                            : isBlocksTheme
                              ? 'linear-gradient(180deg, #B7FF1A 0%, #A2F000 100%)'
                              : isForestTheme
                                ? '#1d3932'
                                : isGothicTheme
                                  ? 'linear-gradient(135deg, #3d0070 0%, #1e053a 100%)'
                                  : isCartoonTheme
                                    ? (profileSectionTab === 'collection' ? '#fffaec' : 'linear-gradient(135deg, #ff5e5e 0%, #ff7a5e 100%)')
                                    : 'linear-gradient(270deg, #5ee9b5 0%, #fff085 50%, #ffb86a 100%)',
                color: profileSectionTab === 'collection' ? (isWatermelonTheme ? '#ffffff' : isZombieTheme ? '#9ae600' : isCyberpunkTheme ? '#00d3f2' : isNeoTheme ? '#00ff41' : isBlocksTheme ? '#B7FF1A' : isForestTheme ? '#5C3317' : isGothicTheme ? '#c27aff' : isCartoonTheme ? '#1d1d1f' : '#ffffff') : isWatermelonTheme ? '#0d1a12' : isLightBackground ? '#ffffff' : isZombieTheme ? '#9ae600' : isCyberpunkTheme ? 'transparent' : isNeoTheme ? '#00ff41' : isBlocksTheme ? '#1a1a1a' : isForestTheme ? '#e8d5b7' : isGothicTheme ? '#c27aff' : isCartoonTheme ? '#ffffff' : '#0f172b',
                border: isWatermelonTheme ? '3px solid #1d3932' : isZombieTheme ? '1px solid #9ae60066' : isCyberpunkTheme ? '1px solid #00b8db66' : isNeoTheme ? '1px solid #00ff4166' : isBlocksTheme ? '3px solid #B7FF1A' : isForestTheme ? '1px solid rgba(164,118,66,0.4)' : isGothicTheme ? '1px solid #c27aff55' : isCartoonTheme ? '3px solid #1d1d1f' : undefined,
                fontFamily: isZombieTheme ? "'Creepster', cursive" : isCyberpunkTheme ? "'Orbitron', sans-serif" : isNeoTheme ? "'JetBrains Mono', monospace" : isBlocksTheme ? "'Press Start 2P', monospace" : isGothicTheme ? "'Palatino Linotype', 'Book Antiqua', Palatino, serif" : isCartoonTheme ? "'Bricolage Grotesque', 'Arial Black', sans-serif" : undefined,
                letterSpacing: isZombieTheme ? '2px' : isCyberpunkTheme ? '2px' : isNeoTheme ? '1.5px' : isBlocksTheme ? '0.5px' : isGothicTheme ? '1.5px' : isCartoonTheme ? '-0.5px' : undefined,
                fontWeight: isCyberpunkTheme ? '900' : isNeoTheme ? '700' : isBlocksTheme ? '400' : isCartoonTheme ? '800' : undefined,
                fontSize: isBlocksTheme ? '0.5rem' : isCartoonTheme ? '0.7rem' : undefined,
                borderRadius: isBlocksTheme ? '4px' : undefined,
                boxShadow: isBlocksTheme ? '4px 4px 0 #000' : isGothicTheme ? '0 0 14px #c27aff33' : isCartoonTheme ? '3px 3px 0 #1d1d1f' : undefined,
              }}>
                <span className={isCyberpunkTheme ? 'cyber-gradient-text' : isNeoTheme ? 'neo-gradient-text' : ''}>{isGothicTheme ? '👻 Collection' : 'Collection'}</span>
            </button>

            {/* Stats card container */}
            <div
              className="relative mt-4 rounded-lg transition-all duration-300"
            >

            <div 
              className={`rounded-2xl ${isZombieTheme ? 'zombie-stats-card' : ''} ${isCyberpunkTheme ? 'cyber-stats-card' : ''} ${isNeoTheme ? 'neo-stats-card' : ''} ${isBlocksTheme ? 'blocks-stats-card' : ''} ${isWatermelonTheme ? 'watermelon-stats-card' : ''} ${isElectricTheme ? 'electric-stats-card' : ''}`}
              style={isWatermelonTheme ? {
                background: '#ffb3c1',
              } : isCartoonTheme ? {
                background: '#ffffff',
                border: '4px solid #000000',
                borderRadius: '32px',
                boxShadow: '8px 8px 0 #000000',
              } : isLightBackground ? {
                background: 'rgba(255,255,255,0.37)',
                border: '0.556px solid rgba(255,255,255,0.8)',
                boxShadow: '0 1px 2px -1px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.1)',
              } : isZombieTheme ? {
                background: '#1a1d1a',
                border: '1.667px solid #7ccf00',
                boxShadow: '0 0 18px #9ae60055, 0 0 40px #9ae60022',
              } : isCyberpunkTheme ? {
                background: '#020617',
                border: '1px solid #00b8db',
              } : isNeoTheme ? {
                background: '#001a00',
                border: '1px solid #00ff4177',
                boxShadow: '0 0 16px #00ff4122, 0 0 40px #00ff4111',
              } : isBlocksTheme ? {
                background: '#2a2a2a',
              } : isForestTheme ? {
                background: '#e8d5b7',
                border: '1px solid #c4a88266',
              } : isGothicTheme ? {
                background: 'rgba(15,2,38,0.92)',
                border: '1px solid #c27aff55',
                boxShadow: '0 0 20px #c27aff22, 0 0 40px #c27aff11',
              } : {
                background: `${accentColor || '#00bba7'}0d`,
                border: `1px solid ${accentColor || '#00bba7'}33`,
              }}
            >
              <div className="p-4">
                {profileSectionTab === 'stats' ? (
                  <>
                  {isCartoonTheme ? (
                    <div className="flex w-full py-2">
                      {[
                        { value: (clips?.length || 0) + (screenshots?.length || 0), label: 'Uploads', color: '#3498db' },
                        { value: Number(profile._count?.followers || 0), label: 'Followers', color: '#e74c3c' },
                        { value: Number(profile._count?.following || 0), label: 'Following', color: '#27ae60' },
                      ].map((stat, i, arr) => (
                        <div key={stat.label} className="flex flex-1 items-center">
                          <div className="flex flex-col items-center gap-1 flex-1 py-1">
                            <span style={{ color: stat.color, fontFamily: "'Bricolage Grotesque', 'Arial Black', sans-serif", fontWeight: 800, fontSize: '1.6rem', letterSpacing: '-0.9px', lineHeight: 1 }}>{stat.value}</span>
                            <span style={{ color: 'rgba(0,0,0,0.4)', fontSize: '10px', letterSpacing: '2.2px', fontWeight: 800, textTransform: 'uppercase' as const, fontFamily: "'Bricolage Grotesque', 'Arial Black', sans-serif" }}>{stat.label}</span>
                          </div>
                          {i < arr.length - 1 && (
                            <div style={{ width: '4px', height: '56px', background: '#000000', flexShrink: 0 }} />
                          )}
                        </div>
                      ))}
                    </div>
                  ) : isGothicTheme ? (
                    <div className="flex mt-1 w-full">
                      {[
                        { value: (clips?.length || 0) + (screenshots?.length || 0), label: 'Uploads' },
                        { value: Number(profile._count?.followers || 0), label: 'Followers' },
                        { value: Number(profile._count?.following || 0), label: 'Following' },
                      ].map((stat, i, arr) => (
                        <div key={stat.label} className="flex flex-1 items-center">
                          <div className="flex flex-col items-center gap-1 flex-1 py-1">
                            <span style={{ color: '#ffffff', fontWeight: 900, fontSize: '1.1rem', lineHeight: 1 }}>{stat.value}</span>
                            <span style={{ color: '#c27aff', fontSize: '8px', letterSpacing: '1.2px', fontWeight: 700, textTransform: 'uppercase' as const, fontFamily: "'Palatino Linotype', 'Book Antiqua', Palatino, serif" }}>{stat.label}</span>
                          </div>
                          {i < arr.length - 1 && (
                            <div style={{ width: '1px', height: '40px', background: 'rgba(194,122,255,0.25)', flexShrink: 0 }} />
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                  <div className="flex mt-1" style={isWatermelonTheme ? { gap: 0 } : { gap: '1.5rem' }}>
                    <div className={`flex flex-col gap-1 ${isWatermelonTheme ? 'watermelon-stat-item' : ''}`}>
                      <span className="font-black text-base" style={{ color: isWatermelonTheme ? '#0d1a12' : isLightBackground ? '#1d293d' : isZombieTheme ? '#9ae600' : isCyberpunkTheme ? '#00d3f2' : isBlocksTheme ? '#ef4444' : isForestTheme ? '#5C3317' : '#ffffff', fontFamily: isCyberpunkTheme ? "'Orbitron', sans-serif" : isBlocksTheme ? "'Press Start 2P', monospace" : undefined, fontSize: isBlocksTheme ? '0.9rem' : undefined }}>{(clips?.length || 0) + (screenshots?.length || 0)}</span>
                      <span className="text-[8px] uppercase font-black" style={isWatermelonTheme ? { color: '#0d1a12', letterSpacing: '0.8px' } : isZombieTheme ? { backgroundColor: '#9ae600e6', color: '#3c6300', padding: '2px 6px', borderRadius: '4px', letterSpacing: '1.6px' } : isCyberpunkTheme ? { background: 'linear-gradient(270deg, #00d3f2, #e12afb)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', padding: '2px 6px', letterSpacing: '1.6px', fontFamily: "'Orbitron', sans-serif" } : isBlocksTheme ? { backgroundColor: '#ef4444', color: '#ffffff', padding: '2px 6px', borderRadius: '2px', fontFamily: "'Press Start 2P', monospace", fontSize: '6px', letterSpacing: '0px', boxShadow: '3px 3px 0 #000' } : isForestTheme ? { color: '#8B5E3C', letterSpacing: '0.8px' } : { color: accentColor || '#00d5be', letterSpacing: '0.8px' }}>UPLOADS</span>
                    </div>
                    <div className={`flex flex-col gap-1 ${isWatermelonTheme ? 'watermelon-stat-item' : ''}`}>
                      <span className="font-black text-base" style={{ color: isWatermelonTheme ? '#0d1a12' : isLightBackground ? '#1d293d' : isZombieTheme ? '#9ae600' : isCyberpunkTheme ? '#ed6aff' : isBlocksTheme ? '#3b82f6' : isForestTheme ? '#5C3317' : '#ffffff', fontFamily: isCyberpunkTheme ? "'Orbitron', sans-serif" : isBlocksTheme ? "'Press Start 2P', monospace" : undefined, fontSize: isBlocksTheme ? '0.9rem' : undefined }}>{Number(profile._count?.followers || 0)}</span>
                      <span className="text-[8px] uppercase font-black" style={isWatermelonTheme ? { color: '#0d1a12', letterSpacing: '0.8px' } : isZombieTheme ? { backgroundColor: '#9ae600e6', color: '#3c6300', padding: '2px 6px', borderRadius: '4px', letterSpacing: '1.6px' } : isCyberpunkTheme ? { background: 'linear-gradient(270deg, #00d3f2, #e12afb)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', padding: '2px 6px', letterSpacing: '1.6px', fontFamily: "'Orbitron', sans-serif" } : isBlocksTheme ? { backgroundColor: '#3b82f6', color: '#ffffff', padding: '2px 6px', borderRadius: '2px', fontFamily: "'Press Start 2P', monospace", fontSize: '6px', letterSpacing: '0px', boxShadow: '3px 3px 0 #000' } : isForestTheme ? { color: '#8B5E3C', letterSpacing: '0.8px' } : { color: accentColor || '#00d5be', letterSpacing: '0.8px' }}>FOLLOWERS</span>
                    </div>
                    <div className={`flex flex-col gap-1 ${isWatermelonTheme ? 'watermelon-stat-item' : ''}`}>
                      <span className="font-black text-base" style={{ color: isWatermelonTheme ? '#0d1a12' : isLightBackground ? '#1d293d' : isZombieTheme ? '#9ae600' : isCyberpunkTheme ? '#00d3f2' : isBlocksTheme ? '#B7FF1A' : isForestTheme ? '#5C3317' : '#ffffff', fontFamily: isCyberpunkTheme ? "'Orbitron', sans-serif" : isBlocksTheme ? "'Press Start 2P', monospace" : undefined, fontSize: isBlocksTheme ? '0.9rem' : undefined }}>{Number(profile._count?.following || 0)}</span>
                      <span className="text-[8px] uppercase font-black" style={isWatermelonTheme ? { color: '#0d1a12', letterSpacing: '0.8px' } : isZombieTheme ? { backgroundColor: '#9ae600e6', color: '#3c6300', padding: '2px 6px', borderRadius: '4px', letterSpacing: '1.6px' } : isCyberpunkTheme ? { background: 'linear-gradient(270deg, #00d3f2, #e12afb)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', padding: '2px 6px', letterSpacing: '1.6px', fontFamily: "'Orbitron', sans-serif" } : isBlocksTheme ? { backgroundColor: '#B7FF1A', color: '#1a1a1a', padding: '2px 6px', borderRadius: '2px', fontFamily: "'Press Start 2P', monospace", fontSize: '6px', letterSpacing: '0px', boxShadow: '3px 3px 0 #000' } : isForestTheme ? { color: '#8B5E3C', letterSpacing: '0.8px' } : { color: accentColor || '#00d5be', letterSpacing: '0.8px' }}>FOLLOWING</span>
                    </div>
                  </div>
                  )}
                  </>
                ) : (
                  <>
                  {isCartoonTheme ? (
                    <div className="flex w-full py-2 justify-center">
                      <div className="flex flex-col items-center gap-1">
                        <span style={{ color: '#ff5e5e', fontFamily: "'Bricolage Grotesque', 'Arial Black', sans-serif", fontWeight: 800, fontSize: '1.6rem', letterSpacing: '-0.9px', lineHeight: 1 }}>{profileNftData?.nfts.filter(n => !n.sold).length || 0}</span>
                        <span style={{ color: 'rgba(0,0,0,0.4)', fontSize: '10px', letterSpacing: '2.2px', fontWeight: 800, textTransform: 'uppercase' as const, fontFamily: "'Bricolage Grotesque', 'Arial Black', sans-serif" }}>NFTs Owned</span>
                      </div>
                    </div>
                  ) : isGothicTheme ? (
                    <div className="flex mt-1 w-full justify-center">
                      <div className="flex flex-col items-center gap-1 py-1">
                        <div style={{ background: 'rgba(80,30,160,0.5)', borderRadius: '12px', width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                          💎
                        </div>
                        <span style={{ color: '#ffffff', fontWeight: 900, fontSize: '1.1rem', lineHeight: 1 }}>{profileNftData?.nfts.filter(n => !n.sold).length || 0}</span>
                        <span style={{ color: '#c27aff', fontSize: '8px', letterSpacing: '1.2px', fontWeight: 700, textTransform: 'uppercase' as const, fontFamily: "'Palatino Linotype', 'Book Antiqua', Palatino, serif" }}>NFTs Owned</span>
                      </div>
                    </div>
                  ) : (
                  <div className="flex items-center gap-2 mt-1">
                    <Hexagon className="w-4 h-4" style={{ color: isBlocksTheme ? '#a855f7' : isWatermelonTheme ? '#0d1a12' : isZombieTheme ? '#9ae600' : isCyberpunkTheme ? '#00d3f2' : isNeoTheme ? '#00ff41' : isForestTheme ? '#B7FF1A' : undefined }} />
                    {isBlocksTheme ? (
                      <span style={{ backgroundColor: '#a855f7', color: '#ffffff', padding: '2px 6px', borderRadius: '2px', fontFamily: "'Press Start 2P', monospace", fontSize: '6px', letterSpacing: '0px', boxShadow: '3px 3px 0 #000' }}>
                        {profileNftData?.nfts.filter(n => !n.sold).length || 0} NFTs OWNED
                      </span>
                    ) : (
                      <span className="text-sm" style={{ color: isWatermelonTheme ? '#0d1a12' : isForestTheme ? '#1a1a1a' : isZombieTheme ? '#9ae600' : isCyberpunkTheme ? '#00d3f2' : isNeoTheme ? '#00ff41' : accentColor || 'hsl(var(--primary))' }}>
                        {`${profileNftData?.nfts.filter(n => !n.sold).length || 0} NFTs owned`}
                      </span>
                    )}
                  </div>
                  )}
                  </>
                )}
              </div>
            </div>
            </div>
          </div>

          {/* Platform tags and Social Links — below the stats card */}
          {profileSectionTab === 'stats' && <div className={`flex flex-wrap gap-1.5 mb-4 mt-4 pl-4 pr-8 ${isCyberpunkTheme ? 'cyber-platform-section' : ''} ${isNeoTheme ? 'neo-platform-section' : ''} ${isBlocksTheme ? 'blocks-platform-section' : ''} ${isWatermelonTheme ? 'watermelon-platform-section' : ''}`}>
            {profile.steamUsername && (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium" style={getBtnStyle('steam')}>
                <SiSteam className="w-2.5 h-2.5" />
                <span>{profile.steamUsername}</span>
              </div>
            )}
            {profile.nintendoUsername && (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium" style={getBtnStyle('nintendo')}>
                <Gamepad2 className="w-2.5 h-2.5" />
                <span>{profile.nintendoUsername}</span>
              </div>
            )}
            {profile.xboxUsername && (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium" style={getBtnStyle('xbox')}>
                <FaXbox className="w-2.5 h-2.5" />
                <span>{profile.xboxUsername}</span>
              </div>
            )}
            {profile.playstationUsername && (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium" style={getBtnStyle('playstation')}>
                <SiPlaystation className="w-2.5 h-2.5" />
                <span>{profile.playstationUsername}</span>
              </div>
            )}
            {profile.epicUsername && (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium" style={getBtnStyle('epic')}>
                <SiEpicgames className="w-2.5 h-2.5" />
                <span>{profile.epicUsername}</span>
              </div>
            )}
            {profile.discordUsername && (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium" style={getBtnStyle('discord')}>
                <SiDiscord className="w-2.5 h-2.5" />
                <span>{profile.discordUsername}</span>
              </div>
            )}
            {profile.twitterUsername && (
              <a 
                href={`https://twitter.com/${profile.twitterUsername}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium hover:opacity-80 transition-opacity"
                style={getBtnStyle('twitter')}
              >
                <FaXTwitter className="w-2.5 h-2.5" />
                <span>{profile.twitterUsername}</span>
              </a>
            )}
            {profile.youtubeUsername && (
              <a 
                href={`https://youtube.com/@${profile.youtubeUsername}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium hover:opacity-80 transition-opacity"
                style={getBtnStyle('youtube')}
              >
                <FaYoutube className="w-2.5 h-2.5" />
                <span>{profile.youtubeUsername}</span>
              </a>
            )}
            {profile.instagramUsername && (
              <a 
                href={`https://instagram.com/${profile.instagramUsername}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium hover:opacity-80 transition-opacity"
                style={getBtnStyle('instagram')}
              >
                <FaInstagram className="w-2.5 h-2.5" />
                <span>{profile.instagramUsername}</span>
              </a>
            )}
            {profile.facebookUsername && (
              <a 
                href={`https://facebook.com/${profile.facebookUsername}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium hover:opacity-80 transition-opacity"
                style={getBtnStyle('facebook')}
              >
                <FaFacebook className="w-2.5 h-2.5" />
                <span>{profile.facebookUsername}</span>
              </a>
            )}
          </div>}

        </div>

        {/* Desktop Layout - Vertical stacked on left */}
        <div className="hidden md:flex flex-row pb-4 relative max-w-[90%] mx-auto" style={{ marginTop: '-112px' }}>
          {/* Left side - Profile info stacked vertically */}
          <div className="flex flex-col">
            {/* Profile Picture positioned to overlap banner - explicit dimensions to ensure circular glow renders correctly */}
            <div className="relative flex-shrink-0 mb-4 h-56 w-56">
              {/* Circular glow - only show when NO SVG border is selected and no overlay is open */}
              {!profile.selectedAvatarBorderId && !selectedProfileNft && !lightboxData.isOpen && (
                <div 
                  className="absolute inset-0 rounded-full animate-pulse"
                  style={{
                    background: `linear-gradient(45deg, ${avatarThemeColor || 'hsl(var(--primary))'}, hsl(var(--card)))`,
                    padding: '4px',
                    filter: `drop-shadow(0 0 20px ${avatarThemeColor || 'hsl(var(--primary))'})`,
                  }}
                >
                  <div className="w-full h-full rounded-full bg-background"></div>
                </div>
              )}
              <div 
                className="relative z-10 cursor-pointer"
                onClick={() => {
                  if (profile.nftProfileTokenId && profileNftData?.nfts) {
                    const nft = profileNftData.nfts.find(n => n.tokenId === profile.nftProfileTokenId);
                    if (nft) {
                      setSelectedProfileNft(nft);
                      return;
                    }
                  }
                  profileAvatarSignedUrl && openLightbox(profileAvatarSignedUrl, profile.displayName, profile.username);
                }}
              >
                <CustomAvatar 
                  user={profile}
                  size="profile"
                  borderIntensity="strong"
                  showAvatarBorderOverlay={true}
                  showLiveOverlay={!!(isStreamer && (profile?.twitchVerified || profile?.kickVerified))}
                  isLive={profileLiveStatus?.isLive ?? false}
                  themeColor={avatarThemeColor}
                />
              </div>
              {/* Level Badge with Progress */}
              {!selectedProfileNft && !lightboxData.isOpen && (
              <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 z-30">
                <LevelBadgeWithProgress 
                  userId={profile.id}
                  level={profile.level || 1}
                  size="large"
                  username={profile.username}
                />
              </div>
              )}
            </div>

            {/* Display Name and Badges */}
            <div className="flex items-center gap-2 flex-wrap mt-8">
              <h1 className={`font-bold ${profileFontAnimClass}`} style={{ fontFamily: profileFontFamily, textShadow: isMacTheme ? 'none' : profileTextShadow, color: isWatermelonTheme ? '#ffffff' : isMacTheme ? '#1a1a1a' : isLightBackground ? accentColor : profileFontColor, fontSize: `${1.5 * profileFontScale}rem`, lineHeight: `${2 * profileFontScale}rem` }}>{profile.displayName}</h1>
              <VerificationBadge
                isVerified={!!verificationBadgeData?.verificationBadge}
                badgeImageUrl={verificationBadgeData?.verificationBadge?.imageUrl}
                badgeName={verificationBadgeData?.verificationBadge?.name}
                size="xl"
              />
              <ModeratorBadge 
                isModerator={(profile.role === "moderator" || profile.role === "admin") && !verificationBadgeData?.verificationBadge} 
                size="xl" 
              />
              {profile.userType && profile.showUserType !== false && (() => {
                const userTypes = profile.userType!.split(',').map(t => t.trim()).filter(Boolean);
                const displayTypes = userTypes.slice(0, 2);
                
                return displayTypes.map((type, index) => {
                  const config = userTypeConfig[type];
                  if (!config) return null;
                  const IconComponent = config.icon;
                  return (
                    <Badge 
                      key={`${type}-${index}`}
                      variant="outline" 
                      className="border text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-[0.5px]"
                      style={isLightBackground ? {
                        backgroundColor: 'rgba(255,255,255,0.6)',
                        color: '#ff2056',
                        border: '0.556px solid #fda5d5',
                        boxShadow: '0 1px 2px -1px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.1)',
                      } : {
                        backgroundColor: `${accentColor || '#00bba7'}1a`,
                        color: accentColor || '#00d5be',
                        borderColor: `${accentColor || '#00bba7'}66`,
                      }}
                    >
                      <IconComponent className="w-3 h-3 mr-1.5" />
                      {config.label}
                    </Badge>
                  );
                });
              })()}
            </div>

            {/* Username */}
            <span className="text-base font-normal mt-1" style={{ color: isLightBackground ? accentColor : 'rgba(255,255,255,0.7)' }}>@{profile.username}</span>

            {/* Bio — below the streamer badge, outside the card */}
            {profile.bio && (
              <p className={`text-sm max-w-md mt-2 ${isLightBackground ? '' : 'text-slate-300'}`} style={{ color: isLightBackground ? '#1d293d' : undefined }}>{profile.bio}</p>
            )}

            {/* Profile Info Card — stats only, Collection button on top-right border */}
            <div className="relative mt-4 max-w-xl">
              {/* Collection button pinned to top-right border */}
              <button 
                onClick={() => setProfileSectionTab(profileSectionTab === 'collection' ? 'stats' : 'collection')}
                className="absolute -top-3 -right-1 z-10 px-5 py-2 text-xs font-black rounded-full uppercase tracking-[0.8px] hover:opacity-90 transition-opacity"
                style={{ 
                  background: profileSectionTab === 'collection'
                    ? (isWatermelonTheme ? '#1d3932' : isZombieTheme ? '#0d1a00' : isCyberpunkTheme ? '#020617' : isNeoTheme ? '#000800' : isBlocksTheme ? '#1a1a1a' : isForestTheme ? '#e8d5b7' : isGothicTheme ? '#0d0118' : isCartoonTheme ? '#fffaec' : '#1a1a2e')
                    : isWatermelonTheme
                      ? '#ffb3c1'
                      : isLightBackground
                        ? 'linear-gradient(270deg, #ff637e 0%, #f6339a 100%)'
                        : isZombieTheme
                          ? 'linear-gradient(180deg, #2a5000 0%, #162b00 100%)'
                          : isCyberpunkTheme
                            ? 'rgba(2,6,23,0.9)'
                            : isNeoTheme
                              ? 'linear-gradient(180deg, #003300 0%, #001400 100%)'
                              : isBlocksTheme
                                ? 'linear-gradient(180deg, #B7FF1A 0%, #A2F000 100%)'
                                : isForestTheme
                                  ? '#1d3932'
                                  : isGothicTheme
                                    ? 'linear-gradient(135deg, #3d0070 0%, #1e053a 100%)'
                                    : isCartoonTheme
                                      ? 'linear-gradient(135deg, #ff5e5e 0%, #ff7a5e 100%)'
                                      : 'linear-gradient(270deg, #5ee9b5 0%, #fff085 50%, #ffb86a 100%)',
                  color: profileSectionTab === 'collection' ? (isWatermelonTheme ? '#ffffff' : isZombieTheme ? '#9ae600' : isCyberpunkTheme ? '#00d3f2' : isNeoTheme ? '#00ff41' : isBlocksTheme ? '#B7FF1A' : isForestTheme ? '#5C3317' : isGothicTheme ? '#c27aff' : isCartoonTheme ? '#1d1d1f' : '#ffffff') : isWatermelonTheme ? '#0d1a12' : isLightBackground ? '#ffffff' : isZombieTheme ? '#9ae600' : isCyberpunkTheme ? 'transparent' : isNeoTheme ? '#00ff41' : isBlocksTheme ? '#1a1a1a' : isForestTheme ? '#e8d5b7' : isGothicTheme ? '#c27aff' : isCartoonTheme ? '#ffffff' : '#0f172b',
                  border: isWatermelonTheme ? '3px solid #1d3932' : isZombieTheme ? '1px solid #9ae60066' : isCyberpunkTheme ? '1px solid #00b8db66' : isNeoTheme ? '1px solid #00ff4166' : isBlocksTheme ? '3px solid #B7FF1A' : isForestTheme ? '1px solid rgba(164,118,66,0.4)' : isGothicTheme ? '1px solid #c27aff55' : isCartoonTheme ? '3px solid #1d1d1f' : undefined,
                  fontFamily: isZombieTheme ? "'Creepster', cursive" : isCyberpunkTheme ? "'Orbitron', sans-serif" : isNeoTheme ? "'JetBrains Mono', monospace" : isBlocksTheme ? "'Press Start 2P', monospace" : isGothicTheme ? "'Palatino Linotype', 'Book Antiqua', Palatino, serif" : isCartoonTheme ? "'Bricolage Grotesque', 'Arial Black', sans-serif" : undefined,
                  letterSpacing: isZombieTheme ? '2px' : isCyberpunkTheme ? '2px' : isNeoTheme ? '1.5px' : isBlocksTheme ? '0.5px' : isGothicTheme ? '1.5px' : isCartoonTheme ? '-0.5px' : undefined,
                  fontWeight: isCyberpunkTheme ? '900' : isNeoTheme ? '700' : isBlocksTheme ? '400' : isCartoonTheme ? '800' : undefined,
                  fontSize: isBlocksTheme ? '0.5rem' : isCartoonTheme ? '0.7rem' : undefined,
                  borderRadius: isBlocksTheme ? '4px' : undefined,
                  boxShadow: isBlocksTheme ? '4px 4px 0 #000' : isGothicTheme ? '0 0 14px #c27aff33' : isCartoonTheme ? '3px 3px 0 #1d1d1f' : undefined,
                }}>
                  <span className={isCyberpunkTheme ? 'cyber-gradient-text' : isNeoTheme ? 'neo-gradient-text' : ''}>{isGothicTheme ? '👻 Collection' : 'Collection'}</span>
              </button>

            {/* Stats card */}
            <div
              className="relative mt-4 rounded-lg transition-all duration-300"
              style={{
                width: '100%',
                maxWidth: '600px',
              }}
            >

              <div 
                className={`rounded-2xl ${isZombieTheme ? 'zombie-stats-card' : ''} ${isCyberpunkTheme ? 'cyber-stats-card' : ''} ${isNeoTheme ? 'neo-stats-card' : ''} ${isBlocksTheme ? 'blocks-stats-card' : ''} ${isWatermelonTheme ? 'watermelon-stats-card' : ''} ${isElectricTheme ? 'electric-stats-card' : ''}`}
                style={isWatermelonTheme ? {
                  background: '#ffb3c1',
                } : isLightBackground ? {
                  background: 'rgba(255,255,255,0.37)',
                  border: '0.556px solid rgba(255,255,255,0.8)',
                  boxShadow: '0 1px 2px -1px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.1)',
                } : isZombieTheme ? {
                  background: '#1a1d1a',
                  border: '1.667px solid #7ccf00',
                  boxShadow: '0 0 18px #9ae60055, 0 0 40px #9ae60022',
                } : isCyberpunkTheme ? {
                  background: '#020617',
                  border: '1px solid #00b8db',
                } : isNeoTheme ? {
                  background: '#001a00',
                  border: '1px solid #00ff4177',
                  boxShadow: '0 0 16px #00ff4122, 0 0 40px #00ff4111',
                } : isBlocksTheme ? {
                  background: '#2a2a2a',
                } : isForestTheme ? {
                  background: '#e8d5b7',
                  border: '1px solid #c4a88266',
                } : {
                  background: `${accentColor || '#00bba7'}0d`,
                  border: `1px solid ${accentColor || '#00bba7'}33`,
                }}
              >
                <div className="p-5">
                  {profileSectionTab === 'stats' ? (
                    <div className="flex items-center" style={isWatermelonTheme ? { gap: 0 } : { gap: '2rem' }}>
                      <div className={`flex flex-col gap-1 ${isWatermelonTheme ? 'watermelon-stat-item' : ''}`}>
                        <span className="font-black text-xl" style={{ color: isWatermelonTheme ? '#0d1a12' : isLightBackground ? '#1d293d' : isZombieTheme ? '#9ae600' : isCyberpunkTheme ? '#00d3f2' : isBlocksTheme ? '#ef4444' : isForestTheme ? '#5C3317' : '#ffffff', fontFamily: isCyberpunkTheme ? "'Orbitron', sans-serif" : isBlocksTheme ? "'Press Start 2P', monospace" : undefined, fontSize: isBlocksTheme ? '1rem' : undefined }}>{(clips?.length || 0) + (screenshots?.length || 0)}</span>
                        <span className="text-[9px] uppercase font-black" style={isWatermelonTheme ? { color: '#0d1a12', letterSpacing: '0.8px' } : isZombieTheme ? { backgroundColor: '#9ae600e6', color: '#3c6300', padding: '2px 8px', borderRadius: '4px', letterSpacing: '1.6px' } : isCyberpunkTheme ? { background: 'linear-gradient(270deg, #00d3f2, #e12afb)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', padding: '2px 8px', letterSpacing: '1.6px', fontFamily: "'Orbitron', sans-serif" } : isBlocksTheme ? { backgroundColor: '#ef4444', color: '#ffffff', padding: '2px 8px', borderRadius: '2px', fontFamily: "'Press Start 2P', monospace", fontSize: '6px', letterSpacing: '0px', boxShadow: '3px 3px 0 #000' } : isForestTheme ? { color: '#8B5E3C', letterSpacing: '0.8px' } : { color: accentColor || '#00d5be', letterSpacing: '0.8px' }}>Uploads</span>
                      </div>
                      <div className={`flex flex-col gap-1 ${isWatermelonTheme ? 'watermelon-stat-item' : ''}`}>
                        <span className="font-black text-xl" style={{ color: isWatermelonTheme ? '#0d1a12' : isLightBackground ? '#1d293d' : isZombieTheme ? '#9ae600' : isCyberpunkTheme ? '#ed6aff' : isBlocksTheme ? '#3b82f6' : isForestTheme ? '#5C3317' : '#ffffff', fontFamily: isCyberpunkTheme ? "'Orbitron', sans-serif" : isBlocksTheme ? "'Press Start 2P', monospace" : undefined, fontSize: isBlocksTheme ? '1rem' : undefined }}>{Number(profile._count?.followers || 0)}</span>
                        <span className="text-[9px] uppercase font-black" style={isWatermelonTheme ? { color: '#0d1a12', letterSpacing: '0.8px' } : isZombieTheme ? { backgroundColor: '#9ae600e6', color: '#3c6300', padding: '2px 8px', borderRadius: '4px', letterSpacing: '1.6px' } : isCyberpunkTheme ? { background: 'linear-gradient(270deg, #00d3f2, #e12afb)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', padding: '2px 8px', letterSpacing: '1.6px', fontFamily: "'Orbitron', sans-serif" } : isBlocksTheme ? { backgroundColor: '#3b82f6', color: '#ffffff', padding: '2px 8px', borderRadius: '2px', fontFamily: "'Press Start 2P', monospace", fontSize: '6px', letterSpacing: '0px', boxShadow: '3px 3px 0 #000' } : isForestTheme ? { color: '#8B5E3C', letterSpacing: '0.8px' } : { color: accentColor || '#00d5be', letterSpacing: '0.8px' }}>Followers</span>
                      </div>
                      <div className={`flex flex-col gap-1 ${isWatermelonTheme ? 'watermelon-stat-item' : ''}`}>
                        <span className="font-black text-xl" style={{ color: isWatermelonTheme ? '#0d1a12' : isLightBackground ? '#1d293d' : isZombieTheme ? '#9ae600' : isCyberpunkTheme ? '#00d3f2' : isBlocksTheme ? '#B7FF1A' : isForestTheme ? '#5C3317' : '#ffffff', fontFamily: isCyberpunkTheme ? "'Orbitron', sans-serif" : isBlocksTheme ? "'Press Start 2P', monospace" : undefined, fontSize: isBlocksTheme ? '1rem' : undefined }}>{Number(profile._count?.following || 0)}</span>
                        <span className="text-[9px] uppercase font-black" style={isWatermelonTheme ? { color: '#0d1a12', letterSpacing: '0.8px' } : isZombieTheme ? { backgroundColor: '#9ae600e6', color: '#3c6300', padding: '2px 8px', borderRadius: '4px', letterSpacing: '1.6px' } : isCyberpunkTheme ? { background: 'linear-gradient(270deg, #00d3f2, #e12afb)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', padding: '2px 8px', letterSpacing: '1.6px', fontFamily: "'Orbitron', sans-serif" } : isBlocksTheme ? { backgroundColor: '#B7FF1A', color: '#1a1a1a', padding: '2px 8px', borderRadius: '2px', fontFamily: "'Press Start 2P', monospace", fontSize: '6px', letterSpacing: '0px', boxShadow: '3px 3px 0 #000' } : isForestTheme ? { color: '#8B5E3C', letterSpacing: '0.8px' } : { color: accentColor || '#00d5be', letterSpacing: '0.8px' }}>Following</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Hexagon className="w-4 h-4" style={{ color: isBlocksTheme ? '#a855f7' : isWatermelonTheme ? '#0d1a12' : isZombieTheme ? '#9ae600' : isCyberpunkTheme ? '#00d3f2' : isNeoTheme ? '#00ff41' : isForestTheme ? '#B7FF1A' : undefined }} />
                      {isBlocksTheme ? (
                        <span style={{ backgroundColor: '#a855f7', color: '#ffffff', padding: '2px 8px', borderRadius: '2px', fontFamily: "'Press Start 2P', monospace", fontSize: '6px', letterSpacing: '0px', boxShadow: '3px 3px 0 #000' }}>
                          {profileNftData?.nfts.filter(n => !n.sold).length || 0} NFTs OWNED
                        </span>
                      ) : (
                        <span className="text-sm" style={{ color: isWatermelonTheme ? '#0d1a12' : isForestTheme ? '#1a1a1a' : isZombieTheme ? '#9ae600' : isCyberpunkTheme ? '#00d3f2' : isNeoTheme ? '#00ff41' : accentColor || 'hsl(var(--primary))' }}>
                          {`${profileNftData?.nfts.filter(n => !n.sold).length || 0} NFTs owned`}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
            </div>

            {/* Platform Connections — below the stats card */}
            {profileSectionTab === 'stats' && (profile.steamUsername || profile.xboxUsername || profile.playstationUsername || profile.discordUsername || profile.epicUsername || profile.nintendoUsername || profile.twitterUsername || profile.youtubeUsername || profile.instagramUsername || profile.facebookUsername) && (
              <div className={`flex flex-wrap gap-2 mt-4 ${isCyberpunkTheme ? 'cyber-platform-section' : ''} ${isNeoTheme ? 'neo-platform-section' : ''} ${isBlocksTheme ? 'blocks-platform-section' : ''} ${isWatermelonTheme ? 'watermelon-platform-section' : ''}`}>
                {profile.steamUsername && (
                  <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium" style={getBtnStyle('steam')}>
                    <SiSteam className="w-3 h-3" />
                    <span>{profile.steamUsername}</span>
                  </div>
                )}
                {profile.xboxUsername && (
                  <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium" style={getBtnStyle('xbox')}>
                    <FaXbox className="w-3 h-3" />
                    <span>{profile.xboxUsername}</span>
                  </div>
                )}
                {profile.playstationUsername && (
                  <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium" style={getBtnStyle('playstation')}>
                    <SiPlaystation className="w-3 h-3" />
                    <span>{profile.playstationUsername}</span>
                  </div>
                )}
                {profile.discordUsername && (
                  <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium" style={getBtnStyle('discord')}>
                    <SiDiscord className="w-3 h-3" />
                    <span>{profile.discordUsername}</span>
                  </div>
                )}
                {profile.epicUsername && (
                  <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium" style={getBtnStyle('epic')}>
                    <SiEpicgames className="w-3 h-3" />
                    <span>{profile.epicUsername}</span>
                  </div>
                )}
                {profile.nintendoUsername && (
                  <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium" style={getBtnStyle('nintendo')}>
                    <Gamepad2 className="w-3 h-3" />
                    <span>{profile.nintendoUsername}</span>
                  </div>
                )}
                {profile.twitterUsername && (
                  <a 
                    href={`https://twitter.com/${profile.twitterUsername}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium hover:opacity-80 transition-opacity"
                    style={getBtnStyle('twitter')}
                  >
                    <FaXTwitter className="w-3 h-3" />
                    <span>{profile.twitterUsername}</span>
                  </a>
                )}
                {profile.youtubeUsername && (
                  <a 
                    href={`https://youtube.com/@${profile.youtubeUsername}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium hover:opacity-80 transition-opacity"
                    style={getBtnStyle('youtube')}
                  >
                    <FaYoutube className="w-3 h-3" />
                    <span>{profile.youtubeUsername}</span>
                  </a>
                )}
                {profile.instagramUsername && (
                  <a 
                    href={`https://instagram.com/${profile.instagramUsername}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium hover:opacity-80 transition-opacity"
                    style={getBtnStyle('instagram')}
                  >
                    <FaInstagram className="w-3 h-3" />
                    <span>{profile.instagramUsername}</span>
                  </a>
                )}
                {profile.facebookUsername && (
                  <a 
                    href={`https://facebook.com/${profile.facebookUsername}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium hover:opacity-80 transition-opacity"
                    style={getBtnStyle('facebook')}
                  >
                    <FaFacebook className="w-3 h-3" />
                    <span>{profile.facebookUsername}</span>
                  </a>
                )}
              </div>
            )}


            {/* Name Tag - positioned absolutely below banner and follow/message buttons, only show if nameTag exists and imageUrl is valid */}
            {nameTagData?.nameTag && nameTagSignedUrl && (
              <div 
                className="absolute flex-col items-center hidden md:flex"
                style={{
                  top: '225px',
                  right: '-40px'
                }}
              >
                {/* Glass rectangular background as main container */}
                <div 
                  className="relative rounded-lg"
                  style={{
                    width: '351px',
                    height: '109px',
                    ...nameTagBgStyle,
                    ...(isLightBackground ? {} : { boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)' })
                  }}
                >
                  <img 
                    src={nameTagSignedUrl} 
                    alt={nameTagData?.nameTag?.name || 'Name Tag'}
                    title={nameTagData?.nameTag?.description || nameTagData?.nameTag?.name}
                    className="absolute z-10 cursor-pointer hover:scale-105 transition-transform"
                    style={{
                      width: '734px',
                      height: 'auto',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)'
                    }}
                    onClick={() => setNameTagPreviewOpen(true)}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
                <span 
                  className="text-xs mt-3 uppercase tracking-widest cursor-pointer transition-colors"
                  onClick={() => setNameTagPreviewOpen(true)}
                  style={isCyberpunkTheme ? { background: 'linear-gradient(270deg,#00d3f2,#e12afb)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', fontFamily: "'Orbitron', sans-serif", letterSpacing: '1.4px' } : { color: 'rgba(255,255,255,0.4)' }}
                >Nametag</span>
              </div>
            )}
          </div>

          {/* Action buttons - positioned below banner */}
          <div className="absolute hidden md:block" style={{ top: '145px', right: '-40px' }}>
            {!isOwnProfile && currentUser && (
              <div className="flex gap-3">
                  <Button 
                    onClick={handleFollowClick}
                    variant={followRequestStatus === 'following' ? "outline" : "default"}
                    size="default"
                    disabled={followMutation.isPending}
                    className="relative overflow-hidden font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg px-6 py-3 text-base"
                    style={followRequestStatus === 'following' || followRequestStatus === 'requested' ? {
                      borderColor: accentColor || 'hsl(var(--primary))',
                      color: accentColor || 'hsl(var(--primary))',
                      backgroundColor: 'transparent',
                      ...(isCyberpunkTheme && { boxShadow: `0 0 10px ${accentColor}44`, fontFamily: "'Orbitron', sans-serif" }),
                    } : {
                      backgroundColor: accentColor || 'hsl(var(--primary))',
                      borderColor: accentColor || 'hsl(var(--primary))',
                      color: isLightBackground ? '#ffffff' : '#000000',
                      boxShadow: `0 4px 15px ${accentColor || 'hsl(var(--primary))'}66`,
                      ...(isCyberpunkTheme && { fontFamily: "'Orbitron', sans-serif" }),
                    }}
                    onMouseEnter={(e) => {
                      if (followRequestStatus === 'following' || followRequestStatus === 'requested') {
                        e.currentTarget.style.backgroundColor = `${accentColor || 'hsl(var(--primary))'}22`;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (followRequestStatus === 'following' || followRequestStatus === 'requested') {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                    data-testid="follow-button"
                    data-following={followRequestStatus === 'following'}
                  >
                    {followMutation.isPending ? (
                      <div className="w-5 h-5 rounded-full border-2 border-t-transparent border-current animate-spin mr-2"></div>
                    ) : followRequestStatus === 'following' ? (
                      <UserCheck className="mr-2 h-5 w-5" />
                    ) : followRequestStatus === 'requested' ? (
                      <Clock className="mr-2 h-5 w-5" />
                    ) : (
                      <UserPlus className="mr-2 h-5 w-5" />
                    )}
                    {followRequestStatus === 'following' ? "Following" : 
                     followRequestStatus === 'requested' ? "Pending" : 
                     "Follow"}
                  </Button>

                  <Button 
                    onClick={() => {
                      console.log('🎯 MESSAGE BUTTON CLICKED - Opening message dialog for:', username);
                      setMessageDialogOpen(true);
                    }}
                    variant="outline"
                    size="default"
                    className="relative overflow-hidden font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg px-6 py-3 text-base"
                    style={{
                      borderColor: accentColor || 'hsl(var(--primary))',
                      color: accentColor || 'hsl(var(--primary))',
                      backgroundColor: 'transparent',
                      ...(isCyberpunkTheme && { boxShadow: `0 0 10px ${accentColor}44`, fontFamily: "'Orbitron', sans-serif" }),
                    }}
                  >
                    <MessageSquare className="mr-2 h-5 w-5" /> Message
                  </Button>

                  <React.Suspense fallback={null}>
                    <GamefolioShareDialog 
                      username={profile.username}
                      userId={profile.id}
                      userProfile={{
                        displayName: profile.displayName,
                        bio: profile.bio,
                        avatarUrl: profileAvatarSignedUrl || profile.avatarUrl,
                        bannerUrl: profile.bannerUrl,
                        selectedAvatarBorderId: profile.selectedAvatarBorderId,
                        avatarBorderColor: profile.avatarBorderColor,
                        nftProfileTokenId: profile.nftProfileTokenId,
                        nftProfileImageUrl: profile.nftProfileImageUrl,
                        emailVerified: profile.emailVerified,
                        role: profile.role,
                        isPro: profile.isPro,
                        selectedVerificationBadgeId: profile.selectedVerificationBadgeId,
                        userType: profile.userType,
                        showUserType: profile.showUserType,
                        accentColor: profile.accentColor,
                        backgroundColor: profile.backgroundColor,
                        cardColor: profile.cardColor,
                        primaryColor: profile.primaryColor
                      }}
                      userStats={{
                        clips: profile._count?.clips || 0,
                        followers: profile._count?.followers || 0,
                        following: profile._count?.following || 0
                      }}
                      favoriteGames={favoriteGames?.slice(0, 5).map(g => ({ id: g.id, name: g.name, imageUrl: g.imageUrl }))}
                      trigger={
                        <Button
                          variant="outline"
                          size="default"
                          className="relative overflow-hidden font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg px-4 py-3"
                          style={shareButtonStyle}
                        >
                          <Share2 className="h-5 w-5" />
                        </Button>
                      }
                    />
                  </React.Suspense>
                </div>
              )}

            {/* Share button for own profile */}
            {isOwnProfile && (
              <div className="flex gap-2">
                  <React.Suspense fallback={null}>
                    <GamefolioShareDialog 
                      username={profile.username}
                      userId={profile.id}
                      userProfile={{
                        displayName: profile.displayName,
                        bio: profile.bio,
                        avatarUrl: profileAvatarSignedUrl || profile.avatarUrl,
                        bannerUrl: profile.bannerUrl,
                        selectedAvatarBorderId: profile.selectedAvatarBorderId,
                        avatarBorderColor: profile.avatarBorderColor,
                        nftProfileTokenId: profile.nftProfileTokenId,
                        nftProfileImageUrl: profile.nftProfileImageUrl,
                        emailVerified: profile.emailVerified,
                        role: profile.role,
                        isPro: profile.isPro,
                        selectedVerificationBadgeId: profile.selectedVerificationBadgeId,
                        userType: profile.userType,
                        showUserType: profile.showUserType,
                        accentColor: profile.accentColor,
                        backgroundColor: profile.backgroundColor,
                        cardColor: profile.cardColor,
                        primaryColor: profile.primaryColor
                      }}
                      userStats={{
                        clips: profile._count?.clips || 0,
                        followers: profile._count?.followers || 0,
                        following: profile._count?.following || 0
                      }}
                      favoriteGames={favoriteGames?.slice(0, 5).map(g => ({ id: g.id, name: g.name, imageUrl: g.imageUrl }))}
                      trigger={
                        <Button
                          variant="outline"
                          size="sm"
                          className="relative overflow-hidden font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg"
                          style={shareButtonStyle}
                        >
                          <Share2 className="h-4 w-4" />
                        </Button>
                      }
                    />
                  </React.Suspense>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Spacer for tabs section */}
        <div className="h-0 md:h-[12px]"></div>

        {/* Stream Embed - shown for streamers with a configured channel */}
        {(() => {
          if (!isStreamer) return null;
          const twitchChannel = (profile as any)?.twitchChannelName || (profile?.twitchVerified ? profile?.streamChannelName : null);
          const kickChannel = (profile as any)?.kickChannelName || (profile?.kickVerified ? profile?.streamChannelName : null);
          let activePlatform: string | null = null;
          let activeChannel: string | null = null;
          if (profileLiveStatus) {
            activePlatform = profileLiveStatus.activePlatform;
            activeChannel = profileLiveStatus.activeChannel;
          }
          if (!activePlatform) {
            activePlatform = profile?.streamPlatform || (twitchChannel ? 'twitch' : kickChannel ? 'kick' : null);
            activeChannel = activePlatform === 'twitch' ? twitchChannel : kickChannel;
          }
          if (!activePlatform || !activeChannel) return null;
          const isKick = activePlatform === 'kick';
          const isLive = profileLiveStatus?.isLive ?? false;
          const hostname = window.location.hostname;

          const playerSrc = isKick
            ? `https://player.kick.com/${activeChannel}?autoplay=${isLive ? 'true' : 'false'}&muted=true`
            : `https://player.twitch.tv/?channel=${activeChannel}&parent=${hostname}&autoplay=${isLive ? 'true' : 'false'}&muted=true`;

          const chatSrc = isKick
            ? `https://kick.com/${activeChannel}/chatroom`
            : `https://www.twitch.tv/embed/${activeChannel}/chat?parent=${hostname}&darkpopout`;

          const headerBg = isKick
            ? 'linear-gradient(90deg, #1a3a1a, #0f2a0f)'
            : 'linear-gradient(90deg, #1f1035, #0f0a1e)';

          const showPlayer = isLive || streamExpanded;

          return (
          <div className="max-w-[98%] md:max-w-[90%] mx-auto mt-4 mb-2">
            <div className="rounded-xl overflow-hidden border border-border bg-black shadow-lg">
              {/* Header bar — clickable when offline to expand/collapse */}
              <div
                className={`flex items-center gap-2 px-3 py-2 ${showPlayer ? 'border-b border-border' : ''} ${!isLive ? 'cursor-pointer select-none hover:brightness-110 transition-all' : ''}`}
                style={{ background: headerBg }}
                onClick={!isLive ? () => setStreamExpanded(prev => !prev) : undefined}
              >
                <div className={`w-2 h-2 rounded-full ${isLive ? 'animate-pulse' : 'opacity-40'} ${isKick ? 'bg-primary' : 'bg-primary'}`} />
                <span className={`text-xs font-semibold ${isKick ? 'text-primary' : 'text-primary'}`}>
                  {isKick ? 'Kick' : 'Twitch'}
                </span>
                <span className="text-xs text-muted-foreground">— {activeChannel}</span>
                {isLive ? (
                  <span className="ml-auto text-[10px] font-bold bg-red-600 text-white px-1.5 py-0.5 rounded-full">LIVE</span>
                ) : (
                  <div className="ml-auto flex items-center gap-1.5">
                    <span className="text-[10px] text-muted-foreground/60 italic">Offline</span>
                    {streamExpanded
                      ? <ChevronUp className="h-3 w-3 text-muted-foreground/60" />
                      : <ChevronDown className="h-3 w-3 text-muted-foreground/60" />
                    }
                  </div>
                )}
              </div>

              {/* Player + Chat — only rendered when live or manually expanded */}
              {showPlayer && (
                isLive ? (
                  <div className="flex flex-col lg:flex-row" style={{ height: 'auto' }}>
                    {/* Player — 16:9 aspect ratio */}
                    <div className="relative w-full lg:w-[65%] flex-none">
                      <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                        <iframe
                          key={`player-live-${activeChannel}`}
                          src={playerSrc}
                          className="absolute inset-0 w-full h-full"
                          allowFullScreen
                          allow="autoplay; fullscreen"
                          title={`${activeChannel}'s stream`}
                        />
                      </div>
                    </div>
                    {/* Chat */}
                    <div className="w-full lg:w-[35%] border-t lg:border-t-0 lg:border-l border-border" style={{ height: '300px' }}>
                      <iframe
                        key={`chat-live-${activeChannel}`}
                        src={chatSrc}
                        className="w-full h-full"
                        title={`${activeChannel}'s chat`}
                      />
                    </div>
                  </div>
                ) : (
                  /* Offline — greyed out player, no chat */
                  <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                    <div className="absolute inset-0 bg-black/40 z-10 pointer-events-none" />
                    <iframe
                      key={`player-offline-${activeChannel}`}
                      src={playerSrc}
                      className="absolute inset-0 w-full h-full opacity-60 grayscale"
                      allowFullScreen
                      title={`${activeChannel}'s stream`}
                    />
                  </div>
                )
              )}
            </div>
          </div>
          );
        })()
        }

        {/* Enhanced Tabs section with rounded container style */}
        <div className="max-w-[98%] md:max-w-[90%] mx-auto mt-2 md:mt-8 relative z-20">
        {profileSectionTab === 'collection' ? (
          <div className="w-full">
            <div 
              className={`w-full max-w-lg lg:max-w-full mx-auto justify-center h-11 md:h-12 p-1 relative flex gap-0.5 ${isCyberpunkTheme ? 'cyber-tab-list' : isNeoTheme ? 'neo-tab-list' : isBlocksTheme ? 'blocks-nft-header' : isZombieTheme ? 'rounded-full border border-[#7ccf0066]' : isMacTheme ? 'rounded-full' : isGothicTheme ? 'rounded-2xl' : isCartoonTheme ? 'rounded-xl' : 'rounded-full bg-[hsl(220,20%,12%)] border border-[hsl(220,15%,25%)]'} shadow-lg`}
              style={isBlocksTheme ? undefined : isWatermelonTheme ? { background: '#ffb3c1', border: '5px solid #1d3932', borderRadius: '9999px' } : isZombieTheme ? { background: '#1a1d1a' } : isMacTheme ? { background: 'linear-gradient(180deg, #ebebeb 0%, #d6d6d6 100%)', border: '1px solid #bdbdbd', borderRadius: '9999px', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.7)', position: 'relative' } : isGothicTheme ? { background: 'rgba(15,2,38,0.92)', border: '1px solid #c27aff33', borderRadius: '16px', boxShadow: '0 0 18px #c27aff15' } : isCartoonTheme ? { background: '#ffffff', border: '3px solid #1d1d1f', borderRadius: '12px', boxShadow: '4px 4px 0 #1d1d1f' } : isLightBackground ? { background: 'rgba(255,255,255,0.37)', border: '0.556px solid rgba(255,255,255,0.8)' } : undefined}
            >
              {isMacTheme && (
                <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: 6, alignItems: 'center', zIndex: 2 }}>
                  <div style={{ width: 13, height: 13, borderRadius: '50%', background: '#ff5f57', border: '0.5px solid rgba(0,0,0,0.1)', flexShrink: 0 }} />
                  <div style={{ width: 13, height: 13, borderRadius: '50%', background: '#febc2e', border: '0.5px solid rgba(0,0,0,0.1)', flexShrink: 0 }} />
                  <div style={{ width: 13, height: 13, borderRadius: '50%', background: '#28c840', border: '0.5px solid rgba(0,0,0,0.1)', flexShrink: 0 }} />
                </div>
              )}
              <div
                className={`relative h-9 md:h-10 flex-1 flex items-center justify-center px-3 md:px-5 text-sm font-semibold gap-2 ${isCyberpunkTheme ? 'rounded-none' : isBlocksTheme ? 'rounded-none' : isCartoonTheme ? 'rounded-lg' : 'rounded-full'}`}
                style={isCyberpunkTheme ? {
                  background: 'rgba(0,211,242,0.12)',
                  borderBottom: '2px solid #00d3f2',
                  color: 'transparent',
                  fontFamily: "'Orbitron', sans-serif",
                  letterSpacing: '2.5px',
                  fontSize: '0.7rem',
                  fontWeight: '900',
                } : isBlocksTheme ? {
                  background: 'transparent',
                  color: '#a855f7',
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: '0.6rem',
                  letterSpacing: '1px',
                } : isZombieTheme ? {
                  background: 'linear-gradient(180deg, #2a5000 0%, #162b00 100%)',
                  color: '#9ae600',
                  fontFamily: "'Creepster', cursive",
                  letterSpacing: '2px',
                } : isNeoTheme ? {
                  background: 'rgba(0,20,0,0.85)',
                  borderBottom: '2px solid #00ff41',
                  color: 'transparent',
                  fontFamily: "'JetBrains Mono', monospace",
                  letterSpacing: '2px',
                  fontSize: '0.72rem',
                  fontWeight: '700',
                } : isWatermelonTheme ? {
                  background: '#1d3932',
                  color: '#ffffff',
                } : isForestTheme ? {
                  background: '#1d3932',
                  color: '#e8d5b7',
                  border: '1px solid rgba(164,118,66,0.4)',
                  borderRadius: '9999px',
                } : isMacTheme ? {
                  background: 'rgba(0,0,0,0.08)',
                  color: '#1a1a1a',
                  borderBottom: '2px solid #0066ff',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
                  fontWeight: '600',
                  fontSize: '0.8rem',
                } : isGothicTheme ? {
                  background: 'linear-gradient(135deg, #3d0070 0%, #1e053a 100%)',
                  color: '#c27aff',
                  fontFamily: "'Palatino Linotype', 'Book Antiqua', Palatino, serif",
                  letterSpacing: '2px',
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  borderRadius: '12px',
                  boxShadow: '0 0 10px #c27aff22',
                } : isCartoonTheme ? {
                  background: 'transparent',
                  color: '#a855f7',
                  fontFamily: "'Bricolage Grotesque', 'Arial Black', sans-serif",
                  fontWeight: '800',
                  fontSize: '0.95rem',
                  letterSpacing: '-0.5px',
                } : isLightBackground ? {
                  background: 'linear-gradient(270deg, #ff637e 0%, #f6339a 100%)',
                  color: '#ffffff',
                } : {
                  background: `hsl(var(--primary))`,
                  color: '#ffffff',
                }}
              >
                {isGothicTheme ? <span style={{ fontSize: '16px' }}>💎</span> : <Hexagon className={`w-4 h-4 ${isCyberpunkTheme ? 'text-[#00d3f2]' : isBlocksTheme ? 'text-[#a855f7]' : isZombieTheme ? 'text-[#9ae600]' : isNeoTheme ? 'text-[#00ff41]' : isForestTheme ? 'text-[#B7FF1A]' : ''}`} />}
                <span className={isCyberpunkTheme ? 'cyber-gradient-text' : isNeoTheme ? 'neo-gradient-text' : ''}>{isGothicTheme ? 'NFT Collection' : 'NFTs'}</span>
                {profileNftData && (
                  <span className={`text-xs opacity-80 ${isCyberpunkTheme ? 'cyber-gradient-text' : isNeoTheme ? 'neo-gradient-text' : ''}`}>
                    ({profileNftData.nfts.filter(n => !n.sold).length})
                  </span>
                )}
              </div>
            </div>
            <div className="pt-4 px-1 md:px-4">
              {profileNftsLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {[1,2,3,4,5,6].map(i => (
                    <div key={i} className="aspect-square rounded-xl bg-slate-800 animate-pulse" />
                  ))}
                </div>
              ) : profileNftData && profileNftData.nfts.filter(n => !n.sold).length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {profileNftData.nfts.filter(n => !n.sold).map((nft) => {
                    const { label: rarity } = getNftRarity(nft);
                    const styles = rarityCardStyles[rarity] || rarityCardStyles.common;
                    return (
                      <div
                        key={nft.tokenId}
                        className={`overflow-hidden cursor-pointer ${isBlocksTheme ? 'blocks-nft-card bg-[#1a1a1a]' : isGothicTheme ? 'rounded-2xl transition-all duration-200 hover:scale-[1.03]' : `rounded-2xl transition-all duration-200 hover:scale-[1.03] ${styles.bg} ${styles.glow}`}`}
                        style={isGothicTheme ? { background: 'rgba(20,2,50,0.9)', border: '1px solid #c27aff33', boxShadow: '0 0 12px #c27aff11' } : undefined}
                        onClick={() => setSelectedProfileNft(nft)}
                      >
                        <div className="aspect-square overflow-hidden">
                          {nft.image ? (
                            <img src={nft.image} alt={nft.name} className={`w-full h-full object-cover${isBlocksTheme ? ' image-rendering-pixelated' : ''}`} />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-slate-800">
                              <Hexagon className={`w-10 h-10 ${isBlocksTheme ? 'text-[#a855f7]' : isGothicTheme ? 'text-[#c27aff]' : 'text-slate-600'}`} />
                            </div>
                          )}
                        </div>
                        <div className="p-3 pt-2">
                          <h3 className={`text-sm font-bold truncate ${isBlocksTheme ? 'text-[#a855f7]' : isGothicTheme ? '' : styles.nameColor}`} style={isBlocksTheme ? { fontFamily: "'Press Start 2P', monospace", fontSize: '0.55rem' } : isGothicTheme ? { color: '#c27aff', fontFamily: "'Palatino Linotype', 'Book Antiqua', Palatino, serif" } : undefined}>{nft.name}</h3>
                          <div className="flex items-center justify-between mt-1">
                            <div className="flex items-center gap-1.5">
                              <div className={`w-2 h-2 ${isBlocksTheme ? 'rounded-none bg-[#a855f7]' : isGothicTheme ? 'rounded-full bg-[#c27aff]' : `rounded-full ${styles.dotColor}`}`} />
                              <span className={`text-[11px] uppercase tracking-tight ${isBlocksTheme ? 'text-[#B7FF1A]' : isGothicTheme ? '' : styles.textStyle}`} style={isBlocksTheme ? { fontFamily: "'Press Start 2P', monospace", fontSize: '0.45rem' } : isGothicTheme ? { color: '#c27aff99', fontSize: '0.6rem', letterSpacing: '0.5px' } : undefined}>{rarity}</span>
                            </div>
                            <span className={`text-[11px] font-medium ${isBlocksTheme ? 'text-[#B7FF1A]' : isGothicTheme ? '' : 'text-slate-500'}`} style={isBlocksTheme ? { fontFamily: "'Press Start 2P', monospace", fontSize: '0.45rem' } : isGothicTheme ? { color: '#c27aff66', fontSize: '0.65rem' } : undefined}>#{nft.tokenId}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 text-center">
                  {isGothicTheme ? <span style={{ fontSize: '40px', display: 'block', marginBottom: '12px' }}>💎</span> : <Hexagon className={`w-12 h-12 mx-auto mb-3 ${isBlocksTheme ? 'text-[#a855f7]' : 'text-slate-600'}`} />}
                  <p className="text-base text-foreground/70 font-medium" style={isBlocksTheme ? { fontFamily: "'Press Start 2P', monospace", fontSize: '0.6rem', color: '#a855f7' } : isGothicTheme ? { fontFamily: "'Palatino Linotype', 'Book Antiqua', Palatino, serif", color: '#c27aff', letterSpacing: '1px' } : undefined}>No NFTs yet</p>
                  {isOwnProfile && <p className="text-sm text-muted-foreground mt-1" style={isBlocksTheme ? { fontFamily: "'Press Start 2P', monospace", fontSize: '0.5rem', color: '#B7FF1A' } : isGothicTheme ? { fontFamily: "'Palatino Linotype', 'Book Antiqua', Palatino, serif", color: '#c27aff66', fontSize: '0.8rem' } : undefined}>Mint your first NFT from the store</p>}
                </div>
              )}
            </div>
          </div>
        ) : (
        <Tabs 
          defaultValue="clips" 
          value={activeTab} 
          onValueChange={setActiveTab}
          className="w-full"
        >
          {(() => {
            // Per-tab count pills were removed when upload count caps were dropped.
            // `showLimits` is kept as `false` so the existing tab sizing branches stay intact.
            const showLimits = false;
            const showXboxTab = profile?.showXboxAchievements && Array.isArray(profile?.xboxAchievements) && profile.xboxAchievements.length > 0;
            const showPsnTab = profile?.showPsnTrophies && Array.isArray(profile?.psnTrophyData) && profile.psnTrophyData.length > 0;
            const showScrollArrows = showXboxTab || showPsnTab;
            const arrowBtnClass = `flex items-center justify-center w-7 h-7 rounded-full transition-colors ${isLightBackground ? 'bg-black/15 hover:bg-black/30' : 'bg-black/40 hover:bg-black/60'}`;
            return (
          <div className="relative w-full">
            {showScrollArrows && (
              <button
                type="button"
                onClick={() => { if (tabsListRef.current) tabsListRef.current.scrollLeft -= 150; }}
                className={arrowBtnClass}
                style={{ color: accentColor, position: 'absolute', left: 4, top: '50%', transform: 'translateY(-50%)', zIndex: 10 }}
                aria-label="Scroll tabs left"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
          <TabsList 
            ref={tabsListRef}
            className={`w-full max-w-lg lg:max-w-full mx-auto justify-start md:justify-center p-1 relative flex flex-nowrap gap-0.5 overflow-x-auto scrollbar-hide ${isCyberpunkTheme ? 'cyber-tab-list' : isNeoTheme ? 'neo-tab-list' : isBlocksTheme ? 'blocks-tab-list' : isGothicTheme ? 'rounded-2xl' : isCartoonTheme ? '' : 'rounded-full'} ${isLightBackground ? '' : isCyberpunkTheme ? '' : isNeoTheme ? '' : isBlocksTheme ? '' : isForestTheme ? '' : isZombieTheme ? '' : isMacTheme ? '' : isGothicTheme ? '' : isCartoonTheme ? '' : 'bg-[hsl(220,20%,12%)] border border-[hsl(220,15%,25%)] shadow-lg'} ${showLimits ? 'h-14 md:h-16' : 'h-11 md:h-12'}`}
            style={tabListStyle}
          >
            {/* Mac Theme – traffic light dots on the left of the tab bar */}
            {isMacTheme && (
              <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: 6, alignItems: 'center', zIndex: 2 }}>
                <div style={{ width: 13, height: 13, borderRadius: '50%', background: '#ff5f57', border: '0.5px solid rgba(0,0,0,0.1)', flexShrink: 0 }} />
                <div style={{ width: 13, height: 13, borderRadius: '50%', background: '#febc2e', border: '0.5px solid rgba(0,0,0,0.1)', flexShrink: 0 }} />
                <div style={{ width: 13, height: 13, borderRadius: '50%', background: '#28c840', border: '0.5px solid rgba(0,0,0,0.1)', flexShrink: 0 }} />
              </div>
            )}
            <TabsTrigger 
              ref={clipsTabRef}
              value="clips" 
              className={`relative transition-all duration-200 flex-1 px-2 md:px-5 text-sm font-semibold !shadow-none ${isCyberpunkTheme || isNeoTheme || isBlocksTheme || isCartoonTheme ? 'rounded-none' : isGothicTheme ? 'rounded-xl' : 'rounded-full'} ${showLimits ? 'h-12 md:h-14' : 'h-9 md:h-10'}`}
              style={isGothicTheme ? { backgroundColor: activeTab === 'clips' ? 'rgba(80,30,160,0.45)' : 'transparent', color: activeTab === 'clips' ? '#ffffff' : '#c27aff', fontFamily: "'Palatino Linotype', 'Book Antiqua', Palatino, serif", letterSpacing: '0.8px' } : getTabStyle('clips')}
            >
              {isGothicTheme ? (
                <span style={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' as const, letterSpacing: '1px' }}>Clips</span>
              ) : (
                <span className="flex flex-col items-center leading-none gap-0.5">
                  <span className={`font-black ${isCyberpunkTheme || isNeoTheme || isBlocksTheme ? 'uppercase tracking-[0.5px]' : ''} ${isCyberpunkTheme ? 'cyber-gradient-text' : isNeoTheme ? 'neo-gradient-text' : ''}`} style={isBlocksTheme ? { color: activeTab === 'clips' ? '#1a1a1a' : '#ef4444' } : undefined}>Clips</span>
                </span>
              )}
            </TabsTrigger>

            <TabsTrigger 
              ref={reelsTabRef}
              value="reels" 
              className={`relative transition-all duration-200 flex-1 px-2 md:px-5 text-sm font-semibold !shadow-none ${isCyberpunkTheme || isNeoTheme || isBlocksTheme || isCartoonTheme ? 'rounded-none' : isGothicTheme ? 'rounded-xl' : 'rounded-full'} ${showLimits ? 'h-12 md:h-14' : 'h-9 md:h-10'}`}
              style={isGothicTheme ? { backgroundColor: activeTab === 'reels' ? 'rgba(80,30,160,0.45)' : 'transparent', color: activeTab === 'reels' ? '#ffffff' : '#c27aff', fontFamily: "'Palatino Linotype', 'Book Antiqua', Palatino, serif", letterSpacing: '0.8px' } : getTabStyle('reels')}
            >
              {isGothicTheme ? (
                <span style={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' as const, letterSpacing: '1px' }}>Reels</span>
              ) : (
                <span className="flex flex-col items-center leading-none gap-0.5">
                  <span className={`font-black ${isCyberpunkTheme || isNeoTheme || isBlocksTheme ? 'uppercase tracking-[0.5px]' : ''} ${isCyberpunkTheme ? 'cyber-gradient-text' : isNeoTheme ? 'neo-gradient-text' : ''}`} style={isBlocksTheme ? { color: activeTab === 'reels' ? '#1a1a1a' : '#3b82f6' } : undefined}>Reels</span>
                </span>
              )}
            </TabsTrigger>

            <TabsTrigger 
              ref={favoritesTabRef}
              value="favorites" 
              className={`relative transition-all duration-200 flex-1 px-2 md:px-5 text-sm font-semibold !shadow-none ${isCyberpunkTheme || isNeoTheme || isBlocksTheme || isCartoonTheme ? 'rounded-none' : isGothicTheme ? 'rounded-xl' : 'rounded-full'} ${showLimits ? 'h-12 md:h-14' : 'h-9 md:h-10'}`}
              style={isGothicTheme ? { backgroundColor: activeTab === 'favorites' ? 'rgba(80,30,160,0.45)' : 'transparent', color: activeTab === 'favorites' ? '#ffffff' : '#c27aff', fontFamily: "'Palatino Linotype', 'Book Antiqua', Palatino, serif", letterSpacing: '0.8px' } : getTabStyle('favorites')}
            >
              {isGothicTheme ? (
                <span style={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' as const, letterSpacing: '1px' }}>Games</span>
              ) : (
                <span className={`font-black ${isCyberpunkTheme || isNeoTheme || isBlocksTheme ? 'uppercase tracking-[0.5px]' : ''} ${isCyberpunkTheme ? 'cyber-gradient-text' : isNeoTheme ? 'neo-gradient-text' : ''}`} style={isBlocksTheme ? { color: activeTab === 'favorites' ? '#1a1a1a' : '#facc15' } : undefined}>
                  Games
                </span>
              )}
            </TabsTrigger>

            <TabsTrigger 
              ref={screenshotsTabRef}
              value="screenshots" 
              className={`relative transition-all duration-200 flex-1 px-2 md:px-5 text-xs md:text-sm font-semibold !shadow-none ${isCyberpunkTheme || isNeoTheme || isBlocksTheme || isCartoonTheme ? 'rounded-none' : isGothicTheme ? 'rounded-xl' : 'rounded-full'} ${showLimits ? 'h-12 md:h-14' : 'h-9 md:h-10'}`}
              style={isGothicTheme ? { backgroundColor: activeTab === 'screenshots' ? 'rgba(80,30,160,0.45)' : 'transparent', color: activeTab === 'screenshots' ? '#ffffff' : '#c27aff', fontFamily: "'Palatino Linotype', 'Book Antiqua', Palatino, serif", letterSpacing: '0.8px' } : getTabStyle('screenshots')}
            >
              {isGothicTheme ? (
                <Camera className="w-4 h-4" style={{ color: activeTab === 'screenshots' ? '#ffffff' : '#c27aff' }} />
              ) : (
                <span className="flex flex-col items-center leading-none gap-0.5">
                  <Camera
                    className="w-4 h-4"
                    style={{
                      color: isCyberpunkTheme
                        ? '#00d3f2'
                        : isNeoTheme
                          ? '#00ff41'
                          : isZombieTheme
                            ? '#9ae600'
                            : isBlocksTheme
                              ? (activeTab === 'screenshots' ? '#1a1a1a' : '#B7FF1A')
                              : isWatermelonTheme
                                ? '#0d1a12'
                                : isForestTheme
                                  ? (activeTab === 'screenshots' ? '#5C3317' : '#c4a882')
                                  : isCartoonTheme
                                    ? (activeTab === 'screenshots' ? '#27ae60' : 'rgba(0,0,0,0.25)')
                                    : isMacTheme
                                      ? (activeTab === 'screenshots' ? '#ffffff' : '#888')
                                      : isLightBackground
                                        ? (activeTab === 'screenshots' ? '#ffffff' : accentColor)
                                        : activeTab === 'screenshots' ? '#ffffff' : 'rgba(255,255,255,0.5)',
                    }}
                  />
                </span>
              )}
            </TabsTrigger>

            {profile?.showXboxAchievements && Array.isArray(profile?.xboxAchievements) && profile.xboxAchievements.length > 0 && (
              <TabsTrigger
                value="achievements"
                className={`relative rounded-full transition-all duration-200 shrink-0 md:flex-1 px-3 md:px-4 text-xs md:text-sm font-semibold !shadow-none ${showLimits ? 'h-12 md:h-14' : 'h-9 md:h-10'}`}
                style={{ backgroundColor: activeTab === 'achievements' ? '#107C10' : 'transparent', color: activeTab === 'achievements' ? '#ffffff' : isLightBackground ? '#1d293d' : undefined }}
              >
                <span className="flex items-center gap-1.5">
                  <FaXbox className="w-3 h-3 shrink-0" />
                  <span className="hidden sm:inline">Achievements</span>
                </span>
              </TabsTrigger>
            )}

            {profile?.showPsnTrophies && Array.isArray(profile?.psnTrophyData) && profile.psnTrophyData.length > 0 && (
              <TabsTrigger
                value="trophies"
                className={`relative rounded-full transition-all duration-200 shrink-0 md:flex-1 px-3 md:px-4 text-xs md:text-sm font-semibold !shadow-none ${showLimits ? 'h-12 md:h-14' : 'h-9 md:h-10'}`}
                style={{ backgroundColor: activeTab === 'trophies' ? '#003791' : 'transparent', color: activeTab === 'trophies' ? '#ffffff' : isLightBackground ? '#1d293d' : undefined }}
              >
                <span className="flex items-center gap-1.5">
                  <FaPlaystation className="w-3 h-3 shrink-0" />
                  <span className="hidden sm:inline">Trophies</span>
                </span>
              </TabsTrigger>
            )}
          </TabsList>
            {showScrollArrows && (
              <button
                type="button"
                onClick={() => { if (tabsListRef.current) tabsListRef.current.scrollLeft += 150; }}
                className={arrowBtnClass}
                style={{ color: accentColor, position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', zIndex: 10 }}
                aria-label="Scroll tabs right"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
            );
          })()}

          {/* Clips Tab */}
          <TabsContent value="clips" className="pt-4 px-1 md:px-4">
            {!canViewContent ? (
              <div className="py-12 text-center">
                <div className="max-w-md mx-auto">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <UserIcon className="w-10 h-10 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">This profile is private</h3>
                  <p className="text-muted-foreground mb-6">
                    Follow {profile?.displayName || username} to see their clips and content
                  </p>
                  {currentUser && (
                    <Button 
                      onClick={handleFollowClick}
                      variant={followRequestStatus === 'following' ? "default" : (followRequestStatus === 'requested' ? "outline" : "outline")}
                      disabled={followMutation.isPending}
                      className={`relative overflow-hidden font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg ${
                        followRequestStatus === 'following' ? '' : 'hover:text-black dark:hover:text-black'
                      }`}
                      style={followRequestStatus === 'following' ? {
                        backgroundColor: accentColor,
                        borderColor: accentColor,
                        color: '#000000',
                        boxShadow: `0 4px 15px ${accentColor}40`,
                      } : {
                        borderColor: accentColor,
                        color: accentColor,
                        backgroundColor: 'transparent',
                      }}
                      onMouseEnter={(e) => {
                        if (followRequestStatus !== 'following') {
                          e.currentTarget.style.backgroundColor = accentColor;
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (followRequestStatus !== 'following') {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }
                      }}
                    >
                      {followMutation.isPending ? (
                        <div className="w-4 h-4 rounded-full border-2 border-t-transparent border-current animate-spin mr-2"></div>
                      ) : followRequestStatus === 'following' ? (
                        <UserCheck className="mr-1 h-4 w-4" />
                      ) : followRequestStatus === 'requested' ? (
                        <Clock className="mr-1 h-4 w-4" />
                      ) : (
                        <UserPlus className="mr-1 h-4 w-4" />
                      )}
                      {followRequestStatus === 'following' ? "Following" : 
                       followRequestStatus === 'requested' ? "Pending" : 
                       "Follow"}
                    </Button>
                  )}
                </div>
              </div>
            ) : isLoadingClips ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Skeleton key={i} className="aspect-video w-full rounded-lg" />
                ))}
              </div>
            ) : clips && clips.filter(clip => clip.videoType !== 'reel').length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {clips
                  .filter(clip => clip.videoType !== 'reel')
                  .sort((a, b) => {
                    // Pinned items first, then by creation date
                    if (a.pinnedAt && !b.pinnedAt) return -1;
                    if (!a.pinnedAt && b.pinnedAt) return 1;
                    return 0;
                  })
                  .map((clip) => {
                  const isHighlighted = highlightedContent?.type === 'clip' && highlightedContent.id === clip.id.toString();
                  const isPinned = !!clip.pinnedAt;
                  return (
                    <div 
                      key={clip.id}
                      className={`relative group ${isHighlighted ? 'ring-4 ring-primary ring-offset-2 rounded-lg' : ''}`}
                      id={isHighlighted ? `clip-${clip.id}` : undefined}
                    >
                      {isPinned && !isOwnProfile && (
                        <div className="absolute top-1.5 left-1.5 z-10 bg-primary/90 text-primary-foreground p-1 rounded-md">
                          <Pin className="w-2.5 h-2.5" />
                        </div>
                      )}
                      {isOwnProfile && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            pinClipMutation.mutate(clip.id);
                          }}
                          disabled={pinClipMutation.isPending}
                          className={`absolute top-1.5 left-1.5 z-10 p-1 rounded-full transition-all ${
                            isPinned 
                              ? 'bg-primary text-primary-foreground' 
                              : 'bg-black/50 text-white opacity-0 group-hover:opacity-100'
                          } hover:scale-110`}
                          title={isPinned ? 'Unpin from profile' : 'Pin to profile'}
                        >
                          <Pin className="w-3 h-3" />
                        </button>
                      )}
                      <VideoClipGridItem 
                        clip={clip}
                        userId={currentUser?.id}
                        customCardColor={cardColor}
                        customAccentColor={accentColor}
                        canDelete={isOwnProfile}
                        onDelete={() => deleteClipMutation.mutate(clip.id)}
                        clipsList={clips?.filter(c => c.videoType !== 'reel')}
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 text-center">
                <h3 className="text-lg font-medium mb-2">No clips yet</h3>
                <p className="text-muted-foreground mb-6">
                  {isOwnProfile 
                    ? "Upload your first gaming clip to start building your Gamefolio" 
                    : `${profile.displayName} hasn't uploaded any clips yet`}
                </p>
                {isOwnProfile && (
                  <Link href="/upload">
                    <Button
                      style={{ backgroundColor: accentColor }}
                      className="bg-primary hover:bg-primary/90"
                    >
                      Upload
                    </Button>
                  </Link>
                )}
              </div>
            )}
            {isOwnProfile && !currentUser?.isPro && (clips?.filter(c => c.videoType !== 'reel').length ?? 0) > 0 && (
              <div className="mt-8 flex flex-col items-center gap-3 py-6 border-t border-border/40">
                <p className="text-sm text-muted-foreground">Want unlimited uploads? <span className="font-medium text-foreground">(15 clip limit on free)</span></p>
                <Button
                  onClick={() => setProUpgradeOpen(true)}
                  className="bg-gradient-to-r from-[#B7FF1A] to-[#A2F000] hover:from-[#A2F000] hover:to-[#6FA800] text-[#071013] font-semibold px-8"
                >
                  Go PRO
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Reels Tab */}
          <TabsContent value="reels" className="pt-4 px-1 md:px-4">
            {!canViewContent ? (
              <div className="py-12 text-center">
                <div className="max-w-md mx-auto">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <UserIcon className="w-10 h-10 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">This profile is private</h3>
                  <p className="text-muted-foreground mb-6">
                    Follow {profile?.displayName || username} to see their reels
                  </p>
                  {currentUser && (
                    <Button 
                      onClick={handleFollowClick}
                      variant={followRequestStatus === 'following' ? "default" : (followRequestStatus === 'requested' ? "outline" : "outline")}
                      disabled={followMutation.isPending}
                      className={`relative overflow-hidden font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg ${
                        followRequestStatus === 'following' ? '' : 'hover:text-black dark:hover:text-black'
                      }`}
                      style={followRequestStatus === 'following' ? {
                        backgroundColor: accentColor,
                        borderColor: accentColor,
                        color: '#000000',
                        boxShadow: `0 4px 15px ${accentColor}40`,
                      } : {
                        borderColor: accentColor,
                        color: accentColor,
                        backgroundColor: 'transparent',
                      }}
                      onMouseEnter={(e) => {
                        if (followRequestStatus !== 'following') {
                          e.currentTarget.style.backgroundColor = accentColor;
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (followRequestStatus !== 'following') {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }
                      }}
                    >
                      {followMutation.isPending ? (
                        <div className="w-4 h-4 rounded-full border-2 border-t-transparent border-current animate-spin mr-2"></div>
                      ) : followRequestStatus === 'following' ? (
                        <UserCheck className="mr-1 h-4 w-4" />
                      ) : followRequestStatus === 'requested' ? (
                        <Clock className="mr-1 h-4 w-4" />
                      ) : (
                        <UserPlus className="mr-1 h-4 w-4" />
                      )}
                      {followRequestStatus === 'following' ? "Following" : 
                       followRequestStatus === 'requested' ? "Pending" : 
                       "Follow"}
                    </Button>
                  )}
                </div>
              </div>
            ) : isLoadingClips ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Skeleton key={i} className="aspect-[9/16] w-full rounded-lg" />
                ))}
              </div>
            ) : clips && clips.filter(clip => clip.videoType === 'reel').length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {clips
                  .filter(clip => clip.videoType === 'reel')
                  .sort((a, b) => {
                    if (a.pinnedAt && !b.pinnedAt) return -1;
                    if (!a.pinnedAt && b.pinnedAt) return 1;
                    return 0;
                  })
                  .map((reel) => {
                  const isHighlighted = highlightedContent?.type === 'reel' && highlightedContent.id === reel.id.toString();
                  const isPinned = !!reel.pinnedAt;
                  return (
                    <div 
                      key={`reel-${reel.id}`}
                      className={`relative group ${isHighlighted ? 'ring-4 ring-primary ring-offset-2 rounded-lg' : ''}`}
                      id={isHighlighted ? `reel-${reel.id}` : undefined}
                    >
                      {isPinned && !isOwnProfile && (
                        <div className="absolute top-1.5 left-1.5 z-10 bg-primary/90 text-primary-foreground p-1 rounded-md">
                          <Pin className="w-2.5 h-2.5" />
                        </div>
                      )}
                      {isOwnProfile && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            pinClipMutation.mutate(reel.id);
                          }}
                          disabled={pinClipMutation.isPending}
                          className={`absolute top-1.5 left-1.5 z-10 p-1 rounded-full transition-all ${
                            isPinned 
                              ? 'bg-primary text-primary-foreground' 
                              : 'bg-black/50 text-white opacity-0 group-hover:opacity-100'
                          } hover:scale-110`}
                          title={isPinned ? 'Unpin from profile' : 'Pin to profile'}
                        >
                          <Pin className="w-3 h-3" />
                        </button>
                      )}
                      <VideoClipGridItem 
                        clip={reel}
                        userId={currentUser?.id}
                        compact={false}
                        customCardColor={profile?.cardColor || undefined}
                        customAccentColor={profile?.accentColor || undefined}
                        canDelete={isOwnProfile}
                        onDelete={() => deleteClipMutation.mutate(reel.id)}
                        reelsList={clips?.filter(c => c.videoType === 'reel')}
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 text-center">
                <h3 className="text-lg font-medium mb-2">No reels yet</h3>
                <p className="text-muted-foreground mb-6">
                  {isOwnProfile 
                    ? "Upload your first vertical gaming reel to start building your collection" 
                    : `${profile.displayName} hasn't uploaded any reels yet`}
                </p>
                {isOwnProfile && (
                  <Link href="/upload">
                    <Button
                      style={{ backgroundColor: accentColor }}
                      className="bg-primary hover:bg-primary/90"
                    >
                      Upload Reel
                    </Button>
                  </Link>
                )}
              </div>
            )}
            {isOwnProfile && !currentUser?.isPro && (clips?.filter(c => c.videoType === 'reel').length ?? 0) > 0 && (
              <div className="mt-8 flex flex-col items-center gap-3 py-6 border-t border-border/40">
                <p className="text-sm text-muted-foreground">Want unlimited uploads? <span className="font-medium text-foreground">(15 reel limit on free)</span></p>
                <Button
                  onClick={() => setProUpgradeOpen(true)}
                  className="bg-gradient-to-r from-[#B7FF1A] to-[#A2F000] hover:from-[#A2F000] hover:to-[#6FA800] text-[#071013] font-semibold px-8"
                >
                  Go PRO
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Screenshots Tab */}
          <TabsContent value="screenshots" className="pt-4 px-1 md:px-4">
            {!canViewContent ? (
              <div className="py-12 text-center">
                <div className="max-w-md mx-auto">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <UserIcon className="w-10 h-10 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">This profile is private</h3>
                  <p className="text-muted-foreground mb-6">
                    Follow {profile?.displayName || username} to see their screenshots
                  </p>
                  {currentUser && (
                    <Button 
                      onClick={handleFollowClick}
                      variant={followRequestStatus === 'following' ? "default" : (followRequestStatus === 'requested' ? "outline" : "outline")}
                      disabled={followMutation.isPending}
                      className={`relative overflow-hidden font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg ${
                        followRequestStatus === 'following' ? '' : 'hover:text-black dark:hover:text-black'
                      }`}
                      style={followRequestStatus === 'following' ? {
                        backgroundColor: accentColor,
                        borderColor: accentColor,
                        color: '#000000',
                        boxShadow: `0 4px 15px ${accentColor}40`,
                      } : {
                        borderColor: accentColor,
                        color: accentColor,
                        backgroundColor: 'transparent',
                      }}
                      onMouseEnter={(e) => {
                        if (followRequestStatus !== 'following') {
                          e.currentTarget.style.backgroundColor = accentColor;
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (followRequestStatus !== 'following') {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }
                      }}
                    >
                      {followMutation.isPending ? (
                        <div className="w-4 h-4 rounded-full border-2 border-t-transparent border-current animate-spin mr-2"></div>
                      ) : followRequestStatus === 'following' ? (
                        <UserCheck className="mr-1 h-4 w-4" />
                      ) : followRequestStatus === 'requested' ? (
                        <Clock className="mr-1 h-4 w-4" />
                      ) : (
                        <UserPlus className="mr-1 h-4 w-4" />
                      )}
                      {followRequestStatus === 'following' ? "Following" : 
                       followRequestStatus === 'requested' ? "Pending" : 
                       "Follow"}
                    </Button>
                  )}
                </div>
              </div>
            ) : isLoadingScreenshots ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Skeleton key={i} className="aspect-video w-full rounded-xl" />
                ))}
              </div>
            ) : screenshots && screenshots.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {[...screenshots]
                    .sort((a, b) => {
                      if (a.pinnedAt && !b.pinnedAt) return -1;
                      if (!a.pinnedAt && b.pinnedAt) return 1;
                      return 0;
                    })
                    .map((screenshot) => {
                    const isHighlighted = highlightedContent?.type === 'screenshot' && highlightedContent.id === screenshot.id.toString();
                    const isPinned = !!screenshot.pinnedAt;
                    const isPendingGameApproval = isOwnProfile && screenshot.game?.isApproved === false;
                    return (
                      <div
                        key={`screenshot-${screenshot.id}`}
                        className="relative group"
                      >
                        {isPendingGameApproval && (
                          <div className="absolute bottom-1.5 left-1.5 z-10 flex items-center gap-1 bg-amber-500/90 text-white text-xs px-1.5 py-0.5 rounded">
                            <Clock className="w-2.5 h-2.5 shrink-0" />
                            <span>Pending approval</span>
                          </div>
                        )}
                        {isPinned && !isOwnProfile && (
                          <div className="absolute top-1.5 left-1.5 z-10 bg-primary/90 text-primary-foreground p-1 rounded-md">
                            <Pin className="w-2.5 h-2.5" />
                          </div>
                        )}
                        {isOwnProfile && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              pinScreenshotMutation.mutate(screenshot.id);
                            }}
                            disabled={pinScreenshotMutation.isPending}
                            className={`absolute top-1.5 left-1.5 z-10 p-1 rounded-full transition-all ${
                              isPinned
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-black/50 text-white opacity-0 group-hover:opacity-100'
                            } hover:scale-110`}
                            title={isPinned ? 'Unpin from profile' : 'Pin to profile'}
                          >
                            <Pin className="w-3 h-3" />
                          </button>
                        )}
                        <ScreenshotCard
                          screenshot={screenshot}
                          isHighlighted={isHighlighted}
                          isOwnProfile={isOwnProfile}
                          profile={profile}
                          onDelete={(id) => deleteScreenshotMutation.mutate(id)}
                          onSelect={(screenshot) => {
                            setSelectedScreenshot({
                              ...screenshot,
                              user: screenshot.user || { id: profile?.id, username: profile?.username, displayName: profile?.displayName, avatarUrl: profile?.avatarUrl },
                            });
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
            ) : (
              <div className="py-12 text-center">
                <h3 className="text-lg font-medium mb-2">No screenshots yet</h3>
                <p className="text-muted-foreground mb-6">
                  {isOwnProfile 
                    ? "Upload your first gaming screenshot to start building your gallery" 
                    : `${profile.displayName} hasn't uploaded any screenshots yet`}
                </p>
                {isOwnProfile && (
                  <Link href="/upload">
                    <Button
                      style={{ backgroundColor: accentColor }}
                      className="bg-primary hover:bg-primary/90"
                    >
                      Upload Screenshot
                    </Button>
                  </Link>
                )}
              </div>
            )}
            {isOwnProfile && !currentUser?.isPro && (screenshots?.length ?? 0) > 0 && (
              <div className="mt-8 flex flex-col items-center gap-3 py-6 border-t border-border/40">
                <p className="text-sm text-muted-foreground">Want unlimited uploads? <span className="font-medium text-foreground">(10 screenshot limit on free)</span></p>
                <Button
                  onClick={() => setProUpgradeOpen(true)}
                  className="bg-gradient-to-r from-[#B7FF1A] to-[#A2F000] hover:from-[#A2F000] hover:to-[#6FA800] text-[#071013] font-semibold px-8"
                >
                  Go PRO
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Favorite Games Tab */}
          <TabsContent value="favorites" className="pt-6 px-1 md:px-4">
            {!canViewContent ? (
              <div className="py-12 text-center">
                <div className="max-w-md mx-auto">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <UserIcon className="w-10 h-10 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">This profile is private</h3>
                  <p className="text-muted-foreground mb-6">
                    Follow {profile?.displayName || username} to see their favorite games
                  </p>
                  {currentUser && (
                    <Button 
                      onClick={handleFollowClick}
                      variant={followRequestStatus === 'following' ? "default" : (followRequestStatus === 'requested' ? "outline" : "outline")}
                      disabled={followMutation.isPending}
                      className={`relative overflow-hidden font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg ${
                        followRequestStatus === 'following' ? '' : 'hover:text-black dark:hover:text-black'
                      }`}
                      style={followRequestStatus === 'following' ? {
                        backgroundColor: accentColor,
                        borderColor: accentColor,
                        color: '#000000',
                        boxShadow: `0 4px 15px ${accentColor}40`,
                      } : {
                        borderColor: accentColor,
                        color: accentColor,
                        backgroundColor: 'transparent',
                      }}
                      onMouseEnter={(e) => {
                        if (followRequestStatus !== 'following') {
                          e.currentTarget.style.backgroundColor = accentColor;
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (followRequestStatus !== 'following') {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }
                      }}
                    >
                      {followMutation.isPending ? (
                        <div className="w-4 h-4 rounded-full border-2 border-t-transparent border-current animate-spin mr-2"></div>
                      ) : followRequestStatus === 'following' ? (
                        <UserCheck className="mr-1 h-4 w-4" />
                      ) : followRequestStatus === 'requested' ? (
                        <Clock className="mr-1 h-4 w-4" />
                      ) : (
                        <UserPlus className="mr-1 h-4 w-4" />
                      )}
                      {followRequestStatus === 'following' ? "Following" : 
                       followRequestStatus === 'requested' ? "Pending" : 
                       "Follow"}
                    </Button>
                  )}
                </div>
              </div>
            ) : isLoadingFavorites ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="aspect-[3/4] w-full rounded-lg" />
                ))}
              </div>
            ) : favoriteGames && favoriteGames.length > 0 ? (
              <div className="space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {favoriteGames.map((game) => {
                    // Create slug from game name matching explore page behavior
                    const gameSlug = game.name.toLowerCase().replace(/[^a-z0-9]/g, '');
                    return (
                      <div key={game.id} className="relative group">
                        <Link 
                          href={`/games/${gameSlug}`}
                          className="block"
                        >
                        <div 
                          className="relative aspect-[3/4] overflow-hidden rounded-lg border"
                          style={{ backgroundColor: cardColor, borderColor: `${accentColor}20` }}
                        >
                          <img 
                            src={game.imageUrl 
                              ? (game.imageUrl.includes('{width}') 
                                  ? game.imageUrl.replace('{width}', '240').replace('{height}', '320')
                                  : game.imageUrl)
                              : "/placeholder-game.png"} 
                            alt={game.name}
                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = "/placeholder-game.png";
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end">
                            <h3 className="text-white font-semibold p-3">{game.name}</h3>
                          </div>
                        </div>
                      </Link>

                      {/* Remove button for own profile */}
                      {isOwnProfile && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            removeGameMutation.mutate(game.id);
                          }}
                          className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                          title="Remove from favorites"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                      </div>
                    );
                  })}
                </div>

                {isOwnProfile && (
                  <div className="flex justify-center pt-4">
                    <Button
                      variant="outline"
                      className="border-primary text-primary hover:bg-primary/10"
                      style={{ borderColor: accentColor, color: accentColor }}
                      onClick={() => setShowGameSelection(true)}
                    >
                      <Heart className="h-4 w-4 mr-2" />
                      Discover More Games
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-12 text-center">
                <h3 className="text-lg font-medium mb-2">No favorite games</h3>
                <p className="text-muted-foreground mb-6">
                  {isOwnProfile 
                    ? "Add games to your favorites to showcase them in your profile" 
                    : `${profile.displayName} hasn't added any favorite games yet`}
                </p>
                {isOwnProfile && (
                  <Button
                    variant="outline"
                    className="border-primary text-primary hover:bg-primary/10"
                    style={{ borderColor: accentColor, color: accentColor }}
                    onClick={() => setShowGameSelection(true)}
                  >
                    <Heart className="h-4 w-4 mr-2" />
                    Explore Games
                  </Button>
                )}
              </div>
            )}
          </TabsContent>

          {/* Achievements Tab */}
          {profile?.showXboxAchievements && Array.isArray(profile?.xboxAchievements) && profile.xboxAchievements.length > 0 && (
            <TabsContent value="achievements" className="pt-4 px-1 md:px-4">
              {(() => {
                const allGames = profile.xboxAchievements;
                const visibleGames = allGames.slice(0, 10);
                const totalEarned = (profile as any).xboxTotalAchievements
                  ?? allGames.reduce((sum: number, g: any) => sum + (g.achievement?.currentAchievements ?? g.earnedAchievements ?? 0), 0);
                const totalGS = (profile as any).xboxGamerscore
                  ?? allGames.reduce((sum: number, g: any) => sum + (g.achievement?.currentGamerscore ?? g.currentGamerscore ?? 0), 0);

                return (
                  <div className="rounded-xl border border-[#107C10]/30 bg-[#107C10]/5 overflow-hidden">
                    <div className="px-4 py-3 border-b border-[#107C10]/20">
                      <div className="flex items-center gap-2 mb-2">
                        <FaXbox className="w-4 h-4 text-[#107C10]" />
                        <span className="text-sm font-semibold text-slate-200">Xbox Achievements</span>
                        <span className="text-xs text-slate-400 ml-auto">
                          10 most recent games
                        </span>
                      </div>
                      <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <Trophy className="w-3.5 h-3.5 text-amber-400" />
                          <span className="text-xs text-slate-300">
                            <span className="font-semibold text-slate-100">{totalEarned.toLocaleString()}</span>
                            <span className="text-slate-400"> achievements</span>
                          </span>
                        </div>
                        {totalGS > 0 && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-[#107C10]">G</span>
                            <span className="text-xs text-slate-300">
                              <span className="font-semibold text-slate-100">{totalGS.toLocaleString()}</span>
                              <span className="text-slate-400"> gamerscore</span>
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="divide-y divide-slate-700/40">
                      {visibleGames.map((item: any, idx: number) => {
                        const name = item.name || item.modernTitleId || item.titleId || `Game ${idx + 1}`;
                        const rawImageUrl = item.displayImage || item.titleImageUrl || item.imageUrl || null;
                        const imageUrl = rawImageUrl ? rawImageUrl.replace(/^http:\/\//, 'https://') : null;
                        const earnedCount = item.achievement?.currentAchievements ?? item.earnedAchievements ?? null;
                        const totalCount = item.achievement?.totalAchievements ?? item.totalAchievements ?? null;
                        const gamerscore = item.achievement?.currentGamerscore ?? item.currentGamerscore ?? null;
                        const maxGamerscore = item.achievement?.totalGamerscore ?? item.maxGamerscore ?? null;
                        const pct = item.achievement?.progressPercentage != null
                          ? Math.round(item.achievement.progressPercentage)
                          : (earnedCount !== null && totalCount !== null && totalCount > 0
                            ? Math.round((earnedCount / totalCount) * 100)
                            : null);
                        const lastPlayedRaw = item.titleHistory?.lastTimePlayed || item.lastUnlock || item.lastPlayed || null;
                        const lastPlayed = lastPlayedRaw ? new Date(lastPlayedRaw) : null;
                        const lastPlayedStr = lastPlayed && !isNaN(lastPlayed.getTime())
                          ? lastPlayed.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
                          : null;

                        return (
                          <div key={idx} className="flex items-center gap-4 px-4 py-3">
                            {imageUrl ? (
                              <img src={imageUrl} alt={name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0 bg-slate-900" />
                            ) : (
                              <div className="w-12 h-12 rounded-lg bg-slate-900 flex items-center justify-center flex-shrink-0">
                                <Trophy className="w-5 h-5 text-amber-400" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-slate-200 truncate">{name}</span>
                                {pct === 100 && (
                                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#107C10]/20 text-[#107C10] flex-shrink-0">COMPLETE</span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                                {earnedCount !== null && totalCount !== null && (
                                  <span className="text-xs text-slate-400">
                                    <span className="text-slate-200 font-medium">{earnedCount}</span> / {totalCount} achievements
                                  </span>
                                )}
                                {gamerscore !== null && (
                                  <span className="text-xs text-amber-400 font-medium">
                                    {gamerscore.toLocaleString()}G
                                  </span>
                                )}
                                {lastPlayedStr && (
                                  <span className="text-xs text-slate-500">Last played {lastPlayedStr}</span>
                                )}
                              </div>
                              {pct !== null && (
                                <div className="mt-1.5 w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-[#107C10] rounded-full transition-all"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              )}
                            </div>
                            {pct !== null && (
                              <div className="flex-shrink-0 text-right min-w-[2.5rem]">
                                <span className="text-sm font-semibold text-slate-200">{pct}%</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </TabsContent>
          )}

          {/* Trophies Tab (PlayStation) */}
          {profile?.showPsnTrophies && Array.isArray(profile?.psnTrophyData) && profile.psnTrophyData.length > 0 && (
            <TabsContent value="trophies" className="pt-4 px-1 md:px-4">
              {(() => {
                const data = profile.psnTrophyData[0];
                const earned = data?.earnedTrophies ?? {};
                const recentGames: any[] = data?.recentGames ?? [];
                const trophyLevel = (profile as any).psnTrophyLevel ?? data?.trophyLevel ?? null;
                const totalTrophies = (profile as any).psnTotalTrophies ?? null;

                return (
                  <div className="rounded-xl border border-[#003791]/30 bg-[#003791]/5 overflow-hidden">
                    <div className="px-4 py-3 border-b border-[#003791]/20">
                      <div className="flex items-center gap-2 mb-2">
                        <FaPlaystation className="w-4 h-4 text-[#003791]" />
                        <span className="text-sm font-semibold text-slate-200">PlayStation Trophies</span>
                        {recentGames.length > 0 && (
                          <span className="text-xs text-slate-400 ml-auto">
                            {recentGames.length} recent {recentGames.length === 1 ? 'game' : 'games'}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 flex-wrap">
                        {trophyLevel !== null && (
                          <div className="flex items-center gap-1.5">
                            <Trophy className="w-3.5 h-3.5 text-[#003791]" />
                            <span className="text-xs text-slate-300">
                              <span className="text-slate-400">Level </span>
                              <span className="font-semibold text-slate-100">{trophyLevel}</span>
                            </span>
                          </div>
                        )}
                        {totalTrophies !== null && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-slate-300">
                              <span className="font-semibold text-slate-100">{totalTrophies.toLocaleString()}</span>
                              <span className="text-slate-400"> total trophies</span>
                            </span>
                          </div>
                        )}
                        {earned.platinum > 0 && (
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-bold text-[#b0b0d0]">🏆</span>
                            <span className="text-xs text-slate-300">
                              <span className="font-semibold text-slate-100">{earned.platinum}</span>
                              <span className="text-slate-400"> plat</span>
                            </span>
                          </div>
                        )}
                        {earned.gold > 0 && (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-slate-300">
                              <span className="font-semibold text-amber-400">{earned.gold}</span>
                              <span className="text-slate-400"> gold</span>
                            </span>
                          </div>
                        )}
                        {earned.silver > 0 && (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-slate-300">
                              <span className="font-semibold text-slate-300">{earned.silver}</span>
                              <span className="text-slate-400"> silver</span>
                            </span>
                          </div>
                        )}
                        {earned.bronze > 0 && (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-slate-300">
                              <span className="font-semibold text-amber-700">{earned.bronze}</span>
                              <span className="text-slate-400"> bronze</span>
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    {recentGames.length > 0 && (
                      <div className="divide-y divide-slate-700/40">
                        {recentGames.map((game: any, idx: number) => {
                          const name = game.name || game.titleId || `Game ${idx + 1}`;
                          const rawImageUrl = game.imageUrl || null;
                          const imageUrl = rawImageUrl ? rawImageUrl.replace(/^http:\/\//, 'https://') : null;
                          const lastPlayedRaw = game.lastPlayedDateTime || null;
                          const lastPlayed = lastPlayedRaw ? new Date(lastPlayedRaw) : null;
                          const lastPlayedStr = lastPlayed && !isNaN(lastPlayed.getTime())
                            ? lastPlayed.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
                            : null;
                          const playCount = game.playCount ?? null;
                          const category = game.category || null;
                          const isPlatinum = false;

                          return (
                            <div key={idx} className="flex items-center gap-4 px-4 py-3">
                              {imageUrl ? (
                                <img src={imageUrl} alt={name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0 bg-slate-900" />
                              ) : (
                                <div className="w-12 h-12 rounded-lg bg-slate-900 flex items-center justify-center flex-shrink-0">
                                  <FaPlaystation className="w-5 h-5 text-[#003791]" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-slate-200 truncate">{name}</span>
                                  {category && (
                                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#003791]/20 text-[#6699cc] flex-shrink-0">
                                      {category === 'ps5_native_game' ? 'PS5' : category === 'ps4_game' ? 'PS4' : category.toUpperCase()}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                                  {playCount !== null && (
                                    <span className="text-xs text-slate-400">
                                      <span className="text-slate-300 font-medium">{playCount}</span> {playCount === 1 ? 'play' : 'plays'}
                                    </span>
                                  )}
                                  {lastPlayedStr && (
                                    <span className="text-xs text-slate-500">Last played {lastPlayedStr}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}
            </TabsContent>
          )}

          {/* About Tab */}
          <TabsContent value="about" className="pt-6">
            <div className="max-w-2xl">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-2">About {profile.displayName}</h3>
                  <p className="text-muted-foreground">
                    {profile.bio || `${profile.displayName} hasn't added a bio yet.`}
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-2">Social Links</h3>
                  <div className="space-y-2">
                    {profile.youtubeUsername && (
                      <a 
                        href={`https://youtube.com/@${profile.youtubeUsername}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-muted-foreground hover:text-foreground flex items-center gap-2"
                      >
                        <Youtube className="h-5 w-5" />
                        <span>YouTube: @{profile.youtubeUsername}</span>
                      </a>
                    )}

                    {profile.twitterUsername && (
                      <a 
                        href={`https://twitter.com/${profile.twitterUsername}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-muted-foreground hover:text-foreground flex items-center gap-2"
                      >
                        <FaXTwitter className="h-5 w-5" />
                        <span>X: @{profile.twitterUsername}</span>
                      </a>
                    )}

                    {profile.steamUsername && (
                      <a 
                        href={`https://steamcommunity.com/id/${profile.steamUsername}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-muted-foreground hover:text-foreground flex items-center gap-2"
                      >
                        <Gamepad className="h-5 w-5" />
                        <span>Steam: {profile.steamUsername}</span>
                      </a>
                    )}

                    {profile.xboxUsername && (
                      <div className="text-muted-foreground flex items-center gap-2">
                        <Gamepad className="h-5 w-5" />
                        <span>Xbox: {profile.xboxUsername}</span>
                      </div>
                    )}

                    {profile.playstationUsername && (
                      <div className="text-muted-foreground flex items-center gap-2">
                        <Gamepad className="h-5 w-5" />
                        <span>PlayStation: {profile.playstationUsername}</span>
                      </div>
                    )}

                    {!profile.youtubeUsername && 
                     !profile.twitterUsername && 
                     !profile.steamUsername && 
                     !profile.xboxUsername && 
                     !profile.playstationUsername && (
                      <p className="text-muted-foreground">No social links added yet.</p>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-2">Community</h3>
                  <div className="flex flex-wrap gap-4">
                    <Button 
                      variant="outline" 
                      className="flex items-center gap-2"
                      onClick={() => alert('Followers list coming soon!')}
                    >
                      <Users className="h-4 w-4" />
                      {(profile as any)?._count?.followers || 0} Followers
                    </Button>
                    <Button 
                      variant="outline" 
                      className="flex items-center gap-2"
                      onClick={() => alert('Following list coming soon!')}
                    >
                      <Users className="h-4 w-4" />
                      Following {(profile as any)?._count?.following || 0}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
        )}
        </div>

        {/* Game Selection Dialog */}
        {isOwnProfile && profile && (
          <React.Suspense fallback={null}>
            <GameSelectionDialog
              isOpen={showGameSelection}
              onClose={() => setShowGameSelection(false)}
              userId={profile.id}
              username={username}
              existingFavorites={favoriteGames?.map(game => ({ id: game.id, name: game.name })) || []}
            />
          </React.Suspense>
        )}

        {/* Screenshot Lightbox */}
        <ScreenshotLightbox
          screenshot={selectedScreenshot}
          onClose={() => setSelectedScreenshot(null)}
          currentUserId={currentUser?.id}
          screenshots={screenshots as any[]}
          onNavigate={(s: any) => setSelectedScreenshot({ ...s, user: s.user || { id: profile?.id, username: profile?.username, displayName: profile?.displayName, avatarUrl: profile?.avatarUrl } })}
        />

      {/* Share Dialogs for newly uploaded content */}
      <React.Suspense fallback={null}>
        {(shareDialogType === 'clip' || shareDialogType === 'reel') && shareDialogId && (
          <ClipShareDialog
            clipId={shareDialogId}
            isOwnContent={true}
            contentType={shareDialogType}
            open={shareDialogOpen}
            onOpenChange={(open) => {
              setShareDialogOpen(open);
              if (!open) {
                setShareDialogType(null);
                setShareDialogId(null);
                window.location.hash = '';
              }
            }}
          />
        )}

        {shareDialogType === 'screenshot' && shareDialogId && (
          <ScreenshotShareDialog
            screenshotId={shareDialogId.toString()}
            isOwnContent={true}
            open={shareDialogOpen}
            onOpenChange={(open) => {
              setShareDialogOpen(open);
              if (!open) {
                setShareDialogType(null);
                setShareDialogId(null);
                window.location.hash = '';
              }
            }}
          />
        )}

        {/* Profile Picture Lightbox */}
        <ProfilePictureLightbox
          isOpen={lightboxData.isOpen}
          onClose={closeLightbox}
          avatarUrl={lightboxData.avatarUrl}
          displayName={lightboxData.displayName}
          username={lightboxData.username}
        />
      </React.Suspense>

      {/* Banner Lightbox */}
      <BannerLightbox
        isOpen={bannerLightboxData.isOpen}
        onClose={closeBannerLightbox}
        bannerUrl={bannerLightboxData.bannerUrl}
        displayName={bannerLightboxData.displayName}
        username={bannerLightboxData.username}
      />

      {/* Join Dialog for Guest Users */}
      <JoinGamefolioDialog
        open={isOpen}
        onOpenChange={closeDialog}
        actionType={actionType}
      />

      <ProUpgradeDialog
        open={proUpgradeOpen}
        onOpenChange={setProUpgradeOpen}
      />

      {/* Profile Picture Action Dialog */}
      <Dialog open={profileActionDialogOpen} onOpenChange={setProfileActionDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Profile Options</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <React.Suspense fallback={null}>
              <GamefolioShareDialog 
                username={profile.username}
                userId={profile.id}
                userProfile={{
                  displayName: profile.displayName,
                  bio: profile.bio,
                  avatarUrl: profileAvatarSignedUrl || profile.avatarUrl,
                  bannerUrl: profile.bannerUrl,
                  selectedAvatarBorderId: profile.selectedAvatarBorderId,
                  avatarBorderColor: profile.avatarBorderColor,
                  nftProfileTokenId: profile.nftProfileTokenId,
                  nftProfileImageUrl: profile.nftProfileImageUrl,
                  emailVerified: profile.emailVerified,
                  role: profile.role,
                  isPro: profile.isPro,
                  selectedVerificationBadgeId: profile.selectedVerificationBadgeId,
                  userType: profile.userType,
                  showUserType: profile.showUserType,
                  accentColor: profile.accentColor,
                  backgroundColor: profile.backgroundColor,
                  cardColor: profile.cardColor,
                  primaryColor: profile.primaryColor
                }}
                userStats={{
                  clips: profile._count?.clips || 0,
                  followers: profile._count?.followers || 0,
                  following: profile._count?.following || 0
                }}
                favoriteGames={favoriteGames?.slice(0, 5).map(g => ({ id: g.id, name: g.name, imageUrl: g.imageUrl }))}
                trigger={
                  <Button variant="outline" className="w-full justify-start" onClick={() => setProfileActionDialogOpen(false)}>
                    <Share2 className="mr-2 h-4 w-4" />
                    Share Profile
                  </Button>
                }
              />
            </React.Suspense>
            {!isOwnProfile && (
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => {
                  setProfileActionDialogOpen(false);
                  toast({
                    title: "Report Profile",
                    description: "Profile reporting feature coming soon. Please contact support for urgent issues.",
                    variant: "default"
                  });
                }}
              >
                <Flag className="mr-2 h-4 w-4" />
                Report Profile
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Message Dialog */}
      {profile && (
        <React.Suspense fallback={null}>
          <MessageDialog
            open={messageDialogOpen}
            onOpenChange={setMessageDialogOpen}
            targetUser={{
              id: profile.id,
              username: profile.username,
              displayName: profile.displayName,
              avatarUrl: profileAvatarSignedUrl || profile.avatarUrl,
            }}
          />
        </React.Suspense>
      )}

      {/* Name Tag Detail Dialog - matches Store page design */}
      <NameTagDetailDialog
        nameTag={nameTagData?.nameTag ? {
          id: nameTagData.nameTag.id,
          name: nameTagData.nameTag.name,
          imageUrl: nameTagSignedUrl || nameTagData.nameTag.imageUrl,
          rarity: nameTagData.nameTag.rarity,
          gfCost: 0,
          owned: true,
        } : null}
        open={nameTagPreviewOpen}
        onOpenChange={setNameTagPreviewOpen}
        onPurchase={() => {}}
        isPurchasing={false}
        brokenImage={false}
        ownerName={`@${profile?.username || username}`}
        ownerAvatarUrl={profileAvatarSignedUrl || profile?.avatarUrl || undefined}
      />
    </div>
    </>
  );
};

export default ProfilePage;