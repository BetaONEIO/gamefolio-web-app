import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useUpdateProfile } from '@/hooks/use-profile';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, getQueryFn } from '@/lib/queryClient';
import { useQuery } from '@tanstack/react-query';
import { Redirect } from 'wouter';
import { Loader2, Video, Gamepad2, Trophy, Upload, Code, Eye, Coffee, Scroll, Sparkles, CheckCircle2 } from 'lucide-react';
import { HexColorPicker } from "react-colorful";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@/components/ui/tabs';
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { FaSteam, FaXbox, FaPlaystation, FaYoutube, FaDiscord } from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';
import { SiEpicgames, SiNintendo } from 'react-icons/si';
import { ProfilePictureSelector } from '@/components/profile/ProfilePictureSelector';
import { useSignedUrl } from '@/hooks/use-signed-url';

const userTypeOptions = [
  { id: "streamer", label: "Streamer", description: "I stream games live", icon: Video, color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  { id: "gamer", label: "Gamer", description: "I love playing games", icon: Gamepad2, color: "bg-green-500/20 text-green-400 border-green-500/30" },
  { id: "professional_gamer", label: "Pro Gamer", description: "I compete in esports", icon: Trophy, color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  { id: "content_creator", label: "Creator", description: "I create gaming content", icon: Upload, color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  { id: "indie_developer", label: "Indie Dev", description: "I develop games", icon: Code, color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" },
  { id: "viewer", label: "Viewer", description: "I watch gaming content", icon: Eye, color: "bg-gray-500/20 text-gray-400 border-gray-500/30" },
  { id: "filthy_casual", label: "Casual", description: "I play when I can", icon: Coffee, color: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  { id: "doom_scroller", label: "Doom Scroller", description: "I watch clips all day", icon: Scroll, color: "bg-red-500/20 text-red-400 border-red-500/30" },
];

type ProfileBanner = {
  id: number;
  name: string;
  category: string;
  imageUrl: string;
  createdAt: string;
};

const ProfileSettingsPage: React.FC = () => {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const updateProfile = useUpdateProfile();
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);
  
  // Get signed URL for avatar (handles private Supabase bucket)
  const { signedUrl: avatarSignedUrl, isLoading: avatarLoading } = useSignedUrl(user?.avatarUrl);

  // Fetch user's unlocked profile banners
  const { data: unlockedBanners = [], isLoading: bannersLoading } = useQuery<ProfileBanner[]>({
    queryKey: ['/api/user/unlocked-banners'],
    queryFn: getQueryFn({ on401: 'returnNull' }),
    enabled: !!user,
  });
  
  // Handle file upload for avatar
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Profile picture must be less than 5MB",
        variant: "destructive"
      });
      return;
    }
    
    // Check file type - support all major image formats
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
        variant: "destructive"
      });
      return;
    }
    
    // Check if user is uploading a GIF without Pro status
    const isGif = file.type === 'image/gif' || file.name.toLowerCase().endsWith('.gif');
    const isPro = user?.isPro === true;
    
    // Create form data for upload
    const formData = new FormData();
    formData.append('avatar', file);
    
    try {
      setAvatarUploading(true);
      
      // Upload the file to server
      const response = await fetch('/api/upload/avatar', {
        method: 'POST',
        body: formData,
        headers: {
          'X-User-ID': user.id.toString(), // Add user ID for authentication
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error("Failed to upload avatar");
      }
      
      const data = await response.json();
      console.log("Avatar uploaded successfully:", data.avatarUrl);
      
      // Create a local URL for immediate preview
      const objectUrl = URL.createObjectURL(file);
      setAvatarPreview(objectUrl);
      
      // Update the form value with the server path and mark it as dirty
      profileForm.setValue('avatarUrl', data.avatarUrl, { shouldDirty: true, shouldValidate: true });
      
      // Show appropriate message based on GIF/Pro status
      if (isGif && isPro) {
        toast({
          title: "Animated avatar uploaded!",
          description: "Your GIF profile picture is ready. Click save to update your profile.",
          variant: "default"
        });
      } else if (isGif && !isPro) {
        toast({
          title: "GIF converted to static image",
          description: "Upgrade to Pro to keep your profile picture animated! Click save to update.",
          variant: "default"
        });
      } else {
        toast({
          title: "Avatar uploaded",
          description: "Click save to update your profile with the new picture",
          variant: "default"
        });
      }
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload profile picture",
        variant: "destructive"
      });
    } finally {
      setAvatarUploading(false);
    }
  };
  
  // Define form schema with Zod
  const profileFormSchema = z.object({
    username: z.string().min(3).max(20),
    displayName: z.string().min(2).max(50),
    bio: z.string().max(300).optional().nullable(),
    avatarUrl: z.string().optional().nullable(),
    accentColor: z.string().min(1),
    primaryColor: z.string().min(1),
    avatarBorderColor: z.string().min(1),
    bannerUrl: z.string().optional().nullable(),
    // User type settings
    userType: z.string().optional().nullable(),
    showUserType: z.boolean().optional(),
    // Platform connections
    steamUsername: z.string().optional().nullable(),
    xboxUsername: z.string().optional().nullable(),
    playstationUsername: z.string().optional().nullable(),
    discordUsername: z.string().optional().nullable(),
    epicUsername: z.string().optional().nullable(),
    nintendoUsername: z.string().optional().nullable(),
  });

  // Set up React Hook Form
  const profileForm = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      username: user?.username || '',
      displayName: user?.displayName || '',
      bio: user?.bio || '',
      avatarUrl: user?.avatarUrl || '',
      accentColor: user?.accentColor || '#4ADE80',
      primaryColor: user?.primaryColor || '#02172C',
      avatarBorderColor: user?.avatarBorderColor || '#4ADE80',
      bannerUrl: user?.bannerUrl || '',
      // User type settings
      userType: user?.userType || '',
      showUserType: user?.showUserType !== false,
      // Platform connections
      steamUsername: user?.steamUsername || '',
      xboxUsername: user?.xboxUsername || '',
      playstationUsername: user?.playstationUsername || '',
      discordUsername: user?.discordUsername || '',
      epicUsername: user?.epicUsername || '',
      nintendoUsername: user?.nintendoUsername || '',
    },
  });

  useEffect(() => {
    if (user) {
      profileForm.reset({
        username: user.username || '',
        displayName: user.displayName || '',
        bio: user.bio || '',
        avatarUrl: user.avatarUrl || '',
        accentColor: user.accentColor || '#4ADE80',
        primaryColor: user.primaryColor || '#02172C',
        avatarBorderColor: user.avatarBorderColor || '#4ADE80',
        bannerUrl: user.bannerUrl || '',
        userType: user.userType || '',
        showUserType: user.showUserType !== false,
        steamUsername: user.steamUsername || '',
        xboxUsername: user.xboxUsername || '',
        playstationUsername: user.playstationUsername || '',
        discordUsername: user.discordUsername || '',
        epicUsername: user.epicUsername || '',
        nintendoUsername: user.nintendoUsername || '',
      });
    }
  }, [user]);

  // Helper function to normalize values for comparison (treats null, undefined, and empty strings as equivalent)
  const normalizeValue = (value: string | null | undefined): string => {
    return value?.trim() || '';
  };

  // Check if there are actual changes
  const hasActualChanges = () => {
    const formValues = profileForm.getValues();
    
    return (
      normalizeValue(formValues.displayName) !== normalizeValue(user?.displayName) ||
      normalizeValue(formValues.bio) !== normalizeValue(user?.bio) ||
      normalizeValue(formValues.avatarUrl) !== normalizeValue(user?.avatarUrl) ||
      formValues.accentColor !== (user?.accentColor || '#4ADE80') ||
      formValues.primaryColor !== (user?.primaryColor || '#02172C') ||
      formValues.avatarBorderColor !== (user?.avatarBorderColor || '#4ADE80') ||
      normalizeValue(formValues.bannerUrl) !== normalizeValue(user?.bannerUrl) ||
      normalizeValue(formValues.steamUsername) !== normalizeValue(user?.steamUsername) ||
      normalizeValue(formValues.xboxUsername) !== normalizeValue(user?.xboxUsername) ||
      normalizeValue(formValues.playstationUsername) !== normalizeValue(user?.playstationUsername) ||
      normalizeValue(formValues.discordUsername) !== normalizeValue(user?.discordUsername) ||
      normalizeValue(formValues.epicUsername) !== normalizeValue(user?.epicUsername) ||
      normalizeValue(formValues.nintendoUsername) !== normalizeValue(user?.nintendoUsername) ||
      normalizeValue(formValues.userType) !== normalizeValue(user?.userType) ||
      formValues.showUserType !== (user?.showUserType !== false)
    );
  };

  // Handle form submission
  const onProfileSubmit = (values: z.infer<typeof profileFormSchema>) => {
    if (!user) return;

    updateProfile.mutate({
      userId: user.id,
      userData: values
    }, {
      onSuccess: () => {
        toast({
          title: "Profile updated",
          description: "Your profile has been successfully updated.",
        });
        
        // Reset states after successful update
        setAvatarUploading(false);
      },
      onError: (error) => {
        toast({
          title: "Failed to update profile",
          description: error.message,
          variant: "destructive",
        });
      }
    });
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

  return (
    <div className="container max-w-4xl py-8">
      <h1 className="text-3xl font-bold mb-8">Profile Settings</h1>
      
      <Tabs defaultValue="profile">
        <TabsList className="mb-6">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="connections">Platform Connections</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
        </TabsList>
        
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Settings</CardTitle>
              <CardDescription>
                Manage your basic account details and profile information.
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <Form {...profileForm}>
                <form 
                  id="profile-form" 
                  onSubmit={profileForm.handleSubmit(onProfileSubmit)} 
                  className="space-y-6"
                >
                  {/* Profile Picture Upload Section */}
                  <div className="flex items-center space-x-6 mb-6">
                    <div 
                      className="w-20 h-20 border-2 overflow-hidden relative bg-gray-800 rounded-lg"
                      style={{ 
                        borderColor: user.accentColor || '#4ADE80',
                        borderRadius: '8px'
                      }}
                    >
                      {avatarLoading ? (
                        <div className="w-full h-full flex items-center justify-center bg-gray-800 rounded-md">
                          <div className="w-6 h-6 border-2 border-gray-600 border-t-gray-400 rounded-full animate-spin" />
                        </div>
                      ) : avatarPreview || avatarSignedUrl ? (
                        <img
                          src={avatarPreview || avatarSignedUrl || ''}
                          alt={user.displayName}
                          className="w-full h-full object-cover rounded-md"
                        />
                      ) : (
                        <div
                          className="w-full h-full flex items-center justify-center text-lg font-bold text-primary-foreground rounded-md"
                          style={{ 
                            backgroundColor: user.accentColor || '#4ADE80'
                          }}
                        >
                          {user.displayName.charAt(0)}
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <h3 className="text-base font-medium">Profile Picture</h3>
                      <p className="text-sm text-muted-foreground">Your profile picture is visible to other users.</p>
                      {user?.isPro && (
                        <div className="flex items-center gap-2 text-sm text-purple-400 bg-purple-500/10 rounded-lg px-3 py-2 border border-purple-500/20">
                          <Sparkles className="h-4 w-4" />
                          <span>Pro Perk: You can upload animated GIFs as your profile picture!</span>
                        </div>
                      )}
                      {!user?.isPro && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
                          <span>Want animated profile pictures? <a href="/settings/account" className="text-purple-400 hover:text-purple-300 underline">Upgrade to Pro</a> to use GIFs!</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Button
                          variant="outline"
                          onClick={() => setShowAvatarSelector(true)}
                          type="button"
                          className="max-w-xs"
                          data-testid="button-select-avatar"
                        >
                          Select Avatar
                        </Button>
                        <Button
                          variant="outline"
                          type="button"
                          onClick={() => document.getElementById('avatar-upload-input')?.click()}
                          disabled={avatarUploading}
                          className="max-w-xs"
                          data-testid="button-upload-avatar"
                        >
                          Upload Custom
                        </Button>
                        <input
                          id="avatar-upload-input"
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarUpload}
                          className="hidden"
                          data-testid="input-avatar-file"
                        />
                        {avatarUploading && (
                          <div className="flex items-center">
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            <span className="text-xs">Uploading...</span>
                          </div>
                        )}
                      </div>
                  
                      {/* Hidden field to store avatarUrl */}
                      <FormField
                        control={profileForm.control}
                        name="avatarUrl"
                        render={({ field }) => (
                          <FormItem className="hidden">
                            <FormControl>
                              <Input 
                                type="hidden"
                                {...field}
                                value={field.value || ''}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  
                  {/* Display Name */}
                  <FormField
                    control={profileForm.control}
                    name="displayName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Display Name</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Your name" 
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          This is your public display name.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Username - read only */}
                  <FormField
                    control={profileForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="username" 
                            disabled
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Your unique username for your profile URL.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Bio */}
                  <FormField
                    control={profileForm.control}
                    name="bio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bio</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Tell us about yourself" 
                            className="min-h-24 resize-none"
                            {...field}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormDescription>
                          Your bio is displayed on your Gamefolio profile.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* User Type Section */}
                  <div className="space-y-4 pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <div>
                        <FormLabel>User Type Badge</FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Display a badge on your profile showing what type of user you are
                        </p>
                      </div>
                      <FormField
                        control={profileForm.control}
                        name="showUserType"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={profileForm.control}
                      name="userType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Select Your Type</FormLabel>
                          <FormControl>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              {userTypeOptions.map((type) => {
                                const IconComponent = type.icon;
                                const isSelected = field.value === type.id;
                                return (
                                  <button
                                    key={type.id}
                                    type="button"
                                    onClick={() => field.onChange(type.id)}
                                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all text-left ${
                                      isSelected
                                        ? `${type.color} border-current`
                                        : "border-muted hover:border-muted-foreground/50"
                                    }`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <IconComponent className={`h-4 w-4 ${isSelected ? '' : 'text-muted-foreground'}`} />
                                      <span className={`text-sm font-medium ${isSelected ? '' : 'text-muted-foreground'}`}>
                                        {type.label}
                                      </span>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </FormControl>
                          <FormDescription>
                            Choose one that best describes you. This appears as a badge next to your name.
                          </FormDescription>
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  {/* Email field (disabled, not connected to form) */}
                  <div className="space-y-2">
                    <div>
                      <FormLabel htmlFor="email-placeholder">Email</FormLabel>
                      <Input 
                        id="email-placeholder"
                        placeholder="your.email@example.com" 
                        disabled
                        value="Email functionality coming soon."
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Email functionality coming soon.
                    </p>
                  </div>
                </form>
              </Form>
            </CardContent>
            
            <CardFooter>
              <Button 
                type="submit" 
                form="profile-form"
                disabled={avatarUploading || updateProfile.isPending || !hasActualChanges()}
                className="px-8"
              >
                {updateProfile.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Profile'
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="connections">
          <Card>
            <CardHeader>
              <CardTitle>Platform Connections</CardTitle>
              <CardDescription>
                Connect your gaming platform accounts to display on your profile.
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <Form {...profileForm}>
                <form 
                  id="connections-form" 
                  onSubmit={profileForm.handleSubmit(onProfileSubmit)} 
                  className="space-y-6"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[
                      { name: "steamUsername" as const, label: "Steam Username", placeholder: "your-steam-username", description: "Your Steam community username", icon: <FaSteam className="text-[#1B2838]" />, savedValue: user?.steamUsername },
                      { name: "xboxUsername" as const, label: "Xbox Gamertag", placeholder: "YourGamertag", description: "Your Xbox Live gamertag", icon: <FaXbox className="text-[#107C10]" />, savedValue: user?.xboxUsername },
                      { name: "playstationUsername" as const, label: "PlayStation ID", placeholder: "YourPSN_ID", description: "Your PlayStation Network ID", icon: <FaPlaystation className="text-[#003087]" />, savedValue: user?.playstationUsername },
                      { name: "discordUsername" as const, label: "Discord Username", placeholder: "username#1234", description: "Your Discord username and discriminator", icon: <FaDiscord className="text-[#5865F2]" />, savedValue: user?.discordUsername },
                      { name: "epicUsername" as const, label: "Epic Games Username", placeholder: "YourEpicUsername", description: "Your Epic Games Store username", icon: <SiEpicgames className="text-[#000000]" />, savedValue: user?.epicUsername },
                      { name: "nintendoUsername" as const, label: "Nintendo Username", placeholder: "YourNintendoID", description: "Your Nintendo Account username", icon: <SiNintendo className="text-[#E60012]" />, savedValue: user?.nintendoUsername },
                    ].map((platform) => (
                      <FormField
                        key={platform.name}
                        control={profileForm.control}
                        name={platform.name}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              {platform.icon}
                              {platform.label}
                              {platform.savedValue && (
                                <span className="ml-auto flex items-center gap-1 text-xs font-normal text-emerald-400">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  Connected
                                </span>
                              )}
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder={platform.placeholder}
                                {...field}
                                value={field.value || ''}
                                className={platform.savedValue ? 'border-emerald-500/30 focus-visible:ring-emerald-500/30' : ''}
                              />
                            </FormControl>
                            <FormDescription>
                              {platform.description}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                </form>
              </Form>
            </CardContent>
            
            <CardFooter>
              <Button 
                type="submit" 
                form="connections-form"
                disabled={avatarUploading || updateProfile.isPending || !hasActualChanges()}
                className="px-8"
              >
                {updateProfile.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Platform Connections'
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>Appearance Settings</CardTitle>
              <CardDescription>
                Customize how your profile looks with colors and banners.
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <Form {...profileForm}>
                <form 
                  id="appearance-form" 
                  onSubmit={profileForm.handleSubmit(onProfileSubmit)} 
                  className="space-y-6"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Accent Color */}
                    <FormField
                      control={profileForm.control}
                      name="accentColor"
                      render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel>Accent Color</FormLabel>
                          <FormControl>
                            <div className="space-y-3">
                              <div 
                                className="w-full h-10 rounded-md border border-input" 
                                style={{ backgroundColor: field.value || '#4ADE80' }}
                              />
                              <HexColorPicker 
                                color={field.value || '#4ADE80'} 
                                onChange={field.onChange} 
                                style={{ width: '100%' }}
                              />
                            </div>
                          </FormControl>
                          <FormDescription>
                            Choose an accent color for your profile highlights and buttons.
                          </FormDescription>
                        </FormItem>
                      )}
                    />

                    {/* Primary Color */}
                    <FormField
                      control={profileForm.control}
                      name="primaryColor"
                      render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel>Primary Color</FormLabel>
                          <FormControl>
                            <div className="space-y-3">
                              <div 
                                className="w-full h-10 rounded-md border border-input" 
                                style={{ backgroundColor: field.value || '#02172C' }}
                              />
                              <HexColorPicker 
                                color={field.value || '#02172C'} 
                                onChange={field.onChange} 
                                style={{ width: '100%' }}
                              />
                            </div>
                          </FormControl>
                          <FormDescription>
                            Choose a primary color for your profile background elements.
                          </FormDescription>
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  {/* Profile Picture Border Selection */}
                  <FormField
                    control={profileForm.control}
                    name="bannerUrl"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center gap-2 mb-2">
                          <Sparkles className="h-5 w-5 text-primary" />
                          <FormLabel className="text-lg font-medium">Profile Picture Border</FormLabel>
                        </div>
                        <FormDescription className="mb-3">
                          Select a border from your unlocked rewards to customize your profile picture.
                        </FormDescription>
                        <FormControl>
                          <div className="space-y-4">
                            {/* Current Banner Preview */}
                            {field.value && (
                              <div className="w-full h-32 rounded-md overflow-hidden border border-input">
                                <img 
                                  src={field.value} 
                                  alt="Current Banner" 
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )}

                            {/* Loading State */}
                            {bannersLoading && (
                              <div className="p-4 flex items-center justify-center">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                              </div>
                            )}

                            {/* No Banners Unlocked Message */}
                            {!bannersLoading && unlockedBanners.length === 0 && (
                              <div className="p-4 bg-muted/50 rounded-lg border text-center">
                                <Sparkles className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                                <p className="text-sm text-muted-foreground">
                                  No banners unlocked yet. Check back soon for ways to unlock exclusive banners!
                                </p>
                              </div>
                            )}

                            {/* Unlocked Banners Grid */}
                            {!bannersLoading && unlockedBanners.length > 0 && (
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {unlockedBanners.map((banner) => (
                                  <div
                                    key={banner.id}
                                    data-testid={`banner-select-${banner.id}`}
                                    className={`
                                      cursor-pointer rounded-md overflow-hidden border-2 h-24 relative transition-all
                                      ${field.value === banner.imageUrl ? 'border-primary ring-2 ring-primary/50' : 'border-transparent hover:border-primary/50'}
                                    `}
                                    onClick={() => field.onChange(banner.imageUrl)}
                                  >
                                    <img 
                                      src={banner.imageUrl} 
                                      alt={banner.name}
                                      className="w-full h-full object-cover" 
                                    />
                                    <div className="p-1 bg-black/75 text-white text-xs font-medium absolute bottom-0 left-0 right-0 truncate">
                                      {banner.name}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </form>
              </Form>
            </CardContent>
            
            <CardFooter>
              <Button 
                type="submit" 
                form="appearance-form"
                disabled={avatarUploading || updateProfile.isPending || !hasActualChanges()}
                className="px-8"
              >
                {updateProfile.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Appearance'
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Profile Picture Selector Modal */}
      <ProfilePictureSelector
        isOpen={showAvatarSelector}
        onClose={() => setShowAvatarSelector(false)}
        currentAvatarUrl={profileForm.watch('avatarUrl') || user?.avatarUrl || ''}
        onAvatarSelect={(avatarUrl: string) => {
          // Update form field and mark it as dirty so the save button becomes enabled
          profileForm.setValue('avatarUrl', avatarUrl, { shouldDirty: true, shouldValidate: true });
          // Update preview immediately
          setAvatarPreview(avatarUrl);
          
          toast({
            title: "Avatar selected",
            description: "Click 'Save Profile' to update your profile picture.",
            variant: "default"
          });
        }}
      />
    </div>
  );
};

export default ProfileSettingsPage;