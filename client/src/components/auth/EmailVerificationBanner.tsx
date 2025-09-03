import { useState } from "react";
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
          title: 'Verification email sent',
          description: 'Please check your inbox and click the verification link. Previous verification links are now invalid.',
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
      "bg-primary/10 border border-primary/20 rounded-lg p-4 mb-4 flex items-center justify-between",
      className
    )}>
      <div className="flex items-center space-x-3">
        <Mail className="h-5 w-5 text-primary" />
        <div>
          <p className="text-sm font-medium">Please verify your email address</p>
          <p className="text-xs text-muted-foreground">
            You need to verify your email before you can upload clips or interact with content.
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Button
          onClick={handleResendEmail}
          disabled={isResending || !canResend}
          variant="outline"
          size="sm"
          className="text-amber-700 border-amber-300 hover:bg-amber-100 dark:text-amber-300 dark:border-amber-700 dark:hover:bg-amber-900/20"
        >
          {isResending ? "Sending..." : !canResend ? `Wait ${cooldownTime}s` : "Resend Email"}
        </Button>

        {onDismiss && (
          <Button
            onClick={onDismiss}
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}