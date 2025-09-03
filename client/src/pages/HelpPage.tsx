import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useQuery } from '@tanstack/react-query';
import { 
  HelpCircle, 
  MessageSquare, 
  Upload, 
  Users, 
  Settings, 
  Trophy,
  Mail,
  CheckCircle
} from 'lucide-react';

const supportFormSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  category: z.enum(['Tech Support', 'Business Enquiry', 'Partnership Enquiry', 'Other']),
  subject: z.string().min(1, 'Subject is required').max(100, 'Subject must be 100 characters or less'),
  message: z.string().min(10, 'Message must be at least 10 characters').max(1000, 'Message must be 1000 characters or less')
});

type SupportFormData = z.infer<typeof supportFormSchema>;

export default function HelpPage() {
  const { toast } = useToast();
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Get current user for auto-filling username
  const { data: user } = useQuery<{ id: number; username: string; email: string }>({
    queryKey: ['/api/user'],
    retry: false,
  });

  const form = useForm<SupportFormData>({
    resolver: zodResolver(supportFormSchema),
    defaultValues: {
      username: user?.username || '',
      category: undefined,
      subject: '',
      message: ''
    }
  });

  // Update username when user data loads
  if (user?.username && form.getValues().username !== user.username) {
    form.setValue('username', user.username);
  }

  const submitSupportForm = useMutation({
    mutationFn: (data: SupportFormData) => apiRequest('/api/support', 'POST', data),
    onSuccess: () => {
      setIsSubmitted(true);
      form.reset({
        username: user?.username || '',
        category: undefined,
        subject: '',
        message: ''
      });
      toast({
        title: "Support request sent!",
        description: "We'll get back to you as soon as possible.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send support request",
        description: error.message || "Please try again later.",
        variant: "destructive"
      });
    }
  });

  const onSubmit = (data: SupportFormData) => {
    submitSupportForm.mutate(data);
  };

  if (isSubmitted) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold mb-2">Support Request Sent!</h1>
          <p className="text-muted-foreground mb-6">
            Thank you for contacting us. We'll respond to your request as soon as possible.
          </p>
          <Button onClick={() => setIsSubmitted(false)}>
            Send Another Request
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2">Help & Support</h1>
        <p className="text-muted-foreground text-lg">
          Learn how to make the most of your Gamefolio experience
        </p>
      </div>

      {/* User Guides Section */}
      <div className="mb-12">
        <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
          <HelpCircle className="h-6 w-6" />
          How to Use Gamefolio
        </h2>
        
        <div className="grid gap-6 md:grid-cols-2">
          {/* Getting Started */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Getting Started
              </CardTitle>
              <CardDescription>
                Set up your gaming profile and start sharing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm">
                <strong>1. Complete Your Profile</strong>
                <p className="text-muted-foreground">Add your display name, bio, and profile picture to make your profile stand out.</p>
              </div>
              <div className="text-sm">
                <strong>2. Add Favorite Games</strong>
                <p className="text-muted-foreground">Select your favorite games to help others discover your gaming interests.</p>
              </div>
              <div className="text-sm">
                <strong>3. Verify Your Email</strong>
                <p className="text-muted-foreground">Verify your email to unlock all features like uploading content and messaging.</p>
              </div>
            </CardContent>
          </Card>

          {/* Uploading Content */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Uploading Content
              </CardTitle>
              <CardDescription>
                Share your best gaming moments
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm">
                <strong>Gaming Clips</strong>
                <p className="text-muted-foreground">Upload video clips of your best plays. Supported formats: MP4, MOV, AVI.</p>
              </div>
              <div className="text-sm">
                <strong>Screenshots</strong>
                <p className="text-muted-foreground">Share stunning game screenshots. Supported formats: PNG, JPG, JPEG.</p>
              </div>
              <div className="text-sm">
                <strong>Reels</strong>
                <p className="text-muted-foreground">Create short-form content in vertical format for maximum engagement.</p>
              </div>
            </CardContent>
          </Card>

          {/* Customization */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Profile Customization
              </CardTitle>
              <CardDescription>
                Make your profile uniquely yours
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm">
                <strong>Theme Colors</strong>
                <p className="text-muted-foreground">Choose from preset themes or create custom colors that reflect your style.</p>
              </div>
              <div className="text-sm">
                <strong>Banner & Avatar</strong>
                <p className="text-muted-foreground">Upload custom banner and profile pictures to personalize your space.</p>
              </div>
              <div className="text-sm">
                <strong>Privacy Settings</strong>
                <p className="text-muted-foreground">Control who can see your content and interact with your profile.</p>
              </div>
            </CardContent>
          </Card>

          {/* Social Features */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Social Features
              </CardTitle>
              <CardDescription>
                Connect with the gaming community
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm">
                <strong>Reactions & Likes</strong>
                <p className="text-muted-foreground">Show appreciation for great content with likes and reactions.</p>
              </div>
              <div className="text-sm">
                <strong>Following</strong>
                <p className="text-muted-foreground">Follow your favorite gamers to see their latest content in your feed.</p>
              </div>
              <div className="text-sm">
                <strong>Leaderboards</strong>
                <p className="text-muted-foreground">Compete with other users and climb the platform leaderboards.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Support Form Section */}
      <div>
        <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
          <MessageSquare className="h-6 w-6" />
          Contact Support
        </h2>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Send us a message
            </CardTitle>
            <CardDescription>
              Need help? We're here to assist you with any questions or issues.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="Your username"
                          disabled={!!user?.username}
                          data-testid="input-support-username"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Support Category</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-support-category">
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Tech Support">Tech Support</SelectItem>
                          <SelectItem value="Business Enquiry">Business Enquiry</SelectItem>
                          <SelectItem value="Partnership Enquiry">Partnership Enquiry</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="subject"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subject</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="Brief description of your request"
                          data-testid="input-support-subject"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Message</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder="Describe your issue or question in detail..."
                          rows={6}
                          data-testid="textarea-support-message"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={submitSupportForm.isPending}
                  data-testid="button-submit-support"
                >
                  {submitSupportForm.isPending ? 'Sending...' : 'Send Support Request'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}