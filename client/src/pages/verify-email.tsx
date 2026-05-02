
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, AlertCircle, Mail, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isNative, openExternal, API_BASE } from "@/lib/platform";

export default function VerifyEmailPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [verificationStatus, setVerificationStatus] = useState<'loading' | 'success' | 'error' | 'expired'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const status = urlParams.get('status');
    const token = urlParams.get('token');

    console.log('🔍 Verification page loaded with params:', { status, token: token ? token.substring(0, 10) + '...' : null });

    // If we have a status parameter, it means we came from the server redirect
    if (status) {
      console.log('📍 Handling server redirect with status:', status);
      switch (status) {
        case 'success':
          setVerificationStatus('success');
          setMessage('Your email has been verified successfully! You can now upload clips and interact with content.');
          toast({
            title: "Email Verified",
            description: "Your account is now fully activated!",
          });
          break;
        case 'expired':
          setVerificationStatus('expired');
          setMessage('Your verification link has expired. Please request a new one.');
          break;
        case 'invalid':
          setVerificationStatus('error');
          setMessage('Invalid verification link. Please check your email and try again.');
          break;
        case 'error':
        default:
          setVerificationStatus('error');
          setMessage('An error occurred while verifying your email. Please try again.');
          break;
      }
      return;
    }

    // If we have a token but no status, this is likely from a direct link
    // Instead of making a POST request, redirect to the GET endpoint
    if (token) {
      console.log('🔗 Direct token link detected, redirecting to server verification');
      
      // Add a timeout to prevent infinite hanging
      setTimeout(() => {
        // Redirect to the server GET endpoint which will handle verification and redirect back.
        // On native, open through the in-app browser so the deep-link callback can return.
        const url = `/api/auth/verify-email?token=${encodeURIComponent(token)}`;
        if (isNative) {
          void openExternal(`${API_BASE}${url}`);
        } else {
          window.location.href = url;
        }
      }, 500);
      
      // Set a fallback timeout in case redirect fails
      setTimeout(() => {
        console.warn('Redirect may have failed, trying alternate approach');
        setVerificationStatus('error');
        setMessage('Verification is taking longer than expected. Please try refreshing the page or contact support.');
      }, 10000); // 10 seconds fallback
      
      return;
    }

    // No token or status - invalid link
    console.log('❌ No token or status found in URL');
    setVerificationStatus('error');
    setMessage('Invalid verification link. Please check your email and try again.');
  }, [toast]);

  const verifyEmail = async (token: string) => {
    try {
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (response.ok) {
        setVerificationStatus('success');
        setMessage('Your email has been verified successfully! You can now upload clips and interact with content.');
        
        toast({
          title: "Email Verified",
          description: "Your account is now fully activated!",
        });
      } else {
        if (data.message && data.message.includes('expired')) {
          setVerificationStatus('expired');
          setMessage('Your verification link has expired. Please request a new one.');
        } else {
          setVerificationStatus('error');
          setMessage(data.message || 'Failed to verify email. Please try again.');
        }
      }
    } catch (error) {
      console.error('Error verifying email:', error);
      setVerificationStatus('error');
      setMessage('An error occurred while verifying your email. Please try again.');
    }
  };

  const handleBackToLogin = () => {
    setLocation('/auth');
  };

  const getStatusIcon = () => {
    switch (verificationStatus) {
      case 'loading':
        return <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />;
      case 'success':
        return <CheckCircle2 className="w-6 h-6 text-primary" />;
      case 'error':
      case 'expired':
        return <AlertCircle className="w-6 h-6 text-red-500" />;
    }
  };

  const getStatusColor = () => {
    switch (verificationStatus) {
      case 'loading':
        return 'border-blue-500/20 bg-blue-500/5';
      case 'success':
        return 'border-primary/20 bg-primary/5';
      case 'error':
      case 'expired':
        return 'border-red-500/20 bg-red-500/5';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-900 via-slate-900 to-navy-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className={`${getStatusColor()} border`}>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              {getStatusIcon()}
            </div>
            <CardTitle className="text-xl font-bold">
              {verificationStatus === 'loading' && 'Verifying Email...'}
              {verificationStatus === 'success' && 'Email Verified!'}
              {verificationStatus === 'error' && 'Verification Failed'}
              {verificationStatus === 'expired' && 'Link Expired'}
            </CardTitle>
            <CardDescription className="text-base">
              {message}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {verificationStatus === 'success' && (
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium text-primary">Welcome to Gamefolio!</p>
                    <p className="text-sm text-primary mt-1">
                      You can now upload clips, screenshots, and interact with the community.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {verificationStatus === 'expired' && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <Mail className="w-5 h-5 text-amber-500" />
                  <div>
                    <p className="font-medium text-amber-400">Need a new link?</p>
                    <p className="text-sm text-amber-300 mt-1">
                      Log in to your account and request a new verification email.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {verificationStatus === 'error' && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  <div>
                    <p className="font-medium text-red-400">Something went wrong</p>
                    <p className="text-sm text-red-300 mt-1">
                      Please try again or contact support if the problem persists.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex justify-center pt-4">
              <Button onClick={handleBackToLogin} className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
