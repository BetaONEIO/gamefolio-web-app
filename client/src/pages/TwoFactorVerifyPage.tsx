import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { isNative } from '@/lib/platform';
import { setTokens } from '@/lib/auth-token';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Shield, ArrowLeft } from 'lucide-react';

export default function TwoFactorVerifyPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [code, setCode] = useState('');
  const [userId, setUserId] = useState<number | null>(null);

  useEffect(() => {
    const storedUserId = sessionStorage.getItem('2fa_userId');
    if (!storedUserId) {
      setLocation('/auth');
      return;
    }
    setUserId(parseInt(storedUserId, 10));
  }, [setLocation]);

  const verifyMutation = useMutation({
    mutationFn: async (data: { userId: number; code: string }) => {
      const response = await apiRequest('POST', '/api/2fa/verify', data);
      return response.json();
    },
    onSuccess: async (userData) => {
      sessionStorage.removeItem('2fa_userId');
      // On native, exchange the freshly-created session for a JWT pair so
      // subsequent requests work even if the WebView drops the cookie.
      if (isNative) {
        try {
          const res = await fetch('/api/auth/token/issue', {
            method: 'POST',
            credentials: 'include',
          });
          if (res.ok) {
            const data = (await res.json()) as {
              accessToken?: string;
              refreshToken?: string;
            };
            if (data.accessToken && data.refreshToken) {
              await setTokens(data.accessToken, data.refreshToken);
            }
          }
        } catch (e) {
          console.warn('issueNativeTokens after 2FA failed', e);
        }
      }
      queryClient.setQueryData(['/api/user'], userData);
      toast({
        title: 'Welcome back!',
        description: 'You have successfully logged in.',
      });
      setLocation('/');
    },
    onError: (error: Error) => {
      toast({
        title: 'Verification Failed',
        description: error.message || 'Invalid verification code',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (userId && code.length === 6) {
      verifyMutation.mutate({ userId, code });
    }
  };

  const handleBack = () => {
    sessionStorage.removeItem('2fa_userId');
    setLocation('/auth');
  };

  if (!userId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br from-background to-muted">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Two-Factor Authentication</CardTitle>
          <CardDescription>
            Enter the 6-digit code from your authenticator app
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="code">Verification Code</Label>
              <Input
                id="code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                className="text-center text-2xl tracking-[0.5em] font-mono"
                autoFocus
              />
            </div>

            {verifyMutation.isError && (
              <Alert variant="destructive">
                <AlertDescription>
                  Invalid verification code. Please try again.
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-3">
              <Button 
                type="submit" 
                className="w-full"
                disabled={code.length !== 6 || verifyMutation.isPending}
              >
                {verifyMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Verify
              </Button>
              
              <Button 
                type="button" 
                variant="ghost" 
                className="w-full"
                onClick={handleBack}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Login
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
