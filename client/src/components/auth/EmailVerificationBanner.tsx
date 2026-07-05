import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Mail, X, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmailVerificationBannerProps {
  onDismiss?: () => void;
  className?: string;
}

export function EmailVerificationBanner({ onDismiss, className }: EmailVerificationBannerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isResending, setIsResending] = useState(false);
  const [canResend, setCanResend] = useState(true);
  const [cooldownTime, setCooldownTime] = useState(0);

  // Don't show banner if user is verified or not logged in
  if (!user || user.emailVerified) {
    return null;
  }

  const handleResendEmail = async () => {
    setIsResending(true);

    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: user.email }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: 'Verification code sent',
          description: 'Please check your inbox for the 6-digit code. Previous codes are now invalid.',
          variant: 'gamefolioSuccess',
        });

        // Start 60-second cooldown
        setCanResend(false);
        setCooldownTime(60);

        const interval = setInterval(() => {
          setCooldownTime((prev) => {
            if (prev <= 1) {
              setCanResend(true);
              clearInterval(interval);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);

      } else {
        toast({
          title: "Failed to send email",
          description: "Please try again later or contact support.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Unable to send verification email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className={cn(
      "bg-primary/10 border border-primary/20 rounded-lg p-4 mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
      className
    )}>
      <div className="flex items-start gap-3 min-w-0">
        <Mail className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="text-sm font-medium">Please verify your email address</p>
          <p className="text-xs text-muted-foreground">
            You need to verify your email before you can upload clips or interact with content.
          </p>
        </div>
        {onDismiss && (
          <Button
            onClick={onDismiss}
            variant="ghost"
            size="sm"
            className="ml-auto sm:hidden h-8 w-8 p-0 flex-shrink-0 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
        <Button
          onClick={() => setLocation('/verify-code')}
          variant="outline"
          size="sm"
          className="flex-1 sm:flex-none min-w-0 bg-[#0B1218] border-[#B7FF1A] text-white hover:bg-[#101923] hover:text-white hover:border-[#B7FF1A] disabled:opacity-50"
        >
          Enter Code
        </Button>

        <Button
          onClick={handleResendEmail}
          disabled={isResending || !canResend}
          variant="outline"
          size="sm"
          className="flex-1 sm:flex-none min-w-0 bg-[#0B1218] border-[#B7FF1A] text-white hover:bg-[#101923] hover:text-white hover:border-[#B7FF1A] disabled:opacity-50"
        >
          {isResending ? "Sending..." : !canResend ? `Wait ${cooldownTime}s` : "Resend Code"}
        </Button>

        {onDismiss && (
          <Button
            onClick={onDismiss}
            variant="ghost"
            size="sm"
            className="hidden sm:inline-flex text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}