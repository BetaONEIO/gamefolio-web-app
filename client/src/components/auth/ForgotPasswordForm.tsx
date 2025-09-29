import { useState } from 'react';
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
import { Loader2, MailIcon, ArrowLeft, CheckCircle2 } from 'lucide-react';

// Form validation schema
const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

interface ForgotPasswordFormProps {
  onBack: () => void;
}

const ForgotPasswordForm = ({ onBack }: ForgotPasswordFormProps) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);
  
  // Initialize form with react-hook-form
  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });
  
  // Handle form submission
  const onSubmit = async (values: ForgotPasswordFormValues) => {
    setIsSubmitting(true);
    
    try {
      console.log('🔄 Sending password reset request for:', values.email);
      
      // Request password reset from the server
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: values.email }),
      });
      
      console.log('📋 Password reset response status:', response.status);
      const data = await response.json();
      console.log('📋 Password reset response data:', data);
      
      // Server handles the email sending automatically with Brevo
      if (response.ok) {
        setIsEmailSent(true);
        toast({
          title: 'Reset Email Sent',
          description: 'If your email is registered, you\'ll receive a reset link shortly',
        });
      } else {
        // Show error if request failed
        console.error('❌ Password reset request failed:', data);
        toast({
          title: 'Request Failed',
          description: data.message || 'Unable to process password reset request',
          variant: 'gamefolioError',
        });
      }
    } catch (error) {
      console.error('❌ Password reset request error:', error);
      toast({
        title: 'Something went wrong',
        description: 'We couldn\'t process your request. Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Card className="w-full min-h-[500px] backdrop-blur-md border border-white/10">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Reset Password</CardTitle>
        <CardDescription>
          Enter your email address and we'll send you a link to reset your password
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isEmailSent ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="rounded-full bg-primary/10 p-3 mb-4">
              <CheckCircle2 className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-medium mb-2">Check your inbox</h3>
            <p className="text-muted-foreground mb-4">
              We've sent a password reset link to your email address. The link will expire in 1 hour.
            </p>
            <p className="text-sm text-muted-foreground">
              If you don't see the email, check your spam folder or try another email address.
            </p>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
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
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending Reset Link...
                  </>
                ) : (
                  <>
                    <MailIcon className="mr-2 h-4 w-4" />
                    Send Reset Link
                  </>
                )}
              </Button>
            </form>
          </Form>
        )}
      </CardContent>
      <CardFooter>
        <Button 
          variant="ghost" 
          className="w-full" 
          onClick={onBack}
          disabled={isSubmitting}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Login
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ForgotPasswordForm;