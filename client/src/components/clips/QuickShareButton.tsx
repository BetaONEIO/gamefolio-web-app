import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import ShareLaunchIcon from "@/components/ui/ShareIcon";
import { openShareWindow, nativeShare, isNative } from "@/lib/platform";
import { 
  FaFacebookF, 
  FaReddit, 
  FaLinkedinIn, 
  FaWhatsapp, 
  FaTelegram,
  FaLink,
  FaEllipsisH
} from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface QuickShareButtonProps {
  clipId: number;
  clipTitle: string;
  size?: 'sm' | 'default' | 'lg' | 'icon';
  variant?: 'ghost' | 'default' | 'outline';
}

const QuickShareButton: React.FC<QuickShareButtonProps> = ({ 
  clipId, 
  clipTitle, 
  size = 'default',
  variant = 'outline'
}) => {
  const [showPopover, setShowPopover] = useState(false);
  const { toast } = useToast();

  // Resolve the canonical /@username/clip/<shareCode> URL from the server rather
  // than exposing the internal numeric id (/clips/123). Fetched lazily the first
  // time the popover opens — this button renders once per clip in a list, so
  // fetching on mount would fire a request for every clip on screen.
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const resolvePromiseRef = useRef<Promise<void> | null>(null);

  const resolveShareUrl = useCallback(() => {
    if (shareUrl) return resolvePromiseRef.current ?? Promise.resolve();
    if (!resolvePromiseRef.current) {
      resolvePromiseRef.current = (async () => {
        try {
          const res = await fetch(`/api/clips/${clipId}/share`);
          if (res.ok) {
            const data = await res.json();
            const url = data.shareUrl || data.clipUrl;
            if (url) {
              setShareUrl(url);
              return;
            }
          }
        } catch (error) {
          console.error('Error resolving share URL:', error);
        }
        // Last-resort fallback if the share endpoint is unavailable.
        resolvePromiseRef.current = null; // allow a retry on next open
      })();
    }
    return resolvePromiseRef.current;
  }, [clipId, shareUrl]);

  // Prefetch the canonical URL as soon as the popover opens so the share
  // actions are ready by the time the user clicks one.
  useEffect(() => {
    if (showPopover) void resolveShareUrl();
  }, [showPopover, resolveShareUrl]);

  // Generate share text
  const shareText = `Check out this awesome gaming clip: ${clipTitle}`;
  const encodedShareText = encodeURIComponent(shareText);
  const encodedShareUrl = encodeURIComponent(shareUrl ?? '');
  
  // Create social media share URLs
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodedShareText}&url=${encodedShareUrl}`;
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedShareUrl}`;
  const redditUrl = `https://www.reddit.com/submit?url=${encodedShareUrl}&title=${encodedShareText}`;
  const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedShareUrl}`;
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodedShareText}%20${encodedShareUrl}`;
  const telegramUrl = `https://t.me/share/url?url=${encodedShareUrl}&text=${encodedShareText}`;
  
  // Define sharing platforms
  const platforms = [
    { name: 'Copy Link', icon: <FaLink className="h-4 w-4" />, color: 'bg-gray-600', action: () => {
      if (!shareUrl) return;
      navigator.clipboard.writeText(shareUrl);
      toast({
        title: "Link copied!",
        description: "The link has been copied to your clipboard.",
        duration: 3000,
      });
      setShowPopover(false);
    }},
    { name: 'X', icon: <FaXTwitter className="h-4 w-4" />, color: 'bg-black dark:bg-white', url: twitterUrl },
    { name: 'Facebook', icon: <FaFacebookF className="h-4 w-4" />, color: 'bg-[#4267B2]', url: facebookUrl },
    { name: 'Reddit', icon: <FaReddit className="h-4 w-4" />, color: 'bg-[#FF4500]', url: redditUrl },
    { name: 'LinkedIn', icon: <FaLinkedinIn className="h-4 w-4" />, color: 'bg-[#0A66C2]', url: linkedinUrl },
    { name: 'WhatsApp', icon: <FaWhatsapp className="h-4 w-4" />, color: 'bg-[#25D366]', url: whatsappUrl },
    { name: 'Telegram', icon: <FaTelegram className="h-4 w-4" />, color: 'bg-[#0088cc]', url: telegramUrl },
    { name: 'More', icon: <FaEllipsisH className="h-3 w-3" />, color: 'bg-gray-500', isMore: true },
  ];
  
  // Handle share click to open in new window
  const handleShareClick = (platform: typeof platforms[0], e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (platform.action) {
      platform.action();
      return;
    }
    
    if (platform.isMore) {
      // Keep the popover open if clicking "More"
      return;
    }
    
    if (platform.url) {
      void (async () => {
        if (!shareUrl) return;
        if (isNative) {
          const handled = await nativeShare({
            title: 'Shared from Gamefolio',
            url: shareUrl,
            dialogTitle: `Share to ${platform.name}`,
          });
          if (handled) {
            setShowPopover(false);
            return;
          }
        }
        await openShareWindow(platform.url!);
        setShowPopover(false);
      })();
    }
  };
  
  return (
    <Popover open={showPopover} onOpenChange={setShowPopover}>
      <PopoverTrigger asChild>
        <Button 
          variant={variant} 
          size={size} 
          className="flex items-center gap-1"
          onClick={(e) => {
            e.stopPropagation();
            setShowPopover(true);
          }}
        >
          <ShareLaunchIcon size={size === 'lg' ? 20 : 16} />
          {size !== 'sm' && size !== 'icon' && <span>Share</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" align="center">
        {!shareUrl ? (
          <div className="flex items-center justify-center px-4 py-2">
            <div
              className="h-4 w-4 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: "#B7FF1A", borderTopColor: "transparent" }}
            />
          </div>
        ) : (
        <div className="flex items-center gap-1">
          {platforms.map((platform, index) => (
            <button
              key={index}
              className={cn(
                "flex items-center justify-center rounded-full p-2 text-white transition-transform hover:scale-110",
                platform.color
              )}
              onClick={(e) => handleShareClick(platform, e)}
              title={platform.name}
            >
              {platform.icon}
            </button>
          ))}
        </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default QuickShareButton;