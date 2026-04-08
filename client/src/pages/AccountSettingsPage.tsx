import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useUpdateProfile } from '@/hooks/use-profile';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, getQueryFn } from '@/lib/queryClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Redirect } from 'wouter';
import { Loader2, Trash2, AlertTriangle, Shield, Palette, Type, Sparkles, Check, X, Save, Smile, User, KeyRound, Gift, Copy, ExternalLink, Users, Star } from 'lucide-react';
import { validatePassword, isPasswordValid } from '@/lib/password-validation';
import { PasswordRequirementsDisplay } from '@/components/ui/password-requirements';

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
  TabsTrigger,
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
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';


import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { HexColorPicker } from "react-colorful";
import { BlockedUsersSection } from '@/components/settings/blocked-users-section';
import { TwoFactorSettings } from '@/components/TwoFactorSettings';
import { useSignedUrl } from '@/hooks/use-signed-url';
import type { NameTag, VerificationBadge } from '@shared/schema';

// Form validation schemas


const securityFormSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character (!@#$%^&*)')
    .optional()
    .or(z.literal('')),
  confirmPassword: z.string().optional().or(z.literal('')),
}).refine(data => 
  !data.newPassword || data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const FONT_OPTIONS = [
  { value: 'default', label: 'Default', family: 'system-ui, sans-serif' },
  { value: 'inter', label: 'Inter', family: "'Inter', sans-serif" },
  { value: 'roboto', label: 'Roboto', family: "'Roboto', sans-serif" },
  { value: 'poppins', label: 'Poppins', family: "'Poppins', sans-serif" },
  { value: 'montserrat', label: 'Montserrat', family: "'Montserrat', sans-serif" },
  { value: 'oswald', label: 'Oswald', family: "'Oswald', sans-serif" },
  { value: 'playfair', label: 'Playfair Display', family: "'Playfair Display', serif" },
  { value: 'raleway', label: 'Raleway', family: "'Raleway', sans-serif" },
  { value: 'space-grotesk', label: 'Space Grotesk', family: "'Space Grotesk', sans-serif" },
  { value: 'orbitron', label: 'Orbitron', family: "'Orbitron', sans-serif" },
  { value: 'press-start', label: 'Press Start 2P', family: "'Press Start 2P', cursive" },
  { value: 'russo-one', label: 'Russo One', family: "'Russo One', sans-serif" },
];

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

const appearanceFormSchema = z.object({
  accentColor: z.string().min(1, 'Accent color is required'),
  primaryColor: z.string().min(1, 'Primary color is required'),
  backgroundColor: z.string().min(1, 'Background color is required'),
  profileFont: z.string().default('default'),
  layoutStyle: z.enum(['grid', 'masonry', 'classic']),
  bannerUrl: z.string().optional().or(z.literal('')),
});

type SecurityFormValues = z.infer<typeof securityFormSchema>;
type AppearanceFormValues = z.infer<typeof appearanceFormSchema>;

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

const ReferralSection: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: referralStats, isLoading } = useQuery<{
    referralCode: string | null;
    referralCount: number;
    totalXpEarned: number;
    referralLink: string | null;
  }>({
    queryKey: ['/api/user/referral-stats'],
    enabled: !!user,
  });

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({ title: `${label} copied!`, description: 'Ready to share.', duration: 2000 });
    }).catch(() => {
      toast({ title: 'Copy failed', description: 'Please copy manually.', variant: 'destructive' });
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            Referral Program
          </CardTitle>
          <CardDescription>
            Share your unique referral code with friends. When they sign up, you earn <strong>500 XP</strong> and they earn <strong>100 XP</strong> as a welcome bonus.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Your referral code */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Your Referral Code</h3>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-muted rounded-lg px-4 py-3 font-mono text-xl font-bold tracking-widest text-center border border-border">
                {referralStats?.referralCode ?? '—'}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => referralStats?.referralCode && copyToClipboard(referralStats.referralCode, 'Referral code')}
                disabled={!referralStats?.referralCode}
                title="Copy code"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Shareable link */}
          {referralStats?.referralLink && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Shareable Link</h3>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-muted rounded-lg px-3 py-2 text-sm text-muted-foreground truncate border border-border">
                  {referralStats.referralLink}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(referralStats.referralLink!, 'Referral link')}
                  title="Copy link"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                When someone visits this link and signs up, the referral code is automatically applied.
              </p>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-muted/50 rounded-lg p-4 text-center border border-border">
              <div className="flex items-center justify-center mb-2">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div className="text-2xl font-bold">{referralStats?.referralCount ?? 0}</div>
              <div className="text-xs text-muted-foreground mt-1">Friends Referred</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 text-center border border-border">
              <div className="flex items-center justify-center mb-2">
                <Star className="h-5 w-5 text-yellow-400" />
              </div>
              <div className="text-2xl font-bold">{referralStats?.totalXpEarned ?? 0}</div>
              <div className="text-xs text-muted-foreground mt-1">XP Earned from Referrals</div>
            </div>
          </div>

          {/* How it works */}
          <div className="bg-primary/5 rounded-lg p-4 border border-primary/20 space-y-2">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Gift className="h-4 w-4 text-primary" />
              How It Works
            </h3>
            <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Share your referral code or link with a friend</li>
              <li>They enter your code during signup (or use your referral link)</li>
              <li>When they complete registration, you both earn XP!</li>
              <li>You get <strong className="text-foreground">+500 XP</strong>, they get <strong className="text-foreground">+100 XP</strong></li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const AccountSettingsPage: React.FC = () => {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const updateProfile = useUpdateProfile();
  const [changePasswordStatus, setChangePasswordStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [selectedBannerUrl, setSelectedBannerUrl] = useState<string>('');
  
  // Delete Account states
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [showFinalConfirmModal, setShowFinalConfirmModal] = useState(false);
  const [deleteAccountUsername, setDeleteAccountUsername] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [pendingNameTagId, setPendingNameTagId] = useState<number | null | undefined>(undefined);
  const [pendingVerificationBadgeId, setPendingVerificationBadgeId] = useState<number | null | undefined>(undefined);
  const [appearanceSubTab, setAppearanceSubTab] = useState<string>('colors');
  const [displayName, setDisplayName] = useState<string>('');
  const [bio, setBio] = useState<string>('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const queryClient = useQueryClient();
  
  // Define ProfileBanner type
  type ProfileBanner = {
    id: number;
    name: string;
    category: string;
    imageUrl: string;
    createdAt: string;
  };

  // Fetch user's unlocked profile banners (only banners they have access to)
  const { data: profileBanners = [] } = useQuery<ProfileBanner[]>({
    queryKey: ['/api/user/unlocked-banners'],
    enabled: !!user,
  });

  const { data: userNameTags = [], isLoading: isLoadingNameTags } = useQuery<NameTag[]>({
    queryKey: ['/api/user/name-tags'],
    enabled: !!user,
  });

  const { data: userVerificationBadges = [], isLoading: isLoadingVerificationBadges } = useQuery<VerificationBadge[]>({
    queryKey: ['/api/user/verification-badges'],
    enabled: !!user,
  });

  useEffect(() => {
    if (pendingNameTagId !== undefined && pendingNameTagId === user?.selectedNameTagId) {
      setPendingNameTagId(undefined);
    }
  }, [user?.selectedNameTagId, pendingNameTagId]);

  useEffect(() => {
    if (pendingVerificationBadgeId !== undefined && pendingVerificationBadgeId === (user as any)?.selectedVerificationBadgeId) {
      setPendingVerificationBadgeId(undefined);
    }
  }, [(user as any)?.selectedVerificationBadgeId, pendingVerificationBadgeId]);
  
  // Security form setup
  const securityForm = useForm<SecurityFormValues>({
    resolver: zodResolver(securityFormSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    }
  });
  
  // Appearance form setup
  const appearanceForm = useForm<AppearanceFormValues>({
    resolver: zodResolver(appearanceFormSchema),
    defaultValues: {
      accentColor: user?.accentColor || '#4C8',
      primaryColor: user?.primaryColor || '#02172C',
      backgroundColor: user?.backgroundColor || '#0B2232',
      profileFont: user?.profileFont || 'default',
      layoutStyle: (user?.layoutStyle as 'grid' | 'masonry' | 'classic') || 'grid',
      bannerUrl: user?.bannerUrl || '',
    }
  });
  

  
  // Handle appearance form submission
  const onAppearanceSubmit = async (values: AppearanceFormValues) => {
    if (!user) return;
    
    try {
      await updateProfile.mutateAsync({
        userId: user.id,
        userData: {
          accentColor: values.accentColor,
          primaryColor: values.primaryColor,
          backgroundColor: values.backgroundColor,
          profileFont: values.profileFont,
          layoutStyle: values.layoutStyle,
          bannerUrl: values.bannerUrl,
        }
      });
      
      toast({
        title: "Appearance updated",
        description: "Your profile appearance has been updated successfully.",
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: "Update failed",
        description: "Failed to update appearance. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Sync profile fields from user data
  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
      setBio((user as any).bio || '');
    }
  }, [user]);

  const onProfileSubmit = async () => {
    if (!user) return;
    setIsSavingProfile(true);
    try {
      await updateProfile.mutateAsync({
        userId: user.id,
        userData: { displayName, bio },
      });
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      if (user.username) {
        queryClient.invalidateQueries({ queryKey: [`/api/users/${user.username}`] });
      }
      toast({
        title: "Profile updated",
        description: "Your display name and bio have been saved.",
        duration: 3000,
      });
    } catch {
      toast({
        title: "Update failed",
        description: "Failed to save profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const saveNameTagAndBadge = async () => {
    if (!user) return;
    const updates: any = {};
    if (pendingNameTagId !== undefined) {
      updates.selectedNameTagId = pendingNameTagId;
    }
    if (pendingVerificationBadgeId !== undefined) {
      updates.selectedVerificationBadgeId = pendingVerificationBadgeId;
    }
    if (Object.keys(updates).length === 0) return;
    
    try {
      await updateProfile.mutateAsync({
        userId: user.id,
        userData: updates,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      if (user.username) {
        queryClient.invalidateQueries({ queryKey: [`/api/users/${user.username}`] });
      }
      toast({
        title: "Settings saved",
        description: "Your appearance settings have been updated.",
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: "Save failed",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Handle security form submission (password change)
  const onSecuritySubmit = async (values: SecurityFormValues) => {
    if (!user) return;
    
    try {
      await apiRequest("POST", "/api/users/change-password", {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword
      });
      
      setChangePasswordStatus('success');
      toast({
        title: "Password changed",
        description: "Your password has been changed successfully.",
        duration: 3000,
      });
      
      securityForm.reset({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error) {
      setChangePasswordStatus('error');
      toast({
        title: "Password change failed",
        description: error instanceof Error ? error.message : "Failed to change password. Please check your current password and try again.",
        variant: "destructive",
        duration: 5000,
      });
    }
  };
  
  // Delete account handlers
  const handleDeleteAccountStart = () => {
    setDeleteError(null);
    setDeleteAccountUsername('');
    setShowDeleteAccountModal(true);
  };

  const handleDeleteAccountStep1 = async () => {
    if (!user || deleteAccountUsername !== user.username) {
      setDeleteError("Username doesn't match. Please enter your exact username.");
      return;
    }

    try {
      setIsDeletingAccount(true);
      const response = await apiRequest("POST", "/api/users/me/delete/initiate", {
        confirm_username: deleteAccountUsername
      });

      const data = await response.json();
      if (data.status === "ok") {
        setShowDeleteAccountModal(false);
        setShowFinalConfirmModal(true);
      }
    } catch (error: any) {
      const errorMessage = error?.error || "Failed to initiate account deletion. Please try again.";
      setDeleteError(errorMessage);
      
      if (errorMessage === "REAUTH_REQUIRED") {
        setDeleteError("Please refresh the page and try again for security purposes.");
      }
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const handleDeleteAccountConfirm = async () => {
    try {
      setIsDeletingAccount(true);
      const response = await apiRequest("POST", "/api/users/me/delete/confirm", {
        confirmed: true
      });

      const data = await response.json();
      if (data.status === "deletion_started") {
        toast({
          title: "Account deleted",
          description: "Your account has been permanently deleted. You will be signed out.",
          duration: 3000,
        });
        
        // Redirect to home after a short delay
        setTimeout(() => {
          window.location.href = '/';
        }, 2000);
      }
    } catch (error: any) {
      const errorMessage = error?.error || "Failed to delete account. Please try again.";
      setDeleteError(errorMessage);
      
      if (errorMessage === "INITIATION_REQUIRED") {
        setDeleteError("Please start the deletion process again.");
        setShowFinalConfirmModal(false);
      }
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteAccountModal(false);
    setShowFinalConfirmModal(false);
    setDeleteAccountUsername('');
    setDeleteError(null);
  };
  
  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  // Redirect if not logged in
  if (!user) {
    return <Redirect to="/auth" />;
  }
  
  return (
    <div className="w-full px-4 py-8 pb-24 md:pb-8">
      <h1 className="text-3xl font-bold mb-8">Account Settings</h1>
      
      <Tabs defaultValue="security" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-8">
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="2fa">
            <KeyRound className="h-4 w-4 mr-2" />
            2FA
          </TabsTrigger>
          <TabsTrigger value="privacy">
            <Shield className="h-4 w-4 mr-2" />
            Privacy
          </TabsTrigger>
          <TabsTrigger value="referral">
            <Gift className="h-4 w-4 mr-2" />
            Referral
          </TabsTrigger>
        </TabsList>

        {/* Privacy & Safety */}
        <TabsContent value="privacy">
          <BlockedUsersSection />
        </TabsContent>

        {/* DEAD CODE PLACEHOLDER — appearance removed */}
        {false && <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Profile Appearance
              </CardTitle>
              <CardDescription>
                Customize how your profile looks to other users.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={appearanceSubTab} onValueChange={setAppearanceSubTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-6">
                  <TabsTrigger value="colors">
                    <Palette className="h-4 w-4 mr-2" />
                    Colors & Font
                  </TabsTrigger>
                  <TabsTrigger value="nametags">
                    <Sparkles className="h-4 w-4 mr-2" />
                    Name Tags
                  </TabsTrigger>
                  <TabsTrigger value="badges">
                    <Shield className="h-4 w-4 mr-2" />
                    Badges
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="colors">
                  <Form {...appearanceForm}>
                    <form onSubmit={appearanceForm.handleSubmit(onAppearanceSubmit)} className="space-y-8">
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: appearanceForm.watch('backgroundColor') }} />
                          Background Color
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Choose a background color for your profile page.
                        </p>
                        <FormField
                          control={appearanceForm.control}
                          name="backgroundColor"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <div className="flex flex-col sm:flex-row gap-6 items-start">
                                  <HexColorPicker color={field.value} onChange={field.onChange} />
                                  <div className="space-y-3 flex-1">
                                    <div className="flex items-center gap-2">
                                      <Label className="text-sm font-medium">Hex Code</Label>
                                      <Input
                                        value={field.value}
                                        onChange={(e) => field.onChange(e.target.value)}
                                        className="w-32 font-mono text-sm"
                                        placeholder="#0B2232"
                                      />
                                    </div>
                                    <div
                                      className="w-full h-24 rounded-lg border border-border"
                                      style={{ backgroundColor: field.value }}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                      This color will be used as the background gradient on your profile.
                                    </p>
                                  </div>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="border-t pt-6 space-y-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                          <Type className="h-4 w-4" />
                          Profile Font
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Choose a font style for your profile display name and text.
                        </p>
                        <FormField
                          control={appearanceForm.control}
                          name="profileFont"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                  {FONT_OPTIONS.map((font) => {
                                    const isSelected = field.value === font.value;
                                    return (
                                      <button
                                        key={font.value}
                                        type="button"
                                        onClick={() => field.onChange(font.value)}
                                        className={`p-4 rounded-lg border-2 text-left transition-all ${
                                          isSelected
                                            ? 'border-primary bg-primary/10'
                                            : 'border-border hover:border-primary/50 hover:bg-muted/50'
                                        }`}
                                      >
                                        <p
                                          className="text-lg font-semibold mb-1 truncate"
                                          style={{ fontFamily: font.family }}
                                        >
                                          {font.label}
                                        </p>
                                        <p
                                          className="text-xs text-muted-foreground truncate"
                                          style={{ fontFamily: font.family }}
                                        >
                                          {user?.displayName || 'Your Name'}
                                        </p>
                                      </button>
                                    );
                                  })}
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="flex justify-end pt-4">
                        <Button type="submit" disabled={updateProfile.isPending}>
                          {updateProfile.isPending ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              Saving...
                            </>
                          ) : (
                            'Save Appearance'
                          )}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </TabsContent>

                <TabsContent value="nametags">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold flex items-center gap-2 mb-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        Name Tag
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Select a name tag to display below your username on your profile.
                      </p>
                    </div>

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

                        {(pendingNameTagId !== undefined && pendingNameTagId !== user?.selectedNameTagId) && (
                          <Button
                            className="w-full"
                            onClick={saveNameTagAndBadge}
                            disabled={updateProfile.isPending}
                          >
                            {updateProfile.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                              <Save className="h-4 w-4 mr-2" />
                            )}
                            Save Name Tag
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="badges">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold flex items-center gap-2 mb-2">
                        <Shield className="h-5 w-5 text-green-500" />
                        Verified Badge
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Choose a verified badge to display next to your username on your profile.
                      </p>
                    </div>

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

                        {(pendingVerificationBadgeId !== undefined && pendingVerificationBadgeId !== (user as any)?.selectedVerificationBadgeId) && (
                          <Button
                            className="w-full"
                            onClick={saveNameTagAndBadge}
                            disabled={updateProfile.isPending}
                          >
                            {updateProfile.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                              <Save className="h-4 w-4 mr-2" />
                            )}
                            Save Badge
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>}
        
        {/* Security Settings */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>
                Update your password and manage account security.
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {changePasswordStatus === 'success' && (
                <Alert className="bg-green-50 text-green-800 border-green-200">
                  <AlertTitle>Password Changed</AlertTitle>
                  <AlertDescription>
                    Your password has been successfully changed.
                  </AlertDescription>
                </Alert>
              )}
              
              {changePasswordStatus === 'error' && (
                <Alert className="bg-red-50 text-red-800 border-red-200">
                  <AlertTitle>Password Change Failed</AlertTitle>
                  <AlertDescription>
                    Failed to change password. Please check your current password and try again.
                  </AlertDescription>
                </Alert>
              )}
              
              <Form {...securityForm}>
                <form id="security-form" onSubmit={securityForm.handleSubmit(onSecuritySubmit)} className="space-y-6">
                  <FormField
                    control={securityForm.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={securityForm.control}
                    name="newPassword"
                    render={({ field }) => {
                      const password = field.value || '';
                      const requirements = validatePassword(password);
                      
                      return (
                        <FormItem>
                          <FormLabel>New Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Create a new password" {...field} />
                          </FormControl>
                          <PasswordRequirementsDisplay 
                            requirements={requirements} 
                            accentColor="#10b981"
                          />
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                  
                  <FormField
                    control={securityForm.control}
                    name="confirmPassword"
                    render={({ field }) => {
                      const password = securityForm.watch('newPassword') || '';
                      const confirmPassword = field.value || '';
                      const passwordsMatch = password && confirmPassword && password === confirmPassword;
                      
                      return (
                        <FormItem>
                          <FormLabel>Confirm Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Confirm your password" {...field} />
                          </FormControl>
                          <div className="space-y-1 text-xs mt-2">
                            <div className="flex items-center gap-2">
                              <span className={`${passwordsMatch ? 'text-green-500' : 'text-muted-foreground'}`}>
                                {passwordsMatch ? '✓' : '○'}
                              </span>
                              <span className={`${passwordsMatch ? 'text-green-500' : 'text-muted-foreground'}`}>
                                Passwords match
                              </span>
                            </div>
                          </div>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                  <Button 
                    type="submit" 
                    disabled={!securityForm.formState.isDirty}
                    className="w-full sm:w-auto"
                  >
                    Change Password
                  </Button>
                </form>
              </Form>

              {/* Delete Account Section */}
              <div className="border-t pt-6 mt-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium text-destructive">Delete Account</h3>
                    <p className="text-sm text-muted-foreground">
                      Permanently delete your account and all associated data. This action cannot be undone.
                    </p>
                  </div>
                  
                  <Alert className="border-destructive/50 text-destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Warning</AlertTitle>
                    <AlertDescription>
                      Account deletion will permanently remove:
                      <ul className="list-disc ml-6 mt-2">
                        <li>Your profile and all personal information</li>
                        <li>All uploaded clips, screenshots, and media</li>
                        <li>Messages, follows, and social connections</li>
                        <li>Achievement badges and leaderboard entries</li>
                      </ul>
                    </AlertDescription>
                  </Alert>
                  
                  <Button 
                    variant="destructive" 
                    onClick={handleDeleteAccountStart}
                    disabled={isDeletingAccount}
                    className="gap-2"
                    data-testid="button-delete-account"
                  >
                    <Trash2 className="h-4 w-4" />
                    {isDeletingAccount ? 'Processing...' : 'Delete Account'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          
        </TabsContent>

        {/* Two-Factor Authentication */}
        <TabsContent value="2fa">
          <TwoFactorSettings />
        </TabsContent>

        {/* Referral Program */}
        <TabsContent value="referral">
          <ReferralSection />
        </TabsContent>
      </Tabs>

      {/* Delete Account Modal - Step 1: Username Verification */}
      <Dialog open={showDeleteAccountModal} onOpenChange={handleCancelDelete}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Confirm Account Deletion
            </DialogTitle>
            <DialogDescription>
              To confirm account deletion, please enter your username exactly as shown below.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="bg-muted/50 p-3 rounded-md">
              <p className="text-sm text-muted-foreground mb-1">Your username:</p>
              <p className="font-mono font-medium" data-testid="text-username-display">{user?.username}</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirm-username">Type your username to confirm:</Label>
              <Input
                id="confirm-username"
                value={deleteAccountUsername}
                onChange={(e) => setDeleteAccountUsername(e.target.value)}
                placeholder="Enter your username"
                className="font-mono"
                data-testid="input-confirm-username"
              />
            </div>
            
            {deleteError && (
              <Alert className="bg-red-50 text-red-800 border-red-200">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription data-testid="text-delete-error">
                  {deleteError}
                </AlertDescription>
              </Alert>
            )}
          </div>
          
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleCancelDelete} disabled={isDeletingAccount}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteAccountStep1}
              disabled={isDeletingAccount || deleteAccountUsername !== user?.username}
              data-testid="button-confirm-username"
            >
              {isDeletingAccount ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Verifying...
                </>
              ) : (
                'Continue'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Account Modal - Step 2: Final Confirmation */}
      <Dialog open={showFinalConfirmModal} onOpenChange={handleCancelDelete}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Final Confirmation
            </DialogTitle>
            <DialogDescription>
              This is your last chance to cancel. Your account will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <Alert className="border-destructive text-destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>This action cannot be undone</AlertTitle>
              <AlertDescription>
                Your account <strong>{user?.username}</strong> and all associated data will be permanently deleted from our servers.
              </AlertDescription>
            </Alert>
            
            {deleteError && (
              <Alert className="bg-red-50 text-red-800 border-red-200">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription data-testid="text-final-delete-error">
                  {deleteError}
                </AlertDescription>
              </Alert>
            )}
          </div>
          
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleCancelDelete} disabled={isDeletingAccount}>
              Keep My Account
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteAccountConfirm}
              disabled={isDeletingAccount}
              data-testid="button-final-confirm"
            >
              {isDeletingAccount ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Deleting Account...
                </>
              ) : (
                'Delete My Account Forever'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AccountSettingsPage;