import React, { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useMobile } from "@/hooks/use-mobile";
import { useLocation, Link } from "wouter";
import { useTheme } from "@/hooks/use-theme";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Palette, User, Save, Upload, Move, Shield, Camera, Sparkles, Loader2, X, ZoomIn, Crop, Lock, Crown, Check, Calendar, ExternalLink, AlertTriangle, Gamepad2, Plus, Trash2, Hexagon, Smile, RefreshCw, ChevronDown, ChevronUp, Trophy, Settings, Unlink } from "lucide-react";
import { useRevenueCat } from "@/hooks/use-revenuecat";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { HexColorPicker } from "react-colorful";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { BannerUploadPreview } from "@/components/BannerUploadPreview";
import { BackgroundUploadPreview } from "@/components/BackgroundUploadPreview";
import { BannerPositionPreview } from "@/components/BannerPositionPreview";
import { BackgroundPositionPreview } from "@/components/BackgroundPositionPreview";
import { useUpdateProfile } from "@/hooks/use-profile";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { FaSteam, FaXbox, FaPlaystation, FaYoutube, FaDiscord } from 'react-icons/fa';
import { connectXboxAccount, isXboxConfigValid } from '@/lib/xbox';
import { FaXTwitter } from 'react-icons/fa6';
import { SiEpicgames, SiNintendo } from 'react-icons/si';
import Cropper from "react-easy-crop";
import NftProfilePopup from "@/components/nft/NftProfilePopup";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import DOMPurify from "dompurify";
import { useSignedUrl, useSignedUrls, clearSignedUrlCache } from "@/hooks/use-signed-url";
import type { NameTag, VerificationBadge } from "@shared/schema";
import { KeyboardAvoidingWrapper } from "@/components/shared/KeyboardAvoidingWrapper";
import MintedNftDetailScreen from "@/components/mint/MintedNftDetailScreen";
import { SKALE_NEBULA_TESTNET } from "@shared/contracts";

const EMOJI_CATEGORIES = [
  {
    label: "Smileys",
    emojis: ["😀","😃","😄","😁","😆","😅","😂","🤣","😊","😇","🙂","🙃","😉","😌","😍","🥰","😘","😗","😙","😚","😋","😛","😜","🤪","😝","🤑","🤗","🤭","😏","😎","🥳","🤩"],
  },
  {
    label: "Gaming",
    emojis: ["🎮","🕹️","👾","🎯","🏆","🥇","🎲","🃏","🎰","⚔️","🛡️","🗡️","💣","🎱","🔫","🏹","🧨","🎳","🤺","🥊"],
  },
  {
    label: "Animals",
    emojis: ["🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐮","🐷","🐸","🐵","🐔","🦄","🐉","🦋","🦅","🐺","🦝","🐗","🦖"],
  },
  {
    label: "Fire & Stars",
    emojis: ["🔥","⚡","💥","✨","⭐","🌟","💫","🌈","❄️","🌊","🌀","☄️","🌙","🌞","💎","👑","🏅","🎖️","🎗️","🎀"],
  },
  {
    label: "Hands & People",
    emojis: ["👋","🤚","🖐️","✋","🖖","👌","🤌","✌️","🤞","🤟","🤘","🤙","👈","👉","👆","👇","☝️","👍","👎","✊","👊","🤛","🤜","🙌","👏","🤝","🫶","💪","🦾"],
  },
  {
    label: "Objects",
    emojis: ["💻","🖥️","🖨️","⌨️","🖱️","📱","📷","🎥","📡","🔭","🔬","💡","🔋","🔌","🧲","💾","💿","📀","🎵","🎶","🎸","🥁","🎺","🎷","🎻","🎤","🎧","📻","📺","🎬"],
  },
];

const FONT_OPTIONS = [
  { value: 'default', label: 'Default', family: 'system-ui, sans-serif', scale: 1 },
  { value: 'inter', label: 'Inter', family: "'Inter', sans-serif", scale: 1 },
  { value: 'roboto', label: 'Roboto', family: "'Roboto', sans-serif", scale: 1 },
  { value: 'poppins', label: 'Poppins', family: "'Poppins', sans-serif", scale: 1 },
  { value: 'montserrat', label: 'Montserrat', family: "'Montserrat', sans-serif", scale: 1 },
  { value: 'oswald', label: 'Oswald', family: "'Oswald', sans-serif", scale: 1.1 },
  { value: 'playfair', label: 'Playfair Display', family: "'Playfair Display', serif", scale: 1 },
  { value: 'raleway', label: 'Raleway', family: "'Raleway', sans-serif", scale: 1 },
  { value: 'space-grotesk', label: 'Space Grotesk', family: "'Space Grotesk', sans-serif", scale: 1 },
  { value: 'orbitron', label: 'Orbitron', family: "'Orbitron', sans-serif", scale: 0.9 },
  { value: 'press-start', label: 'Press Start 2P', family: "'Press Start 2P', cursive", scale: 0.55 },
  { value: 'russo-one', label: 'Russo One', family: "'Russo One', sans-serif", scale: 1 },
  { value: 'bungee-shade', label: 'Bungee Shade', family: "'Bungee Shade', cursive", scale: 0.85 },
  { value: 'nabla', label: 'Nabla', family: "'Nabla', cursive", scale: 0.9 },
  { value: 'silkscreen', label: 'Silkscreen', family: "'Silkscreen', cursive", scale: 0.75 },
  { value: 'rubik-bubbles', label: 'Rubik Bubbles', family: "'Rubik Bubbles', cursive", scale: 1 },
  { value: 'monoton', label: 'Monoton', family: "'Monoton', cursive", scale: 1 },
  { value: 'creepster', label: 'Creepster', family: "'Creepster', cursive", scale: 1.1 },
  { value: 'permanent-marker', label: 'Permanent Marker', family: "'Permanent Marker', cursive", scale: 1.05 },
  { value: 'bangers', label: 'Bangers', family: "'Bangers', cursive", scale: 1.15 },
  { value: 'fredoka', label: 'Fredoka', family: "'Fredoka', sans-serif", scale: 1 },
  { value: 'righteous', label: 'Righteous', family: "'Righteous', cursive", scale: 1.05 },
  { value: 'bungee-inline', label: 'Bungee Inline', family: "'Bungee Inline', cursive", scale: 0.85 },
  { value: 'notable', label: 'Notable', family: "'Notable', sans-serif", scale: 0.8 },
  { value: 'bungee-spice', label: 'Bungee Spice', family: "'Bungee Spice', cursive", scale: 0.85 },
  { value: 'honk', label: 'Honk', family: "'Honk', system-ui", scale: 0.9 },
];

const FONT_ANIMATIONS = [
  { value: 'none', label: 'None', animClass: '' },
  { value: 'bounce', label: 'Bounce', animClass: 'animate-font-bounce' },
  { value: 'shake', label: 'Shake', animClass: 'animate-font-shake' },
  { value: 'pulse', label: 'Pulse', animClass: 'animate-font-pulse' },
  { value: 'float', label: 'Float', animClass: 'animate-font-float' },
  { value: 'wave', label: 'Wave', animClass: 'animate-font-wave' },
  { value: 'flicker', label: 'Flicker', animClass: 'animate-font-flicker' },
  { value: 'rubberband', label: 'Rubber Band', animClass: 'animate-font-rubberband' },
  { value: 'jello', label: 'Jello', animClass: 'animate-font-jello' },
  { value: 'swing', label: 'Swing', animClass: 'animate-font-swing' },
];

