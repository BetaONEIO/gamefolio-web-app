import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useUpdateProfile } from '@/hooks/use-profile';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, getQueryFn, queryClient } from '@/lib/queryClient';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Redirect } from 'wouter';
import { Loader2, Upload, Camera, Trash2, Check, Sparkles, X } from 'lucide-react';
import { HexColorPicker } from "react-colorful";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import type { AssetReward } from '@shared/schema';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { BannerUploadPreview } from '@/components/BannerUploadPreview';

// Define ProfileBanner type
type ProfileBanner = {
  id: number;
  name: string;
  category: string;
  imageUrl: string;
  createdAt: string;
};

// Define UploadedBanner type
type UploadedBanner = {
  id: number;
  userId: number;
  bannerUrl: string;
  isActive: boolean;
  createdAt: string;
};

// Uploaded Banners Section Component
const UploadedBannersSection: React.FC<{
  onSelectBanner: (bannerUrl: string) => void;
  currentBannerUrl: string;
}> = ({ onSelectBanner, currentBannerUrl }) => {
  const { toast } = useToast();

  // Fetch user's uploaded banners
  const { data: uploadedBanners = [], isLoading } = useQuery<UploadedBanner[]>({
    queryKey: ['/api/user/banners'],
    queryFn: getQueryFn({ on401: 'returnNull' }),
  });

  // Delete banner mutation
  const deleteBanner = useMutation({
    mutationFn: async (bannerId: number) => {
      const response = await fetch(`/api/user/banners/${bannerId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to delete banner');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/banners'] });
      toast({
        title: "Banner deleted",
        description: "Your uploaded banner has been removed.",
        variant: "gamefolioSuccess",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete banner.",
        variant: "destructive",
      });
    }
  });

  if (isLoading) {
    return (
      <div className="mt-4">
        <h4 className="text-sm font-medium mb-2">Your Uploaded Banners</h4>
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </div>
    );
  }

  if (!uploadedBanners || uploadedBanners.length === 0) {
    return (
      <div className="mt-4">
        <h4 className="text-sm font-medium mb-2">Your Uploaded Banners</h4>
        <div className="p-4 bg-muted/50 rounded-lg border text-center">
          <p className="text-sm text-muted-foreground">
            No custom banners uploaded yet. Upload a banner above to see it here in your history.
          </p>
        </div>
      </div>
    );
  }

  const activeBanner = uploadedBanners.find(b => b.isActive);

  return (
    <div className="mt-4">
      <h4 className="text-sm font-medium mb-2">Your Uploaded Banners</h4>
      
      {/* Active Banner */}
      {activeBanner && (
        <div className="mb-3">
          <p className="text-xs text-muted-foreground mb-2">Current Active Banner:</p>
          <div className="relative rounded-md overflow-hidden border-2 border-primary h-32">
            <img
              src={activeBanner.bannerUrl}
              alt="Active banner"
              className="w-full h-full object-cover"
            />
            <div className="absolute top-2 right-2 bg-primary text-primary-foreground px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1">
              <Check className="h-3 w-3" />
              Active
            </div>
          </div>
        </div>
      )}

      {/* Banner History */}
      <div>
        <p className="text-xs text-muted-foreground mb-2">Banner History:</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {uploadedBanners.map((banner) => (
            <div
              key={banner.id}
              className={`
                relative rounded-md overflow-hidden border-2 h-24 group
                ${banner.bannerUrl === currentBannerUrl ? 'border-primary' : 'border-transparent'}
                hover:border-primary/70 transition-all cursor-pointer
              `}
            >
              <img
                src={banner.bannerUrl}
                alt="Uploaded banner"
                className="w-full h-full object-cover"
                onClick={() => onSelectBanner(banner.bannerUrl)}
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onSelectBanner(banner.bannerUrl)}
                  data-testid={`button-select-banner-${banner.id}`}
                >
                  Select
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteBanner.mutate(banner.id);
                  }}
                  disabled={deleteBanner.isPending}
                  data-testid={`button-delete-banner-${banner.id}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Profile Picture Border Section Component
const ProfilePictureBorderSection: React.FC<{
  userId?: number;
  currentBorderId?: number | null;
}> = ({ userId, currentBorderId }) => {
  const { toast } = useToast();

  // Fetch user's unlocked avatar borders
  const { data: unlockedBorders = [], isLoading } = useQuery<AssetReward[]>({
    queryKey: ['/api/user/avatar-borders'],
    queryFn: getQueryFn({ on401: 'returnNull' }),
    enabled: !!userId,
  });

  // Mutation to update selected avatar border
  const updateBorderMutation = useMutation({
    mutationFn: async (avatarBorderId: number | null) => {
      const response = await apiRequest('PUT', '/api/user/avatar-border', { avatarBorderId });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      if (userId) {
        queryClient.invalidateQueries({ queryKey: [`/api/user/${userId}/avatar-border`] });
      }
      toast({
        title: "Profile picture border updated",
        description: "Your new border has been applied.",
        variant: "gamefolioSuccess",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile picture border.",
        variant: "destructive",
      });
    },
  });

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return 'from-yellow-400 to-yellow-600';
      case 'epic': return 'from-purple-400 to-purple-600';
      case 'rare': return 'from-blue-400 to-blue-600';
      default: return 'from-gray-400 to-gray-600';
    }
  };

  const getRarityBorderColor = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return 'border-yellow-500';
      case 'epic': return 'border-purple-500';
      case 'rare': return 'border-blue-500';
      default: return 'border-gray-500';
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Profile Picture Border
        </h3>
        <p className="text-sm text-muted-foreground">
          Select a border from your unlocked rewards.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : unlockedBorders.length === 0 ? (
        <div className="p-4 bg-muted/50 rounded-lg border text-center">
          <Sparkles className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            No profile picture borders unlocked yet. Check back soon for ways to unlock exclusive borders!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Remove Border Option */}
          {currentBorderId && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateBorderMutation.mutate(null)}
              disabled={updateBorderMutation.isPending}
              className="w-full"
              data-testid="button-remove-avatar-border"
            >
              <X className="h-4 w-4 mr-2" />
              Remove Current Border
            </Button>
          )}

          {/* Available Borders Grid */}
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {unlockedBorders.map((border) => {
              const isSelected = currentBorderId === border.id;
              return (
                <button
                  key={border.id}
                  type="button"
                  onClick={() => updateBorderMutation.mutate(border.id)}
                  disabled={updateBorderMutation.isPending}
                  className={`
                    relative p-2 rounded-lg transition-all transform hover:scale-105
                    ${isSelected 
                      ? `ring-2 ring-primary bg-primary/20 ${getRarityBorderColor(border.rarity || 'common')}` 
                      : 'border border-border hover:border-primary/50'}
                  `}
                  data-testid={`button-select-border-${border.id}`}
                >
                  {/* Border Preview */}
                  <div className="relative aspect-square rounded-full overflow-hidden">
                    <img
                      src={border.imageUrl}
                      alt={border.name}
                      className="w-full h-full object-cover"
                    />
                    {/* Rarity Glow Effect */}
                    <div 
                      className={`absolute inset-0 rounded-full bg-gradient-to-br ${getRarityColor(border.rarity || 'common')} opacity-20`}
                    />
                  </div>

                  {/* Border Name */}
                  <p className="text-xs font-medium text-center mt-1 truncate">
                    {border.name}
                  </p>

                  {/* Rarity Badge */}
                  <div 
                    className={`absolute -top-1 -right-1 w-3 h-3 rounded-full bg-gradient-to-br ${getRarityColor(border.rarity || 'common')}`}
                    title={border.rarity || 'common'}
                  />

                  {/* Selected Indicator */}
                  {isSelected && (
                    <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground rounded-full p-1">
                      <Check className="h-3 w-3" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const AppearanceSettingsPage: React.FC = () => {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const updateProfile = useUpdateProfile();
  const [selectedBannerUrl, setSelectedBannerUrl] = useState<string>('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');

  // Fetch user's unlocked profile banners (only banners they have access to)
  const { data: profileBanners = [], isLoading: bannersLoading } = useQuery<ProfileBanner[]>({
    queryKey: ['/api/user/unlocked-banners'],
    queryFn: getQueryFn({ on401: 'returnNull' }),
    enabled: !!user,
  });

  // Define form schemas with Zod
  const appearanceFormSchema = z.object({
    accentColor: z.string().min(1),
    primaryColor: z.string().min(1),
    avatarBorderColor: z.string().min(1),
    bannerUrl: z.string().optional().nullable(),
    displayName: z.string().min(2, 'Display name must be at least 2 characters'),
    bio: z.string().max(500, 'Bio cannot exceed 500 characters').optional().or(z.literal('')),
  });

  // Theme presets
  const themePresets = {
    default: {
      name: 'Default',
      description: 'Original Gamefolio theme',
      accentColor: '#4ADE80',        // Green accent (existing web app)
      primaryColor: '#0B2232',       // Use backgroundColor instead of primaryColor
      avatarBorderColor: '#4ADE80',  // Green border (existing web app)
    },
    gamefolio: {
      name: 'Forest Green',
      description: 'Enhanced green theme',
      accentColor: '#4ADE80',        // Green accent (existing web app)
      primaryColor: '#101D27',       // Dark background (existing web app)  
      avatarBorderColor: '#4ADE80',  // Green border (existing web app)
    },
    blueOcean: {
      name: 'Ocean Blue',
      description: 'Cool blue theme',
      accentColor: '#3B82F6',        // Blue accent
      primaryColor: '#0F172A',       // Dark blue background
      avatarBorderColor: '#3B82F6',  // Blue border
    },
    purple: {
      name: 'Purple Night',
      description: 'Purple gaming theme',
      accentColor: '#8B5CF6',        // Purple accent
      primaryColor: '#1E1B4B',       // Dark purple background
      avatarBorderColor: '#8B5CF6',  // Purple border
    },
    roseGold: {
      name: 'Rose Gold',
      description: 'Elegant rose theme',
      accentColor: '#F43F5E',        // Rose accent
      primaryColor: '#2D1B69',       // Dark purple background
      avatarBorderColor: '#F43F5E',  // Rose border
    },
    sunset: {
      name: 'Sunset Orange',
      description: 'Warm orange theme',
      accentColor: '#F97316',        // Orange accent
      primaryColor: '#7C2D12',       // Dark orange background
      avatarBorderColor: '#F97316',  // Orange border
    },
    arcticBlue: {
      name: 'Arctic Blue',
      description: 'Cool arctic theme',
      accentColor: '#0EA5E9',        // Light blue accent
      primaryColor: '#164E63',       // Dark blue background
      avatarBorderColor: '#0EA5E9',  // Light blue border
    }
  };

  // Default to Rose Gold theme (no longer green/blue)
  const defaultGamefolioTheme = themePresets.roseGold;

  // Separate state for preview colors that persists independently of form resets
  const [previewColors, setPreviewColors] = useState<{
    accentColor: string;
    primaryColor: string;
    avatarBorderColor: string;
  }>({
    accentColor: user?.accentColor || defaultGamefolioTheme.accentColor,
    primaryColor: user?.backgroundColor || user?.primaryColor || defaultGamefolioTheme.primaryColor,
    avatarBorderColor: user?.avatarBorderColor || defaultGamefolioTheme.avatarBorderColor,
  });

  // Set up React Hook Form
  const appearanceForm = useForm<z.infer<typeof appearanceFormSchema>>({
    resolver: zodResolver(appearanceFormSchema),
    defaultValues: {
      accentColor: user?.accentColor || defaultGamefolioTheme.accentColor,
      primaryColor: user?.backgroundColor || user?.primaryColor || defaultGamefolioTheme.primaryColor, 
      avatarBorderColor: user?.avatarBorderColor || defaultGamefolioTheme.avatarBorderColor,
      bannerUrl: user?.bannerUrl || '',
      displayName: user?.displayName || '',
      bio: user?.bio || '',
    },
    mode: 'onChange', // Enable real-time validation
  });

  const accentColor = appearanceForm.watch('accentColor');
  const primaryColor = appearanceForm.watch('primaryColor');
  const avatarBorderColor = appearanceForm.watch('avatarBorderColor');

  // Use preview colors for the background and accent colors
  const currentBgColor = previewColors.primaryColor;
  const currentAccentColor = previewColors.accentColor;

  // Update form and preview colors when user data changes - but ONLY if colors actually changed
  useEffect(() => {
    if (user && !appearanceForm.formState.isDirty) {
      const updates = {
        accentColor: user.accentColor || defaultGamefolioTheme.accentColor,
        primaryColor: user.backgroundColor || user.primaryColor || defaultGamefolioTheme.primaryColor,
        avatarBorderColor: user.avatarBorderColor || defaultGamefolioTheme.avatarBorderColor,
        bannerUrl: user.bannerUrl || '',
        displayName: user.displayName || '',
        bio: user.bio || '',
      };

      // Only reset form if colors are different (prevents reversion after save)
      const currentValues = appearanceForm.getValues();
      const needsUpdate = currentValues.accentColor !== updates.accentColor || 
                         currentValues.primaryColor !== updates.primaryColor || 
                         currentValues.avatarBorderColor !== updates.avatarBorderColor;

      if (needsUpdate) {
        // Reset form with fresh user data
        appearanceForm.reset(updates);

        // Update preview colors to match the user's saved colors
        setPreviewColors({
          accentColor: updates.accentColor,
          primaryColor: updates.primaryColor,
          avatarBorderColor: updates.avatarBorderColor,
        });

        console.log('📋 Form and preview colors updated with user data:', updates);
      }
    }
  }, [user, appearanceForm, defaultGamefolioTheme]);

  // Handle avatar file selection
  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('🎯 NEW CODE LOADED - handleAvatarChange triggered');
    const file = event.target.files?.[0];
    if (file) {
      console.log('📸 File selected:', file.name, 'avatarFile state will update');
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Profile picture must be less than 5MB",
          variant: "destructive",
        });
        return;
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please select an image file",
          variant: "destructive",
        });
        return;
      }

      setAvatarFile(file);
      console.log('✅ avatarFile state updated, button should now be enabled');

      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string);
        console.log('🖼️ Preview created');
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle form submission
  const onAppearanceSubmit = async (values: z.infer<typeof appearanceFormSchema>) => {
    if (!user) return;

    try {
      let avatarUrl = user.avatarUrl;

      // Upload new avatar if selected
      if (avatarFile) {
        const formData = new FormData();
        formData.append('file', avatarFile);
        formData.append('userId', user.id.toString());

        const response = await fetch('/api/upload/avatar', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Failed to upload avatar');
        }

        const uploadResult = await response.json();
        avatarUrl = uploadResult.avatarUrl;
      }

      // CRITICAL: Preserve ALL existing user data and only update what's in the form
      const updateData = {
        // Preserve existing user data
        displayName: values.displayName || user.displayName,
        bio: values.bio || user.bio || '',
        avatarUrl,
        // Theme colors
        accentColor: values.accentColor,
        primaryColor: values.primaryColor,
        avatarBorderColor: values.avatarBorderColor,
        backgroundColor: values.primaryColor, // Map primaryColor to backgroundColor for API compatibility
        // Banner URL - preserve existing if form value is empty
        bannerUrl: values.bannerUrl || user.bannerUrl || '',
      };

      console.log('💾 FORM SUBMISSION - Preserving all user data:', updateData);

      // Update profile with preserved data
      updateProfile.mutate({
        userId: user.id,
        userData: updateData
      });

      // Handle success state immediately since mutation is async
      // Reset avatar upload state
      setAvatarFile(null);
      setAvatarPreview('');

      console.log('💾 Profile saved successfully - preview colors will be preserved');
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Failed to upload profile picture. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/auth" />;
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

  // Page background uses saved user colors (not current form values)
  const bgRgb = user?.backgroundColor ? hexToRgb(user.backgroundColor) : null;
  const accentRgb = user?.accentColor ? hexToRgb(user.accentColor) : null;

  // Preview colors use current form values
  const previewBgRgb = currentBgColor ? hexToRgb(currentBgColor) : null;
  const previewAccentRgb = currentAccentColor ? hexToRgb(currentAccentColor) : null;

  return (
    <div 
      className="min-h-screen py-8"
    >
      <div className="container max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Profile & Appearance</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Current theme:</span>
          <div className="flex items-center gap-2">
            <div 
              className="w-4 h-4 rounded-full border border-border"
              style={{ backgroundColor: previewColors.accentColor }}
            />
            <span className="text-sm font-medium">
              {(() => {
                const currentTheme = Object.entries(themePresets).find(([key, preset]) => 
                  previewColors.accentColor === preset.accentColor && 
                  previewColors.primaryColor === preset.primaryColor &&
                  previewColors.avatarBorderColor === preset.avatarBorderColor
                );
                return currentTheme ? currentTheme[1].name : 'Custom Theme';
              })()}
            </span>
          </div>
        </div>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Profile Settings</CardTitle>
          <CardDescription>
            Manage your basic profile information and how it appears to others.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Form {...appearanceForm}>
            <form id="profile-form" className="space-y-6" onSubmit={appearanceForm.handleSubmit(onAppearanceSubmit)}>
              {/* Profile Picture Section */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium">Profile Picture</h3>
                  <p className="text-sm text-muted-foreground">
                    Upload a profile picture that represents you. Recommended size: 400x400 pixels or larger.
                  </p>
                </div>

                <div className="flex items-start space-x-6">
                  {/* Current/Preview Avatar */}
                  <div className="flex flex-col items-center space-y-2">
                    <Avatar className="h-24 w-24 border-4 border-border">
                      <AvatarImage 
                        src={avatarPreview || user?.avatarUrl || ''} 
                        alt={user?.displayName} 
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
                    <div className="flex flex-wrap gap-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        className="relative"
                        onClick={() => document.getElementById('avatar-upload')?.click()}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        {avatarFile ? 'Change Picture' : 'Upload Picture'}
                      </Button>

                      {avatarFile && (
                        <Button 
                          type="button" 
                          variant="ghost" 
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

              {/* Display Name */}
              <FormField
                control={appearanceForm.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Your display name" {...field} />
                    </FormControl>
                    <FormDescription>
                      This is your public display name.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Bio */}
              <FormField
                control={appearanceForm.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bio</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Tell others a bit about yourself" 
                        className="min-h-32"
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Your bio is displayed on your Gamefolio profile.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Profile Appearance Settings</CardTitle>
          <CardDescription>
            Personalize how your gamefolio profile looks to others. These color changes only affect your profile page, not the entire site.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {/* Profile Picture Border Section */}
          <ProfilePictureBorderSection userId={user?.id} currentBorderId={user?.selectedAvatarBorderId} />
          
          <Form {...appearanceForm}>
            <form 
              id="appearance-form" 
              onSubmit={appearanceForm.handleSubmit(onAppearanceSubmit)} 
              className="space-y-6 mt-6"
            >
              {/* Theme Presets */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Quick Themes</h3>
                  {/* Current Theme Indicator */}
                  {Object.entries(themePresets).map(([key, preset]) => {
                    const isCurrentTheme = 
                      previewColors.accentColor === preset.accentColor && 
                      previewColors.primaryColor === preset.primaryColor;

                    // Debug logging for theme detection
                    if (key === 'default') {
                      console.log('🔍 Default theme detection:', {
                        themeName: preset.name,
                        currentAccent: accentColor,
                        presetAccent: preset.accentColor,
                        accentMatch: accentColor === preset.accentColor,
                        currentPrimary: primaryColor,
                        presetPrimary: preset.primaryColor,
                        primaryMatch: primaryColor === preset.primaryColor,
                        isCurrentTheme
                      });
                    }

                    if (isCurrentTheme) {
                      return (
                        <div key={key} className="flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full border border-primary/20">
                          <div 
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: preset.accentColor }}
                          />
                          <span className="text-sm font-medium text-primary">
                            Current: {preset.name}
                          </span>
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {Object.entries(themePresets).map(([key, preset]) => {
                    const isActive = 
                      previewColors.accentColor === preset.accentColor && 
                      previewColors.primaryColor === preset.primaryColor &&
                      previewColors.avatarBorderColor === preset.avatarBorderColor;

                    // Check if this theme is already saved in the user's profile
                    const isSaved = user && 
                      user.accentColor === preset.accentColor && 
                      (user.backgroundColor || user.primaryColor) === preset.primaryColor && 
                      user.avatarBorderColor === preset.avatarBorderColor;

                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          console.log('🎨 Theme preset clicked:', preset.name);

                          // Get current banner URL to preserve it
                          const currentBannerUrl = appearanceForm.getValues('bannerUrl');
                          
                          // Update both form values AND preview colors
                          appearanceForm.setValue('accentColor', preset.accentColor, { shouldDirty: true });
                          appearanceForm.setValue('primaryColor', preset.primaryColor, { shouldDirty: true });
                          appearanceForm.setValue('avatarBorderColor', preset.avatarBorderColor, { shouldDirty: true });
                          
                          // CRITICAL: Explicitly preserve banner URL to prevent it from disappearing
                          if (currentBannerUrl) {
                            appearanceForm.setValue('bannerUrl', currentBannerUrl, { shouldDirty: false });
                            console.log('🖼️ Banner URL preserved during theme change:', currentBannerUrl);
                          }

                          // Update preview colors to persist the selection
                          setPreviewColors({
                            accentColor: preset.accentColor,
                            primaryColor: preset.primaryColor,
                            avatarBorderColor: preset.avatarBorderColor,
                          });

                          toast({
                            title: "Theme applied",
                            description: `${preset.name} theme selected. Click "Save Profile & Appearance" to apply changes.`,
                            duration: 3000,
                          });
                        }}
                        className={`p-4 rounded-lg transition-all text-left relative transform hover:scale-105 ${
                          isActive 
                            ? 'border-4 border-primary bg-primary/20 shadow-xl ring-4 ring-primary/20' 
                            : 'border-2 border-border hover:bg-muted/50 hover:border-primary/50 hover:shadow-lg'
                        }`}
                        style={{ backgroundColor: preset.primaryColor }}
                      >
                        {/* Theme color preview circle with enhanced styling */}
                        <div className="flex items-center justify-center mb-3">
                          <div 
                            className={`w-10 h-10 rounded-full border-2 transition-all ${
                              isActive ? 'border-white border-4 shadow-xl' : 'border-white/30'
                            }`}
                            style={{ 
                              backgroundColor: preset.accentColor,
                              boxShadow: isActive ? `0 0 25px ${preset.accentColor}80` : 'none'
                            }}
                          />
                        </div>

                        {/* Theme name with enhanced styling */}
                        <div className={`text-sm font-medium text-center transition-all ${
                          isActive ? 'text-white text-base font-bold' : 'text-white/90'
                        }`}>
                          {preset.name}
                        </div>

                        {/* Enhanced active indicator with pulse animation */}
                        {isActive && (
                          <>
                            {/* "ACTIVE" label at the top */}
                            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                              <div className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide shadow-lg border-2 border-white">
                                ACTIVE
                              </div>
                            </div>

                            <div className="absolute top-2 right-2">
                              <div className="flex items-center justify-center w-7 h-7 bg-primary rounded-full border-2 border-white shadow-xl animate-pulse">
                                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </div>
                            </div>

                            {/* Bottom theme name highlight */}
                            <div className="absolute bottom-2 left-2 right-2">
                              <div className="bg-primary/90 text-primary-foreground px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wide text-center backdrop-blur-sm">
                                Current Theme
                              </div>
                            </div>
                          </>
                        )}

                        {/* "SELECTED" indicator for saved themes */}
                        {isSaved && !isActive && (
                          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                            <div className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide shadow-lg border-2 border-white">
                              SELECTED
                            </div>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Profile Banner */}
              <FormField
                control={appearanceForm.control}
                name="bannerUrl"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Profile Banner</FormLabel>
                    <FormControl>
                      <div className="space-y-3">
                        <div className="w-full h-48 overflow-hidden rounded-lg border border-border">
                          {field.value ? (
                            <img 
                              src={field.value} 
                              alt="Profile banner" 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground">
                              No banner selected
                            </div>
                          )}
                        </div>

                        {/* Banner Categories */}
                        <div className="space-y-4">
                          {/* Gradient Banners */}
                          {profileBanners.filter(banner => banner.category === 'gradient').length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium mb-2">Gradient Banners</h4>
                              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                {profileBanners
                                  .filter(banner => banner.category === 'gradient')
                                  .map((banner: ProfileBanner) => (
                                  <div 
                                    key={banner.id}
                                    data-testid={`banner-gradient-${banner.id}`}
                                    className={`
                                      cursor-pointer rounded-md overflow-hidden border-2 h-40 relative
                                      ${field.value === banner.imageUrl ? 'border-primary' : 'border-transparent'}
                                      hover:border-primary/70 transition-all
                                    `}
                                    onClick={() => {
                                      field.onChange(banner.imageUrl);
                                      setSelectedBannerUrl(banner.imageUrl);
                                    }}
                                  >
                                    <img 
                                      src={banner.imageUrl} 
                                      alt={banner.name}
                                      className="w-full h-full object-cover" 
                                    />
                                    <div className="p-2 bg-black/75 text-white text-sm font-medium absolute bottom-0 left-0 right-0">
                                      {banner.name}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Solid Banners */}
                          {profileBanners.filter(banner => banner.category === 'solid').length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium mb-2">Solid Banners</h4>
                              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                {profileBanners
                                  .filter(banner => banner.category === 'solid')
                                  .map((banner: ProfileBanner) => (
                                  <div 
                                    key={banner.id}
                                    data-testid={`banner-solid-${banner.id}`}
                                    className={`
                                      cursor-pointer rounded-md overflow-hidden border-2 h-40 relative
                                      ${field.value === banner.imageUrl ? 'border-primary' : 'border-transparent'}
                                      hover:border-primary/70 transition-all
                                    `}
                                    onClick={() => {
                                      field.onChange(banner.imageUrl);
                                      setSelectedBannerUrl(banner.imageUrl);
                                    }}
                                  >
                                    <img 
                                      src={banner.imageUrl} 
                                      alt={banner.name}
                                      className="w-full h-full object-cover" 
                                    />
                                    <div className="p-2 bg-black/75 text-white text-sm font-medium absolute bottom-0 left-0 right-0">
                                      {banner.name}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Show loading state */}
                          {bannersLoading && (
                            <div className="p-4 flex items-center justify-center">
                              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                          )}

                          {/* Show message if no banners unlocked */}
                          {!bannersLoading && profileBanners.length === 0 && (
                            <div className="p-4 bg-muted/50 rounded-lg border text-center">
                              <Sparkles className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                              <p className="text-sm text-muted-foreground">
                                No banners unlocked yet. Check back soon for ways to unlock exclusive banners!
                              </p>
                              <p className="text-xs text-muted-foreground mt-2">
                                You can still upload a custom banner below.
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Custom Banner Upload */}
                        <div className="mt-4">
                          <h4 className="text-sm font-medium mb-2">Upload Custom Banner</h4>
                          <BannerUploadPreview
                            onUpload={(bannerUrl: string) => {
                              console.log('🔥 ===============================');
                              console.log('🎯 BANNER UPLOADED - Processing:', bannerUrl);
                              console.log('📋 Form state BEFORE banner upload:', appearanceForm.getValues());

                              // CRITICAL: Update form field immediately and clear preset selection
                              field.onChange(bannerUrl);
                              setSelectedBannerUrl(''); // Clear preset selection state

                              // Force form to be dirty so changes are tracked
                              appearanceForm.setValue('bannerUrl', bannerUrl, { 
                                shouldDirty: true, 
                                shouldValidate: true,
                                shouldTouch: true
                              });

                              console.log('📋 Form state AFTER banner upload:', appearanceForm.getValues());
                              console.log('✅ Banner form field updated to:', bannerUrl);
                              console.log('🔥 ===============================');

                              toast({
                                title: "Custom banner uploaded",
                                description: "Your custom banner has been set. Save your profile to apply changes.",
                                variant: "gamefolioSuccess",
                              });

                              // Refetch uploaded banners
                              queryClient.invalidateQueries({ queryKey: ['/api/user/banners'] });
                            }}
                            onCancel={() => {
                              console.log('🚫 Banner upload cancelled');
                            }}
                          />
                        </div>

                        {/* Uploaded Banners History */}
                        <UploadedBannersSection 
                          onSelectBanner={(bannerUrl: string) => {
                            field.onChange(bannerUrl);
                            setSelectedBannerUrl('');
                            appearanceForm.setValue('bannerUrl', bannerUrl, { 
                              shouldDirty: true, 
                              shouldValidate: true,
                              shouldTouch: true
                            });

                            toast({
                              title: "Banner selected",
                              description: "Your uploaded banner has been selected. Save your profile to apply changes.",
                              variant: "gamefolioSuccess",
                            });
                          }}
                          currentBannerUrl={field.value || ''}
                        />
                      </div>
                    </FormControl>
                    <FormDescription>
                      Select a banner image for your profile page or upload your own custom banner.
                    </FormDescription>
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </CardContent>

        <CardFooter>
          <Button 
            type="submit" 
            form="profile-form"
            disabled={(() => {
              const isFormDirty = appearanceForm.formState.isDirty;
              const hasAvatar = !!avatarFile;
              const isPending = updateProfile.isPending;
              const shouldDisable = (!isFormDirty && !hasAvatar) || isPending;
              console.log('🔘 Button render:', { isFormDirty, hasAvatar, isPending, shouldDisable });
              return shouldDisable;
            })()}
            data-testid="button-save-profile-appearance"
          >
            {updateProfile.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Profile & Appearance'
            )}
          </Button>
        </CardFooter>
      </Card>

      {/* Current Theme */}
      <Card>
        <CardHeader>
          <CardTitle>Current Theme</CardTitle>
          <CardDescription>
            Your active theme colors.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            {/* Theme Name */}
            <div className="p-4 bg-muted/50 rounded-lg border">
              <div className="font-semibold text-lg mb-4">
                {(() => {
                  const currentTheme = Object.entries(themePresets).find(([key, preset]) => 
                    previewColors.accentColor === preset.accentColor && 
                    previewColors.primaryColor === preset.primaryColor &&
                    previewColors.avatarBorderColor === preset.avatarBorderColor
                  );
                  return currentTheme ? currentTheme[1].name : 'Custom Theme';
                })()}
              </div>

              {/* Accent Colour and Background Colour */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-8 h-8 rounded-full border-2 border-white shadow-lg"
                      style={{ backgroundColor: previewColors.accentColor }}
                    />
                    <span className="font-medium text-lg">Accent Colour</span>
                  </div>
                  <div className="text-sm text-muted-foreground font-mono ml-11">
                    {previewColors.accentColor}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-8 h-8 rounded-full border-2 border-white shadow-lg"
                      style={{ backgroundColor: previewColors.primaryColor }}
                    />
                    <span className="font-medium text-lg">Background Colour</span>
                  </div>
                  <div className="text-sm text-muted-foreground font-mono ml-11">
                    {previewColors.primaryColor}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
};

export default AppearanceSettingsPage;