import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Progress } from "@/components/ui/progress";
import { Check, Gamepad2, Upload, Share2, Search, ArrowRight, Video, Trophy, Code, Eye, Coffee, Scroll, Calendar, Loader2, Plus, User, Camera, HelpCircle, Info, Wallet } from "lucide-react";
import { Game } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import TwitchGameSearch, { TwitchGame } from "@/components/games/TwitchGameSearch";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

// Component to display trending games in a grid
interface TrendingGamesGridProps {
  onSelectGame: (game: TwitchGame) => void;
  selectedGames: Game[];
}

function TrendingGamesGrid({ onSelectGame, selectedGames }: TrendingGamesGridProps) {
  const { data: trendingGames, isLoading } = useQuery<TwitchGame[]>({
    queryKey: ["/api/twitch/games/top"],
    queryFn: async () => {
      const response = await fetch("/api/twitch/games/top?limit=15");
      if (!response.ok) throw new Error("Failed to fetch trending games");
      return await response.json();
    }
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {Array(15).fill(0).map((_, index) => (
          <div key={index} className="flex flex-col items-center">
            <Skeleton className="h-24 w-24 rounded-lg mb-2" />
            <Skeleton className="h-4 w-20" />
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
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {trendingGames.map((game) => {
        const isSelected = selectedGames.some(g => g.id === parseInt(game.id));
        
        return (
          <button
            key={game.id}
            onClick={() => onSelectGame(game)}
            className={`group flex flex-col items-center p-2 rounded-lg transition-all focus:outline-none focus:ring-2 ${
              isSelected 
                ? 'bg-green-500/20 border-2 border-green-500 ring-2 ring-green-500/50' 
                : 'hover:bg-primary/20 border-2 border-transparent focus:ring-primary/50'
            }`}
          >
            <div className="relative h-20 w-20 mb-2 overflow-hidden rounded-md">
              <img
                src={game.box_art_url ? game.box_art_url.replace('{width}', '200').replace('{height}', '200') : "https://placehold.co/80x80?text=Game"}
                alt={game.name}
                className="h-full w-full object-cover transition-transform group-hover:scale-110"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://placehold.co/80x80?text=Game";
                }}
              />
              <div className={`absolute inset-0 flex items-center justify-center transition-opacity ${
                isSelected 
                  ? 'bg-green-500/30 opacity-100' 
                  : 'bg-black/50 opacity-0 group-hover:opacity-100'
              }`}>
                {isSelected ? (
                  <Check className="h-8 w-8 text-green-500" />
                ) : (
                  <Plus className="h-8 w-8 text-white" />
                )}
              </div>
            </div>
            <span className={`text-xs text-center line-clamp-2 transition-colors ${
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
  );
}

// Onboarding steps
enum OnboardingStep {
  Welcome = 0,
  Username = 1,
  Games = 2,
  Avatar = 3,
  UserType = 4,
  Age = 5,
  Wallet = 6,
  Complete = 7,
}

interface OnboardingStepIndicatorProps {
  currentStep: OnboardingStep;
  isGoogleUser: boolean;
}

function OnboardingStepIndicator({ currentStep, isGoogleUser }: OnboardingStepIndicatorProps) {
  const allSteps = [
    { id: OnboardingStep.Welcome, label: "Welcome" },
    { id: OnboardingStep.Username, label: "Username" },
    { id: OnboardingStep.Games, label: "Games" },
    { id: OnboardingStep.Avatar, label: "Avatar" },
    { id: OnboardingStep.UserType, label: "User Type" },
    { id: OnboardingStep.Age, label: "Age" },
    { id: OnboardingStep.Wallet, label: "Wallet" },
    { id: OnboardingStep.Complete, label: "Complete" },
  ];

  // Filter out Username step for non-Google users
  const steps = isGoogleUser ? allSteps : allSteps.filter(step => step.id !== OnboardingStep.Username);

  const getProgressValue = () => {
    const stepPercentage = 100 / (steps.length - 1);
    return Math.min(currentStep * stepPercentage, 100);
  };

  return (
    <div className="mb-8">
      <Progress value={getProgressValue()} className="h-2 mb-4" />
      <div className="flex justify-between">
        {steps.map((step) => (
          <div key={step.id} className="flex flex-col items-center">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium ${
                currentStep > step.id
                  ? "bg-primary/20 text-primary"
                  : currentStep === step.id
                  ? "bg-primary text-white"
                  : "bg-gray-700 text-gray-400"
              }`}
            >
              {currentStep > step.id ? <Check className="h-4 w-4" /> : step.id + 1}
            </div>
            <span
              className={`mt-1 text-xs ${
                currentStep >= step.id ? "text-white" : "text-gray-400"
              }`}
            >
              {step.label}
            </span>
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
  const [userTypes, setUserTypes] = useState<("streamer" | "gamer" | "professional_gamer" | "content_creator" | "indie_developer" | "filthy_casual" | "viewer" | "doom_scroller")[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [ageRange, setAgeRange] = useState<"13-17" | "18-24" | "25-34" | "35-44" | "45-54" | "55+" | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [showWalletInput, setShowWalletInput] = useState(false);
  const [manualWalletAddress, setManualWalletAddress] = useState("");
  const [isCreatingWallet, setIsCreatingWallet] = useState(false);
  const [isSavingWallet, setIsSavingWallet] = useState(false);

  // Auto-skip username step for non-Google users
  useEffect(() => {
    if (currentStep === OnboardingStep.Username && !isGoogleUser) {
      setCurrentStep(OnboardingStep.Games);
    }
  }, [currentStep, isGoogleUser]);

  // Load existing wallet when reaching wallet step
  useEffect(() => {
    const loadExistingWallet = async () => {
      if (currentStep === OnboardingStep.Wallet && !walletAddress) {
        try {
          const response = await fetch('/api/wallet/info', {
            credentials: 'include',
          });
          
          if (response.ok) {
            const walletData = await response.json();
            setWalletAddress(walletData.address);
          }
        } catch (error) {
          console.log('No existing wallet found');
        }
      }
    };
    
    loadExistingWallet();
  }, [currentStep, walletAddress]);

  // Get or create wallet via Crossmint API
  const handleCreateWallet = async () => {
    setIsCreatingWallet(true);
    
    try {
      const response = await fetch('/api/wallet/create', {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to connect wallet');
      }

      const walletData = await response.json();

      if (walletData.address) {
        setWalletAddress(walletData.address);
        
        // Use the isExisting flag from the API response
        const isExisting = walletData.isExisting || false;
        
        toast({
          title: isExisting ? "Wallet connected!" : "Wallet created!",
          description: isExisting 
            ? "Connected to your existing Crossmint wallet" 
            : "Your new Crossmint wallet has been created successfully",
          variant: "gamefolioSuccess",
        });
      } else {
        throw new Error('No wallet address received');
      }
    } catch (error: any) {
      console.error('Failed to create wallet:', error);
      toast({
        title: "Failed to connect wallet",
        description: error.message || "Please try again later",
        variant: "gamefolioError",
      });
    } finally {
      setIsCreatingWallet(false);
    }
  };

  // Save manual wallet address
  const handleSaveManualWallet = async () => {
    if (!manualWalletAddress.trim()) {
      toast({
        title: "Wallet address required",
        description: "Please enter a valid wallet address",
        variant: "gamefolioError",
      });
      return;
    }

    // Basic validation for Ethereum-style addresses
    if (!/^0x[a-fA-F0-9]{40}$/.test(manualWalletAddress.trim())) {
      toast({
        title: "Invalid wallet address",
        description: "Please enter a valid Ethereum wallet address (starts with 0x)",
        variant: "gamefolioError",
      });
      return;
    }

    setIsSavingWallet(true);

    try {
      const response = await fetch('/api/wallet/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          walletAddress: manualWalletAddress.trim(),
          walletChain: 'polygon'
        })
      });

      if (response.ok) {
        setWalletAddress(manualWalletAddress.trim());
        setShowWalletInput(false);
        
        toast({
          title: "Wallet saved!",
          description: "Your wallet address has been saved successfully",
          variant: "gamefolioSuccess",
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save wallet');
      }
    } catch (error: any) {
      console.error('Failed to save wallet:', error);
      toast({
        title: "Failed to save wallet",
        description: error.message || "Please try again later",
        variant: "gamefolioError",
      });
    } finally {
      setIsSavingWallet(false);
    }
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
      
      const result = await response.json();
      setAvatarUrl(result.avatarUrl);
      setAvatarFile(file);
      
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

  // Handle file input change
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type - support all major image formats
      const allowedTypes = [
        'image/jpeg',
        'image/jpg', 
        'image/png',
        'image/webp',
        'image/gif',
        'image/bmp',
        'image/tiff',
        'image/svg+xml',
        'image/avif',
        'image/heic',
        'image/heif'
      ];
      
      if (!allowedTypes.includes(file.type.toLowerCase())) {
        toast({
          title: "Invalid file type",
          description: "Please select a valid image file (JPEG, PNG, WebP, GIF, BMP, TIFF, SVG, AVIF, HEIC).",
          variant: "gamefolioError",
        });
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image smaller than 5MB.",
          variant: "gamefolioError",
        });
        return;
      }
      
      handleAvatarUpload(file);
    }
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
        // Store user types as comma-separated string for now
        userType: userTypes.length > 0 ? userTypes.join(",") : "viewer",
        ageRange: ageRange
      };
      
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
      
      // Wait a moment to ensure state updates are processed
      setTimeout(() => {
        setLocation("/");
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
            {/* Example app image */}
            <div className="mb-6 overflow-hidden rounded-lg border border-border">
              <img 
                src="/uploads/background-preview.jpg" 
                alt="Gamefolio Preview" 
                className="w-full h-auto"
              />
            </div>

            <h2 className="text-2xl font-bold text-white mb-4">Welcome to Gamefolio!</h2>
            <p className="text-gray-300 mb-6">
              Upload your BEST gaming clips here and showcase them to your friends. 
              You can also upload any clips too if you want a place to store and showcase.
            </p>
            
            <div className="mb-8">
              <h3 className="text-xl font-bold text-white mb-4">How does it work?</h3>
              
              {/* Step by step process with icons */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-2">
                    <Gamepad2 className="h-6 w-6 text-primary" />
                  </div>
                  <p className="text-sm text-gray-300">Source your clips from your favourite games</p>
                </div>
                
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-2">
                    <Upload className="h-6 w-6 text-primary" />
                  </div>
                  <p className="text-sm text-gray-300">Upload your clips</p>
                </div>
                
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-2">
                    <Share2 className="h-6 w-6 text-primary" />
                  </div>
                  <p className="text-sm text-gray-300">Share online</p>
                </div>
              </div>
              
              <Card className="bg-secondary/50 border-border mb-4">
                <CardContent className="p-4 flex items-center gap-3">
                  <Search className="h-5 w-5 text-primary flex-shrink-0" />
                  <p className="text-sm text-gray-300">
                    Not sure what to upload? Check out our{" "}
                    <a 
                      href="https://gamefolio.com/games" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-primary font-medium hover:underline"
                    >
                      Explore
                    </a>{" "}
                    page to see what others are uploading
                  </p>
                </CardContent>
              </Card>
              
              <Card className="bg-secondary/50 border-border mb-4">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-5 w-5 flex-shrink-0 flex items-center justify-center">
                    <span className="text-primary text-lg">👋</span>
                  </div>
                  <div className="text-sm text-gray-300">
                    <p className="mb-2">Want to keep in touch with us? Check us out on Socials and read our Blog!</p>
                    <div className="flex gap-4">
                      <a 
                        href="https://www.gamefolio.com/contact" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-primary font-medium hover:underline"
                      >
                        Socials
                      </a>
                      <a 
                        href="https://www.gamefolio.com/blog" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-primary font-medium hover:underline"
                      >
                        Blog
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <Button onClick={goToNextStep} className="w-full bg-primary hover:bg-primary/90 text-white">
              Get Started <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
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
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-2xl font-bold text-white">Select Your Favorite Games</h2>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-5 w-5 text-gray-400 cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Games you select will help us curate your feed with relevant content</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <p className="text-gray-300 mb-6">
              Choose up to 5 games you love to play or watch
            </p>
            
            <div className="mb-6">
              {/* Using the Twitch Game Search component */}
              <h3 className="text-lg font-semibold text-white mb-2">Search for games</h3>
              
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium text-white">Search for games</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-4 w-4 text-gray-400 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Type to search for any game. We pull from a large game database.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <TwitchGameSearch
                  onSelectGame={handleTwitchGameSelect}
                  placeholder="Search for games..."
                />
              </div>
              
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
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {selectedGames.map((game) => (
                      <div
                        key={game.id}
                        className="relative group p-2 border border-primary/50 bg-primary/10 rounded-md"
                      >
                        <div className="flex items-center gap-2">
                          <img
                            src={game.imageUrl || "https://placehold.co/40x40?text=Game"}
                            alt={game.name}
                            className="w-10 h-10 object-cover rounded flex-shrink-0"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "https://placehold.co/40x40?text=Game";
                            }}
                          />
                          <span className="text-sm text-white truncate flex-1">{game.name}</span>
                          
                          {/* Remove button */}
                          <button
                            onClick={() => toggleGameSelection(game)}
                            className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white"
                          >
                            ×
                          </button>
                        </div>
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
              <h2 className="text-2xl font-bold text-white">Upload Your Avatar</h2>
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
                  "Skip for now"
                )}
              </Button>
            </div>
          </>
        );

      case OnboardingStep.UserType:
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
              Select all that apply - this helps us customize your experience on Gamefolio
            </p>
            
            <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                {
                  id: "streamer",
                  label: "Streamer",
                  description: "I stream games live to audiences",
                  icon: Video,
                  tooltip: "Content creators who broadcast live gameplay",
                },
                {
                  id: "gamer",
                  label: "Gamer",
                  description: "I love playing games casually",
                  icon: Gamepad2,
                },
                {
                  id: "professional_gamer",
                  label: "Professional Gamer",
                  description: "I compete in esports or tournaments",
                  icon: Trophy,
                },
                {
                  id: "content_creator",
                  label: "Content Creator",
                  description: "I create gaming videos and content",
                  icon: Upload,
                },
                {
                  id: "indie_developer",
                  label: "Indie Developer",
                  description: "I develop games independently",
                  icon: Code,
                },
                {
                  id: "viewer",
                  label: "Viewer",
                  description: "I mostly watch gaming content",
                  icon: Eye,
                },
                {
                  id: "filthy_casual",
                  label: "Filthy Casual",
                  description: "I play games when I have time",
                  icon: Coffee,
                },
                {
                  id: "doom_scroller",
                  label: "Doom Scroller",
                  description: "I watch clips all day long",
                  icon: Scroll,
                },
              ].map((type) => {
                const IconComponent = type.icon;
                const isSelected = userTypes.includes(type.id as any);
                
                return (
                  <div
                    key={type.id}
                    onClick={() => {
                      const typeId = type.id as any;
                      if (userTypes.includes(typeId)) {
                        setUserTypes(userTypes.filter(t => t !== typeId));
                      } else {
                        setUserTypes([...userTypes, typeId]);
                      }
                    }}
                    className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all hover:scale-105 ${
                      isSelected
                        ? "border-primary bg-primary/10 shadow-lg shadow-primary/20"
                        : "border-gray-700 hover:border-primary/50 hover:bg-primary/5"
                    }`}
                  >
                    <div className="flex flex-col items-center text-center space-y-3">
                      <div className={`p-3 rounded-full ${
                        isSelected 
                          ? "bg-primary text-white" 
                          : "bg-gray-700 text-gray-300"
                      }`}>
                        <IconComponent className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-medium text-white mb-1">{type.label}</h3>
                        <p className="text-xs text-gray-400 leading-tight">
                          {type.description}
                        </p>
                      </div>
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

      case OnboardingStep.Age:
        const ageRanges = [
          {
            id: "13-17",
            label: "13-17",
            description: "Teen gamer",
          },
          {
            id: "18-24",
            label: "18-24",
            description: "Young adult",
          },
          {
            id: "25-34",
            label: "25-34",
            description: "Young professional",
          },
          {
            id: "35-44",
            label: "35-44",
            description: "Experienced gamer",
          },
          {
            id: "45-54",
            label: "45-54",
            description: "Seasoned player",
          },
          {
            id: "55+",
            label: "55+",
            description: "Gaming veteran",
          },
        ];

        return (
          <>
            <h2 className="text-2xl font-bold text-white mb-4">What's your age range?</h2>
            <p className="text-gray-300 mb-6">
              This helps us provide age-appropriate content and recommendations
            </p>
            
            <div className="mb-6 grid grid-cols-2 gap-3">
              {ageRanges.map((range) => {
                const isSelected = ageRange === range.id;
                
                return (
                  <div
                    key={range.id}
                    onClick={() => setAgeRange(range.id as any)}
                    className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all hover:scale-105 ${
                      isSelected
                        ? "border-primary bg-primary/10 shadow-lg shadow-primary/20"
                        : "border-gray-700 hover:border-gray-600 hover:bg-gray-800/50"
                    }`}
                  >
                    <div className="flex flex-col items-center text-center space-y-3">
                      <div className={`p-3 rounded-full ${
                        isSelected 
                          ? "bg-primary text-white" 
                          : "bg-gray-700 text-gray-300"
                      }`}>
                        <Calendar className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-medium text-white mb-1">{range.label}</h3>
                        <p className="text-xs text-gray-400 leading-tight">
                          {range.description}
                        </p>
                      </div>
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
            
            <div className="flex gap-3">
              <Button variant="outline" onClick={goToPrevStep}>
                Back
              </Button>
              <Button
                onClick={goToNextStep}
                disabled={!ageRange}
                className="flex-1"
              >
                Next
              </Button>
            </div>
          </>
        );

      case OnboardingStep.Wallet:
        return (
          <>
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-2xl font-bold text-white">Crypto Wallet Setup</h2>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-5 w-5 text-gray-400 cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Connect a wallet to fund with crypto and purchase exclusive NFTs</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <p className="text-gray-300 mb-6">
              Connect a crypto wallet to unlock future NFT features and rewards. You can create one now via Crossmint, connect an existing external wallet, or skip this step.
            </p>
            {walletAddress ? (
              <div className="mb-6">
                <Card className="bg-primary/10 border-primary/50">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="p-3 rounded-full bg-primary text-white">
                        <Check className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-white mb-1">Wallet Connected!</h3>
                        <p className="text-sm text-gray-300">You're ready for crypto and NFTs</p>
                      </div>
                    </div>
                    <div className="bg-gray-900/50 rounded-lg p-3">
                      <p className="text-xs text-gray-400 mb-1">Wallet Address</p>
                      <p className="text-sm text-white font-mono break-all">{walletAddress}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : showWalletInput ? (
              <div className="mb-6">
                <Card className="bg-gray-800/50 border-gray-700">
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-semibold text-white mb-2">Enter Your Wallet Address</h3>
                        <p className="text-sm text-gray-400 mb-4">
                          Paste your existing Ethereum wallet address below
                        </p>
                      </div>
                      <div className="space-y-3">
                        <Input
                          type="text"
                          placeholder="0x..."
                          value={manualWalletAddress}
                          onChange={(e) => setManualWalletAddress(e.target.value)}
                          className="font-mono text-sm"
                          data-testid="input-wallet-address"
                        />
                        <div className="flex gap-3">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setShowWalletInput(false);
                              setManualWalletAddress("");
                            }}
                            disabled={isSavingWallet}
                            data-testid="button-cancel-wallet-input"
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handleSaveManualWallet}
                            disabled={isSavingWallet || !manualWalletAddress.trim()}
                            className="flex-1"
                            data-testid="button-save-wallet"
                          >
                            {isSavingWallet ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              "Save Wallet"
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="mb-6 space-y-3">
                <Button
                  onClick={handleCreateWallet}
                  disabled={isCreatingWallet}
                  className="w-full h-auto py-4 px-6 bg-primary hover:bg-primary/90 text-white"
                  data-testid="button-create-wallet"
                >
                  <div className="flex items-start gap-3 text-left w-full">
                    <Plus className="h-5 w-5 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-semibold mb-1">
                        {isCreatingWallet ? (
                          <span className="flex items-center">
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Connecting to Crossmint...
                          </span>
                        ) : (
                          "Create/Connect Crossmint wallet"
                        )}
                      </div>
                      <div className="text-sm text-white/80 font-normal">
                        Get or connect your Crossmint wallet (creates new if needed)
                      </div>
                    </div>
                  </div>
                </Button>

                <Button
                  onClick={() => setShowWalletInput(true)}
                  variant="outline"
                  className="w-full h-auto py-4 px-6"
                  data-testid="button-have-wallet"
                >
                  <div className="flex items-start gap-3 text-left w-full">
                    <Wallet className="h-5 w-5 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-semibold text-white mb-1">Connect external wallet</div>
                      <div className="text-sm text-gray-400 font-normal">
                        Enter address from MetaMask, WalletConnect, etc.
                      </div>
                    </div>
                  </div>
                </Button>

                <Button
                  onClick={goToNextStep}
                  variant="ghost"
                  className="w-full h-auto py-4 px-6 text-gray-400 hover:text-white"
                  data-testid="button-skip-wallet"
                >
                  <div className="flex items-start gap-3 text-left w-full">
                    <ArrowRight className="h-5 w-5 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-semibold mb-1">Skip for now</div>
                      <div className="text-sm font-normal">
                        You can set this up later from your profile
                      </div>
                    </div>
                  </div>
                </Button>
              </div>
            )}
            {(walletAddress || showWalletInput) && (
              <div className="flex gap-3">
                <Button variant="outline" onClick={goToPrevStep} disabled={isSavingWallet}>
                  Back
                </Button>
                {walletAddress && (
                  <Button
                    onClick={goToNextStep}
                    className="flex-1"
                    data-testid="button-next-from-wallet"
                  >
                    Next <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                )}
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
    <div className="max-w-lg mx-auto p-6 bg-gray-900 rounded-lg shadow-lg">
      <OnboardingStepIndicator currentStep={currentStep} isGoogleUser={isGoogleUser} />
      {renderStepContent()}
    </div>
  );
}