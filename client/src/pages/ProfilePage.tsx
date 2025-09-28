import React, { useState, useEffect, useMemo, useRef } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Game, User, UserWithStats, ClipWithUser, Screenshot } from "@shared/schema";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import VideoClipGridItem from "@/components/clips/VideoClipGridItem";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import GameSelectionDialog from "@/components/games/GameSelectionDialog";
import { 
  Heart, 
  Users, 
  Youtube, 
  Twitter, 
  Gamepad,
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
  Loader2
} from "lucide-react";
import { 
  SiSteam,
  SiPlaystation,
  SiDiscord,
  SiEpicgames,
  SiNintendo
} from "react-icons/si";
import { FaXbox, FaTwitter, FaYoutube, FaInstagram, FaFacebook } from "react-icons/fa";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogClose
} from "@/components/ui/dialog";
import CommentSection from "@/components/clips/CommentSection";
import { ScreenshotCard } from "@/components/screenshots/ScreenshotCard";
import { LikeButton } from "@/components/engagement/LikeButton";
import { FireButton } from "@/components/engagement/FireButton";
import { VerifiedIcon } from "@/components/ui/verified-icon";
import { ModeratorIcon } from "@/components/ui/moderator-icon";
import { VerificationBadge } from "@/components/ui/verification-badge";
import { ModeratorBadge } from "@/components/ui/moderator-badge";
import { ClipShareDialog } from "@/components/clip/ClipShareDialog";
import { ScreenshotShareDialog } from "@/components/screenshot/ScreenshotShareDialog";
import { GamefolioShareDialog } from "@/components/profile/GamefolioShareDialog";
import { ReportDialog } from "@/components/content/ReportDialog";
import { ReportButton } from "@/components/reporting/ReportButton";
import { ProfilePictureLightbox, useProfilePictureLightbox } from "@/components/ui/profile-picture-lightbox";
import { BannerLightbox, useBannerLightbox } from "@/components/ui/banner-lightbox";
import { JoinGamefolioDialog } from "@/components/auth/JoinGamefolioDialog";
import { useJoinDialog } from "@/hooks/use-join-dialog";
import { useClipDialog } from "@/hooks/use-clip-dialog";
import { formatDistance } from "date-fns";
import { cn } from "@/lib/utils";
import NotFound from "./not-found";

