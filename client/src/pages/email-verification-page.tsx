import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2, ArrowRight } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function EmailVerificationPage() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'invalid'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        // Get token from URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');

        if (!token) {
          setStatus('invalid');
          setMessage('Invalid verification link. No token provided.');
          return;
        }

        // Call the verification API
        const response = await apiRequest('POST', '/api/auth/verify-email', { token });
        
        if (response.ok) {
          setStatus('success');
          setMessage('Your email has been verified successfully! You can now access all features of Gamefolio.');
        } else {
          const errorData = await response.json();
          setStatus('error');
          setMessage(errorData.message || 'Verification failed. The link may be expired or invalid.');
        }
      } catch (error) {
        console.error('Verification error:', error);
        setStatus('error');
        setMessage('An error occurred during verification. Please try again or contact support.');
      }
    };

    verifyEmail();
  }, []);

  const handleContinue = () => {
    if (status === 'success') {
      // Redirect to auth page or home page
      setLocation('/auth');
    } else {
      // For errors, redirect to auth page where they can request a new verification email
      setLocation('/auth');
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'loading':
        return <Loader2 className="w-16 h-16 text-blue-500 animate-spin" />;
      case 'success':
        return <CheckCircle2 className="w-16 h-16 text-green-500" />;
      case 'error':
      case 'invalid':
        return <XCircle className="w-16 h-16 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusTitle = () => {
    switch (status) {
      case 'loading':
        return 'Verifying Your Email...';
      case 'success':
        return 'Email Verified Successfully!';
      case 'error':
        return 'Verification Failed';
      case 'invalid':
        return 'Invalid Verification Link';
      default:
        return '';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'success':
        return 'text-green-400';
      case 'error':
      case 'invalid':
        return 'text-red-400';
      default:
        return 'text-blue-400';
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex items-center justify-center">
            {getStatusIcon()}
          </div>
          <CardTitle className={`text-xl font-bold ${getStatusColor()}`}>
            {getStatusTitle()}
          </CardTitle>
          <CardDescription className="text-center mt-2">
            {message}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {status === 'success' && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
              <h3 className="font-medium text-green-400 mb-2">What's Next?</h3>
              <ul className="text-sm text-green-300 space-y-1">
                <li>• Complete your profile setup</li>
                <li>• Start uploading gaming clips and screenshots</li>
                <li>• Connect with other gamers</li>
                <li>• Build your gaming portfolio</li>
              </ul>
            </div>
          )}
          
          {(status === 'error' || status === 'invalid') && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
              <h3 className="font-medium text-red-400 mb-2">Need Help?</h3>
              <p className="text-sm text-red-300">
                You can request a new verification email from the login page, or contact support if you continue to have issues.
              </p>
            </div>
          )}
          
          <Button 
            onClick={handleContinue} 
            className="w-full"
            disabled={status === 'loading'}
          >
            {status === 'success' ? (
              <>
                Continue to Gamefolio
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            ) : (
              'Go to Login'
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}