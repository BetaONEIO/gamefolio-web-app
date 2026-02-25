import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSignedUrl } from "@/hooks/use-signed-url";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { 
  Share2, 
  Copy, 
  RefreshCw,
  Facebook,
  X,
  Mail,
  Linkedin,
  Send,
  AlertCircle
} from "lucide-react";
import { FaReddit, FaWhatsapp, FaTelegram, FaDiscord } from "react-icons/fa";
import { SiX } from "react-icons/si";

interface ClipShareDialogProps {
  clipId: number;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  isOwnContent?: boolean;
  contentType?: 'clip' | 'reel';
}

interface ShareData {
  clipId: number;
  qrCode: string;
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
  clipUrl: string;
  title: string;
  description: string;
  thumbnailUrl?: string | null;
  videoUrl?: string | null;
  videoType?: string;
}

const SOCIAL_PLATFORMS = [
  { name: "X", icon: SiX, key: "twitter", color: "text-white" },
  { name: "Facebook", icon: Facebook, key: "facebook", color: "text-blue-600" },
  { name: "Reddit", icon: FaReddit, key: "reddit", color: "text-orange-500" },
  { name: "Discord", icon: FaDiscord, key: "discord", color: "text-indigo-500" },
];

// Component to handle clip thumbnail display with signed URLs
function ClipThumbnail({ thumbnailUrl, videoUrl }: { thumbnailUrl?: string | null; videoUrl?: string | null }) {
  const { signedUrl: signedThumbUrl } = useSignedUrl(thumbnailUrl);
  const { signedUrl: signedVideoUrl } = useSignedUrl(videoUrl);

  if (signedThumbUrl) {
    return (
      <img
        src={signedThumbUrl}
        alt="Video thumbnail"
        className="w-full h-full object-cover"
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          const videoElement = target.nextElementSibling as HTMLVideoElement;
          if (videoElement) {
            videoElement.style.display = 'block';
          }
        }}
      />
    );
  }

  if (signedVideoUrl) {
    return (
      <video
        className="w-full h-full object-cover"
        src={signedVideoUrl}
        preload="metadata"
        muted
      />
    );
  }

  if (thumbnailUrl || videoUrl) {
    return (
      <div className="w-full h-full bg-gray-700 flex items-center justify-center">
        <div className="animate-spin w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-gray-700 flex items-center justify-center">
      <span className="text-gray-400 text-sm">No preview available</span>
    </div>
  );
}

