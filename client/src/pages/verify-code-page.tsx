import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Loader2, Mail, RefreshCw } from 'lucide-react';

// apiRequest throws Error(`${status}: ${bodyText}`) on non-2xx responses, or a
// plain (non-numeric-prefixed) Error on a genuine network failure — pull the
// status/JSON message back out so callers can distinguish the two, same as
// the raw-fetch response.ok / catch split this replaces.
function parseApiError(error: unknown): { status: number; message: string; retryAfterSeconds?: number } {
  if (error instanceof Error) {
    const match = error.message.match(/^(\d+):\s*([\s\S]*)$/);
    if (match) {
      const status = parseInt(match[1], 10);
      const jsonStart = match[2].indexOf('{');
      if (jsonStart !== -1) {
        try {
          const parsed = JSON.parse(match[2].slice(jsonStart));
          return { status, message: parsed.message || error.message, retryAfterSeconds: parsed.retryAfterSeconds };
        } catch {
          // fall through
        }
      }
      return { status, message: match[2] || error.message };
    }
  }
  return { status: 0, message: 'Network error. Please check your connection and try again.' };
}

export default function VerifyCodePage() {
  const [, setLocation] = useLocation();
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [canResend, setCanResend] = useState(true);
  const [cooldownTime, setCooldownTime] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');

  // Where to send the user once they're verified: back to onboarding if
  // they haven't completed it yet, otherwise back to wherever they came
  // from (falling back to home).
  const getPostVerifyDestination = () => {
    if (!user?.userType) return '/onboarding';
    const params = new URLSearchParams(window.location.search);
    const from = params.get('from');
    if (from && from.startsWith('/') && !from.startsWith('/verify-code') && !from.startsWith('/onboarding')) {
      return from;
    }
    return '/';
  };

  // Redirect if user is already verified or not logged in
  useEffect(() => {
    if (!user) {
      setLocation('/auth');
      return;
    }
    if (user.emailVerified) {
      setLocation(getPostVerifyDestination());
      return;
    }
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
    setErrorMessage('');

    if (code.length !== 6 || !/^\d{6}$/.test(code)) {
      setErrorMessage('Please enter a 6-digit verification code.');
      return;
    }

    if (!user) return;

    setIsVerifying(true);

    try {
      await apiRequest('POST', '/api/auth/verify-code', { code });

      setErrorMessage('');
      toast({
        title: "Email Verified!",
        description: "Your email has been successfully verified.",
        variant: "gamefolioSuccess",
      });

      await refreshUser();
    } catch (error) {
      console.error('Verification error:', error);
      const { message } = parseApiError(error);
      setErrorMessage(message || 'Invalid or expired verification code. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendCode = async () => {
    if (!user || !canResend) return;

    setIsResending(true);

    try {
      await apiRequest('POST', '/api/auth/resend-verification');

      toast({
        title: 'Verification code sent',
        description: 'A new 6-digit code has been sent to your email.',
        variant: 'gamefolioSuccess',
      });

      // Start 60-second cooldown to match server
      setCanResend(false);
      setCooldownTime(60);
      setCode(''); // Clear the input
    } catch (error) {
      const { status, message, retryAfterSeconds } = parseApiError(error);

      if (status === 429) {
        // Handle cooldown response from server
        const retry = retryAfterSeconds || 60;
        toast({
          title: "Please wait",
          description: message || `Please wait ${retry} seconds before requesting another code.`,
          variant: "gamefolioError",
        });
        setCanResend(false);
        setCooldownTime(retry);
      } else if (status > 0) {
        toast({
          title: "Failed to send code",
          description: message || "Please try again later.",
          variant: "gamefolioError",
        });
      } else {
        toast({
          title: "Error",
          description: "Unable to send verification code. Please try again.",
          variant: "gamefolioError",
        });
      }
    } finally {
      setIsResending(false);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 6) {
      setCode(value);
      if (errorMessage) setErrorMessage('');
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
              className={`text-center text-2xl tracking-widest font-mono ${errorMessage ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
              maxLength={6}
              autoComplete="one-time-code"
              autoFocus
            />
            {errorMessage ? (
              <p className="text-sm text-red-500 text-center font-medium" data-testid="verification-error">
                {errorMessage}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground text-center">
                Enter the 6-digit code from your email
              </p>
            )}
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