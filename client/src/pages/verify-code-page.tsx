import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, RefreshCw } from 'lucide-react';

export default function VerifyCodePage() {
  const [, setLocation] = useLocation();
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [canResend, setCanResend] = useState(true);
  const [cooldownTime, setCooldownTime] = useState(0);

  // Redirect if user is already verified or not logged in
  useEffect(() => {
    console.log('🔍 VerifyCodePage useEffect triggered, user:', user);
    if (!user) {
      console.log('❌ No user, redirecting to /auth');
      setLocation('/auth');
      return;
    }
    if (user.emailVerified) {
      console.log('✅ User email verified, redirecting to /onboarding');
      setLocation('/onboarding');
      return;
    }
    console.log('⏳ User not verified yet, staying on verify page');
  }, [user, setLocation]);

  // Handle cooldown timer
  useEffect(() => {
    if (!canResend && cooldownTime > 0) {
      const timer = setTimeout(() => {
        setCooldownTime(prev => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldownTime, canResend]);

  const handleVerifyCode = async () => {
    if (code.length !== 6 || !/^\d{6}$/.test(code)) {
      toast({
        title: "Invalid Code",
        description: "Please enter a 6-digit verification code.",
        variant: "destructive",
      });
      return;
    }

    if (!user) return;

    setIsVerifying(true);

    try {
      const response = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
        credentials: 'include',
      });

      const data = await response.json();

      if (response.ok) {
        console.log('✅ Email verification successful, refreshing user data...');
        toast({
          title: "Email Verified!",
          description: "Your email has been successfully verified.",
          variant: "gamefolioSuccess",
        });
        
        // Refetch user to get updated emailVerified status
        // The useEffect will handle the redirect automatically when user data updates
        await refreshUser();
        console.log('🔄 User data refreshed after verification');
      } else {
        toast({
          title: "Verification Failed",
          description: data.message || "Invalid or expired verification code.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Verification error:', error);
      toast({
        title: "Error",
        description: "Network error. Please check your connection and try again.",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendCode = async () => {
    if (!user || !canResend) return;

    setIsResending(true);

    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: 'Verification code sent',
          description: 'A new 6-digit code has been sent to your email.',
          variant: 'gamefolioSuccess',
        });

        // Start 60-second cooldown to match server
        setCanResend(false);
        setCooldownTime(60);
        setCode(''); // Clear the input
      } else if (response.status === 429) {
        // Handle cooldown response from server
        const retryAfterSeconds = data.retryAfterSeconds || 60;
        toast({
          title: "Please wait",
          description: data.message || `Please wait ${retryAfterSeconds} seconds before requesting another code.`,
          variant: "destructive",
        });
        
        // Set cooldown based on server response
        setCanResend(false);
        setCooldownTime(retryAfterSeconds);
      } else {
        toast({
          title: "Failed to send code",
          description: data.message || "Please try again later.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Unable to send verification code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ''); // Only allow digits
    if (value.length <= 6) {
      setCode(value);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && code.length === 6) {
      handleVerifyCode();
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <Mail className="h-12 w-12 text-primary" />
          </div>
          <CardTitle>Verify Your Email</CardTitle>
          <CardDescription>
            We've sent a 6-digit verification code to{' '}
            <strong>{user.email}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="verification-code" className="text-sm font-medium">
              Verification Code
            </label>
            <Input
              id="verification-code"
              data-testid="input-verification-code"
              type="text"
              placeholder="000000"
              value={code}
              onChange={handleCodeChange}
              onKeyPress={handleKeyPress}
              className="text-center text-2xl tracking-widest font-mono"
              maxLength={6}
              autoComplete="one-time-code"
              autoFocus
            />
            <p className="text-xs text-muted-foreground text-center">
              Enter the 6-digit code from your email
            </p>
          </div>

          <Button
            data-testid="button-verify-code"
            onClick={handleVerifyCode}
            disabled={code.length !== 6 || isVerifying}
            className="w-full"
          >
            {isVerifying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              'Verify Email'
            )}
          </Button>

          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">
              Didn't receive the code?
            </p>
            <Button
              data-testid="button-resend-code"
              onClick={handleResendCode}
              disabled={!canResend || isResending}
              variant="outline"
              size="sm"
            >
              {isResending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : !canResend ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Resend in {cooldownTime}s
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Resend Code
                </>
              )}
            </Button>
          </div>

          <div className="text-center pt-4">
            <p className="text-xs text-muted-foreground">
              Code expires in 15 minutes
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}