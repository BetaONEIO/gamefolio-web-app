import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useTheme } from "@/hooks/use-theme";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Palette, User, Save, Upload, Move, Shield, Camera } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { HexColorPicker } from "react-colorful";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { BannerUploadPreview } from "@/components/BannerUploadPreview";
import { BannerPositionPreview } from "@/components/BannerPositionPreview";
import { BlockedUsersSection } from "@/components/settings/blocked-users-section";
import { backgroundThemes } from "@/lib/background-themes";
import { AnimatedBackground } from "@/components/profile/AnimatedBackground";
import { Check } from "lucide-react";

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

export default function SettingsPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { setAccentColor } = useTheme();

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
    avatarFile !== null;
  
  // Debug logging
  console.log('💾 Save button state:', { 
    hasUnsavedChanges, 
    avatarFile: avatarFile?.name || 'none',
    displayNameChanged: normalizeValue(profileData.displayName) !== normalizeValue(user?.displayName),
    bioChanged: normalizeValue(profileData.bio) !== normalizeValue(user?.bio)
  });

  // Handle avatar file selection
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
      setAvatarFile(file);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string);
        console.log('✅ Avatar preview created');
      };
      reader.readAsDataURL(file);
      
      toast({
        title: "Avatar selected",
        description: "Click 'Save Changes' to upload your new profile picture",
        variant: "gamefolioSuccess",
      });
    }
  };

  // Fetch gaming banner images
  const { data: bannerImages, isLoading: isLoadingBanners } = useQuery({
    queryKey: ['/api/banner-images'],
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
      
      // Direct cache update to prevent re-renders and style flashing
      queryClient.setQueryData(["/api/user"], updatedUser);
      queryClient.setQueryData([`/api/users/${user?.username}`], updatedUser);
      
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
                    {/* Current/Preview Avatar */}
                    <div className="flex flex-col items-center space-y-2">
                      <Avatar className="h-24 w-24 border-4 border-border">
                        <AvatarImage 
                          src={avatarPreview || user?.avatarUrl || ''} 
                          alt={user?.displayName}
                          key={user?.avatarUrl || 'default'} // Force re-render when avatar URL changes
                        />
                        <AvatarFallback className="text-2xl">
                          {user?.displayName?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-muted-foreground">
                        {avatarFile ? 'New' : 'Current'}
                      </span>
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
                      {PRESET_THEMES.map((theme) => (
                        <div
                          key={theme.name}
                          className="cursor-pointer rounded-lg border-2 border-transparent hover:border-primary/50 transition-colors"
                          onClick={() => applyPresetTheme(theme)}
                        >
                          <div
                            className="h-20 rounded-lg flex items-center justify-center text-white font-medium text-sm"
                            style={{ backgroundColor: theme.backgroundColor }}
                          >
                            <div
                              className="w-8 h-8 rounded-full border-2 border-white"
                              style={{ backgroundColor: theme.accentColor }}
                            />
                          </div>
                          <p className="text-center mt-2 text-sm font-medium">{theme.name}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

              {/* Profile Background Themes */}
              <Card>
                <CardHeader>
                  <CardTitle>Profile Background</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Choose a background theme for your profile page. Animated backgrounds add dynamic visual effects.
                  </p>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {backgroundThemes.map((theme) => {
                      const isActive = profileData.profileBackgroundTheme === theme.id;
                      
                      return (
                        <button
                          key={theme.id}
                          type="button"
                          onClick={() => {
                            setProfileData(prev => ({
                              ...prev,
                              profileBackgroundType: theme.type,
                              profileBackgroundTheme: theme.id,
                              profileBackgroundAnimation: theme.animation || 'none'
                            }));
                            
                            toast({
                              title: "Background updated",
                              description: `${theme.name} background selected. Click "Save Changes" to apply.`,
                              duration: 3000,
                            });
                          }}
                          className={`relative p-4 rounded-lg transition-all text-left overflow-hidden ${
                            isActive 
                              ? 'ring-2 ring-primary shadow-lg' 
                              : 'hover:ring-1 hover:ring-primary/50'
                          }`}
                          style={{ 
                            background: theme.preview,
                            minHeight: '100px'
                          }}
                        >
                          <div className="absolute bottom-2 left-2 right-2">
                            <div className="bg-black/70 backdrop-blur-sm text-white px-2 py-1 rounded text-xs font-medium">
                              {theme.name}
                              {theme.type === 'animated' && (
                                <span className="ml-1 text-primary">✨</span>
                              )}
                            </div>
                          </div>

                          {isActive && (
                            <div className="absolute top-2 right-2">
                              <div className="flex items-center justify-center w-6 h-6 bg-primary rounded-full">
                                <Check className="w-4 h-4 text-white" />
                              </div>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Background Preview */}
              <Card>
                <CardHeader>
                  <CardTitle>Background Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Preview of your selected profile background theme
                  </p>
                  
                  {(() => {
                    const selectedTheme = backgroundThemes.find(
                      theme => theme.id === profileData.profileBackgroundTheme
                    );
                    
                    if (!selectedTheme) return null;
                    
                    return (
                      <div 
                        className="relative rounded-lg border-2 border-border overflow-hidden"
                        style={{ 
                          height: '300px',
                          background: selectedTheme.type === 'animated' ? '#0B2232' : selectedTheme.preview
                        }}
                      >
                        {selectedTheme.type === 'animated' && selectedTheme.animation && (
                          <AnimatedBackground
                            type="animated"
                            theme={selectedTheme.animation}
                            baseColor="#0B2232"
                            accentColor="#4ADE80"
                            contained={true}
                          />
                        )}
                        
                        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none">
                          <div className="bg-black/50 backdrop-blur-sm px-6 py-3 rounded-lg">
                            <div className="text-white font-semibold text-lg text-center">
                              {selectedTheme.name}
                            </div>
                            <div className="text-white/80 text-sm text-center">
                              {selectedTheme.type === 'animated' ? 'Animated Background ✨' : 'Static Background'}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
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
    </div>
  );
}