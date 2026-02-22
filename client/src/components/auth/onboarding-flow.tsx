import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Check, Gamepad2, Upload, Share2, Search, ArrowRight, Video, Trophy, Code, Eye, Coffee, Scroll, Loader2, Plus, User, Camera, HelpCircle, Info, Wallet, ZoomIn, Crop } from "lucide-react";
import { Game } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import TwitchGameSearch, { TwitchGame } from "@/components/games/TwitchGameSearch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import Cropper from "react-easy-crop";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { useWelcomePack } from "@/hooks/use-welcome-pack";
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
                  ? 'bg-green-500/20 border-2 border-green-500 ring-2 ring-green-500/50' 
                  : 'hover:bg-primary/20 border-2 border-transparent focus:ring-primary/50'
              }`}
            >
              <div className="relative w-full aspect-[3/4] mb-1.5 overflow-hidden rounded-md">
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
                    ? 'bg-green-500/30 opacity-100' 
                    : 'bg-black/50 opacity-0 group-hover:opacity-100'
                }`}>
                  {isSelected ? (
                    <Check className="h-6 w-6 text-green-500" />
                  ) : (
                    <Plus className="h-6 w-6 text-white" />
                  )}
                </div>
              </div>
              <span className={`text-xs text-center line-clamp-2 w-full leading-tight transition-colors ${
                isSelected 
                  ? 'text-green-500 font-semibold' 
                  : 'text-gray-300 group-hover:text-primary'
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
  Username = 1,
  Games = 2,
  Avatar = 3,
  UserType = 4,
  Wallet = 5,
  Complete = 6,
}

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

interface OnboardingStepIndicatorProps {
  currentStep: OnboardingStep;
  isGoogleUser: boolean;
}

function OnboardingStepIndicator({ currentStep, isGoogleUser }: OnboardingStepIndicatorProps) {
  const allSteps = [
    { id: OnboardingStep.Welcome, label: "Welcome" },
    { id: OnboardingStep.Username, label: "Username" },
    { id: OnboardingStep.Games, label: "Games" },
    { id: OnboardingStep.Avatar, label: "Profile" },
    { id: OnboardingStep.UserType, label: "User Type" },
    { id: OnboardingStep.Wallet, label: "Wallet" },
    { id: OnboardingStep.Complete, label: "Complete" },
  ];

  const steps = isGoogleUser ? allSteps : allSteps.filter(step => step.id !== OnboardingStep.Username);

  return (
    <div className="mb-8">
      <div className="flex items-center">
        {steps.map((step, index) => (
          <div key={step.id} className={`flex items-center ${index < steps.length - 1 ? 'flex-1' : ''}`}>
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-medium transition-colors border-2 ${
                currentStep > step.id
                  ? "bg-primary/20 border-primary text-primary"
                  : currentStep === step.id
                  ? "bg-primary border-primary text-white"
                  : "bg-gray-800 border-gray-600 text-gray-400"
              }`}
            >
              {currentStep > step.id ? <Check className="h-4 w-4" /> : index + 1}
            </div>
            {index < steps.length - 1 && (
              <div className="flex-1 h-0.5 mx-2 relative">
                <div className="absolute inset-0 bg-gray-700 rounded-full" />
                <div
                  className={`absolute inset-y-0 left-0 rounded-full transition-all duration-300 ${
                    currentStep > step.id ? "bg-primary w-full" : "bg-gray-700 w-0"
                  }`}
                />
              </div>
            )}
          </div>
        ))}
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
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(
    OnboardingStep.Welcome
  );
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { openWelcomePack, canClaimWelcomePack } = useWelcomePack();
  const { user } = useAuth();

  // Form state
  const [formUsername, setFormUsername] = useState(username.startsWith('temp_') ? '' : username);
  const [isGoogleUser] = useState(username.startsWith('temp_'));
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [selectedGames, setSelectedGames] = useState<Game[]>([]);
  const [selectedTwitchGames, setSelectedTwitchGames] = useState<TwitchGame[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [userTypes, setUserTypes] = useState<string[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [showCropModal, setShowCropModal] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string>('');
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  // Function to toggle user type selection
  const toggleUserType = (type: string) => {
    if (userTypes.includes(type)) {
      setUserTypes(userTypes.filter(t => t !== type));
    } else {
      setUserTypes([...userTypes, type]);
    }
  };
  
  const { walletAddress: sequenceWalletAddress, isReady: isWalletReady, isConnecting: isCreatingWallet, connect: connectWallet } = useWallet();
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  
  // Auto wallet creation (server-side, no OTP needed)
  const { 
    createWallet: createAutoWallet,
    isCreating: isCreatingAutoWallet, 
    error: walletError,
    walletAddress: autoWalletAddress
  } = useAutoWallet();
  const walletInitiatedRef = useRef(false);

  // Auto-skip username step for non-Google users
  useEffect(() => {
    if (currentStep === OnboardingStep.Username && !isGoogleUser) {
      setCurrentStep(OnboardingStep.Games);
    }
  }, [currentStep, isGoogleUser]);

  // Sync Sequence wallet address to local state with success toast
  useEffect(() => {
    if (isWalletReady && sequenceWalletAddress && !walletAddress) {
      setWalletAddress(sequenceWalletAddress);
      toast({
        title: "Wallet connected!",
        description: "Your Sequence wallet has been connected successfully",
        variant: "gamefolioSuccess",
      });
    }
  }, [isWalletReady, sequenceWalletAddress, walletAddress, toast]);

  // Load existing wallet from user profile when reaching wallet step
  useEffect(() => {
    if (currentStep === OnboardingStep.Wallet && !walletAddress && user?.walletAddress) {
      setWalletAddress(user.walletAddress);
    }
  }, [currentStep, walletAddress, user?.walletAddress]);

  // Sync auto wallet address when created
  useEffect(() => {
    if (autoWalletAddress && !walletAddress) {
      setWalletAddress(autoWalletAddress);
    }
  }, [autoWalletAddress, walletAddress]);

  // Handle wallet creation (called manually when user clicks button)
  const handleCreateWalletClick = async () => {
    if (!walletInitiatedRef.current && !isCreatingAutoWallet) {
      walletInitiatedRef.current = true;
      await createAutoWallet();
    }
  };

  // Retry wallet creation after error
  const handleRetryWalletCreation = async () => {
    walletInitiatedRef.current = false;
    await createAutoWallet();
  };

  // Connect wallet via Sequence
  const handleCreateWallet = () => {
    connectWallet();
  };


  // Load games using Twitch API
  const loadGames = async () => {
    setIsSearching(true);
    try {
      // Fetch top games from Twitch API
      const response = await apiRequest("GET", "/api/twitch/games/top");
      
      if (!response.ok) {
        throw new Error("Failed to load games from Twitch");
      }
      
      // Get results from Twitch API
      const twitchGames = await response.json();
      
      // Fallback to local trending games if needed
      if (!twitchGames || twitchGames.length === 0) {
        await loadFallbackGames();
        return;
      }
      
      // Convert Twitch games to our Game format for compatibility
      const convertedGames: Game[] = twitchGames.map((game: TwitchGame) => ({
        id: parseInt(game.id), // Using Twitch game ID as our ID
        name: game.name,
        imageUrl: game.box_art_url ? game.box_art_url.replace('{width}', '285').replace('{height}', '380') : null,
        twitchId: game.id,
        createdAt: new Date()
      }));
      
      setGames(convertedGames);
    } catch (error) {
      console.error("Error loading games:", error);
      toast({
        title: "Error",
        description: "Failed to load games from Twitch. Using local games instead.",
        variant: "gamefolioError",
      });
      
      await loadFallbackGames();
    } finally {
      setIsSearching(false);
    }
  };

  // Load fallback games from our database
  const loadFallbackGames = async () => {
    try {
      const fallbackResponse = await apiRequest("GET", "/api/games/trending");
      if (fallbackResponse.ok) {
        const localGames = await fallbackResponse.json();
        setGames(localGames);
      }
    } catch (fallbackError) {
      console.error("Fallback error:", fallbackError);
      toast({
        title: "Error",
        description: "Could not load any games. Please try again later.",
        variant: "gamefolioError",
      });
    }
  };

  // Search games using Twitch API
  const searchGames = async (query: string) => {
    if (!query.trim()) {
      loadGames();
      return;
    }

    setIsSearching(true);
    try {
      // Use Twitch API to search for games
      const response = await apiRequest("GET", `/api/twitch/games/search?query=${encodeURIComponent(query)}`);
      
      if (!response.ok) {
        throw new Error("Search failed");
      }
      
      const twitchGames = await response.json();
      
      // Convert Twitch games to our Game format for compatibility
      const convertedGames: Game[] = twitchGames.map((game: TwitchGame) => ({
        id: parseInt(game.id),
        name: game.name,
        imageUrl: game.box_art_url ? game.box_art_url.replace('{width}', '285').replace('{height}', '380') : null,
        twitchId: game.id,
        createdAt: new Date()
      }));
      
      setGames(convertedGames);
    } catch (error) {
      console.error("Twitch search error:", error);
      
      // Fallback to local search
      try {
        const fallbackResponse = await apiRequest("GET", `/api/search/games?q=${encodeURIComponent(query)}`);
        if (fallbackResponse.ok) {
          const localGames = await fallbackResponse.json();
          setGames(localGames);
        }
      } catch (fallbackError) {
        console.error("Fallback search error:", fallbackError);
        toast({
          title: "Search Failed",
          description: "Could not search for games. Please try again later.",
          variant: "gamefolioError",
        });
      }
    } finally {
      setIsSearching(false);
    }
  };
  
  // Handle Twitch game selection
  const handleTwitchGameSelect = (game: TwitchGame) => {
    // Convert Twitch game to our Game format
    const convertedGame: Game = {
      id: parseInt(game.id),
      name: game.name,
      imageUrl: game.box_art_url ? game.box_art_url.replace('{width}', '285').replace('{height}', '380') : null,
      twitchId: game.id,
      createdAt: new Date()
    };
    
    // Toggle selection
    toggleGameSelection(convertedGame);
  };

  // Toggle game selection
  const toggleGameSelection = (game: Game) => {
    if (selectedGames.some((g) => g.id === game.id)) {
      setSelectedGames(selectedGames.filter((g) => g.id !== game.id));
    } else {
      if (selectedGames.length < 5) {
        setSelectedGames([...selectedGames, game]);
      } else {
        toast({
          title: "Maximum Reached",
          description: "You can select up to 5 games",
          variant: "default",
        });
      }
    }
  };

  // Check username availability
  const checkUsernameAvailability = async (username: string) => {
    if (!username || username.length < 3) {
      setUsernameError("Username must be at least 3 characters long");
      return false;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setUsernameError("Username can only contain letters, numbers, and underscores");
      return false;
    }

    setIsCheckingUsername(true);
    setUsernameError(null);

    try {
      const response = await apiRequest("GET", `/api/auth/check-username?username=${encodeURIComponent(username)}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        setUsernameError(errorData.message || "Username is not available");
        return false;
      }

      return true;
    } catch (error) {
      setUsernameError("Unable to check username availability");
      return false;
    } finally {
      setIsCheckingUsername(false);
    }
  };

  // Go to next step with validation
  const goToNextStep = async () => {
    if (currentStep === OnboardingStep.Username && isGoogleUser) {
      // Validate username for Google users
      const isValid = await checkUsernameAvailability(formUsername);
      if (!isValid) {
        return; // Don't proceed if username is invalid
      }
    }

    if (currentStep < OnboardingStep.Complete) {
      setCurrentStep(currentStep + 1);
      
      // Load games when reaching the games step
      if (currentStep + 1 === OnboardingStep.Games) {
        loadGames();
      }
    }
  };

  // Go to previous step
  const goToPrevStep = () => {
    if (currentStep > OnboardingStep.Welcome) {
      let previousStep = currentStep - 1;
      
      // Skip username step for non-Google users when going back
      if (previousStep === OnboardingStep.Username && !isGoogleUser) {
        previousStep = OnboardingStep.Welcome;
      }
      
      setCurrentStep(previousStep);
    }
  };

  // Handle avatar file upload
  const handleAvatarUpload = async (file: File) => {
    setIsUploadingAvatar(true);
    
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      formData.append('userId', userId.toString());
      
      const response = await fetch('/api/upload/avatar', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload avatar');
      }
      
      const data = await response.json();
      setAvatarFile(file);
      
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      
      toast({
        title: "Avatar uploaded!",
        description: "Your profile picture has been updated.",
      });
    } catch (error) {
      console.error('Avatar upload error:', error);
      toast({
        title: "Upload failed",
        description: "Could not upload your avatar. Please try again.",
        variant: "gamefolioError",
      });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const onCropComplete = useCallback(
    (_: any, croppedPixels: { x: number; y: number; width: number; height: number }) => {
      setCroppedAreaPixels(croppedPixels);
    }, []
  );

  const applyCrop = async () => {
    if (!imageToCrop || !croppedAreaPixels) return;
    try {
      const croppedBlob = await getCroppedImg(imageToCrop, croppedAreaPixels);
      const croppedFile = new File([croppedBlob], 'avatar.jpg', { type: 'image/jpeg' });
      setAvatarUrl(URL.createObjectURL(croppedBlob));
      setAvatarFile(croppedFile);
      setShowCropModal(false);
      setImageToCrop('');
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      handleAvatarUpload(croppedFile);
    } catch (error) {
      console.error('Error cropping image:', error);
      toast({
        title: "Crop failed",
        description: "Failed to crop the image. Please try again.",
        variant: "gamefolioError",
      });
    }
  };

  // Handle file input change - opens crop modal
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const allowedTypes = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
        'image/gif', 'image/bmp', 'image/tiff', 'image/svg+xml',
        'image/avif', 'image/heic', 'image/heif'
      ];
      
      if (!allowedTypes.includes(file.type.toLowerCase())) {
        toast({
          title: "Invalid file type",
          description: "Please select a valid image file (JPEG, PNG, WebP, GIF, BMP, TIFF, SVG, AVIF, HEIC).",
          variant: "gamefolioError",
        });
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image smaller than 5MB.",
          variant: "gamefolioError",
        });
        return;
      }
      
      const imageUrl = URL.createObjectURL(file);
      setImageToCrop(imageUrl);
      setShowCropModal(true);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    }
    event.target.value = '';
  };


  // Complete onboarding
  const completeOnboarding = async () => {
    setIsLoading(true);
    
    try {
      // Simplified update process - focus on completing successfully
      // Update user profile with collected information
      const userData = {
        username: formUsername,
        displayName: formUsername,
        bio: "Just joined Gamefolio!",
        userType: userTypes.length > 0 ? userTypes.join(",") : "viewer"
      };

      console.log("Saving user onboarding data:", userData);

      // Update user profile using the authenticated API request
      await apiRequest("PATCH", `/api/users/${userId}`, userData);
      
      // Log status
      console.log("Profile updated successfully");
      
      // Handle game selection
      if (selectedGames.length > 0) {
        // Add each selected game to the database and then to favorites
        for (const selectedGame of selectedGames) {
          try {
            // First, add the Twitch game to our database
            const addGameResponse = await apiRequest("POST", "/api/twitch/games/add", {
              gameId: selectedGame.id.toString() // Ensure it's a string
            });
            
            if (addGameResponse.ok) {
              const gameData = await addGameResponse.json();
              
              // Then add to user's favorites
              await apiRequest("POST", `/api/users/${userId}/favorites`, {
                gameId: gameData.id
              });
              
              console.log(`Added game ${selectedGame.name} to favorites`);
            } else {
              console.log(`Failed to add game ${selectedGame.name} to database`);
            }
          } catch (error) {
            console.log(`Could not add game ${selectedGame.name} to favorites:`, error);
          }
        }
      }
      
      // Show success message
      toast({
        title: "Profile created!",
        description: "Your Gamefolio profile is ready to go.",
        variant: "gamefolioSuccess",
      });
      
      // Invalidate user data and games data in cache
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${userId}/games/favorites`] });
      queryClient.invalidateQueries({ queryKey: ["/api/user-game-favorites"] });
      
      // Also invalidate by username if we have it
      if (formUsername) {
        queryClient.invalidateQueries({ queryKey: [`/api/users/${formUsername}/games/favorites`] });
      }
      
      // Complete onboarding and navigate to homepage
      onComplete();
      
      // Wait a moment to ensure state updates are processed, then show welcome pack
      setTimeout(() => {
        setLocation("/");
        // Show welcome pack dialog if user hasn't claimed it yet
        if (canClaimWelcomePack) {
          setTimeout(() => {
            openWelcomePack();
          }, 500);
        }
      }, 300);
      
    } catch (error) {
      console.error("Onboarding completion error:", error);
      toast({
        title: "Error",
        description: "We couldn't complete your profile setup. Let's try again!",
        variant: "gamefolioError",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Conditionally render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case OnboardingStep.Welcome:
        return (
          <>
            <div className="flex flex-col h-full">
              <div className="flex flex-col md:grid md:grid-cols-2 md:gap-8 flex-1">
                {/* Left side - Full-height image card with overlay text */}
                <div className="hidden md:block">
                  <div className="rounded-2xl overflow-hidden border border-primary/30 relative h-full min-h-[420px] bg-gradient-to-b from-gray-800/40 to-gray-900/90">
                    <img 
                      src="/attached_assets/Gamefolio logo.png" 
                      alt="Gamefolio" 
                      className="w-full h-full object-cover absolute inset-0"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-6">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/20 border border-primary/40 text-primary text-xs font-medium mb-3">
                        <Gamepad2 className="h-3.5 w-3.5" />
                        Gaming Portfolio
                      </span>
                      <h2 className="text-3xl font-bold text-white leading-tight">
                        Welcome to <span className="text-primary">Gamefolio</span>
                      </h2>
                      <p className="text-gray-300 text-sm mt-1">
                        Elevate your gaming identity with premium features
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right side - Feature list */}
                <div className="flex flex-col">
                  {/* Mobile-only header */}
                  <div className="md:hidden mb-6">
                    <h2 className="text-2xl font-bold text-white mb-2">Welcome to <span className="text-primary">Gamefolio</span></h2>
                    <p className="text-gray-300">Your personal gaming portfolio, all in one place.</p>
                  </div>

                  <div className="space-y-5">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center flex-shrink-0">
                        <Gamepad2 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-[15px]">Build your gaming portfolio</h3>
                        <p className="text-sm text-gray-400 mt-0.5">Showcase your best clips, reels, screenshots</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center flex-shrink-0">
                        <Trophy className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-[15px]">Earn XP and level up</h3>
                        <p className="text-sm text-gray-400 mt-0.5">Climb leaderboards and unlock rewards as you engage</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center flex-shrink-0">
                        <Share2 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-[15px]">Connect and share</h3>
                        <p className="text-sm text-gray-400 mt-0.5">Follow gamers, share clips and grow your community</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center flex-shrink-0">
                        <Wallet className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-[15px]">Collect NFTs & GF Tokens</h3>
                        <p className="text-sm text-gray-400 mt-0.5">Mint unique NFTs and earn tokens in the Gamefolio economy</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <Button onClick={goToNextStep} className="w-full bg-primary hover:bg-primary/90 text-white text-base font-semibold py-6 mt-8 rounded-xl shadow-[0_0_20px_rgba(74,222,128,0.3)]">
                Get Started <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </div>
          </>
        );

      case OnboardingStep.Username:
        // Only show username step for Google users with temporary usernames
        if (!isGoogleUser) {
          // Skip to next step for non-Google users
          return null;
        }
        
        return (
          <>
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-2xl font-bold text-white">Choose Your Username</h2>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-5 w-5 text-gray-400 cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Your username will be visible on your profile and posts</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <p className="text-gray-300 mb-6">
              Your username is how others will find and mention you on Gamefolio
            </p>
            
            <div className="mb-6">
              <label htmlFor="username" className="block text-sm font-medium text-white mb-2">
                Username
              </label>
              <div className="relative">
                <Input
                  id="username"
                  type="text"
                  value={formUsername}
                  onChange={(e) => {
                    setFormUsername(e.target.value);
                    setUsernameError(null); // Clear error when user types
                  }}
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
              
              {usernameError && (
                <p className="text-red-400 text-sm mt-2">{usernameError}</p>
              )}
              
              <p className="text-gray-400 text-sm mt-2">
                Username must be at least 3 characters long and can only contain letters, numbers, and underscores
              </p>
            </div>
            
            <div className="flex gap-3">
              <Button variant="outline" onClick={goToPrevStep} className="border-border hover:bg-secondary">
                Back
              </Button>
              <Button
                onClick={goToNextStep}
                disabled={!formUsername || formUsername.length < 3 || isCheckingUsername || !!usernameError}
                className="flex-1 bg-primary hover:bg-primary/90 text-white"
              >
                {isCheckingUsername ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>Next <ArrowRight className="h-4 w-4 ml-2" /></>
                )}
              </Button>
            </div>
          </>
        );

      case OnboardingStep.Games:
        return (
          <>
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-2xl font-bold text-white">Choose Your Favorite Games</h2>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-5 w-5 text-gray-400 cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Games you select will help us curate your feed with relevant content</p>
                </TooltipContent>
              </Tooltip>
            </div>

            <div className="mb-6">
              <TwitchGameSearch
                onSelectGame={handleTwitchGameSelect}
                placeholder="Search for games..."
              />
              
              {/* Top trending games section */}
              <div className="mt-6 mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-lg font-semibold text-white">Top trending games</h3>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-4 w-4 text-gray-400 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Popular games on Twitch right now. Click to add them to your favorites.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <TrendingGamesGrid onSelectGame={handleTwitchGameSelect} selectedGames={selectedGames} />
              </div>
              
              {/* Show selected games */}
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
                      <div
                        key={game.id}
                        className="flex items-center gap-2 px-2 py-1.5 border border-primary/50 bg-primary/10 rounded-full"
                      >
                        <img
                          src={game.imageUrl || "https://placehold.co/24x24?text=G"}
                          alt={game.name}
                          className="w-6 h-6 object-cover rounded-full flex-shrink-0"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "https://placehold.co/24x24?text=G";
                          }}
                        />
                        <span className="text-sm text-white whitespace-nowrap">{game.name}</span>
                        <button
                          onClick={() => toggleGameSelection(game)}
                          className="w-5 h-5 flex items-center justify-center rounded-full bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white text-xs"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="flex items-center gap-2 mt-4">
                  <p className="text-sm text-gray-400">
                    Selected {selectedGames.length}/5 games
                  </p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-3 w-3 text-gray-500 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>You can always change your favorite games later in your profile settings</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3 mt-8">
              <Button variant="outline" onClick={goToPrevStep} className="border-border hover:bg-secondary">
                Back
              </Button>
              <Button 
                onClick={goToNextStep}
                disabled={selectedGames.length === 0}
                className="flex-1 bg-primary hover:bg-primary/90 text-white"
              >
                Next <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </>
        );

      case OnboardingStep.Avatar:
        return (
          <>
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-2xl font-bold text-white">Profile Picture</h2>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-5 w-5 text-gray-400 cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Your avatar appears on your profile and next to your posts</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <p className="text-gray-300 mb-6">
              Upload a profile picture that represents you
            </p>
            
            <div className="mb-6 flex flex-col items-center">
              <div className="mb-4 h-32 w-32 overflow-hidden rounded-full border-2 border-dashed border-gray-600 flex items-center justify-center relative group cursor-pointer"
                   onClick={() => document.getElementById('avatar-upload')?.click()}>
                {avatarUrl ? (
                  <>
                    <img 
                      src={avatarUrl} 
                      alt="Avatar preview" 
                      className="h-full w-full object-cover" 
                    />
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
              
              <input
                id="avatar-upload"
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp,image/gif,image/bmp,image/tiff,image/svg+xml,image/avif,image/heic,image/heif"
                onChange={handleFileSelect}
                className="hidden"
                disabled={isUploadingAvatar}
              />
              
              <p className="text-sm text-gray-400 mb-4 text-center">
                Upload a square image of at least 200x200 pixels (max 5MB)
                <br />
                Supported formats: JPEG, PNG, WebP, GIF, BMP, TIFF, SVG, AVIF, HEIC
              </p>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => document.getElementById('avatar-upload')?.click()}
                  disabled={isUploadingAvatar}
                  className="mb-2"
                >
                  {isUploadingAvatar ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      {avatarUrl ? 'Change Photo' : 'Upload Photo'}
                    </>
                  )}
                </Button>
                
                {avatarUrl && (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setAvatarUrl(null);
                      setAvatarFile(null);
                    }}
                    className="text-sm"
                    disabled={isUploadingAvatar}
                  >
                    Remove
                  </Button>
                )}
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button variant="outline" onClick={goToPrevStep} className="border-border hover:bg-secondary">
                Back
              </Button>
              <Button
                onClick={goToNextStep}
                disabled={isUploadingAvatar}
                className="flex-1 bg-primary hover:bg-primary/90 text-white"
              >
                {avatarUrl ? (
                  <>Next <ArrowRight className="h-4 w-4 ml-2" /></>
                ) : (
                  <span className="text-white">Skip for now</span>
                )}
              </Button>
            </div>

            <Dialog open={showCropModal} onOpenChange={setShowCropModal}>
              <DialogContent className="sm:max-w-lg max-w-[95vw] max-h-[90vh] bg-slate-900 border-slate-700 overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-white flex items-center gap-2">
                    <Crop className="h-5 w-5" />
                    Crop Profile Picture
                  </DialogTitle>
                  <DialogDescription className="text-slate-400">
                    Drag to reposition and use the slider to zoom in or out
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div className="relative h-64 sm:h-80 w-full bg-slate-800 rounded-lg overflow-hidden touch-none">
                    {imageToCrop && (
                      <Cropper
                        image={imageToCrop}
                        crop={crop}
                        zoom={zoom}
                        aspect={1}
                        cropShape="round"
                        showGrid={false}
                        onCropChange={setCrop}
                        onCropComplete={onCropComplete}
                        onZoomChange={setZoom}
                        objectFit="contain"
                      />
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-white flex items-center gap-2">
                        <ZoomIn className="h-4 w-4" />
                        Zoom
                      </Label>
                      <span className="text-sm text-slate-400">{Math.round(zoom * 100)}%</span>
                    </div>
                    <Slider
                      value={[zoom]}
                      min={1}
                      max={3}
                      step={0.1}
                      onValueChange={([value]) => setZoom(value)}
                      className="w-full"
                    />
                  </div>
                </div>

                <DialogFooter className="gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowCropModal(false);
                      setImageToCrop('');
                      setCrop({ x: 0, y: 0 });
                      setZoom(1);
                    }}
                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={applyCrop}
                    className="bg-primary hover:bg-primary/90"
                  >
                    Apply Crop
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        );

      case OnboardingStep.UserType:
        const toggleUserType = (typeId: string) => {
          if (userTypes.includes(typeId)) {
            setUserTypes(userTypes.filter(t => t !== typeId));
          } else if (userTypes.length < 2) {
            setUserTypes([...userTypes, typeId]);
          }
        };
        
        return (
          <>
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-2xl font-bold text-white">What type of user are you?</h2>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-5 w-5 text-gray-400 cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>This helps us show you content and features most relevant to your interests</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <p className="text-gray-300 mb-6">
              Select up to 2 that best describe you - this helps us customize your experience on Gamefolio
            </p>
            
            <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                {
                  id: "streamer",
                  label: "Streamer",
                  icon: Video,
                },
                {
                  id: "gamer",
                  label: "Gamer",
                  icon: Gamepad2,
                },
                {
                  id: "professional_gamer",
                  label: "Pro Gamer",
                  icon: Trophy,
                },
                {
                  id: "content_creator",
                  label: "Content Creator",
                  icon: Upload,
                },
                {
                  id: "indie_developer",
                  label: "Indie Developer",
                  icon: Code,
                },
                {
                  id: "viewer",
                  label: "Viewer",
                  icon: Eye,
                },
                {
                  id: "filthy_casual",
                  label: "Filthy Casual",
                  icon: Coffee,
                },
                {
                  id: "doom_scroller",
                  label: "Doom Scroller",
                  icon: Scroll,
                },
              ].map((type) => {
                const IconComponent = type.icon;
                const isSelected = userTypes.includes(type.id);
                const isDisabled = !isSelected && userTypes.length >= 2;
                
                return (
                  <div
                    key={type.id}
                    onClick={() => !isDisabled && toggleUserType(type.id)}
                    className={`relative p-3 sm:p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      isDisabled ? "opacity-50 cursor-not-allowed" : "hover:scale-105"
                    } ${
                      isSelected
                        ? "border-primary bg-primary/10 shadow-lg shadow-primary/20"
                        : "border-gray-700 hover:border-primary/50 hover:bg-primary/5"
                    }`}
                  >
                    <div className="flex flex-col items-center text-center space-y-2">
                      <div className={`p-2.5 rounded-full ${
                        isSelected 
                          ? "bg-primary text-white" 
                          : "bg-gray-700 text-gray-300"
                      }`}>
                        <IconComponent className="h-5 w-5" />
                      </div>
                      <h3 className="font-medium text-white text-sm">{type.label}</h3>
                    </div>
                    {isSelected && (
                      <div className="absolute top-2 right-2 rounded-full bg-primary p-1">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            <p className="text-sm text-gray-400 text-center mb-4">
              {userTypes.length}/2 selected
            </p>
            
            <div className="flex gap-3">
              <Button variant="outline" onClick={goToPrevStep}>
                Back
              </Button>
              <Button
                onClick={goToNextStep}
                disabled={userTypes.length === 0}
                className="flex-1"
              >
                Next
              </Button>
            </div>
          </>
        );

      case OnboardingStep.Wallet:
        const isCreatingAnyWallet = isCreatingAutoWallet || isCreatingWallet;
        
        return (
          <>
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-2xl font-bold text-white">Your Wallet</h2>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-5 w-5 text-gray-400 cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Your secure blockchain wallet for NFTs and rewards</p>
                </TooltipContent>
              </Tooltip>
            </div>
            
            {walletAddress ? (
              <div className="mb-6">
                <Card className="bg-primary/10 border-primary/50">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="p-3 rounded-full bg-primary text-white">
                        <Check className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-white mb-1">Wallet Created!</h3>
                        <p className="text-sm text-gray-300">Your blockchain wallet is ready</p>
                      </div>
                    </div>
                    <div className="bg-gray-900/50 rounded-lg p-3">
                      <p className="text-xs text-gray-400 mb-1">Wallet Address</p>
                      <p className="text-sm text-white font-mono break-all">{walletAddress}</p>
                    </div>
                  </CardContent>
                </Card>
                
                <div className="flex gap-3 mt-6">
                  <Button variant="outline" onClick={goToPrevStep}>
                    Back
                  </Button>
                  <Button
                    onClick={goToNextStep}
                    className="flex-1"
                    data-testid="button-next-from-wallet"
                  >
                    Next <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            ) : walletError ? (
              <div className="mb-6">
                <Card className="bg-red-900/20 border-red-500/50">
                  <CardContent className="p-6">
                    <div className="flex flex-col items-center text-center py-4">
                      <div className="p-3 rounded-full bg-red-500/20 text-red-400 mb-4">
                        <span className="text-2xl">!</span>
                      </div>
                      <h3 className="font-semibold text-white mb-2">Wallet Creation Failed</h3>
                      <p className="text-sm text-gray-400 mb-4">
                        {walletError}
                      </p>
                      <Button
                        onClick={handleRetryWalletCreation}
                        className="bg-primary hover:bg-primary/90"
                      >
                        Try Again
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                
                <Button
                  onClick={goToNextStep}
                  variant="ghost"
                  className="w-full mt-4 text-gray-400 hover:text-white"
                  data-testid="button-skip-wallet"
                >
                  Skip for now
                </Button>
              </div>
            ) : isCreatingAnyWallet ? (
              <div className="mb-6">
                <Card className="bg-gray-800/50 border-gray-700">
                  <CardContent className="p-6">
                    <div className="flex flex-col items-center text-center py-4">
                      <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
                      <h3 className="font-semibold text-white mb-2">Creating Your Wallet</h3>
                      <p className="text-sm text-gray-400">
                        Setting up your secure blockchain wallet...
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="mb-6">
                <p className="text-gray-300 mb-6">
                  Get a blockchain wallet to store GF Tokens, collect NFTs, and unlock exclusive features.
                </p>
                
                <Button
                  onClick={handleCreateWalletClick}
                  disabled={isCreatingAnyWallet}
                  className="w-full h-auto py-4 px-6 bg-primary/15 border border-primary/30 hover:bg-primary/25 text-white"
                  data-testid="button-create-wallet"
                >
                  <div className="flex items-start gap-3 text-left w-full">
                    <Wallet className="h-5 w-5 mt-0.5 flex-shrink-0 text-primary" />
                    <div>
                      <div className="font-semibold mb-1">Create Wallet</div>
                      <div className="text-sm text-gray-400 font-normal">
                        Get a secure blockchain wallet for NFTs and rewards
                      </div>
                    </div>
                  </div>
                </Button>

                <div className="flex gap-3 mt-8">
                  <Button variant="outline" onClick={goToPrevStep} className="border-border hover:bg-secondary">
                    Back
                  </Button>
                  <Button
                    onClick={goToNextStep}
                    className="flex-1 bg-primary hover:bg-primary/90 text-white"
                    data-testid="button-skip-wallet"
                  >
                    <span>Skip for now</span>
                  </Button>
                </div>
              </div>
            )}
          </>
        );

      case OnboardingStep.Complete:
        return (
          <>
            <div className="flex flex-col items-center text-center mb-6">
              <div className="h-16 w-16 rounded-full bg-primary flex items-center justify-center mb-4">
                <Check className="h-8 w-8 text-white" />
              </div>
              
              <h2 className="text-2xl font-bold text-white mb-2">You're all set!</h2>
              <p className="text-gray-300">
                Your profile has been created and you're ready to start exploring Gamefolio!
              </p>
            </div>
            
            <Button
              onClick={completeOnboarding}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? "Finalizing..." : "Take me to Gamefolio"}
            </Button>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div className="w-full mx-auto px-5 pt-8 pb-6 sm:p-6 md:p-8 min-h-screen sm:min-h-0 bg-gray-900 sm:rounded-lg shadow-lg flex flex-col">
      <OnboardingStepIndicator currentStep={currentStep} isGoogleUser={isGoogleUser} />
      {renderStepContent()}
    </div>
  );
}