const FONT_EFFECTS = [
  { value: 'none', label: 'None', textShadow: 'none' },
  { value: 'drop-shadow', label: 'Drop Shadow', textShadow: '2px 2px 4px rgba(0,0,0,0.8)' },
  { value: 'hard-shadow', label: 'Hard Shadow', textShadow: '3px 3px 0px rgba(0,0,0,0.9)' },
  { value: 'neon-green', label: 'Neon Green', textShadow: '0 0 7px #00ff00, 0 0 10px #00ff00, 0 0 21px #00ff00, 0 0 42px #00ff00' },
  { value: 'neon-blue', label: 'Neon Blue', textShadow: '0 0 7px #00bfff, 0 0 10px #00bfff, 0 0 21px #00bfff, 0 0 42px #00bfff' },
  { value: 'neon-pink', label: 'Neon Pink', textShadow: '0 0 7px #ff00de, 0 0 10px #ff00de, 0 0 21px #ff00de, 0 0 42px #ff00de' },
  { value: 'neon-red', label: 'Neon Red', textShadow: '0 0 7px #ff0000, 0 0 10px #ff0000, 0 0 21px #ff0000, 0 0 42px #ff1a1a' },
  { value: 'neon-purple', label: 'Neon Purple', textShadow: '0 0 7px #bf00ff, 0 0 10px #bf00ff, 0 0 21px #bf00ff, 0 0 42px #bf00ff' },
  { value: 'neon-yellow', label: 'Neon Yellow', textShadow: '0 0 7px #ffff00, 0 0 10px #ffff00, 0 0 21px #ffff00, 0 0 42px #ffff00' },
  { value: 'fire', label: 'Fire Glow', textShadow: '0 0 4px #ff4500, 0 0 11px #ff4500, 0 0 19px #ff6600, 0 0 40px #ff6600, 0 0 80px #ff8800' },
  { value: 'ice', label: 'Ice Glow', textShadow: '0 0 5px #e0f7ff, 0 0 10px #a0d8ef, 0 0 20px #7ec8e3, 0 0 40px #45b7d1' },
  { value: 'gold', label: 'Gold Glow', textShadow: '0 0 5px #ffd700, 0 0 10px #ffc400, 0 0 20px #ffaa00, 0 0 40px #ff8c00' },
  { value: 'retro', label: 'Retro Offset', textShadow: '2px 2px 0 #ff0000, -2px -2px 0 #00bfff' },
  { value: 'outline-white', label: 'White Outline', textShadow: '-1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff' },
  { value: 'outline-black', label: 'Black Outline', textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, -2px 0 0 #000, 2px 0 0 #000, 0 -2px 0 #000, 0 2px 0 #000' },
  { value: 'rainbow', label: 'Rainbow Glow', textShadow: '0 0 5px #ff0000, 0 0 10px #ff7700, 0 0 15px #ffff00, 0 0 20px #00ff00, 0 0 25px #0000ff, 0 0 30px #8b00ff' },
];

// Component to fetch SVG and render it inline with color replacement
const InlineSvgBorder: React.FC<{
  svgUrl: string;
  color: string;
  className?: string;
  style?: React.CSSProperties;
}> = ({ svgUrl, color, className, style }) => {
  const [svgContent, setSvgContent] = useState<string>('');
  
  // Get signed URL for the SVG
  const { signedUrl } = useSignedUrl(svgUrl);
  
  useEffect(() => {
    // Wait for signed URL if the original URL is a Supabase URL
    const urlToFetch = signedUrl || svgUrl;
    if (!urlToFetch) return;
    
    // Don't fetch if we need a signed URL but don't have one yet
    if (svgUrl && svgUrl.includes('supabase.co') && !signedUrl) return;
    
    fetch(urlToFetch)
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        return res.text();
      })
      .then(svg => {
        if (!svg.includes('<svg') && !svg.includes('<?xml')) {
          console.error('Invalid SVG content received');
          return;
        }
        // Sanitize the SVG - preserve style tags, CSS animations, and SMIL animations
        const sanitized = DOMPurify.sanitize(svg, { 
          USE_PROFILES: { svg: true, svgFilters: true },
          ADD_TAGS: ['style', 'animate', 'animateTransform', 'animateMotion', 'set'],
          ADD_ATTR: ['xmlns', 'viewBox', 'preserveAspectRatio', 'attributeName', 'attributeType', 'begin', 'dur', 'end', 'from', 'to', 'by', 'values', 'keyTimes', 'keySplines', 'calcMode', 'repeatCount', 'repeatDur', 'additive', 'accumulate', 'type', 'restart']
        });
        
        // Replace black colors with the user's selected color
        // This handles various formats: #000, #000000, black, rgb(0,0,0)
        let colorized = sanitized
          .replace(/fill\s*=\s*["'](?:#000000|#000|black|rgb\(0,\s*0,\s*0\))["']/gi, `fill="${color}"`)
          .replace(/stroke\s*=\s*["'](?:#000000|#000|black|rgb\(0,\s*0,\s*0\))["']/gi, `stroke="${color}"`)
          .replace(/fill\s*:\s*(?:#000000|#000|black|rgb\(0,\s*0,\s*0\))/gi, `fill: ${color}`)
          .replace(/stroke\s*:\s*(?:#000000|#000|black|rgb\(0,\s*0,\s*0\))/gi, `stroke: ${color}`);
        
        // Also replace currentColor with the selected color
        colorized = colorized
          .replace(/fill\s*=\s*["']currentColor["']/gi, `fill="${color}"`)
          .replace(/stroke\s*=\s*["']currentColor["']/gi, `stroke="${color}"`)
          .replace(/fill\s*:\s*currentColor/gi, `fill: ${color}`)
          .replace(/stroke\s*:\s*currentColor/gi, `stroke: ${color}`);
        
        setSvgContent(colorized);
      })
      .catch(err => console.error('Failed to load SVG:', err));
  }, [svgUrl, signedUrl, color]);
  
  if (!svgContent) return null;
  
  return (
    <div 
      className={className}
      dangerouslySetInnerHTML={{ __html: svgContent }}
      style={{
        filter: `drop-shadow(0 0 4px ${color}80) drop-shadow(0 0 8px ${color}40)`,
        ...style,
      }}
    />
  );
};

// Component for name tag images with signed URL support
const NameTagImage: React.FC<{
  imageUrl: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
}> = ({ imageUrl, alt, className, style }) => {
  const { signedUrl, isLoading } = useSignedUrl(imageUrl);
  
  if (isLoading) {
    return <div className={className} style={{ ...style, backgroundColor: 'rgba(255,255,255,0.1)' }} />;
  }
  
  return (
    <img
      src={signedUrl || imageUrl}
      alt={alt}
      className={className}
      style={style}
      onError={(e) => {
        (e.target as HTMLImageElement).style.opacity = '0.3';
      }}
    />
  );
};

// Utility function to create a cropped image from canvas
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

  if (!ctx) {
    throw new Error('No 2d context');
  }

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Canvas is empty'));
      }
    }, 'image/jpeg', 0.9);
  });
};

const PRESET_THEMES = [
  {
    name: "Pink Gamer Girl",
    backgroundColor: "#fce7f3",
    accentColor: "#ff2056",
    gradientTopColor: "#4a0022"
  }
];

const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
};

const darkenColor = (hex: string, percent: number) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const factor = 1 - percent / 100;
  const r = Math.round(rgb.r * factor);
  const g = Math.round(rgb.g * factor);
  const b = Math.round(rgb.b * factor);
  return `rgb(${r}, ${g}, ${b})`;
};

const PLATFORM_DEFINITIONS = [
  { key: "steamUsername" as const, label: "Steam", placeholder: "Enter your Steam username", icon: "steam", category: "gaming" },
  { key: "xboxUsername" as const, label: "Xbox", placeholder: "Enter your Xbox gamertag", icon: "xbox", category: "gaming" },
  { key: "playstationUsername" as const, label: "PlayStation", placeholder: "Enter your PlayStation ID", icon: "playstation", category: "gaming" },
  { key: "discordUsername" as const, label: "Discord", placeholder: "Enter your Discord username", icon: "discord", category: "gaming" },
  { key: "epicUsername" as const, label: "Epic Games", placeholder: "Enter your Epic Games username", icon: "epic", category: "gaming" },
  { key: "nintendoUsername" as const, label: "Nintendo", placeholder: "Enter your Nintendo username", icon: "nintendo", category: "gaming" },
  { key: "twitterUsername" as const, label: "X (Twitter)", placeholder: "Enter your X username", icon: "twitter", category: "social" },
  { key: "youtubeUsername" as const, label: "YouTube", placeholder: "Enter your YouTube username", icon: "youtube", category: "social" },
] as const;

type PlatformKey = typeof PLATFORM_DEFINITIONS[number]["key"];

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { setAccentColor } = useTheme();
  const { customerInfo, refreshCustomerInfo } = useRevenueCat();
  
  const updateProfile = useUpdateProfile();
  
  const [showAddPlatform, setShowAddPlatform] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformKey | null>(null);
  const [platformHandle, setPlatformHandle] = useState('');
  const [savingPlatform, setSavingPlatform] = useState(false);
  const [removingPlatform, setRemovingPlatform] = useState<PlatformKey | null>(null);
  const [connectingXbox, setConnectingXbox] = useState(false);
  const [syncingAchievements, setSyncingAchievements] = useState(false);
  const [togglingAchievements, setTogglingAchievements] = useState(false);
  const [showXboxDisconnectDialog, setShowXboxDisconnectDialog] = useState(false);
  const [disconnectingXbox, setDisconnectingXbox] = useState(false);
  const xboxConfigRef = useRef<HTMLDivElement>(null);
  const [syncingPsnTrophies, setSyncingPsnTrophies] = useState(false);
  const [togglingPsnTrophies, setTogglingPsnTrophies] = useState(false);
  const [showPsnDisconnectDialog, setShowPsnDisconnectDialog] = useState(false);
  const [disconnectingPsn, setDisconnectingPsn] = useState(false);
  const psnConfigRef = useRef<HTMLDivElement>(null);

  const getPlatformIcon = (iconKey: string) => {
    switch (iconKey) {
      case 'steam': return <FaSteam className="w-5 h-5 text-[#66c0f4]" />;
      case 'xbox': return <FaXbox className="w-5 h-5 text-[#107C10]" />;
      case 'playstation': return <FaPlaystation className="w-5 h-5 text-[#003791]" />;
      case 'discord': return <FaDiscord className="w-5 h-5 text-[#7289DA]" />;
      case 'epic': return <SiEpicgames className="w-5 h-5 text-slate-300" />;
      case 'nintendo': return <SiNintendo className="w-5 h-5 text-[#E60012]" />;
      case 'twitter': return <FaXTwitter className="w-5 h-5 text-white" />;
      case 'youtube': return <FaYoutube className="w-5 h-5 text-[#FF0000]" />;
      default: return <Gamepad2 className="w-5 h-5" />;
    }
  };

  const connectedPlatforms = PLATFORM_DEFINITIONS.filter(p => user?.[p.key]);
  const availablePlatforms = PLATFORM_DEFINITIONS.filter(p => !user?.[p.key]);

  const handleAddPlatform = async () => {
    if (!user || !selectedPlatform || !platformHandle.trim()) return;
    setSavingPlatform(true);
    try {
      await apiRequest("PATCH", `/api/users/${user.id}`, { [selectedPlatform]: platformHandle.trim() });
      await refreshUser();
      toast({ title: "Platform added", description: "Your platform connection has been saved.", duration: 3000 });
      setShowAddPlatform(false);
      setSelectedPlatform(null);
      setPlatformHandle('');
    } catch (error) {
      toast({ title: "Failed to add platform", description: "Please try again.", variant: "destructive" });
    } finally {
      setSavingPlatform(false);
    }
  };

  const handleRemovePlatform = async (key: PlatformKey) => {
    if (!user) return;
    setRemovingPlatform(key);
    try {
      if (key === 'xboxUsername') {
        await apiRequest("POST", "/api/xbox/disconnect", {});
      } else {
        await apiRequest("PATCH", `/api/users/${user.id}`, { [key]: null });
      }
      await refreshUser();
      toast({ title: "Platform removed", description: "Your platform connection has been removed.", duration: 3000 });
    } catch (error) {
      toast({ title: "Failed to remove platform", description: "Please try again.", variant: "destructive" });
    } finally {
      setRemovingPlatform(null);
    }
  };

  const handleXboxDisconnect = async () => {
    setDisconnectingXbox(true);
    try {
      await apiRequest("POST", "/api/xbox/disconnect", {});
      await refreshUser();
      setShowXboxDisconnectDialog(false);
      toast({ title: "Xbox disconnected", description: "Your Xbox account has been disconnected and achievement data cleared.", duration: 3000 });
    } catch (error) {
      toast({ title: "Failed to disconnect", description: "Could not disconnect your Xbox account. Please try again.", variant: "destructive" });
    } finally {
      setDisconnectingXbox(false);
    }
  };

  const handleSyncAchievements = async () => {
    setSyncingAchievements(true);
    try {
      const res = await fetch("/api/xbox/achievements/sync", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Sync failed");
      await refreshUser();
      toast({ title: "Achievements synced", description: `Pulled in ${data.achievements?.length || 0} game${data.achievements?.length !== 1 ? 's' : ''} with achievements from Xbox Live.`, duration: 4000 });
    } catch (error: any) {
      toast({ title: "Sync failed", description: error.message || "Could not fetch achievements. Please try again.", variant: "destructive" });
    } finally {
      setSyncingAchievements(false);
    }
  };

  const handleToggleAchievements = async (show: boolean) => {
    setTogglingAchievements(true);
    try {
      const res = await fetch("/api/xbox/achievements/toggle", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ show }),
      });
      if (!res.ok) throw new Error("Toggle failed");
      await refreshUser();
      toast({ title: show ? "Achievements shown on profile" : "Achievements hidden from profile", duration: 3000 });
    } catch (error) {
      toast({ title: "Failed to update setting", description: "Please try again.", variant: "destructive" });
    } finally {
      setTogglingAchievements(false);
    }
  };

  const handleSyncPsnTrophies = async () => {
    setSyncingPsnTrophies(true);
    try {
      const res = await fetch("/api/psn/trophies/sync", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Sync failed");

      // Directly update the query cache with the sync response data so the UI
      // reflects the new state immediately, without waiting for a secondary fetch.
      const cachedUser = queryClient.getQueryData<any>(["/api/user"]);
      if (cachedUser) {
        const newTrophyData = [{
          earnedTrophies: data.earnedTrophies ?? {},
          trophyLevel: data.trophyLevel ?? null,
          recentGames: data.recentGames ?? [],
        }];
        queryClient.setQueryData(["/api/user"], {
          ...cachedUser,
          psnTrophyData: newTrophyData,
          psnTrophiesLastSync: data.syncedAt,
          psnTrophyLevel: data.trophyLevel ?? null,
          psnTotalTrophies: data.totalTrophies ?? null,
        });
      } else {
        await refreshUser();
      }

      const total = data.totalTrophies ?? 0;
      const games = data.recentGames?.length ?? 0;
      toast({
        title: "PSN data synced",
        description: `Pulled ${total} trophy${total !== 1 ? 'ies' : 'y'} across all games${games > 0 ? ` · ${games} recent game${games !== 1 ? 's' : ''}` : ''}.`,
        duration: 4000,
      });
    } catch (error: any) {
      toast({ title: "Sync failed", description: error.message || "Could not fetch PSN data. Please try again.", variant: "destructive" });
    } finally {
      setSyncingPsnTrophies(false);
    }
  };

  const handleTogglePsnTrophies = async (show: boolean) => {
    setTogglingPsnTrophies(true);
    try {
      const res = await fetch("/api/psn/trophies/toggle", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ show }),
      });
      if (!res.ok) throw new Error("Toggle failed");
      await refreshUser();
      toast({ title: show ? "Trophies shown on profile" : "Trophies hidden from profile", duration: 3000 });
    } catch (error) {
      toast({ title: "Failed to update setting", description: "Please try again.", variant: "destructive" });
    } finally {
      setTogglingPsnTrophies(false);
    }
  };

  const handlePsnDisconnect = async () => {
    setDisconnectingPsn(true);
    try {
      await apiRequest("PATCH", `/api/users/${user!.id}`, {
        playstationUsername: null,
        psnTrophyData: null,
        psnTrophiesLastSync: null,
        showPsnTrophies: false,
        psnTrophyLevel: null,
        psnTotalTrophies: null,
      });
      await refreshUser();
      setShowPsnDisconnectDialog(false);
      toast({ title: "PlayStation disconnected", description: "Your PSN account and trophy data have been removed.", duration: 3000 });
    } catch (error) {
      toast({ title: "Failed to disconnect", description: "Could not disconnect your PSN account. Please try again.", variant: "destructive" });
    } finally {
      setDisconnectingPsn(false);
    }
  };

  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const handleCancelSubscription = async () => {
    setCancelling(true);
    try {
      const response = await apiRequest("POST", "/api/subscription/cancel");
      const data = await response.json();
      
      if (data.success) {
        await refreshCustomerInfo();
        await queryClient.invalidateQueries({ queryKey: ["/api/user"] });
        
        toast({
          title: "Subscription cancelled",
          description: data.message || "Your Pro subscription has been cancelled.",
          variant: "gamefolioSuccess",
        });
        setShowCancelConfirm(false);
      } else if (data.useManagementUrl && customerInfo?.managementURL) {
        window.open(customerInfo.managementURL, '_blank');
        toast({
          title: "Manage subscription",
          description: "Please cancel your subscription through the billing portal.",
        });
        setShowCancelConfirm(false);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel subscription. Please try again.",
        variant: "destructive",
      });
    } finally {
      setCancelling(false);
    }
  };

  const [profileData, setProfileData] = useState({
    displayName: user?.displayName || "",
    bio: user?.bio || "",
    backgroundColor: user?.backgroundColor || "#0B2232",
    accentColor: user?.accentColor || "#4ADE80",
    bannerUrl: user?.bannerUrl || "",
    avatarUrl: user?.avatarUrl || "",
    profileBackgroundType: (user as any)?.profileBackgroundType || "solid",
    profileBackgroundTheme: (user as any)?.profileBackgroundTheme || "default",
    profileBackgroundAnimation: (user as any)?.profileBackgroundAnimation || "none",
    profileBackgroundImageUrl: (user as any)?.profileBackgroundImageUrl || "",
    profileBackgroundPositionX: (user as any)?.profileBackgroundPositionX || "50",
    profileBackgroundPositionY: (user as any)?.profileBackgroundPositionY || "50",
    profileBackgroundZoom: (user as any)?.profileBackgroundZoom || "100",
    profileBackgroundDesktopX: (user as any)?.profileBackgroundDesktopX || "50",
    profileBackgroundDesktopY: (user as any)?.profileBackgroundDesktopY || "50",
    profileBackgroundDesktopZoom: (user as any)?.profileBackgroundDesktopZoom || "100",
    hideBanner: (user as any)?.hideBanner || false,
    profileFont: (user as any)?.profileFont || "default",
    profileFontEffect: (user as any)?.profileFontEffect || "none",
    profileFontAnimation: (user as any)?.profileFontAnimation || "none",
    profileFontColor: (user as any)?.profileFontColor || "#FFFFFF"
  });
  
  const [avatarBorderColor, setAvatarBorderColor] = useState<string>(user?.avatarBorderColor || '#4ADE80');
  const [selectedBorderId, setSelectedBorderId] = useState<number | null>(user?.selectedAvatarBorderId ?? -1);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showBackgroundUpload, setShowBackgroundUpload] = useState(false);
  const [showBgPositionPreview, setShowBgPositionPreview] = useState(false);
  const [pendingBgImageUrl, setPendingBgImageUrl] = useState<string>('');
  const [bgCropTab, setBgCropTab] = useState<'mobile' | 'desktop'>('mobile');
  const isMobile = useMobile();
  const [profilePicTab, setProfilePicTab] = useState<'upload' | 'nft'>(
    user?.activeProfilePicType === 'nft' ? 'nft' : 'upload'
  );
  const [showNftSelector, setShowNftSelector] = useState(false);
  const [showNftPopup, setShowNftPopup] = useState(false);
  const [nftAnchorRect, setNftAnchorRect] = useState<DOMRect | null>(null);
  const [nftPreview, setNftPreview] = useState<{ tokenId: number; image: string; name: string } | null>(null);
  const [viewingNftDetail, setViewingNftDetail] = useState<any>(null);
  const [selectedPreviousAvatar, setSelectedPreviousAvatar] = useState<string | null>(null);
  
  // Name tag state - undefined means no pending change, null means remove tag, number means select tag
  const [pendingNameTagId, setPendingNameTagId] = useState<number | null | undefined>(undefined);
  
  // Verification badge state - same pattern as name tags
  const [pendingVerificationBadgeId, setPendingVerificationBadgeId] = useState<number | null | undefined>(undefined);

  // Font preview dialog state
  const [fontPreviewOpen, setFontPreviewOpen] = useState(false);
  const [previewFontValue, setPreviewFontValue] = useState<string>('default');
  
  // Crop modal state
  const [showCropModal, setShowCropModal] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string>('');
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  
  // Track if banner was manually uploaded to prevent useEffect override
  const [uploadedBannerUrl, setUploadedBannerUrl] = useState<string>('');

  // Track previous avatarUrl to detect successful uploads
  const prevAvatarUrl = React.useRef(user?.avatarUrl);
  const fontPreviewRef = React.useRef<HTMLDivElement>(null);
  // Guard against query refreshes overwriting in-progress appearance edits
  const hasPendingEdits = React.useRef(false);

  const scrollToFontPreview = () => {
    if (window.innerWidth < 768) {
      fontPreviewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };
  
  // Track deactivated avatar URL so preview stays visible but greyed out
  const [deactivatedAvatarUrl, setDeactivatedAvatarUrl] = useState<string | null>(null);

  // Update profile data when user data changes (preserve uploaded banners)
  useEffect(() => {
    if (user) {
      setProfileData(prev => {
        // CRITICAL: Multiple layers of banner preservation
        const hasUploadedBanner = uploadedBannerUrl && uploadedBannerUrl.length > 0;
        const prevHasBanner = prev.bannerUrl && prev.bannerUrl.length > 0;
        const userHasBanner = user.bannerUrl && user.bannerUrl.length > 0;
        
        let finalBannerUrl = "";
        
        if (hasUploadedBanner) {
          if (user.bannerUrl === uploadedBannerUrl) {
            finalBannerUrl = user.bannerUrl;
            setTimeout(() => setUploadedBannerUrl(''), 0);
          } else {
            finalBannerUrl = uploadedBannerUrl;
          }
        } else if (prevHasBanner && !userHasBanner) {
          finalBannerUrl = prev.bannerUrl;
        } else {
          finalBannerUrl = user.bannerUrl || "";
        }
        
        const appearanceFields = hasPendingEdits.current ? {} : {
          backgroundColor: user.backgroundColor || "#0B2232",
          accentColor: user.accentColor || "#4ADE80",
          profileBackgroundType: (user as any)?.profileBackgroundType || "solid",
          profileBackgroundTheme: (user as any)?.profileBackgroundTheme || "default",
          profileBackgroundAnimation: (user as any)?.profileBackgroundAnimation || "none",
          profileBackgroundImageUrl: (user as any)?.profileBackgroundImageUrl || "",
          profileBackgroundPositionX: (user as any)?.profileBackgroundPositionX || "50",
          profileBackgroundPositionY: (user as any)?.profileBackgroundPositionY || "50",
          profileBackgroundZoom: (user as any)?.profileBackgroundZoom || "100",
          profileBackgroundDesktopX: (user as any)?.profileBackgroundDesktopX || "50",
          profileBackgroundDesktopY: (user as any)?.profileBackgroundDesktopY || "50",
          profileBackgroundDesktopZoom: (user as any)?.profileBackgroundDesktopZoom || "100",
          profileFont: (user as any)?.profileFont || "default",
          profileFontEffect: (user as any)?.profileFontEffect || "none",
          profileFontAnimation: (user as any)?.profileFontAnimation || "none",
          profileFontColor: (user as any)?.profileFontColor || "#FFFFFF",
        };

        return {
          ...prev,
          displayName: user.displayName || "",
          bio: user.bio || "",
          bannerUrl: finalBannerUrl,
          avatarUrl: user.avatarUrl || "",
          hideBanner: (user as any)?.hideBanner || false,
          ...appearanceFields,
        };
      });
      
      // Only clear avatar upload state if the avatarUrl actually changed (successful upload)
      if (avatarFile && user.avatarUrl && user.avatarUrl !== prevAvatarUrl.current) {
        console.log('✅ Avatar successfully uploaded, clearing upload state');
        setAvatarFile(null);
        setAvatarPreview('');
        setDeactivatedAvatarUrl(null);
        prevAvatarUrl.current = user.avatarUrl;
      }
      if (user.avatarUrl) {
        setDeactivatedAvatarUrl(null);
      }
    }
  }, [user, uploadedBannerUrl]);

  const [showBackgroundPicker, setShowBackgroundPicker] = useState(false);
  const [showAccentPicker, setShowAccentPicker] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [showBannerUpload, setShowBannerUpload] = useState(false);
  const [showBannerPosition, setShowBannerPosition] = useState(false);
  const [selectedBannerForPosition, setSelectedBannerForPosition] = useState<{
    url: string;
    name: string;
  } | null>(null);
  
  // Helper function to normalize values for comparison
  const normalizeValue = (value: string | null | undefined): string => {
    return value?.trim() || '';
  };

  // Check if there are unsaved changes
  const hasUnsavedChanges = 
    normalizeValue(profileData.displayName) !== normalizeValue(user?.displayName) ||
    normalizeValue(profileData.bio) !== normalizeValue(user?.bio) ||
    profileData.backgroundColor !== (user?.backgroundColor || "#0B2232") ||
    profileData.accentColor !== (user?.accentColor || "#4ADE80") ||
    normalizeValue(profileData.bannerUrl) !== normalizeValue(user?.bannerUrl) ||
    profileData.profileBackgroundType !== ((user as any)?.profileBackgroundType || "solid") ||
    profileData.profileBackgroundTheme !== ((user as any)?.profileBackgroundTheme || "default") ||
    profileData.profileBackgroundAnimation !== ((user as any)?.profileBackgroundAnimation || "none") ||
    normalizeValue(profileData.profileBackgroundImageUrl) !== normalizeValue((user as any)?.profileBackgroundImageUrl) ||
    profileData.profileFont !== ((user as any)?.profileFont || "default") ||
    profileData.profileFontEffect !== ((user as any)?.profileFontEffect || "none") ||
    profileData.profileFontAnimation !== ((user as any)?.profileFontAnimation || "none") ||
    profileData.profileFontColor !== ((user as any)?.profileFontColor || "#FFFFFF") ||
    avatarFile !== null ||
    selectedPreviousAvatar !== null ||
    avatarBorderColor !== (user?.avatarBorderColor || '#4ADE80') ||
    selectedBorderId !== (user?.selectedAvatarBorderId ?? -1) ||
    (pendingNameTagId !== undefined && pendingNameTagId !== user?.selectedNameTagId) ||
    (pendingVerificationBadgeId !== undefined && pendingVerificationBadgeId !== (user as any)?.selectedVerificationBadgeId);
  

  // Handle crop complete callback
  const onCropComplete = useCallback(
    (_: any, croppedPixels: { x: number; y: number; width: number; height: number }) => {
      setCroppedAreaPixels(croppedPixels);
    },
    []
  );

  // Apply the crop and create the final file
  const applyCrop = async () => {
    if (!imageToCrop || !croppedAreaPixels) return;

    try {
      const croppedBlob = await getCroppedImg(imageToCrop, croppedAreaPixels);
      const croppedFile = new File([croppedBlob], 'avatar.jpg', { type: 'image/jpeg' });
      
      setAvatarFile(croppedFile);
      setAvatarPreview(URL.createObjectURL(croppedBlob));
      setShowCropModal(false);
      setImageToCrop('');
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      
      toast({
        title: "Avatar cropped",
        description: "Click 'Save Changes' to upload your new profile picture",
        variant: "gamefolioSuccess",
      });
    } catch (error) {
      console.error('Error cropping image:', error);
      toast({
        title: "Crop failed",
        description: "Failed to crop the image. Please try again.",
        variant: "gamefolioError",
      });
    }
  };

  // Handle avatar file selection - opens crop modal (or directly sets file for Pro GIFs)
  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Profile picture must be less than 5MB",
          variant: "gamefolioError",
        });
        return;
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please select an image file",
          variant: "gamefolioError",
        });
        return;
      }

      console.log('🖼️ Avatar file selected:', file.name, 'Size:', file.size, 'Type:', file.type);
      
      // Check if file is a GIF
      const isGif = file.type === 'image/gif' || file.name.toLowerCase().endsWith('.gif');
      
      if (isGif) {
        if (user?.isPro) {
          console.log('🎬 Pro user uploading GIF - skipping crop to preserve animation');
          setAvatarFile(file);
          setAvatarPreview(URL.createObjectURL(file));
          toast({
            title: "Animated GIF selected",
            description: "Your animated avatar will be preserved. Click 'Save Changes' to upload.",
            variant: "gamefolioSuccess",
          });
          return;
        } else {
          toast({
            title: "Pro feature",
            description: "Animated GIF profile pictures are a Pro perk. Upgrade to Pro to use GIF avatars!",
            variant: "gamefolioError",
          });
          return;
        }
      }
      
      // Create preview URL and open crop modal (for non-GIF or non-Pro GIF uploads)
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageUrl = e.target?.result as string;
        setImageToCrop(imageUrl);
        setShowCropModal(true);
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        console.log('🎯 Opening crop modal');
      };
      reader.readAsDataURL(file);
    }
  };

  // Fetch user's unlocked avatar borders (only borders they have access to)
  const { data: avatarBorders, isLoading: isLoadingBorders } = useQuery({
    queryKey: ['/api/user/avatar-borders'],
    queryFn: getQueryFn({ on401: 'returnNull' }),
    enabled: !!user,
  });
  
  // Fetch user's unlocked name tags
  const { data: userNameTags = [], isLoading: isLoadingNameTags } = useQuery<NameTag[]>({
    queryKey: ['/api/user/name-tags'],
    queryFn: getQueryFn({ on401: 'returnNull' }),
    enabled: !!user,
  });
  
  // Fetch user's unlocked verification badges
  const { data: userVerificationBadges = [], isLoading: isLoadingVerificationBadges } = useQuery<VerificationBadge[]>({
    queryKey: ['/api/user/verification-badges'],
    queryFn: getQueryFn({ on401: 'returnNull' }),
    enabled: !!user,
  });
  
  const { data: ownedNftsData, isLoading: nftsLoading } = useQuery<{ nfts: any[]; count: number }>({
    queryKey: ['/api/nfts/owned'],
    queryFn: getQueryFn({ on401: 'returnNull' }),
    enabled: !!user,
    staleTime: 30000,
  });

  const { data: previousAvatarsData } = useQuery<{ avatars: Array<{ id: number; avatarUrl: string; createdAt: string }> }>({
    queryKey: ['/api/user/previous-avatars'],
    queryFn: getQueryFn({ on401: 'returnNull' }),
    enabled: !!user,
  });

  const { signedUrl: signedAvatarUrl } = useSignedUrl(user?.avatarUrl);
  const { signedUrl: signedDeactivatedAvatarUrl } = useSignedUrl(deactivatedAvatarUrl);
  const { signedUrl: signedSelectedPrevAvatar } = useSignedUrl(selectedPreviousAvatar);
  const { signedUrl: signedBannerUrl } = useSignedUrl(profileData.bannerUrl || null);
  const { signedUrl: signedBgImageUrl } = useSignedUrl(profileData.profileBackgroundImageUrl || null);
  const { signedUrl: signedPendingBgImageUrl } = useSignedUrl(pendingBgImageUrl || null);
  const previousAvatarUrls = React.useMemo(
    () => (previousAvatarsData?.avatars || []).map(a => a.avatarUrl),
    [previousAvatarsData]
  );
  const { getSignedUrl: getPrevAvatarSignedUrl } = useSignedUrls(previousAvatarUrls);

  const setNftProfileMutation = useMutation({
    mutationFn: async ({ tokenId, imageUrl }: { tokenId: number | null; imageUrl?: string }) => {
      const res = await apiRequest('POST', '/api/nft/set-profile-picture', { tokenId, imageUrl });
      return res.json();
    },
    onMutate: (variables) => {
      const previousUser = queryClient.getQueryData(['/api/user']);
      const updater = (oldData: any) => {
        if (!oldData) return oldData;
        if (variables.tokenId === null) {
          return { ...oldData, activeProfilePicType: 'upload' };
        }
        return {
          ...oldData,
          activeProfilePicType: 'nft',
          nftProfileTokenId: variables.tokenId,
          nftProfileImageUrl: variables.imageUrl || null,
        };
      };
      queryClient.setQueryData(['/api/user'], updater);
      if (user?.username) {
        queryClient.setQueryData([`/api/users/${user.username}`], updater);
      }
      setProfilePicTab(variables.tokenId === null ? 'upload' : 'nft');
      return { previousUser };
    },
    onSuccess: (data, variables) => {
      if (variables.tokenId === null && data.restoredAvatarUrl) {
        setProfileData(prev => ({ ...prev, avatarUrl: data.restoredAvatarUrl }));
        const restoreUpdater = (oldData: any) => {
          if (!oldData) return oldData;
          return { ...oldData, avatarUrl: data.restoredAvatarUrl, activeProfilePicType: 'upload' };
        };
        queryClient.setQueryData(['/api/user'], restoreUpdater);
        if (user?.username) {
          queryClient.setQueryData([`/api/users/${user.username}`], restoreUpdater);
        }
      }
      setShowNftSelector(false);
      toast({
        title: variables.tokenId === null ? 'NFT deactivated' : 'Profile picture updated',
        description: variables.tokenId === null ? 'Your uploaded profile picture is now active.' : 'Your NFT profile picture has been set.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      if (user?.username) {
        queryClient.invalidateQueries({ queryKey: [`/api/users/${user.username}`] });
      }
    },
    onError: (err: any, _variables, context) => {
      if (context?.previousUser) {
        queryClient.setQueryData(['/api/user'], context.previousUser);
      }
      toast({ title: 'Failed to set NFT', description: err.message || 'Something went wrong', variant: 'destructive' });
    },
  });

  // Border colour picker visibility
  const [showBorderColorPicker, setShowBorderColorPicker] = useState(false);
  
  // Update selected border when user data loads
  useEffect(() => {
    if (user?.selectedAvatarBorderId !== undefined) {
      setSelectedBorderId(user.selectedAvatarBorderId ?? -1);
    }
    if (user?.avatarBorderColor) {
      setAvatarBorderColor(user.avatarBorderColor);
    }
  }, [user?.selectedAvatarBorderId, user?.avatarBorderColor]);
  
  // Sync pending name tag with user data after save completes
  // When the user's selectedNameTagId matches the pending selection, reset the pending state
  useEffect(() => {
    if (pendingNameTagId !== undefined && pendingNameTagId === user?.selectedNameTagId) {
      setPendingNameTagId(undefined);
    }
  }, [user?.selectedNameTagId, pendingNameTagId]);

  // Sync pending verification badge with user data after save completes
  useEffect(() => {
    if (pendingVerificationBadgeId !== undefined && pendingVerificationBadgeId === (user as any)?.selectedVerificationBadgeId) {
      setPendingVerificationBadgeId(undefined);
    }
  }, [(user as any)?.selectedVerificationBadgeId, pendingVerificationBadgeId]);
  

  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("PATCH", `/api/users/${user?.id}`, data);
      return response.json();
    },
    onSuccess: (updatedUser) => {
      // Save is complete — allow future user refreshes to sync appearance fields again
      hasPendingEdits.current = false;

      // Direct cache update using functional updater to merge with existing cache
      // This preserves fields like selectedNameTagId that aren't returned in the PATCH response
      const cacheUpdater = (oldData: any) => {
        if (!oldData) return updatedUser;
        return {
          ...oldData,  // Preserve existing fields
          ...updatedUser,  // Apply PATCH response updates
          // Always preserve selectedNameTagId from existing cache - it was already updated by the PUT
          selectedNameTagId: oldData.selectedNameTagId,
        };
      };
      queryClient.setQueryData(["/api/user"], cacheUpdater);
      queryClient.setQueryData([`/api/users/${user?.username}`], cacheUpdater);
      
      // Force refresh of all user-related and content queries to ensure UI updates everywhere
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user?.username}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/clips"] });
      queryClient.invalidateQueries({ queryKey: ["/api/comments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      
      setAccentColor(updatedUser.accentColor || profileData.accentColor);
      
      toast({
        title: "Settings updated!",
        description: "Your profile has been successfully updated. Check your Gamefolio!",
        variant: "gamefolioSuccess",
      });
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSave = async () => {
    try {
      let updatedData = { ...profileData };
      let newAvatarUrl: string | null = null;

      // Upload new avatar if a file is selected
      if (avatarFile) {
        setUploadingAvatar(true);
        const formData = new FormData();
        formData.append('avatar', avatarFile);

        const response = await fetch('/api/upload/avatar', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Failed to upload avatar');
        }

        const uploadResult = await response.json();
        newAvatarUrl = uploadResult.avatarUrl;
        updatedData.avatarUrl = newAvatarUrl!;
        
        setAvatarFile(null);
        setAvatarPreview('');
        setUploadingAvatar(false);
      } else if (selectedPreviousAvatar) {
        newAvatarUrl = selectedPreviousAvatar;
        updatedData.avatarUrl = selectedPreviousAvatar;
      }

      // If a new regular avatar is being set, switch to upload mode (either/or)
      if (newAvatarUrl) {
        updatedData.activeProfilePicType = 'upload';
        updatedData.nftProfileImageUrl = null;
        setNftPreview(null);
      }

      // Save current avatar to history before replacing
      if (newAvatarUrl && user?.avatarUrl && user.avatarUrl !== newAvatarUrl) {
        try {
          await apiRequest("POST", "/api/user/previous-avatars", { avatarUrl: user.avatarUrl });
        } catch (e) {
          console.warn("Failed to save previous avatar to history:", e);
        }
      }

      // Save avatar border selection if changed
      if (selectedBorderId !== (user?.selectedAvatarBorderId ?? -1)) {
        await apiRequest("PUT", `/api/user/avatar-border`, { avatarBorderId: selectedBorderId });
        await queryClient.invalidateQueries({ queryKey: ["/api/user"] });
        if (user?.id) {
          await queryClient.invalidateQueries({ queryKey: [`/api/user/${user.id}/avatar-border`] });
        }
      }

      // Save name tag selection if changed
      if (pendingNameTagId !== undefined && pendingNameTagId !== user?.selectedNameTagId) {
        await apiRequest("PUT", "/api/user/name-tag", { nameTagId: pendingNameTagId });
        await queryClient.invalidateQueries({ queryKey: ["/api/user"] });
        if (user?.id) {
          await queryClient.invalidateQueries({ queryKey: ['/api/user', user.id, 'name-tag'] });
        }
      }

      // Save verification badge selection if changed
      if (pendingVerificationBadgeId !== undefined && pendingVerificationBadgeId !== (user as any)?.selectedVerificationBadgeId) {
        await apiRequest("PUT", "/api/user/verification-badge", { badgeId: pendingVerificationBadgeId });
        await queryClient.invalidateQueries({ queryKey: ["/api/user"] });
        if (user?.id) {
          await queryClient.invalidateQueries({ queryKey: ['/api/user', user.id, 'verification-badge'] });
        }
      }

      updateProfileMutation.mutate({ ...updatedData, avatarBorderColor });
      setSelectedPreviousAvatar(null);
      queryClient.invalidateQueries({ queryKey: ['/api/user/previous-avatars'] });
    } catch (error) {
      setUploadingAvatar(false);
      let errorMsg = "Failed to save changes. Please try again.";
      if (error instanceof Error) {
        try {
          const jsonPart = error.message.replace(/^\d+:\s*/, '');
          const parsed = JSON.parse(jsonPart);
          errorMsg = parsed.message || error.message;
        } catch {
          errorMsg = error.message;
        }
      }
      toast({
        title: "Save failed",
        description: errorMsg,
        variant: "destructive",
      });
    }
  };

  const handleBannerSelect = (banner: { url: string; name: string }) => {
    setSelectedBannerForPosition(banner);
    setShowBannerPosition(true);
  };

  const handleBannerPositionApply = (positionData: { positionX: number; positionY: number; scale: number; bannerUrl: string }) => {
    // For now, we'll just apply the banner URL
    // In the future, we could save the positioning data too
    setProfileData(prev => ({ ...prev, bannerUrl: positionData.bannerUrl }));
    setShowBannerPosition(false);
    setSelectedBannerForPosition(null);
    toast({
      title: "Banner positioned!",
      description: `Banner has been positioned. Click "Save Changes" to apply.`,
      variant: "gamefolioSuccess",
    });
  };

  const handleBannerPositionCancel = () => {
    setShowBannerPosition(false);
    setSelectedBannerForPosition(null);
  };


  const handleBgPositionApply = async (data: { positionX: number; positionY: number; zoom: number }, target: 'mobile' | 'desktop' = 'mobile') => {
    try {
      const patch = target === 'mobile'
        ? {
            profileBackgroundImageUrl: pendingBgImageUrl,
            profileBackgroundPositionX: String(data.positionX),
            profileBackgroundPositionY: String(data.positionY),
            profileBackgroundZoom: String(data.zoom),
          }
        : {
            profileBackgroundDesktopX: String(data.positionX),
            profileBackgroundDesktopY: String(data.positionY),
            profileBackgroundDesktopZoom: String(data.zoom),
          };
      await apiRequest("PATCH", `/api/users/${user?.id}`, patch);
      hasPendingEdits.current = false;
      setProfileData(prev => ({ ...prev, ...patch }));
      setShowBgPositionPreview(false);
      setPendingBgImageUrl('');
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user?.username}`] });
    } catch (err: any) {
      toast({ title: "Failed to save position", description: err.message || "Could not save background position.", variant: "destructive" });
    }
  };

  const handleBgPositionCancel = () => {
    setShowBgPositionPreview(false);
    setPendingBgImageUrl('');
  };

  const handleRemoveBackgroundImage = async () => {
    try {
      await apiRequest("PATCH", `/api/users/${user?.id}`, { profileBackgroundImageUrl: "" });
      hasPendingEdits.current = false;
      setProfileData(prev => ({ ...prev, profileBackgroundImageUrl: "" }));
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user?.username}`] });
      toast({ title: "Background removed", description: "Your profile background image has been removed.", variant: "gamefolioSuccess" });
    } catch (err: any) {
      toast({ title: "Failed to remove", description: err.message || "Could not remove background image.", variant: "destructive" });
    }
  };

  const applyPresetTheme = (theme: typeof PRESET_THEMES[0]) => {
    hasPendingEdits.current = true;
    setProfileData(prev => ({
      ...prev,
      accentColor: theme.accentColor,
      backgroundColor: theme.backgroundColor
    }));
    
    setAvatarBorderColor(theme.accentColor);
    
    toast({
      title: "Theme Selected",
      description: `${theme.name} theme selected. Click "Save Changes" to apply.`,
    });
  };

  if (!user) {
    return <div>Please log in to access settings.</div>;
  }

  // Convert hex colors to RGB for opacity support
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };

  const bgRgb = user?.backgroundColor ? hexToRgb(user.backgroundColor) : null;
  const accentRgb = user?.accentColor ? hexToRgb(user.accentColor) : null;

  return (
    <KeyboardAvoidingWrapper 
      className="min-h-screen px-0 py-4 pb-24 md:p-6 md:pb-6"
    >
      <div className="w-full px-3 md:px-4">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation(`/profile/${user.username}`)}
            className="flex items-center gap-2 mb-3"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Profile
          </Button>
          <h1 className="text-xl sm:text-3xl font-bold">Profile & Appearance</h1>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 gap-1">
            <TabsTrigger value="profile" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
              <User className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Profile</span>
              <span className="sm:hidden">Profile</span>
            </TabsTrigger>
            <TabsTrigger value="appearance" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
              <Palette className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Appearance</span>
              <span className="sm:hidden">Appearance</span>
            </TabsTrigger>
            <TabsTrigger value="banners" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
              <Palette className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Banner Images</span>
              <span className="sm:hidden">Banner</span>
            </TabsTrigger>
            <TabsTrigger value="platforms" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
              <Gamepad2 className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Platforms</span>
              <span className="sm:hidden">Platforms</span>
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            {/* Pro Subscription Banner */}
            {user?.isPro && (
              <div className="mb-6 flex items-center px-4 py-3 rounded-lg bg-green-500/20 border border-green-500/40">
                <div className="flex items-center gap-2">
                  <Crown className="h-4 w-4 text-green-400" />
                  <span className="font-medium text-green-400">Pro</span>
                  <span className="text-green-400">-</span>
                  <span className="text-green-400">Active</span>
                </div>
              </div>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Profile Picture Section with Tabs */}
                <div className="space-y-4">
                  <div>
                    <Label className="text-base font-medium">Profile Picture</Label>
                    <p className="text-sm text-muted-foreground hidden md:block">
                      Upload a profile picture that represents you. Recommended size: 400x400 pixels or larger.
                    </p>
                  </div>

                  <div className="flex gap-0 border-b border-border mb-2">
                    {(() => {
                      const isNftActive = user?.activeProfilePicType === 'nft';
                      const isUploadedActive = !isNftActive && !!user?.avatarUrl;
                      return (
                        <>
                          <button
                            type="button"
                            onClick={() => setProfilePicTab('upload')}
                            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 mb-[-1px] transition-colors ${
                              profilePicTab === 'upload'
                                ? 'border-green-500 text-green-400'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            <Camera className="h-4 w-4" />
                            Uploaded
                            {isUploadedActive && (
                              <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-green-500/20 text-green-400 rounded-full">Active</span>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => setProfilePicTab('nft')}
                            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 mb-[-1px] transition-colors ${
                              profilePicTab === 'nft'
                                ? 'border-green-500 text-green-400'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            <Shield className="h-4 w-4" />
                            NFT
                            {isNftActive && (
                              <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-green-500/20 text-green-400 rounded-full">Active</span>
                            )}
                          </button>
                        </>
                      );
                    })()}
                  </div>

                  {profilePicTab === 'upload' && (
                    <div className="space-y-5">
                      <div className="flex flex-col md:flex-row md:items-start space-y-4 md:space-y-0 md:space-x-6">
                        <div className="flex flex-col items-center space-y-3">
                          <div 
                            className={`relative h-48 w-48 flex items-center justify-center ${user?.activeProfilePicType === 'nft' ? 'opacity-60' : (!user?.avatarUrl && deactivatedAvatarUrl) ? 'opacity-40 grayscale' : ''} transition-all`}
                          >
                            <div 
                              className="h-32 w-32 rounded-full overflow-hidden z-10"
                            >
                              <img 
                                src={avatarPreview || signedSelectedPrevAvatar || signedAvatarUrl || signedDeactivatedAvatarUrl || ''} 
                                alt={user?.displayName || 'Profile'}
                                className="w-full h-full object-cover rounded-full"
                              />
                              {!(avatarPreview || signedSelectedPrevAvatar || signedAvatarUrl || signedDeactivatedAvatarUrl) && (
                                <div className="w-full h-full flex items-center justify-center bg-primary/20 text-3xl font-bold rounded-full">
                                  {user?.displayName?.charAt(0) || '?'}
                                </div>
                              )}
                            </div>
                            {selectedBorderId && selectedBorderId !== -1 && avatarBorders && (() => {
                              const border = (avatarBorders as any[])?.find((b: any) => b.id === selectedBorderId);
                              if (!border) return null;
                              
                              return (
                                <InlineSvgBorder
                                  svgUrl={border.imageUrl}
                                  color={avatarBorderColor}
                                  className="absolute inset-0 pointer-events-none [&>svg]:w-full [&>svg]:h-full"
                                  style={{ zIndex: 5 }}
                                />
                              );
                            })()}
                            {selectedBorderId === -1 && (
                              <div 
                                className="absolute rounded-full pointer-events-none"
                                style={{ 
                                  inset: 'calc(50% - 4.25rem)',
                                  border: `4px solid ${avatarBorderColor}`,
                                  boxShadow: `0 0 12px ${avatarBorderColor}50`,
                                  zIndex: 5 
                                }}
                              />
                            )}
                          </div>
                          <div className="text-center flex flex-col items-center gap-1">
                            <span className="text-sm font-medium">
                              {avatarFile ? 'New Preview' : selectedPreviousAvatar ? 'Selected' : (!user?.avatarUrl && deactivatedAvatarUrl) ? 'Deactivated' : 'Current'}
                            </span>
                            {!avatarFile && !selectedPreviousAvatar && (() => {
                              const hasAvatar = !!user?.avatarUrl;
                              const hasDeactivatedAvatar = !hasAvatar && !!deactivatedAvatarUrl;
                              const isUploadActive = hasAvatar && user?.activeProfilePicType !== 'nft';
                              const isNftActive = user?.activeProfilePicType === 'nft';
                              
                              if (isUploadActive) {
                                return (
                                  <button
                                    type="button"
                                    className="group px-3 py-1 text-[10px] font-semibold uppercase tracking-wider rounded-full bg-green-500/20 text-green-400 hover:bg-red-500/20 hover:text-red-400 transition-colors"
                                    onClick={async () => {
                                      try {
                                        setDeactivatedAvatarUrl(user?.avatarUrl || null);
                                        const deactivateUpdate = (oldData: any) => {
                                          if (!oldData) return oldData;
                                          return { ...oldData, avatarUrl: null };
                                        };
                                        queryClient.setQueryData(['/api/user'], deactivateUpdate);
                                        if (user?.username) {
                                          queryClient.setQueryData([`/api/users/${user.username}`], deactivateUpdate);
                                        }
                                        await apiRequest("PATCH", `/api/users/${user?.id}`, { avatarUrl: null });
                                        queryClient.invalidateQueries({ queryKey: ["/api/user"] });
                                        queryClient.invalidateQueries({ queryKey: ["/api/clips"] });
                                        queryClient.invalidateQueries({ queryKey: ["/api/comments"] });
                                        queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
                                        queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
                                        queryClient.invalidateQueries({ queryKey: ["/api/leaderboard"] });
                                        queryClient.invalidateQueries({ queryKey: ["/api/users"] });
                                        toast({ title: "Profile picture deactivated", description: "Your profile picture is no longer active but still saved." });
                                      } catch (e: any) {
                                        toast({ title: "Failed", description: e.message || "Something went wrong", variant: "destructive" });
                                      }
                                    }}
                                  >
                                    <span className="group-hover:hidden">Active</span>
                                    <span className="hidden group-hover:inline">Deactivate</span>
                                  </button>
                                );
                              } else if (hasAvatar && isNftActive) {
                                return (
                                  <button
                                    type="button"
                                    className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider rounded-full bg-slate-500/20 text-slate-400 hover:bg-green-500/20 hover:text-green-400 transition-colors"
                                    onClick={() => {
                                      setNftProfileMutation.mutate({ tokenId: null });
                                    }}
                                    disabled={setNftProfileMutation.isPending}
                                  >
                                    {setNftProfileMutation.isPending ? (
                                      <Loader2 className="h-3 w-3 animate-spin inline" />
                                    ) : (
                                      'Activate'
                                    )}
                                  </button>
                                );
                              } else if (hasDeactivatedAvatar) {
                                return (
                                  <button
                                    type="button"
                                    className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider rounded-full bg-slate-500/20 text-slate-400 hover:bg-green-500/20 hover:text-green-400 transition-colors"
                                    onClick={async () => {
                                      try {
                                        const reactivateUrl = deactivatedAvatarUrl;
                                        const reactivateUpdate = (oldData: any) => {
                                          if (!oldData) return oldData;
                                          return { ...oldData, avatarUrl: reactivateUrl, activeProfilePicType: 'upload' };
                                        };
                                        queryClient.setQueryData(['/api/user'], reactivateUpdate);
                                        if (user?.username) {
                                          queryClient.setQueryData([`/api/users/${user.username}`], reactivateUpdate);
                                        }
                                        await apiRequest("PATCH", `/api/users/${user?.id}`, { avatarUrl: reactivateUrl, activeProfilePicType: 'upload' });
                                        setDeactivatedAvatarUrl(null);
                                        queryClient.invalidateQueries({ queryKey: ["/api/user"] });
                                        queryClient.invalidateQueries({ queryKey: ["/api/clips"] });
                                        queryClient.invalidateQueries({ queryKey: ["/api/comments"] });
                                        queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
                                        queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
                                        queryClient.invalidateQueries({ queryKey: ["/api/leaderboard"] });
                                        queryClient.invalidateQueries({ queryKey: ["/api/users"] });
                                        toast({ title: "Profile picture reactivated", description: "Your uploaded profile picture is now active again." });
                                      } catch (e: any) {
                                        toast({ title: "Failed", description: e.message || "Something went wrong", variant: "destructive" });
                                      }
                                    }}
                                  >
                                    Reactivate
                                  </button>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        </div>
                        
                        <div className="flex-1 space-y-3">
                          <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                            <Button 
                              type="button" 
                              variant="outline" 
                              size="sm"
                              className="relative"
                              onClick={() => document.getElementById('avatar-upload')?.click()}
                              disabled={uploadingAvatar}
                            >
                              <Camera className="h-4 w-4 mr-2" />
                              {uploadingAvatar ? 'Uploading...' : avatarFile ? 'Change Picture' : 'Upload Picture'}
                            </Button>
                            
                            {(avatarFile || selectedPreviousAvatar) && !uploadingAvatar && (
                              <Button 
                                type="button" 
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setAvatarFile(null);
                                  setAvatarPreview('');
                                  setSelectedPreviousAvatar(null);
                                }}
                              >
                                Cancel
                              </Button>
                            )}
                          </div>
                          
                          <input
                            id="avatar-upload"
                            type="file"
                            accept="image/*"
                            onChange={handleAvatarChange}
                            className="hidden"
                          />
                          
                          <div className="text-xs text-muted-foreground space-y-1">
                            <div>• Recommended: 400x400 pixels or larger</div>
                            <div>• Square images work best</div>
                            <div>• Maximum file size: 5MB</div>
                            <div>• Supported formats: JPG, PNG, GIF</div>
                          </div>
                        </div>
                      </div>

                      {previousAvatarsData?.avatars && previousAvatarsData.avatars.length > 0 && (
                        <div className="space-y-3 pt-3 border-t border-slate-700/50">
                          <Label className="text-sm font-medium text-muted-foreground">Previously Uploaded</Label>
                          <div className="flex flex-wrap gap-3">
                            {previousAvatarsData.avatars.map((prev) => {
                              const isSelected = selectedPreviousAvatar === prev.avatarUrl;
                              const isCurrent = user?.avatarUrl === prev.avatarUrl && user?.activeProfilePicType !== 'nft';
                              return (
                                <div key={prev.id} className="flex flex-col items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (isCurrent) return;
                                      setSelectedPreviousAvatar(prev.avatarUrl);
                                      setAvatarFile(null);
                                      setAvatarPreview('');
                                    }}
                                    className={`relative w-16 h-16 rounded-full overflow-hidden border-2 transition-all ${
                                      isSelected
                                        ? 'border-primary ring-2 ring-primary/30 scale-105'
                                        : isCurrent
                                          ? 'border-green-500 ring-2 ring-green-500/30'
                                          : 'border-slate-700 hover:border-slate-500 hover:scale-105'
                                    }`}
                                  >
                                    <img
                                      src={getPrevAvatarSignedUrl(prev.avatarUrl) || prev.avatarUrl}
                                      alt="Previous avatar"
                                      className="w-full h-full object-cover"
                                    />
                                    {isSelected && !isCurrent && (
                                      <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                                        <Check className="h-4 w-4 text-primary" />
                                      </div>
                                    )}
                                  </button>
                                  {isCurrent ? (
                                    <button
                                      type="button"
                                      className="group px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full bg-green-500/20 text-green-400 hover:bg-red-500/20 hover:text-red-400 transition-colors"
                                      onClick={async () => {
                                        try {
                                          setDeactivatedAvatarUrl(user?.avatarUrl || null);
                                          const deactivateUpdate = (oldData: any) => {
                                            if (!oldData) return oldData;
                                            return { ...oldData, avatarUrl: null };
                                          };
                                          queryClient.setQueryData(['/api/user'], deactivateUpdate);
                                          if (user?.username) {
                                            queryClient.setQueryData([`/api/users/${user.username}`], deactivateUpdate);
                                          }
                                          await apiRequest("PATCH", `/api/users/${user?.id}`, { avatarUrl: null });
                                          queryClient.invalidateQueries({ queryKey: ["/api/user"] });
                                          queryClient.invalidateQueries({ queryKey: ["/api/clips"] });
                                          queryClient.invalidateQueries({ queryKey: ["/api/comments"] });
                                          queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
                                          queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
                                          queryClient.invalidateQueries({ queryKey: ["/api/leaderboard"] });
                                          queryClient.invalidateQueries({ queryKey: ["/api/users"] });
                                          toast({ title: "Profile picture deactivated", description: "Your profile picture is no longer active but still saved." });
                                        } catch (e: any) {
                                          toast({ title: "Failed", description: e.message || "Something went wrong", variant: "destructive" });
                                        }
                                      }}
                                    >
                                      <span className="group-hover:hidden">Active</span>
                                      <span className="hidden group-hover:inline">Deactivate</span>
                                    </button>
                                  ) : null}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {profilePicTab === 'nft' && (() => {
                    const previewImage = nftPreview?.image || user?.nftProfileImageUrl;
                    const previewTokenId = nftPreview?.tokenId || user?.nftProfileTokenId;
                    const previewName = nftPreview?.name || (previewTokenId ? `Token #${previewTokenId}` : null);
                    const hasPreview = !!previewImage;

                    return (
                      <div className="flex flex-col md:flex-row md:items-start space-y-4 md:space-y-0 md:space-x-6">
                        <div className="flex flex-col items-center space-y-3 shrink-0">
                          {hasPreview ? (
                            <div
                              className={`w-52 h-52 rounded-xl overflow-hidden border-4 cursor-pointer transition-all ${
                                user?.activeProfilePicType !== 'nft' ? 'opacity-60 hover:opacity-80' : ''
                              }`}
                              style={{
                                borderColor: avatarBorderColor,
                                boxShadow: user?.activeProfilePicType === 'nft' ? `0 0 20px ${avatarBorderColor}40` : 'none'
                              }}
                              onClick={(e) => {
                                if (user?.activeProfilePicType === 'nft') {
                                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                  setNftAnchorRect(rect);
                                  setShowNftPopup(true);
                                } else {
                                  setShowNftSelector(true);
                                }
                              }}
                            >
                              <img
                                src={previewImage}
                                alt={previewName || "NFT Preview"}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <div
                              className="w-52 h-52 rounded-xl overflow-hidden border-2 border-dashed border-slate-600 bg-slate-800/50 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-slate-500 hover:bg-slate-800/70 transition-all"
                              onClick={() => setShowNftSelector(true)}
                            >
                              <Hexagon className="h-14 w-14 text-slate-600" />
                              <span className="text-xs text-slate-500 font-medium">No NFT Selected</span>
                            </div>
                          )}
                          <div className="text-center">
                            <span className="text-sm font-medium">
                              {previewName || 'Preview'}
                            </span>
                          </div>
                          {(() => {
                            const isNftActive = user?.activeProfilePicType === 'nft';
                            if (isNftActive) {
                              return (
                                <button
                                  type="button"
                                  className="group px-3 py-1 text-[10px] font-semibold uppercase tracking-wider rounded-full bg-green-500/20 text-green-400 hover:bg-red-500/20 hover:text-red-400 transition-colors"
                                  onClick={() => setNftProfileMutation.mutate({ tokenId: null })}
                                  disabled={setNftProfileMutation.isPending}
                                >
                                  {setNftProfileMutation.isPending ? (
                                    <Loader2 className="h-3 w-3 animate-spin inline" />
                                  ) : (
                                    <>
                                      <span className="group-hover:hidden">Active</span>
                                      <span className="hidden group-hover:inline">Deactivate</span>
                                    </>
                                  )}
                                </button>
                              );
                            } else if (hasPreview && previewTokenId) {
                              return (
                                <button
                                  type="button"
                                  className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider rounded-full bg-slate-500/20 text-slate-400 hover:bg-green-500/20 hover:text-green-400 transition-colors"
                                  onClick={() => {
                                    setNftProfileMutation.mutate({
                                      tokenId: previewTokenId,
                                      imageUrl: previewImage || '',
                                    });
                                  }}
                                  disabled={setNftProfileMutation.isPending}
                                >
                                  {setNftProfileMutation.isPending ? (
                                    <Loader2 className="h-3 w-3 animate-spin inline" />
                                  ) : (
                                    'Activate'
                                  )}
                                </button>
                              );
                            }
                            return null;
                          })()}
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowNftSelector(true)}
                            className="border-green-500/30 text-green-400 hover:bg-green-500/10 w-full"
                          >
                            <Hexagon className="h-4 w-4 mr-2" />
                            {user?.activeProfilePicType === 'nft' ? 'Change NFT' : 'Select NFT'}
                          </Button>
                        </div>

                        <div className="flex-1 space-y-3">
                          {user?.activeProfilePicType !== 'nft' && (
                            <p className="text-sm text-muted-foreground">Select an NFT from your collection to use as your profile picture. Your NFT will be displayed as a square image with rounded corners.</p>
                          )}
                          <div className="text-xs text-muted-foreground space-y-1">
                            <div>• NFT profile pictures appear as square with rounded corners</div>
                            <div>• Only unsold NFTs from your collection can be used</div>
                            <div>• You can change or remove your NFT profile picture anytime</div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Profile Picture Border Selection Section */}
                <div className="space-y-4 pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <Label className="text-base font-medium">Profile Picture Border</Label>
                  </div>
                  {user?.activeProfilePicType === 'nft' ? (
                    <div className="p-4 bg-muted/30 rounded-lg border flex items-center gap-3">
                      <Lock className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium">Borders unavailable with NFT profile</p>
                        <p className="text-xs text-muted-foreground">
                          Profile picture borders cannot be used while an NFT is set as your profile picture. Switch to an uploaded photo to use borders.
                        </p>
                      </div>
                    </div>
                  ) : (
                  <>
                  <p className="text-sm text-muted-foreground">
                    Select a border from your unlocked rewards to customize your profile picture.
                  </p>

                  {/* Current Border Preview */}
                  <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg border">
                    {user?.activeProfilePicType === 'nft' && user?.nftProfileImageUrl ? (
                      <div className="relative flex items-center justify-center">
                        <div
                          className="h-32 w-32 rounded-xl overflow-hidden border-4"
                          style={{ borderColor: avatarBorderColor, boxShadow: `0 0 20px ${avatarBorderColor}40` }}
                        >
                          <img
                            src={user.nftProfileImageUrl}
                            alt="NFT Preview"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="relative h-48 w-48 flex items-center justify-center">
                        <div 
                          className="h-32 w-32 rounded-full overflow-hidden z-10"
                        >
                          {(avatarPreview || signedSelectedPrevAvatar || signedAvatarUrl || signedDeactivatedAvatarUrl) ? (
                            <img 
                              src={avatarPreview || signedSelectedPrevAvatar || signedAvatarUrl || signedDeactivatedAvatarUrl || ""} 
                              alt="Preview" 
                              className="w-full h-full object-cover rounded-full"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-primary/20 text-foreground font-semibold text-xl rounded-full">
                              {user?.username?.substring(0, 2).toUpperCase() || "U"}
                            </div>
                          )}
                        </div>
                        {selectedBorderId && selectedBorderId !== -1 && avatarBorders && (() => {
                          const border = (avatarBorders as any[])?.find((b: any) => b.id === selectedBorderId);
                          return border ? (
                            <InlineSvgBorder
                              svgUrl={border.imageUrl}
                              color={avatarBorderColor}
                              className="absolute inset-0 pointer-events-none [&>svg]:w-full [&>svg]:h-full"
                              style={{ zIndex: 5 }}
                            />
                          ) : null;
                        })()}
                        {selectedBorderId === -1 && (
                          <div 
                            className="absolute inset-[calc(50%-4.25rem)] rounded-full pointer-events-none"
                            style={{ 
                              border: `4px solid ${avatarBorderColor}`,
                              boxShadow: `0 0 12px ${avatarBorderColor}50`,
                              zIndex: 5 
                            }}
                          />
                        )}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium">Preview</p>
                      <p className="text-xs text-muted-foreground">
                        {user?.activeProfilePicType === 'nft'
                          ? 'NFT Profile Picture'
                          : selectedBorderId === -1
                            ? 'Solid Border'
                            : selectedBorderId && avatarBorders 
                              ? (avatarBorders as any[])?.find((b: any) => b.id === selectedBorderId)?.name || "Selected"
                              : "None"}
                      </p>
                    </div>
                  </div>

                  {/* Loading State */}
                  {isLoadingBorders && (
                    <div className="p-4 flex items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  )}

                  {/* Unlocked Borders Grid with Category Tabs */}
                  {!isLoadingBorders && (
                    <Tabs defaultValue="static" className="w-full">
                      <TabsList className="w-full grid grid-cols-2 mb-4">
                        <TabsTrigger value="static" className="text-xs md:text-sm">Static</TabsTrigger>
                        <TabsTrigger value="animated" className="text-xs md:text-sm relative">
                          {!user?.isPro && (
                            <img 
                              src="/assets/pro-badge.png" 
                              alt="PRO" 
                              className="absolute -top-4 left-1/2 -translate-x-1/2 h-5 w-auto"
                            />
                          )}
                          Animated
                        </TabsTrigger>
                      </TabsList>
                      
                      {['static', 'animated'].map((category) => {
                        const isProRequired = category === 'animated';
                        const isLocked = isProRequired && !user?.isPro;
                        
                        return (
                          <TabsContent key={category} value={category} className="mt-0">
                            {/* Pro lock overlay for animated borders */}
                            {isLocked && (
                              <div className="mb-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg flex items-center gap-2">
                                <Lock className="h-4 w-4 text-green-500" />
                                <span className="text-sm text-green-500">Upgrade to Gamefolio Pro to unlock animated borders</span>
                              </div>
                            )}
                            
                            <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                              {/* Solid border - default option, always first */}
                              {category === 'static' && (
                                <div
                                  data-testid="border-select-solid"
                                  className={`
                                    cursor-pointer rounded-md border-2 p-2 relative transition-all flex flex-col items-center
                                    ${selectedBorderId === -1 ? 'border-primary ring-2 ring-primary/50 bg-primary/10' : 'border-muted hover:border-primary/50'}
                                  `}
                                  onClick={() => {
                                    setSelectedBorderId(-1);
                                  }}
                                >
                                  <div className="relative w-16 h-16 flex items-center justify-center">
                                    <div className="w-10 h-10 rounded-full bg-muted" />
                                    <div 
                                      className="absolute rounded-full"
                                      style={{ 
                                        width: '2.75rem', 
                                        height: '2.75rem',
                                        border: '4px solid #ffffff',
                                        top: '50%',
                                        left: '50%',
                                        transform: 'translate(-50%, -50%)'
                                      }}
                                    />
                                  </div>
                                  <span className="text-xs text-center mt-1 truncate w-full">Solid</span>
                                </div>
                              )}

                              {/* None option - after solid */}
                              {category === 'static' && (
                                <div
                                  data-testid="border-select-none"
                                  className={`
                                    cursor-pointer rounded-md border-2 p-3 relative transition-all flex flex-col items-center justify-center
                                    ${selectedBorderId === null ? 'border-primary ring-2 ring-primary/50 bg-primary/10' : 'border-muted hover:border-primary/50'}
                                  `}
                                  onClick={() => {
                                    setSelectedBorderId(null);
                                  }}
                                >
                                  <X className="h-8 w-8 text-muted-foreground mb-1" />
                                  <span className="text-xs text-muted-foreground">None</span>
                                </div>
                              )}
                              
                              {((avatarBorders as any[]) || [])
                                .filter((border: any) => (border.category || 'static') === category)
                                .map((border: any) => (
                                  <div
                                    key={border.id}
                                    data-testid={`border-select-${border.id}`}
                                    className={`
                                      rounded-md border-2 p-2 relative transition-all flex flex-col items-center
                                      ${isLocked ? 'cursor-default border-muted' : 'cursor-pointer ' + (selectedBorderId === border.id ? 'border-primary ring-2 ring-primary/50 bg-primary/10' : 'border-muted hover:border-primary/50')}
                                    `}
                                    onClick={() => {
                                      if (isLocked) return;
                                      setSelectedBorderId(selectedBorderId === border.id ? null : border.id);
                                    }}
                                  >
                                    <div className="relative w-16 h-16 flex items-center justify-center">
                                      <div className="w-10 h-10 rounded-full bg-muted" />
                                      <InlineSvgBorder
                                        svgUrl={border.imageUrl}
                                        color="#ffffff"
                                        className="absolute inset-0 pointer-events-none [&>svg]:w-full [&>svg]:h-full"
                                      />
                                      {isLocked && (
                                        <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center">
                                          <Lock className="h-5 w-5 text-green-400" />
                                        </div>
                                      )}
                                    </div>
                                    <span className="text-xs text-center mt-1 truncate w-full">
                                      {border.name}
                                    </span>
                                    {isLocked && (
                                      <span className="text-[10px] text-green-500 text-center leading-tight mt-0.5">Upgrade Pro</span>
                                    )}
                                  </div>
                                ))}
                              
                              {/* Empty state for category */}
                              {((avatarBorders as any[]) || []).filter((border: any) => (border.category || 'static') === category).length === 0 && category !== 'static' && (
                                <div className="col-span-full p-4 text-center text-sm text-muted-foreground">
                                  No {category} borders unlocked yet
                                </div>
                              )}
                            </div>
                          </TabsContent>
                        );
                      })}
                    </Tabs>
                  )}
                  
                  {/* Border Color Picker - shown when a border is selected */}
                  {selectedBorderId && (
                    <div className="mt-4 pt-4 border-t space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Palette className="h-4 w-4 text-muted-foreground" />
                          <Label className="text-sm font-medium">Border Color</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-8 h-8 rounded-full border-2 border-white cursor-pointer transition-all hover:scale-110"
                            style={{ 
                              backgroundColor: avatarBorderColor,
                              boxShadow: `0 0 10px ${avatarBorderColor}60`
                            }}
                            onClick={() => setShowBorderColorPicker(!showBorderColorPicker)}
                            data-testid="border-color-swatch"
                          />
                          <span className="text-xs font-mono text-muted-foreground">{avatarBorderColor}</span>
                        </div>
                      </div>
                      
                      {showBorderColorPicker && (
                        <div className="space-y-3 p-3 bg-muted/30 rounded-lg border">
                          <HexColorPicker 
                            color={avatarBorderColor} 
                            onChange={setAvatarBorderColor}
                            style={{ width: '100%' }}
                          />
                          <div className="flex items-center gap-2">
                            <div className="flex-1 text-sm font-mono bg-background border rounded px-3 py-2">
                              {avatarBorderColor}
                            </div>
                            <Button 
                              size="sm"
                              onClick={() => setShowBorderColorPicker(false)}
                              data-testid="border-color-save"
                            >
                              Done
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Click "Save Changes" to apply this colour to your profile.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                  </>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="displayName">Display Name</Label>
                    <span className={`text-xs ${profileData.displayName.length >= 30 ? 'text-destructive' : 'text-muted-foreground'}`}>
                      {profileData.displayName.length}/30
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      id="displayName"
                      value={profileData.displayName}
                      onChange={(e) => setProfileData(prev => ({ ...prev, displayName: e.target.value.slice(0, 30) }))}
                      placeholder="Your display name"
                      maxLength={30}
                      className="flex-1"
                    />
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="icon" type="button" title="Add emoji">
                          <Smile className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-72 p-3" align="end">
                        <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                          {EMOJI_CATEGORIES.map((category) => (
                            <div key={category.label}>
                              <p className="text-xs font-semibold text-muted-foreground mb-1">{category.label}</p>
                              <div className="flex flex-wrap gap-1">
                                {category.emojis.map((emoji) => (
                                  <button
                                    key={emoji}
                                    type="button"
                                    className="text-lg hover:bg-accent rounded p-0.5 transition-colors cursor-pointer"
                                    onClick={() => setProfileData(prev => ({ ...prev, displayName: (prev.displayName + emoji).slice(0, 30) }))}
                                    title={emoji}
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={profileData.bio}
                    onChange={(e) => setProfileData(prev => ({ ...prev, bio: e.target.value }))}
                    placeholder="Tell people about yourself..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Appearance Tab */}
          <TabsContent value="appearance">
            <div className="relative">
              <Tabs defaultValue="themes" className="w-full">
                <TabsList className="grid w-full grid-cols-5 mb-6">
                  <TabsTrigger value="themes" className="text-xs sm:text-sm px-1">
                    <Palette className="h-4 w-4 mr-0.5 sm:mr-1" />
                    <span className="hidden sm:inline">Themes</span>
                    <span className="sm:hidden">Theme</span>
                  </TabsTrigger>
                  <TabsTrigger value="background" className="text-xs sm:text-sm px-1">
                    <span className="hidden sm:inline">Background</span>
                    <span className="sm:hidden">BG</span>
                  </TabsTrigger>
                  <TabsTrigger value="fonts" className="text-xs sm:text-sm px-1">
                    <span className="hidden sm:inline">Fonts</span>
                    <span className="sm:hidden">Font</span>
                  </TabsTrigger>
                  <TabsTrigger value="nametags" className="text-xs sm:text-sm px-1">
                    <Sparkles className="h-4 w-4 mr-0.5 sm:mr-1" />
                    <span className="hidden sm:inline">Name Tags</span>
                    <span className="sm:hidden">Tags</span>
                  </TabsTrigger>
                  <TabsTrigger value="badges" className="text-xs sm:text-sm px-1">
                    <Shield className="h-4 w-4 mr-0.5 sm:mr-1" />
                    <span className="hidden sm:inline">Badges</span>
                    <span className="sm:hidden">Badge</span>
                  </TabsTrigger>
                </TabsList>

                {/* Themes Sub-tab */}
                <TabsContent value="themes">
                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          Quick Themes
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          {PRESET_THEMES.map((theme) => {
                            const topColor = theme.gradientTopColor || '#0B2232';
                            return (
                              <div
                                key={theme.name}
                                className="cursor-pointer rounded-lg border-2 border-transparent hover:border-primary/50 transition-colors"
                                onClick={() => applyPresetTheme(theme)}
                              >
                                <div
                                  className="h-20 rounded-lg flex items-center justify-center text-white font-medium text-sm"
                                  style={{ 
                                    background: `linear-gradient(180deg, ${topColor} 0%, ${theme.backgroundColor} 60%, ${theme.backgroundColor} 100%)`
                                  }}
                                >
                                  <div
                                    className="w-8 h-8 rounded-full border-2 border-white"
                                    style={{ backgroundColor: theme.accentColor }}
                                  />
                                </div>
                                <p className="text-center mt-2 text-sm font-medium">{theme.name}</p>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>

                  </div>
                </TabsContent>

                {/* Background Sub-tab */}
                <TabsContent value="background">
                  <div className="space-y-6">
                    <div
                      className="transition-opacity duration-300"
                      style={{ opacity: profileData.profileBackgroundImageUrl ? 0.4 : 1, pointerEvents: profileData.profileBackgroundImageUrl ? 'none' : 'auto' }}
                    >
                    {profileData.profileBackgroundImageUrl && (
                      <div className="mb-3 px-3 py-2 rounded-md bg-muted text-xs text-muted-foreground border border-border">
                        Your background image is active — remove it to use a colour instead.
                      </div>
                    )}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: profileData.backgroundColor }} />
                          Background Color
                        </CardTitle>
                        <CardDescription>
                          Choose a background color for your profile page.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-col sm:flex-row gap-6 items-start">
                          <HexColorPicker
                            color={profileData.backgroundColor}
                            onChange={(color) => { hasPendingEdits.current = true; setProfileData(prev => ({ ...prev, backgroundColor: color })); }}
                          />
                          <div className="space-y-3 flex-1">
                            <div className="flex items-center gap-2">
                              <Label className="text-sm font-medium">Hex Code</Label>
                              <Input
                                value={profileData.backgroundColor}
                                onChange={(e) => { hasPendingEdits.current = true; setProfileData(prev => ({ ...prev, backgroundColor: e.target.value })); }}
                                className="w-32 font-mono text-sm"
                                placeholder="#0B2232"
                              />
                            </div>
                            <div
                              className="w-full h-24 rounded-lg border border-border"
                              style={{ backgroundColor: profileData.backgroundColor }}
                            />
                            <p className="text-xs text-muted-foreground">
                              This color will be used as the background gradient on your profile.
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    </div>

                    {showBackgroundUpload && (
                      <BackgroundUploadPreview
                        onUpload={async (url, mobilePos, desktopPos) => {
                          try {
                            await apiRequest("PATCH", `/api/users/${user?.id}`, {
                              profileBackgroundImageUrl: url,
                              profileBackgroundPositionX: mobilePos.positionX,
                              profileBackgroundPositionY: mobilePos.positionY,
                              profileBackgroundZoom: mobilePos.zoom,
                              profileBackgroundDesktopX: desktopPos.positionX,
                              profileBackgroundDesktopY: desktopPos.positionY,
                              profileBackgroundDesktopZoom: desktopPos.zoom,
                            });
                            hasPendingEdits.current = false;
                            setProfileData(prev => ({
                              ...prev,
                              profileBackgroundImageUrl: url,
                              profileBackgroundPositionX: mobilePos.positionX,
                              profileBackgroundPositionY: mobilePos.positionY,
                              profileBackgroundZoom: mobilePos.zoom,
                              profileBackgroundDesktopX: desktopPos.positionX,
                              profileBackgroundDesktopY: desktopPos.positionY,
                              profileBackgroundDesktopZoom: desktopPos.zoom,
                            }));
                            queryClient.invalidateQueries({ queryKey: ['/api/user'] });
                            queryClient.invalidateQueries({ queryKey: [`/api/users/${user?.username}`] });
                            toast({ title: "Background uploaded!", description: "Your background image has been saved.", variant: "gamefolioSuccess" });
                          } catch (err: any) {
                            toast({ title: "Failed to save", description: err.message || "Could not save background image.", variant: "destructive" });
                          }
                          setShowBackgroundUpload(false);
                        }}
                        onCancel={() => setShowBackgroundUpload(false)}
                      />
                    )}

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          Background Image
                        </CardTitle>
                        <CardDescription>
                          Upload a custom image to use as your profile background. This will replace the color gradient.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {showBgPositionPreview && (signedPendingBgImageUrl || pendingBgImageUrl) ? (
                            <div className="space-y-3">
                              <Tabs value={bgCropTab} onValueChange={(v) => setBgCropTab(v as 'mobile' | 'desktop')}>
                                <TabsList className="w-full">
                                  {isMobile ? (
                                    <>
                                      <TabsTrigger value="mobile" className="flex-1">Mobile Crop</TabsTrigger>
                                      <TabsTrigger value="desktop" className="flex-1" disabled>Desktop Crop <span className="text-xs ml-1 opacity-60">(desktop only)</span></TabsTrigger>
                                    </>
                                  ) : (
                                    <>
                                      <TabsTrigger value="desktop" className="flex-1">Desktop Crop</TabsTrigger>
                                      <TabsTrigger value="mobile" className="flex-1">Mobile Crop</TabsTrigger>
                                    </>
                                  )}
                                </TabsList>
                                <TabsContent value="mobile" className="mt-3">
                                  <BackgroundPositionPreview
                                    imageUrl={signedPendingBgImageUrl || pendingBgImageUrl}
                                    label="Mobile Background Position"
                                    aspectRatio="9/16"
                                    initialPositionX={Number(profileData.profileBackgroundPositionX) || 50}
                                    initialPositionY={Number(profileData.profileBackgroundPositionY) || 50}
                                    initialZoom={Number(profileData.profileBackgroundZoom) || 100}
                                    onApply={(data) => handleBgPositionApply(data, 'mobile')}
                                    onCancel={handleBgPositionCancel}
                                  />
                                </TabsContent>
                                <TabsContent value="desktop" className="mt-3">
                                  <BackgroundPositionPreview
                                    imageUrl={signedPendingBgImageUrl || pendingBgImageUrl}
                                    label="Desktop Background Position"
                                    initialPositionX={Number(profileData.profileBackgroundDesktopX) || 50}
                                    initialPositionY={Number(profileData.profileBackgroundDesktopY) || 50}
                                    initialZoom={Number(profileData.profileBackgroundDesktopZoom) || 100}
                                    readOnly={isMobile}
                                    onApply={(data) => handleBgPositionApply(data, 'desktop')}
                                    onCancel={handleBgPositionCancel}
                                  />
                                </TabsContent>
                              </Tabs>
                            </div>
                          ) : (
                            <>
                              <Tabs defaultValue={isMobile ? "mobile" : "desktop"}>
                                <TabsList className="w-full">
                                  {isMobile ? (
                                    <>
                                      <TabsTrigger value="mobile" className="flex-1">Mobile</TabsTrigger>
                                      <TabsTrigger value="desktop" className="flex-1" disabled>Desktop <span className="text-xs ml-1 opacity-60">(desktop only)</span></TabsTrigger>
                                    </>
                                  ) : (
                                    <>
                                      <TabsTrigger value="desktop" className="flex-1">Desktop</TabsTrigger>
                                      <TabsTrigger value="mobile" className="flex-1">Mobile</TabsTrigger>
                                    </>
                                  )}
                                </TabsList>
                                <TabsContent value="mobile" className="mt-3 flex justify-center">
                                  {(signedBgImageUrl || profileData.profileBackgroundImageUrl) ? (
                                    <div className="relative aspect-[9/16] w-36 rounded-lg overflow-hidden border-2 border-primary">
                                      <img
                                        src={signedBgImageUrl || profileData.profileBackgroundImageUrl}
                                        alt="Mobile background preview"
                                        className="w-full h-full object-cover"
                                        style={{ objectPosition: `${profileData.profileBackgroundPositionX || 50}% ${profileData.profileBackgroundPositionY || 50}%` }}
                                      />
                                      <div className="absolute top-2 left-2">
                                        <span className="inline-flex items-center gap-1 bg-primary text-primary-foreground text-xs font-semibold px-2 py-0.5 rounded-full">
                                          <Check className="h-3 w-3" />
                                          Active
                                        </span>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="aspect-[9/16] w-36 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-muted/20">
                                      <p className="text-sm text-muted-foreground text-center px-2">No image set</p>
                                    </div>
                                  )}
                                </TabsContent>
                                <TabsContent value="desktop" className="mt-3 flex justify-center">
                                  {(signedBgImageUrl || profileData.profileBackgroundImageUrl) ? (
                                    <div className="relative aspect-[16/9] w-full max-w-sm rounded-lg overflow-hidden border-2 border-primary">
                                      <img
                                        src={signedBgImageUrl || profileData.profileBackgroundImageUrl}
                                        alt="Desktop background preview"
                                        className="w-full h-full object-cover"
                                        style={{ objectPosition: `${profileData.profileBackgroundDesktopX || 50}% ${profileData.profileBackgroundDesktopY || 50}%` }}
                                      />
                                      <div className="absolute top-2 left-2">
                                        <span className="inline-flex items-center gap-1 bg-primary text-primary-foreground text-xs font-semibold px-2 py-0.5 rounded-full">
                                          <Check className="h-3 w-3" />
                                          Active
                                        </span>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="aspect-[16/9] w-full max-w-sm rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-muted/20">
                                      <p className="text-sm text-muted-foreground text-center px-2">No image set</p>
                                    </div>
                                  )}
                                </TabsContent>
                              </Tabs>
                              <div className="flex gap-2 flex-wrap">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setShowBackgroundUpload(true)}
                                >
                                  {profileData.profileBackgroundImageUrl ? 'Change Image' : 'Upload Image'}
                                </Button>
                                {profileData.profileBackgroundImageUrl && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setPendingBgImageUrl(profileData.profileBackgroundImageUrl);
                                      setBgCropTab(isMobile ? 'mobile' : 'desktop');
                                      setShowBgPositionPreview(true);
                                    }}
                                  >
                                    Adjust Position
                                  </Button>
                                )}
                                {profileData.profileBackgroundImageUrl && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="text-destructive hover:text-destructive"
                                    onClick={handleRemoveBackgroundImage}
                                  >
                                    Remove Image
                                  </Button>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Supports JPG, PNG, WebP. Recommended size: 1080×1920 (9:16 portrait).
                              </p>
                            </>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                  </div>
                </TabsContent>

                {/* Fonts Sub-tab */}
                <TabsContent value="fonts">
                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          Profile Font & Effects
                        </CardTitle>
                        <CardDescription>
                          Choose a font style and effect for your profile display name.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {(() => {
                            const selectedFont = FONT_OPTIONS.find(f => f.value === profileData.profileFont);
                            const selectedEffect = FONT_EFFECTS.find(f => f.value === profileData.profileFontEffect);
                            const selectedAnim = FONT_ANIMATIONS.find(f => f.value === profileData.profileFontAnimation);
                            const fontFamily = selectedFont?.family || 'system-ui, sans-serif';
                            const fontScale = selectedFont?.scale || 1;
                            const textShadow = selectedEffect?.textShadow || 'none';
                            const animClass = selectedAnim?.animClass || '';
                            return (
                              <div ref={fontPreviewRef} className="p-4 bg-muted/30 rounded-lg w-full flex flex-col items-center">
                                <p
                                  className={`font-bold text-center ${animClass}`}
                                  style={{ fontFamily, textShadow, fontSize: `${1.875 * fontScale}rem`, lineHeight: `${2.25 * fontScale}rem`, color: profileData.profileFontColor }}
                                >
                                  {profileData.displayName || user?.displayName || user?.username || 'Your Name'}
                                </p>
                                <p className="text-xs text-muted-foreground mt-3">
                                  {selectedFont?.label || 'Default'}{selectedEffect && selectedEffect.value !== 'none' ? ` · ${selectedEffect.label}` : ''}{selectedAnim && selectedAnim.value !== 'none' ? ` · ${selectedAnim.label}` : ''}
                                </p>
                              </div>
                            );
                          })()}

                          <Tabs defaultValue="font-list" className="w-full">
                            <TabsList className="w-full grid grid-cols-4">
                              <TabsTrigger value="font-list">Fonts</TabsTrigger>
                              <TabsTrigger value="effect-list">Effects</TabsTrigger>
                              <TabsTrigger value="animation-list">Animation</TabsTrigger>
                              <TabsTrigger value="fill-list">Fill</TabsTrigger>
                            </TabsList>

                            <TabsContent value="font-list" className="mt-4">
                              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                                {FONT_OPTIONS.map((font) => {
                                  const isSelected = profileData.profileFont === font.value;
                                  return (
                                    <button
                                      key={font.value}
                                      type="button"
                                      onClick={() => { hasPendingEdits.current = true; setProfileData(prev => ({ ...prev, profileFont: font.value })); scrollToFontPreview(); }}
                                      className={`p-2 sm:p-4 rounded-lg border-2 text-left transition-all ${
                                        isSelected
                                          ? 'border-primary bg-primary/10'
                                          : 'border-border hover:border-primary/50 hover:bg-muted/50'
                                      }`}
                                    >
                                      <p
                                        className="text-sm sm:text-lg font-semibold mb-1 truncate"
                                        style={{ fontFamily: font.family }}
                                      >
                                        {font.label}
                                      </p>
                                      <p
                                        className="text-xs text-muted-foreground truncate"
                                        style={{ fontFamily: font.family }}
                                      >
                                        {profileData.displayName || user?.displayName || 'Your Name'}
                                      </p>
                                    </button>
                                  );
                                })}
                              </div>
                            </TabsContent>

                            <TabsContent value="effect-list" className="mt-4">
                              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                                {FONT_EFFECTS.map((effect) => {
                                  const isSelected = profileData.profileFontEffect === effect.value;
                                  return (
                                    <button
                                      key={effect.value}
                                      type="button"
                                      onClick={() => { hasPendingEdits.current = true; setProfileData(prev => ({ ...prev, profileFontEffect: effect.value })); scrollToFontPreview(); }}
                                      className={`p-3 rounded-lg border-2 text-center transition-all ${
                                        isSelected
                                          ? 'border-primary bg-primary/10'
                                          : 'border-border hover:border-primary/50 hover:bg-muted/50'
                                      }`}
                                    >
                                      <p
                                        className="text-sm font-bold text-white truncate"
                                        style={{ textShadow: effect.textShadow }}
                                      >
                                        {effect.label}
                                      </p>
                                    </button>
                                  );
                                })}
                              </div>
                            </TabsContent>

                            <TabsContent value="animation-list" className="mt-4">
                              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                                {FONT_ANIMATIONS.map((anim) => {
                                  const isSelected = profileData.profileFontAnimation === anim.value;
                                  return (
                                    <button
                                      key={anim.value}
                                      type="button"
                                      onClick={() => { hasPendingEdits.current = true; setProfileData(prev => ({ ...prev, profileFontAnimation: anim.value })); scrollToFontPreview(); }}
                                      className={`p-3 rounded-lg border-2 text-center transition-all ${
                                        isSelected
                                          ? 'border-primary bg-primary/10'
                                          : 'border-border hover:border-primary/50 hover:bg-muted/50'
                                      }`}
                                    >
                                      <p className={`text-sm font-bold text-white truncate ${anim.animClass}`}>
                                        {anim.label}
                                      </p>
                                    </button>
                                  );
                                })}
                              </div>
                            </TabsContent>

                            <TabsContent value="fill-list" className="mt-4">
                              <div className="flex flex-col items-center gap-4">
                                <HexColorPicker
                                  color={profileData.profileFontColor}
                                  onChange={(color) => { hasPendingEdits.current = true; setProfileData(prev => ({ ...prev, profileFontColor: color })); scrollToFontPreview(); }}
                                  style={{ width: '100%', maxWidth: '280px' }}
                                />
                                <div className="flex items-center gap-3 w-full max-w-xs">
                                  <div className="w-8 h-8 rounded border border-border flex-shrink-0" style={{ backgroundColor: profileData.profileFontColor }} />
                                  <input
                                    type="text"
                                    value={profileData.profileFontColor}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) {
                                        hasPendingEdits.current = true;
                                        setProfileData(prev => ({ ...prev, profileFontColor: val }));
                                        if (val.length === 7) scrollToFontPreview();
                                      }
                                    }}
                                    className="flex-1 bg-background border border-border rounded px-3 py-1.5 text-sm font-mono"
                                    placeholder="#FFFFFF"
                                    maxLength={7}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => { hasPendingEdits.current = true; setProfileData(prev => ({ ...prev, profileFontColor: '#FFFFFF' })); scrollToFontPreview(); }}
                                    className="text-xs text-muted-foreground hover:text-foreground px-2 py-1.5 border border-border rounded"
                                  >
                                    Reset
                                  </button>
                                </div>
                                <div className="flex flex-wrap gap-2 justify-center">
                                  {['#FFFFFF', '#000000', '#FF0000', '#00FF00', '#0099FF', '#FF00FF', '#FFFF00', '#FF8800', '#00FFFF', '#FF69B4', '#7B68EE', '#4ADE80'].map(preset => (
                                    <button
                                      key={preset}
                                      type="button"
                                      onClick={() => { hasPendingEdits.current = true; setProfileData(prev => ({ ...prev, profileFontColor: preset })); scrollToFontPreview(); }}
                                      className="w-7 h-7 rounded-full border-2 transition-transform hover:scale-110"
                                      style={{ backgroundColor: preset, borderColor: profileData.profileFontColor === preset ? 'white' : 'transparent' }}
                                      title={preset}
                                    />
                                  ))}
                                </div>
                              </div>
                            </TabsContent>
                          </Tabs>
                        </div>
                      </CardContent>
                    </Card>

                  </div>
                </TabsContent>

                {/* Name Tags Sub-tab */}
                <TabsContent value="nametags">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        Name Tag
                      </CardTitle>
                      <CardDescription>
                        Select a name tag to display below your username on your profile.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {isLoadingNameTags ? (
                        <div className="flex items-center justify-center p-8">
                          <Loader2 className="h-6 w-6 animate-spin" />
                        </div>
                      ) : userNameTags.length === 0 ? (
                        <div className="p-6 bg-muted/50 rounded-lg border text-center">
                          <Sparkles className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">
                            No name tags unlocked yet. Visit the store to get exclusive name tags!
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          {(() => {
                            const displayNameTagId = pendingNameTagId !== undefined ? pendingNameTagId : user?.selectedNameTagId;
                            const selectedTag = displayNameTagId ? userNameTags.find((t: NameTag) => t.id === displayNameTagId) : null;
                            
                            return (
                              <div className="flex flex-col items-center space-y-3">
                                <div className="p-4 bg-muted/30 rounded-lg w-full flex flex-col items-center">
                                  {selectedTag ? (
                                    <>
                                      <NameTagImage
                                        imageUrl={selectedTag.imageUrl}
                                        alt={selectedTag.name}
                                        className="w-full max-w-sm h-auto object-contain"
                                      />
                                      <p className="text-sm font-medium mt-3">{selectedTag.name}</p>
                                      <span className={`text-xs capitalize font-medium mt-1 ${
                                        selectedTag.rarity === 'legendary' ? 'text-yellow-400' :
                                        selectedTag.rarity === 'epic' ? 'text-purple-400' :
                                        selectedTag.rarity === 'rare' ? 'text-blue-400' : 'text-gray-400'
                                      }`}>
                                        {selectedTag.rarity}
                                      </span>
                                    </>
                                  ) : (
                                    <div className="text-center py-4">
                                      <Sparkles className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                                      <p className="text-sm text-muted-foreground">No name tag selected</p>
                                    </div>
                                  )}
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {selectedTag ? (pendingNameTagId !== undefined ? 'New Selection' : 'Current') : 'Select a tag below'}
                                </span>
                              </div>
                            );
                          })()}

                          {((pendingNameTagId !== undefined ? pendingNameTagId : user?.selectedNameTagId) !== null) && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setPendingNameTagId(null)}
                              className="w-full"
                            >
                              <X className="h-4 w-4 mr-2" />
                              Remove Name Tag
                            </Button>
                          )}

                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {userNameTags.map((tag: NameTag) => {
                              const displayNameTagId = pendingNameTagId !== undefined ? pendingNameTagId : user?.selectedNameTagId;
                              const isSelected = displayNameTagId === tag.id;
                              return (
                                <button
                                  key={tag.id}
                                  type="button"
                                  onClick={() => setPendingNameTagId(tag.id)}
                                  className={`
                                    relative p-3 rounded-lg transition-all transform hover:scale-105
                                    ${isSelected 
                                      ? 'ring-2 ring-primary bg-primary/20' 
                                      : 'border border-border hover:border-primary/50'}
                                  `}
                                >
                                  <NameTagImage
                                    imageUrl={tag.imageUrl}
                                    alt={tag.name}
                                    className="w-full h-14 object-contain"
                                    style={{
                                      borderRadius: '2px',
                                      boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.3), inset 0 -1px 2px rgba(255,255,255,0.1)'
                                    }}
                                  />
                                  <p className="text-xs text-center mt-1 truncate">{tag.name}</p>
                                  {isSelected && (
                                    <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground rounded-full p-0.5">
                                      <Check className="h-2.5 w-2.5" />
                                    </div>
                                  )}
                                </button>
                              );
                            })}
                          </div>

                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Verified Badges Sub-tab */}
                <TabsContent value="badges">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-green-500" />
                        Verified Badge
                      </CardTitle>
                      <CardDescription>
                        Choose a verified badge to display next to your username on your profile.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {isLoadingVerificationBadges ? (
                        <div className="flex items-center justify-center p-8">
                          <Loader2 className="h-6 w-6 animate-spin" />
                        </div>
                      ) : userVerificationBadges.length === 0 ? (
                        <div className="p-6 bg-muted/50 rounded-lg border text-center">
                          <Shield className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">
                            No verification badges available yet. Visit the store to get exclusive badges!
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          {(() => {
                            const displayBadgeId = pendingVerificationBadgeId !== undefined ? pendingVerificationBadgeId : (user as any)?.selectedVerificationBadgeId;
                            const selectedBadge = displayBadgeId ? userVerificationBadges.find((b: VerificationBadge) => b.id === displayBadgeId) : null;
                            
                            return (
                              <div className="flex flex-col items-center space-y-3">
                                <div className="p-4 bg-muted/30 rounded-lg w-full flex flex-col items-center">
                                  {selectedBadge ? (
                                    <>
                                      <NameTagImage
                                        imageUrl={selectedBadge.imageUrl}
                                        alt={selectedBadge.name}
                                        className="w-16 h-16 object-contain"
                                      />
                                      <p className="text-sm font-medium mt-3">{selectedBadge.name}</p>
                                      {!selectedBadge.isDefault && (
                                        <span className={`text-xs capitalize font-medium mt-1 ${
                                          selectedBadge.rarity === 'legendary' ? 'text-yellow-400' :
                                          selectedBadge.rarity === 'epic' ? 'text-purple-400' :
                                          selectedBadge.rarity === 'rare' ? 'text-blue-400' : 'text-gray-400'
                                        }`}>
                                          {selectedBadge.rarity}
                                        </span>
                                      )}
                                    </>
                                  ) : (
                                    <div className="text-center py-4">
                                      <Shield className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                                      <p className="text-sm text-muted-foreground">No verified badge selected</p>
                                    </div>
                                  )}
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {selectedBadge ? (pendingVerificationBadgeId !== undefined ? 'New Selection' : 'Current') : 'Select a badge below'}
                                </span>
                              </div>
                            );
                          })()}

                          {((pendingVerificationBadgeId !== undefined ? pendingVerificationBadgeId : (user as any)?.selectedVerificationBadgeId) !== null) && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setPendingVerificationBadgeId(null)}
                              className="w-full"
                            >
                              <X className="h-4 w-4 mr-2" />
                              Remove Verified Badge
                            </Button>
                          )}

                          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                            {userVerificationBadges.map((badge: VerificationBadge) => {
                              const displayBadgeId = pendingVerificationBadgeId !== undefined ? pendingVerificationBadgeId : (user as any)?.selectedVerificationBadgeId;
                              const isSelected = displayBadgeId === badge.id;
                              return (
                                <button
                                  key={badge.id}
                                  type="button"
                                  onClick={() => setPendingVerificationBadgeId(badge.id)}
                                  className={`
                                    relative p-3 rounded-lg transition-all transform hover:scale-105 flex flex-col items-center
                                    ${isSelected 
                                      ? 'ring-2 ring-green-500 bg-green-500/20' 
                                      : 'border border-border hover:border-green-500/50'}
                                  `}
                                >
                                  <NameTagImage
                                    imageUrl={badge.imageUrl}
                                    alt={badge.name}
                                    className="w-10 h-10 object-contain"
                                  />
                                  <p className="text-xs text-center mt-1 truncate w-full">{badge.name}</p>
                                  {badge.isDefault && (
                                    <span className="text-[10px] text-green-500 font-medium">Free</span>
                                  )}
                                  {isSelected && (
                                    <div className="absolute -top-1 -right-1 bg-green-500 text-white rounded-full p-0.5">
                                      <Check className="h-2.5 w-2.5" />
                                    </div>
                                  )}
                                </button>
                              );
                            })}
                          </div>

                          <Link href="/store">
                            <p className="text-sm text-muted-foreground hover:text-green-500 transition-colors cursor-pointer mt-2 text-center">
                              Browse more verification badges in our store
                            </p>
                          </Link>

                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </TabsContent>

          {/* Banner Images Tab */}
          <TabsContent value="banners">
            <div className="space-y-6">
              {showBannerPosition && selectedBannerForPosition ? (
                <BannerPositionPreview
                  bannerUrl={selectedBannerForPosition.url}
                  bannerName={selectedBannerForPosition.name}
                  onApply={handleBannerPositionApply}
                  onCancel={handleBannerPositionCancel}
                />
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>Upload Custom Banner</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div
                        className="space-y-4 transition-opacity duration-300"
                        style={{ opacity: profileData.hideBanner ? 0.4 : 1, pointerEvents: profileData.hideBanner ? 'none' : 'auto' }}
                      >
                        {profileData.bannerUrl && (
                          <div>
                            <Label className="text-sm font-medium">Current Banner Preview</Label>
                            <div className="mt-2 aspect-[3.5/1] w-full rounded-lg border overflow-hidden">
                              <img
                                src={signedBannerUrl || profileData.bannerUrl}
                                alt="Current banner"
                                className="w-full h-full object-cover"
                              />
                            </div>
                          </div>
                        )}
                        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground mb-4">
                            {profileData.bannerUrl ? 'Upload a new banner image' : 'Upload your custom banner with preview and positioning'}
                          </p>
                          <Button
                            variant="outline"
                            onClick={() => setShowBannerUpload(true)}
                          >
                            {profileData.bannerUrl ? 'Change Banner' : 'Upload Banner'}
                          </Button>
                          <p className="text-xs text-muted-foreground mt-2">
                            Max file size: 5MB
                          </p>
                        </div>
                        {profileData.bannerUrl && (
                          <Button
                            variant="outline"
                            onClick={() => {
                              setProfileData(prev => ({ ...prev, bannerUrl: "" }));
                              toast({
                                title: "Banner removed!",
                                description: `Banner has been removed. Click "Save Changes" to apply.`,
                                variant: "gamefolioSuccess",
                              });
                            }}
                          >
                            Remove Banner
                          </Button>
                        )}
                      </div>
                      <div className="flex items-center justify-between rounded-lg border p-3 mt-2">
                        <div className="space-y-0.5">
                          <Label className="text-sm font-medium">Hide Banner</Label>
                          <p className="text-xs text-muted-foreground">
                            Hides your banner so your profile background image shows through more
                          </p>
                        </div>
                        <Switch
                          checked={!!profileData.hideBanner}
                          onCheckedChange={async (checked) => {
                            setProfileData(prev => ({ ...prev, hideBanner: checked }));
                            try {
                              await apiRequest("PATCH", `/api/users/${user?.id}`, { hideBanner: checked });
                              queryClient.invalidateQueries({ queryKey: ['/api/user'] });
                              queryClient.invalidateQueries({ queryKey: [`/api/users/${user?.username}`] });
                            } catch (err: any) {
                              toast({ title: "Failed to save", description: err.message || "Could not update banner visibility.", variant: "destructive" });
                              setProfileData(prev => ({ ...prev, hideBanner: !checked }));
                            }
                          }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div
                className="transition-opacity duration-300 space-y-6"
                style={{ opacity: profileData.hideBanner ? 0.4 : 1, pointerEvents: profileData.hideBanner ? 'none' : 'auto' }}
              >
              {profileData.hideBanner && (
                <div className="px-3 py-2 rounded-md bg-muted text-xs text-muted-foreground border border-border">
                  Your banner is hidden — disable "Hide Banner" above to make changes.
                </div>
              )}

              {showBannerUpload && (
                <BannerUploadPreview
                  currentBannerUrl={profileData.bannerUrl}
                  isPro={user?.isPro === true}
                  onUpload={(bannerUrl) => {
                    if (profileData.bannerUrl) {
                      clearSignedUrlCache(profileData.bannerUrl);
                    }
                    setUploadedBannerUrl(bannerUrl);
                    setProfileData(prev => ({ ...prev, bannerUrl }));
                    setShowBannerUpload(false);
                    setUploadingBanner(false);
                  }}
                  onCancel={() => {
                    setShowBannerUpload(false);
                    setUploadingBanner(false);
                  }}
                  isUploading={uploadingBanner}
                />
              )}

              {/* Banner Collection */}
              <Card>
                <CardHeader>
                  <CardTitle>Banners</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {/* New Gradient and Solid Banners */}
                      {[
                        { id: 1, name: "Monochrome Gradient", url: "/attached_assets/blackwhite_1756234272342.png" },
                        { id: 2, name: "Red-Green Gradient", url: "/attached_assets/redgreen_1756234272360.png" },
                        { id: 3, name: "Blue-Yellow Gradient", url: "/attached_assets/blueyellow_1756234272363.png" },
                        { id: 4, name: "Purple Gradient", url: "/attached_assets/purple_1756234272365.png" },
                        { id: 5, name: "Green Gradient", url: "/attached_assets/green_1756234272368.png" },
                        { id: 6, name: "Ice Blue", url: "/attached_assets/Ice_1756234272366.png" },
                        { id: 7, name: "Teal", url: "/attached_assets/Teal_1756234272366.png" },
                        { id: 8, name: "White Texture", url: "/attached_assets/White_1756234272367.png" },
                        { id: 9, name: "Gold", url: "/attached_assets/Gold_1756234272367.png" }
                      ].map((banner) => (
                        <div
                          key={banner.id}
                          className={`aspect-[16/9] rounded-lg border-2 transition-all hover:scale-105 ${
                            profileData.bannerUrl === banner.url 
                              ? 'border-primary shadow-lg' 
                              : 'border-transparent hover:border-primary/50'
                          }`}
                        >
                          <div className="relative w-full h-full group">
                            <img
                              src={banner.url}
                              alt={banner.name}
                              className="w-full h-full object-cover rounded-lg"
                              onError={(e) => {
                                // Fallback to gradient background if image fails to load
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                target.parentElement!.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                                target.parentElement!.innerHTML += `<div class="flex items-center justify-center h-full text-white font-medium">${banner.name}</div>`;
                              }}
                            />
                            
                            {/* Overlay with buttons */}
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-lg flex items-center justify-center gap-2">
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleBannerSelect({ url: banner.url, name: banner.name })}
                                className="bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm"
                              >
                                <Move className="h-4 w-4 mr-2" />
                                Position
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => {
                                  setProfileData(prev => ({ ...prev, bannerUrl: banner.url }));
                                  toast({
                                    title: "Banner selected!",
                                    description: `${banner.name} has been selected. Click "Save Changes" to apply.`,
                                    variant: "gamefolioSuccess",
                                  });
                                }}
                                className="bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm"
                              >
                                Select
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                  </div>
                </CardContent>
              </Card>
              </div>
            </div>
            

          </TabsContent>

          {/* Platforms Tab */}
          <TabsContent value="platforms">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Platform Connections</CardTitle>
                    <CardDescription className="mt-1">
                      Connect your gaming accounts and social media profiles.
                    </CardDescription>
                  </div>
                  {availablePlatforms.length > 0 && (
                    <Button
                      size="sm"
                      onClick={() => { setShowAddPlatform(true); setSelectedPlatform(null); setPlatformHandle(''); }}
                      className="gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      Add Connection
                    </Button>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Add Platform Flow */}
                {showAddPlatform && (
                  <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-slate-200">Add a new connection</h3>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setShowAddPlatform(false)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>

                    {!selectedPlatform ? (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {availablePlatforms.map((p) => (
                          <button
                            key={p.key}
                            onClick={() => setSelectedPlatform(p.key)}
                            className="flex flex-col items-center gap-2 p-3 rounded-lg border border-slate-700 bg-slate-900/50 hover:border-slate-500 hover:bg-slate-800 transition-colors"
                          >
                            {getPlatformIcon(p.icon)}
                            <span className="text-xs text-slate-300">{p.label}</span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          {getPlatformIcon(PLATFORM_DEFINITIONS.find(p => p.key === selectedPlatform)?.icon || '')}
                          <span className="text-sm font-medium text-slate-200">
                            {PLATFORM_DEFINITIONS.find(p => p.key === selectedPlatform)?.label}
                          </span>
                          <button onClick={() => setSelectedPlatform(null)} className="ml-auto text-xs text-slate-400 hover:text-slate-200">
                            Change
                          </button>
                        </div>
                        {selectedPlatform === 'xboxUsername' ? (
                          <div className="space-y-2">
                            <p className="text-xs text-slate-400">Sign in with Microsoft to securely link your Xbox account and verify your gamertag.</p>
                            <div className="flex gap-2 justify-end">
                              <Button variant="outline" size="sm" onClick={() => setShowAddPlatform(false)}>
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                onClick={async () => {
                                  if (!isXboxConfigValid) {
                                    toast({ title: "Xbox not configured", description: "Xbox authentication is not set up yet.", variant: "destructive" });
                                    return;
                                  }
                                  setConnectingXbox(true);
                                  try {
                                    await connectXboxAccount();
                                  } catch (err: any) {
                                    setConnectingXbox(false);
                                    toast({ title: "Error", description: err.message || "Failed to start Xbox connection.", variant: "destructive" });
                                  }
                                }}
                                disabled={connectingXbox}
                                className="bg-[#107C10] hover:bg-[#0d6b0d] text-white border-0"
                              >
                                {connectingXbox ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <FaXbox className="w-4 h-4 mr-1" />}
                                Connect with Xbox
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <Input
                              placeholder={PLATFORM_DEFINITIONS.find(p => p.key === selectedPlatform)?.placeholder || 'Enter your username'}
                              value={platformHandle}
                              onChange={(e) => setPlatformHandle(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddPlatform(); } }}
                              autoFocus
                            />
                            <div className="flex gap-2 justify-end">
                              <Button variant="outline" size="sm" onClick={() => setShowAddPlatform(false)}>
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                onClick={handleAddPlatform}
                                disabled={!platformHandle.trim() || savingPlatform}
                              >
                                {savingPlatform ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Check className="w-4 h-4 mr-1" />}
                                Save
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Connected Platforms List */}
                {connectedPlatforms.length > 0 ? (
                  <div className="space-y-2">
                    {connectedPlatforms.map((platform) => {
                      const isXboxVerified = platform.key === 'xboxUsername' && !!(user as any)?.xboxXuid;
                      const isPsnPlatform = platform.key === 'playstationUsername';
                      return (
                        <div
                          key={platform.key}
                          className={`flex items-center gap-3 px-4 py-3 rounded-xl border bg-slate-800/30 ${isXboxVerified ? 'border-[#107C10]/40 bg-[#107C10]/5' : isPsnPlatform ? 'border-[#003791]/40 bg-[#003791]/5' : 'border-slate-700/50'}`}
                        >
                          <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0">
                            {getPlatformIcon(platform.icon)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <div className="text-sm font-medium text-slate-200">{platform.label}</div>
                              {isXboxVerified && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium bg-[#107C10]/20 text-[#4ade80] border border-[#107C10]/30">
                                  <Check className="w-2.5 h-2.5" />
                                  Verified
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-400 truncate">{user?.[platform.key]}</div>
                          </div>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <Check className="w-3 h-3" />
                            Connected
                          </span>
                          {platform.key === 'xboxUsername' ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-slate-400 hover:text-[#107C10]"
                              title="Configure Xbox"
                              onClick={() => {
                                xboxConfigRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                              }}
                            >
                              <Settings className="w-4 h-4" />
                            </Button>
                          ) : isPsnPlatform ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-slate-400 hover:text-[#003791]"
                              title="Configure PlayStation"
                              onClick={() => {
                                psnConfigRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                              }}
                            >
                              <Settings className="w-4 h-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-slate-500 hover:text-red-400"
                              onClick={() => handleRemovePlatform(platform.key)}
                              disabled={removingPlatform === platform.key}
                            >
                              {removingPlatform === platform.key ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : !showAddPlatform ? (
                  <div className="text-center py-8 space-y-3">
                    <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto">
                      <Gamepad2 className="w-6 h-6 text-slate-500" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-400">No platform connections yet</p>
                      <p className="text-xs text-slate-500 mt-1">Add your gaming and social accounts to display on your profile</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setShowAddPlatform(true); setSelectedPlatform(null); setPlatformHandle(''); }}
                      className="gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      Add Connection
                    </Button>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            {/* Xbox Configuration Panel */}
            {user?.xboxUsername && (
              <div ref={xboxConfigRef}>
              <Card className="mt-4">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[#107C10]/15 flex items-center justify-center flex-shrink-0">
                      <FaXbox className="w-5 h-5 text-[#107C10]" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-base">Xbox Configure</CardTitle>
                      <CardDescription className="mt-0.5 text-xs">
                        Manage your Xbox achievements display and account connection.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Sync Button */}
                  <div className="flex items-center justify-between rounded-xl border border-slate-700/50 bg-slate-800/30 px-4 py-3">
                    <div>
                      <div className="text-sm font-medium text-slate-200">Sync Achievements</div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {user?.xboxAchievementsLastSync
                          ? `Last synced ${new Date(user.xboxAchievementsLastSync).toLocaleDateString()}`
                          : "Not yet synced"}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleSyncAchievements}
                      disabled={syncingAchievements}
                      className="gap-1.5 border-[#107C10]/40 text-[#107C10] hover:bg-[#107C10]/10"
                    >
                      {syncingAchievements ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                      {syncingAchievements ? "Syncing..." : "Sync Now"}
                    </Button>
                  </div>

                  {/* Toggle Display on Profile */}
                  <div className="flex items-center justify-between rounded-xl border border-slate-700/50 bg-slate-800/30 px-4 py-3">
                    <div>
                      <div className="text-sm font-medium text-slate-200">Show on Profile</div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        Display your Xbox achievements on your public profile page
                      </div>
                    </div>
                    <Switch
                      checked={!!user?.showXboxAchievements}
                      disabled={togglingAchievements || !user?.xboxAchievements}
                      onCheckedChange={handleToggleAchievements}
                    />
                  </div>
                  {!user?.xboxAchievements && (
                    <p className="text-xs text-slate-500 px-1">Sync your achievements first before enabling profile display.</p>
                  )}

                  {/* Preview of achievement count */}
                  {user?.xboxAchievements && Array.isArray(user.xboxAchievements) && user.xboxAchievements.length > 0 && (
                    <div className="flex items-center gap-2 px-1">
                      <Trophy className="w-4 h-4 text-amber-400" />
                      <span className="text-xs text-slate-400">
                        {user.xboxAchievements.length} game{user.xboxAchievements.length !== 1 ? 's' : ''} with achievements synced
                      </span>
                    </div>
                  )}

                  {/* Disconnect Xbox */}
                  <div className="flex items-center justify-between rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3">
                    <div>
                      <div className="text-sm font-medium text-slate-200">Disconnect Xbox</div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        Remove your Xbox account and clear all achievement data
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowXboxDisconnectDialog(true)}
                      className="gap-1.5 border-red-500/40 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                    >
                      <Unlink className="w-4 h-4" />
                      Disconnect
                    </Button>
                  </div>
                </CardContent>
              </Card>
              </div>
            )}

            {/* Xbox Disconnect Confirmation Dialog */}
            <AlertDialog open={showXboxDisconnectDialog} onOpenChange={setShowXboxDisconnectDialog}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Disconnect Xbox Account?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will remove your Xbox account link and delete all synced achievement data from your profile. Your achievements will no longer appear publicly. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={disconnectingXbox}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleXboxDisconnect}
                    disabled={disconnectingXbox}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    {disconnectingXbox ? (
                      <><Loader2 className="w-4 h-4 animate-spin mr-1" />Disconnecting...</>
                    ) : (
                      "Yes, Disconnect"
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* PlayStation Configuration Panel */}
            {user?.playstationUsername && (
              <div ref={psnConfigRef}>
              <Card className="mt-4">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[#003791]/15 flex items-center justify-center flex-shrink-0">
                      <FaPlaystation className="w-5 h-5 text-[#003791]" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-base">PlayStation Configure</CardTitle>
                      <CardDescription className="mt-0.5 text-xs">
                        Manage your PSN trophy display and account connection.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Sync Button */}
                  <div className="flex items-center justify-between rounded-xl border border-slate-700/50 bg-slate-800/30 px-4 py-3">
                    <div>
                      <div className="text-sm font-medium text-slate-200">Sync Trophies & Games</div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {(user as any)?.psnTrophiesLastSync
                          ? `Last synced ${new Date((user as any).psnTrophiesLastSync).toLocaleDateString()}`
                          : "Not yet synced"}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleSyncPsnTrophies}
                      disabled={syncingPsnTrophies}
                      className="gap-1.5 border-[#003791]/40 text-[#003791] hover:bg-[#003791]/10"
                    >
                      {syncingPsnTrophies ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                      {syncingPsnTrophies ? "Syncing..." : "Sync Now"}
                    </Button>
                  </div>

                  {/* Trophy summary preview */}
                  {(user as any)?.psnTrophyData && Array.isArray((user as any).psnTrophyData) && (user as any).psnTrophyData.length > 0 && (() => {
                    const data = (user as any).psnTrophyData[0];
                    const earned = data?.earnedTrophies ?? {};
                    const games = data?.recentGames ?? [];
                    return (
                      <div className="space-y-3">
                        {/* Trophy counts */}
                        <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 px-4 py-3 space-y-2">
                          <div className="flex items-center gap-2 mb-1">
                            <Trophy className="w-4 h-4 text-amber-400" />
                            <span className="text-sm font-medium text-slate-200">Trophy Summary</span>
                            {(user as any)?.psnTrophyLevel && (
                              <span className="ml-auto text-xs text-slate-400">Trophy Level {(user as any).psnTrophyLevel}</span>
                            )}
                          </div>
                          <div className="grid grid-cols-4 gap-2 text-center">
                            <div className="rounded-lg bg-slate-900/60 px-2 py-2">
                              <div className="text-base font-bold text-yellow-300">{earned.platinum ?? 0}</div>
                              <div className="text-[10px] text-slate-500 mt-0.5">Platinum</div>
                            </div>
                            <div className="rounded-lg bg-slate-900/60 px-2 py-2">
                              <div className="text-base font-bold text-yellow-400">{earned.gold ?? 0}</div>
                              <div className="text-[10px] text-slate-500 mt-0.5">Gold</div>
                            </div>
                            <div className="rounded-lg bg-slate-900/60 px-2 py-2">
                              <div className="text-base font-bold text-slate-300">{earned.silver ?? 0}</div>
                              <div className="text-[10px] text-slate-500 mt-0.5">Silver</div>
                            </div>
                            <div className="rounded-lg bg-slate-900/60 px-2 py-2">
                              <div className="text-base font-bold text-amber-600">{earned.bronze ?? 0}</div>
                              <div className="text-[10px] text-slate-500 mt-0.5">Bronze</div>
                            </div>
                          </div>
                        </div>

                        {/* Recent games */}
                        {games.length > 0 && (
                          <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 px-4 py-3 space-y-2">
                            <div className="text-sm font-medium text-slate-200 mb-2">Recent Games</div>
                            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                              {games.map((game: any, idx: number) => (
                                <div key={game.titleId ?? idx} className="flex items-center gap-3">
                                  {game.imageUrl ? (
                                    <img
                                      src={game.imageUrl}
                                      alt={game.name}
                                      className="w-9 h-9 rounded-lg object-cover flex-shrink-0 bg-slate-700"
                                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                    />
                                  ) : (
                                    <div className="w-9 h-9 rounded-lg bg-slate-700 flex items-center justify-center flex-shrink-0">
                                      <Gamepad2 className="w-4 h-4 text-slate-500" />
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <div className="text-xs font-medium text-slate-200 truncate">{game.name}</div>
                                    {game.lastPlayedDateTime && (
                                      <div className="text-[10px] text-slate-500 mt-0.5">
                                        {new Date(game.lastPlayedDateTime).toLocaleDateString()}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {games.length === 0 && (
                          <p className="text-xs text-slate-500 px-1">No recent game data available. This may be due to privacy settings on the PSN account.</p>
                        )}
                      </div>
                    );
                  })()}

                  {!(user as any)?.psnTrophyData && (
                    <p className="text-xs text-slate-500 px-1">Sync your trophies first to see your data and enable profile display.</p>
                  )}

                  {/* Toggle Display on Profile */}
                  <div className="flex items-center justify-between rounded-xl border border-slate-700/50 bg-slate-800/30 px-4 py-3">
                    <div>
                      <div className="text-sm font-medium text-slate-200">Show on Profile</div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        Display your PSN trophies on your public profile page
                      </div>
                    </div>
                    <Switch
                      checked={!!(user as any)?.showPsnTrophies}
                      disabled={togglingPsnTrophies || !(user as any)?.psnTrophyData}
                      onCheckedChange={handleTogglePsnTrophies}
                    />
                  </div>

                  {/* Disconnect PlayStation */}
                  <div className="flex items-center justify-between rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3">
                    <div>
                      <div className="text-sm font-medium text-slate-200">Disconnect PlayStation</div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        Remove your PSN ID and clear all trophy data
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowPsnDisconnectDialog(true)}
                      className="gap-1.5 border-red-500/40 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                    >
                      <Unlink className="w-4 h-4" />
                      Disconnect
                    </Button>
                  </div>
                </CardContent>
              </Card>
              </div>
            )}

            {/* PlayStation Disconnect Confirmation Dialog */}
            <AlertDialog open={showPsnDisconnectDialog} onOpenChange={setShowPsnDisconnectDialog}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Disconnect PlayStation Account?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will remove your PSN ID and delete all synced trophy data from your profile. Your trophies will no longer appear publicly. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={disconnectingPsn}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handlePsnDisconnect}
                    disabled={disconnectingPsn}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    {disconnectingPsn ? (
                      <><Loader2 className="w-4 h-4 animate-spin mr-1" />Disconnecting...</>
                    ) : (
                      "Yes, Disconnect"
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </TabsContent>
        </Tabs>

        {/* Save Button */}
        {(hasUnsavedChanges || updateProfileMutation.isPending) && (
          <div className="flex justify-end items-center mt-6 mb-4">
            <Button
              onClick={handleSave}
              disabled={updateProfileMutation.isPending}
              className="flex items-center gap-2 text-white font-medium px-6 py-2"
              style={{ backgroundColor: profileData.accentColor }}
            >
              <Save className="h-4 w-4" />
              {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        )}
      </div>

      {/* Avatar Crop Modal */}
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
            {/* Crop Area */}
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

            {/* Zoom Slider */}
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

      {/* Cancel Subscription Confirmation Dialog */}
      <AlertDialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Cancel Pro Subscription?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Are you sure you want to cancel your Gamefolio Pro subscription?</p>
              <p className="text-muted-foreground">
                You will lose access to all Pro benefits at the end of your current billing period.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelling}>Keep Subscription</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelSubscription}
              disabled={cancelling}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {cancelling ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Cancelling...
                </>
              ) : (
                'Yes, Cancel Subscription'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {showNftPopup && user && user?.activeProfilePicType === 'nft' && user?.nftProfileTokenId && (
        <NftProfilePopup
          userId={user.id}
          tokenId={user.nftProfileTokenId}
          imageUrl={user?.nftProfileImageUrl}
          onClose={() => { setShowNftPopup(false); setNftAnchorRect(null); }}
          anchorRect={null}
          username={user.username}
        />
      )}

      {showNftSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowNftSelector(false)} />
          <div className="relative bg-[#0f172a] border border-slate-700 rounded-xl w-full max-w-2xl max-h-[85vh] overflow-hidden shadow-2xl mx-4">
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <h3 className="text-lg font-semibold text-white">Select NFT as Profile Picture</h3>
              <button
                type="button"
                onClick={() => setShowNftSelector(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto max-h-[70vh]">
              {nftsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-green-400" />
                </div>
              ) : !ownedNftsData?.nfts || ownedNftsData.nfts.filter((n: any) => !n.sold).length === 0 ? (
                <div className="text-center py-12">
                  <Hexagon className="h-12 w-12 mx-auto mb-3 text-slate-600" />
                  <p className="text-slate-400 text-sm">You don't own any NFTs yet.</p>
                  <p className="text-slate-500 text-xs mt-1">Mint or purchase NFTs to use them as your profile picture.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {ownedNftsData.nfts
                    .filter((nft: any) => !nft.sold)
                    .map((nft: any) => {
                      const isSelected = user?.activeProfilePicType === 'nft' && user?.nftProfileTokenId === nft.tokenId;
                      const attrs = nft.attributes || [];
                      const rarityAttr = attrs.find((a: any) => a.trait_type?.toLowerCase() === "rarity");
                      let rarityLabel = "common";
                      if (rarityAttr) {
                        const val = String(rarityAttr.value).toLowerCase();
                        if (["legendary", "epic", "rare", "common"].includes(val)) rarityLabel = val;
                      } else {
                        let score = 0;
                        score += Math.min(attrs.length * 8, 40);
                        score += Math.abs(attrs.map((a: any) => `${a.trait_type}:${a.value}`).join('|').split('').reduce((h: number, c: string) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0) % 20);
                        if (score >= 85) rarityLabel = "legendary";
                        else if (score >= 65) rarityLabel = "epic";
                        else if (score >= 40) rarityLabel = "rare";
                      }

                      const cardBg: Record<string, string> = {
                        legendary: "bg-gradient-to-b from-[#f6cfff] via-[#cefafe] to-[#fff085]",
                        epic: "bg-slate-900",
                        rare: "bg-gradient-to-b from-[#4ade8033] via-[#14532d4d] to-[#4ade8033]",
                        common: "bg-slate-900",
                      };
                      const cardGlow: Record<string, string> = {
                        legendary: "shadow-[0_0_25px_rgba(236,72,153,0.4)]",
                        epic: "",
                        rare: "",
                        common: "",
                      };
                      const dotColor: Record<string, string> = {
                        legendary: "bg-green-500 shadow-[0_0_8px_#22c55e]",
                        epic: "bg-green-600 shadow-[0_0_8px_#16a34a]",
                        rare: "bg-green-400 shadow-[0_0_8px_#4ade80]",
                        common: "bg-slate-400/50 shadow-[0_0_8px_#1e293b]",
                      };
                      const rarityText: Record<string, string> = {
                        legendary: "bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent font-black",
                        epic: "text-slate-400 font-normal",
                        rare: "text-slate-400 font-normal",
                        common: "text-slate-400 font-normal",
                      };
                      const nameColor = rarityLabel === "legendary" ? "text-slate-800" : "text-slate-50";

                      return (
                        <button
                          key={nft.tokenId}
                          type="button"
                          onClick={() => {
                            setNftPreview({
                              tokenId: nft.tokenId,
                              image: nft.image || '',
                              name: nft.name || `Token #${nft.tokenId}`,
                            });
                            setNftProfileMutation.mutate({
                              tokenId: nft.tokenId,
                              imageUrl: nft.image || '',
                            });
                          }}
                          disabled={setNftProfileMutation.isPending}
                          className={`relative rounded-2xl overflow-hidden transition-all duration-200 hover:scale-[1.03] text-left ${cardBg[rarityLabel]} ${cardGlow[rarityLabel]} ${
                            isSelected ? 'ring-2 ring-green-500 ring-offset-2 ring-offset-[#0f172a]' : ''
                          }`}
                        >
                          <div className="relative">
                            <div className="aspect-square overflow-hidden">
                              {nft.image ? (
                                <img
                                  src={nft.image}
                                  alt={nft.name || `NFT #${nft.tokenId}`}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-slate-800">
                                  <Hexagon className="w-12 h-12 text-slate-600" />
                                </div>
                              )}
                            </div>
                            <div className="absolute top-2 right-2 backdrop-blur-md bg-black/60 border border-white/10 rounded-xl px-2.5 py-1.5">
                              <span className="text-[10px] font-bold text-green-400">#{nft.tokenId}</span>
                            </div>
                            {isSelected && (
                              <div className="absolute top-2 left-2 bg-green-500 rounded-full p-1">
                                <Check className="h-3 w-3 text-white" />
                              </div>
                            )}
                          </div>
                          <div className="p-3 pt-2">
                            <h3 className={`text-sm font-bold truncate ${nameColor}`}>{nft.name || `Token #${nft.tokenId}`}</h3>
                            <div className="flex items-center justify-between mt-1">
                              <div className="flex items-center gap-1.5">
                                <div className={`w-2 h-2 rounded-full ${dotColor[rarityLabel]}`} />
                                <span className={`text-[11px] uppercase tracking-tight ${rarityText[rarityLabel]}`}>{rarityLabel}</span>
                              </div>
                              <span className="text-[11px] text-slate-500 font-medium">#{nft.tokenId}</span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                </div>
              )}
            </div>

            {setNftProfileMutation.isPending && (
              <div className="p-3 border-t border-slate-700 flex items-center justify-center gap-2 text-sm text-green-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                Setting NFT as profile picture...
              </div>
            )}
          </div>
        </div>
      )}
    </KeyboardAvoidingWrapper>
  );
}