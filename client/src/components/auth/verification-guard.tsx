import { ReactNode, useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, AlertTriangle, User, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";

interface VerificationGuardProps {
  children: ReactNode;
  requireEmailVerification?: boolean;
  requireOnboarding?: boolean;
  fallback?: ReactNode;
}

export function VerificationGuard({ 
  children, 
  requireEmailVerification = true, 
  requireOnboarding = true,
  fallback 
}: VerificationGuardProps) {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <CardTitle>Authentication Required</CardTitle>
          <CardDescription>
            Please log in to access this feature
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={() => setLocation("/auth")} 
            className="w-full"
          >
            Go to Login
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Check email verification
  if (requireEmailVerification && !user.emailVerified) {
    if (fallback) return <>{fallback}</>;
    
    return <EmailVerificationRequired user={user} />;
  }

  // Check onboarding completion
  const needsOnboarding = !user.userType;
  if (requireOnboarding && needsOnboarding) {
    if (fallback) return <>{fallback}</>;
    
    return <OnboardingRequired user={user} />;
  }

  return <div key={`${user.id}-${user.emailVerified || 'false'}`}>{children}</div>;
}

function EmailVerificationRequired({ user }: { user: any }) {
  const [, setLocation] = useLocation();
  const [redirectFailed, setRedirectFailed] = useState(false);
  
  // Automatically redirect to verify-code page with timeout
  useEffect(() => {
    const redirectTimer = setTimeout(() => {
      setLocation('/verify-code');
    }, 100); // Small delay to prevent immediate redirect issues

    // Fallback in case redirect doesn't work
    const fallbackTimer = setTimeout(() => {
      setRedirectFailed(true);
    }, 3000); // If still here after 3 seconds, show manual option

    return () => {
      clearTimeout(redirectTimer);
      clearTimeout(fallbackTimer);
    };
  }, [setLocation]);

  // If redirect failed, show manual option
  if (redirectFailed) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <Mail className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <CardTitle>Email Verification Required</CardTitle>
          <CardDescription>
            Please verify your email address to continue
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            We've sent a verification code to {user.email}
          </p>
          <Button 
            onClick={() => setLocation('/verify-code')} 
            className="w-full"
          >
            Enter Verification Code
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Show loading while redirecting
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <Mail className="w-12 h-12 text-primary mx-auto mb-4" />
        <CardTitle>Redirecting to Verification</CardTitle>
        <CardDescription>
          Taking you to the verification page...
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center py-4">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </CardContent>
    </Card>
  );
}

function OnboardingRequired({ user }: { user: any }) {
  const [, setLocation] = useLocation();

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <User className="w-12 h-12 text-primary mx-auto mb-4" />
        <CardTitle>Complete Your Profile</CardTitle>
        <CardDescription>
          Please complete your profile setup to access this feature
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
          <p className="text-sm text-primary">
            Complete your onboarding to start uploading clips and interacting with the community
          </p>
        </div>
        <Button 
          onClick={() => setLocation(`/onboarding?userId=${user.id}&username=${user.username}`)} 
          className="w-full"
        >
          Complete Profile Setup
        </Button>
      </CardContent>
    </Card>
  );
}

// Quick status component for showing verification status
export function VerificationStatus({ user }: { user: any }) {
  const needsOnboarding = !user.userType;
  
  return (
    <div className="flex items-center gap-2 text-sm">
      <div className="flex items-center gap-1">
        {user.emailVerified ? (
          <CheckCircle2 className="w-4 h-4 text-primary" />
        ) : (
          <AlertTriangle className="w-4 h-4 text-yellow-500" />
        )}
        <span className={user.emailVerified ? "text-primary" : "text-yellow-500"}>
          {user.emailVerified ? "Verified" : "Unverified"}
        </span>
      </div>
      <div className="flex items-center gap-1">
        {!needsOnboarding ? (
          <CheckCircle2 className="w-4 h-4 text-primary" />
        ) : (
          <AlertTriangle className="w-4 h-4 text-yellow-500" />
        )}
        <span className={!needsOnboarding ? "text-primary" : "text-yellow-500"}>
          {!needsOnboarding ? "Onboarded" : "Incomplete"}
        </span>
      </div>
    </div>
  );
}