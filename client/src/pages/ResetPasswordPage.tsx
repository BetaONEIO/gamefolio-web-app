import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, KeyRound, Check, AlertCircle } from 'lucide-react';

// Form validation schema
const resetPasswordSchema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

const ResetPasswordPage = () => {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [token, setToken] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form with react-hook-form
  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  // Extract token from URL on component mount
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const urlToken = searchParams.get('token');

    if (!urlToken) {
      setError('Reset token is missing');
      toast({
        title: 'Error',
        description: 'Password reset token is missing',
        variant: 'destructive',
      });
    } else {
      setToken(urlToken);
    }
  }, [toast]);

  // Handle form submission
  const onSubmit = async (values: ResetPasswordFormValues) => {
    if (!token) {
      setError('Reset token is missing');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          newPassword: values.password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setIsSuccess(true);
        toast({
          title: 'Success',
          description: 'Your password has been reset successfully',
        });
      } else {
        setError(data.message || 'Failed to reset password');
        toast({
          title: 'Error',
          description: data.message || 'Failed to reset password',
          variant: 'destructive',
        });
      }
    } catch (err) {
      setError('An error occurred while resetting your password');
      toast({
        title: 'Error',
        description: 'An error occurred while resetting your password',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container flex items-center justify-center min-h-screen py-10">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Reset Password</CardTitle>
          <CardDescription>Create a new password for your account</CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="flex flex-col items-center gap-4 py-6">
              <div className="rounded-full bg-red-100 p-3">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <div className="text-center">
                <p className="text-red-600 font-medium">{error}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  The password reset link may have expired or is invalid.
                </p>
              </div>
            </div>
          ) : isSuccess ? (
            <div className="flex flex-col items-center gap-4 py-6">
              <div className="rounded-full bg-primary p-3">
                <Check className="h-6 w-6 text-primary" />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-semibold">Password Reset Complete</h3>
                <p className="text-muted-foreground mt-1">
                  Your password has been reset successfully. You can now log in with your new password.
                </p>
              </div>
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="********" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="********" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                >
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
        </CardContent>
        <CardFooter className="flex justify-center">
          {(error || isSuccess) && (
            <Button variant="outline" onClick={() => navigate('/auth')}>
              Back to Login
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
};

export default ResetPasswordPage;