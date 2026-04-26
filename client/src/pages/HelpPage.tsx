import { useState, useMemo } from 'react';
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
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { 
  Search,
  MessageSquare, 
  Mail,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Upload,
  User,
  Shield,
  CreditCard,
  Share2,
  Bell,
  Gamepad2,
  Settings,
  HelpCircle
} from 'lucide-react';

const supportFormSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  category: z.enum(['Tech Support', 'Business Enquiry', 'Partnership Enquiry', 'Other']),
  subject: z.string().min(1, 'Subject is required').max(100, 'Subject must be 100 characters or less'),
  message: z.string().min(10, 'Message must be at least 10 characters').max(1000, 'Message must be 1000 characters or less')
});

type SupportFormData = z.infer<typeof supportFormSchema>;

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  keywords: string[];
}

const faqData: FAQItem[] = [
  {
    id: 'what-is-gamefolio',
    question: 'What is Gamefolio and how does it work?',
    answer: 'Gamefolio is a social platform designed for gamers to share their gaming highlights, connect with other players, and build their gaming portfolio. You can upload gaming clips, screenshots, and reels to showcase your best moments. Follow other gamers, engage with their content through likes and comments, and climb the leaderboards to gain recognition in the gaming community.',
    category: 'Getting Started',
    keywords: ['about', 'platform', 'gaming', 'social', 'community', 'introduction']
  },
  {
    id: 'create-account',
    question: 'How do I create a Gamefolio account?',
    answer: 'Creating a Gamefolio account is simple. Click the "Sign Up" button on the homepage, enter your email address, choose a unique username, and create a secure password. After registration, we recommend verifying your email address to unlock all platform features including content uploads and messaging.',
    category: 'Getting Started',
    keywords: ['register', 'signup', 'new account', 'join', 'email', 'password']
  },
  {
    id: 'verify-email',
    question: 'Why should I verify my email address?',
    answer: 'Email verification is essential to unlock the full Gamefolio experience. Verified users can upload gaming content (clips, screenshots, reels), send messages to other users, participate in the leaderboards, and receive important account notifications. It also helps protect your account and ensures you can recover it if needed.',
    category: 'Account',
    keywords: ['verification', 'email', 'confirm', 'unlock features', 'security']
  },
  {
    id: 'upload-content',
    question: 'What types of content can I upload to Gamefolio?',
    answer: 'Gamefolio supports three main content types: Gaming Clips (video highlights in MP4, MOV, or AVI format), Screenshots (still images in PNG, JPG, or JPEG format), and Reels (short-form vertical videos for maximum engagement). Each upload can be tagged with the game it features, making it easier for other users to discover your content.',
    category: 'Content',
    keywords: ['upload', 'video', 'clips', 'screenshots', 'images', 'reels', 'formats', 'mp4', 'png', 'jpg']
  },
  {
    id: 'upload-limits',
    question: 'What are the upload size and length limits?',
    answer: 'Free users can upload as many clips, reels, and screenshots as they like — there is no daily quota. Free limits per file are: clips up to 100MB and 3 minutes long, reels up to 50MB and 60 seconds, and screenshots up to 10MB. Pro subscribers get larger files and longer videos: clips up to 500MB and 10 minutes, reels up to 250MB and 3 minutes, and screenshots up to 50MB. Supported video formats include MP4, WebM, and MOV. For images, we support JPEG, PNG, and JPG formats. All uploads are optimized for fast streaming and viewing across devices.',
    category: 'Content',
    keywords: ['file size', 'limits', 'maximum', 'upload size', 'mb', 'video size', 'daily limit', 'free', 'pro', 'quota']
  },
  {
    id: 'customize-profile',
    question: 'How can I customize my Gamefolio profile?',
    answer: 'Your profile is your gaming identity! Customize it by adding a profile picture and banner image, writing a bio that describes your gaming style, selecting your favorite games, and choosing custom theme colors. Access profile customization through Settings > Profile Settings or by clicking the edit button on your profile page.',
    category: 'Profile',
    keywords: ['customize', 'personalize', 'avatar', 'banner', 'bio', 'theme', 'colors', 'settings']
  },
  {
    id: 'privacy-settings',
    question: 'How do I control who sees my content?',
    answer: 'Gamefolio offers flexible privacy options. You can make your profile private (requiring follow approval), control who can message you, and manage comment settings on your posts. Access these options through Settings > Privacy Settings to customize your visibility preferences.',
    category: 'Privacy',
    keywords: ['privacy', 'private', 'public', 'visibility', 'followers', 'who can see']
  },
  {
    id: 'follow-users',
    question: 'How do I follow other gamers?',
    answer: 'To follow a gamer, visit their profile and click the "Follow" button. Once you follow someone, their content will appear in your home feed. You can manage your following list from your profile page. If the user has a private profile, they will need to approve your follow request first.',
    category: 'Social',
    keywords: ['follow', 'following', 'followers', 'connect', 'social', 'feed']
  },
  {
    id: 'leaderboard-ranking',
    question: 'How does the Gamefolio leaderboard work?',
    answer: 'The leaderboard ranks users based on engagement and activity. Earn points by uploading quality content, receiving likes and reactions, gaining followers, and consistent platform engagement. Higher rankings increase your visibility and can help you get featured on the platform.',
    category: 'Features',
    keywords: ['leaderboard', 'ranking', 'points', 'top users', 'featured', 'competition']
  },
  {
    id: 'pro-subscription',
    question: 'What benefits do Pro subscribers get?',
    answer: 'Gamefolio Pro unlocks premium features including: larger file size allowances (clips up to 500MB / 10 min, reels up to 250MB / 3 min, screenshots up to 50MB), an exclusive Pro badge on your profile, access to all avatar borders, a free lootbox reward upon subscribing, a monthly bonus lootbox reward, early access to new features and tools, and priority support. Pro subscribers help support the platform while enjoying enhanced visibility in the community. Subscribe through your account settings.',
    category: 'Subscription',
    keywords: ['pro', 'premium', 'subscription', 'benefits', 'upgrade', 'paid', 'features', 'unlimited', 'lootbox', 'rewards']
  },
  {
    id: 'report-content',
    question: 'How do I report inappropriate content or users?',
    answer: 'If you encounter content that violates our community guidelines, click the three-dot menu on the post and select "Report." Choose the appropriate reason for reporting and provide any additional details. Our moderation team reviews all reports within 24 hours and takes appropriate action.',
    category: 'Safety',
    keywords: ['report', 'inappropriate', 'violation', 'block', 'moderation', 'abuse', 'harassment']
  },
  {
    id: 'delete-account',
    question: 'How do I delete my Gamefolio account?',
    answer: 'To delete your account, go to Settings > Account Settings > Delete Account. You will need to confirm your password and acknowledge that this action is permanent. All your content, followers, and data will be removed. We recommend downloading your data before deletion if you want to keep a copy.',
    category: 'Account',
    keywords: ['delete', 'remove', 'close account', 'permanent', 'data', 'deactivate']
  },
  {
    id: 'share-content',
    question: 'How do I share my Gamefolio content on other platforms?',
    answer: 'Every post on Gamefolio has a share button that provides a direct link to your content. You can copy this link to share on Twitter, Discord, Reddit, or any other platform. Your Gamefolio profile also has a unique shareable URL that you can add to your social media bios.',
    category: 'Social',
    keywords: ['share', 'link', 'social media', 'twitter', 'discord', 'embed', 'url']
  },
  {
    id: 'notifications',
    question: 'How do I manage my notification preferences?',
    answer: 'Control your notifications through Settings > Notification Settings. Choose which activities trigger notifications including new followers, likes on your content, comments, and messages. You can enable or disable email notifications and push notifications separately.',
    category: 'Settings',
    keywords: ['notifications', 'alerts', 'email', 'push', 'preferences', 'settings']
  },
  {
    id: 'supported-games',
    question: 'Which games are supported on Gamefolio?',
    answer: 'Gamefolio supports content from virtually any video game! Our extensive database includes thousands of titles from major platforms like PlayStation, Xbox, Nintendo, PC, and mobile. When uploading content, search for your game to tag it properly. If a game is missing from our database, you can request it to be added.',
    category: 'Features',
    keywords: ['games', 'supported', 'platforms', 'playstation', 'xbox', 'nintendo', 'pc', 'mobile']
  },
  {
    id: 'password-reset',
    question: 'How do I reset my password?',
    answer: 'If you forgot your password, click "Forgot Password" on the login page and enter your email address. You will receive a password reset link valid for 24 hours. Click the link and create a new secure password. For security, always use a unique password that you do not use on other sites.',
    category: 'Account',
    keywords: ['password', 'reset', 'forgot', 'recover', 'login', 'access']
  }
];

