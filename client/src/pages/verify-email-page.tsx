import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function VerifyEmailPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [verificationStatus, setVerificationStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        // Get token from URL params
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');

        if (!token) {
          setVerificationStatus('error');
          setMessage('Invalid verification link. No token provided.');
          return;
        }

        // Call verification endpoint
        const response = await fetch(`/api/auth/verify-email?token=${token}`, {
          method: 'GET',
          credentials: 'include',
        });

        const data = await response.json(); // Parse JSON response here

        if (response.ok) {
          setVerificationStatus('success');
          setMessage(data.message || 'Your email has been verified successfully!');

          // Redirect to login or dashboard after a short delay
          setTimeout(() => {
            navigate('/auth');
          }, 3000);
        } else {
          setVerificationStatus('error');
          // Check if it's an expired token error
          if (data.message && data.message.toLowerCase().includes('invalid or expired')) {
            setMessage('This verification link has expired or been replaced by a newer one. Please request a new verification email from the login page.');
          } else {
            setMessage(data.message || 'Verification failed. Please try again.');
          }
        }
      } catch (error) {
        setVerificationStatus('error');
        setMessage('An error occurred during verification. Please try again.');
        console.error('Verification error:', error);
      }
    };

    verifyEmail();
  }, [toast, navigate]); // Added navigate to dependency array

  const handleContinue = () => {
    if (verificationStatus === 'success') {
      navigate('/upload');
    } else {
      navigate('/auth');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-navy-900 via-navy-800 to-navy-700">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Email Verification</CardTitle>
          <CardDescription>
            {verificationStatus === 'loading' && 'Verifying your email address...'}
            {verificationStatus === 'success' && 'Verification complete'}
            {verificationStatus === 'error' && 'Verification failed'}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <div className="flex flex-col items-center space-y-4">
            {verificationStatus === 'loading' && (
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            )}

            {verificationStatus === 'success' && (
              <>
                <CheckCircle2 className="h-12 w-12 text-green-500" />
                <p className="text-green-600 font-medium">{message}</p>
                <p className="text-sm text-muted-foreground">
                  You can now upload clips and access all Gamefolio features.
                </p>
              </>
            )}

            {verificationStatus === 'error' && (
              <>
                <XCircle className="h-12 w-12 text-red-500" />
                <p className="text-red-600 font-medium">{message}</p>
                <p className="text-sm text-muted-foreground">
                  Please try registering again or contact support if the problem persists.
                </p>
              </>
            )}

            {verificationStatus !== 'loading' && (
              <Button onClick={handleContinue} className="w-full">
                {verificationStatus === 'success' ? 'Start Uploading' : 'Back to Login'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}