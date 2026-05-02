import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSignedUrl } from "@/hooks/use-signed-url";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { openExternal, nativeShare, isNative } from "@/lib/platform";
import {
  Share2,
  Copy,
  RefreshCw,
  X,
  AlertCircle,
} from "lucide-react";
import { FaFacebook, FaReddit, FaLinkedin, FaWhatsapp, FaTelegram, FaDiscord, FaEnvelope } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";

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
  { name: "X", icon: FaXTwitter, key: "twitter" },
  { name: "Facebook", icon: FaFacebook, key: "facebook" },
  { name: "LinkedIn", icon: FaLinkedin, key: "linkedin" },
  { name: "WhatsApp", icon: FaWhatsapp, key: "whatsapp" },
  { name: "Telegram", icon: FaTelegram, key: "telegram" },
  { name: "Reddit", icon: FaReddit, key: "reddit" },
  { name: "Discord", icon: FaDiscord, key: "discord" },
  { name: "Email", icon: FaEnvelope, key: "email" },
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

  const handleSocialShare = async (platform: string, url: string) => {
    if (!url) return;
    if (isNative && shareData?.clipUrl) {
      const handled = await nativeShare({
        title: shareData.title || `Gamefolio ${label}`,
        text: shareData.description || undefined,
        url: shareData.clipUrl,
        dialogTitle: `Share to ${platform}`,
      });
      if (handled) {
        trackShare();
        return;
      }
    }
    void openExternal(url);
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
      <DialogContent
        className="p-0 border-[#1e293b] bg-[#0f172a] w-[calc(100vw-2rem)] max-w-[384px] rounded-3xl overflow-hidden shadow-2xl gap-0 [&>button]:hidden max-h-[90vh]"
        aria-describedby="clip-share-description"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-4 sm:py-5 border-b border-[#1e293b]/50">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Share2 className="w-5 h-5 sm:w-6 sm:h-6 text-[#B7FF1A] shrink-0" />
            <span className="text-[#f8fafc] text-base sm:text-xl font-bold truncate">
              {isOwnContent ? `Share your ${label}` : `Share ${label}`}
            </span>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-white/5 transition-colors shrink-0 ml-2"
            aria-label="Close share dialog"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6 text-[#94a3b8]" />
          </button>
        </div>

        <div id="clip-share-description" className="sr-only">
          Share your gaming {label} with friends through social media or copy the link
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
              {/* Clip Thumbnail Preview */}
              <div className="flex justify-center">
                <div
                  className={`relative bg-[#1e293b] rounded-2xl overflow-hidden border border-[#1e293b] ${
                    contentType === 'reel' || shareData.videoType === 'reel'
                      ? 'w-40 aspect-[9/16]'
                      : 'w-full aspect-video'
                  }`}
                >
                  <ClipThumbnail thumbnailUrl={shareData.thumbnailUrl} videoUrl={shareData.videoUrl} />
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center pointer-events-none">
                    <div className="w-10 h-10 bg-white/90 rounded-full flex items-center justify-center">
                      <div className="w-0 h-0 border-l-[7px] border-l-[#0f172a] border-y-[5px] border-y-transparent ml-0.5" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Share Link Section */}
              <div className="flex flex-col gap-2.5">
                <span className="text-[#94a3b8] text-sm">{`${label.charAt(0).toUpperCase()}${label.slice(1)} Link`}</span>
                <div className="flex gap-2">
                  <div className="flex-1 min-w-0 bg-[#1e293b] border border-[#1e293b] rounded-2xl px-3 sm:px-4 py-3 overflow-hidden">
                    <span className="text-[#94a3b8] text-xs sm:text-sm font-mono truncate block">
                      {shareData.clipUrl}
                    </span>
                  </div>
                  <button
                    onClick={handleCopyLink}
                    className="flex items-center gap-1.5 sm:gap-2 bg-[#B7FF1A] hover:bg-[#A2F000] text-[#071013] rounded-2xl px-3 sm:px-4 py-3 transition-colors shrink-0 font-medium"
                    aria-label="Copy clip URL to clipboard"
                  >
                    <Copy className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="text-sm sm:text-base whitespace-nowrap">{copySuccess ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>
                {/* Native Share API — full width pill for mobile only */}
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
                      onClick={() => shareUrl && handleSocialShare(platform.name, shareUrl)}
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