import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Mail, CheckCircle } from 'lucide-react';

interface WalletOTPModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: string;
  onVerify: (code: string) => Promise<boolean>;
  isVerifying: boolean;
  error: string | null;
}

export default function WalletOTPModal({
  open,
  onOpenChange,
  email,
  onVerify,
  isVerifying,
  error,
}: WalletOTPModalProps) {
  const [otpCode, setOtpCode] = useState('');
  const [success, setSuccess] = useState(false);

  const handleVerify = async () => {
    if (otpCode.length < 6) return;
    const result = await onVerify(otpCode);
    if (result) {
      setSuccess(true);
      setTimeout(() => {
        onOpenChange(false);
        setSuccess(false);
        setOtpCode('');
      }, 1500);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && otpCode.length >= 6 && !isVerifying) {
      handleVerify();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-[#020617] border-gray-800">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            {success ? (
              <>
                <CheckCircle className="h-5 w-5 text-[#4ade80]" />
                Wallet Created!
              </>
            ) : (
              <>
                <Mail className="h-5 w-5 text-[#4ade80]" />
                Verify Your Email
              </>
            )}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            {success ? (
              'Your wallet has been created and linked to your account.'
            ) : (
              <>
                We've sent a verification code to <span className="text-white font-medium">{email}</span>. 
                Enter it below to create your wallet.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {!success && (
          <div className="space-y-4 pt-4">
            <div>
              <Input
                type="text"
                placeholder="Enter 6-digit code"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                onKeyDown={handleKeyDown}
                className="text-center text-2xl tracking-widest font-mono bg-gray-900 border-gray-700 text-white"
                maxLength={6}
                autoFocus
              />
              {error && (
                <p className="text-sm text-red-400 mt-2">{error}</p>
              )}
            </div>

            <Button
              onClick={handleVerify}
              disabled={otpCode.length < 6 || isVerifying}
              className="w-full bg-[#4ade80] hover:bg-[#22c55e] text-black font-semibold"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Create Wallet'
              )}
            </Button>

            <p className="text-xs text-gray-500 text-center">
              Didn't receive the code? Check your spam folder or wait a moment and try again.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
