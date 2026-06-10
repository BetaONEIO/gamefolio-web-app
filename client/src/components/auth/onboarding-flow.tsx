import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Check, Gamepad2, Upload, Search, ArrowRight, Video, Trophy, Code, Eye, Coffee, Scroll, Loader2, Plus, User, Camera, HelpCircle, Info, Wallet, ZoomIn, Crop, Zap, Star, Target, Gift, Tv, Globe, Swords, Users, Flame, ChevronLeft, ChevronRight } from "lucide-react";
import ShareLaunchIcon from "@/components/ui/ShareIcon";
import { GamefolioIcon } from "@/components/icons/GamefolioIcon";
import { GamefolioLeaderboardIcon } from "@/components/icons/GamefolioLeaderboardIcon";
import { GamefolioWalletIcon } from "@/components/icons/GamefolioWalletIcon";
import { Game } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import TwitchGameSearch, { TwitchGame } from "@/components/games/TwitchGameSearch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import imgMacCat from "@assets/Mac-cat_1780747173609.png";
import imgStreamer from "@assets/streamer_1780747173601.png";
import imgGfSword from "@assets/gf-sword_1780747173616.png";
import imgGoldStar from "@assets/gold-star_1780747173613.png";
import imgPurplePotion from "@assets/purple-potion_1780747173612.png";
import imgHeartPng from "@assets/heart-png_1780747173615.png";
import imgUnityLogo from "@assets/unity-logo_1780747173618.png";
import imgIndieGamer from "@assets/Indie-block-gamer-cropped_1780995777073.png";
import imgIndieGame from "@assets/indie-game_1780953921840.png";
import imgGamefolioCard from "@assets/image_1780751936689.png";
import imgIndieSocket from "@assets/-1Plug_1780932573098.png";
import imgIndiePlug from "@assets/gf-plug_1780932928172.png";
import imgBountyBg from "@assets/image_1780752103152.png";
import imgGFBag from "@assets/image_1780752169383.png";
import imgLaunchButton from "@assets/LAUNCH-BUTTON_(1)_1780950145274.png";
import imgHandPixel from "@assets/hand-pixel_1780949461463.png";
import imgProgression from "@assets/image_1780755222420.png";
import imgClip1 from "@assets/image_1781038728553.png";
import imgClip2 from "@assets/image_1781038744605.png";
import imgClip3 from "@assets/image_1781038753104.png";
import imgClip4 from "@assets/image_1781038766375.png";
import imgClip5 from "@assets/image_1781038791697.png";
import imgClip6 from "@assets/image_1781038853639.png";
import imgClip7 from "@assets/image_1781038871252.png";
import imgClip8 from "@assets/image_1781039657354.png";
import imgClip9 from "@assets/image_1781039672987.png";
import imgClip10 from "@assets/image_1781039689447.png";
import imgClip11 from "@assets/image_1781039704951.png";
import imgClip12 from "@assets/image_1781039716359.png";
import imgClip13 from "@assets/image_1781039725893.png";
import imgClip14 from "@assets/image_1781039750176.png";
import imgClip15 from "@assets/image_1781039760651.png";
import imgClip16 from "@assets/image_1781039769261.png";
import imgClip17 from "@assets/image_1781039781106.png";
import imgClip18 from "@assets/image_1781039805674.png";
import imgClip19 from "@assets/image_1781039837584.png";
import imgClip20 from "@assets/image_1781039848401.png";
import imgHeadFF from "@assets/hat1_1781116412973.png";
import imgHeadBubble from "@assets/bubblegum_(1)_1781116412966.png";
import Cropper from "react-easy-crop";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { useWallet } from "@/hooks/use-wallet";
import { useAuth } from "@/hooks/use-auth";
import { useAutoWallet } from "@/hooks/use-auto-wallet";

// Component to display trending games in a grid
interface TrendingGamesGridProps {
  onSelectGame: (game: TwitchGame) => void;
  selectedGames: Game[];
}