const categoryIcons: Record<string, React.ReactNode> = {
  'Getting Started': <HelpCircle className="h-5 w-5" />,
  'Account': <User className="h-5 w-5" />,
  'Content': <Upload className="h-5 w-5" />,
  'Profile': <Settings className="h-5 w-5" />,
  'Privacy': <Shield className="h-5 w-5" />,
  'Social': <Share2 className="h-5 w-5" />,
  'Features': <Gamepad2 className="h-5 w-5" />,
  'Subscription': <CreditCard className="h-5 w-5" />,
  'Safety': <Shield className="h-5 w-5" />,
  'Settings': <Bell className="h-5 w-5" />
};

function FAQArticle({ item, isExpanded, onToggle }: { item: FAQItem; isExpanded: boolean; onToggle: () => void }) {
  return (
    <article 
      className="border rounded-lg overflow-hidden transition-all hover:border-primary/50"
      itemScope 
      itemProp="mainEntity"
      itemType="https://schema.org/Question"
    >
      <button
        onClick={onToggle}
        className="w-full p-4 text-left flex items-center justify-between gap-4 bg-card hover:bg-accent/50 transition-colors"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground">
            {categoryIcons[item.category] || <HelpCircle className="h-5 w-5" />}
          </span>
          <div>
            <h3 className="font-medium text-sm md:text-base" itemProp="name">{item.question}</h3>
            <span className="text-xs text-muted-foreground">{item.category}</span>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-5 w-5 text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0" />
        )}
      </button>
      {isExpanded && (
        <div 
          className="p-4 pt-0 bg-card"
          itemScope 
          itemType="https://schema.org/Answer"
          itemProp="acceptedAnswer"
        >
          <p className="text-sm text-muted-foreground leading-relaxed" itemProp="text">
            {item.answer}
          </p>
        </div>
      )}
    </article>
  );
}

