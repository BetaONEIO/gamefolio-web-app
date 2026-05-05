
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Share2, Copy, X, RefreshCw, AlertCircle } from 'lucide-react';
import { FaFacebook, FaReddit, FaLinkedin, FaWhatsapp, FaTelegram, FaDiscord, FaEnvelope } from 'react-icons/fa';
import { FaXTwitter, FaInstagram, FaTiktok, FaSnapchat, FaBluesky, FaThreads } from 'react-icons/fa6';
import { useToast } from '@/hooks/use-toast';
import { openShareWindow, nativeShare, isNative } from '@/lib/platform';

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
    instagram: string;
    tiktok: string;
    bluesky: string;
    snapchat: string;
    threads: string;
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

const COPY_ONLY_PLATFORMS = ["discord", "instagram", "tiktok", "snapchat", "threads"];

const SOCIAL_PLATFORMS = [
  { name: "X", icon: FaXTwitter, key: "twitter" },
  { name: "Facebook", icon: FaFacebook, key: "facebook" },
  { name: "LinkedIn", icon: FaLinkedin, key: "linkedin" },
  { name: "WhatsApp", icon: FaWhatsapp, key: "whatsapp" },
  { name: "Telegram", icon: FaTelegram, key: "telegram" },
  { name: "Reddit", icon: FaReddit, key: "reddit" },
  { name: "Discord", icon: FaDiscord, key: "discord" },
  { name: "Instagram", icon: FaInstagram, key: "instagram" },
  { name: "TikTok", icon: FaTiktok, key: "tiktok" },
  { name: "Bluesky", icon: FaBluesky, key: "bluesky" },
  { name: "Snapchat", icon: FaSnapchat, key: "snapchat" },
  { name: "Threads", icon: FaThreads, key: "threads" },
  { name: "Email", icon: FaEnvelope, key: "email" },
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

  const handleSocialShare = async (platform: string, url: string, platformKey: string) => {
    if (!url) return;
    if (isNative && shareData?.screenshotUrl) {
      const handled = await nativeShare({
        title: shareData.title || 'Gamefolio screenshot',
        text: shareData.description || undefined,
        url: shareData.screenshotUrl,
        dialogTitle: `Share to ${platform}`,
      });
      if (handled) {
        trackShare();
        return;
      }
    }
    if (COPY_ONLY_PLATFORMS.includes(platformKey)) {
      navigator.clipboard.writeText(shareData?.screenshotUrl || url);
      trackShare();
      toast({
        title: `Link copied for ${platform}!`,
        description: `Paste this link in ${platform} to share your screenshot.`,
        duration: 3000,
      });
      return;
    }
    void openShareWindow(url);
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
      <DialogContent
        className="p-0 border-[#1e293b] bg-[#0f172a] w-[calc(100vw-2rem)] max-w-[384px] rounded-3xl overflow-hidden shadow-2xl gap-0 [&>button]:hidden max-h-[90vh]"
        aria-describedby="screenshot-share-description"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-4 sm:py-5 border-b border-[#1e293b]/50">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Share2 className="w-5 h-5 sm:w-6 sm:h-6 text-[#B7FF1A] shrink-0" />
            <span className="text-[#f8fafc] text-base sm:text-xl font-bold truncate">
              {isOwnContent ? 'Share your screenshot' : 'Share screenshot'}
            </span>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-white/5 transition-colors shrink-0 ml-2"
            aria-label="Close share dialog"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6 text-[#94a3b8]" />
          </button>
        </div>

        <div id="screenshot-share-description" className="sr-only">
          Share your gaming screenshot with friends through social media or copy the link
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 flex flex-col gap-5 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin w-8 h-8 border-4 border-[#B7FF1A] border-t-transparent rounded-full" />
            </div>
          ) : error ? (
            <div className="py-2">
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
            <>
              {/* Screenshot Preview */}
              <div className="flex justify-center">
                <div className="relative w-full aspect-video bg-[#1e293b] rounded-2xl overflow-hidden border border-[#1e293b]">
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
              <div className="flex flex-col gap-2.5">
                <span className="text-[#94a3b8] text-sm">Screenshot Link</span>
                <div className="flex gap-2">
                  <div className="flex-1 min-w-0 bg-[#1e293b] border border-[#1e293b] rounded-2xl px-3 sm:px-4 py-3 overflow-hidden">
                    <span className="text-[#94a3b8] text-xs sm:text-sm font-mono truncate block">
                      {shareData.screenshotUrl}
                    </span>
                  </div>
                  <button
                    onClick={handleCopyLink}
                    className="flex items-center gap-1.5 sm:gap-2 bg-[#B7FF1A] hover:bg-[#A2F000] text-[#071013] rounded-2xl px-3 sm:px-4 py-3 transition-colors shrink-0 font-medium"
                    aria-label="Copy screenshot URL to clipboard"
                  >
                    <Copy className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="text-sm sm:text-base whitespace-nowrap">{copySuccess ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>
                {/* Native Share API — mobile only */}
                {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
                  <button
                    onClick={handleNativeShare}
                    className="sm:hidden mt-1 flex items-center justify-center gap-2 border border-[#B7FF1A]/50 hover:bg-[#B7FF1A]/10 text-[#B7FF1A] rounded-2xl py-2.5 transition-colors"
                    aria-label="Share using device's native share menu"
                  >
                    <Share2 className="w-4 h-4" />
                    <span className="text-sm font-medium">Share via…</span>
                  </button>
                )}
              </div>

              {/* Social Media — compact inline icon buttons */}
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                {SOCIAL_PLATFORMS.map((platform) => {
                  const Icon = platform.icon;
                  const shareUrl = shareData.socialMediaLinks?.[platform.key as keyof typeof shareData.socialMediaLinks];
                  return (
                    <button
                      key={platform.key}
                      onClick={() => shareUrl && handleSocialShare(platform.name, shareUrl, platform.key)}
                      disabled={!shareUrl}
                      className="w-10 h-10 rounded-full border border-[#B7FF1A]/40 bg-transparent hover:bg-[#B7FF1A]/10 text-[#f8fafc] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
                      title={platform.name}
                      aria-label={`Share on ${platform.name}`}
                    >
                      <Icon className="w-4 h-4" />
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="text-center py-10">
              <AlertCircle className="w-10 h-10 text-[#94a3b8] mx-auto mb-3" />
              <p className="text-[#94a3b8]">Unable to generate sharing options</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
