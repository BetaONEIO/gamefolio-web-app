import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSignedUrl } from "@/hooks/use-signed-url";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { openShareWindow, nativeShare, isNative } from "@/lib/platform";
import {
  Copy,
  RefreshCw,
  X,
  AlertCircle,
} from "lucide-react";
import ShareLaunchIcon from "@/components/ui/ShareIcon";
import { FaFacebook, FaReddit, FaWhatsapp, FaTelegram, FaEnvelope } from "react-icons/fa";
import { FaXTwitter, FaBluesky } from "react-icons/fa6";

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
    whatsapp: string;
    telegram: string;
    bluesky: string;
    email: string;
    [key: string]: string;
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
  { name: "WhatsApp", icon: FaWhatsapp, key: "whatsapp" },
  { name: "Telegram", icon: FaTelegram, key: "telegram" },
  { name: "Reddit", icon: FaReddit, key: "reddit" },
  { name: "Bluesky", icon: FaBluesky, key: "bluesky" },
  { name: "Email", icon: FaEnvelope, key: "email" },
];

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
          if (videoElement) videoElement.style.display = 'block';
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
      toast({ title: "Link Copied!", description: "The clip link has been copied to your clipboard." });
      setTimeout(() => setCopySuccess(false), 2000);
    } catch {
      toast({ title: "Copy Failed", description: "Unable to copy link to clipboard.", variant: "destructive" });
    }
  };

  const handleNativeShare = async () => {
    if (!shareData) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareData.title || `Check out this gaming ${label}!`,
          text: shareData.description || 'Amazing gaming content from Gamefolio',
          url: shareData.clipUrl,
        });
        trackShare();
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('Native share failed:', error);
        }
      }
    }
  };

  const handleSocialShare = async (platform: string, url: string, platformKey: string) => {
    if (!url) return;
    if (isNative && shareData?.clipUrl) {
      const handled = await nativeShare({
        title: shareData.title || `Gamefolio ${label}`,
        text: shareData.description || undefined,
        url: shareData.clipUrl,
        dialogTitle: `Share to ${platform}`,
      });
      if (handled) { trackShare(); return; }
    }
    void openShareWindow(url);
    trackShare();
    toast({
      title: `Sharing on ${platform}`,
      description: isOwnContent
        ? `🎮 Sharing your gaming ${label} from your Gamefolio!`
        : `🎮 Sharing this gaming ${label} on Gamefolio.`,
      duration: 3000,
    });
  };

  const hasNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      {!trigger && open === undefined && (
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <ShareLaunchIcon size={16} />
            Share
          </Button>
        </DialogTrigger>
      )}
      <DialogContent
        className="p-0 border-[#1B2A33] bg-[#0B1218] w-[calc(100vw-2rem)] max-w-[384px] rounded-3xl overflow-hidden shadow-2xl gap-0 [&>button]:hidden max-h-[90vh] flex flex-col"
        aria-describedby="clip-share-description"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#1B2A33]/50 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <ShareLaunchIcon size={18} className="text-[#B7FF1A] shrink-0" />
            <span className="text-[#F5F7F2] text-base font-bold truncate">
              {isOwnContent ? `Share your ${label}` : `Share ${label}`}
            </span>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-white/5 transition-colors shrink-0 ml-2"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-[#B8C0AE]" />
          </button>
        </div>

        <div id="clip-share-description" className="sr-only">
          Share your gaming {label} with friends through social media or copy the link
        </div>

        {/* Scrollable content */}
        <div className="flex flex-col gap-4 overflow-y-auto flex-1 min-h-0 p-4 pb-5">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-8 h-8 border-4 border-[#B7FF1A] border-t-transparent rounded-full" />
            </div>
          ) : error ? (
            <div className="py-2">
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Failed to load sharing options. Please try again.</AlertDescription>
              </Alert>
              <Button variant="outline" onClick={() => refetch()} className="w-full gap-2">
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
            </div>
          ) : shareData ? (
            <>
              {/* Thumbnail — smaller on mobile to keep modal compact */}
              <div className="flex justify-center">
                <div
                  className={`relative bg-[#101923] rounded-xl overflow-hidden border border-[#1B2A33]/80 ${
                    contentType === 'reel' || shareData.videoType === 'reel'
                      ? 'w-28 sm:w-36 aspect-[9/16]'
                      : 'w-full max-h-[140px] sm:max-h-[180px] aspect-video'
                  }`}
                >
                  <ClipThumbnail thumbnailUrl={shareData.thumbnailUrl} videoUrl={shareData.videoUrl} />
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center pointer-events-none">
                    <div className="w-9 h-9 bg-white/90 rounded-full flex items-center justify-center">
                      <div className="w-0 h-0 border-l-[6px] border-l-[#0B1218] border-y-[4px] border-y-transparent ml-0.5" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Copy link row */}
              <div className="flex flex-col gap-2">
                <span className="text-[#64748b] text-xs font-medium uppercase tracking-wide">
                  {`${label.charAt(0).toUpperCase()}${label.slice(1)} Link`}
                </span>
                <div className="flex gap-2">
                  <div className="flex-1 min-w-0 bg-[#1B2A33] border border-[#2d3f55] rounded-xl px-3 py-2.5 overflow-hidden">
                    <span className="text-[#B8C0AE] text-xs font-mono truncate block">
                      {shareData.clipUrl}
                    </span>
                  </div>
                  <button
                    onClick={handleCopyLink}
                    className="flex items-center gap-1.5 bg-[#B7FF1A] hover:bg-[#A2F000] active:scale-95 text-[#071013] rounded-xl px-3 py-2.5 transition-all shrink-0 font-semibold text-sm"
                    aria-label="Copy clip URL"
                  >
                    <Copy className="w-4 h-4" />
                    {copySuccess ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* Native share — prominent on mobile */}
              {hasNativeShare && (
                <button
                  onClick={handleNativeShare}
                  className="flex items-center justify-center gap-2 bg-[#B7FF1A]/10 border border-[#B7FF1A]/30 hover:bg-[#B7FF1A]/20 active:scale-[0.98] text-[#B7FF1A] rounded-xl py-3 transition-all font-medium text-sm"
                  aria-label="Share using device share menu"
                >
                  <ShareLaunchIcon size={16} />
                  Share via…
                </button>
              )}

              {/* Social platforms */}
              <div className="flex flex-col gap-2">
                <span className="text-[#64748b] text-xs font-medium uppercase tracking-wide">Share to</span>
                <div className="grid grid-cols-7 gap-1">
                  {SOCIAL_PLATFORMS.map((platform) => {
                    const Icon = platform.icon;
                    const shareUrl = shareData.socialMediaLinks?.[platform.key];
                    return (
                      <button
                        key={platform.key}
                        onClick={() => shareUrl && handleSocialShare(platform.name, shareUrl, platform.key)}
                        disabled={!shareUrl}
                        className="flex flex-col items-center gap-1 py-2 rounded-xl hover:bg-white/5 active:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        title={platform.name}
                        aria-label={`Share on ${platform.name}`}
                      >
                        <div className="w-9 h-9 rounded-full border border-[#B7FF1A]/30 bg-[#1B2A33] flex items-center justify-center">
                          <Icon className="w-4 h-4 text-[#F5F7F2]" />
                        </div>
                        <span className="text-[#64748b] text-[9px] leading-tight text-center">{platform.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-10">
              <AlertCircle className="w-10 h-10 text-[#B8C0AE] mx-auto mb-3" />
              <p className="text-[#B8C0AE]">Unable to generate sharing options</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
