import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient, getQueryFn } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Shield, ShieldCheck, ShieldOff, Copy, Check } from 'lucide-react';

interface TwoFactorSetupData {
  qrCode: string;
  secret: string;
  keyUri: string;
}

export function TwoFactorSettings() {
  const { toast } = useToast();
  const [showSetupDialog, setShowSetupDialog] = useState(false);
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [setupData, setSetupData] = useState<TwoFactorSetupData | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [disablePassword, setDisablePassword] = useState('');
  const [secretCopied, setSecretCopied] = useState(false);

  const { data: twoFactorStatus, isLoading: statusLoading } = useQuery<{ enabled: boolean }>({
    queryKey: ['/api/2fa/status'],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const setupMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/2fa/setup');
      return response.json();
    },
    onSuccess: (data: TwoFactorSetupData) => {
      setSetupData(data);
      setShowSetupDialog(true);
    },
    onError: (error: Error) => {
      toast({
        title: 'Setup Failed',
        description: error.message || 'Failed to setup two-factor authentication',
        variant: 'destructive',
      });
    },
  });

  const enableMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await apiRequest('POST', '/api/2fa/enable', { code });
      return response.json();
    },
    onSuccess: async () => {
      toast({
        title: 'Two-Factor Authentication Enabled',
        description: 'Your account is now protected with 2FA',
      });
      setShowSetupDialog(false);
      setSetupData(null);
      setVerificationCode('');
      await queryClient.invalidateQueries({ queryKey: ['/api/2fa/status'] });
      await queryClient.refetchQueries({ queryKey: ['/api/2fa/status'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Verification Failed',
        description: error.message || 'Invalid verification code',
        variant: 'destructive',
      });
    },
  });

  const disableMutation = useMutation({
    mutationFn: async (password: string) => {
      const response = await apiRequest('POST', '/api/2fa/disable', { password });
      return response.json();
    },
    onSuccess: async () => {
      toast({
        title: 'Two-Factor Authentication Disabled',
        description: '2FA has been removed from your account',
      });
      setShowDisableDialog(false);
      setDisablePassword('');
      await queryClient.invalidateQueries({ queryKey: ['/api/2fa/status'] });
      await queryClient.refetchQueries({ queryKey: ['/api/2fa/status'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to Disable',
        description: error.message || 'Invalid password',
        variant: 'destructive',
      });
    },
  });

  const handleCopySecret = () => {
    if (setupData?.secret) {
      navigator.clipboard.writeText(setupData.secret);
      setSecretCopied(true);
      setTimeout(() => setSecretCopied(false), 2000);
    }
  };

  const handleSetup = () => {
    setupMutation.mutate();
  };

  const handleEnable = () => {
    if (verificationCode.length === 6) {
      enableMutation.mutate(verificationCode);
    }
  };

  const handleDisable = () => {
    if (disablePassword) {
      disableMutation.mutate(disablePassword);
    }
  };

  if (statusLoading) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const isEnabled = twoFactorStatus?.enabled;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            <CardTitle>Two-Factor Authentication</CardTitle>
          </div>
          <CardDescription>
            Add an extra layer of security to your account by requiring a code from your authenticator app when signing in.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isEnabled ? (
                <>
                  <ShieldCheck className="h-6 w-6 text-primary" />
                  <div>
                    <p className="font-medium">2FA is enabled</p>
                    <p className="text-sm text-muted-foreground">Your account is protected with two-factor authentication</p>
                  </div>
                </>
              ) : (
                <>
                  <ShieldOff className="h-6 w-6 text-yellow-500" />
                  <div>
                    <p className="font-medium">2FA is not enabled</p>
                    <p className="text-sm text-muted-foreground">Enable 2FA to add extra security to your account</p>
                  </div>
                </>
              )}
            </div>
            {isEnabled ? (
              <Button variant="destructive" onClick={() => setShowDisableDialog(true)}>
                Disable 2FA
              </Button>
            ) : (
              <Button onClick={handleSetup} disabled={setupMutation.isPending}>
                {setupMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enable 2FA
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showSetupDialog} onOpenChange={setShowSetupDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Set Up Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              Scan the QR code below with your authenticator app (Google Authenticator, Authy, etc.)
            </DialogDescription>
          </DialogHeader>
          
          {setupData && (
            <div className="space-y-4">
              <div className="flex justify-center">
                <img src={setupData.qrCode} alt="QR Code" className="w-48 h-48" />
              </div>
              
              <Alert>
                <AlertDescription className="text-sm">
                  <p className="font-medium mb-2">Can't scan the QR code?</p>
                  <p className="text-muted-foreground mb-2">Manually enter this secret key in your authenticator app:</p>
                  <div className="flex items-center gap-2 bg-muted p-2 rounded font-mono text-xs break-all">
                    <span>{setupData.secret}</span>
                    <Button variant="ghost" size="sm" onClick={handleCopySecret}>
                      {secretCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="verification-code">Enter verification code</Label>
                <Input
                  id="verification-code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="000000"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                  className="text-center text-lg tracking-widest"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSetupDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleEnable} 
              disabled={verificationCode.length !== 6 || enableMutation.isPending}
            >
              {enableMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Verify and Enable
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Disable Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              Enter your password to disable two-factor authentication. This will make your account less secure.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-2">
            <Label htmlFor="disable-password">Password</Label>
            <Input
              id="disable-password"
              type="password"
              placeholder="Enter your password"
              value={disablePassword}
              onChange={(e) => setDisablePassword(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDisableDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={handleDisable} 
              disabled={!disablePassword || disableMutation.isPending}
            >
              {disableMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Disable 2FA
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