export default function HelpPage() {
  const { toast } = useToast();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

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

  if (user?.username && form.getValues().username !== user.username) {
    form.setValue('username', user.username);
  }

  const submitSupportForm = useMutation({
    mutationFn: (data: SupportFormData) => apiRequest("POST", "/api/support", data),
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

  const toggleItem = (id: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const categories = useMemo(() => {
    const cats = new Set(faqData.map(item => item.category));
    return ['all', ...Array.from(cats).sort()];
  }, []);

  const filteredFAQs = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    
    return faqData.filter(item => {
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      
      if (!query) return matchesCategory;
      
      const matchesSearch = 
        item.question.toLowerCase().includes(query) ||
        item.answer.toLowerCase().includes(query) ||
        item.keywords.some(kw => kw.toLowerCase().includes(query)) ||
        item.category.toLowerCase().includes(query);
      
      return matchesCategory && matchesSearch;
    });
  }, [searchQuery, selectedCategory]);

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
      <header className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2">Help Center</h1>
        <p className="text-muted-foreground text-lg">
          Find answers to common questions about Gamefolio
        </p>
      </header>

      <section className="mb-8" aria-label="FAQ Search">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search help articles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12 text-base"
            aria-label="Search FAQ articles"
          />
        </div>
        
        <div className="flex flex-wrap gap-2">
          {categories.map(category => (
            <Button
              key={category}
              variant={selectedCategory === category ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(category)}
              className="capitalize"
            >
              {category === 'all' ? 'All Topics' : category}
            </Button>
          ))}
        </div>
      </section>

      <section 
        className="mb-12" 
        aria-label="Frequently Asked Questions"
        itemScope 
        itemType="https://schema.org/FAQPage"
      >
        <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
          <HelpCircle className="h-6 w-6" />
          Frequently Asked Questions
          {searchQuery && (
            <span className="text-sm font-normal text-muted-foreground">
              ({filteredFAQs.length} result{filteredFAQs.length !== 1 ? 's' : ''})
            </span>
          )}
        </h2>
        
        {filteredFAQs.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">
                No articles found matching "{searchQuery}". Try different keywords or{' '}
                <button 
                  onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}
                  className="text-primary hover:underline"
                >
                  clear filters
                </button>
                .
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredFAQs.map(item => (
              <FAQArticle
                key={item.id}
                item={item}
                isExpanded={expandedItems.has(item.id)}
                onToggle={() => toggleItem(item.id)}
              />
            ))}
          </div>
        )}
      </section>

      <section aria-label="Contact Support">
        <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
          <MessageSquare className="h-6 w-6" />
          Still Need Help?
        </h2>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Contact Our Support Team
            </CardTitle>
            <CardDescription>
              Can't find what you're looking for? Send us a message and we'll get back to you.
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
      </section>
    </div>
  );
}
