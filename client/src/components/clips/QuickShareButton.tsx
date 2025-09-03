import React, { useState } from 'react';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Share2 } from "lucide-react";
import { 
  FaTwitter, 
  FaFacebookF, 
  FaReddit, 
  FaLinkedinIn, 
  FaWhatsapp, 
  FaTelegram,
  FaLink,
  FaEllipsisH
} from "react-icons/fa";
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
  
  // Generate share URL for the clip
  const shareUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/clips/${clipId}`
    : `/clips/${clipId}`;
  
  // Generate share text
  const shareText = `Check out this awesome gaming clip: ${clipTitle}`;
  const encodedShareText = encodeURIComponent(shareText);
  const encodedShareUrl = encodeURIComponent(shareUrl);
  
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
      navigator.clipboard.writeText(shareUrl);
      toast({
        title: "Link copied!",
        description: "The link has been copied to your clipboard.",
        duration: 3000,
      });
      setShowPopover(false);
    }},
    { name: 'Twitter', icon: <FaTwitter className="h-4 w-4" />, color: 'bg-[#1DA1F2]', url: twitterUrl },
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
      window.open(platform.url, '_blank', 'noopener,noreferrer,width=600,height=500');
      setShowPopover(false);
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
          <Share2 className={cn("h-4 w-4", size === 'lg' && "h-5 w-5")} />
          {size !== 'sm' && size !== 'icon' && <span>Share</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" align="center">
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
      </PopoverContent>
    </Popover>
  );
};

export default QuickShareButton;