export function ClipShareDialog({ clipId, trigger, open, onOpenChange, isOwnContent = false, contentType = 'clip' }: ClipShareDialogProps) {
  const label = contentType === 'reel' ? 'reel' : 'clip';
  const [internalOpen, setInternalOpen] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const { toast } = useToast();

  const isOpen = open !== undefined ? open : internalOpen;
  const setIsOpen = onOpenChange || setInternalOpen;

  const { data: shareData, isLoading, error, refetch } = useQuery<ShareData>({
    queryKey: [`/api/clips/${clipId}/share`],
    queryFn: async () => {
      const res = await fetch(`/api/clips/${clipId}/share`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch share data");
      return res.json();
    },
    enabled: isOpen,
    retry: 2,
    retryDelay: 1000,
  });

  const trackShare = async () => {
    try {
      await fetch(`/api/clips/${clipId}/track-share`, { method: "POST", credentials: "include" });
    } catch (_) {}
  };

  const handleCopyLink = async () => {
    if (!shareData?.clipUrl) return;

    try {
      await navigator.clipboard.writeText(shareData.clipUrl);
      setCopySuccess(true);
      trackShare();
      toast({
        title: "Link Copied!",
        description: "The clip link has been copied to your clipboard.",
      });

      // Reset copy success state after 2 seconds
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error("Failed to copy link:", error);
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
          title: shareData.title || `Check out this gaming ${label}!`,
          text: shareData.description || 'Amazing gaming content from Gamefolio',
          url: shareData.clipUrl
        });
        trackShare();
        toast({
          title: "Shared successfully",
          description: "Content shared using your device's share menu.",
        });
      } catch (error) {
        if (error.name !== 'AbortError') {
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
      description: isOwnContent ? `🎮 Sharing your gaming ${label} from your Gamefolio! Your followers will see your epic gameplay and can visit your profile to see more content.` : `🎮 Sharing this gaming ${label}! Check out this epic gameplay on Gamefolio.`,
      duration: 4000,
    });
  };

  const handleRetry = () => {
    refetch();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
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
      <DialogContent className="sm:max-w-2xl max-w-[85vw] max-h-[85vh] bg-gray-900 border-2 border-gray-700 text-white overflow-hidden flex flex-col fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" aria-describedby="clip-share-description">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Share2 className="w-5 h-5 text-white" />
            {isOwnContent ? `Share your ${label}` : `Share ${label}`}
          </DialogTitle>
        </DialogHeader>

        <div id="clip-share-description" className="sr-only">
          Share your gaming {label} with friends through social media, copy the link, or download a QR code
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
          <div className="flex-1 overflow-y-auto space-y-4 sm:space-y-6 px-2 pb-4 [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none' }}>
            {/* Clip Thumbnail - Responsive sizing */}
            <div className="flex justify-center">
              <div className={`relative bg-gray-800 rounded-lg overflow-hidden border border-gray-600 ${
                (contentType === 'reel' || shareData.videoType === 'reel')
                  ? 'w-36 sm:w-44 aspect-[9/16]'
                  : 'w-full max-w-sm sm:max-w-md h-48 sm:h-56'
              }`}>
                <ClipThumbnail thumbnailUrl={shareData.thumbnailUrl} videoUrl={shareData.videoUrl} />
                <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-full flex items-center justify-center">
                    <div className="w-0 h-0 border-l-[6px] sm:border-l-[8px] border-l-gray-900 border-y-[4px] sm:border-y-[6px] border-y-transparent ml-0.5"></div>
                  </div>
                </div>
              </div>
            </div>
            {/* Share Link Section */}
            <div className="space-y-2">
              <h4 className="font-medium text-white">Share Link</h4>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <Input
                  value={shareData.clipUrl}
                  readOnly
                  className="flex-1 text-sm bg-gray-800 border-gray-600 text-white"
                  aria-label="Shareable clip URL"
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyLink}
                    className={`flex-1 sm:flex-none px-3 sm:px-4 transition-colors ${
                      copySuccess ? 'text-black bg-[#4ade80] border-[#4ade80]' : 'text-[#4ade80] border-[#4ade80]/50 bg-transparent hover:bg-[#4ade80] hover:text-black'
                    }`}
                    aria-label="Copy clip URL to clipboard"
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    {copySuccess ? 'Copied!' : 'Copy'}
                  </Button>
                  {/* Native Share API for mobile devices */}
                  {typeof navigator !== 'undefined' && navigator.share && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNativeShare}
                      className="flex-1 sm:flex-none px-3 sm:px-4 bg-[#4ade80] text-black hover:bg-[#22c55e] border-[#4ade80]"
                      aria-label="Share using device's native share menu"
                    >
                      <Share2 className="h-4 w-4 mr-1" />
                      Share
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Social Media Platforms Grid */}
            <div className="space-y-3">
              <h4 className="font-medium text-white">Share on social media</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                {SOCIAL_PLATFORMS.map((platform) => {
                  const Icon = platform.icon;
                  const shareUrl = shareData.socialMediaLinks?.[platform.key as keyof typeof shareData.socialMediaLinks];

                  return (
                    <Button
                      key={platform.key}
                      variant="outline"
                      size="sm"
                      onClick={() => shareUrl && handleSocialShare(platform.name, shareUrl)}
                      className={`flex flex-col items-center gap-1 p-2 sm:p-3 h-auto bg-gray-800 hover:bg-gray-700 transition-colors border border-gray-600 ${platform.color} ${
                        !shareUrl ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                      disabled={!shareUrl}
                      aria-label={`Share on ${platform.name}`}
                    >
                      <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
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