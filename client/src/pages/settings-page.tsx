import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useTheme } from "@/hooks/use-theme";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Palette, User, Save, Upload, Move, Shield, Camera, Sparkles, Loader2, X, ZoomIn, Crop, Lock, Crown, Check, Calendar, ExternalLink, AlertTriangle } from "lucide-react";
import { useRevenueCat } from "@/hooks/use-revenuecat";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { HexColorPicker } from "react-colorful";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { BannerUploadPreview } from "@/components/BannerUploadPreview";
import { BannerPositionPreview } from "@/components/BannerPositionPreview";
import { BlockedUsersSection } from "@/components/settings/blocked-users-section";
import Cropper from "react-easy-crop";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import DOMPurify from "dompurify";
import type { NameTag } from "@shared/schema";

// Component to fetch SVG and render it inline with color replacement
const InlineSvgBorder: React.FC<{
  svgUrl: string;
  color: string;
  className?: string;
  style?: React.CSSProperties;
}> = ({ svgUrl, color, className, style }) => {
  const [svgContent, setSvgContent] = useState<string>('');
  
  useEffect(() => {
    if (!svgUrl) return;
    
    fetch(svgUrl)
      .then(res => res.text())
      .then(svg => {
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
  }, [svgUrl, color]);
  
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

// Utility function to create a cropped image from canvas
const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
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
    name: "Basic",
    backgroundColor: "#0B2232",
    accentColor: "#4ADE80"
  },
  {
    name: "Purple Night",
    backgroundColor: "#1e1b4b",
    accentColor: "#a855f7"
  },
  {
    name: "Golden Yellow",
    backgroundColor: "#713f12",
    accentColor: "#facc15"
  },
  {
    name: "Rose Gold",
    backgroundColor: "#4c1d4d",
    accentColor: "#f472b6"
  },
  {
    name: "Sunset Orange",
    backgroundColor: "#431407",
    accentColor: "#fb7185"
  },
  {
    name: "Arctic Blue",
    backgroundColor: "#0c4a6e",
    accentColor: "#38bdf8"
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

export default function SettingsPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { setAccentColor } = useTheme();
  const { customerInfo, refreshCustomerInfo } = useRevenueCat();
  
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
    profileBackgroundAnimation: (user as any)?.profileBackgroundAnimation || "none"
  });
  
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  
  // Name tag state - undefined means no pending change, null means remove tag, number means select tag
  const [pendingNameTagId, setPendingNameTagId] = useState<number | null | undefined>(undefined);
  
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

  // Update profile data when user data changes (preserve uploaded banners)
  useEffect(() => {
    if (user) {
      setProfileData(prev => {
        // CRITICAL: Multiple layers of banner preservation
        const hasUploadedBanner = uploadedBannerUrl && uploadedBannerUrl.length > 0;
        const prevHasBanner = prev.bannerUrl && prev.bannerUrl.length > 0;
        const userHasBanner = user.bannerUrl && user.bannerUrl.length > 0;
        
        console.log('🔄 Settings useEffect - Enhanced banner preservation:');
        console.log('📋 Previous banner:', prev.bannerUrl);
        console.log('👤 User banner:', user.bannerUrl);
        console.log('🔼 Uploaded banner URL:', uploadedBannerUrl);
        console.log('🧮 Analysis:', { hasUploadedBanner, prevHasBanner, userHasBanner });
        
        let finalBannerUrl = "";
        
        if (hasUploadedBanner) {
          // Preserve uploaded banner regardless of user data state
          finalBannerUrl = uploadedBannerUrl;
          console.log('🛡️ Preserving uploaded banner');
        } else if (prevHasBanner && !userHasBanner) {
          // Preserve existing banner if user data is null/empty
          finalBannerUrl = prev.bannerUrl;
          console.log('🛡️ Preserving existing banner over null user data');
        } else {
          // Use user data as fallback
          finalBannerUrl = user.bannerUrl || "";
          console.log('📥 Using user data banner');
        }
        
        console.log('✅ Final banner URL:', finalBannerUrl);
        
        return {
          displayName: user.displayName || "",
          bio: user.bio || "",
          backgroundColor: user.backgroundColor || "#0B2232",
          accentColor: user.accentColor || "#4ADE80",
          bannerUrl: finalBannerUrl,
          avatarUrl: user.avatarUrl || "",
          profileBackgroundType: (user as any)?.profileBackgroundType || "solid",
          profileBackgroundTheme: (user as any)?.profileBackgroundTheme || "default",
          profileBackgroundAnimation: (user as any)?.profileBackgroundAnimation || "none"
        };
      });
      
      // Only clear avatar upload state if the avatarUrl actually changed (successful upload)
      if (avatarFile && user.avatarUrl && user.avatarUrl !== prevAvatarUrl.current) {
        console.log('✅ Avatar successfully uploaded, clearing upload state');
        setAvatarFile(null);
        setAvatarPreview('');
        prevAvatarUrl.current = user.avatarUrl;
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
    avatarFile !== null ||
    (pendingNameTagId !== undefined && pendingNameTagId !== user?.selectedNameTagId);
  
  // Debug logging
  console.log('💾 Save button state:', { 
    hasUnsavedChanges, 
    avatarFile: avatarFile?.name || 'none',
    displayNameChanged: normalizeValue(profileData.displayName) !== normalizeValue(user?.displayName),
    bioChanged: normalizeValue(profileData.bio) !== normalizeValue(user?.bio)
  });

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

  // Handle avatar file selection - opens crop modal
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

      console.log('🖼️ Avatar file selected:', file.name, 'Size:', file.size);
      
      // Create preview URL and open crop modal
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
    enabled: !!user,
  });
  
  // Fetch user's unlocked name tags
  const { data: userNameTags = [], isLoading: isLoadingNameTags } = useQuery<NameTag[]>({
    queryKey: ['/api/user/name-tags'],
    enabled: !!user,
  });
  
  // Track selected avatar border ID
  const [selectedBorderId, setSelectedBorderId] = useState<number | null>(user?.selectedAvatarBorderId || null);
  
  // Track avatar border color for SVG customization
  const [avatarBorderColor, setAvatarBorderColor] = useState<string>(user?.avatarBorderColor || '#4ADE80');
  const [showBorderColorPicker, setShowBorderColorPicker] = useState(false);
  
  // Update selected border when user data loads
  useEffect(() => {
    if (user?.selectedAvatarBorderId !== undefined) {
      setSelectedBorderId(user.selectedAvatarBorderId);
    }
    if (user?.avatarBorderColor) {
      setAvatarBorderColor(user.avatarBorderColor);
    }
  }, [user?.selectedAvatarBorderId, user?.avatarBorderColor]);
  
  // Sync pending name tag with user data after save completes
  // When the user's selectedNameTagId matches the pending selection, reset the pending state
  useEffect(() => {
    if (pendingNameTagId !== undefined && pendingNameTagId === user?.selectedNameTagId) {
      // User data has updated to match our pending selection, so we can clear pending
      setPendingNameTagId(undefined);
    }
  }, [user?.selectedNameTagId, pendingNameTagId]);
  
  // Mutation to save avatar border selection
  const saveAvatarBorderMutation = useMutation({
    mutationFn: async (avatarBorderId: number | null) => {
      const response = await apiRequest("PUT", `/api/user/avatar-border`, { avatarBorderId });
      // Handle both JSON and non-JSON responses
      const text = await response.text();
      return text ? JSON.parse(text) : { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: [`/api/user/${user?.id}/avatar-border`] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user?.username}`] });
      toast({
        title: "Border updated!",
        description: "Your profile picture border has been saved.",
        variant: "gamefolioSuccess",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Mutation to save avatar border color
  const saveBorderColorMutation = useMutation({
    mutationFn: async (color: string) => {
      const response = await apiRequest("PATCH", `/api/users/${user?.id}`, { avatarBorderColor: color });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user?.username}`] });
      toast({
        title: "Border color updated!",
        description: "Your border color has been saved.",
        variant: "gamefolioSuccess",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });



  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("PATCH", `/api/users/${user?.id}`, data);
      return response.json();
    },
    onSuccess: (updatedUser) => {
      // CRITICAL: Only clear tracking if banner was actually saved to database
      console.log('💾 Profile save success - checking banner preservation:');
      console.log('🔼 Uploaded banner URL:', uploadedBannerUrl);
      console.log('📋 Database banner URL:', updatedUser.bannerUrl);
      
      if (uploadedBannerUrl) {
        if (updatedUser.bannerUrl === uploadedBannerUrl) {
          console.log('✅ Banner successfully saved to database, clearing tracking state');
          setUploadedBannerUrl('');
        } else {
          console.log('⚠️ Banner not saved to database, keeping tracking state for preservation');
          // Keep tracking state to preserve banner through the refresh cycle
        }
      }
      
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
      
      // Force refresh of all user-related queries to ensure UI updates
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user?.username}`] });
      
      toast({
        title: "Settings updated!",
        description: "Your profile has been successfully updated. Check your profile page!",
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

      // Upload new avatar if selected
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
        updatedData.avatarUrl = uploadResult.avatarUrl;
        
        // Reset avatar upload state
        setAvatarFile(null);
        setAvatarPreview('');
        setUploadingAvatar(false);
      }

      // Save name tag selection if changed
      if (pendingNameTagId !== undefined && pendingNameTagId !== user?.selectedNameTagId) {
        await apiRequest("PUT", "/api/user/name-tag", { nameTagId: pendingNameTagId });
        await queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      }

      updateProfileMutation.mutate(updatedData);
    } catch (error) {
      setUploadingAvatar(false);
      toast({
        title: "Upload failed",
        description: "Failed to upload profile picture. Please try again.",
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

  const applyPresetTheme = (theme: typeof PRESET_THEMES[0]) => {
    console.log('🎨 THEME PRESET APPLIED:', theme.name);
    console.log('🛡️ Banner URL before theme change:', profileData.bannerUrl);
    
    // Update local profile data (for user's profile customization)
    setProfileData(prev => {
      console.log('✅ Theme only updating colors, banner preserved:', prev.bannerUrl);
      return {
        ...prev,
        backgroundColor: theme.backgroundColor,
        accentColor: theme.accentColor
      };
    });
    
    // Update global theme (affects entire app)
    setAccentColor(theme.accentColor);
    
    toast({
      title: "Theme Applied!",
      description: `${theme.name} theme has been applied to the entire app.`,
      variant: "gamefolioSuccess",
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
    <div 
      className="min-h-screen p-6 pb-24 md:pb-6"
    >
      <div className="max-w-4xl mx-auto">
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
            <TabsTrigger value="privacy" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
              <Shield className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Privacy & Safety</span>
              <span className="sm:hidden">Privacy</span>
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            {/* Pro Subscription Management Section */}
            {user?.isPro && (
              <Card className="mb-6 relative overflow-hidden">
                <div 
                  className="absolute inset-0 rounded-lg pointer-events-none"
                  style={{
                    boxShadow: 'inset 0 0 30px rgba(74, 222, 128, 0.3), 0 0 20px rgba(74, 222, 128, 0.2)',
                    border: '2px solid rgba(74, 222, 128, 0.5)'
                  }}
                />
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-500/20 rounded-lg">
                      <Crown className="h-6 w-6 text-yellow-500" />
                    </div>
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        Gamefolio Pro Subscription
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
                          Active
                        </span>
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {user?.proSubscriptionStartDate && (
                          <>Member since {new Date(user.proSubscriptionStartDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</>
                        )}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Your Pro Benefits</p>
                      <ul className="space-y-1.5">
                        {[
                          "Unlimited video and screenshot uploads",
                          "500MB video file size limit",
                          "100MB image file size limit",
                          "Access to all avatar borders",
                          "No video ads",
                          "Monthly bonus lootboxes",
                          "Priority support",
                        ].map((benefit, idx) => (
                          <li key={idx} className="flex items-center gap-2 text-sm">
                            <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                            <span>{benefit}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="space-y-3">
                      <div className="p-3 bg-muted/30 rounded-lg space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Plan:</span>
                          <span className="font-medium">{user?.proSubscriptionType || 'Pro'}</span>
                        </div>
                        {customerInfo?.managementURL && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => window.open(customerInfo.managementURL, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Manage Billing
                          </Button>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-red-500 hover:text-red-600 hover:bg-red-500/10"
                        onClick={() => setShowCancelConfirm(true)}
                      >
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        End Membership
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Profile Picture Section */}
                <div className="space-y-4">
                  <div>
                    <Label className="text-base font-medium">Profile Picture</Label>
                    <p className="text-sm text-muted-foreground hidden md:block">
                      Upload a profile picture that represents you. Recommended size: 400x400 pixels or larger.
                    </p>
                  </div>
                  
                  <div className="flex flex-col md:flex-row md:items-start space-y-4 md:space-y-0 md:space-x-6">
                    {/* Current/Preview Avatar with Border */}
                    <div className="flex flex-col items-center space-y-3">
                      <div 
                        className="relative h-48 w-48 flex items-center justify-center"
                      >
                        <div 
                          className="h-32 w-32 rounded-full overflow-hidden z-10"
                        >
                          <img 
                            src={avatarPreview || user?.avatarUrl || ''} 
                            alt={user?.displayName || 'Profile'}
                            className="w-full h-full object-cover rounded-full"
                          />
                          {!(avatarPreview || user?.avatarUrl) && (
                            <div className="w-full h-full flex items-center justify-center bg-primary/20 text-3xl font-bold rounded-full">
                              {user?.displayName?.charAt(0) || '?'}
                            </div>
                          )}
                        </div>
                        {/* SVG Border Overlay - rendered inline with color replacement */}
                        {selectedBorderId && avatarBorders && (() => {
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
                      </div>
                      <div className="text-center">
                        <span className="text-sm font-medium">
                          {avatarFile ? 'New Preview' : 'Current'}
                        </span>
                      </div>
                    </div>
                    
                    {/* Upload Controls */}
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
                        
                        {avatarFile && !uploadingAvatar && (
                          <Button 
                            type="button" 
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setAvatarFile(null);
                              setAvatarPreview('');
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
                </div>

                {/* Profile Picture Border Selection Section */}
                <div className="space-y-4 pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <Label className="text-base font-medium">Profile Picture Border</Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Select a border from your unlocked rewards to customize your profile picture.
                  </p>

                  {/* Current Border Preview */}
                  <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg border">
                    <div className="relative h-48 w-48 flex items-center justify-center">
                      <div 
                        className="h-32 w-32 rounded-full overflow-hidden z-10"
                      >
                        <img 
                          src={avatarPreview || profileData.avatarUrl || ""} 
                          alt="Preview" 
                          className="w-full h-full object-cover rounded-full"
                        />
                        {!(avatarPreview || profileData.avatarUrl) && (
                          <div className="w-full h-full flex items-center justify-center bg-primary/20 text-foreground font-semibold text-xl rounded-full">
                            {user?.username?.substring(0, 2).toUpperCase() || "U"}
                          </div>
                        )}
                      </div>
                      {/* SVG Border Overlay with color replacement */}
                      {selectedBorderId && avatarBorders && (() => {
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
                    </div>
                    <div>
                      <p className="text-sm font-medium">Preview</p>
                      <p className="text-xs text-muted-foreground">
                        {selectedBorderId && avatarBorders 
                          ? (avatarBorders as any[])?.find((b: any) => b.id === selectedBorderId)?.name || "Selected"
                          : "No border selected"}
                      </p>
                    </div>
                  </div>

                  {/* Loading State */}
                  {isLoadingBorders && (
                    <div className="p-4 flex items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  )}

                  {/* No Borders Unlocked Message */}
                  {!isLoadingBorders && (!avatarBorders || (avatarBorders as any[]).length === 0) && (
                    <div className="p-4 bg-muted/50 rounded-lg border text-center">
                      <Sparkles className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        No borders unlocked yet. Check back soon for ways to unlock exclusive borders!
                      </p>
                    </div>
                  )}

                  {/* Unlocked Borders Grid with Category Tabs */}
                  {!isLoadingBorders && avatarBorders && (avatarBorders as any[]).length > 0 && (
                    <Tabs defaultValue="static" className="w-full">
                      <TabsList className="w-full grid grid-cols-2 mb-4">
                        <TabsTrigger value="static" className="text-xs md:text-sm">Static</TabsTrigger>
                        <TabsTrigger value="animated" className="text-xs md:text-sm relative">
                          <img 
                            src="/assets/pro-badge.png" 
                            alt="PRO" 
                            className="absolute -top-4 left-1/2 -translate-x-1/2 h-5 w-auto"
                          />
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
                            
                            <div className={`grid grid-cols-3 md:grid-cols-4 gap-3 ${isLocked ? 'blur-sm pointer-events-none select-none' : ''}`}>
                              {/* None option - only show in first tab */}
                              {category === 'static' && (
                                <div
                                  data-testid="border-select-none"
                                  className={`
                                    cursor-pointer rounded-md border-2 p-3 relative transition-all flex flex-col items-center justify-center
                                    ${selectedBorderId === null ? 'border-primary ring-2 ring-primary/50 bg-primary/10' : 'border-muted hover:border-primary/50'}
                                  `}
                                  onClick={() => {
                                    setSelectedBorderId(null);
                                    saveAvatarBorderMutation.mutate(null);
                                  }}
                                >
                                  <X className="h-8 w-8 text-muted-foreground mb-1" />
                                  <span className="text-xs text-muted-foreground">None</span>
                                </div>
                              )}
                              
                              {(avatarBorders as any[])
                                .filter((border: any) => (border.category || 'static') === category)
                                .map((border: any) => (
                                  <div
                                    key={border.id}
                                    data-testid={`border-select-${border.id}`}
                                    className={`
                                      cursor-pointer rounded-md border-2 p-2 relative transition-all flex flex-col items-center
                                      ${selectedBorderId === border.id ? 'border-primary ring-2 ring-primary/50 bg-primary/10' : 'border-muted hover:border-primary/50'}
                                    `}
                                    onClick={() => {
                                      if (isLocked) return;
                                      if (selectedBorderId === border.id) {
                                        setSelectedBorderId(null);
                                        saveAvatarBorderMutation.mutate(null);
                                      } else {
                                        setSelectedBorderId(border.id);
                                        saveAvatarBorderMutation.mutate(border.id);
                                      }
                                    }}
                                  >
                                    <div className="relative w-16 h-16 flex items-center justify-center">
                                      <div className="w-10 h-10 rounded-full bg-muted" />
                                      <InlineSvgBorder
                                        svgUrl={border.imageUrl}
                                        color="#ffffff"
                                        className="absolute inset-0 pointer-events-none [&>svg]:w-full [&>svg]:h-full"
                                      />
                                    </div>
                                    <span className="text-xs text-center mt-1 truncate w-full">
                                      {border.name}
                                    </span>
                                  </div>
                                ))}
                              
                              {/* Empty state for category */}
                              {(avatarBorders as any[]).filter((border: any) => (border.category || 'static') === category).length === 0 && category !== 'static' && (
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
                              onClick={() => {
                                // Validate hex color before saving
                                if (/^#[0-9A-Fa-f]{6}$/.test(avatarBorderColor)) {
                                  saveBorderColorMutation.mutate(avatarBorderColor);
                                  setShowBorderColorPicker(false);
                                }
                              }}
                              disabled={saveBorderColorMutation.isPending || !/^#[0-9A-Fa-f]{6}$/.test(avatarBorderColor)}
                              data-testid="border-color-save"
                            >
                              {saveBorderColorMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                'Apply'
                              )}
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            This color will be applied to your SVG border's glow effect.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Name Tag Selection Section */}
                <div className="space-y-4 pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <Label className="text-base font-medium">Name Tag</Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Select a name tag to display below your username on your profile.
                  </p>

                  {isLoadingNameTags ? (
                    <div className="flex items-center justify-center p-4">
                      <Loader2 className="h-5 w-5 animate-spin" />
                    </div>
                  ) : userNameTags.length === 0 ? (
                    <div className="p-4 bg-muted/50 rounded-lg border text-center">
                      <Sparkles className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        No name tags unlocked yet. Visit the store to get exclusive name tags!
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Current Name Tag Preview - shown above the grid */}
                      {(() => {
                        const displayNameTagId = pendingNameTagId !== undefined ? pendingNameTagId : user?.selectedNameTagId;
                        const selectedTag = displayNameTagId ? userNameTags.find((t: NameTag) => t.id === displayNameTagId) : null;
                        
                        return (
                          <div className="flex flex-col items-center space-y-3">
                            <div className="p-6 bg-muted/30 rounded-lg w-full flex flex-col items-center">
                              {selectedTag ? (
                                <>
                                  <img
                                    src={selectedTag.imageUrl}
                                    alt={selectedTag.name}
                                    className="w-full max-w-sm h-auto object-contain"
                                  />
                                  <p className="text-sm font-medium mt-3">{selectedTag.name}</p>
                                  <div className="flex items-center gap-2 text-xs mt-1">
                                    <span className={`capitalize font-medium ${
                                      selectedTag.rarity === 'legendary' ? 'text-yellow-400' :
                                      selectedTag.rarity === 'epic' ? 'text-purple-400' :
                                      selectedTag.rarity === 'rare' ? 'text-blue-400' : 'text-gray-400'
                                    }`}>
                                      {selectedTag.rarity}
                                    </span>
                                  </div>
                                </>
                              ) : (
                                <div className="text-center py-2">
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

                      {/* Remove Name Tag button - show if there's a tag currently selected (pending or saved) */}
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

                      {/* Name Tag Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {userNameTags.map((tag: NameTag) => {
                          const displayNameTagId = pendingNameTagId !== undefined ? pendingNameTagId : user?.selectedNameTagId;
                          const isSelected = displayNameTagId === tag.id;
                          return (
                            <button
                              key={tag.id}
                              type="button"
                              onClick={() => setPendingNameTagId(tag.id)}
                              className={`
                                relative p-2 rounded-lg transition-all transform hover:scale-105
                                ${isSelected 
                                  ? 'ring-2 ring-primary bg-primary/20' 
                                  : 'border border-border hover:border-primary/50'}
                              `}
                            >
                              <img
                                src={tag.imageUrl}
                                alt={tag.name}
                                className="w-full h-6 object-contain"
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
                </div>

                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    value={profileData.displayName}
                    onChange={(e) => setProfileData(prev => ({ ...prev, displayName: e.target.value }))}
                    placeholder="Your display name"
                  />
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
              <div className="space-y-6">
                {/* Preset Themes */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      Quick Themes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {PRESET_THEMES.map((theme) => {
                        const defaultThemeColor = '#0B2232';
                        return (
                          <div
                            key={theme.name}
                            className="cursor-pointer rounded-lg border-2 border-transparent hover:border-primary/50 transition-colors"
                            onClick={() => applyPresetTheme(theme)}
                          >
                            <div
                              className="h-20 rounded-lg flex items-center justify-center text-white font-medium text-sm"
                              style={{ 
                                background: `linear-gradient(180deg, ${defaultThemeColor} 0%, ${theme.backgroundColor} 60%, ${theme.backgroundColor} 100%)`
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
            </div>
          </TabsContent>

          {/* Banner Images Tab */}
          <TabsContent value="banners">
            <div className="space-y-6">
              {/* Banner Position Preview */}
              {showBannerPosition && selectedBannerForPosition ? (
                <BannerPositionPreview
                  bannerUrl={selectedBannerForPosition.url}
                  bannerName={selectedBannerForPosition.name}
                  onApply={handleBannerPositionApply}
                  onCancel={handleBannerPositionCancel}
                />
              ) : showBannerUpload ? (
                <BannerUploadPreview
                  currentBannerUrl={profileData.bannerUrl}
                  onUpload={(bannerUrl) => {
                    console.log('🎯 BANNER UPLOADED - Setting tracking state:', bannerUrl);
                    setUploadedBannerUrl(bannerUrl); // Track uploaded banner
                    setProfileData(prev => ({ ...prev, bannerUrl }));
                    setShowBannerUpload(false);
                    setUploadingBanner(false);
                    
                    console.log('✅ Banner URL set and tracked, protected from useEffect override');
                  }}
                  onCancel={() => {
                    setShowBannerUpload(false);
                    setUploadingBanner(false);
                  }}
                  isUploading={uploadingBanner}
                />
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>Upload Custom Banner</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                        <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground mb-4">
                          Upload your custom banner with preview and positioning
                        </p>
                        <Button 
                          variant="outline"
                          onClick={() => setShowBannerUpload(true)}
                        >
                          Upload Banner
                        </Button>
                        <p className="text-xs text-muted-foreground mt-2">
                          Max file size: 5MB • Drag to position like Facebook cover photo
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
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

                    {/* Current Selection */}
                    {profileData.bannerUrl && (
                      <div className="mt-6">
                        <Label className="text-sm font-medium">Current Banner Preview</Label>
                        <div className="mt-2 aspect-[16/9] max-w-md rounded-lg border overflow-hidden">
                          <img
                            src={profileData.bannerUrl}
                            alt="Selected banner"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>
                    )}

                    {/* Remove Banner Option */}
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
                        className="mt-4"
                      >
                        Remove Banner
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
            

          </TabsContent>

          {/* Privacy & Safety Tab */}
          <TabsContent value="privacy">
            <BlockedUsersSection />
          </TabsContent>
        </Tabs>

        {/* Save Button */}
        <div className="flex justify-end items-center mt-6 mb-4">
          <Button
            onClick={handleSave}
            disabled={updateProfileMutation.isPending || !hasUnsavedChanges}
            className="flex items-center gap-2 text-white font-medium px-6 py-2"
            style={{ backgroundColor: hasUnsavedChanges ? profileData.accentColor : '#6B7280' }}
          >
            <Save className="h-4 w-4" />
            {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Avatar Crop Modal */}
      <Dialog open={showCropModal} onOpenChange={setShowCropModal}>
        <DialogContent className="sm:max-w-lg bg-slate-900 border-slate-700">
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
            <div className="relative h-80 w-full bg-slate-800 rounded-lg overflow-hidden">
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
    </div>
  );
}