const ProfilePage = () => {
  const params = useParams();
  const { username, screenshotId, shareCode, clipShareCode, reelShareCode } = params;
  const [location, setLocation] = useLocation();
  
  console.log("🔍 ProfilePage: URL params received:", params, "location:", location);
  
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
    enabled: !!username,
    retry: (failureCount, error: any) => {
      // Don't retry on 404 (user not found) or 403 (private profile)
      if (error?.status === 404 || error?.status === 403) {
        return false;
      }
      return failureCount < 3;
    },
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
    enabled: !!username && canViewContent,
  });

  // Fetch user favorite games (only if allowed to view content)
  const { data: favoriteGames, isLoading: isLoadingFavorites } = useQuery<Game[]>({
    queryKey: [`/api/users/${username}/games/favorites`],
    enabled: !!username && canViewContent,
  });

  // Fetch all games for screenshot lightbox
  const { data: games = [] } = useQuery<Game[]>({
    queryKey: ['/api/games'],
    enabled: !!selectedScreenshot, // Only fetch when screenshot lightbox is open
  });

  // Fetch user screenshots (only if allowed to view content)
  const { data: screenshots, isLoading: isLoadingScreenshots } = useQuery<Screenshot[]>({
    queryKey: [`/api/users/${profile?.id}/screenshots`],
    enabled: !!profile?.id && canViewContent,
  });

  // Fetch screenshot by shareCode (when shareCode is present in URL)
  const { data: screenshotByShareCode, isLoading: isLoadingScreenshotByShareCode } = useQuery<Screenshot>({
    queryKey: [`/api/screenshots/share/${shareCode}`],
    enabled: !!shareCode,
  });

  // Fetch clip by shareCode (when clipShareCode is present in URL)
  const { data: clipByShareCode, isLoading: isLoadingClipByShareCode } = useQuery<ClipWithUser>({
    queryKey: [`/api/clips/share/${clipShareCode}`],
    enabled: !!clipShareCode,
  });

  // Fetch reel by shareCode (when reelShareCode is present in URL)
  const { data: reelByShareCode, isLoading: isLoadingReelByShareCode } = useQuery<ClipWithUser>({
    queryKey: [`/api/reels/share/${reelShareCode}`],
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
        variant: "destructive",
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
        variant: "destructive",
      });
    },
  });

  // Set default tab
  const [activeTab, setActiveTab] = useState("clips");

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
        variant: "destructive",
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
        variant: "destructive",
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
    
    // Check if mobile (simplified check for component)
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    
    if (isMobile) {
      // On mobile: narrower underlines (40% of tab width) centered within each 25% tab
      const tabWidthPercent = 25;
      const underlineWidthPercent = tabWidthPercent * 0.4; // 10%
      const centerOffset = (tabWidthPercent - underlineWidthPercent) / 2; // 7.5%
      
      return {
        leftPercent: tabIndex * tabWidthPercent + centerOffset,
        widthPercent: underlineWidthPercent
      };
    } else {
      // Desktop: full width underlines
      return {
        leftPercent: tabIndex * 25,
        widthPercent: 25
      };
    }
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
      <div className="container mx-auto py-8 space-y-8">
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

  const bgRgb = hexToRgb(backgroundColor);
  const accentRgb = hexToRgb(accentColor);

  // Debug: Log the actual colors being used
  console.log('Profile colors:', { accentColor, backgroundColor, bgRgb, accentRgb });

  return (
    <div 
      className="min-h-screen pb-12 relative profile-theme-scope" 
      ref={profileThemeScopeRef}
      style={{ 
        background: '#101D27',
        position: 'relative',
        zIndex: 1
      }}
    >
      {/* Enhanced Banner with global theme colors */}
      <div 
        className={`h-64 sm:h-80 md:h-96 bg-cover bg-center overflow-hidden profile-banner relative -mx-4 md:-mx-8 border-b-4 border-primary ${profile?.bannerUrl ? 'cursor-pointer hover:brightness-110 transition-all duration-200' : ''}`}
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

      {/* Profile Info - positioned below banner with overlapping profile picture */}
      <div className="container mx-auto px-4 relative z-20">

        <div className="flex items-start gap-4 md:gap-8 pb-6" style={{ marginTop: '-56px', paddingTop: '24px' }}>
          {/* Profile Picture positioned to overlap banner */}
          <div className="relative flex-shrink-0" style={{ transform: 'translateY(-28px)' }}>
            <div 
              className="absolute inset-0 rounded-full animate-pulse"
              style={{
                background: `linear-gradient(45deg, hsl(var(--primary)), hsl(var(--card)))`,
                padding: '4px',
                filter: `drop-shadow(0 0 20px hsl(var(--primary) / 0.4))`,
              }}
            >
              <div className="w-full h-full rounded-full bg-background"></div>
            </div>
            <div 
              className="relative z-10 border-4 border-primary shadow-2xl cursor-pointer hover:opacity-90 transition-opacity w-32 h-32 md:w-56 md:h-56"
              style={{ 
                borderRadius: '8px',
                boxShadow: `0 0 30px hsl(var(--primary) / 0.5), 0 0 60px hsl(var(--primary) / 0.2)`
              }}
              onClick={() => profile.avatarUrl && openLightbox(profile.avatarUrl, profile.displayName, profile.username)}
            >
              <Avatar 
                className="w-full h-full"
                style={{ 
                  borderRadius: '8px'
                }}
              >
                <AvatarImage src={profile.avatarUrl || undefined} alt={profile.displayName} />
                <AvatarFallback
                  className="text-3xl text-primary-foreground font-bold bg-primary"
                >
                  {profile.displayName.charAt(0)}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>

          <div className="flex-1 pt-12 md:pt-16">
            {/* Username and Display Name with action buttons */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-start gap-4 mb-6">
              <div className="flex flex-col flex-1">
                <div className="flex items-center gap-4">
                  <h1 className="text-2xl md:text-3xl font-bold">{profile.displayName}</h1>
                  <span className="text-lg md:text-xl text-white/70 font-normal">@{profile.username}</span>
                  <ModeratorBadge 
                    isModerator={profile.role === "moderator"} 
                    size="xl" 
                  />
                  {profile.role !== "moderator" && (
                    <VerificationBadge 
                      isVerified={!!profile.emailVerified} 
                      size="xl" 
                    />
                  )}
                </div>

                {/* Stats positioned directly below username */}
                <div className="flex gap-6 items-center mt-2">
                  <div className="flex items-center gap-1">
                    <span className="font-semibold">{Number(profile._count?.clips || 0)}</span>
                    <span className="text-muted-foreground">Clips</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-semibold">{Number(profile._count?.followers || 0)}</span>
                    <span className="text-muted-foreground">Followers</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-semibold">{Number(profile._count?.following || 0)}</span>
                    <span className="text-muted-foreground">Following</span>
                  </div>
                </div>

                {/* Bio/description with increased text size (30% larger) */}
                {profile.bio && (
                  <p className="mt-3 text-base text-foreground/90 max-w-2xl">{profile.bio}</p>
                )}

                {/* Thin dividing line above gaming social links */}
                <div className="w-full h-px bg-border/60 mt-4 mb-3"></div>

                {/* Platform Connections under description */}
                <div className="flex flex-wrap gap-2 mt-3">
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
                      <FaTwitter className="w-3 h-3" />
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
              </div>

              {/* Action buttons positioned top right, in line with display name */}
              {!isOwnProfile && currentUser && (
                <div className="flex gap-2 flex-shrink-0">
                  <Button 
                    onClick={handleFollowClick}
                    variant={followRequestStatus === 'following' ? "outline" : (followRequestStatus === 'requested' ? "outline" : "default")}
                    size="sm"
                    disabled={followMutation.isPending}
                    className="relative overflow-hidden font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg border-primary text-primary hover:bg-primary/20"
                    style={followRequestStatus === 'following' || followRequestStatus === 'requested' ? {} : {
                      boxShadow: `0 4px 15px hsl(var(--primary) / 0.4)`,
                    }}
                    data-testid="follow-button"
                    data-following={followRequestStatus === 'following'}
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

                  <Button 
                    onClick={() => {
                      console.log('🎯 MESSAGE BUTTON CLICKED - Setting target user:', username);
                      setLocation(`/messages?user=${username}`);
                    }}
                    variant="outline"
                    size="sm"
                    className="relative overflow-hidden font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg border-primary text-primary hover:bg-primary/20"
                  >
                    <MessageSquare className="mr-1 h-4 w-4" /> Message
                  </Button>

                  <GamefolioShareDialog 
                    username={profile.username}
                    userProfile={{
                      displayName: profile.displayName,
                      bio: profile.bio,
                      avatarUrl: profile.avatarUrl,
                      bannerUrl: profile.bannerUrl
                    }}
                    trigger={
                      <Button
                        variant="outline"
                        size="sm"
                        className="relative overflow-hidden font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg border-primary text-primary hover:bg-primary/20"
                      >
                        <Share2 className="mr-1 h-4 w-4" /> Share
                      </Button>
                    }
                  />
                </div>
              )}

              {/* Share button for own profile */}
              {isOwnProfile && (
                <div className="flex gap-2 flex-shrink-0">
                  <GamefolioShareDialog 
                    username={profile.username}
                    userProfile={{
                      displayName: profile.displayName,
                      bio: profile.bio,
                      avatarUrl: profile.avatarUrl,
                      bannerUrl: profile.bannerUrl
                    }}
                    trigger={
                      <Button
                        variant="outline"
                        size="sm"
                        className="relative overflow-hidden font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg border-primary text-primary hover:bg-primary/20"
                      >
                        <Share2 className="mr-1 h-4 w-4" /> Share
                      </Button>
                    }
                  />
                </div>
              )}
            </div>
          </div>
        </div>




        </div>

        {/* Spacer for tabs section */}
        <div className="h-[20px]"></div>

        {/* Enhanced Tabs section with theme colors */}
        <Tabs 
          defaultValue="clips" 
          value={activeTab} 
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList 
            className="border-b w-full justify-start rounded-none h-12 md:h-14 p-0 relative overflow-x-auto overflow-y-hidden grid grid-cols-4"
            style={{ 
              backgroundColor: `hsl(var(--background) / 0.4)`,
              borderBottomColor: `hsl(var(--primary) / 0.6)`
            }}
          >
            {/* Animated background indicator */}
            <div 
              className="absolute bottom-0 h-1 transition-all duration-300 ease-out z-50 profile-tab-indicator"
              style={{
                backgroundColor: `hsl(var(--primary))`,
                boxShadow: `0 0 20px hsl(var(--primary) / 0.2)`,
                width: `${tabPosition.widthPercent}%`,
                left: `${tabPosition.leftPercent}%`,
                border: 'none',
                outline: 'none'
              } as React.CSSProperties}
            ></div>

            <TabsTrigger 
              ref={clipsTabRef}
              value="clips" 
              className="relative rounded-none h-12 md:h-14 font-medium transition-all duration-300 hover:scale-105 flex-shrink-0 px-4 md:px-6"
              style={{ 
                color: activeTab === 'clips' ? 'hsl(var(--primary))' : '#9CA3AF',
                backgroundColor: 'transparent',
              }}
            >
              <span className="relative z-10">Clips</span>
              {activeTab === 'clips' && (
                <div 
                  className="absolute inset-0 opacity-20 animate-pulse"
                  style={{
                    background: `linear-gradient(135deg, hsl(var(--primary) / 0.2), transparent)`
                  }}
                ></div>
              )}
            </TabsTrigger>

            <TabsTrigger 
              ref={reelsTabRef}
              value="reels" 
              className="relative rounded-none h-12 md:h-14 font-medium transition-all duration-300 hover:scale-105 flex-shrink-0 px-4 md:px-6"
              style={{ 
                color: activeTab === 'reels' ? 'hsl(var(--primary))' : '#9CA3AF',
                backgroundColor: activeTab === 'reels' ? 'hsl(var(--primary) / 0.1)' : 'transparent',
              }}
            >
              <span className="relative z-10">Reels</span>
              {activeTab === 'reels' && (
                <div 
                  className="absolute inset-0 opacity-20 animate-pulse"
                  style={{
                    background: `linear-gradient(135deg, hsl(var(--primary) / 0.2), transparent)`
                  }}
                ></div>
              )}
            </TabsTrigger>

            <TabsTrigger 
              ref={screenshotsTabRef}
              value="screenshots" 
              className="relative rounded-none h-12 md:h-14 font-medium transition-all duration-300 hover:scale-105 flex-shrink-0 px-4 md:px-6"
              style={{ 
                color: activeTab === 'screenshots' ? 'hsl(var(--primary))' : '#9CA3AF',
                backgroundColor: activeTab === 'screenshots' ? 'hsl(var(--primary) / 0.1)' : 'transparent',
              }}
            >
              <span className="relative z-10">Screenshots</span>
              {activeTab === 'screenshots' && (
                <div 
                  className="absolute inset-0 opacity-20 animate-pulse"
                  style={{
                    background: `linear-gradient(135deg, hsl(var(--primary) / 0.2), transparent)`
                  }}
                ></div>
              )}
            </TabsTrigger>

            <TabsTrigger 
              ref={favoritesTabRef}
              value="favorites" 
              className="relative rounded-none h-12 md:h-14 font-medium transition-all duration-300 hover:scale-105 flex-shrink-0 px-4 md:px-6"
              style={{ 
                color: activeTab === 'favorites' ? 'hsl(var(--primary))' : '#9CA3AF',
                backgroundColor: activeTab === 'favorites' ? 'hsl(var(--primary) / 0.1)' : 'transparent',
              }}
            >
              <span className="relative z-10">Favorites</span>
              {activeTab === 'favorites' && (
                <div 
                  className="absolute inset-0 opacity-20 animate-pulse"
                  style={{
                    background: `linear-gradient(135deg, hsl(var(--primary) / 0.2), transparent)`
                  }}
                ></div>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Clips Tab */}
          <TabsContent value="clips" className="pt-6">
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
                      variant={followRequestStatus === 'following' ? "outline" : (followRequestStatus === 'requested' ? "outline" : "default")}
                      disabled={followMutation.isPending}
                      className="relative overflow-hidden font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg"
                      style={followRequestStatus === 'following' ? {
                        borderColor: accentColor,
                        color: accentColor,
                      } : followRequestStatus === 'requested' ? {
                        borderColor: accentColor,
                        color: accentColor,
                      } : {
                        backgroundColor: accentColor,
                        borderColor: accentColor,
                        boxShadow: `0 4px 15px ${accentColor}40`,
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
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Skeleton key={i} className="aspect-video w-full rounded-lg" />
                ))}
              </div>
            ) : clips && clips.filter(clip => clip.videoType !== 'reel').length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {clips.filter(clip => clip.videoType !== 'reel').map((clip) => {
                  const isHighlighted = highlightedContent?.type === 'clip' && highlightedContent.id === clip.id.toString();
                  return (
                    <div 
                      key={clip.id}
                      className={`${isHighlighted ? 'ring-4 ring-primary ring-offset-2 rounded-lg' : ''}`}
                      id={isHighlighted ? `clip-${clip.id}` : undefined}
                    >
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
          <TabsContent value="reels" className="pt-6">
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
                      variant={followRequestStatus === 'following' ? "outline" : (followRequestStatus === 'requested' ? "outline" : "default")}
                      disabled={followMutation.isPending}
                      className="relative overflow-hidden font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg"
                      style={followRequestStatus === 'following' ? {
                        borderColor: accentColor,
                        color: accentColor,
                      } : followRequestStatus === 'requested' ? {
                        borderColor: accentColor,
                        color: accentColor,
                      } : {
                        backgroundColor: accentColor,
                        borderColor: accentColor,
                        boxShadow: `0 4px 15px ${accentColor}40`,
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
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Skeleton key={i} className="aspect-[9/16] w-full rounded-lg" />
                ))}
              </div>
            ) : clips && clips.filter(clip => clip.videoType === 'reel').length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
                {clips.filter(clip => clip.videoType === 'reel').map((reel) => {
                  const isHighlighted = highlightedContent?.type === 'reel' && highlightedContent.id === reel.id.toString();
                  return (
                    <div 
                      key={`reel-${reel.id}`}
                      className={`${isHighlighted ? 'ring-4 ring-primary ring-offset-2 rounded-lg' : ''}`}
                      id={isHighlighted ? `reel-${reel.id}` : undefined}
                    >
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
          <TabsContent value="screenshots" className="pt-6">
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
                      variant={followRequestStatus === 'following' ? "outline" : (followRequestStatus === 'requested' ? "outline" : "default")}
                      disabled={followMutation.isPending}
                      className="relative overflow-hidden font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg"
                      style={followRequestStatus === 'following' ? {
                        borderColor: accentColor,
                        color: accentColor,
                      } : followRequestStatus === 'requested' ? {
                        borderColor: accentColor,
                        color: accentColor,
                      } : {
                        backgroundColor: accentColor,
                        borderColor: accentColor,
                        boxShadow: `0 4px 15px ${accentColor}40`,
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
              <div className="grid grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Skeleton key={i} className="aspect-video w-full rounded-lg" />
                ))}
              </div>
            ) : screenshots && screenshots.length > 0 ? (
              <div className="grid grid-cols-3 gap-4">
                {screenshots.map((screenshot) => {
                  const isHighlighted = highlightedContent?.type === 'screenshot' && highlightedContent.id === screenshot.id.toString();
                  
                  return (
                    <ScreenshotCard
                      key={`screenshot-${screenshot.id}`}
                      screenshot={screenshot}
                      isHighlighted={isHighlighted}
                      isOwnProfile={isOwnProfile}
                      profile={profile}
                      onDelete={(id) => deleteScreenshotMutation.mutate(id)}
                      onSelect={(screenshot) => {
                        setSelectedScreenshot(screenshot);
                        // Update URL to include shareCode for proper sharing
                        if (screenshot.shareCode) {
                          setLocation(`/@${profile.username}/screenshot/${screenshot.shareCode}`);
                        }
                      }}
                    />
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
          <TabsContent value="favorites" className="pt-6">
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
                      variant={followRequestStatus === 'following' ? "outline" : (followRequestStatus === 'requested' ? "outline" : "default")}
                      disabled={followMutation.isPending}
                      className="relative overflow-hidden font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg"
                      style={followRequestStatus === 'following' ? {
                        borderColor: accentColor,
                        color: accentColor,
                      } : followRequestStatus === 'requested' ? {
                        borderColor: accentColor,
                        color: accentColor,
                      } : {
                        backgroundColor: accentColor,
                        borderColor: accentColor,
                        boxShadow: `0 4px 15px ${accentColor}40`,
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
                        <Twitter className="h-5 w-5" />
                        <span>Twitter: @{profile.twitterUsername}</span>
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
        // Revert URL to profile page when modal is closed
        if (profile?.username) {
          setLocation(`/@${profile.username}`);
        }
      }}>
        <DialogContent className="max-w-[95vw] w-[95vw] p-0 bg-background text-foreground max-h-[95vh] h-[95vh] overflow-hidden">
          <DialogClose className="absolute right-4 top-4 z-10 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
            <X className="h-6 w-6" />
            <span className="sr-only">Close</span>
          </DialogClose>

          {selectedScreenshot && (
            <div className="flex flex-col lg:flex-row h-full">
              {/* Left side - Image display */}
              <div className="bg-black flex items-center justify-center w-full lg:w-[75%] h-[60vh] lg:h-full">
                <img
                  src={selectedScreenshot.imageUrl}
                  alt={selectedScreenshot.title}
                  className="max-w-full max-h-full object-contain"
                />
              </div>

              {/* Right side - Info and comments */}
              <div className="h-full flex flex-col w-full lg:w-[25%]">
                {/* Header with username */}
                <div className="border-b border-border p-4 flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center overflow-hidden mr-3">
                      {profile?.avatarUrl ? (
                        <img 
                          src={profile.avatarUrl} 
                          alt={profile.displayName} 
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
                        {profile?.emailVerified && (
                          <VerifiedIcon size={16} className="ml-1" />
                        )}
                      </div>
                    </Link>
                  </div>
                </div>

                {/* Comments and content section - scrollable */}
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
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
                            initialLiked={false}
                            initialCount={0}
                            size="lg"
                          />

                          <FireButton 
                            contentId={selectedScreenshot.id}
                            contentType="screenshot"
                            initialFired={false}
                            initialCount={0}
                            size="lg"
                          />
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
                  <CommentSection 
                    contentId={selectedScreenshot.id}
                    contentType="screenshot"
                    currentUserId={profile?.id} 
                    autoExpanded={true}
                    initialCount={0}
                    onUsernameClick={() => setSelectedScreenshot(null)}
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
    </div>
  );
};

export default ProfilePage;