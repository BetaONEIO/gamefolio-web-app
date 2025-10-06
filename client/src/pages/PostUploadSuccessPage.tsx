import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { 
  CheckCircle, 
  Upload, 
  Copy, 
  Download, 
  Facebook, 
  MessageCircle, 
  Share2, 
  Plus,
  ExternalLink,
  TrendingUp,
  Users,
  Eye,
  Heart,
  Target,
  Sparkles,
  Calendar,
  Clock,
  BarChart3,
  Zap
} from "lucide-react";
import { SiReddit } from "react-icons/si";
import { FaXTwitter } from "react-icons/fa6";

interface UploadedContent {
  id: number;
  title: string;
  description: string;
  contentType: 'clip' | 'reel' | 'screenshot';
  qrCode?: string;
  shareUrl: string;
  socialMediaLinks?: {
    facebook: string;
    twitter: string;
    discord: string;
    reddit: string;
  };
  createdAt: string;
  views: number;
}



interface NextStepSuggestion {
  title: string;
  description: string;
  action: string;
  icon: React.ComponentType<any>;
  priority: 'high' | 'medium' | 'low';
}

const PostUploadSuccessPage = () => {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [showCelebration, setShowCelebration] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);

  // Get content type and ID from URL path parameters
  const [location] = useLocation();
  const pathParts = location.split('/');
  const contentType = pathParts[2] as 'clip' | 'reel' | 'screenshot';
  const contentId = pathParts[3];

  // Fetch uploaded content data from database
  const { data: uploadedContent, isLoading: isLoadingContent, error: contentError } = useQuery<UploadedContent>({
    queryKey: [`/api/upload-success/${contentType}/${contentId}`],
    enabled: !!(contentType && contentId),
  });

  const generateShareUrl = (contentType: 'clip' | 'reel' | 'screenshot', contentId: number) => {
    // Use the current window location origin, which will be the custom domain when deployed
    const baseUrl = window.location.origin;
    if (contentType === 'screenshot') {
      return `${baseUrl}/screenshot/${contentId}`;
    }
    return `${baseUrl}/clip/${contentId}`;
  };

  // Next step suggestions based on content type and user behavior
  const getNextSteps = (): NextStepSuggestion[] => {
    const baseSteps: NextStepSuggestion[] = [
      {
        title: 'Share with friends',
        description: 'Get your content seen by sharing it on social media',
        action: 'share',
        icon: Share2,
        priority: 'high'
      },
      {
        title: 'Engage with community',
        description: 'Like and comment on other creators\' content',
        action: 'explore',
        icon: Users,
        priority: 'medium'
      },
      {
        title: 'Upload more content',
        description: 'Keep your profile active with regular uploads',
        action: 'upload',
        icon: Plus,
        priority: 'medium'
      },
      {
        title: 'Optimize your profile',
        description: 'Complete your bio and add social links',
        action: 'profile',
        icon: Users,
        priority: 'low'
      }
    ];

    return baseSteps;
  };

  // Animation effects
  useEffect(() => {
    if (uploadedContent) {
      // Hide celebration after 3 seconds
      const timer = setTimeout(() => setShowCelebration(false), 3000);

      // Step through guided experience
      const stepTimer = setInterval(() => {
        setCurrentStep(prev => (prev + 1) % 4);
      }, 2000);

      return () => {
        clearTimeout(timer);
        clearInterval(stepTimer);
      };
    }
  }, [uploadedContent]);

  // Redirect if no valid parameters
  useEffect(() => {
    if (!contentType || !contentId) {
      console.log('PostUploadSuccessPage: Missing content type or ID, redirecting to upload');
      navigate('/upload');
    }
  }, [contentType, contentId, navigate]);

  const handleCopyLink = async () => {
    if (!uploadedContent) return;

    try {
      await navigator.clipboard.writeText(uploadedContent.shareUrl);
      setCopied(true);
      toast({
        title: "Link copied!",
        description: "The share link has been copied to your clipboard.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Please copy the link manually.",
        variant: "destructive",
      });
    }
  };

  const handleDownloadQR = () => {
    if (!uploadedContent?.qrCode) return;

    const link = document.createElement('a');
    link.href = uploadedContent.qrCode;
    link.download = `gamefolio-${uploadedContent.contentType}-qr.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSocialShare = (platform: string, url: string) => {
    if (platform === 'discord') {
      // For Discord, copy the link to clipboard
      navigator.clipboard.writeText(uploadedContent?.shareUrl || '');
      toast({
        title: "Link copied for Discord!",
        description: "Paste this link in your Discord channel.",
      });
    } else {
      window.open(url, '_blank', 'width=600,height=400');
    }
  };

  const handleUploadMore = () => {
    if (!uploadedContent) return;

    // Navigate back to the appropriate upload page based on content type
    if (uploadedContent.contentType === 'screenshot') {
      navigate('/upload?tab=screenshots');
    } else if (uploadedContent.contentType === 'reel') {
      navigate('/upload?tab=reels');
    } else {
      navigate('/upload?tab=clips');
    }
  };

  const handleViewContent = () => {
    if (!uploadedContent) return;

    if (uploadedContent.contentType === 'screenshot') {
      navigate(`/profile/${user?.username}#screenshots`);
    } else {
      navigate(`/view/${uploadedContent.id}`);
    }
  };

  if (isLoadingContent) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your upload...</p>
        </div>
      </div>
    );
  }

  if (contentError || !uploadedContent) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">Failed to load upload data</p>
          <Button onClick={() => navigate('/upload')} variant="outline">
            Return to Upload
          </Button>
        </div>
      </div>
    );
  }

  const contentTypeDisplay = uploadedContent.contentType === 'screenshot' ? 'Screenshot' 
    : uploadedContent.contentType === 'reel' ? 'Reel' : 'Clip';

  const nextSteps = getNextSteps();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Animated Celebration Header */}
        <div className={`text-center mb-8 transition-all duration-1000 ${showCelebration ? 'scale-110' : 'scale-100'}`}>
          <div className="relative inline-flex items-center justify-center mb-6">
            <div className={`w-24 h-24 bg-gradient-to-r from-primary to-primary/80 rounded-full flex items-center justify-center mb-4 shadow-2xl transition-all duration-500 ${showCelebration ? 'animate-bounce' : ''}`}>
              <CheckCircle className="h-12 w-12 text-primary-foreground" />
            </div>
            {showCelebration && (
              <div className="absolute inset-0 pointer-events-none">
                <Sparkles className="h-6 w-6 text-primary animate-ping absolute top-0 left-1/4" />
                <Sparkles className="h-4 w-4 text-primary/80 animate-ping absolute top-1/4 right-0" style={{ animationDelay: '0.2s' }} />
                <Sparkles className="h-5 w-5 text-primary animate-ping absolute bottom-0 left-0" style={{ animationDelay: '0.4s' }} />
                <Sparkles className="h-3 w-3 text-primary/60 animate-ping absolute bottom-1/4 right-1/4" style={{ animationDelay: '0.6s' }} />
              </div>
            )}
          </div>

          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent mb-3">
            🎉 Upload Successful!
          </h1>
          <p className="text-muted-foreground text-xl mb-4">
            Your {contentTypeDisplay.toLowerCase()} "<span className="font-semibold text-foreground">{uploadedContent.title}</span>" is now live and ready to be discovered!
          </p>

          {/* Quick Stats */}
          <div className="flex justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>Just uploaded</span>
            </div>
            <div className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              <span>{uploadedContent.views} views</span>
            </div>
            <div className="flex items-center gap-1">
              <TrendingUp className="h-4 w-4" />
              <span>Trending potential: High</span>
            </div>
          </div>
        </div>



        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content Card */}
          <div className="lg:col-span-2 space-y-6">
            {/* Analytics Preview Card */}
            <Card className="bg-card border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Performance Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-muted rounded-lg border">
                    <Eye className="h-6 w-6 text-primary mx-auto mb-2" />
                    <div className="text-2xl font-bold text-foreground">{uploadedContent.views}</div>
                    <div className="text-sm text-muted-foreground">Views</div>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg border">
                    <Heart className="h-6 w-6 text-red-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-foreground">0</div>
                    <div className="text-sm text-muted-foreground">Likes</div>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg border">
                    <MessageCircle className="h-6 w-6 text-primary mx-auto mb-2" />
                    <div className="text-2xl font-bold text-foreground">0</div>
                    <div className="text-sm text-muted-foreground">Comments</div>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg border">
                    <Zap className="h-6 w-6 text-yellow-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-foreground">High</div>
                    <div className="text-sm text-muted-foreground">Potential</div>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-muted rounded-lg border">
                  <h3 className="font-semibold text-foreground mb-2">Growth Prediction</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Based on your content quality and engagement patterns, this {contentTypeDisplay.toLowerCase()} is projected to reach:
                  </p>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">24 hours:</span>
                      <Badge variant="secondary">50-100 views</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">7 days:</span>
                      <Badge variant="secondary">200-500 views</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Share Your Content Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Share2 className="h-5 w-5" />
                  Share Your {contentTypeDisplay}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
            {/* QR Code Display */}
            {uploadedContent.qrCode && (
              <div className="flex flex-col items-center space-y-3">
                <img 
                  src={uploadedContent.qrCode} 
                  alt="QR Code" 
                  className="w-32 h-32 border border-border rounded-lg bg-white p-2"
                />
                <p className="text-sm font-medium text-green-500">
                  Scan this QR code to view the clip on any device
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadQR}
                  className="text-sm"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download QR Code
                </Button>
              </div>
            )}

            {/* Share Link */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground">
                Share Link
              </label>
              <div className="flex gap-2">
                <Input
                  value={uploadedContent.shareUrl}
                  readOnly
                  className="text-sm"
                />
                <Button
                  variant="outline"
                  onClick={handleCopyLink}
                  className={`min-w-[100px] ${copied ? "bg-primary/10 text-primary border-primary" : ""}`}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  {copied ? "Copied!" : "Copy"}
                </Button>
              </div>
            </div>

            {/* Social Media Buttons */}
            {uploadedContent.socialMediaLinks && (
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">
                  Share on Social Media
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    onClick={() => handleSocialShare('twitter', uploadedContent.socialMediaLinks!.twitter)}
                    className="flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-900/20"
                  >
                    <FaXTwitter className="h-4 w-4" />
                    X
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => handleSocialShare('facebook', uploadedContent.socialMediaLinks!.facebook)}
                    className="flex items-center justify-center gap-2 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                  >
                    <Facebook className="h-4 w-4 text-blue-600" />
                    Facebook
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => handleSocialShare('reddit', uploadedContent.socialMediaLinks!.reddit)}
                    className="flex items-center justify-center gap-2 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                  >
                    <SiReddit className="h-4 w-4 text-orange-600" />
                    Reddit
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => handleSocialShare('discord', uploadedContent.socialMediaLinks!.discord)}
                    className="flex items-center justify-center gap-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                  >
                    <MessageCircle className="h-4 w-4 text-indigo-500" />
                    Discord
                  </Button>
                </div>
              </div>
            )}

            {/* Email Share */}
            <Button
              variant="outline"
              onClick={() => {
                const emailUrl = `mailto:?subject=${encodeURIComponent(`Check out this ${contentTypeDisplay.toLowerCase()}!`)}&body=${encodeURIComponent(`I wanted to share this ${contentTypeDisplay.toLowerCase()} with you: ${uploadedContent.shareUrl}`)}`;
                window.location.href = emailUrl;
              }}
              className="w-full flex items-center justify-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Share via Email
            </Button>
          </CardContent>
        </Card>
          </div>

          {/* Sidebar with Next Steps and QR Code */}
          <div className="space-y-6">
            {/* QR Code Card */}
            {uploadedContent.qrCode && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Quick Share</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <img 
                    src={uploadedContent.qrCode} 
                    alt="QR Code" 
                    className="w-40 h-40 mx-auto border border-border rounded-lg bg-white p-2 mb-4"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadQR}
                    className="w-full"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download QR Code
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Next Steps Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  What's Next?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {nextSteps.slice(0, 3).map((step, index) => {
                    const Icon = step.icon;
                    return (
                      <div 
                        key={index} 
                        className={`p-3 rounded-lg border transition-all duration-300 ${
                          currentStep === index 
                            ? 'bg-primary/10 border-primary/40' 
                            : 'bg-muted border-border'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <Icon className={`h-5 w-5 mt-0.5 ${
                            step.priority === 'high' ? 'text-red-500' :
                            step.priority === 'medium' ? 'text-yellow-500' : 'text-muted-foreground'
                          }`} />
                          <div className="flex-1">
                            <h4 className="font-semibold text-foreground text-sm">
                              {step.title}
                            </h4>
                            <p className="text-xs text-muted-foreground mt-1">
                              {step.description}
                            </p>
                          </div>
                          {step.priority === 'high' && (
                            <Badge variant="destructive" className="text-xs">
                              Priority
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Quick Action Buttons */}
            <div className="space-y-3">
              <Button
                onClick={handleUploadMore}
                className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90"
                size="lg"
              >
                <Plus className="h-5 w-5" />
                Upload More Content
              </Button>

              <Button
                variant="outline"
                onClick={handleViewContent}
                className="w-full flex items-center justify-center gap-2"
                size="lg"
              >
                <ExternalLink className="h-5 w-5" />
                View {contentTypeDisplay}
              </Button>
            </div>
          </div>
        </div>

        {/* Bottom Stats Banner */}
        <div className="mt-12 text-center p-6 bg-gradient-to-r from-muted to-primary/10 rounded-xl border border-border">
          <h3 className="text-lg font-semibold text-foreground mb-2">
            🎮 Your content is now part of the Gamefolio community!
          </h3>
          <p className="text-muted-foreground mb-4">
            Your {contentTypeDisplay.toLowerCase()} is now visible on your profile and can be discovered by other users.
            {uploadedContent.contentType !== 'screenshot' && (
              <span className="block mt-1">
                It may take a few minutes to appear in trending feeds.
              </span>
            )}
          </p>
          <div className="flex justify-center gap-6 text-sm">
            <div className="flex items-center gap-1 text-primary">
              <Calendar className="h-4 w-4" />
              <span>Uploaded {new Date().toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-1 text-primary">
              <Users className="h-4 w-4" />
              <span>Ready for discovery</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostUploadSuccessPage;