import React, { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useUpdateProfile } from '@/hooks/use-profile';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, getQueryFn } from '@/lib/queryClient';
import { useQuery } from '@tanstack/react-query';
import { Redirect } from 'wouter';
import { Loader2, Trash2, AlertTriangle, Shield } from 'lucide-react';
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
import { Button } from '@/components/ui/button';


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

const appearanceFormSchema = z.object({
  accentColor: z.string().min(1, 'Accent color is required'),
  primaryColor: z.string().min(1, 'Primary color is required'),
  layoutStyle: z.enum(['grid', 'masonry', 'classic']),
  bannerUrl: z.string().optional().or(z.literal('')),
});

type SecurityFormValues = z.infer<typeof securityFormSchema>;
type AppearanceFormValues = z.infer<typeof appearanceFormSchema>;

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
    <div className="container max-w-5xl mx-auto px-4 py-8 pb-24 md:pb-8">
      <h1 className="text-3xl font-bold mb-8">Account Settings</h1>
      
      <Tabs defaultValue="privacy" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8">
          <TabsTrigger value="privacy">
            <Shield className="h-4 w-4 mr-2" />
            Privacy & Safety
          </TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        
        {/* Privacy & Safety */}
        <TabsContent value="privacy">
          <BlockedUsersSection />
        </TabsContent>
        
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
          
          <div className="mt-6">
            <TwoFactorSettings />
          </div>
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