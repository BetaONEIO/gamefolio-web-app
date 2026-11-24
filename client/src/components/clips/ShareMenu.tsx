import React, { useEffect, useState } from 'react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Copy, Facebook, Linkedin, Mail } from "lucide-react";
import ShareLaunchIcon from "@/components/ui/ShareIcon";
import { FaReddit, FaWhatsapp, FaTelegram, FaPinterest, FaYoutube } from "react-icons/fa";
import { FaXTwitter, FaInstagram, FaTiktok, FaSnapchat, FaBluesky, FaThreads } from "react-icons/fa6";
import { useToast } from "@/hooks/use-toast";
import { nativeShare, openShareWindow, publicUrl } from '@/lib/platform';

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
        // Absolute public URL — window.location.origin is capacitor://localhost on native.
        const fallbackUrl = publicUrl(`/clips/${clipId}`);
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
            instagram: fallbackUrl,
            tiktok: fallbackUrl,
            bluesky: `https://bsky.app/intent/compose?text=${encodeURIComponent(fallbackUrl)}`,
            snapchat: fallbackUrl,
            threads: fallbackUrl,
            pinterest: `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(fallbackUrl)}`,
            youtube: fallbackUrl,
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
  const blueskyUrl = socialMediaLinks.bluesky;
  const mailUrl = socialMediaLinks.email;
  // Handle copy link to clipboard
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({
        title: "Link copied!",
        description: "The link has been copied to your clipboard.",
        duration: 3000,
      });
    } catch {
      toast({ title: 'Copy failed', description: 'Unable to copy the clip link.', variant: 'destructive' });
    }
  };

  // Handle copy-only platforms (Instagram, TikTok) — no web share intent URL available
  const handleCopyOnlyShare = async (platformName: string) => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({
        title: `Link copied for ${platformName}!`,
        description: `Paste this link in ${platformName} to share the clip.`,
        duration: 3000,
      });
    } catch {
      toast({ title: 'Copy failed', description: 'Unable to copy the clip link.', variant: 'destructive' });
    }
  };

  const handleGenericShare = async () => {
    const handled = await nativeShare({
      title: clipTitle,
      url: shareUrl,
      dialogTitle: 'Share clip',
    });
    if (!handled) await handleCopyLink();
  };

  // Explicit targets always open their own share composer.
  const handleShareClick = async (url: string, platformName: string) => {
    try {
      await openShareWindow(url);
    } catch {
      await handleCopyOnlyShare(platformName);
    }
  };
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {variant === 'icon-only' ? (
          <button className="focus:outline-none">
            <ShareLaunchIcon size={24} className="text-muted-foreground hover:text-foreground transition-colors" />
          </button>
        ) : (
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-muted-foreground flex items-center gap-1"
          >
            <ShareLaunchIcon size={20} />
            <span>Share</span>
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={handleCopyLink} className="cursor-pointer">
          <Copy className="mr-2 h-4 w-4" />
          <span>Copy link</span>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={handleGenericShare} className="cursor-pointer">
          <ShareLaunchIcon size={16} className="mr-2" />
          <span>Share via…</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          onClick={() => handleShareClick(twitterUrl, 'X')}
          className="cursor-pointer"
        >
          <FaXTwitter className="mr-2 h-4 w-4" />
          <span>X</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          onClick={() => handleShareClick(facebookUrl, 'Facebook')}
          className="cursor-pointer"
        >
          <Facebook className="mr-2 h-4 w-4 text-[#4267B2]" />
          <span>Facebook</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          onClick={() => handleShareClick(redditUrl, 'Reddit')}
          className="cursor-pointer"
        >
          <FaReddit className="mr-2 h-4 w-4 text-[#FF4500]" />
          <span>Reddit</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          onClick={() => handleShareClick(linkedinUrl, 'LinkedIn')}
          className="cursor-pointer"
        >
          <Linkedin className="mr-2 h-4 w-4 text-[#0A66C2]" />
          <span>LinkedIn</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          onClick={() => handleShareClick(whatsappUrl, 'WhatsApp')}
          className="cursor-pointer"
        >
          <FaWhatsapp className="mr-2 h-4 w-4 text-[#25D366]" />
          <span>WhatsApp</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          onClick={() => handleShareClick(telegramUrl, 'Telegram')}
          className="cursor-pointer"
        >
          <FaTelegram className="mr-2 h-4 w-4 text-[#0088cc]" />
          <span>Telegram</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem
          onClick={() => handleCopyOnlyShare('Instagram')}
          className="cursor-pointer"
        >
          <FaInstagram className="mr-2 h-4 w-4 text-[#E1306C]" />
          <span>Instagram</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => handleCopyOnlyShare('TikTok')}
          className="cursor-pointer"
        >
          <FaTiktok className="mr-2 h-4 w-4" />
          <span>TikTok</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => handleShareClick(blueskyUrl, 'Bluesky')}
          className="cursor-pointer"
        >
          <FaBluesky className="mr-2 h-4 w-4 text-[#0085ff]" />
          <span>Bluesky</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => handleCopyOnlyShare('Snapchat')}
          className="cursor-pointer"
        >
          <FaSnapchat className="mr-2 h-4 w-4 text-[#FFFC00]" />
          <span>Snapchat</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => handleCopyOnlyShare('Threads')}
          className="cursor-pointer"
        >
          <FaThreads className="mr-2 h-4 w-4" />
          <span>Threads</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => handleShareClick(socialMediaLinks.pinterest, 'Pinterest')}
          className="cursor-pointer"
        >
          <FaPinterest className="mr-2 h-4 w-4 text-[#E60023]" />
          <span>Pinterest</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => handleCopyOnlyShare('YouTube')}
          className="cursor-pointer"
        >
          <FaYoutube className="mr-2 h-4 w-4 text-[#FF0000]" />
          <span>YouTube</span>
        </DropdownMenuItem>

        <DropdownMenuItem 
          onClick={() => handleShareClick(mailUrl, 'Email')}
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