function TrendingGamesGrid({ onSelectGame, selectedGames }: TrendingGamesGridProps) {
  const { data: trendingGames, isLoading } = useQuery<TwitchGame[]>({
    queryKey: ["/api/twitch/games/top"],
    queryFn: async () => {
      const response = await fetch("/api/twitch/games/top?limit=50");
      if (!response.ok) throw new Error("Failed to fetch trending games");
      return await response.json();
    }
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
        {Array(12).fill(0).map((_, index) => (
          <div key={index} className="flex flex-col items-center">
            <Skeleton className="w-full aspect-[3/4] rounded-lg mb-2" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  if (!trendingGames || trendingGames.length === 0) {
    return (
      <div className="text-center py-6 border border-dashed border-gray-700 rounded-md">
        <p className="text-gray-400">Could not load trending games</p>
        <p className="text-sm text-gray-500 mt-1">Please try searching for games instead</p>
      </div>
    );
  }

  return (
    <div className="max-h-[400px] overflow-y-auto pr-1">
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
        {trendingGames.map((game: TwitchGame) => {
          const isSelected = selectedGames.some(g => g.id === parseInt(game.id));
          
          return (
            <button
              key={game.id}
              onClick={() => onSelectGame(game)}
              className={`group flex flex-col items-center p-1.5 rounded-lg transition-all focus:outline-none focus:ring-2 ${
                isSelected 
                  ? 'bg-[#071013] border-2 border-primary/70 ring-2 ring-primary/30' 
                  : 'bg-[#071013] border-2 border-[#1B2A33] hover:border-primary/40 hover:bg-primary/5 focus:ring-primary/30'
              }`}
            >
              <div className="relative w-full aspect-[3/4] mb-1.5 overflow-hidden rounded-md bg-[#071013]">
                <img
                  src={game.box_art_url ? game.box_art_url.replace('{width}', '300').replace('{height}', '400') : "https://placehold.co/120x160?text=Game"}
                  alt={game.name}
                  className="h-full w-full object-cover transition-transform group-hover:scale-110"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "https://placehold.co/120x160?text=Game";
                  }}
                />
                <div className={`absolute inset-0 flex items-center justify-center transition-opacity ${
                  isSelected 
                    ? 'bg-primary/20 opacity-100' 
                    : 'bg-black/40 opacity-0 group-hover:opacity-100'
                }`}>
                  {isSelected ? (
                    <Check className="h-6 w-6 text-primary drop-shadow" />
                  ) : (
                    <Plus className="h-6 w-6 text-white" />
                  )}
                </div>
              </div>
              <span className={`text-xs text-center line-clamp-2 w-full leading-tight transition-colors ${
                isSelected 
                  ? 'text-primary font-semibold' 
                  : 'text-gray-400 group-hover:text-gray-200'
              }`}>
                {game.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Onboarding steps
enum OnboardingStep {
  Welcome = 0,
  ChoosePath = 1,  // Choose path (Gamer / Streamer / Indie) — happens right after Welcome
  Intro1 = 2,      // Path-specific intro screen 1
  Intro2 = 3,      // Path-specific intro screen 2
  Intro3 = 4,      // Path-specific intro screen 3
  Username = 5,    // Google users only
  Games = 6,       // Choose Favourite Games (gamer path only)
  Avatar = 7,      // Profile picture
  PathSetup = 8,   // Path-specific setup
  Wallet = 9,      // Claim 100 GFT
  ProUpsell = 10,  // Path-specific pro upsell (end of flow)
  Complete = 11,
}

type UserPath = "gamer" | "streamer" | "indie" | null;

const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    if (!url.startsWith('data:')) {
      image.setAttribute('crossOrigin', 'anonymous');
    }
    image.src = url;
  });

const getCroppedImg = async (
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number }
): Promise<Blob> => {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No 2d context');
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  ctx.drawImage(
    image,
    pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height,
    0, 0, pixelCrop.width, pixelCrop.height
  );
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Canvas is empty'));
    }, 'image/jpeg', 0.95);
  });
};

// Phase indicator — shows 6 major milestones regardless of total steps
interface OnboardingStepIndicatorProps {
  currentStep: OnboardingStep;
  isGoogleUser: boolean;
  selectedPath: UserPath;
}

function OnboardingStepIndicator({ currentStep, isGoogleUser, selectedPath }: OnboardingStepIndicatorProps) {
  const phases = [
    { label: "Path",    from: OnboardingStep.Welcome,    to: OnboardingStep.ChoosePath },
    { label: "Intro",   from: OnboardingStep.Intro1,     to: OnboardingStep.Intro3 },
    { label: "Profile", from: OnboardingStep.Username,   to: OnboardingStep.Avatar },
    { label: "Setup",   from: OnboardingStep.PathSetup,  to: OnboardingStep.PathSetup },
    { label: "Wallet",  from: OnboardingStep.Wallet,     to: OnboardingStep.Wallet },
    { label: "Done",    from: OnboardingStep.ProUpsell,  to: OnboardingStep.Complete },
  ];

  const currentPhaseIndex = phases.findIndex(p => currentStep >= p.from && currentStep <= p.to);
  const activePhase = currentPhaseIndex === -1 ? 0 : currentPhaseIndex;

  return (
    <div className="mb-8 ob-step-indicator">
      <div className="flex items-center">
        {phases.map((phase, index) => {
          const isDone = index < activePhase;
          const isActive = index === activePhase;
          return (
            <div key={phase.label} className={`flex items-center ${index < phases.length - 1 ? 'flex-1' : ''}`}>
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-medium transition-all border-2 ${
                  isDone
                    ? "bg-primary/20 border-primary text-primary"
                    : isActive
                    ? "bg-primary border-primary text-[#071013] font-bold ob-step-active-glow"
                    : "bg-[#0B1218] border-primary/20 text-gray-500"
                }`}
              >
                {isDone ? <Check className="h-4 w-4" /> : index + 1}
              </div>
              {index < phases.length - 1 && (
                <div className="flex-1 h-0.5 mx-2 relative">
                  <div className="absolute inset-0 bg-primary/15 rounded-full" />
                  <div
                    className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${
                      isDone ? "bg-primary w-full" : "w-0"
                    }`}
                    style={{ boxShadow: isDone ? '0 0 6px rgba(183,255,26,0.4)' : 'none' }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface OnboardingFlowProps {
  userId: number;
  username: string;
  onComplete: () => void;
}

export default function OnboardingFlow({
  userId,
  username,
  onComplete,
}: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(OnboardingStep.Welcome);
  const [stepDirection, setStepDirection] = useState<'forward' | 'back'>('forward');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  // Core form state
  const [formUsername, setFormUsername] = useState(username.startsWith('temp_') ? '' : username);
  const [isGoogleUser] = useState(username.startsWith('temp_'));
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [selectedGames, setSelectedGames] = useState<Game[]>([]);
  const [selectedTwitchGames, setSelectedTwitchGames] = useState<TwitchGame[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [showCropModal, setShowCropModal] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string>('');
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  // Path selection state
  const [selectedPath, setSelectedPath] = useState<UserPath>(null);
  const [pathCardIndex, setPathCardIndex] = useState(0);
  const pathTouchStartX = useRef<number | null>(null);
  // Reset carousel to Indie (first card) every time the user enters ChoosePath
  useEffect(() => {
    if (currentStep === OnboardingStep.ChoosePath) setPathCardIndex(0);
  }, [currentStep]);
  const [gamerInterests, setGamerInterests] = useState<string[]>([]);
  const [streamerData, setStreamerData] = useState({
    kickUsername: '',
    twitchUsername: '',
    youtubeUsername: '',
    mainPlatform: '',
    mainGame: '',
    streamFrequency: '',
  });
  const [indieGameData, setIndieGameData] = useState({
    gameName: '',
    studioName: '',
    genre: '',
    releaseStatus: '',
    steamLink: '',
    epicLink: '',
    websiteLink: '',
    description: '',
  });

  // Wallet state
  const { walletAddress: sequenceWalletAddress, isReady: isWalletReady, isConnecting: isCreatingWallet, connect: connectWallet } = useWallet();
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const { 
    createWallet: createAutoWallet,
    isCreating: isCreatingAutoWallet, 
    error: walletError,
    walletAddress: autoWalletAddress
  } = useAutoWallet();
  const walletInitiatedRef = useRef(false);

  // Navigation helpers
  const getNextStep = (step: OnboardingStep): OnboardingStep => {
    switch (step) {
      case OnboardingStep.Welcome:    return OnboardingStep.ChoosePath;
      case OnboardingStep.ChoosePath: return OnboardingStep.Intro1;
      case OnboardingStep.Intro1:     return OnboardingStep.Intro2;
      case OnboardingStep.Intro2:     return OnboardingStep.Intro3;
      case OnboardingStep.Intro3:     return isGoogleUser ? OnboardingStep.Username : (selectedPath === 'gamer' ? OnboardingStep.Games : OnboardingStep.Avatar);
      case OnboardingStep.Username:   return selectedPath === 'gamer' ? OnboardingStep.Games : OnboardingStep.Avatar;
      case OnboardingStep.Games:      return OnboardingStep.Avatar;
      case OnboardingStep.Avatar:     return OnboardingStep.PathSetup;
      case OnboardingStep.PathSetup:  return OnboardingStep.Wallet;
      case OnboardingStep.Wallet:     return OnboardingStep.ProUpsell;
      case OnboardingStep.ProUpsell:  return OnboardingStep.Complete;
      default: return step;
    }
  };

  const getPrevStep = (step: OnboardingStep): OnboardingStep => {
    switch (step) {
      case OnboardingStep.ChoosePath: return OnboardingStep.Welcome;
      case OnboardingStep.Intro1:     return OnboardingStep.ChoosePath;
      case OnboardingStep.Intro2:     return OnboardingStep.Intro1;
      case OnboardingStep.Intro3:     return OnboardingStep.Intro2;
      case OnboardingStep.Username:   return OnboardingStep.Intro3;
      case OnboardingStep.Games:      return isGoogleUser ? OnboardingStep.Username : OnboardingStep.Intro3;
      case OnboardingStep.Avatar:     return selectedPath === 'gamer' ? OnboardingStep.Games : (isGoogleUser ? OnboardingStep.Username : OnboardingStep.Intro3);
      case OnboardingStep.PathSetup:  return OnboardingStep.Avatar;
      case OnboardingStep.Wallet:     return OnboardingStep.PathSetup;
      case OnboardingStep.ProUpsell:  return OnboardingStep.Wallet;
      case OnboardingStep.Complete:   return OnboardingStep.ProUpsell;
      default: return OnboardingStep.Welcome;
    }
  };

  // Auto-skip username for non-Google users
  useEffect(() => {
    if (currentStep === OnboardingStep.Username && !isGoogleUser) {
      setCurrentStep(selectedPath === 'gamer' ? OnboardingStep.Games : OnboardingStep.Avatar);
    }
  }, [currentStep, isGoogleUser, selectedPath]);

  // Auto-skip Games for non-gamer paths
  useEffect(() => {
    if (currentStep === OnboardingStep.Games && selectedPath !== 'gamer') {
      setCurrentStep(OnboardingStep.Avatar);
    }
  }, [currentStep, selectedPath]);

  // Sync wallet states
  useEffect(() => {
    if (isWalletReady && sequenceWalletAddress && !walletAddress) {
      setWalletAddress(sequenceWalletAddress);
      toast({ title: "Wallet connected!", description: "Your Sequence wallet has been connected.", variant: "gamefolioSuccess" });
    }
  }, [isWalletReady, sequenceWalletAddress, walletAddress, toast]);

  useEffect(() => {
    if (currentStep === OnboardingStep.Wallet && !walletAddress && user?.walletAddress) {
      setWalletAddress(user.walletAddress);
    }
  }, [currentStep, walletAddress, user?.walletAddress]);

  useEffect(() => {
    if (autoWalletAddress && !walletAddress) {
      setWalletAddress(autoWalletAddress);
    }
  }, [autoWalletAddress, walletAddress]);

  const handleCreateWalletClick = async () => {
    if (!walletInitiatedRef.current && !isCreatingAutoWallet) {
      walletInitiatedRef.current = true;
      await createAutoWallet();
    }
  };

  const handleRetryWalletCreation = async () => {
    walletInitiatedRef.current = false;
    await createAutoWallet();
  };

  const handleCreateWallet = () => { connectWallet(); };

  // Go to next step with validation
  const goToNextStep = async () => {
    if (currentStep === OnboardingStep.Username && isGoogleUser) {
      const isValid = await checkUsernameAvailability(formUsername);
      if (!isValid) return;
    }
    if (currentStep === OnboardingStep.ChoosePath && !selectedPath) {
      toast({ title: "Choose your path", description: "Please select one of the options to continue.", variant: "default" });
      return;
    }
    if (currentStep === OnboardingStep.PathSetup && selectedPath === 'indie' && !indieGameData.gameName.trim()) {
      toast({ title: "Game name required", description: "Please enter your game's name to continue.", variant: "default" });
      return;
    }
    if (currentStep === OnboardingStep.PathSetup && selectedPath === 'indie' && !indieGameData.releaseStatus) {
      toast({ title: "Release status required", description: "Please select a release status to continue.", variant: "default" });
      return;
    }

    const next = getNextStep(currentStep);
    setStepDirection('forward');
    setCurrentStep(next);
    if (next === OnboardingStep.Games) loadGames();
  };

  const goToPrevStep = () => {
    if (currentStep > OnboardingStep.Welcome) {
      setStepDirection('back');
      setCurrentStep(getPrevStep(currentStep));
    }
  };

  // Games logic
  const loadGames = async () => {
    setIsSearching(true);
    try {
      const response = await apiRequest("GET", "/api/twitch/games/top");
      if (!response.ok) throw new Error("Failed to load games from Twitch");
      const twitchGames = await response.json();
      if (!twitchGames || twitchGames.length === 0) { await loadFallbackGames(); return; }
      const convertedGames: Game[] = twitchGames.map((game: TwitchGame) => ({
        id: parseInt(game.id),
        name: game.name,
        imageUrl: game.box_art_url ? game.box_art_url.replace('{width}', '285').replace('{height}', '380') : null,
        twitchId: game.id,
        createdAt: new Date()
      }));
      setGames(convertedGames);
    } catch (error) {
      await loadFallbackGames();
    } finally {
      setIsSearching(false);
    }
  };

  const loadFallbackGames = async () => {
    try {
      const fallbackResponse = await apiRequest("GET", "/api/games/trending");
      if (fallbackResponse.ok) setGames(await fallbackResponse.json());
    } catch {}
  };

  const searchGames = async (query: string) => {
    if (!query.trim()) { loadGames(); return; }
    setIsSearching(true);
    try {
      const response = await apiRequest("GET", `/api/twitch/games/search?query=${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error("Search failed");
      const twitchGames = await response.json();
      setGames(twitchGames.map((game: TwitchGame) => ({
        id: parseInt(game.id), name: game.name,
        imageUrl: game.box_art_url ? game.box_art_url.replace('{width}', '285').replace('{height}', '380') : null,
        twitchId: game.id, createdAt: new Date()
      })));
    } catch {
      try {
        const fallbackResponse = await apiRequest("GET", `/api/search/games?q=${encodeURIComponent(query)}`);
        if (fallbackResponse.ok) setGames(await fallbackResponse.json());
      } catch {}
    } finally {
      setIsSearching(false);
    }
  };

  const handleTwitchGameSelect = (game: TwitchGame) => {
    const convertedGame: Game = {
      id: parseInt(game.id), name: game.name,
      imageUrl: game.box_art_url ? game.box_art_url.replace('{width}', '285').replace('{height}', '380') : null,
      twitchId: game.id, createdAt: new Date()
    };
    const alreadySelected = selectedGames.some((g) => g.id === convertedGame.id);
    const willReachMax = !alreadySelected && selectedGames.length + 1 >= 5;
    toggleGameSelection(convertedGame);
    if (willReachMax) {
      setTimeout(() => document.getElementById('games-step-bottom')?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 150);
    }
  };

  const toggleGameSelection = (game: Game) => {
    if (selectedGames.some((g) => g.id === game.id)) {
      setSelectedGames(selectedGames.filter((g) => g.id !== game.id));
    } else if (selectedGames.length < 5) {
      setSelectedGames([...selectedGames, game]);
    } else {
      toast({ title: "Maximum Reached", description: "You can select up to 5 games", variant: "default" });
    }
  };

  const checkUsernameAvailability = async (username: string) => {
    if (!username || username.length < 4) { setUsernameError("Username must be at least 4 characters long"); return false; }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) { setUsernameError("Username can only contain letters, numbers, and underscores"); return false; }
    setIsCheckingUsername(true); setUsernameError(null);
    try {
      const response = await apiRequest("GET", `/api/auth/check-username?username=${encodeURIComponent(username)}`);
      if (!response.ok) { const err = await response.json(); setUsernameError(err.message || "Username is not available"); return false; }
      return true;
    } catch { setUsernameError("Unable to check username availability"); return false; }
    finally { setIsCheckingUsername(false); }
  };

  const handleAvatarUpload = async (file: File) => {
    setIsUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      formData.append('userId', userId.toString());
      const response = await fetch('/api/upload/avatar', { method: 'POST', body: formData, credentials: 'include' });
      if (!response.ok) throw new Error('Failed to upload avatar');
      setAvatarFile(file);
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({ title: "Avatar uploaded!", description: "Your profile picture has been updated." });
    } catch {
      toast({ title: "Upload failed", description: "Could not upload your avatar. Please try again.", variant: "gamefolioError" });
    } finally { setIsUploadingAvatar(false); }
  };

  const onCropComplete = useCallback(
    (_: any, croppedPixels: { x: number; y: number; width: number; height: number }) => { setCroppedAreaPixels(croppedPixels); }, []
  );

  const applyCrop = async () => {
    if (!imageToCrop || !croppedAreaPixels) return;
    try {
      const croppedBlob = await getCroppedImg(imageToCrop, croppedAreaPixels);
      const croppedFile = new File([croppedBlob], 'avatar.jpg', { type: 'image/jpeg' });
      setAvatarUrl(URL.createObjectURL(croppedBlob));
      setAvatarFile(croppedFile);
      setShowCropModal(false); setImageToCrop(''); setCrop({ x: 0, y: 0 }); setZoom(1);
      handleAvatarUpload(croppedFile);
    } catch {
      toast({ title: "Crop failed", description: "Failed to crop the image.", variant: "gamefolioError" });
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const allowedTypes = ['image/jpeg','image/jpg','image/png','image/webp','image/gif','image/bmp','image/tiff','image/svg+xml','image/avif','image/heic','image/heif'];
      if (!allowedTypes.includes(file.type.toLowerCase())) {
        toast({ title: "Invalid file type", description: "Please select a valid image file.", variant: "gamefolioError" }); return;
      }
      const isGif = file.type === 'image/gif' || file.name.toLowerCase().endsWith('.gif');
      if (isGif && !user?.isPro) {
        toast({ title: "Pro feature", description: "Animated GIF avatars are a Pro perk.", variant: "gamefolioError" }); return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "File too large", description: "Please select an image smaller than 5MB.", variant: "gamefolioError" }); return;
      }
      setImageToCrop(URL.createObjectURL(file));
      setShowCropModal(true); setCrop({ x: 0, y: 0 }); setZoom(1);
    }
    event.target.value = '';
  };

  const completeOnboarding = async () => {
    setIsLoading(true);
    try {
      // Build user type from path
      let userType = "viewer";
      if (selectedPath === "gamer") userType = gamerInterests.length > 0 ? gamerInterests.join(",") : "gamer";
      else if (selectedPath === "streamer") userType = "streamer";
      else if (selectedPath === "indie") userType = "indie_developer";

      // Build bio from path-specific data
      let bio = "Just joined Gamefolio!";
      if (selectedPath === "streamer" && streamerData.mainPlatform) {
        bio = `Streaming on ${streamerData.mainPlatform}${streamerData.mainGame ? ` — ${streamerData.mainGame}` : ''}`;
      } else if (selectedPath === "indie" && indieGameData.gameName) {
        bio = `Indie developer — ${indieGameData.gameName}${indieGameData.studioName ? ` by ${indieGameData.studioName}` : ''}`;
      }

      await apiRequest("PATCH", `/api/users/${userId}`, {
        username: formUsername,
        displayName: formUsername,
        bio,
        userType,
      });

      if (selectedGames.length > 0) {
        for (const selectedGame of selectedGames) {
          try {
            const addGameResponse = await apiRequest("POST", "/api/twitch/games/add", { gameId: selectedGame.id.toString() });
            if (addGameResponse.ok) {
              const gameData = await addGameResponse.json();
              await apiRequest("POST", `/api/users/${userId}/favorites`, { gameId: gameData.id });
            }
          } catch {}
        }
      }

      toast({ title: "Profile created!", description: "Your Gamefolio is ready.", variant: "gamefolioSuccess" });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${userId}/games/favorites`] });
      if (formUsername) queryClient.invalidateQueries({ queryKey: [`/api/users/${formUsername}/games/favorites`] });

      onComplete();

      // Path-based routing
      const destination = selectedPath === "streamer" ? "/" : selectedPath === "indie" ? "/" : "/";
      setTimeout(() => setLocation(destination), 300);
    } catch (error) {
      toast({ title: "Error", description: "We couldn't complete your profile setup. Please try again.", variant: "gamefolioError" });
    } finally { setIsLoading(false); }
  };

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {

      // ── STEP 0: WELCOME ────────────────────────────────────────────────────
      case OnboardingStep.Welcome:
        return (
          <div className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 flex flex-col items-center justify-center text-center px-2">
              <div className="ob-logo mb-8">
                <GamefolioIcon glow={true} className="w-32 h-32 md:w-40 md:h-40" />
              </div>
              <h1 className="text-3xl md:text-4xl font-black text-white mb-3 ob-fade-up" style={{ animationDelay: '600ms' }}>
                Welcome to <span className="text-primary">Gamefolio</span>
              </h1>
              <p className="text-gray-300 text-lg ob-fade-up-slow" style={{ animationDelay: '1000ms' }}>
                Your gaming identity, all in one place.
              </p>
            </div>
            <div className="ob-cta" style={{ animationDelay: '1400ms' }}>
              <Button
                onClick={goToNextStep}
                className="w-full bg-primary hover:bg-primary/90 text-[#071013] text-base font-bold py-6 rounded-xl justify-center"
              >
                Get Started <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </div>
          </div>
        );

      // ── STEP 2: PATH-SPECIFIC INTRO 1 ─────────────────────────────────────
      case OnboardingStep.Intro1: {
        const i1 = selectedPath === 'streamer'
          ? { titleA: 'CONNECT YOUR', titleB: 'STREAMS', sub: 'Connect your streaming platforms and build a creator profile that showcases your best content.' }
          : selectedPath === 'indie'
          ? { titleA: 'PROMOTE YOUR', titleB: 'GAME', sub: 'Create a game profile and showcase your indie title to the Gamefolio community.', img: imgIndieGame, imgAlt: 'Indie game cartridge' }
          : { titleA: 'BUILD YOUR', titleB: 'GAMEFOLIO', sub: 'Your gaming legacy, all in one place. Connect accounts and showcase your best moments.', img: imgGamefolioCard, imgAlt: 'Gamefolio profile card' };
        return (
          <div className="flex flex-col flex-1 -mx-5 sm:-mx-6 md:-mx-8 bg-[#071013] overflow-hidden" style={{ marginBottom: 'calc(-1 * (max(2.5rem, env(safe-area-inset-bottom, 0px)) + 0.5rem))' }}>
            {/* Visual area */}
            <div className="flex-none relative overflow-hidden flex items-center justify-center" style={{ height: 'clamp(300px, calc(100dvh - 340px), 500px)' }}>
              {selectedPath === 'streamer' ? (
                /* Streamer Screen 1: Platform icons flowing into Gamefolio */
                <>
                  <img src={imgStreamer} alt="" aria-hidden draggable={false} className="absolute inset-0 w-full h-full select-none" style={{ objectFit:'cover', objectPosition:'top center', opacity: 0.18 }} />
                  <div className="absolute inset-x-0 bottom-0 h-24 pointer-events-none" style={{ background: 'linear-gradient(to top, #071013, transparent)' }} />
                  <div className="relative z-10 flex flex-col items-center gap-5 px-6">
                    {/* Platform row */}
                    <div className="flex items-center gap-3">
                      {/* Twitch */}
                      <div className="flex flex-col items-center gap-1.5">
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background:'rgba(145,71,255,0.15)', border:'1.5px solid rgba(145,71,255,0.35)' }}>
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="#9147ff"><path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/></svg>
                        </div>
                        <span style={{ fontSize:'10px', color:'#9147ff', fontFamily:"'Outfit',sans-serif", fontWeight:600, letterSpacing:'0.5px' }}>TWITCH</span>
                      </div>
                      {/* YouTube */}
                      <div className="flex flex-col items-center gap-1.5">
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background:'rgba(255,0,0,0.12)', border:'1.5px solid rgba(255,0,0,0.3)' }}>
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="#ff0000"><path d="M23.495 6.205a3.007 3.007 0 0 0-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 0 0 .527 6.205a31.247 31.247 0 0 0-.522 5.805 31.247 31.247 0 0 0 .522 5.783 3.007 3.007 0 0 0 2.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 0 0 2.088-2.088 31.247 31.247 0 0 0 .5-5.783 31.247 31.247 0 0 0-.5-5.805zM9.609 15.601V8.408l6.264 3.602z"/></svg>
                        </div>
                        <span style={{ fontSize:'10px', color:'#ff4444', fontFamily:"'Outfit',sans-serif", fontWeight:600, letterSpacing:'0.5px' }}>YOUTUBE</span>
                      </div>
                      {/* Arrow */}
                      <div className="flex items-center justify-center" style={{ paddingBottom:'20px' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="#c1ff00" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </div>
                      {/* Gamefolio G */}
                      <div className="flex flex-col items-center gap-1.5">
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background:'rgba(193,255,0,0.12)', border:'1.5px solid rgba(193,255,0,0.4)', boxShadow:'0 0 20px rgba(193,255,0,0.2)' }}>
                          <GamefolioIcon className="w-8 h-8" glow={false} />
                        </div>
                        <span style={{ fontSize:'10px', color:'#c1ff00', fontFamily:"'Outfit',sans-serif", fontWeight:600, letterSpacing:'0.5px' }}>GAMEFOLIO</span>
                      </div>
                    </div>
                    {/* Kick + Rumble row */}
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col items-center gap-1.5">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background:'rgba(83,252,26,0.1)', border:'1.5px solid rgba(83,252,26,0.25)' }}>
                          <span style={{ fontSize:'14px', fontWeight:900, color:'#53fc1a', fontFamily:"'Space Grotesk',sans-serif" }}>K</span>
                        </div>
                        <span style={{ fontSize:'9px', color:'#53fc1a', fontFamily:"'Outfit',sans-serif", fontWeight:600, letterSpacing:'0.5px' }}>KICK</span>
                      </div>
                      <div className="flex flex-col items-center gap-1.5">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background:'rgba(133,199,255,0.1)', border:'1.5px solid rgba(133,199,255,0.2)' }}>
                          <span style={{ fontSize:'12px', fontWeight:900, color:'#85c7ff', fontFamily:"'Space Grotesk',sans-serif" }}>R</span>
                        </div>
                        <span style={{ fontSize:'9px', color:'#85c7ff', fontFamily:"'Outfit',sans-serif", fontWeight:600, letterSpacing:'0.5px' }}>RUMBLE</span>
                      </div>
                      <span style={{ fontSize:'11px', color:'rgba(255,255,255,0.35)', fontFamily:"'Outfit',sans-serif" }}>& more coming soon</span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Green/white radiant gradient behind center of image */}
                  <div className="absolute inset-0 pointer-events-none z-0" style={{ background: 'radial-gradient(circle at 50% 45%, rgba(193,255,0,0.22) 0%, rgba(255,255,255,0.06) 25%, transparent 55%)' }} />
                  <img src={(i1 as any).img} alt={(i1 as any).imgAlt} draggable={false} className="select-none absolute inset-0 w-full h-full ob-float z-10" style={{ objectFit:'contain', objectPosition:'center', animationDuration:'4s', paddingTop: '40px' }} />
                  <div className="absolute inset-x-0 bottom-0 h-16 pointer-events-none z-10" style={{ background: 'linear-gradient(to top, #071013, transparent)' }} />
                </>
              )}
            </div>
            <div className="flex-shrink-0 px-6 pt-5 pb-6">
              <div className="flex items-center gap-2 justify-center mb-5">
                {[0,1,2].map(i => <div key={i} className="rounded-full transition-all duration-300" style={{ width: i===0?'20px':'6px', height:'6px', background: i===0?'#c1ff00':'rgba(255,255,255,0.2)', boxShadow: i===0?'0 0 8px rgba(193,255,0,0.7)':'none' }} />)}
              </div>
              <h2 className="text-center mb-2 leading-none uppercase" style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'clamp(24px,6vw,30px)', letterSpacing:'-0.9px', color:'#fff' }}>
                {i1.titleA} <span style={{ color:'#c1ff00' }}>{i1.titleB}</span>
              </h2>
              <p className="text-center mb-5" style={{ fontFamily:"'Outfit',sans-serif", fontWeight:400, fontSize:'14px', lineHeight:'20px', color:'#94A3B8' }}>{i1.sub}</p>
              <div className="flex items-center gap-3">
                <button onClick={goToPrevStep} className="flex-none flex items-center justify-center rounded-[18px]" style={{ width:'56px', height:'56px', border:'1.5px solid rgba(255,255,255,0.15)', background:'rgba(255,255,255,0.06)', backdropFilter:'blur(8px)' }} aria-label="Go back">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M15 19l-7-7 7-7" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
                <button onClick={goToNextStep} className="flex-1 rounded-[18px] py-4 uppercase font-black tracking-widest" style={{ background:'#c1ff00', boxShadow:'0 15px 35px rgba(193,255,0,0.4)', color:'#0a0f1c', fontFamily:"'Outfit',sans-serif", fontWeight:900, fontSize:'14px', letterSpacing:'2.8px', borderBottom:'3.333px solid rgba(0,0,0,0.1)' }}>
                  CONTINUE
                </button>
              </div>
            </div>
          </div>
        );
      }

      // ── STEP 3: PATH-SPECIFIC INTRO 2 ─────────────────────────────────────
      case OnboardingStep.Intro2: {
        const i2 = selectedPath === 'streamer'
          ? { titleA: 'UPLOAD YOUR', titleB: 'STREAM CLIPS', sub: 'Turn your best moments into clips, highlights and reels that continue growing your audience long after your stream ends.' }
          : selectedPath === 'indie'
          ? { titleA: 'CONNECT WITH', titleB: 'CREATORS', sub: 'Creators upload clips, reels, and screenshots to build community around your game.' }
          : { titleA: 'TRACK YOUR', titleB: 'PROGRESS', sub: 'Watch your skills grow. Every action earns XP and builds your legendary status.', img: imgProgression, imgAlt: 'Track progression' };
        return (
          <div className="flex flex-col flex-1 -mx-5 sm:-mx-6 md:-mx-8 bg-[#071013] overflow-hidden" style={{ marginBottom: 'calc(-1 * (max(2.5rem, env(safe-area-inset-bottom, 0px)) + 0.5rem))' }}>
            {/* Visual area */}
            <div className="flex-none relative flex items-center justify-center overflow-hidden" style={{ height: 'clamp(300px, calc(100dvh - 340px), 500px)' }}>
              {selectedPath === 'streamer' ? (
                /* Streamer Screen 2: Scrolling clip marquees (3 above, 3 below) */
                <>
                  <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 40%, rgba(145,71,255,0.12) 0%, transparent 70%)' }} />
                  {/* Top fade */}
                  <div className="absolute inset-x-0 top-0 h-12 pointer-events-none z-20" style={{ background: 'linear-gradient(to bottom, #071013, transparent)' }} />
                  {/* Bottom fade for top marquee area */}
                  <div className="absolute inset-x-0 bottom-0 h-12 pointer-events-none z-20" style={{ background: 'linear-gradient(to top, #071013, transparent)' }} />
                  {/* 3 rows above the text — each row uses its own exclusive clips */}
                  <div className="relative z-10 flex flex-col gap-2 w-full overflow-hidden" style={{ paddingTop: '8px' }}>
                    {/* Row 1: clips 1-4 only */}
                    <div className="flex w-max ob-marquee-left">
                      {[imgClip1, imgClip2, imgClip3, imgClip4, imgClip1, imgClip2, imgClip3, imgClip4].map((src, i) => (
                        <div key={i} className="flex-shrink-0 rounded-lg overflow-hidden mx-1.5" style={{ width: 'clamp(140px, 35vw, 200px)', height: 'clamp(90px, 22vw, 130px)', border:'1px solid rgba(255,255,255,0.08)' }}>
                          <img src={src} alt="" className="w-full h-full object-cover" draggable={false} />
                        </div>
                      ))}
                    </div>
                    {/* Row 2: clips 5-8 only */}
                    <div className="flex w-max ob-marquee-right">
                      {[imgClip5, imgClip6, imgClip7, imgClip8, imgClip5, imgClip6, imgClip7, imgClip8].map((src, i) => (
                        <div key={i} className="flex-shrink-0 rounded-lg overflow-hidden mx-1.5" style={{ width: 'clamp(140px, 35vw, 200px)', height: 'clamp(90px, 22vw, 130px)', border:'1px solid rgba(255,255,255,0.08)' }}>
                          <img src={src} alt="" className="w-full h-full object-cover" draggable={false} />
                        </div>
                      ))}
                    </div>
                    {/* Row 3: clips 9-12 only */}
                    <div className="flex w-max ob-marquee-left" style={{ animationDelay: '-8s' }}>
                      {[imgClip9, imgClip10, imgClip11, imgClip12, imgClip9, imgClip10, imgClip11, imgClip12].map((src, i) => (
                        <div key={i} className="flex-shrink-0 rounded-lg overflow-hidden mx-1.5" style={{ width: 'clamp(140px, 35vw, 200px)', height: 'clamp(90px, 22vw, 130px)', border:'1px solid rgba(255,255,255,0.08)' }}>
                          <img src={src} alt="" className="w-full h-full object-cover" draggable={false} />
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : selectedPath === 'indie' ? (
                /* Indie Screen 2: INDIE connector plug design */
                <>
                  {/* Dark navy base with green radial glow between socket and plug */}
                  <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 55%, rgba(120,200,0,0.28) 0%, rgba(60,120,0,0.10) 38%, transparent 65%), #0b1520' }} />
                  <div className="absolute inset-x-0 bottom-0 h-20 pointer-events-none" style={{ background: 'linear-gradient(to top, #071013, transparent)' }} />
                  {/* INDIE socket — lower-left, cable exits bottom */}
                  <img
                    src={imgIndieSocket}
                    alt=""
                    aria-hidden
                    draggable={false}
                    className="select-none absolute z-20"
                    style={{
                      width: 'clamp(300px, 78%, 435px)',
                      bottom: '-8%',
                      left: '-2%',
                      filter: 'drop-shadow(0 0 24px rgba(120,200,0,0.30))',
                    }}
                  />
                  {/* Green plug — upper-right, angled toward socket */}
                  <img
                    src={imgIndiePlug}
                    alt=""
                    aria-hidden
                    draggable={false}
                    className="select-none absolute z-10"
                    style={{
                      width: 'clamp(220px, 60%, 350px)',
                      top: '-4%',
                      right: '-4%',
                      transform: 'rotate(-28deg)',
                      filter: 'drop-shadow(0 8px 36px rgba(150,220,0,0.50))',
                    }}
                  />
                </>
              ) : (
                <>
                  <img src={(i2 as any).img} alt={(i2 as any).imgAlt} draggable={false} className="select-none absolute inset-0 w-full h-full" style={{ objectFit:'contain', objectPosition:'top center' }} />
                  <div className="absolute inset-x-0 bottom-0 h-16 pointer-events-none" style={{ background: 'linear-gradient(to top, #071013, transparent)' }} />
                </>
              )}
            </div>
            <div className="flex-shrink-0 px-6 pt-5 pb-6">
              <div className="flex items-center gap-2 justify-center mb-5">
                {[0,1,2].map(i => <div key={i} className="rounded-full transition-all duration-300" style={{ width: i===1?'20px':'6px', height:'6px', background: i===1?'#c1ff00':'rgba(255,255,255,0.2)', boxShadow: i===1?'0 0 8px rgba(193,255,0,0.7)':'none' }} />)}
              </div>
              <h2 className="text-center mb-2 leading-none uppercase" style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'clamp(24px,6vw,30px)', letterSpacing:'-0.9px', color:'#fff' }}>
                {i2.titleA} <span style={{ color:'#c1ff00' }}>{i2.titleB}</span>
              </h2>
              <p className="text-center mb-5" style={{ fontFamily:"'Outfit',sans-serif", fontWeight:400, fontSize:'14px', lineHeight:'20px', color:'#94A3B8' }}>{i2.sub}</p>
              <div className="flex items-center gap-3">
                <button onClick={goToPrevStep} className="flex-none flex items-center justify-center rounded-[18px]" style={{ width:'56px', height:'56px', border:'1.5px solid rgba(255,255,255,0.15)', background:'rgba(255,255,255,0.06)', backdropFilter:'blur(8px)' }} aria-label="Go back">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M15 19l-7-7 7-7" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
                <button onClick={goToNextStep} className="flex-1 rounded-[18px] py-4 uppercase font-black tracking-widest" style={{ background:'#c1ff00', boxShadow:'0 20px 40px rgba(193,255,0,0.30)', color:'#0a0f1c', fontFamily:"'Outfit',sans-serif", fontWeight:900, fontSize:'14px', letterSpacing:'2.8px', borderBottom:'3.333px solid rgba(0,0,0,0.1)' }}>
                  CONTINUE
                </button>
              </div>
            </div>
            {/* Streamer path: 3 marquee rows below the text */}
            {selectedPath === 'streamer' && (
              <div className="relative flex-shrink-0 flex flex-col gap-2 w-full overflow-hidden -mx-5 sm:-mx-6 md:-mx-8 bg-[#071013]" style={{ paddingBottom: '8px', marginTop: '-1px' }}>
                {/* Top fade connecting to text area */}
                <div className="absolute inset-x-0 top-0 h-10 pointer-events-none z-20" style={{ background: 'linear-gradient(to bottom, #071013, transparent)' }} />
                {/* Row 4: clips 13-16 only */}
                <div className="flex w-max ob-marquee-right">
                  {[imgClip13, imgClip14, imgClip15, imgClip16, imgClip13, imgClip14, imgClip15, imgClip16].map((src, i) => (
                    <div key={i} className="flex-shrink-0 rounded-lg overflow-hidden mx-1.5" style={{ width: 'clamp(140px, 35vw, 200px)', height: 'clamp(90px, 22vw, 130px)', border:'1px solid rgba(255,255,255,0.08)' }}>
                      <img src={src} alt="" className="w-full h-full object-cover" draggable={false} />
                    </div>
                  ))}
                </div>
                {/* Row 5: clips 17-20 only */}
                <div className="flex w-max ob-marquee-left" style={{ animationDelay: '-5s' }}>
                  {[imgClip17, imgClip18, imgClip19, imgClip20, imgClip17, imgClip18, imgClip19, imgClip20].map((src, i) => (
                    <div key={i} className="flex-shrink-0 rounded-lg overflow-hidden mx-1.5" style={{ width: 'clamp(140px, 35vw, 200px)', height: 'clamp(90px, 22vw, 130px)', border:'1px solid rgba(255,255,255,0.08)' }}>
                      <img src={src} alt="" className="w-full h-full object-cover" draggable={false} />
                    </div>
                  ))}
                </div>
                {/* Row 6: clips 1-4 — opposite direction to row 1, separated by text so never seen side-by-side */}
                <div className="flex w-max ob-marquee-right" style={{ animationDelay: '-3s' }}>
                  {[imgClip1, imgClip2, imgClip3, imgClip4, imgClip1, imgClip2, imgClip3, imgClip4].map((src, i) => (
                    <div key={i} className="flex-shrink-0 rounded-lg overflow-hidden mx-1.5" style={{ width: 'clamp(140px, 35vw, 200px)', height: 'clamp(90px, 22vw, 130px)', border:'1px solid rgba(255,255,255,0.08)' }}>
                      <img src={src} alt="" className="w-full h-full object-cover" draggable={false} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      }

      // ── STEP 4: PATH-SPECIFIC INTRO 3 ─────────────────────────────────────
      case OnboardingStep.Intro3: {
        const i3 = selectedPath === 'streamer'
          ? { titleA: 'UNLOCK CREATOR', titleB: 'OPPORTUNITIES', sub: 'Earn rewards, join creator campaigns, get featured on the homepage and unlock future Twitch, Kick and YouTube integrations.' }
          : selectedPath === 'indie'
          ? { titleA: 'LAUNCH', titleB: 'BOUNTIES', sub: 'Run creator campaigns, offer game keys, and reward players with bounty challenges.' }
          : { titleA: 'EARN', titleB: 'REWARDS', sub: 'Complete daily bounties, join creator challenges, and earn GFT to unlock exclusive legendary gear.' };
        return (
          <div className="flex flex-col flex-1 -mx-5 sm:-mx-6 md:-mx-8 bg-[#071013] overflow-hidden" style={{ marginBottom: 'calc(-1 * (max(2.5rem, env(safe-area-inset-bottom, 0px)) + 0.5rem))' }}>
            <div className="flex-none relative flex items-center justify-center overflow-hidden" style={{ height: 'clamp(300px, calc(100dvh - 340px), 500px)' }}>
              <img src={imgBountyBg} alt="" aria-hidden draggable={false} className="absolute inset-0 w-full h-full object-cover select-none" style={{ opacity: 0.55 }} />
              <div className="absolute inset-x-0 bottom-0 h-24 pointer-events-none" style={{ background: 'linear-gradient(to top, #071013, transparent)' }} />
              <img src={imgGFBag} alt="GF Token bag" draggable={false} className="ob-float relative z-10 select-none" style={{ height:'85%', width:'auto', objectFit:'contain', animationDuration:'4s', filter:'drop-shadow(0 0 40px rgba(193,255,0,0.35))' }} />
            </div>
            <div className="flex-shrink-0 px-6 pt-5 pb-6">
              <div className="flex items-center gap-2 justify-center mb-5">
                {[0,1,2].map(i => <div key={i} className="rounded-full transition-all duration-300" style={{ width: i===2?'20px':'6px', height:'6px', background: i===2?'#c1ff00':'rgba(255,255,255,0.2)', boxShadow: i===2?'0 0 8px rgba(193,255,0,0.7)':'none' }} />)}
              </div>
              <h2 className="text-center mb-2 leading-none uppercase" style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'clamp(24px,6vw,30px)', letterSpacing:'-0.9px', color:'#fff' }}>
                {i3.titleA} <span style={{ color:'#c1ff00' }}>{i3.titleB}</span>
              </h2>
              <p className="text-center mb-5" style={{ fontFamily:"'Outfit',sans-serif", fontWeight:400, fontSize:'14px', lineHeight:'20px', color:'#94A3B8' }}>{i3.sub}</p>
              <div className="flex items-center gap-3">
                <button onClick={goToPrevStep} className="flex-none flex items-center justify-center rounded-[18px]" style={{ width:'56px', height:'56px', border:'1.5px solid rgba(255,255,255,0.15)', background:'rgba(255,255,255,0.06)', backdropFilter:'blur(8px)' }} aria-label="Go back">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M15 19l-7-7 7-7" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
                <button onClick={goToNextStep} className="flex-1 rounded-[18px] py-4 uppercase font-black tracking-widest" style={{ background:'#c1ff00', boxShadow:'0 15px 35px rgba(193,255,0,0.4)', color:'#0a0f1c', fontFamily:"'Outfit',sans-serif", fontWeight:900, fontSize:'14px', letterSpacing:'2.8px', borderBottom:'3.333px solid rgba(0,0,0,0.1)' }}>
                  CONTINUE
                </button>
              </div>
            </div>
          </div>
        );
      }

      // ── STEP 4: USERNAME (Google users only) ────────────────────────────────
      case OnboardingStep.Username:
        if (!isGoogleUser) return null;
        return (
          <div className="flex flex-col flex-1">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-2xl font-bold text-white">Choose Your Username</h2>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-5 w-5 text-gray-400 cursor-help" />
                </TooltipTrigger>
                <TooltipContent><p>Your username will be visible on your profile and posts</p></TooltipContent>
              </Tooltip>
            </div>
            <p className="text-gray-300 mb-6">Your username is how others will find and mention you on Gamefolio</p>
            <div className="mb-6">
              <label htmlFor="username" className="block text-sm font-medium text-white mb-2">Username</label>
              <div className="relative">
                <Input
                  id="username" type="text" value={formUsername}
                  onChange={(e) => { setFormUsername(e.target.value); setUsernameError(null); }}
                  placeholder="Enter your username"
                  className={`w-full ${usernameError ? 'border-red-500' : ''}`}
                  disabled={isCheckingUsername}
                />
                {isCheckingUsername && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                  </div>
                )}
              </div>
              {usernameError && <p className="text-red-400 text-sm mt-2">{usernameError}</p>}
              <p className="text-gray-400 text-sm mt-2">At least 3 characters — letters, numbers and underscores only</p>
            </div>
            <div className="flex gap-3 mt-auto">
              <Button variant="outline" onClick={goToPrevStep}>Back</Button>
              <Button onClick={goToNextStep} disabled={!formUsername || formUsername.length < 4 || isCheckingUsername || !!usernameError} className="flex-1 bg-primary hover:bg-primary/90 text-white">
                {isCheckingUsername ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Checking...</> : <>Next <ArrowRight className="h-4 w-4 ml-2" /></>}
              </Button>
            </div>
          </div>
        );

      // ── STEP 5: GAMES ──────────────────────────────────────────────────────
      case OnboardingStep.Games:
        return (
          <div className="flex flex-col flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-2xl font-bold text-white">Choose Your Favourite Games</h2>
              <Tooltip>
                <TooltipTrigger asChild><Info className="h-5 w-5 text-gray-400 cursor-help" /></TooltipTrigger>
                <TooltipContent><p>Personalises your content, recommendations and bounties</p></TooltipContent>
              </Tooltip>
            </div>
            <div className="mb-6">
              <TwitchGameSearch onSelectGame={handleTwitchGameSelect} placeholder="Search for games..." />
              <div className="mt-6 mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-lg font-semibold text-white">Top trending games</h3>
                  <Tooltip>
                    <TooltipTrigger asChild><HelpCircle className="h-4 w-4 text-gray-400 cursor-help" /></TooltipTrigger>
                    <TooltipContent><p>Popular games on Twitch right now</p></TooltipContent>
                  </Tooltip>
                </div>
                <TrendingGamesGrid onSelectGame={handleTwitchGameSelect} selectedGames={selectedGames} />
              </div>
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-white mb-2">Your selected games</h3>
                {selectedGames.length === 0 ? (
                  <div className="text-center py-4 border border-dashed border-gray-700 rounded-md">
                    <p className="text-gray-400">No games selected yet</p>
                    <p className="text-sm text-gray-500 mt-1">Search or select from trending games (up to 5)</p>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {selectedGames.map((game) => (
                      <div key={game.id} className="flex items-center gap-2 px-2 py-1.5 border border-primary/50 bg-primary/10 rounded-full">
                        <img src={game.imageUrl || "https://placehold.co/24x24?text=G"} alt={game.name} className="w-6 h-6 object-cover rounded-full flex-shrink-0" onError={(e) => { (e.target as HTMLImageElement).src = "https://placehold.co/24x24?text=G"; }} />
                        <span className="text-sm text-white whitespace-nowrap">{game.name}</span>
                        <button onClick={() => toggleGameSelection(game)} className="w-5 h-5 flex items-center justify-center rounded-full bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white text-xs">×</button>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-sm text-gray-400 mt-3">Selected {selectedGames.length}/5 games</p>
              </div>
            </div>
            <div id="games-step-bottom" className="flex flex-col gap-3 mt-auto pt-4">
              <div className="flex gap-3">
                <Button variant="outline" onClick={goToPrevStep}>Back</Button>
                <Button onClick={goToNextStep} disabled={selectedGames.length === 0} className="flex-1 bg-primary hover:bg-primary/90 text-[#071013] font-semibold">
                  Next <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
              <button onClick={goToNextStep} className="text-sm text-gray-500 hover:text-gray-300 transition-colors text-center py-1">Skip for now</button>
            </div>
          </div>
        );

      // ── STEP 6: AVATAR ─────────────────────────────────────────────────────
      case OnboardingStep.Avatar:
        return (
          <div className="flex flex-col flex-1">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-2xl font-bold text-white">Profile Picture</h2>
              <Tooltip>
                <TooltipTrigger asChild><Info className="h-5 w-5 text-gray-400 cursor-help" /></TooltipTrigger>
                <TooltipContent><p>Your avatar appears on your profile and next to your posts</p></TooltipContent>
              </Tooltip>
            </div>
            <p className="text-gray-300 mb-6">Upload a profile picture that represents you</p>
            <div className="mb-6 flex flex-col items-center">
              <div className="mb-4 h-32 w-32 overflow-hidden rounded-full border-2 border-dashed border-primary/30 flex items-center justify-center relative group cursor-pointer" onClick={() => document.getElementById('avatar-upload')?.click()}>
                {avatarUrl ? (
                  <>
                    <img src={avatarUrl} alt="Avatar preview" className="h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Camera className="h-6 w-6 text-white" />
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center text-gray-400">
                    <User className="h-8 w-8 mb-2" />
                    <span className="text-xs text-center">Click to upload</span>
                  </div>
                )}
              </div>
              <input id="avatar-upload" type="file" accept="image/jpeg,image/jpg,image/png,image/webp,image/gif,image/bmp,image/tiff,image/svg+xml,image/avif,image/heic,image/heif" onChange={handleFileSelect} className="hidden" disabled={isUploadingAvatar} />
              <p className="text-sm text-gray-400 mb-4 text-center">Square image, at least 200×200px (max 5MB)</p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => document.getElementById('avatar-upload')?.click()} disabled={isUploadingAvatar}>
                  {isUploadingAvatar ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Uploading...</> : <><Upload className="h-4 w-4 mr-2" />{avatarUrl ? 'Change Photo' : 'Upload Photo'}</>}
                </Button>
                {avatarUrl && (
                  <Button variant="ghost" onClick={() => { setAvatarUrl(null); setAvatarFile(null); }} disabled={isUploadingAvatar}>Remove</Button>
                )}
              </div>
            </div>
            <div className="flex gap-3 mt-auto">
              <Button variant="outline" onClick={goToPrevStep}>Back</Button>
              <Button onClick={goToNextStep} disabled={isUploadingAvatar} className="flex-1 bg-primary hover:bg-primary/90 text-[#071013] font-semibold">
                {avatarUrl ? <>Next <ArrowRight className="h-4 w-4 ml-2" /></> : <span>Skip for now</span>}
              </Button>
            </div>
            <Dialog open={showCropModal} onOpenChange={setShowCropModal}>
              <DialogContent className="sm:max-w-lg max-w-[95vw] max-h-[90vh] bg-slate-900 border-slate-700 overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-white flex items-center gap-2"><Crop className="h-5 w-5" />Crop Profile Picture</DialogTitle>
                  <DialogDescription className="text-slate-400">Drag to reposition, slider to zoom</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="relative h-64 sm:h-80 w-full bg-slate-800 rounded-lg overflow-hidden touch-none">
                    {imageToCrop && <Cropper image={imageToCrop} crop={crop} zoom={zoom} aspect={1} cropShape="round" showGrid={false} onCropChange={setCrop} onCropComplete={onCropComplete} onZoomChange={setZoom} objectFit="contain" />}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-white flex items-center gap-2"><ZoomIn className="h-4 w-4" />Zoom</Label>
                      <span className="text-sm text-slate-400">{Math.round(zoom * 100)}%</span>
                    </div>
                    <Slider value={[zoom]} min={1} max={3} step={0.1} onValueChange={([value]) => setZoom(value)} className="w-full" />
                  </div>
                </div>
                <DialogFooter className="gap-2">
                  <Button variant="outline" onClick={() => { setShowCropModal(false); setImageToCrop(''); setCrop({ x: 0, y: 0 }); setZoom(1); }} className="border-slate-600 text-slate-300 hover:bg-slate-700">Cancel</Button>
                  <Button onClick={applyCrop} className="bg-primary hover:bg-primary/90">Apply Crop</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        );

      // ── STEP 7: CHOOSE YOUR PATH ───────────────────────────────────────────
      case OnboardingStep.ChoosePath: {
        // Order: Gamer → Streamer → Indie Game
        const pathCards = [
          {
            id: 'gamer' as UserPath,
            title: 'GAMER',
            ctaLabel: 'CONTINUE AS GAMER',
            visual: (
              <div className="relative flex items-end justify-center flex-shrink-0 w-full"
                style={{ height: 'clamp(300px, calc(100dvh - 380px), 460px)' }}>
                <div className="absolute w-64 h-64 rounded-full blur-[60px]" style={{ background: 'rgba(193,255,0,0.2)', top: '-5%', left: '-10%' }} />
                <div className="absolute w-56 h-56 rounded-full blur-[60px]" style={{ background: 'rgba(193,255,0,0.2)', top: '15%', right: '-10%' }} />
                <div className="absolute w-48 h-48 rounded-full blur-[60px]" style={{ background: 'rgba(193,255,0,0.2)', bottom: '-5%', left: '15%' }} />
                <img
                  src={imgMacCat}
                  alt="Gaming cat"
                  draggable={false}
                  className="ob-float relative z-10 select-none"
                  style={{ height: '100%', maxHeight: '460px', width: 'auto', objectFit: 'contain', objectPosition: 'bottom', animationDuration: '4.5s' }}
                />
              </div>
            ),
          },
          {
            id: 'streamer' as UserPath,
            title: 'STREAMER',
            ctaLabel: 'CONTINUE AS STREAMER',
            visual: (
              <div className="relative flex items-center justify-center flex-shrink-0 w-full overflow-x-hidden"
                style={{ height: 'clamp(240px, calc(100dvh - 440px), 340px)' }}>
                {/* Spark ring */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="ob-spark-ring" />
                </div>
                {/* Soft glow */}
                <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 70% 55% at 50% 58%, rgba(193,255,0,0.10) 0%, rgba(145,71,255,0.08) 45%, transparent 70%)' }} />
                {/* Two heads */}
                <div className="relative z-10 flex items-end justify-center" style={{ gap: '0px' }}>
                  <img
                    src={imgHeadFF}
                    alt=""
                    draggable={false}
                    className="select-none ob-float"
                    style={{ width: 'clamp(156px, 41.6vw, 228px)', animationDuration: '4s', animationDelay: '0.2s', filter: 'drop-shadow(0 10px 28px rgba(0,0,0,0.7)) drop-shadow(0 0 18px rgba(193,255,0,0.12))' }}
                  />
                  <img
                    src={imgHeadBubble}
                    alt=""
                    draggable={false}
                    className="select-none ob-float"
                    style={{ width: 'clamp(156px, 41.6vw, 228px)', animationDuration: '4.5s', animationDelay: '0.5s', filter: 'drop-shadow(0 10px 28px rgba(0,0,0,0.7)) drop-shadow(0 0 18px rgba(236,72,153,0.16))' }}
                  />
                </div>
              </div>
            ),
          },
          {
            id: 'indie' as UserPath,
            title: 'INDIE GAME',
            ctaLabel: 'CONTINUE AS INDIE',
            visual: (
              <div className="relative flex items-center justify-center flex-shrink-0 w-full"
                style={{ height: 'clamp(240px, calc(100dvh - 440px), 340px)' }}>
                <div className="absolute w-64 h-64 rounded-full blur-[60px]" style={{ background: 'rgba(193,255,0,0.2)' }} />
                <div className="relative z-10" style={{ width: '280px', height: '280px' }}>
                  {/* Shirt — floats centre */}
                  <div className="ob-float" style={{ position: 'absolute', top: '50%', left: '50%', animationDuration: '4s' }}>
                    <img src={imgIndieGamer} alt="" draggable={false} style={{ transform: 'translate(-50%,-50%) scale(1.3)', width: '315px', height: '315px', objectFit: 'contain' }} />
                  </div>
                  {/* Gold Star — top-left */}
                  <div className="ob-float-sm" style={{ position: 'absolute', top: '-4px', left: '-4px', animationDuration: '3.5s', animationDelay: '0.4s' }}>
                    <img src={imgGoldStar} alt="" draggable={false} style={{ transform: 'rotate(90.49deg)', width: '65px', height: '48px', objectFit: 'contain', filter: 'drop-shadow(0 0 10px rgba(255,200,0,0.85))' }} />
                  </div>
                  {/* Purple Potion — top-right */}
                  <div className="ob-float" style={{ position: 'absolute', top: '-4px', right: '-4px', animationDuration: '4.5s', animationDelay: '0.8s' }}>
                    <img src={imgPurplePotion} alt="" draggable={false} style={{ transform: 'rotate(-5.158deg)', width: '70px', height: '70px', objectFit: 'contain', filter: 'drop-shadow(0 0 10px rgba(160,0,255,0.85))' }} />
                  </div>
                  {/* Heart — bottom-right */}
                  <div className="ob-float-sm" style={{ position: 'absolute', bottom: '-8px', right: '-8px', animationDuration: '4s', animationDelay: '0.2s' }}>
                    <img src={imgHeartPng} alt="" draggable={false} style={{ width: '76px', height: '76px', objectFit: 'contain', filter: 'drop-shadow(0 0 10px rgba(255,30,60,0.85))' }} />
                  </div>
                  {/* Unity Logo — bottom-left */}
                  <div className="ob-float" style={{ position: 'absolute', bottom: '-4px', left: '-8px', animationDuration: '3.8s', animationDelay: '1s' }}>
                    <img src={imgUnityLogo} alt="" draggable={false} style={{ width: '70px', height: '54px', objectFit: 'contain', filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.75))' }} />
                  </div>
                </div>
              </div>
            ),
          },
        ];

        const totalCards = pathCards.length;

        const handlePathBack = () => {
          if (pathCardIndex > 0) setPathCardIndex(pathCardIndex - 1);
          else goToPrevStep();
        };
        const handlePathNext = () => {
          if (pathCardIndex < totalCards - 1) setPathCardIndex(pathCardIndex + 1);
        };
        const selectAndContinue = (pathId: UserPath) => {
          setSelectedPath(pathId);
          setCurrentStep(OnboardingStep.Intro1);
        };

        const currentCard = pathCards[pathCardIndex];

        return (
          <div
            className="flex flex-col flex-1 -mx-5 sm:-mx-6 md:-mx-8 bg-[#0a0f1c]"
            style={{ marginBottom: 'calc(-1 * (max(2.5rem, env(safe-area-inset-bottom, 0px)) + 0.5rem))' }}
            onTouchStart={(e) => { pathTouchStartX.current = e.touches[0].clientX; }}
            onTouchEnd={(e) => {
              if (pathTouchStartX.current === null) return;
              const delta = e.changedTouches[0].clientX - pathTouchStartX.current;
              if (delta > 50 && pathCardIndex > 0) setPathCardIndex(pathCardIndex - 1);
              else if (delta < -50 && pathCardIndex < totalCards - 1) setPathCardIndex(pathCardIndex + 1);
              pathTouchStartX.current = null;
            }}
          >
            {/* ── STATIC: back + dots — never move ── */}
            <div className="flex-shrink-0 flex items-center justify-between px-5 sm:px-6 pt-4 pb-1 relative z-20">
              <button
                onClick={handlePathBack}
                className="flex items-center gap-1 text-white/50 hover:text-white transition-colors text-sm font-medium"
              >
                <ChevronLeft className="h-5 w-5" />
                Back
              </button>
              <div className="flex items-center gap-2">
                {pathCards.map((_, dotIdx) => (
                  <button
                    key={dotIdx}
                    onClick={() => setPathCardIndex(dotIdx)}
                    className="rounded-full transition-all duration-300"
                    style={{
                      width: dotIdx === pathCardIndex ? '20px' : '6px',
                      height: '6px',
                      background: dotIdx === pathCardIndex ? '#c1ff00' : 'rgba(255,255,255,0.25)',
                      boxShadow: dotIdx === pathCardIndex ? '0 0 8px rgba(193,255,0,0.7)' : 'none',
                    }}
                  />
                ))}
              </div>
              <div className="w-16" />
            </div>

            {/* ── SLIDING: only title + visual move ── */}
            <div className="flex-1 min-h-0 relative" style={{ overflowX: 'clip' }}>
              <div
                className="flex h-full"
                style={{ transform: `translateX(-${pathCardIndex * 100}%)`, transition: 'transform 0.35s cubic-bezier(0.4,0,0.2,1)' }}
              >
                {pathCards.map((card) => (
                  <div key={card.id} className="w-full h-full flex-shrink-0 flex flex-col">

                    {/* Title */}
                    <div className="flex-shrink-0 text-center px-5 sm:px-6 mt-2">
                      <p
                        className="text-[9px] uppercase tracking-[4px] mb-1"
                        style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, color: 'rgba(148,163,184,0.55)' }}
                      >
                        CHOOSE YOUR PATH
                      </p>
                      <h2
                        className="leading-none uppercase"
                        style={{
                          fontFamily: "'Space Grotesk', sans-serif",
                          fontWeight: 700,
                          fontSize: 'clamp(44px, 11vw, 64px)',
                          letterSpacing: '-3px',
                          color: '#c1ff00',
                          textShadow: '0 0 40px rgba(193,255,0,0.3)',
                        }}
                      >
                        {card.title}
                      </h2>
                    </div>

                    {/* Spacer above visual */}
                    <div className="flex-1 min-h-0" />
                    {/* Visual — fixed height */}
                    {card.visual}
                    {/* Spacer below visual */}
                    <div className="flex-1 min-h-0" />

                  </div>
                ))}
              </div>
            </div>

            {/* ── STATIC: arrows + button — never move ── */}
            <div className="flex-shrink-0 relative z-20 flex items-center justify-center gap-6 pb-3">
              <button
                onClick={handlePathBack}
                disabled={pathCardIndex === 0}
                className="text-white disabled:opacity-20 transition-opacity active:scale-90"
              >
                <ChevronLeft className="h-8 w-8" strokeWidth={2.5} />
              </button>
              <button
                onClick={handlePathNext}
                disabled={pathCardIndex === totalCards - 1}
                className="text-white disabled:opacity-20 transition-opacity active:scale-90"
              >
                <ChevronRight className="h-8 w-8" strokeWidth={2.5} />
              </button>
            </div>

            <div
              className="flex-shrink-0 relative z-20 px-5 sm:px-6"
              style={{ paddingBottom: 'calc(max(2rem, env(safe-area-inset-bottom, 0px)) + 1rem)' }}
            >
              <button
                onClick={() => selectAndContinue(currentCard.id)}
                className="w-full py-4 rounded-2xl font-black uppercase transition-all active:scale-[0.98] hover:brightness-105"
                style={{
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: '14px',
                  letterSpacing: '2.8px',
                  background: '#c1ff00',
                  color: '#0a0f1c',
                  boxShadow: '0 20px 40px rgba(193,255,0,0.3)',
                }}
              >
                {currentCard.ctaLabel}
              </button>
            </div>

          </div>
        );
      }

      // ── STEP 9: PATH SETUP (varies by path) ────────────────────────────────
      case OnboardingStep.PathSetup:
        // Gamer: interest selection (up to 2)
        if (selectedPath === 'gamer') {
          const gamerOptions = [
            { id: "gamer", label: "Gamer", icon: Gamepad2 },
            { id: "content_creator", label: "Content Creator", icon: Video },
            { id: "professional_gamer", label: "Pro Gamer", icon: Trophy },
            { id: "viewer", label: "Viewer", icon: Eye },
            { id: "competitive", label: "Competitive", icon: Swords },
            { id: "casual", label: "Casual Gamer", icon: Coffee },
            { id: "retro", label: "Retro Gamer", icon: Star },
            { id: "collector", label: "Collector", icon: Gift },
          ];

          const toggleGamerInterest = (id: string) => {
            if (gamerInterests.includes(id)) {
              setGamerInterests(gamerInterests.filter(t => t !== id));
            } else if (gamerInterests.length < 2) {
              setGamerInterests([...gamerInterests, id]);
            } else {
              toast({ title: "Maximum reached", description: "Select up to 2 options. Deselect one first.", variant: "default", duration: 2000 });
            }
          };

          return (
            <div className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 overflow-y-auto">
                <h2 className="text-2xl font-bold text-white mb-1">Your Gamer Profile</h2>
                <p className="text-gray-400 mb-5">How would you describe yourself? Select up to 2.</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  {gamerOptions.map((opt) => {
                    const Icon = opt.icon;
                    const isSelected = gamerInterests.includes(opt.id);
                    const isLocked = !isSelected && gamerInterests.length >= 2;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => toggleGamerInterest(opt.id)}
                        className={`relative p-3 rounded-lg border-2 transition-all text-left select-none ${
                          isSelected ? "border-primary bg-primary shadow-lg shadow-primary/20 cursor-pointer"
                          : isLocked ? "border-[#1B2A33] bg-[#0B1218]/60 cursor-not-allowed opacity-40"
                          : "border-[#1B2A33] bg-[#0B1218] hover:border-primary/40 hover:bg-primary/5 cursor-pointer"
                        }`}
                      >
                        <div className="flex flex-col items-center text-center space-y-2">
                          <div className={`p-2.5 rounded-full ${isSelected ? "bg-black/20 text-[#051a08]" : "bg-[#1B2A33] text-gray-500"}`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <h3 className={`font-medium text-sm ${isSelected ? "text-[#051a08] font-semibold" : "text-gray-500"}`}>{opt.label}</h3>
                        </div>
                        {isSelected && (
                          <div className="absolute top-2 right-2 rounded-full bg-black/20 border border-black/30 p-0.5">
                            <Check className="h-3 w-3 text-[#051a08]" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
                <p className="text-sm text-gray-400 text-center">{gamerInterests.length}/2 selected</p>
              </div>
              <div className="flex flex-col gap-3 mt-4">
                <div className="flex gap-3">
                  <Button variant="outline" onClick={goToPrevStep}>Back</Button>
                  <Button onClick={goToNextStep} disabled={gamerInterests.length === 0} className="flex-1 bg-primary hover:bg-primary/90 text-[#071013] font-semibold">
                    Next <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
                <button onClick={goToNextStep} className="text-sm text-gray-500 hover:text-gray-300 transition-colors text-center py-1">Skip for now</button>
              </div>
            </div>
          );
        }

        // Streamer: platform setup
        if (selectedPath === 'streamer') {
          return (
            <div className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 overflow-y-auto space-y-4">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">Streamer Setup</h2>
                  <p className="text-gray-400 mb-5">Connect your streaming platforms. All fields except main platform are optional.</p>
                </div>

                <div className="space-y-3">
                  <div>
                    <Label className="text-white text-sm mb-1.5 block">Main Platform <span className="text-primary">*</span></Label>
                    <Select value={streamerData.mainPlatform} onValueChange={(v) => setStreamerData({ ...streamerData, mainPlatform: v })}>
                      <SelectTrigger className="bg-[#0B1218] border-[#1B2A33] text-white">
                        <SelectValue placeholder="Select your main platform" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0B1218] border-[#1B2A33]">
                        <SelectItem value="kick">Kick</SelectItem>
                        <SelectItem value="twitch">Twitch</SelectItem>
                        <SelectItem value="youtube">YouTube</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-gray-400 text-sm mb-1.5 block">Kick Username</Label>
                    <Input value={streamerData.kickUsername} onChange={(e) => setStreamerData({ ...streamerData, kickUsername: e.target.value })} placeholder="@yourname" className="bg-[#0B1218] border-[#1B2A33] text-white" />
                  </div>
                  <div>
                    <Label className="text-gray-400 text-sm mb-1.5 block">Twitch Username</Label>
                    <Input value={streamerData.twitchUsername} onChange={(e) => setStreamerData({ ...streamerData, twitchUsername: e.target.value })} placeholder="@yourname" className="bg-[#0B1218] border-[#1B2A33] text-white" />
                  </div>
                  <div>
                    <Label className="text-gray-400 text-sm mb-1.5 block">YouTube Username</Label>
                    <Input value={streamerData.youtubeUsername} onChange={(e) => setStreamerData({ ...streamerData, youtubeUsername: e.target.value })} placeholder="@yourname" className="bg-[#0B1218] border-[#1B2A33] text-white" />
                  </div>
                  <div>
                    <Label className="text-gray-400 text-sm mb-1.5 block">Main Game / Category</Label>
                    <Input value={streamerData.mainGame} onChange={(e) => setStreamerData({ ...streamerData, mainGame: e.target.value })} placeholder="e.g. Fortnite, Just Chatting" className="bg-[#0B1218] border-[#1B2A33] text-white" />
                  </div>
                  <div>
                    <Label className="text-gray-400 text-sm mb-1.5 block">Stream Frequency</Label>
                    <Select value={streamerData.streamFrequency} onValueChange={(v) => setStreamerData({ ...streamerData, streamFrequency: v })}>
                      <SelectTrigger className="bg-[#0B1218] border-[#1B2A33] text-white">
                        <SelectValue placeholder="How often do you stream?" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0B1218] border-[#1B2A33]">
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="3-5x">3–5× per week</SelectItem>
                        <SelectItem value="1-2x">1–2× per week</SelectItem>
                        <SelectItem value="less">Less often</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 mt-4">
                <div className="flex gap-3">
                  <Button variant="outline" onClick={goToPrevStep}>Back</Button>
                  <Button onClick={goToNextStep} disabled={!streamerData.mainPlatform} className="flex-1 bg-primary hover:bg-primary/90 text-[#071013] font-semibold">
                    Next <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
                <button onClick={goToNextStep} className="text-sm text-gray-500 hover:text-gray-300 transition-colors text-center py-1">Skip for now</button>
              </div>
            </div>
          );
        }

        // Indie Game: game details
        return (
          <div className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto space-y-3">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">Your Game</h2>
                <p className="text-gray-400 mb-4">Tell us about your indie game. Required fields are marked with <span className="text-primary">*</span></p>
              </div>

              <div>
                <Label className="text-white text-sm mb-1.5 block">Game Name <span className="text-primary">*</span></Label>
                <Input value={indieGameData.gameName} onChange={(e) => setIndieGameData({ ...indieGameData, gameName: e.target.value })} placeholder="Your game's name" className="bg-[#0B1218] border-[#1B2A33] text-white" />
              </div>
              <div>
                <Label className="text-gray-400 text-sm mb-1.5 block">Studio Name</Label>
                <Input value={indieGameData.studioName} onChange={(e) => setIndieGameData({ ...indieGameData, studioName: e.target.value })} placeholder="Studio or developer name" className="bg-[#0B1218] border-[#1B2A33] text-white" />
              </div>
              <div>
                <Label className="text-gray-400 text-sm mb-1.5 block">Genre</Label>
                <Input value={indieGameData.genre} onChange={(e) => setIndieGameData({ ...indieGameData, genre: e.target.value })} placeholder="e.g. Action RPG, Puzzle, Platformer" className="bg-[#0B1218] border-[#1B2A33] text-white" />
              </div>
              <div>
                <Label className="text-white text-sm mb-1.5 block">Release Status <span className="text-primary">*</span></Label>
                <Select value={indieGameData.releaseStatus} onValueChange={(v) => setIndieGameData({ ...indieGameData, releaseStatus: v })}>
                  <SelectTrigger className="bg-[#0B1218] border-[#1B2A33] text-white">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0B1218] border-[#1B2A33]">
                    <SelectItem value="released">Released</SelectItem>
                    <SelectItem value="early_access">Early Access</SelectItem>
                    <SelectItem value="beta">Beta</SelectItem>
                    <SelectItem value="coming_soon">Coming Soon</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-gray-400 text-sm mb-1.5 block">Steam Link</Label>
                <Input value={indieGameData.steamLink} onChange={(e) => setIndieGameData({ ...indieGameData, steamLink: e.target.value })} placeholder="https://store.steampowered.com/app/..." className="bg-[#0B1218] border-[#1B2A33] text-white" />
              </div>
              <div>
                <Label className="text-gray-400 text-sm mb-1.5 block">Epic Games Link</Label>
                <Input value={indieGameData.epicLink} onChange={(e) => setIndieGameData({ ...indieGameData, epicLink: e.target.value })} placeholder="https://store.epicgames.com/..." className="bg-[#0B1218] border-[#1B2A33] text-white" />
              </div>
              <div>
                <Label className="text-gray-400 text-sm mb-1.5 block">Website</Label>
                <Input value={indieGameData.websiteLink} onChange={(e) => setIndieGameData({ ...indieGameData, websiteLink: e.target.value })} placeholder="https://yourgame.com" className="bg-[#0B1218] border-[#1B2A33] text-white" />
              </div>
              <div>
                <Label className="text-gray-400 text-sm mb-1.5 block">Short Description</Label>
                <Textarea value={indieGameData.description} onChange={(e) => setIndieGameData({ ...indieGameData, description: e.target.value })} placeholder="A short description of your game..." className="bg-[#0B1218] border-[#1B2A33] text-white resize-none" rows={3} />
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <Button variant="outline" onClick={goToPrevStep}>Back</Button>
              <Button onClick={goToNextStep} disabled={!indieGameData.gameName.trim() || !indieGameData.releaseStatus} className="flex-1 bg-primary hover:bg-primary/90 text-[#071013] font-semibold">
                Next <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        );

      // ── STEP 10: WALLET / 100 GFT ──────────────────────────────────────────
      case OnboardingStep.Wallet:
        const isCreatingAnyWallet = isCreatingAutoWallet || isCreatingWallet;
        return (
          <div className="flex flex-col flex-1">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-2xl font-bold text-white">🎁 Claim Your 100 GFT Welcome Reward</h2>
            </div>
            <p className="text-gray-300 mb-5">Create your free Gamefolio Wallet during onboarding and receive a one-time bonus of 100 GFT.</p>

            {walletAddress ? (
              <>
                <Card className="bg-primary/10 border-primary/50 mb-6">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="p-3 rounded-full bg-primary text-white">
                        <Check className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-white mb-1">Reward Claimed!</h3>
                        <p className="text-sm text-gray-300">100 GFT has been added to your Gamefolio Wallet</p>
                      </div>
                    </div>
                    <div className="bg-gray-900/50 rounded-lg p-3">
                      <p className="text-xs text-gray-400 mb-1">Wallet Address</p>
                      <p className="text-sm text-white font-mono break-all">{walletAddress}</p>
                    </div>
                  </CardContent>
                </Card>
                <div className="flex gap-3 mt-auto">
                  <Button variant="outline" onClick={goToPrevStep}>Back</Button>
                  <Button onClick={goToNextStep} className="flex-1" data-testid="button-next-from-wallet">
                    Next <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </>
            ) : walletError ? (
              <>
                <Card className="bg-red-900/20 border-red-500/50 mb-6">
                  <CardContent className="p-6">
                    <div className="flex flex-col items-center text-center py-4">
                      <div className="p-3 rounded-full bg-red-500/20 text-red-400 mb-4"><span className="text-2xl">!</span></div>
                      <h3 className="font-semibold text-white mb-2">Wallet Creation Failed</h3>
                      <p className="text-sm text-gray-400 mb-4">{walletError}</p>
                      <Button onClick={handleRetryWalletCreation} className="bg-primary hover:bg-primary/90">Try Again</Button>
                    </div>
                  </CardContent>
                </Card>
                <div className="flex gap-3 mt-auto">
                  <Button variant="outline" onClick={goToPrevStep}>Back</Button>
                  <Button onClick={goToNextStep} variant="ghost" className="flex-1 text-gray-400 hover:text-white" data-testid="button-skip-wallet">Skip</Button>
                </div>
              </>
            ) : isCreatingAnyWallet ? (
              <>
                <Card className="bg-primary/5 border-primary/20 mb-6">
                  <CardContent className="p-6">
                    <div className="flex flex-col items-center text-center py-4">
                      <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
                      <h3 className="font-semibold text-white mb-2">Creating Your Gamefolio Wallet</h3>
                      <p className="text-sm text-gray-400">Setting up your wallet and claiming your 100 GFT reward...</p>
                    </div>
                  </CardContent>
                </Card>
                <div className="flex gap-3 mt-auto">
                  <Button variant="outline" onClick={goToPrevStep}>Back</Button>
                </div>
              </>
            ) : (
              <>
                <Card className="bg-primary/5 border-primary/20 mb-5">
                  <CardContent className="p-5">
                    <h3 className="font-semibold text-white mb-3 text-sm">What you get:</h3>
                    <ul className="space-y-2.5">
                      {["Receive 100 GFT instantly", "Access future creator rewards", "Participate in bounties and campaigns", "Store future Gamefolio rewards"].map((b, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <div className="p-1 rounded-full bg-primary/20 text-primary mt-0.5"><Check className="h-3 w-3" /></div>
                          <span className="text-sm text-gray-300">{b}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
                <div className="flex items-center gap-2 mb-5 px-3 py-2.5 rounded-lg bg-primary/10 border border-primary/30">
                  <span className="text-xl">🎁</span>
                  <p className="text-sm text-primary font-medium">One-time offer: <span className="font-bold">100 GFT welcome bonus</span></p>
                </div>
                <button onClick={handleCreateWalletClick} disabled={isCreatingAnyWallet} className="w-full py-4 px-5 bg-primary hover:bg-primary/90 active:scale-[0.99] rounded-xl transition-all text-center font-semibold text-white shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed" data-testid="button-create-wallet">
                  Create Wallet & Claim 100 GFT
                </button>
                <p className="text-xs text-gray-500 text-center mt-4 mb-5">100 GFT welcome bonus is only available during account setup.</p>
                <div className="flex gap-3 mt-auto">
                  <Button variant="outline" onClick={goToPrevStep}>Back</Button>
                  <Button onClick={goToNextStep} variant="ghost" className="flex-1 text-gray-400 hover:text-white" data-testid="button-skip-wallet">Skip</Button>
                </div>
              </>
            )}
          </div>
        );

      // ── STEP 10: PRO UPSELL (path-specific, at end of flow) ───────────────
      case OnboardingStep.ProUpsell: {
        const upsellConfig = {
          gamer: {
            titleA: 'GAMEFOLIO',  titleB: 'PRO',
            sub: 'Unlock more ways to grow, customise and earn.',
            emoji: '⚡',
            benefits: ['Access exclusive bounties', 'Earn GFT rewards', 'XP boosts', 'Premium profile customisation', 'Early feature access'],
            proLabel: 'View Gamefolio Pro',
          },
          streamer: {
            titleA: 'STREAMER',  titleB: 'PRO',
            sub: 'Grow your audience and turn streams into content.',
            emoji: '🎙️',
            benefits: ['Livestream featured on homepage', 'Access creator bounties', 'Stream challenges & rewards', 'Social media promotion', 'Kick/Twitch/YouTube integrations', 'Creator growth opportunities'],
            proLabel: 'View Streamer Pro',
          },
          indie: {
            titleA: 'INDIE',  titleB: 'PRO',
            sub: 'Reach players, creators and gaming communities.',
            emoji: '🕹️',
            benefits: ['Create an indie game profile', 'Add store links', 'Showcase clips, reels and screenshots', 'Launch creator bounties', 'Get featured on Gamefolio', 'Blog & content opportunities'],
            proLabel: 'View Indie Pro',
          },
        };
        const upsell = upsellConfig[selectedPath || 'gamer'];
        return (
          <div className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto">
              <div className="text-center mb-6">
                <div className="text-4xl mb-3">{upsell.emoji}</div>
                <h2 className="text-2xl font-black text-white mb-1 uppercase">
                  {upsell.titleA} <span className="text-primary">{upsell.titleB}</span>
                </h2>
                <p className="text-gray-400 text-sm">{upsell.sub}</p>
              </div>
              <Card className="bg-primary/5 border-primary/20 mb-5">
                <CardContent className="p-5">
                  <h3 className="font-semibold text-white mb-3 text-sm">What you get with Pro:</h3>
                  <ul className="space-y-2.5">
                    {upsell.benefits.map((benefit, i) => (
                      <li key={i} className="flex items-center gap-3">
                        <div className="p-1 rounded-full bg-primary/20 text-primary flex-shrink-0">
                          <Check className="h-3 w-3" />
                        </div>
                        <span className="text-sm text-gray-300">{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
            <div className="space-y-3 mt-auto">
              <Button className="w-full bg-primary hover:bg-primary/90 text-[#071013] font-bold py-5 rounded-xl">
                {upsell.proLabel}
              </Button>
              <Button variant="ghost" onClick={goToNextStep} className="w-full text-gray-400 hover:text-white py-3">
                Continue Free <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
              <Button variant="outline" onClick={goToPrevStep} className="w-full">
                Back
              </Button>
            </div>
          </div>
        );
      }

      // ── STEP 11: COMPLETE ──────────────────────────────────────────────────
      case OnboardingStep.Complete:
        const pathMessage = selectedPath === 'streamer'
          ? "Start by uploading your first stream clip or connecting your Kick/Twitch channel."
          : selectedPath === 'indie'
          ? "Complete your game profile and add your store links to get discovered."
          : "Start by uploading your first clip or screenshot to build your Gamefolio.";

        return (
          <div className="flex flex-col flex-1">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="h-20 w-20 rounded-full bg-primary flex items-center justify-center mb-5" style={{ boxShadow: '0 0 40px rgba(183,255,26,0.4)' }}>
                <Check className="h-10 w-10 text-[#071013]" />
              </div>
              <h2 className="text-2xl font-black text-white mb-2">You're all set!</h2>
              <p className="text-gray-300 mb-3">Your Gamefolio profile is ready to go.</p>
              <div className="px-4 py-3 rounded-xl bg-primary/10 border border-primary/20 text-sm text-gray-400 text-center max-w-xs">
                <span className="text-primary font-semibold">💡 Next step: </span>{pathMessage}
              </div>
            </div>
            <Button onClick={completeOnboarding} disabled={isLoading} className="w-full mt-auto bg-primary hover:bg-primary/90 text-[#071013] font-bold py-6 rounded-xl">
              {isLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Finalizing...</> : "Take me to Gamefolio 🎮"}
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  const isIntroStep = currentStep <= OnboardingStep.Intro3;

  return (
    <div
      className={`w-full mx-auto px-5 pt-8 sm:p-6 md:p-8 h-dvh sm:h-auto sm:min-h-0 sm:rounded-lg shadow-lg sm:border sm:border-primary/20 flex flex-col bg-[#071013]`}
      style={{ paddingBottom: 'calc(max(2.5rem, env(safe-area-inset-bottom, 0px)) + 0.5rem)' }}
    >
      <OnboardingStepIndicator currentStep={currentStep} isGoogleUser={isGoogleUser} selectedPath={selectedPath} />
      <div className={`flex-1 flex flex-col min-h-0 ${stepDirection === 'forward' ? 'ob-step-content-forward' : 'ob-step-content-back'}`} key={currentStep}>
        {renderStepContent()}
      </div>
    </div>
  );
}
