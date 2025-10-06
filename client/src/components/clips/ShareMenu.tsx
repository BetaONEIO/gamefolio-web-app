import React, { useEffect, useState } from 'react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Share2, Copy, Facebook, Linkedin, Mail } from "lucide-react";
import { FaReddit, FaWhatsapp, FaTelegram } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { useToast } from "@/hooks/use-toast";

interface ShareMenuProps {
  clipId: number;
  clipTitle: string;
  variant?: 'default' | 'icon-only';
}

const ShareMenu: React.FC<ShareMenuProps> = ({ 
  clipId, 
  clipTitle, 
  variant = 'default' 
}) => {
  const { toast } = useToast();
  const [shareData, setShareData] = useState<{
    shareUrl: string;
    socialMediaLinks: any;
  } | null>(null);

  // Fetch share data from backend
  useEffect(() => {
    const fetchShareData = async () => {
      try {
        const response = await fetch(`/api/clips/${clipId}/share`);
        if (response.ok) {
          const data = await response.json();
          setShareData({
            shareUrl: data.shareUrl || data.clipUrl, // Prefer shareUrl, fallback to clipUrl
            socialMediaLinks: data.socialMediaLinks
          });
        }
      } catch (error) {
        console.error('Error fetching share data:', error);
        // Fallback to basic URL
        const fallbackUrl = `${window.location.origin}/clips/${clipId}`;
        setShareData({
          shareUrl: fallbackUrl,
          socialMediaLinks: {
            twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(fallbackUrl)}`,
            facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(fallbackUrl)}`,
            reddit: `https://www.reddit.com/submit?url=${encodeURIComponent(fallbackUrl)}`,
            linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(fallbackUrl)}`,
            whatsapp: `https://wa.me/?text=${encodeURIComponent(fallbackUrl)}`,
            telegram: `https://t.me/share/url?url=${encodeURIComponent(fallbackUrl)}`,
            discord: fallbackUrl,
            email: `mailto:?body=${encodeURIComponent(fallbackUrl)}`
          }
        });
      }
    };

    fetchShareData();
  }, [clipId]);
  
  if (!shareData) {
    return null; // Loading state
  }

  const { shareUrl, socialMediaLinks } = shareData;
  const shareText = `Check out this awesome gaming clip: ${clipTitle}`;
  const encodedShareText = encodeURIComponent(shareText);
  const encodedShareUrl = encodeURIComponent(shareUrl);
  
  // Use social media URLs from backend
  const twitterUrl = socialMediaLinks.twitter;
  const facebookUrl = socialMediaLinks.facebook;
  const redditUrl = socialMediaLinks.reddit;
  const linkedinUrl = socialMediaLinks.linkedin;
  const whatsappUrl = socialMediaLinks.whatsapp;
  const telegramUrl = socialMediaLinks.telegram;
  const mailUrl = socialMediaLinks.email;
  
  // Handle copy link to clipboard
  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    toast({
      title: "Link copied!",
      description: "The link has been copied to your clipboard.",
      duration: 3000,
    });
  };
  
  // Handle share click to open in new window
  const handleShareClick = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer,width=600,height=500');
  };
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {variant === 'icon-only' ? (
          <button className="focus:outline-none">
            <Share2 className="h-6 w-6 text-muted-foreground hover:text-foreground transition-colors" />
          </button>
        ) : (
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-muted-foreground flex items-center gap-1"
          >
            <Share2 className="h-5 w-5" />
            <span>Share</span>
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={handleCopyLink} className="cursor-pointer">
          <Copy className="mr-2 h-4 w-4" />
          <span>Copy link</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          onClick={() => handleShareClick(twitterUrl)} 
          className="cursor-pointer"
        >
          <FaXTwitter className="mr-2 h-4 w-4" />
          <span>X</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          onClick={() => handleShareClick(facebookUrl)} 
          className="cursor-pointer"
        >
          <Facebook className="mr-2 h-4 w-4 text-[#4267B2]" />
          <span>Facebook</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          onClick={() => handleShareClick(redditUrl)} 
          className="cursor-pointer"
        >
          <FaReddit className="mr-2 h-4 w-4 text-[#FF4500]" />
          <span>Reddit</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          onClick={() => handleShareClick(linkedinUrl)} 
          className="cursor-pointer"
        >
          <Linkedin className="mr-2 h-4 w-4 text-[#0A66C2]" />
          <span>LinkedIn</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          onClick={() => handleShareClick(whatsappUrl)} 
          className="cursor-pointer"
        >
          <FaWhatsapp className="mr-2 h-4 w-4 text-[#25D366]" />
          <span>WhatsApp</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          onClick={() => handleShareClick(telegramUrl)} 
          className="cursor-pointer"
        >
          <FaTelegram className="mr-2 h-4 w-4 text-[#0088cc]" />
          <span>Telegram</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          onClick={() => handleShareClick(mailUrl)} 
          className="cursor-pointer"
        >
          <Mail className="mr-2 h-4 w-4" />
          <span>Email</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ShareMenu;