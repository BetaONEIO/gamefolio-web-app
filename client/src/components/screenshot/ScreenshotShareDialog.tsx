
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Share2, Copy, Download, Facebook, Linkedin, Mail, RefreshCw, AlertCircle } from 'lucide-react';
import { FaReddit, FaWhatsapp, FaTelegram, FaDiscord } from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';
import { useToast } from '@/hooks/use-toast';

interface ShareData {
  screenshotUrl: string;
  screenshotId: string;
  title: string;
  description?: string;
  qrCode: string;
  imageUrl: string; // Add the actual image URL for preview
  socialMediaLinks: {
    twitter: string;
    facebook: string;
    reddit: string;
    linkedin: string;
    whatsapp: string;
    telegram: string;
    discord: string;
    email: string;
  };
}

interface ScreenshotShareDialogProps {
  screenshotId: string;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  isOwnContent?: boolean;
}

const SOCIAL_PLATFORMS = [
  { name: "X", icon: FaXTwitter, key: "twitter", color: "text-foreground" },
  { name: "Facebook", icon: Facebook, key: "facebook", color: "text-blue-600" },
  { name: "Reddit", icon: FaReddit, key: "reddit", color: "text-orange-500" },
  { name: "Discord", icon: FaDiscord, key: "discord", color: "text-indigo-500" },
];

export function ScreenshotShareDialog({ 
  screenshotId, 
  trigger, 
  open: controlledOpen, 
  onOpenChange: controlledOnOpenChange,
  isOwnContent = false
}: ScreenshotShareDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const { toast } = useToast();

  // Use controlled state if provided, otherwise use internal state
  const open = controlledOpen !== undefined ? controlledOpen : isOpen;
  const setOpen = controlledOnOpenChange || setIsOpen;

  const { data: shareData, isLoading, error, refetch } = useQuery<ShareData>({
    queryKey: [`/api/screenshots/${screenshotId}/share`],
    enabled: open,
    retry: 2,
    retryDelay: 1000,
  });

  const trackShare = async () => {
    try {
      await fetch(`/api/screenshots/${screenshotId}/track-share`, { method: "POST", credentials: "include" });
    } catch (_) {}
  };

  const handleCopyLink = async () => {
    if (!shareData?.screenshotUrl) return;
    
    try {
      await navigator.clipboard.writeText(shareData.screenshotUrl);
      setCopySuccess(true);
      trackShare();
      toast({
        title: "Link Copied!",
        description: "The screenshot link has been copied to your clipboard.",
      });
      
      // Reset copy success state after 2 seconds
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
      toast({
        title: "Copy Failed",
        description: "Unable to copy link to clipboard.",
        variant: "destructive",
      });
    }
  };

  const handleNativeShare = async () => {
    if (!shareData) return;
    
    // Check if Web Share API is available (mobile devices)
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareData.title || 'Check out this gaming screenshot!',
          text: shareData.description || 'Amazing gaming content from Gamefolio',
          url: shareData.screenshotUrl
        });
        trackShare();
        toast({
          title: "Shared successfully",
          description: "Content shared using your device's share menu.",
        });
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('Native share failed:', error);
        }
      }
    }
  };

  const handleSocialShare = (platform: string, url: string) => {
    if (!url) return;
    
    window.open(url, '_blank', 'noopener,noreferrer');
    trackShare();
    toast({
      title: `Sharing on ${platform}`,
      description: isOwnContent ? `📸 Sharing your gaming screenshot from your Gamefolio! Your followers will see your epic moment and can visit your profile to see more content.` : `📸 Sharing this gaming screenshot! Check out this epic moment on Gamefolio.`,
      duration: 4000,
    });
  };

  const handleRetry = () => {
    refetch();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && (
        <DialogTrigger asChild>
          {trigger}
        </DialogTrigger>
      )}
      {!trigger && !open && (
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Share2 className="w-4 h-4" />
            Share
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-lg bg-gray-900 border-2 border-gray-700 text-white" aria-describedby="screenshot-share-description">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Share2 className="w-5 h-5 text-white" />
            {isOwnContent ? 'Share your screenshot' : 'Share screenshot'}
          </DialogTitle>
        </DialogHeader>
        
        <div id="screenshot-share-description" className="sr-only">
          Share your gaming screenshot with friends through social media, copy the link, or download a QR code
        </div>
        
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="animate-spin w-8 h-8 border-4 border-gray-400 border-t-transparent rounded-full" />
            <p className="text-sm text-gray-600">Generating sharing options...</p>
          </div>
        ) : error ? (
          <div className="py-8">
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Failed to load sharing options. Please try again.
              </AlertDescription>
            </Alert>
            <Button 
              variant="outline" 
              onClick={handleRetry}
              className="w-full gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
          </div>
        ) : shareData ? (
          <div className="space-y-6">
            {/* Screenshot Thumbnail - Made bigger */}
            <div className="flex justify-center">
              <div className="relative w-72 h-40 bg-gray-800 rounded-lg overflow-hidden border border-gray-600">
                {shareData.imageUrl && (
                  <img
                    src={shareData.imageUrl}
                    alt="Screenshot preview"
                    className="w-full h-full object-cover"
                    data-testid="img-screenshot-preview"
                  />
                )}
              </div>
            </div>
            {/* Share Link Section */}
            <div className="space-y-2">
              <h4 className="font-medium text-white">Share Link</h4>
              <div className="flex items-center gap-2">
                <Input
                  value={shareData.screenshotUrl}
                  readOnly
                  className="flex-1 text-sm bg-gray-800 border-gray-600 text-white"
                  aria-label="Shareable screenshot URL"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyLink}
                  className={`px-4 transition-colors ${
                    copySuccess ? 'text-black bg-[#4ade80] border-[#4ade80]' : 'text-[#4ade80] border-[#4ade80]/50 bg-transparent hover:bg-[#4ade80] hover:text-black'
                  }`}
                  aria-label="Copy screenshot URL to clipboard"
                >
                  <Copy className="h-4 w-4 mr-1" />
                  {copySuccess ? 'Copied!' : 'Copy'}
                </Button>
                {/* Native Share API for mobile devices */}
                {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNativeShare}
                    className="px-4 bg-[#4ade80] text-black hover:bg-[#22c55e] border-[#4ade80]"
                    aria-label="Share using device's native share menu"
                  >
                    <Share2 className="h-4 w-4 mr-1" />
                    Share
                  </Button>
                )}
              </div>
            </div>

            <Separator />

            {/* Social Media Platforms Grid */}
            <div className="space-y-3">
              <h4 className="font-medium text-white">Share on social media</h4>
              <div className="grid grid-cols-2 gap-3">
                {SOCIAL_PLATFORMS.map((platform) => {
                  const Icon = platform.icon;
                  const shareUrl = shareData.socialMediaLinks?.[platform.key as keyof typeof shareData.socialMediaLinks];
                  
                  return (
                    <Button
                      key={platform.key}
                      variant="outline"
                      size="sm"
                      onClick={() => shareUrl && handleSocialShare(platform.name, shareUrl)}
                      className={`flex flex-col items-center gap-1 p-3 h-auto bg-gray-800 hover:bg-gray-700 transition-colors border border-gray-600 ${platform.color} ${
                        !shareUrl ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                      disabled={!shareUrl}
                      aria-label={`Share on ${platform.name}`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-xs text-gray-300">{platform.name}</span>
                    </Button>
                  );
                })}
              </div>
            </div>

            
          </div>
        ) : (
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">Unable to generate sharing options</p>
            <p className="text-sm text-gray-500">Please try again later</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
