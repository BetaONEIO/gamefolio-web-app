import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { 
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Loader2, MailIcon, ArrowLeft, CheckCircle2, KeyRound, RefreshCw } from 'lucide-react';

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

const newPasswordSchema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
type NewPasswordFormValues = z.infer<typeof newPasswordSchema>;

type Step = 'email' | 'code' | 'password' | 'success';

interface ForgotPasswordFormProps {
  onBack: () => void;
}

const ForgotPasswordForm = ({ onBack }: ForgotPasswordFormProps) => {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>('email');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [canResend, setCanResend] = useState(true);
  const [cooldownTime, setCooldownTime] = useState(0);
  const [isResending, setIsResending] = useState(false);

  const emailForm = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const passwordForm = useForm<NewPasswordFormValues>({
    resolver: zodResolver(newPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

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

  const handleSendCode = async (values: ForgotPasswordFormValues) => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: values.email }),
      });

      const data = await response.json();

      if (response.ok) {
        setEmail(values.email);
        setStep('code');
        setCanResend(false);
        setCooldownTime(60);
        toast({
          title: 'Code Sent',
          description: 'If your email is registered, you\'ll receive a 6-digit code shortly',
        });
      } else {
        toast({
          title: 'Request Failed',
          description: data.message || 'Unable to process password reset request',
          variant: 'gamefolioError',
        });
      }
    } catch (error) {
      toast({
        title: 'Something went wrong',
        description: 'We couldn\'t process your request. Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyCode = async () => {
    setErrorMessage('');

    if (code.length !== 6 || !/^\d{6}$/.test(code)) {
      setErrorMessage('Please enter a 6-digit verification code.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/auth/verify-reset-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });

      const data = await response.json();

      if (response.ok && data.verified) {
        setStep('password');
        toast({
          title: 'Code Verified',
          description: 'You can now set a new password',
          variant: 'gamefolioSuccess',
        });
      } else {
        setErrorMessage(data.message || 'Invalid or expired code. Please try again.');
      }
    } catch (error) {
      setErrorMessage('Network error. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendCode = async () => {
    if (!canResend) return;
    setIsResending(true);
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        toast({
          title: 'Code Resent',
          description: 'A new 6-digit code has been sent to your email.',
          variant: 'gamefolioSuccess',
        });
        setCanResend(false);
        setCooldownTime(60);
        setCode('');
        setErrorMessage('');
      } else {
        toast({
          title: 'Failed to resend',
          description: 'Please try again later.',
          variant: 'gamefolioError',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Unable to resend code. Please try again.',
        variant: 'gamefolioError',
      });
    } finally {
      setIsResending(false);
    }
  };

  const handleResetPassword = async (values: NewPasswordFormValues) => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, newPassword: values.password }),
      });

      const data = await response.json();

      if (response.ok) {
        setStep('success');
        toast({
          title: 'Password Reset',
          description: 'Your password has been reset successfully',
          variant: 'gamefolioSuccess',
        });
      } else {
        toast({
          title: 'Reset Failed',
          description: data.message || 'Failed to reset password. Please try again.',
          variant: 'gamefolioError',
        });
      }
    } catch (error) {
      toast({
        title: 'Something went wrong',
        description: 'We couldn\'t reset your password. Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
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

  return (
    <Card className="w-full min-h-[400px] border-0 bg-transparent shadow-none">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">
          {step === 'email' && 'Reset Password'}
          {step === 'code' && 'Enter Reset Code'}
          {step === 'password' && 'New Password'}
          {step === 'success' && 'Password Reset'}
        </CardTitle>
        <CardDescription>
          {step === 'email' && 'Enter your email address and we\'ll send you a code to reset your password'}
          {step === 'code' && `We've sent a 6-digit code to ${email}`}
          {step === 'password' && 'Create a new password for your account'}
          {step === 'success' && 'Your password has been updated successfully'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {step === 'email' && (
          <Form {...emailForm}>
            <form onSubmit={emailForm.handleSubmit(handleSendCode)} className="space-y-4">
              <FormField
                control={emailForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email address</FormLabel>
                    <FormControl>
                      <Input 
                        type="email" 
                        placeholder="you@example.com" 
                        {...field}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending Code...
                  </>
                ) : (
                  <>
                    <MailIcon className="mr-2 h-4 w-4" />
                    Send Reset Code
                  </>
                )}
              </Button>
            </form>
          </Form>
        )}

        {step === 'code' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="reset-code" className="text-sm font-medium">
                Verification Code
              </label>
              <Input
                id="reset-code"
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
                <p className="text-sm text-red-500 text-center font-medium">
                  {errorMessage}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground text-center">
                  Enter the 6-digit code from your email
                </p>
              )}
            </div>

            <Button
              onClick={handleVerifyCode}
              disabled={code.length !== 6 || isSubmitting}
              className="w-full"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify Code'
              )}
            </Button>

            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">
                Didn't receive the code?
              </p>
              <Button
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

            <div className="text-center pt-2">
              <p className="text-xs text-muted-foreground">
                Code expires in 15 minutes
              </p>
            </div>
          </div>
        )}

        {step === 'password' && (
          <Form {...passwordForm}>
            <form onSubmit={passwordForm.handleSubmit(handleResetPassword)} className="space-y-4">
              <FormField
                control={passwordForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="********" {...field} disabled={isSubmitting} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={passwordForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="********" {...field} disabled={isSubmitting} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Resetting Password...
                  </>
                ) : (
                  <>
                    <KeyRound className="mr-2 h-4 w-4" />
                    Reset Password
                  </>
                )}
              </Button>
            </form>
          </Form>
        )}

        {step === 'success' && (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="rounded-full bg-primary/10 p-3 mb-4">
              <CheckCircle2 className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-medium mb-2">Password Updated</h3>
            <p className="text-muted-foreground mb-4">
              Your password has been reset successfully. You can now log in with your new password.
            </p>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button 
          variant="ghost" 
          className="w-full" 
          onClick={step === 'code' ? () => setStep('email') : onBack}
          disabled={isSubmitting}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {step === 'code' ? 'Back' : 'Back to Login'}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ForgotPasswordForm;