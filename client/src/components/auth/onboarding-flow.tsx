import { useState, useEffect, useRef, useCallback } from "react";
import { useMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { GAME_DEVELOPER_FEATURES_ENABLED } from "@/lib/feature-flags";
import { Check, Gamepad2, Upload, Search, ArrowRight, Video, Trophy, Code, Eye, Coffee, Scroll, Loader2, Plus, User, Camera, HelpCircle, Info, Wallet, ZoomIn, Crop, Zap, Star, Target, Gift, Tv, Globe, Swords, Users, Flame, ChevronLeft, ChevronRight, X, ExternalLink } from "lucide-react";
import { SiSteam, SiItchdotio, SiEpicgames, SiTwitch, SiKick } from "react-icons/si";
import ShareLaunchIcon from "@/components/ui/ShareIcon";
import { GamefolioIcon } from "@/components/icons/GamefolioIcon";
import { GamefolioLeaderboardIcon } from "@/components/icons/GamefolioLeaderboardIcon";
import { GamefolioWalletIcon } from "@/components/icons/GamefolioWalletIcon";
import { Game } from "@shared/schema";
import { validateStoreUrl, type StoreField } from "@shared/store-urls";
import { Card, CardContent } from "@/components/ui/card";
import IndieDevUpgradeDialog from "@/components/IndieDevUpgradeDialog";
import ProUpgradeDialog from "@/components/ProUpgradeDialog";
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
import imgClip1 from "@assets/image_1781038728553.jpg";
import imgClip2 from "@assets/image_1781038744605.jpg";
import imgClip3 from "@assets/image_1781038753104.jpg";
import imgClip4 from "@assets/image_1781038766375.jpg";
import imgClip5 from "@assets/image_1781038791697.jpg";
import imgClip6 from "@assets/image_1781038853639.jpg";
import imgClip7 from "@assets/image_1781038871252.jpg";
import imgClip8 from "@assets/image_1781039657354.jpg";
import imgClip9 from "@assets/image_1781039672987.jpg";
import imgClip10 from "@assets/image_1781039689447.jpg";
import imgClip11 from "@assets/image_1781039704951.jpg";
import imgClip12 from "@assets/image_1781039716359.jpg";
import imgClip13 from "@assets/image_1781039725893.jpg";
import imgClip14 from "@assets/image_1781039750176.jpg";
import imgClip15 from "@assets/image_1781039760651.jpg";
import imgClip16 from "@assets/image_1781039769261.jpg";
import imgClip17 from "@assets/image_1781039781106.jpg";
import imgClip18 from "@assets/image_1781039805674.jpg";
import imgClip19 from "@assets/image_1781039837584.jpg";
import imgClip20 from "@assets/image_1781039848401.jpg";
import imgHeadFF from "@assets/hat1_1781116412973.png";
import imgHeadBubble from "@assets/bubblegum_(1)_1781116412966.png";
import imgTwitch3D from "@assets/twitch_logo_1781121512398.png";
import imgKick3D from "@assets/kick-logo_1781121512397.png";
import imgRumble3D from "@assets/RUMBLE-LOGO_1781121512396.png";
import Cropper from "react-easy-crop";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { useWallet } from "@/hooks/use-wallet";
import { useAuth } from "@/hooks/use-auth";
import { openExternal, isNative, API_BASE } from "@/lib/platform";
import { useAutoWallet } from "@/hooks/use-auto-wallet";

// Component to display trending games in a grid
interface TrendingGamesGridProps {
  onSelectGame: (game: TwitchGame) => void;
  selectedGames: Game[];
}

function TrendingGamesGrid({ onSelectGame, selectedGames }: TrendingGamesGridProps) {
  const { data: trendingGames, isLoading } = useQuery<TwitchGame[]>({
    queryKey: ["/api/game-catalog/top"],
    queryFn: async () => {
      const response = await fetch("/api/game-catalog/top?limit=50");
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
// One row of the streamer "connect a platform" list. Shows the verified
// channel once linked, so the state is obvious without leaving onboarding.
function PlatformConnectRow({
  label, connectedName, icon, brand, brandText = "#fff", onConnect,
}: {
  label: string;
  connectedName?: string | null;
  icon: React.ReactNode;
  brand: string;
  brandText?: string;
  onConnect: () => void;
}) {
  const connected = !!connectedName;
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-[#1B2A33] bg-[#0B1218] px-3 py-2.5">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="flex-shrink-0" style={{ color: connected ? brand : "rgba(255,255,255,0.45)" }}>{icon}</span>
        <div className="min-w-0">
          <p className="text-sm text-white leading-tight">{label}</p>
          {connected && (
            <p className="text-xs text-primary truncate">Connected as {connectedName}</p>
          )}
        </div>
      </div>
      {connected ? (
        <span className="flex items-center gap-1 text-xs text-primary flex-shrink-0">
          <Check className="w-3.5 h-3.5" /> Verified
        </span>
      ) : (
        <button
          type="button"
          onClick={onConnect}
          className="flex-shrink-0 rounded-md px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-90"
          style={{ background: brand, color: brandText }}
        >
          Connect
        </button>
      )}
    </div>
  );
}

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
  // This is the canonical path through onboarding. It contains only screens
  // that were actually shown, unlike the numeric enum (which also contains
  // conditional screens).
  const visitedStepsRef = useRef<OnboardingStep[]>([OnboardingStep.Welcome]);
  const completionStartedRef = useRef(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showIndieDevUpgrade, setShowIndieDevUpgrade] = useState(false);
  const [showProUpgrade, setShowProUpgrade] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const isMobile = useMobile();

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
    vpzoneUsername: '',
    mainPlatform: '',
    mainGame: '',
    streamFrequency: '',
  });

  // Which social OAuth providers the server has credentials for. Never offer a
  // connect button we know will fail for want of a client id.
  const [socialOAuth, setSocialOAuth] = useState<{ kick: boolean; twitch: boolean; vpzone: boolean }>({
    kick: false, twitch: false, vpzone: false,
  });
  // A developer can register several games (migration 0020). How many is
  // governed server-side by their subscription — free accounts get one, indie
  // dev subscribers get ten — and GET /api/indie/games reports the limit.
  const blankIndieGame = () => ({
    gameName: '',
    studioName: '',
    genre: '',
    releaseStatus: '',
    steamLink: '',
    itchLink: '',
    epicLink: '',
    websiteLink: '',
    description: '',
    // Everything else the store published — artwork, screenshots, platforms,
    // tags, price. No inputs for these in onboarding; they are carried through
    // to the profile so a new game arrives looking finished rather than bare.
    storeImport: null as Record<string, any> | null,
    // Removing imported artwork is an intentional onboarding edit. Keep that
    // decision locally so a lookup from a second store cannot add it back.
    ignoredStoreImportFields: [] as string[],
  });
  type IndieGameForm = ReturnType<typeof blankIndieGame>;

  // Store fields worth persisting that onboarding has no input for. Every one
  // is a real indie_game_profiles column and passes INDIE_ALLOWED_FIELDS.
  const STORE_EXTRA_FIELDS = [
    "headerImageUrl", "capsuleImageUrl", "trailerUrl", "screenshotUrls",
    "genres", "tags", "platforms", "releaseDate", "price", "isFree", "fullDescription",
    "studioWebsite",
  ] as const;

  const mergeUniqueStrings = (current: unknown, incoming: unknown) => {
    const values = [
      ...(Array.isArray(current) ? current : []),
      ...(Array.isArray(incoming) ? incoming : []),
    ].filter((value): value is string => typeof value === "string" && value.trim().length > 0);
    return [...new Set(values)];
  };

  // Store pages complement each other: one can provide a trailer while another
  // provides screenshots or platforms. Preserve existing media, join list data,
  // and prefer the fuller long description rather than allowing a later lookup
  // to erase useful imported metadata.
  const mergeStoreImports = (
    current: Record<string, any> | null,
    incoming: Record<string, any>,
    ignoredFields: string[],
  ): Record<string, any> | null => {
    const merged: Record<string, any> = { ...(current ?? {}) };
    const arrayFields = new Set(["screenshotUrls", "genres", "tags", "platforms", "keyFeatures"]);
    for (const [key, value] of Object.entries(incoming)) {
      if (ignoredFields.includes(key) || value === null || value === undefined) continue;
      if (arrayFields.has(key)) {
        const values = mergeUniqueStrings(merged[key], value);
        if (values.length > 0) merged[key] = key === "screenshotUrls" ? values.slice(0, 16) : values;
        continue;
      }
      if (key === "fullDescription") {
        const existing = typeof merged[key] === "string" ? merged[key] : "";
        const candidate = typeof value === "string" ? value : "";
        merged[key] = candidate.length > existing.length ? candidate : existing || value;
        continue;
      }
      if (key === "isFree") {
        merged[key] = Boolean(merged[key]) || value === true;
        continue;
      }
      if (merged[key] === null || merged[key] === undefined || merged[key] === "") merged[key] = value;
    }
    return Object.keys(merged).length > 0 ? merged : null;
  };

  const [indieGames, setIndieGames] = useState<IndieGameForm[]>([blankIndieGame()]);
  const [activeGameIdx, setActiveGameIdx] = useState(0);
  const [indieGameLimit, setIndieGameLimit] = useState(2);
  const [indieSubscribed, setIndieSubscribed] = useState(false);

  // The form below edits whichever game is selected. Exposing the active game
  // through the original indieGameData/setIndieGameData names keeps every field
  // binding unchanged while the underlying state became a list.
  const indieGameData = indieGames[activeGameIdx] ?? blankIndieGame();
  const setIndieGameData = (
    update: IndieGameForm | ((prev: IndieGameForm) => IndieGameForm),
  ) => {
    setIndieGames(prev => prev.map((g, i) =>
      i === activeGameIdx ? (typeof update === 'function' ? update(g) : update) : g));
  };

  const addIndieGame = () => {
    if (indieGames.length >= indieGameLimit) return;
    setIndieGames(prev => [...prev, blankIndieGame()]);
    setActiveGameIdx(indieGames.length);
  };

  // The onboarding form names these steamLink/itchLink/..., the profile columns
  // are steamUrl/itchUrl/...; map across so one validator governs both.
  const LINK_FIELD_MAP: Record<string, StoreField> = {
    steamLink: "steamUrl",
    itchLink: "itchUrl",
    epicLink: "epicUrl",
    websiteLink: "websiteUrl",
  };

  const indieLinkError = (key: keyof typeof LINK_FIELD_MAP): string | null =>
    validateStoreUrl(LINK_FIELD_MAP[key], (indieGameData as any)[key]);

  // Every link error across every game the developer has added.
  const allIndieLinkErrors = (): string[] =>
    indieGames.flatMap((g, i) =>
      (Object.keys(LINK_FIELD_MAP) as (keyof typeof LINK_FIELD_MAP)[])
        .map(k => {
          const err = validateStoreUrl(LINK_FIELD_MAP[k], (g as any)[k]);
          return err ? (indieGames.length > 1 ? `Game ${i + 1}: ${err}` : err) : null;
        })
        .filter((e): e is string => e !== null));

  // Pasting a supported store URL fills in what the store already knows.
  // Only ever fills blanks — anything the developer has typed wins, so this
  // can never overwrite their own wording.
  const [storeLookup, setStoreLookup] = useState<{ status: "idle" | "loading" | "filled" | "error"; message?: string }>({ status: "idle" });

  const lookupStoreUrl = async (rawUrl: string) => {
    const url = (rawUrl || "").trim();
    if (!url) return;
    setStoreLookup({ status: "loading" });
    try {
      const res = await apiRequest("GET", `/api/indie/store-lookup?url=${encodeURIComponent(url)}`);
      if (!res.ok) {
        const detail = await res.json().catch(() => null);
        setStoreLookup({
          status: "error",
          message: detail?.error || "Couldn't read that store page — fill the details in below.",
        });
        return;
      }
      const data = await res.json();
      const f = data?.fields || {};
      const current = indieGames[activeGameIdx] ?? blankIndieGame();
      const filled: string[] = [];
      const next = { ...current };

      if (!next.gameName.trim() && f.gameName) { next.gameName = String(f.gameName); filled.push("name"); }
      if (!next.studioName.trim() && f.studioName) { next.studioName = String(f.studioName); filled.push("studio"); }
      if (!next.description.trim() && f.shortDescription) { next.description = String(f.shortDescription); filled.push("description"); }
      if (!next.genre.trim() && Array.isArray(f.genres) && f.genres.length > 0) { next.genre = f.genres.join(", "); filled.push("genre"); }
      if (!next.releaseStatus && f.releaseStatus) { next.releaseStatus = String(f.releaseStatus); filled.push("release status"); }
      if (!next.websiteLink.trim() && (f.websiteUrl || f.studioWebsite)) {
        next.websiteLink = String(f.websiteUrl || f.studioWebsite);
        filled.push("website");
      }

      // Carry the rest of the store's data through to the saved profile even
      // though onboarding shows no field for it.
      const extras: Record<string, any> = {};
      for (const key of STORE_EXTRA_FIELDS) {
        const value = (f as any)[key];
        if (value !== null && value !== undefined && !(Array.isArray(value) && value.length === 0)) {
          extras[key] = value;
        }
      }
      next.storeImport = mergeStoreImports(
        current.storeImport,
        extras,
        current.ignoredStoreImportFields,
      );

      setIndieGames(prev => prev.map((g, i) => (i === activeGameIdx ? next : g)));

      const storeName = data.source === "epic" ? "Epic Games" : data.source === "itch" ? "itch.io" : "Steam";
      const extraBits: string[] = [];
      if (extras.headerImageUrl || extras.capsuleImageUrl) extraBits.push("artwork");
      if (extras.trailerUrl) extraBits.push("a trailer");
      if (Array.isArray(extras.screenshotUrls)) extraBits.push(`${extras.screenshotUrls.length} screenshots`);
      if (Array.isArray(extras.platforms)) extraBits.push("platforms");
      const tail = extraBits.length > 0 ? ` Also imported ${extraBits.join(", ")}.` : "";

      if (filled.length === 0) {
        setStoreLookup({ status: "filled", message: `Found on ${storeName} — your details are already filled in.${tail}` });
        return;
      }
      setStoreLookup({
        status: "filled",
        message: `Filled in ${filled.join(", ")} from ${storeName}. Edit anything you'd like to change.${tail}`,
      });
    } catch {
      setStoreLookup({ status: "error", message: "Couldn't reach the store — fill the details in below." });
    }
  };

  const removeIndieGame = (idx: number) => {
    if (indieGames.length <= 1) return;
    setIndieGames(prev => prev.filter((_, i) => i !== idx));
    setActiveGameIdx(i => (i >= idx && i > 0 ? i - 1 : i));
  };

  // The quota is the server's call, not the client's — a new account is free
  // (limit 2) until it subscribes, at which point the limit becomes 10.
  const refreshIndieGameLimit = useCallback(async () => {
    try {
      const res = await apiRequest("GET", "/api/indie/games");
      if (!res.ok) return;
      const data = await res.json();
      if (typeof data?.limit === 'number') setIndieGameLimit(data.limit);
      if (typeof data?.subscribed === 'boolean') setIndieSubscribed(data.subscribed);
    } catch {
      // Leave the free default: never grant more slots than we can confirm.
    }
  }, []);

  useEffect(() => {
    if (selectedPath !== 'indie') return;
    refreshIndieGameLimit();
  }, [selectedPath, refreshIndieGameLimit]);

  // ---- Streamer platform connections -------------------------------------
  // Twitch, Kick and VPZone already have working OAuth (server/routes/social-oauth.ts).
  // Reuse it here rather than asking people to retype a channel name they can
  // prove they own. The callbacks redirect to /settings/profile, which detects
  // it is a popup and announces completion on the 'oauth_completion'
  // BroadcastChannel before closing — so we listen on that channel and no
  // server-side change is needed.
  const { refreshUser } = useAuth();

  useEffect(() => {
    if (selectedPath !== 'streamer') return;
    let cancelled = false;
    (async () => {
      try {
        const res = await apiRequest("GET", "/api/auth/social-oauth/config");
        if (!res.ok) return;
        const cfg = await res.json();
        if (!cancelled) {
          setSocialOAuth({ kick: !!cfg?.kick, twitch: !!cfg?.twitch, vpzone: !!cfg?.vpzone });
        }
      } catch {
        // Leave every provider off — better no button than a broken one.
      }
    })();
    return () => { cancelled = true; };
  }, [selectedPath]);

  useEffect(() => {
    if (selectedPath !== 'streamer') return;
    const onConnected = (type?: string) => {
      if (type === 'twitch_connected' || type === 'kick_connected' || type === 'vpzone_connected') {
        refreshUser();
      }
    };
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('oauth_completion');
      bc.onmessage = (event) => onConnected(event.data?.type);
    } catch {}
    const handler = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      onConnected(event.data?.type);
    };
    window.addEventListener('message', handler);
    return () => {
      bc?.close();
      window.removeEventListener('message', handler);
    };
  }, [selectedPath, refreshUser]);

  // Mirror whatever the OAuth callbacks wrote onto the account back into the
  // form, so a connected channel fills the field instead of being typed twice.
  useEffect(() => {
    if (selectedPath !== 'streamer' || !user) return;
    setStreamerData(d => ({
      ...d,
      twitchUsername: (user as any).twitchChannelName || d.twitchUsername,
      kickUsername: (user as any).kickChannelName || d.kickUsername,
      vpzoneUsername: (user as any).vpzoneChannelName || d.vpzoneUsername,
      mainPlatform: d.mainPlatform || (user as any).streamPlatform || '',
    }));
  }, [selectedPath, user]);

  const startSocialConnect = (path: string) => {
    if (isNative) void openExternal(`${API_BASE}${path}`);
    else window.open(path, '_blank');
  };
  const [platformExpanded, setPlatformExpanded] = useState<{ steam: boolean; itch: boolean; epic: boolean }>({ steam: false, itch: false, epic: false });

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

  const setStepInHistory = (step: OnboardingStep, direction: 'forward' | 'back') => {
    setStepDirection(direction);
    setCurrentStep(step);
  };

  const navigateForward = (step: OnboardingStep) => {
    const nextIndex = visitedStepsRef.current.length;
    visitedStepsRef.current = [...visitedStepsRef.current, step];
    window.history.pushState(
      { onboarding: true, onboardingIndex: nextIndex },
      '',
      '/onboarding',
    );
    setStepInHistory(step, 'forward');
  };

  // Conditional screens are skipped without adding a progress/history entry.
  const skipToStep = (step: OnboardingStep) => {
    visitedStepsRef.current[visitedStepsRef.current.length - 1] = step;
    window.history.replaceState(
      { ...(window.history.state || {}), onboarding: true, onboardingIndex: visitedStepsRef.current.length - 1 },
      '',
      '/onboarding',
    );
    setStepInHistory(step, 'forward');
  };

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state?.onboarding && Number.isInteger(event.state.onboardingIndex)) {
        const index = Math.max(0, Math.min(
          event.state.onboardingIndex,
          visitedStepsRef.current.length - 1,
        ));
        const step = visitedStepsRef.current[index] ?? OnboardingStep.Welcome;
        visitedStepsRef.current = visitedStepsRef.current.slice(0, index + 1);
        setStepInHistory(step, 'back');
        return;
      }

      // Do not allow an unfinished onboarding session to accidentally leave
      // through a stale/non-onboarding history entry.
      window.history.pushState(
        { onboarding: true, onboardingIndex: visitedStepsRef.current.length - 1 },
        '',
        '/onboarding',
      );
    };

    // Normalize the entry created by the page without adding another one.
    window.history.replaceState(
      { ...(window.history.state || {}), onboarding: true, onboardingIndex: 0 },
      '',
      '/onboarding',
    );
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Auto-skip username for non-Google users
  useEffect(() => {
    if (currentStep === OnboardingStep.Username && !isGoogleUser) {
      skipToStep(selectedPath === 'gamer' ? OnboardingStep.Games : OnboardingStep.Avatar);
    }
  }, [currentStep, isGoogleUser, selectedPath]);

  // Auto-skip Games for non-gamer paths
  useEffect(() => {
    if (currentStep === OnboardingStep.Games && selectedPath !== 'gamer') {
      skipToStep(OnboardingStep.Avatar);
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
    if (currentStep === OnboardingStep.PathSetup && selectedPath === 'indie') {
      // Every game the developer added must be complete, not just the visible one.
      const missingName = indieGames.findIndex(g => !g.gameName.trim());
      if (missingName !== -1) {
        setActiveGameIdx(missingName);
        toast({ title: "Game name required", description: indieGames.length > 1 ? `Please enter a name for game ${missingName + 1} to continue.` : "Please enter your game's name to continue.", variant: "default" });
        return;
      }
      const missingStatus = indieGames.findIndex(g => !g.releaseStatus);
      if (missingStatus !== -1) {
        setActiveGameIdx(missingStatus);
        toast({ title: "Release status required", description: indieGames.length > 1 ? `Please select a release status for "${indieGames[missingStatus].gameName}" to continue.` : "Please select a release status to continue.", variant: "default" });
        return;
      }
      // Store links must match their platform — the server rejects mismatches
      // too, so catching it here saves a round trip and keeps the message local.
      const linkErrors = allIndieLinkErrors();
      if (linkErrors.length > 0) {
        const firstBadGame = indieGames.findIndex(g =>
          (Object.keys(LINK_FIELD_MAP) as (keyof typeof LINK_FIELD_MAP)[])
            .some(k => validateStoreUrl(LINK_FIELD_MAP[k], (g as any)[k])));
        if (firstBadGame !== -1) setActiveGameIdx(firstBadGame);
        toast({ title: "Check your store links", description: linkErrors[0], variant: "default" });
        return;
      }
    }

    const next = getNextStep(currentStep);
    setStepDirection('forward');
    navigateForward(next);
    if (next === OnboardingStep.Games) loadGames();
  };

  const goToPrevStep = () => {
    if (visitedStepsRef.current.length > 1) window.history.back();
  };

  // Games logic
  const loadGames = async () => {
    setIsSearching(true);
    try {
      const response = await apiRequest("GET", "/api/game-catalog/top");
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
      const response = await apiRequest("GET", `/api/game-catalog/search?q=${encodeURIComponent(query)}`);
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
      twitchId: game.id, createdAt: new Date(),
      isUserAdded: false, isApproved: true, showContactBanner: true
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
    if (completionStartedRef.current || currentStep !== OnboardingStep.Complete) return;
    completionStartedRef.current = true;
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
      } else if (selectedPath === "indie" && indieGames[0]?.gameName) {
        const lead = indieGames[0];
        const others = indieGames.length - 1;
        bio = `Indie developer — ${lead.gameName}${lead.studioName ? ` by ${lead.studioName}` : ''}${others > 0 ? ` and ${others} more game${others > 1 ? 's' : ''}` : ''}`;
      }

      await apiRequest("PATCH", `/api/users/${userId}`, {
        username: formUsername,
        displayName: formUsername,
        bio,
        userType,
      });

      // Persist the streamer setup step. The OAuth buttons already wrote any
      // verified channel straight to the account; this saves the OAuth-filled
      // channel values along with the remaining profile preferences.
      if (selectedPath === "streamer") {
        try {
          await apiRequest("POST", "/api/streamer/onboarding-profile", {
            twitchUsername: streamerData.twitchUsername.trim() || undefined,
            kickUsername: streamerData.kickUsername.trim() || undefined,
            vpzoneUsername: streamerData.vpzoneUsername.trim() || undefined,
            mainPlatform: streamerData.mainPlatform || undefined,
            mainGame: streamerData.mainGame.trim() || undefined,
            streamFrequency: streamerData.streamFrequency || undefined,
          });
        } catch (err) {
          // Non-fatal: the account already exists, so never block completion.
          console.error("Failed to save streamer profile during onboarding", err);
        }
      }

      // Persist the indie "Your Game" details. Without this the whole step is
      // discarded — previously only the derived bio string survived.
      // The first game goes through /onboarding-profile (which upserts the
      // primary), any extras through /games. The server enforces the quota, so
      // a request beyond the developer's limit is rejected there, not here.
      if (selectedPath === "indie") {
        const toPayload = (g: IndieGameForm) => ({
          ...(g.storeImport ?? {}),
          gameName: g.gameName.trim(),
          studioName: g.studioName.trim() || undefined,
          releaseStatus: g.releaseStatus || undefined,
          shortDescription: g.description.trim() || undefined,
          genres: g.genre.trim() ? g.genre.split(",").map(x => x.trim()).filter(Boolean) : undefined,
          steamUrl: g.steamLink.trim() || undefined,
          itchUrl: g.itchLink.trim() || undefined,
          epicUrl: g.epicLink.trim() || undefined,
          websiteUrl: g.websiteLink.trim() || undefined,
        });

        const named = indieGames.filter(g => g.gameName.trim());
        for (let i = 0; i < named.length; i++) {
          try {
            await apiRequest(
              "POST",
              i === 0 ? "/api/indie/onboarding-profile" : "/api/indie/games",
              toPayload(named[i]),
            );
          } catch (err) {
            // Non-fatal: the account already exists, so never block completion.
            console.error(`Failed to save indie game ${i + 1} during onboarding`, err);
          }
        }
      }

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
      completionStartedRef.current = false;
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
            <div className="my-auto flex flex-col items-center text-center px-2">
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
            <div
              className="flex-shrink-0 px-6 pt-0 pb-6 relative z-10"
              style={{ marginBottom: 'calc(-1 * (max(2.5rem, env(safe-area-inset-bottom, 0px)) + 0.5rem))' }}
            >
              <button
                type="button"
                onClick={goToNextStep}
                className="w-full rounded-[18px] py-4 font-bold flex items-center justify-center gap-2 cursor-pointer"
                style={{ background: '#c1ff00', boxShadow: '0 20px 40px rgba(193,255,0,0.30)', color: '#0a0f1c', fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: '15px' }}
              >
                Get started <ArrowRight className="h-4 w-4" />
              </button>
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
          <div className="flex flex-col flex-1 -mx-5 sm:-mx-6 md:-mx-8 bg-[#071013] overflow-hidden relative" style={{ marginBottom: 'calc(-1 * (max(2.5rem, env(safe-area-inset-bottom, 0px)) + 0.5rem))' }}>
            {/* Visual area */}
            <div className="flex-1 min-h-[240px] sm:min-h-[300px] relative flex items-center justify-center">
              {selectedPath === 'streamer' ? (
                /* Streamer Screen 1: Platform logos orbiting Gamefolio */
                <>
                  {/* Radial background glow */}
                  <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 65% 65% at 50% 48%, rgba(193,255,0,0.10) 0%, rgba(145,71,255,0.08) 45%, transparent 72%)' }} />
                  {/* Top fade */}
                  <div className="absolute inset-x-0 top-0 h-24 pointer-events-none z-10" style={{ background: 'linear-gradient(to bottom, #071013, transparent)' }} />
                  {/* Bottom fade */}
                  <div className="absolute inset-x-0 bottom-0 h-56 pointer-events-none z-10" style={{ background: 'linear-gradient(to top, #071013, transparent)' }} />
                  {/* Orbit system */}
                  <div className="relative z-10 flex flex-col items-center" style={{ gap: '16px' }}>
                    <div className="relative" style={{ width: '270px', height: '270px' }}>
                      {/* Orbit track ring */}
                      <div className="absolute rounded-full pointer-events-none" style={{ inset: '16px', border: '1px dashed rgba(193,255,0,0.20)' }} />
                      {/* Gamefolio center logo */}
                      <div className="absolute" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 2 }}>
                        <div className="rounded-full flex items-center justify-center" style={{ width: '100px', height: '100px', background: 'rgba(193,255,0,0.13)', border: '2px solid rgba(193,255,0,0.55)', boxShadow: '0 0 50px rgba(193,255,0,0.42), 0 0 100px rgba(193,255,0,0.14)' }}>
                          <GamefolioIcon className="w-[72px] h-[72px]" glow={true} />
                        </div>
                      </div>
                      {/* Orbiting platform logos */}
                      {([
                        { img: imgTwitch3D,  delay: '0s',  glow: 'rgba(145,71,255,0.80)' },
                        { img: imgKick3D,    delay: '-4s', glow: 'rgba(83,252,26,0.80)'  },
                        { img: imgRumble3D,  delay: '-8s', glow: 'rgba(140,230,0,0.80)'  },
                      ] as const).map((item, idx) => (
                        <div
                          key={idx}
                          className="absolute ob-orbit-item"
                          style={{ top: 'calc(50% - 34px)', left: 'calc(50% - 34px)', animationDelay: item.delay }}
                        >
                          <img
                            src={item.img}
                            alt=""
                            draggable={false}
                            style={{ width: '68px', height: '68px', objectFit: 'contain', mixBlendMode: 'screen', filter: `drop-shadow(0 0 11px ${item.glow})` }}
                          />
                        </div>
                      ))}
                    </div>
                    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.28)', fontFamily: "'Outfit', sans-serif", letterSpacing: '0.5px' }}>& more coming soon</p>
                  </div>
                </>
              ) : (
                <>
                  {/* Green/white radiant gradient behind center of image */}
                  <div className="absolute inset-0 pointer-events-none z-0" style={{ background: 'radial-gradient(circle at 50% 45%, rgba(193,255,0,0.22) 0%, rgba(255,255,255,0.06) 25%, transparent 55%)' }} />
                  <img src={(i1 as any).img} alt={(i1 as any).imgAlt} draggable={false} className="select-none absolute inset-0 w-full h-full ob-float z-10" style={{ objectFit:'contain', objectPosition:'center', animationDuration:'4s', paddingTop: '40px' }} />
                  <div className="absolute inset-x-0 top-0 h-24 pointer-events-none z-10" style={{ background: 'linear-gradient(to bottom, #071013, transparent)' }} />
                  <div className="absolute inset-x-0 bottom-0 h-56 pointer-events-none z-10" style={{ background: 'linear-gradient(to top, #071013, transparent)' }} />
                </>
              )}
            </div>
            <div className="mt-auto flex-shrink-0 relative z-10 px-6 pt-5 pb-6">
              <div className="flex items-center gap-2 justify-center mb-5">
                {[0,1,2].map(i => <div key={i} className="rounded-full transition-all duration-300" style={{ width: i===0?'20px':'6px', height:'6px', background: i===0?'#c1ff00':'rgba(255,255,255,0.2)', boxShadow: i===0?'0 0 8px rgba(193,255,0,0.7)':'none' }} />)}
              </div>
              <h2 className="text-center mb-2 leading-none uppercase" style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'clamp(24px,6vw,30px)', letterSpacing:'-0.9px', color:'#fff' }}>
                {i1.titleA} <span style={{ color:'#c1ff00' }}>{i1.titleB}</span>
              </h2>
              <p className="text-center mb-5" style={{ fontFamily:"'Outfit',sans-serif", fontWeight:400, fontSize:'14px', lineHeight:'20px', color:'#94A3B8', minHeight:'60px', display:'flex', alignItems:'center', justifyContent:'center' }}>{i1.sub}</p>
              <div className="flex items-center gap-3">
                <button onClick={goToNextStep} className="flex-1 rounded-[18px] py-4 font-bold" style={{ background:'#c1ff00', boxShadow:'0 20px 40px rgba(193,255,0,0.30)', color:'#0a0f1c', fontFamily:"'Outfit',sans-serif", fontWeight:700, fontSize:'15px', borderBottom:'3.333px solid rgba(0,0,0,0.1)' }}>
                  Continue
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
          <div className="flex flex-col flex-1 -mx-5 sm:-mx-6 md:-mx-8 bg-[#071013] overflow-hidden relative" style={{ marginBottom: 'calc(-1 * (max(2.5rem, env(safe-area-inset-bottom, 0px)) + 0.5rem))' }}>
            {/* Visual area */}
            <div className="flex-1 min-h-[240px] sm:min-h-[300px] relative flex items-center justify-center">
              {selectedPath === 'streamer' ? (
                /* Streamer Screen 2: Scrolling clip marquees (3 above, 3 below) */
                <>
                  <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 40%, rgba(145,71,255,0.12) 0%, transparent 70%)' }} />
                  {/* Top fade */}
                  <div className="absolute inset-x-0 top-0 h-20 pointer-events-none z-20" style={{ background: 'linear-gradient(to bottom, #071013, transparent)' }} />
                  {/* Bottom fade */}
                  <div className="absolute inset-x-0 bottom-0 h-56 pointer-events-none z-20" style={{ background: 'linear-gradient(to top, #071013, transparent)' }} />
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
            <div className="mt-auto flex-shrink-0 relative z-10 px-6 pt-5 pb-6">
              <div className="flex items-center gap-2 justify-center mb-5">
                {[0,1,2].map(i => <div key={i} className="rounded-full transition-all duration-300" style={{ width: i===1?'20px':'6px', height:'6px', background: i===1?'#c1ff00':'rgba(255,255,255,0.2)', boxShadow: i===1?'0 0 8px rgba(193,255,0,0.7)':'none' }} />)}
              </div>
              <h2 className="text-center mb-2 leading-none uppercase" style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'clamp(24px,6vw,30px)', letterSpacing:'-0.9px', color:'#fff' }}>
                {i2.titleA} <span style={{ color:'#c1ff00' }}>{i2.titleB}</span>
              </h2>
              <p className="text-center mb-5" style={{ fontFamily:"'Outfit',sans-serif", fontWeight:400, fontSize:'14px', lineHeight:'20px', color:'#94A3B8', minHeight:'60px', display:'flex', alignItems:'center', justifyContent:'center' }}>{i2.sub}</p>
              <div className="flex items-center gap-3">
                <button onClick={goToNextStep} className="flex-1 rounded-[18px] py-4 font-bold" style={{ background:'#c1ff00', boxShadow:'0 20px 40px rgba(193,255,0,0.30)', color:'#0a0f1c', fontFamily:"'Outfit',sans-serif", fontWeight:700, fontSize:'15px', borderBottom:'3.333px solid rgba(0,0,0,0.1)' }}>
                  Continue
                </button>
              </div>
            </div>
          </div>
        );
      }

      // ── STEP 4: PATH-SPECIFIC INTRO 3 ─────────────────────────────────────
      case OnboardingStep.Intro3: {
        const i3 = selectedPath === 'streamer'
          ? { titleA: 'UNLOCK CREATOR', titleB: 'OPPORTUNITIES', sub: 'Earn rewards, join creator campaigns, get featured on the homepage and connect your Twitch, Kick and VPZone channels.' }
          : selectedPath === 'indie'
          ? { titleA: 'LAUNCH', titleB: 'BOUNTIES', sub: 'Run creator campaigns, offer game keys, and reward players with bounty challenges.' }
          : { titleA: 'EARN', titleB: 'REWARDS', sub: 'Complete daily bounties, join creator challenges, and earn GFT to unlock exclusive legendary gear.' };
        return (
          <div className="flex flex-col flex-1 -mx-5 sm:-mx-6 md:-mx-8 bg-[#071013] overflow-hidden relative" style={{ marginBottom: 'calc(-1 * (max(2.5rem, env(safe-area-inset-bottom, 0px)) + 0.5rem))' }}>
            <div className="flex-1 min-h-[240px] sm:min-h-[300px] relative flex items-center justify-center">
              <img src={imgBountyBg} alt="" aria-hidden draggable={false} className="absolute inset-0 w-full h-full object-cover select-none" style={{ opacity: 0.55 }} />
              <div className="absolute inset-x-0 top-0 h-24 pointer-events-none" style={{ background: 'linear-gradient(to bottom, #071013, transparent)' }} />
              <div className="absolute inset-x-0 bottom-0 h-56 pointer-events-none" style={{ background: 'linear-gradient(to top, #071013, transparent)' }} />
              <img src={imgGFBag} alt="GF Token bag" draggable={false} className="ob-float relative z-10 select-none" style={{ height:'85%', width:'auto', objectFit:'contain', animationDuration:'4s', filter:'drop-shadow(0 0 40px rgba(193,255,0,0.35))' }} />
            </div>
            <div className="mt-auto flex-shrink-0 relative z-10 px-6 pt-5 pb-6">
              <div className="flex items-center gap-2 justify-center mb-5">
                {[0,1,2].map(i => <div key={i} className="rounded-full transition-all duration-300" style={{ width: i===2?'20px':'6px', height:'6px', background: i===2?'#c1ff00':'rgba(255,255,255,0.2)', boxShadow: i===2?'0 0 8px rgba(193,255,0,0.7)':'none' }} />)}
              </div>
              <h2 className="text-center mb-2 leading-none uppercase" style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'clamp(24px,6vw,30px)', letterSpacing:'-0.9px', color:'#fff' }}>
                {i3.titleA} <span style={{ color:'#c1ff00' }}>{i3.titleB}</span>
              </h2>
              <p className="text-center mb-5" style={{ fontFamily:"'Outfit',sans-serif", fontWeight:400, fontSize:'14px', lineHeight:'20px', color:'#94A3B8', minHeight:'60px', display:'flex', alignItems:'center', justifyContent:'center' }}>{i3.sub}</p>
              <div className="flex items-center gap-3">
                <button onClick={goToNextStep} className="flex-1 rounded-[18px] py-4 font-bold" style={{ background:'#c1ff00', boxShadow:'0 20px 40px rgba(193,255,0,0.30)', color:'#0a0f1c', fontFamily:"'Outfit',sans-serif", fontWeight:700, fontSize:'15px', borderBottom:'3.333px solid rgba(0,0,0,0.1)' }}>
                  Continue
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
            ctaLabel: 'Continue as Gamer',
            visual: (
              <div className="relative flex items-end justify-center flex-shrink-0 w-full"
                style={{ height: 'clamp(220px, calc(100dvh - 447px), 300px)' }}>
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
            ctaLabel: 'Continue as Streamer',
            visual: (
              <div className="relative flex items-center justify-center flex-shrink-0 w-full"
                style={{ height: 'clamp(200px, calc(100dvh - 467px), 270px)' }}>
                {/* Two heads */}
                <div className="relative z-10 flex items-end justify-center w-full">
                  <img
                    src={imgHeadFF}
                    alt=""
                    draggable={false}
                    className="select-none ob-float"
                    style={{ width: '44%', maxWidth: '210px', animationDuration: '4s', animationDelay: '0.2s', filter: 'drop-shadow(0 10px 28px rgba(0,0,0,0.7)) drop-shadow(0 0 18px rgba(193,255,0,0.12))' }}
                  />
                  <img
                    src={imgHeadBubble}
                    alt=""
                    draggable={false}
                    className="select-none ob-float"
                    style={{ width: '44%', maxWidth: '210px', animationDuration: '4.5s', animationDelay: '0.5s', filter: 'drop-shadow(0 10px 28px rgba(0,0,0,0.7)) drop-shadow(0 0 18px rgba(236,72,153,0.16))' }}
                  />
                </div>
              </div>
            ),
          },
          ...(GAME_DEVELOPER_FEATURES_ENABLED ? [{
            id: 'indie' as UserPath,
            title: 'GAME DEVELOPER',
            ctaLabel: 'Continue as Game Developer',
            visual: (
              <div className="relative flex items-center justify-center flex-shrink-0 w-full"
                style={{ height: isMobile ? 'clamp(240px, calc(100dvh - 467px), 336px)' : 'clamp(200px, calc(100dvh - 467px), 280px)' }}>
                <div className="relative z-10" style={{ width: isMobile ? 'clamp(240px, 36vw, 336px)' : 'clamp(200px, 30vw, 280px)', height: isMobile ? 'clamp(240px, 36vw, 336px)' : 'clamp(200px, 30vw, 280px)' }}>
                  {/* Shirt — floats centre */}
                  <div className="ob-float" style={{ position: 'absolute', top: '50%', left: '50%', animationDuration: '4s' }}>
                    <img src={imgIndieGamer} alt="" draggable={false} style={{ transform: 'translate(-50%,-50%) scale(1.3)', width: isMobile ? 'clamp(264px, 36vw, 432px)' : 'clamp(220px, 30vw, 360px)', height: isMobile ? 'clamp(264px, 36vw, 432px)' : 'clamp(220px, 30vw, 360px)', objectFit: 'contain' }} />
                  </div>
                  {/* Gold Star — top-left */}
                  <div className="ob-float-sm" style={{ position: 'absolute', top: '-20px', left: '-20px', animationDuration: '3.5s', animationDelay: '0.4s' }}>
                    <img src={imgGoldStar} alt="" draggable={false} style={{ transform: 'rotate(90.49deg)', width: '65px', height: '48px', objectFit: 'contain', filter: 'drop-shadow(0 0 10px rgba(255,200,0,0.85))' }} />
                  </div>
                  {/* Purple Potion — top-right */}
                  <div className="ob-float" style={{ position: 'absolute', top: '-20px', right: '-20px', animationDuration: '4.5s', animationDelay: '0.8s' }}>
                    <img src={imgPurplePotion} alt="" draggable={false} style={{ transform: 'rotate(-5.158deg)', width: '70px', height: '70px', objectFit: 'contain', filter: 'drop-shadow(0 0 10px rgba(160,0,255,0.85))' }} />
                  </div>
                  {/* Heart — bottom-right */}
                  <div className="ob-float-sm" style={{ position: 'absolute', bottom: '-20px', right: '-20px', animationDuration: '4s', animationDelay: '0.2s' }}>
                    <img src={imgHeartPng} alt="" draggable={false} style={{ width: '76px', height: '76px', objectFit: 'contain', filter: 'drop-shadow(0 0 10px rgba(255,30,60,0.85))' }} />
                  </div>
                  {/* Unity Logo — bottom-left */}
                  <div className="ob-float" style={{ position: 'absolute', bottom: '-20px', left: '-20px', animationDuration: '3.8s', animationDelay: '1s' }}>
                    <img src={imgUnityLogo} alt="" draggable={false} style={{ width: '70px', height: '54px', objectFit: 'contain', filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.75))' }} />
                  </div>
                </div>
              </div>
            ),
          }] : []),
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
          navigateForward(OnboardingStep.Intro1);
        };

        const currentCard = pathCards[pathCardIndex];

        return (
          <div
            className="flex flex-col flex-1 -mx-5 sm:-mx-6 md:-mx-8 bg-[#0a0f1c] relative"
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
            {/* Full-screen per-card backgrounds */}
            <div className="absolute inset-x-0 top-0 pointer-events-none transition-opacity duration-500 z-0"
                 style={{ opacity: pathCardIndex === 0 ? 1 : 0, bottom: 'calc(-1 * (max(2.5rem, env(safe-area-inset-bottom, 0px)) + 0.5rem))' }}>
              <div className="absolute w-72 h-72 rounded-full blur-[80px]" style={{ background: 'rgba(193,255,0,0.18)', top: '20%', left: '5%' }} />
              <div className="absolute w-64 h-64 rounded-full blur-[80px]" style={{ background: 'rgba(193,255,0,0.15)', top: '35%', right: '5%' }} />
              <div className="absolute w-56 h-56 rounded-full blur-[80px]" style={{ background: 'rgba(193,255,0,0.12)', bottom: '20%', left: '10%' }} />
            </div>
            <div className="absolute inset-x-0 top-0 ob-spark-burst pointer-events-none transition-opacity duration-500 z-0"
                 style={{ opacity: pathCardIndex === 1 ? 1 : 0, bottom: 'calc(-1 * (max(2.5rem, env(safe-area-inset-bottom, 0px)) + 0.5rem))' }} />
            <div className="absolute inset-x-0 top-0 pointer-events-none transition-opacity duration-500 z-0 flex items-center justify-center"
                 style={{ opacity: pathCardIndex === 2 ? 1 : 0, bottom: 'calc(-1 * (max(2.5rem, env(safe-area-inset-bottom, 0px)) + 0.5rem))' }}>
              <div className="w-72 h-72 rounded-full blur-[80px]" style={{ background: 'rgba(193,255,0,0.18)' }} />
            </div>
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
            <div className="flex-1 min-h-0 relative z-10" style={{ overflowX: 'clip' }}>
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

            {/* ── STATIC: carousel arrows ── */}
            <div className="flex-shrink-0 relative z-20 flex items-center justify-center gap-6 pb-6">
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

            {/* ── STATIC: back icon + CTA button — matches intro screen layout ── */}
            <div className="flex-shrink-0 relative z-20 px-6 pt-0 pb-6">
              <div className="flex items-center gap-3">
                <button
                  onClick={handlePathBack}
                  className="flex-none flex items-center justify-center rounded-[18px]"
                  style={{ width: '56px', height: '56px', border: '1.5px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(8px)' }}
                  aria-label="Go back"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M15 19l-7-7 7-7" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
                <button
                  onClick={() => selectAndContinue(currentCard.id)}
                  className="flex-1 rounded-[18px] py-4 font-bold"
                  style={{ background: '#c1ff00', boxShadow: '0 20px 40px rgba(193,255,0,0.30)', color: '#0a0f1c', fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: '15px', borderBottom: '3.333px solid rgba(0,0,0,0.1)' }}
                >
                  {currentCard.ctaLabel}
                </button>
              </div>
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
                  <p className="text-gray-400 mb-4">Connect a platform to pull your channel in automatically. Choose your main platform and tell us what you stream.</p>
                </div>

                {/* Verified connections. Each opens the existing OAuth flow in a
                    popup; on success the account is updated server-side and
                    the connected channel is used automatically. */}
                {(socialOAuth.twitch || socialOAuth.kick || socialOAuth.vpzone) && (
                  <div className="space-y-2">
                    {socialOAuth.twitch && (
                      <PlatformConnectRow
                        label="Twitch"
                        connectedName={(user as any)?.twitchVerified ? (user as any)?.twitchChannelName : null}
                        icon={<SiTwitch className="w-4 h-4" />}
                        brand="#9146FF"
                        onConnect={() => startSocialConnect("/api/auth/twitch-stream/connect")}
                      />
                    )}
                    {socialOAuth.kick && (
                      <PlatformConnectRow
                        label="Kick"
                        connectedName={(user as any)?.kickVerified ? (user as any)?.kickChannelName : null}
                        icon={<SiKick className="w-4 h-4" />}
                        brand="#53FC18"
                        brandText="#071013"
                        onConnect={() => startSocialConnect("/api/auth/kick/connect")}
                      />
                    )}
                    {socialOAuth.vpzone && (
                      <PlatformConnectRow
                        label="VPZone"
                        connectedName={(user as any)?.vpzoneVerified ? (user as any)?.vpzoneChannelName : null}
                        icon={<Tv className="w-4 h-4" />}
                        brand="#1F8FFF"
                        onConnect={() => startSocialConnect("/api/auth/vpzone/connect")}
                      />
                    )}
                  </div>
                )}

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
                        <SelectItem value="vpzone">VPZone</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
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
                <h2 className="text-2xl font-bold text-white mb-1">Add your first game</h2>
                <p className="text-gray-400 mb-4">Tell us a little about your game. You can add more details later.</p>
              </div>

              {storeLookup.status !== "idle" && (
                <p className={`text-xs mb-2 ${storeLookup.status === "error" ? "text-amber-400" : "text-primary"}`}>
                  {storeLookup.status === "loading" ? "Looking up your game…" : storeLookup.message}
                </p>
              )}

              {/* Cover art pulled from the store — shown so it is obvious what
                  was imported, and removable if they would rather upload their own. */}
              {indieGameData.storeImport?.headerImageUrl && (
                <div className="mb-3 flex items-center gap-3 rounded-lg border border-[#1B2A33] bg-[#0B1218] p-2">
                  <img
                    src={indieGameData.storeImport.headerImageUrl}
                    alt=""
                    className="h-12 w-24 flex-shrink-0 rounded object-cover"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-white">Cover art imported</p>
                    <p className="text-xs text-gray-500">You can replace this later in your dashboard.</p>
                  </div>
                  <button
                    type="button"
                    aria-label="Remove imported cover art"
                    onClick={() => setIndieGameData(d => ({
                      ...d,
                      storeImport: d.storeImport
                        ? Object.fromEntries(Object.entries(d.storeImport).filter(([k]) => k !== "headerImageUrl"))
                        : null,
                      ignoredStoreImportFields: [...new Set([...d.ignoredStoreImportFields, "headerImageUrl"])],
                    }))}
                    className="flex-shrink-0 text-gray-500 hover:text-red-400"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* Trailer pulled from the store — same pattern as the cover art
                  card above: visible and removable rather than saved silently. */}
              {indieGameData.storeImport?.trailerUrl && (
                <div className="mb-3 flex items-center gap-3 rounded-lg border border-[#1B2A33] bg-[#0B1218] p-2">
                  <video
                    src={indieGameData.storeImport.trailerUrl}
                    muted
                    preload="metadata"
                    className="h-12 w-24 flex-shrink-0 rounded object-cover bg-black"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-white">Trailer imported</p>
                    <p className="text-xs text-gray-500">You can replace this later in your dashboard.</p>
                  </div>
                  <button
                    type="button"
                    aria-label="Remove imported trailer"
                    onClick={() => setIndieGameData(d => ({
                      ...d,
                      storeImport: d.storeImport
                        ? Object.fromEntries(Object.entries(d.storeImport).filter(([k]) => k !== "trailerUrl"))
                        : null,
                      ignoredStoreImportFields: [...new Set([...d.ignoredStoreImportFields, "trailerUrl"])],
                    }))}
                    className="flex-shrink-0 text-gray-500 hover:text-red-400"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* 1. Game Name */}
              <div>
                <Label className="text-white text-sm mb-1.5 block">Game Name <span className="text-primary">*</span></Label>
                <Input value={indieGameData.gameName} onChange={(e) => setIndieGameData({ ...indieGameData, gameName: e.target.value })} placeholder="Your game's name" className="bg-[#0B1218] border-[#1B2A33] text-white" />
              </div>

              {/* 2. Store pages — one row per platform, added state replaces the add button */}
              <div>
                <Label className="text-gray-400 text-sm mb-2 block">Where can players find your game?</Label>
                <div className="space-y-2">

                  {/* Steam */}
                  {indieGameData.steamLink && !platformExpanded.steam ? (
                    <div className="flex items-center gap-2 rounded-lg border border-[#1B2A33] bg-[#0B1218] px-3 py-2.5">
                      <SiSteam className="w-4 h-4 flex-shrink-0 text-[#c6d4df]" />
                      <span className="flex-1 text-sm text-white flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                        Steam page added
                      </span>
                      <button
                        type="button"
                        onClick={() => setPlatformExpanded(p => ({ ...p, steam: true }))}
                        className="text-xs font-medium text-gray-300 hover:text-white transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        aria-label="Remove Steam page"
                        onClick={() => { setIndieGameData(d => ({ ...d, steamLink: '' })); setPlatformExpanded(p => ({ ...p, steam: false })); }}
                        className="text-gray-500 hover:text-red-400 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      {!platformExpanded.steam ? (
                        <button
                          type="button"
                          onClick={() => setPlatformExpanded(p => ({ ...p, steam: true }))}
                          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border border-[#1B2A33] bg-[#0B1218] text-gray-300 hover:text-white hover:border-[#2A3A44] transition-colors text-sm"
                        >
                          <SiSteam className="w-4 h-4 flex-shrink-0 text-[#c6d4df]" />
                          Add Steam page
                        </button>
                      ) : (
                        <div className="flex gap-2 items-center">
                          <Input
                            autoFocus
                            value={indieGameData.steamLink}
                            onChange={(e) => setIndieGameData({ ...indieGameData, steamLink: e.target.value })}
                            onBlur={() => { if (!indieLinkError("steamLink")) void lookupStoreUrl(indieGameData.steamLink); }}
                            placeholder="https://store.steampowered.com/app/..."
                            className="bg-[#0B1218] border-[#1B2A33] text-white text-xs flex-1"
                          />
                          <button
                            type="button"
                            onClick={() => setPlatformExpanded(p => ({ ...p, steam: false }))}
                            className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg text-white/60 hover:text-white transition-colors"
                            style={{ background: "rgba(255,255,255,0.06)" }}
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </>
                  )}
                  {indieLinkError("steamLink") && (
                    <p className="text-xs text-red-400 -mt-1">{indieLinkError("steamLink")}</p>
                  )}

                  {/* Itch.io */}
                  {indieGameData.itchLink && !platformExpanded.itch ? (
                    <div className="flex items-center gap-2 rounded-lg border border-[#1B2A33] bg-[#0B1218] px-3 py-2.5">
                      <SiItchdotio className="w-4 h-4 flex-shrink-0 text-[#FA5C5C]" />
                      <span className="flex-1 text-sm text-white flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                        itch.io page added
                      </span>
                      <button
                        type="button"
                        onClick={() => setPlatformExpanded(p => ({ ...p, itch: true }))}
                        className="text-xs font-medium text-gray-300 hover:text-white transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        aria-label="Remove itch.io page"
                        onClick={() => { setIndieGameData(d => ({ ...d, itchLink: '' })); setPlatformExpanded(p => ({ ...p, itch: false })); }}
                        className="text-gray-500 hover:text-red-400 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      {!platformExpanded.itch ? (
                        <button
                          type="button"
                          onClick={() => setPlatformExpanded(p => ({ ...p, itch: true }))}
                          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border border-[#1B2A33] bg-[#0B1218] text-gray-300 hover:text-white hover:border-[#2A3A44] transition-colors text-sm"
                        >
                          <SiItchdotio className="w-4 h-4 flex-shrink-0 text-[#FA5C5C]" />
                          Add itch.io page
                        </button>
                      ) : (
                        <div className="flex gap-2 items-center">
                          <Input
                            autoFocus
                            value={indieGameData.itchLink}
                            onChange={(e) => setIndieGameData({ ...indieGameData, itchLink: e.target.value })}
                            onBlur={() => { if (!indieLinkError("itchLink")) void lookupStoreUrl(indieGameData.itchLink); }}
                            placeholder="https://yourname.itch.io/your-game"
                            className="bg-[#0B1218] border-[#1B2A33] text-white text-xs flex-1"
                          />
                          <button
                            type="button"
                            onClick={() => setPlatformExpanded(p => ({ ...p, itch: false }))}
                            className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg text-white/60 hover:text-white transition-colors"
                            style={{ background: "rgba(255,255,255,0.06)" }}
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </>
                  )}
                  {indieLinkError("itchLink") && (
                    <p className="text-xs text-red-400 -mt-1">{indieLinkError("itchLink")}</p>
                  )}

                  {/* Epic Games */}
                  {indieGameData.epicLink && !platformExpanded.epic ? (
                    <div className="flex items-center gap-2 rounded-lg border border-[#1B2A33] bg-[#0B1218] px-3 py-2.5">
                      <SiEpicgames className="w-4 h-4 flex-shrink-0 text-white/70" />
                      <span className="flex-1 text-sm text-white flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                        Epic Games page added
                      </span>
                      <button
                        type="button"
                        onClick={() => setPlatformExpanded(p => ({ ...p, epic: true }))}
                        className="text-xs font-medium text-gray-300 hover:text-white transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        aria-label="Remove Epic Games page"
                        onClick={() => { setIndieGameData(d => ({ ...d, epicLink: '' })); setPlatformExpanded(p => ({ ...p, epic: false })); }}
                        className="text-gray-500 hover:text-red-400 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      {!platformExpanded.epic ? (
                        <button
                          type="button"
                          onClick={() => setPlatformExpanded(p => ({ ...p, epic: true }))}
                          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border border-[#1B2A33] bg-[#0B1218] text-gray-300 hover:text-white hover:border-[#2A3A44] transition-colors text-sm"
                        >
                          <SiEpicgames className="w-4 h-4 flex-shrink-0 text-white/70" />
                          Add Epic Games page
                        </button>
                      ) : (
                        <div className="flex gap-2 items-center">
                          <Input
                            autoFocus
                            value={indieGameData.epicLink}
                            onChange={(e) => setIndieGameData({ ...indieGameData, epicLink: e.target.value })}
                            onBlur={() => { if (!indieLinkError("epicLink")) void lookupStoreUrl(indieGameData.epicLink); }}
                            placeholder="https://store.epicgames.com/..."
                            className="bg-[#0B1218] border-[#1B2A33] text-white text-xs flex-1"
                          />
                          <button
                            type="button"
                            onClick={() => setPlatformExpanded(p => ({ ...p, epic: false }))}
                            className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg text-white/60 hover:text-white transition-colors"
                            style={{ background: "rgba(255,255,255,0.06)" }}
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </>
                  )}
                  {indieLinkError("epicLink") && (
                    <p className="text-xs text-red-400 -mt-1">{indieLinkError("epicLink")}</p>
                  )}
                </div>
              </div>

              {/* 3. Release Status */}
              <div>
                <Label className="text-white text-sm mb-1.5 block">Release Status <span className="text-primary">*</span></Label>
                <Select value={indieGameData.releaseStatus} onValueChange={(v) => setIndieGameData({ ...indieGameData, releaseStatus: v })}>
                  <SelectTrigger className="bg-[#0B1218] border-[#1B2A33] text-white">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0B1218] border-[#1B2A33]">
                    <SelectItem value="released">Released</SelectItem>
                    <SelectItem value="early_access">Early Access</SelectItem>
                    <SelectItem value="coming_soon">Coming Soon</SelectItem>
                    <SelectItem value="in_development">In Development</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 4. Genre */}
              <div>
                <Label className="text-gray-400 text-sm mb-1.5 block">Genre <span className="text-gray-600 font-normal text-xs ml-1">optional</span></Label>
                <Input value={indieGameData.genre} onChange={(e) => setIndieGameData({ ...indieGameData, genre: e.target.value })} placeholder="e.g. Action RPG, Puzzle, Platformer" className="bg-[#0B1218] border-[#1B2A33] text-white" />
              </div>

              {/* 5. Studio / Developer */}
              <div>
                <Label className="text-gray-400 text-sm mb-1.5 block">Studio / Developer <span className="text-gray-600 font-normal text-xs ml-1">optional</span></Label>
                <Input value={indieGameData.studioName} onChange={(e) => setIndieGameData({ ...indieGameData, studioName: e.target.value })} placeholder="Studio or developer name" className="bg-[#0B1218] border-[#1B2A33] text-white" />
              </div>

              {/* 6. Short Description */}
              <div>
                <Label className="text-gray-400 text-sm mb-1.5 block">Short Description <span className="text-gray-600 font-normal text-xs ml-1">optional</span></Label>
                <Textarea value={indieGameData.description} onChange={(e) => setIndieGameData({ ...indieGameData, description: e.target.value })} placeholder="A short description of your game..." className="bg-[#0B1218] border-[#1B2A33] text-white resize-none" rows={3} />
              </div>

              {/* 7. Website */}
              <div>
                <Label className="text-gray-400 text-sm mb-1.5 block">Website <span className="text-gray-600 font-normal text-xs ml-1">optional</span></Label>
                <Input value={indieGameData.websiteLink} onChange={(e) => setIndieGameData({ ...indieGameData, websiteLink: e.target.value })} placeholder="https://yourgame.com" className="bg-[#0B1218] border-[#1B2A33] text-white" />
                {indieLinkError("websiteLink") && (
                  <p className="text-xs text-red-400 mt-1">{indieLinkError("websiteLink")}</p>
                )}
              </div>
            </div>

            {/* Footer navigation — Back on the left, Continue on the right */}
            <div className="flex items-center justify-between gap-3 mt-4 pt-3 border-t border-[#1B2A33] flex-shrink-0">
              <button
                type="button"
                onClick={goToPrevStep}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 border border-[#1B2A33] hover:border-[#2A3A44] transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>
              <Button
                onClick={goToNextStep}
                disabled={!indieGameData.gameName.trim() || !indieGameData.releaseStatus}
                className="bg-primary hover:bg-primary/90 text-[#071013] font-semibold px-6"
              >
                Continue <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>

            {/* Mounted here so the upgrade upsell has a dialog to open.
                Re-check the quota on close: they may have just subscribed. */}
            <IndieDevUpgradeDialog
              open={showIndieDevUpgrade}
              onOpenChange={(open) => {
                setShowIndieDevUpgrade(open);
                if (!open) refreshIndieGameLimit();
              }}
            />
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
            benefits: ['Larger & unlimited uploads', 'Animated profile banners & GIF avatars', 'Exclusive avatar borders & Pro badge', 'Welcome + monthly bonus lootboxes', 'Up to 20% off in the Gamefolio store'],
            proLabel: 'View Gamefolio Pro',
          },
          streamer: {
            titleA: 'GAMEFOLIO',  titleB: 'PRO',
            sub: 'Grow your audience and turn streams into content.',
            emoji: '🎙️',
            benefits: ['Larger & unlimited uploads', 'Animated profile banners & GIF avatars', 'Exclusive avatar borders & Pro badge', 'Welcome + monthly bonus lootboxes', 'Up to 20% off in the Gamefolio store'],
            proLabel: 'View Gamefolio Pro',
          },
          indie: {
            titleA: 'GAME DEVELOPER',  titleB: 'PRO',
            sub: 'Game Developer Pro is coming soon. Get ready for expanded developer benefits.',
            emoji: '🚀',
            benefits: ['Add multiple games', 'Featured promotion on gamefolio.com/games', 'Included in Gamefolio\'s social media promotion', 'Priority developer support', '£3.99/mo or £42.00/yr'],
            proLabel: 'Game Developer Pro — Coming soon',
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
              <Button
                onClick={() => selectedPath === 'indie' ? setShowIndieDevUpgrade(true) : setShowProUpgrade(true)}
                className="w-full bg-primary hover:bg-primary/90 text-[#071013] font-bold py-5 rounded-xl"
              >
                {upsell.proLabel}
              </Button>
              <Button variant="ghost" onClick={goToNextStep} className="w-full text-gray-400 hover:text-white py-3">
                Continue Free <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
            {selectedPath === 'indie' ? (
              <IndieDevUpgradeDialog open={showIndieDevUpgrade} onOpenChange={setShowIndieDevUpgrade} />
            ) : (
              <ProUpgradeDialog open={showProUpgrade} onOpenChange={setShowProUpgrade} />
            )}
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
      className={`w-full mx-auto px-5 pt-8 sm:p-6 md:p-8 h-dvh sm:h-[700px] sm:overflow-hidden sm:rounded-lg shadow-lg sm:border sm:border-primary/20 flex flex-col bg-[#071013]`}
      style={{ paddingBottom: 'calc(max(2.5rem, env(safe-area-inset-bottom, 0px)) + 0.5rem)' }}
    >
      {/* Persistent back control. Sits above the step indicator so every step
          exposes it in the same place, rather than each step rolling its own.
          Hidden on the first step (nothing to go back to) and on Complete,
          where the account has already been written. */}
      <div className="flex items-center mb-3 h-8">
        {currentStep > OnboardingStep.Welcome && currentStep !== OnboardingStep.Complete && (
          <button
            type="button"
            onClick={goToPrevStep}
            aria-label="Go back"
            className="flex items-center gap-1 -ml-2 px-2 py-1.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>
        )}
      </div>
      <OnboardingStepIndicator currentStep={currentStep} isGoogleUser={isGoogleUser} selectedPath={selectedPath} />
      <div className={`flex-1 flex flex-col min-h-0 ${stepDirection === 'forward' ? 'ob-step-content-forward' : 'ob-step-content-back'}`} key={currentStep}>
        {renderStepContent()}
      </div>
    </div>
  );
}
