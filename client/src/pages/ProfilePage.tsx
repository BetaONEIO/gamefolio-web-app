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
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import GameSelectionDialog from "@/components/games/GameSelectionDialog";
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
  Hexagon
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { 
  SiSteam,
  SiPlaystation,
  SiDiscord,
  SiEpicgames,
  SiNintendo
} from "react-icons/si";
import { FaXbox, FaYoutube, FaInstagram, FaFacebook } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogClose,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import CommentSection from "@/components/clips/CommentSection";
import { ScreenshotCard } from "@/components/screenshots/ScreenshotCard";
import { ScreenshotCommentSection } from "@/components/screenshots/ScreenshotCommentSection";
import { LikeButton } from "@/components/engagement/LikeButton";
import { FireButton } from "@/components/engagement/FireButton";
import { ModeratorIcon } from "@/components/ui/moderator-icon";
import { ModeratorBadge } from "@/components/ui/moderator-badge";
import { VerificationBadge } from "@/components/ui/verification-badge";
import { ClipShareDialog } from "@/components/clip/ClipShareDialog";
import { ScreenshotShareDialog } from "@/components/screenshot/ScreenshotShareDialog";
import { GamefolioShareDialog } from "@/components/profile/GamefolioShareDialog";
import { MessageDialog } from "@/components/messages/MessageDialog";
import { ReportDialog } from "@/components/content/ReportDialog";
import { ReportButton } from "@/components/reporting/ReportButton";
import { ProfilePictureLightbox, useProfilePictureLightbox } from "@/components/ui/profile-picture-lightbox";
import { BannerLightbox, useBannerLightbox } from "@/components/ui/banner-lightbox";
import { JoinGamefolioDialog } from "@/components/auth/JoinGamefolioDialog";
import { useSignedUrl } from "@/hooks/use-signed-url";
import { useJoinDialog } from "@/hooks/use-join-dialog";
import { useClipDialog } from "@/hooks/use-clip-dialog";
import { formatDistance } from "date-fns";
import { cn } from "@/lib/utils";
import NotFound from "./not-found";
import MintedNftDetailScreen from "@/components/mint/MintedNftDetailScreen";
import { SKALE_NEBULA_TESTNET, NFT_CONTRACT_ADDRESS } from "@shared/contracts";

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
    dotColor: "bg-green-500 shadow-[0_0_8px_#22c55e]",
    textStyle: "bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent font-black",
    nameColor: "text-slate-800",
  },
  epic: {
    bg: "bg-slate-900",
    glow: "",
    dotColor: "bg-green-600 shadow-[0_0_8px_#16a34a]",
    textStyle: "text-slate-400 font-normal",
    nameColor: "text-slate-50",
  },
  rare: {
    bg: "bg-gradient-to-b from-[#4ade8033] via-[#14532d4d] to-[#4ade8033]",
    glow: "",
    dotColor: "bg-green-400 shadow-[0_0_8px_#4ade80]",
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
  streamer: { label: "Streamer", icon: Video, color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  gamer: { label: "Gamer", icon: Gamepad2, color: "bg-green-500/20 text-green-400 border-green-500/30" },
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
  const [shareDialogType, setShareDialogType] = useState<'clip' | 'screenshot' | null>(null);
  const [shareDialogId, setShareDialogId] = useState<number | null>(null);

  // Profile theme scope ref for dynamic styling
  const profileThemeScopeRef = useRef<HTMLDivElement>(null);

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
  const [selectedProfileNft, setSelectedProfileNft] = useState<OwnedNft | null>(null);

  const profileNftQueryKey = isOwnProfile ? "/api/nfts/owned" : `/api/nfts/user/${profile?.id}`;
  const { data: profileNftData, isLoading: profileNftsLoading, refetch: refetchProfileNfts } = useQuery<OwnedNftsData>({
    queryKey: [profileNftQueryKey],
    queryFn: getQueryFn({ on401: isOwnProfile ? "throw" : "returnNull" }),
    enabled: isOwnProfile ? !!currentUser : !!profile?.id,
    staleTime: 60_000,
  });

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
            setShareDialogType('clip');
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

  // Fetch user's selected verification badge
  const { data: verificationBadgeData } = useQuery<{ verificationBadge: { id: number; name: string; imageUrl: string } | null }>({
    queryKey: [`/api/user/${profile?.id}/verification-badge`],
    queryFn: getQueryFn({ on401: 'returnNull' }),
    enabled: !!profile?.id,
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
    if (tabParam && ['clips', 'reels', 'screenshots', 'favorites'].includes(tabParam)) {
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
      if (tabParam && ['clips', 'reels', 'screenshots', 'favorites'].includes(tabParam)) {
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
      setSelectedScreenshot(screenshot);
      
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
  const bannerStyle = useMemo(() => ({
    backgroundImage: profile?.bannerUrl 
      ? `url(${profile.bannerUrl})` 
      : `linear-gradient(135deg, ${profile?.primaryColor || '#0f172a'}, ${profile?.accentColor || '#4ADE80'}, transparent)`,
    backgroundColor: profile?.bannerUrl ? 'transparent' : (profile?.primaryColor || '#0f172a'),
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    boxShadow: 'inset 0 -10px 20px rgba(0, 0, 0, 0.2)',
  }), [profile?.bannerUrl, profile?.primaryColor, profile?.accentColor]);

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
  //       scope.style.setProperty('--user-accent-color', profile.accentColor || '#4ADE80');
  //       scope.style.setProperty('--user-primary-color', profile.primaryColor || '#02172C');
  //       scope.style.setProperty('--user-avatar-border-color', profile.avatarBorderColor || '#4ADE80');

  //       // Calculate alpha version of accent color for subtle effects
  //       const accentColor = profile.accentColor || '#4ADE80';
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

  const accentColor = profile.accentColor || '#4ADE80';
  const backgroundColor = profile.backgroundColor || '#0B2232';
  const cardColor = profile.cardColor || '#1E3A8A';

  // Convert hex colors to RGB for opacity support
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };

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
  const defaultThemeColor = '#0B2232';

  // Debug: Log the actual colors being used
  console.log('Profile colors:', { accentColor, backgroundColor, bgRgb, accentRgb });

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
          walletAddress={currentUser?.walletAddress || undefined}
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
    <div 
      className="min-h-screen pb-12 px-1 md:px-6 relative profile-theme-scope" 
      ref={profileThemeScopeRef}
      style={{ 
        background: `linear-gradient(180deg, ${defaultThemeColor} 0%, ${backgroundColor} 60%, ${backgroundColor} 100%)`,
        position: 'relative',
        zIndex: 1
      }}
    >
      {/* Enhanced Banner with global theme colors */}
      <div 
        className={`h-44 sm:h-52 md:h-72 bg-cover bg-center overflow-hidden profile-banner relative -mx-1 md:-mx-8 border-b-4 border-primary ${profile?.bannerUrl ? 'cursor-pointer hover:brightness-110 transition-all duration-200' : ''}`}
        style={{
          ...bannerStyle,
        }}
        onClick={() => {
          if (profile?.bannerUrl && profile?.displayName && profile?.username) {
            openBannerLightbox(profile.bannerUrl, profile.displayName, profile.username);
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
        {!profile?.bannerUrl && (
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
        {!profile?.bannerUrl && (
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
      </div>

      {/* Share button - positioned on banner top right for mobile */}
      <div className="block md:hidden absolute top-4 right-4 z-30">
        <GamefolioShareDialog 
          username={profile.username}
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
              className="p-2 h-10 w-10 rounded-full hover:bg-primary/10 bg-background/80 backdrop-blur-sm"
            >
              <Share2 className="w-5 h-5" />
            </Button>
          }
        />
      </div>

      {/* Profile Info - positioned below banner with overlapping profile picture */}
      <div className="max-w-[98%] md:max-w-[90%] mx-auto relative z-20">

        {/* Mobile Layout - Left-aligned like reference design */}
        <div className="block md:hidden pb-6 relative" style={{ marginTop: '-80px', paddingTop: '0px' }}>
          {/* Profile Picture - Left aligned on Mobile */}
          <div className="flex justify-start mb-2 pl-4">
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
                  className="h-full w-full"
                />
              </div>
              {/* Online status indicator - green circle at the edge of the circular avatar glow position */}
              {!selectedProfileNft && !lightboxData.isOpen && (
              <div className="absolute z-30" style={{ top: '-2px', right: '-2px' }}>
                <div className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_0_2px_rgba(0,0,0,0.8)]"></div>
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
                <span className="text-[10px] text-white/40 mt-1 uppercase tracking-widest hover:text-white/60 transition-colors">Nametag</span>
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
                  <span className="text-[10px] text-white/40 mt-1 uppercase tracking-widest hover:text-white/60 transition-colors">Nametag</span>
                </div>
              )}
            </div>
          )}
          

          {/* Username and Display Name - Left aligned on Mobile */}
          <div className="flex flex-col items-start gap-0.5 mb-2 mt-8 pl-4">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">{profile.displayName}</h1>
              <VerificationBadge
                isVerified={!!verificationBadgeData?.verificationBadge}
                badgeImageUrl={verificationBadgeData?.verificationBadge?.imageUrl}
                badgeName={verificationBadgeData?.verificationBadge?.name}
                size="lg"
              />
              <ModeratorBadge 
                isModerator={profile.role === "moderator" || profile.role === "admin"} 
                size="lg" 
              />
            </div>
            <span className="text-sm text-white/60 font-normal">@{profile.username}</span>
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
                        className={`${config.color} border text-xs font-medium px-2 py-0.5`}
                      >
                        <IconComponent className="w-3 h-3 mr-1" />
                        {config.label}
                      </Badge>
                    );
                  });
                })()}
              </div>
            )}
          </div>

          {/* L-shaped fading border container for profile info */}
          <div className="relative mt-4 mb-1 mx-4">
            {/* Curved corner piece */}
            <div 
              className="absolute top-0 -left-4 w-3 h-3 pointer-events-none"
              style={{
                borderLeft: `2px solid ${accentColor || 'hsl(var(--primary))'}`,
                borderTop: `2px solid ${accentColor || 'hsl(var(--primary))'}`,
                borderTopLeftRadius: '10px',
              }}
            />
            
            {/* Top horizontal line - fades to right with Collection button */}
            <div 
              className="absolute top-0 -left-1 h-[2px] flex items-center"
              style={{
                width: 'calc(100% + 4px)',
                background: `linear-gradient(90deg, ${accentColor || 'hsl(var(--primary))'} 0%, ${accentColor || 'hsl(var(--primary))'} 60%, transparent 100%)`,
              }}
            >
              {/* Collection button at the end of top line */}
              <button 
                onClick={() => setProfileSectionTab(profileSectionTab === 'collection' ? 'stats' : 'collection')}
                className="px-3 py-1 text-xs font-semibold rounded-full hover:opacity-90 hover:scale-105 transition-all"
                style={{ 
                  position: 'absolute',
                  top: '-12px',
                  right: '0px',
                  background: profileSectionTab === 'collection'
                    ? '#1a1a2e'
                    : 'linear-gradient(135deg, #d8b4fe 0%, #a5f3fc 25%, #86efac 50%, #fde68a 75%, #fecaca 100%)',
                  color: profileSectionTab === 'collection' ? '#ffffff' : '#1f2937',
                  border: '2px solid transparent',
                  backgroundClip: 'padding-box',
                }}
              >
                <span 
                  className="absolute inset-0 rounded-full pointer-events-none"
                  style={{
                    background: 'linear-gradient(135deg, #d8b4fe 0%, #a5f3fc 25%, #86efac 50%, #fde68a 75%, #fecaca 100%)',
                    padding: '2px',
                    mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                    maskComposite: 'xor',
                    WebkitMaskComposite: 'xor',
                    opacity: profileSectionTab === 'collection' ? 1 : 0,
                  }}
                />
                Collection
              </button>
            </div>
            
            {/* Left vertical line - fades downward */}
            <div 
              className="absolute top-3 -left-4 w-[2px]"
              style={{
                height: 'calc(100% - 12px)',
                background: `linear-gradient(180deg, ${accentColor || 'hsl(var(--primary))'} 0%, ${accentColor || 'hsl(var(--primary))'} 60%, transparent 100%)`,
              }}
            />

            {/* Content */}
            <div className="pl-0 pt-4 pb-4 pr-4">
              {profileSectionTab === 'stats' ? (
                <>
                  {/* Stats - Horizontal row with uppercase labels */}
                  <div className="flex gap-4 mb-2 mt-2 items-start">
                    <div className="flex flex-col">
                      <span className="font-bold text-sm">{(clips?.length || 0) + (screenshots?.length || 0)}</span>
                      <span className="text-xs uppercase tracking-wider" style={{ color: accentColor || 'hsl(var(--primary))' }}>UPLOADS</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-sm">{Number(profile._count?.followers || 0)}</span>
                      <span className="text-xs uppercase tracking-wider" style={{ color: accentColor || 'hsl(var(--primary))' }}>FOLLOWERS</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-sm">{Number(profile._count?.following || 0)}</span>
                      <span className="text-xs uppercase tracking-wider" style={{ color: accentColor || 'hsl(var(--primary))' }}>FOLLOWING</span>
                    </div>
                  </div>

                  {/* Member since date - uppercase */}
                  {profile.createdAt && (
                    <div className="mb-2">
                      <span className="text-xs uppercase tracking-wider" style={{ color: accentColor || 'hsl(var(--primary))' }}>
                        MEMBER SINCE {new Date(profile.createdAt).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'long' 
                        }).toUpperCase()}
                      </span>
                    </div>
                  )}

                  {/* Bio/description - left aligned */}
                  {profile.bio && (
                    <p className="text-sm text-foreground/90 mb-3 pr-4">{profile.bio}</p>
                  )}
                </>
              ) : (
                <div className="mt-2">
                  <div className="flex items-center gap-2">
                    <Hexagon className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm" style={{ color: accentColor || 'hsl(var(--primary))' }}>
                      {`${profileNftData?.nfts.filter(n => !n.sold).length || 0} NFTs owned`}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Platform tags and Social Links - hidden when collection tab is active */}
          {profileSectionTab === 'stats' && <div className="flex flex-wrap gap-1.5 mb-4 pl-4 pr-8">
            {profile.steamUsername && (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ backgroundColor: 'rgba(27, 40, 56, 0.8)', color: '#FFFFFF' }}>
                <SiSteam className="w-2.5 h-2.5" />
                <span>{profile.steamUsername}</span>
              </div>
            )}
            {profile.nintendoUsername && (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ backgroundColor: 'rgba(230, 0, 18, 0.8)', color: '#FFFFFF' }}>
                <SiNintendo className="w-2.5 h-2.5" />
                <span>{profile.nintendoUsername}</span>
              </div>
            )}
            {profile.xboxUsername && (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ backgroundColor: 'rgba(16, 124, 16, 0.8)', color: '#FFFFFF' }}>
                <FaXbox className="w-2.5 h-2.5" />
                <span>{profile.xboxUsername}</span>
              </div>
            )}
            {profile.playstationUsername && (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ backgroundColor: 'rgba(0, 55, 145, 0.8)', color: '#FFFFFF' }}>
                <SiPlaystation className="w-2.5 h-2.5" />
                <span>{profile.playstationUsername}</span>
              </div>
            )}
            {profile.epicUsername && (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ backgroundColor: 'rgba(49, 49, 49, 0.8)', color: '#FFFFFF' }}>
                <SiEpicgames className="w-2.5 h-2.5" />
                <span>{profile.epicUsername}</span>
              </div>
            )}
            {profile.discordUsername && (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ backgroundColor: 'rgba(88, 101, 242, 0.8)', color: '#FFFFFF' }}>
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
                style={{ backgroundColor: 'rgba(29, 161, 242, 0.8)', color: '#FFFFFF' }}
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
                style={{ backgroundColor: 'rgba(255, 0, 0, 0.8)', color: '#FFFFFF' }}
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
                style={{ backgroundColor: 'rgba(228, 64, 95, 0.8)', color: '#FFFFFF' }}
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
                style={{ backgroundColor: 'rgba(24, 119, 242, 0.8)', color: '#FFFFFF' }}
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
                    background: `linear-gradient(45deg, hsl(var(--primary)), hsl(var(--card)))`,
                    padding: '4px',
                    filter: `drop-shadow(0 0 20px hsl(var(--primary)))`,
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
              <h1 className="text-2xl font-bold">{profile.displayName}</h1>
              <VerificationBadge
                isVerified={!!verificationBadgeData?.verificationBadge}
                badgeImageUrl={verificationBadgeData?.verificationBadge?.imageUrl}
                badgeName={verificationBadgeData?.verificationBadge?.name}
                size="xl"
              />
              <ModeratorBadge 
                isModerator={profile.role === "moderator" || profile.role === "admin"} 
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
                      className={`${config.color} border text-xs font-medium px-2 py-0.5`}
                    >
                      <IconComponent className="w-3 h-3 mr-1" />
                      {config.label}
                    </Badge>
                  );
                });
              })()}
            </div>

            {/* Username */}
            <span className="text-base text-white/70 font-normal mt-1">@{profile.username}</span>

            {/* L-shaped fading border with curved corner and button */}
            <div className="relative mt-4" style={{ marginLeft: '-32px', height: '140px', width: '100%', maxWidth: '600px' }}>
              {/* Curved corner piece with glow */}
              <div 
                className="absolute top-0 left-0 w-4 h-4 pointer-events-none"
                style={{
                  borderLeft: `2px solid ${accentColor || 'hsl(var(--primary))'}`,
                  borderTop: `2px solid ${accentColor || 'hsl(var(--primary))'}`,
                  borderTopLeftRadius: '12px',
                  filter: `drop-shadow(0 0 6px ${accentColor || 'hsl(var(--primary))'})`,
                }}
              />
              
              {/* Top horizontal line - extends far right and fades with inner glow */}
              <div 
                className="absolute top-0 left-4 h-[2px] flex items-center"
                style={{
                  width: '550px',
                  background: `linear-gradient(90deg, ${accentColor || 'hsl(var(--primary))'} 0%, ${accentColor || 'hsl(var(--primary))'} 40%, transparent 100%)`,
                  boxShadow: `0 0 12px 2px ${accentColor || 'hsl(var(--primary))'}50, 0 2px 8px ${accentColor || 'hsl(var(--primary))'}30`,
                }}
              >
                {/* Collection button at the end of top line */}
                <button 
                  onClick={() => setProfileSectionTab(profileSectionTab === 'collection' ? 'stats' : 'collection')}
                  className="px-4 py-1.5 text-sm font-semibold rounded-full hover:opacity-90 hover:scale-105"
                  style={{ 
                    position: 'absolute',
                    top: '-14px',
                    right: '0px',
                    background: profileSectionTab === 'collection'
                      ? '#1a1a2e'
                      : 'linear-gradient(135deg, #d8b4fe 0%, #a5f3fc 25%, #86efac 50%, #fde68a 75%, #fecaca 100%)',
                    color: profileSectionTab === 'collection' ? '#ffffff' : '#1f2937',
                    border: '2px solid transparent',
                    backgroundClip: 'padding-box',
                  }}
                >
                  <span 
                    className="absolute inset-0 rounded-full pointer-events-none"
                    style={{
                      background: 'linear-gradient(135deg, #d8b4fe 0%, #a5f3fc 25%, #86efac 50%, #fde68a 75%, #fecaca 100%)',
                      padding: '2px',
                      mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                      maskComposite: 'xor',
                      WebkitMaskComposite: 'xor',
                      opacity: profileSectionTab === 'collection' ? 1 : 0,
                    }}
                  />
                  Collection
                </button>
              </div>
              
              {/* Left vertical line - starts after curved corner with inner glow */}
              <div 
                className="absolute top-4 left-0 w-[2px]"
                style={{
                  height: '120px',
                  background: `linear-gradient(180deg, ${accentColor || 'hsl(var(--primary))'} 0%, ${accentColor || 'hsl(var(--primary))'} 50%, transparent 100%)`,
                  boxShadow: `0 0 12px 2px ${accentColor || 'hsl(var(--primary))'}50, 2px 0 8px ${accentColor || 'hsl(var(--primary))'}30`,
                }}
              />
              
              {/* Content aligned with username above */}
              <div className="pl-8 pt-4" style={{ minHeight: '120px' }}>
                {profileSectionTab === 'stats' ? (
                  <>
                    {/* Stats - Uploads, Followers, Following */}
                    <div className="flex gap-6 items-center">
                      <div className="flex flex-col">
                        <span className="font-bold text-lg">{(clips?.length || 0) + (screenshots?.length || 0)}</span>
                        <span className="text-xs uppercase tracking-wider" style={{ color: accentColor || 'hsl(var(--primary))' }}>Uploads</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-lg">{Number(profile._count?.followers || 0)}</span>
                        <span className="text-xs uppercase tracking-wider" style={{ color: accentColor || 'hsl(var(--primary))' }}>Followers</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-lg">{Number(profile._count?.following || 0)}</span>
                        <span className="text-xs uppercase tracking-wider" style={{ color: accentColor || 'hsl(var(--primary))' }}>Following</span>
                      </div>
                    </div>

                    {/* Member since date */}
                    {profile.createdAt && (
                      <div className="mt-3">
                        <span className="text-xs uppercase tracking-wider" style={{ color: accentColor || 'hsl(var(--primary))' }}>
                          Member since {new Date(profile.createdAt).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'long' 
                          })}
                        </span>
                      </div>
                    )}

                    {/* Bio/description */}
                    {profile.bio && (
                      <p className="mt-3 text-base text-foreground/90 max-w-xl">{profile.bio}</p>
                    )}
                  </>
                ) : (
                  <div className="mt-4">
                    <div className="flex items-center gap-2">
                      <Hexagon className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm" style={{ color: accentColor || 'hsl(var(--primary))' }}>
                        {`${profileNftData?.nfts.filter(n => !n.sold).length || 0} NFTs owned`}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Platform Connections - hidden when collection tab is active */}
            {profileSectionTab === 'stats' && (profile.steamUsername || profile.xboxUsername || profile.playstationUsername || profile.discordUsername || profile.epicUsername || profile.nintendoUsername || profile.twitterUsername || profile.youtubeUsername || profile.instagramUsername || profile.facebookUsername) && (
              <div className="flex flex-wrap gap-2 mt-4">
                {profile.steamUsername && (
                    <div className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium" style={{ backgroundColor: '#1B2838', color: '#FFFFFF' }}>
                      <SiSteam className="w-3 h-3" />
                      <span>{profile.steamUsername}</span>
                    </div>
                  )}

                  {profile.xboxUsername && (
                    <div className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium" style={{ backgroundColor: '#107C10', color: '#FFFFFF' }}>
                      <FaXbox className="w-3 h-3" />
                      <span>{profile.xboxUsername}</span>
                    </div>
                  )}

                  {profile.playstationUsername && (
                    <div className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium" style={{ backgroundColor: '#003087', color: '#FFFFFF' }}>
                      <SiPlaystation className="w-3 h-3" />
                      <span>{profile.playstationUsername}</span>
                    </div>
                  )}

                  {profile.discordUsername && (
                    <div className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium" style={{ backgroundColor: '#5865F2', color: '#FFFFFF' }}>
                      <SiDiscord className="w-3 h-3" />
                      <span>{profile.discordUsername}</span>
                    </div>
                  )}

                  {profile.epicUsername && (
                    <div className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium" style={{ backgroundColor: '#000000', color: '#FFFFFF' }}>
                      <SiEpicgames className="w-3 h-3" />
                      <span>{profile.epicUsername}</span>
                    </div>
                  )}

                  {profile.nintendoUsername && (
                    <div className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium" style={{ backgroundColor: '#E60012', color: '#FFFFFF' }}>
                      <SiNintendo className="w-3 h-3" />
                      <span>{profile.nintendoUsername}</span>
                    </div>
                  )}

                  {profile.twitterUsername && (
                    <a 
                      href={`https://twitter.com/${profile.twitterUsername}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium hover:opacity-80 transition-opacity"
                      style={{ backgroundColor: '#1DA1F2', color: '#FFFFFF' }}
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
                      className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium hover:opacity-80 transition-opacity"
                      style={{ backgroundColor: '#FF0000', color: '#FFFFFF' }}
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
                      className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium hover:opacity-80 transition-opacity"
                      style={{ backgroundColor: '#E4405F', color: '#FFFFFF' }}
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
                    className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium hover:opacity-80 transition-opacity"
                    style={{ backgroundColor: '#1877F2', color: '#FFFFFF' }}
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
                    background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%)',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
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
                  className="text-xs text-white/40 mt-3 uppercase tracking-widest cursor-pointer hover:text-white/60 transition-colors"
                  onClick={() => setNameTagPreviewOpen(true)}
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
                    style={followRequestStatus === 'following' ? {
                      borderColor: 'hsl(var(--primary))',
                      color: 'hsl(var(--primary))',
                      backgroundColor: 'transparent',
                    } : followRequestStatus === 'requested' ? {
                      borderColor: 'hsl(var(--primary))',
                      color: 'hsl(var(--primary))',
                      backgroundColor: 'transparent',
                    } : {
                      backgroundColor: 'hsl(var(--primary))',
                      borderColor: 'hsl(var(--primary))',
                      color: 'hsl(var(--primary-foreground))',
                      boxShadow: `0 4px 15px hsl(var(--primary) / 0.4)`,
                    }}
                    onMouseEnter={(e) => {
                      if (followRequestStatus === 'following') {
                        e.currentTarget.style.backgroundColor = 'hsl(var(--primary) / 0.1)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (followRequestStatus === 'following') {
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
                    className="relative overflow-hidden font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg border-primary text-primary hover:bg-primary/20 px-6 py-3 text-base"
                  >
                    <MessageSquare className="mr-2 h-5 w-5" /> Message
                  </Button>

                  <GamefolioShareDialog 
                    username={profile.username}
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
                        className="relative overflow-hidden font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg border-primary text-primary hover:bg-primary/20 px-4 py-3"
                      >
                        <Share2 className="h-5 w-5" />
                      </Button>
                    }
                  />
                </div>
              )}

            {/* Share button for own profile */}
            {isOwnProfile && (
              <div className="flex gap-2">
                  <GamefolioShareDialog 
                    username={profile.username}
                    userProfile={{
                      displayName: profile.displayName,
                      bio: profile.bio,
                      avatarUrl: profileAvatarSignedUrl || profile.avatarUrl,
                      bannerUrl: profile.bannerUrl,
                      selectedAvatarBorderId: profile.selectedAvatarBorderId,
                      avatarBorderColor: profile.avatarBorderColor
                    }}
                    userStats={{
                      clips: profile._count?.clips || 0,
                      followers: profile._count?.followers || 0,
                      following: profile._count?.following || 0
                    }}
                    trigger={
                      <Button
                        variant="outline"
                        size="sm"
                        className="relative overflow-hidden font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg border-primary text-primary hover:bg-primary/20"
                      >
                        <Share2 className="h-4 w-4" />
                      </Button>
                    }
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Spacer for tabs section */}
        <div className="h-0 md:h-[12px]"></div>

        {/* Enhanced Tabs section with rounded container style */}
        <div className="max-w-[98%] md:max-w-[90%] mx-auto mt-2 md:mt-8">
        {profileSectionTab === 'collection' ? (
          <div className="w-full">
            <div 
              className="w-full max-w-lg lg:max-w-full mx-auto justify-center rounded-full h-11 md:h-12 p-1 relative flex gap-0.5 bg-[hsl(220,20%,12%)] border border-[hsl(220,15%,25%)] shadow-lg"
            >
              <div className="relative rounded-full h-9 md:h-10 flex-1 flex items-center justify-center px-3 md:px-5 text-sm font-semibold text-white !bg-primary gap-2">
                <Hexagon className="w-4 h-4" />
                NFTs
                {profileNftData && <span className="text-xs opacity-80">({profileNftData.nfts.filter(n => !n.sold).length})</span>}
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
                        className={`rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 hover:scale-[1.03] ${styles.bg} ${styles.glow}`}
                        onClick={() => setSelectedProfileNft(nft)}
                      >
                        <div className="aspect-square overflow-hidden">
                          {nft.image ? (
                            <img src={nft.image} alt={nft.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-slate-800">
                              <Hexagon className="w-10 h-10 text-slate-600" />
                            </div>
                          )}
                        </div>
                        <div className="p-3 pt-2">
                          <h3 className={`text-sm font-bold truncate ${styles.nameColor}`}>{nft.name}</h3>
                          <div className="flex items-center justify-between mt-1">
                            <div className="flex items-center gap-1.5">
                              <div className={`w-2 h-2 rounded-full ${styles.dotColor}`} />
                              <span className={`text-[11px] uppercase tracking-tight ${styles.textStyle}`}>{rarity}</span>
                            </div>
                            <span className="text-[11px] text-slate-500 font-medium">#{nft.tokenId}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 text-center">
                  <Hexagon className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                  <p className="text-base text-foreground/70 font-medium">No NFTs yet</p>
                  {isOwnProfile && <p className="text-sm text-muted-foreground mt-1">Mint your first NFT from the store</p>}
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
          <TabsList 
            className="w-full max-w-lg lg:max-w-full mx-auto justify-center rounded-full h-11 md:h-12 p-1 relative flex gap-0.5 bg-[hsl(220,20%,12%)] border border-[hsl(220,15%,25%)] shadow-lg"
          >
            <TabsTrigger 
              ref={clipsTabRef}
              value="clips" 
              className={`relative rounded-full h-9 md:h-10 transition-all duration-200 flex-1 px-3 md:px-5 text-sm font-semibold !shadow-none ${activeTab === 'clips' ? 'text-white !bg-primary' : 'text-gray-400 hover:text-white !bg-transparent'}`}
            >
              Clips
            </TabsTrigger>

            <TabsTrigger 
              ref={reelsTabRef}
              value="reels" 
              className={`relative rounded-full h-9 md:h-10 transition-all duration-200 flex-1 px-3 md:px-5 text-sm font-semibold !shadow-none ${activeTab === 'reels' ? 'text-white !bg-primary' : 'text-gray-400 hover:text-white !bg-transparent'}`}
            >
              Reels
            </TabsTrigger>

            <TabsTrigger 
              ref={screenshotsTabRef}
              value="screenshots" 
              className={`relative rounded-full h-9 md:h-10 transition-all duration-200 flex-1 px-2 md:px-5 text-xs md:text-sm font-semibold !shadow-none ${activeTab === 'screenshots' ? 'text-white !bg-primary' : 'text-gray-400 hover:text-white !bg-transparent'}`}
            >
              Screenshots
            </TabsTrigger>

            <TabsTrigger 
              ref={favoritesTabRef}
              value="favorites" 
              className={`relative rounded-full h-9 md:h-10 transition-all duration-200 flex-1 px-3 md:px-5 text-sm font-semibold !shadow-none ${activeTab === 'favorites' ? 'text-white !bg-primary' : 'text-gray-400 hover:text-white !bg-transparent'}`}
            >
              Favorites
            </TabsTrigger>
          </TabsList>

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
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Skeleton key={i} className="aspect-video w-full rounded-lg" />
                ))}
              </div>
            ) : clips && clips.filter(clip => clip.videoType !== 'reel').length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Skeleton key={i} className="aspect-video w-full rounded-lg" />
                ))}
              </div>
            ) : screenshots && screenshots.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {[...screenshots]
                  .sort((a, b) => {
                    if (a.pinnedAt && !b.pinnedAt) return -1;
                    if (!a.pinnedAt && b.pinnedAt) return 1;
                    return 0;
                  })
                  .map((screenshot) => {
                  const isHighlighted = highlightedContent?.type === 'screenshot' && highlightedContent.id === screenshot.id.toString();
                  const isPinned = !!screenshot.pinnedAt;
                  
                  return (
                    <div 
                      key={`screenshot-${screenshot.id}`}
                      className="relative group"
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
                          setSelectedScreenshot(screenshot);
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
                  <h3 className="text-lg font-medium mb-2">Member Since</h3>
                  <p className="text-muted-foreground">
                    {new Date(profile.createdAt).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
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
          <GameSelectionDialog
            isOpen={showGameSelection}
            onClose={() => setShowGameSelection(false)}
            userId={profile.id}
            username={username}
            existingFavorites={favoriteGames?.map(game => ({ id: game.id, name: game.name })) || []}
          />
        )}

        {/* Screenshot Lightbox Modal - Enhanced to match ClipDialog */}
      <Dialog open={!!selectedScreenshot} onOpenChange={() => {
        setSelectedScreenshot(null);
        // Dialog closes without navigation - stays on same page
      }}>
        <DialogContent className="max-w-[95%] w-[95%] p-0 bg-background text-foreground max-h-[95vh] h-[95vh] overflow-y-auto lg:overflow-hidden">
          {selectedScreenshot && (
            <div className="flex flex-col lg:flex-row h-auto lg:h-full min-h-full">
              {/* Left side - Image display */}
              <div className="bg-black flex items-center justify-center w-full lg:w-[75%] h-[50vh] lg:h-full flex-shrink-0">
                <img
                  src={selectedScreenshot.imageUrl}
                  alt={selectedScreenshot.title}
                  className="max-w-full max-h-full object-contain"
                />
              </div>

              {/* Right side - Info and comments */}
              <div className="flex flex-col w-full lg:w-[25%] lg:h-full">
                {/* Header with username */}
                <div className="border-b border-border p-4 flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center overflow-hidden mr-3">
                      {profileAvatarSignedUrl ? (
                        <img 
                          src={profileAvatarSignedUrl} 
                          alt={profile?.displayName || ''} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <UserIcon className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <Link href={`/profile/${profile?.username}`} onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      setSelectedScreenshot(null); // Close the dialog when navigating to profile
                    }}>
                      <div className="text-muted-foreground flex items-center hover:text-primary transition-colors cursor-pointer">
                        @{profile?.username}
                        <ModeratorBadge 
                          isModerator={profile?.role === "moderator" || profile?.role === "admin"} 
                          size="sm" 
                        />
                      </div>
                    </Link>
                  </div>
                </div>

                {/* Comments and content section - scrollable on desktop only */}
                <div className="flex-1 lg:overflow-y-auto px-4 py-3 space-y-3">
                  {/* Title and description */}
                  <div>
                    <h1 className="text-lg font-semibold">{selectedScreenshot.title}</h1>
                    {selectedScreenshot.description && (
                      <p className="text-sm text-foreground mt-1">{selectedScreenshot.description}</p>
                    )}

                    {/* Game name above views/time */}
                    {selectedScreenshot.gameId && games?.find(g => g.id === selectedScreenshot.gameId) && (
                      <div className="mt-2">
                        <Link href={`/games/${selectedScreenshot.gameId}/clips`} onClick={(e) => e.stopPropagation()}>
                          <span className="bg-green-600 text-white px-2 py-1 rounded text-xs font-bold hover:bg-green-500 cursor-pointer transition-colors">
                            {games.find(g => g.id === selectedScreenshot.gameId)?.name}
                          </span>
                        </Link>
                      </div>
                    )}

                    <div className="flex items-center mt-2 text-sm text-muted-foreground">
                      <Eye className="h-4 w-4 mr-1" />
                      <span className="mr-3">{selectedScreenshot.views || 0} views</span>
                      <Clock className="h-4 w-4 mr-1" />
                      <span>{selectedScreenshot.createdAt ? formatDistance(new Date(selectedScreenshot.createdAt), new Date(), { addSuffix: true }) : 'Unknown time'}</span>
                    </div>

                    {/* Action bar with reaction buttons - moved above comments */}
                    <div className="border-t border-b border-border py-3 mt-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <LikeButton 
                            contentId={selectedScreenshot.id}
                            contentType="screenshot"
                            contentOwnerId={selectedScreenshot.userId}
                            initialLiked={false}
                            initialCount={(selectedScreenshot as any)._count?.likes || 0}
                            size="lg"
                          />

                          <FireButton 
                            contentId={selectedScreenshot.id}
                            contentType="screenshot"
                            contentOwnerId={selectedScreenshot.userId}
                            initialFired={false}
                            initialCount={(selectedScreenshot as any)._count?.reactions || 0}
                            size="lg"
                          />

                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-muted-foreground hover:text-foreground flex items-center gap-1"
                            data-testid="button-comment"
                          >
                            <MessageSquare className="h-4 w-4" />
                            <span>{(selectedScreenshot as any)._count?.comments || 0}</span>
                          </Button>
                        </div>

                        <div className="flex items-center gap-2">
                          <ScreenshotShareDialog 
                            screenshotId={selectedScreenshot.id.toString()} 
                            isOwnContent={isOwnProfile}
                            trigger={
                              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                                <Share2 className="h-4 w-4" />
                              </Button>
                            } 
                          />

                          <ReportButton
                            contentType="screenshot"
                            contentId={selectedScreenshot.id}
                            contentTitle={selectedScreenshot.title}
                            variant="ghost"
                            size="sm"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Comments section */}
                  <ScreenshotCommentSection 
                    screenshotId={selectedScreenshot.id}
                  />
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Share Dialogs for newly uploaded content */}
      {shareDialogType === 'clip' && shareDialogId && (
        <ClipShareDialog
          clipId={shareDialogId}
          isOwnContent={true}
          open={shareDialogOpen}
          onOpenChange={(open) => {
            setShareDialogOpen(open);
            if (!open) {
              setShareDialogType(null);
              setShareDialogId(null);
              // Clear the URL hash after sharing dialog is closed
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
              // Clear the URL hash after sharing dialog is closed
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

      {/* Profile Picture Action Dialog */}
      <Dialog open={profileActionDialogOpen} onOpenChange={setProfileActionDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Profile Options</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <GamefolioShareDialog 
              username={profile.username}
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
      )}

      {/* Name Tag Preview Dialog */}
      {nameTagData?.nameTag && (
        <Dialog open={nameTagPreviewOpen} onOpenChange={setNameTagPreviewOpen}>
          <DialogContent className="max-w-[90vw] sm:max-w-2xl md:max-w-4xl bg-gradient-to-b from-slate-900 to-slate-950 border-slate-700 rounded-xl left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <DialogHeader>
              <DialogTitle className="text-center text-white text-xl md:text-2xl">{nameTagData.nameTag.name}</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center gap-4 py-4 md:py-8">
              <img 
                src={nameTagSignedUrl || ''} 
                alt={nameTagData?.nameTag?.name || 'Name Tag'}
                className="h-auto w-full max-w-[350px] md:max-w-[700px]"
              />
              <div className={`px-4 py-2 rounded-full text-sm font-bold uppercase ${
                nameTagData.nameTag.rarity === 'legendary' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                nameTagData.nameTag.rarity === 'epic' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                nameTagData.nameTag.rarity === 'rare' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                nameTagData.nameTag.rarity === 'uncommon' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                'bg-gray-500/20 text-gray-400 border border-gray-500/30'
              }`}>
                {nameTagData.nameTag.rarity}
              </div>
              {nameTagData.nameTag.description && (
                <p className="text-sm text-gray-400 text-center">
                  {nameTagData.nameTag.description}
                </p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
    </>
  );
};

export default ProfilePage;