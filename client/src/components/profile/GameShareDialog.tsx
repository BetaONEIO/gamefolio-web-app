import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import ShareLaunchIcon from '@/components/ui/ShareIcon';
import { Copy, Gamepad2, X } from 'lucide-react';
import { FaFacebook, FaReddit, FaLinkedin, FaWhatsapp, FaTelegram, FaDiscord, FaEnvelope, FaPinterest, FaYoutube } from 'react-icons/fa';
import { FaXTwitter, FaInstagram, FaTiktok, FaSnapchat, FaBluesky, FaThreads } from 'react-icons/fa6';
import { isNative, nativeShare, openShareWindow } from '@/lib/platform';

interface GameShareDialogProps {
  gameName: string;
  gameIconUrl?: string | null;
  bannerUrl?: string | null;
  shareUrl: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const socialPlatforms = [
  { name: 'X', icon: FaXTwitter, key: 'twitter' },
  { name: 'Facebook', icon: FaFacebook, key: 'facebook' },
  { name: 'LinkedIn', icon: FaLinkedin, key: 'linkedin' },
  { name: 'WhatsApp', icon: FaWhatsapp, key: 'whatsapp' },
  { name: 'Telegram', icon: FaTelegram, key: 'telegram' },
  { name: 'Reddit', icon: FaReddit, key: 'reddit' },
  { name: 'Discord', icon: FaDiscord, key: 'discord' },
  { name: 'Instagram', icon: FaInstagram, key: 'instagram' },
  { name: 'TikTok', icon: FaTiktok, key: 'tiktok' },
  { name: 'Bluesky', icon: FaBluesky, key: 'bluesky' },
  { name: 'Snapchat', icon: FaSnapchat, key: 'snapchat' },
  { name: 'Threads', icon: FaThreads, key: 'threads' },
  { name: 'Pinterest', icon: FaPinterest, key: 'pinterest' },
  { name: 'YouTube', icon: FaYoutube, key: 'youtube' },
  { name: 'Email', icon: FaEnvelope, key: 'email' },
] as const;

function getSocialShareUrl(key: string, gameName: string, shareUrl: string): string {
  const message = `Check out ${gameName} on Gamefolio!`;
  const encodedMessage = encodeURIComponent(message);
  const encodedUrl = encodeURIComponent(shareUrl);

  switch (key) {
    case 'twitter':
      return `https://twitter.com/intent/tweet?text=${encodedMessage}&url=${encodedUrl}`;
    case 'facebook':
      return `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
    case 'linkedin':
      return `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
    case 'whatsapp':
      return `https://wa.me/?text=${encodeURIComponent(`${message} ${shareUrl}`)}`;
    case 'telegram':
      return `https://t.me/share/url?url=${encodedUrl}&text=${encodedMessage}`;
    case 'reddit':
      return `https://reddit.com/submit?url=${encodedUrl}&title=${encodedMessage}`;
    case 'bluesky':
      return `https://bsky.app/intent/compose?text=${encodeURIComponent(`${message} ${shareUrl}`)}`;
    case 'pinterest':
      return `https://pinterest.com/pin/create/button/?url=${encodedUrl}&description=${encodedMessage}`;
    case 'email':
      return `mailto:?subject=${encodedMessage}&body=${encodeURIComponent(`${message}\n\n${shareUrl}`)}`;
    default:
      return shareUrl;
  }
}

export function GameShareDialog({
  gameName,
  gameIconUrl,
  bannerUrl,
  shareUrl,
  open,
  onOpenChange,
}: GameShareDialogProps) {
  const [copied, setCopied] = useState(false);

  const copyLink = async (title: string, description: string) => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast({ title, description });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: 'Copy failed', description: 'Unable to copy the game link to your clipboard.', variant: 'destructive' });
    }
  };

  const handleCopyLink = () => copyLink('Link copied!', 'Game link has been copied to your clipboard.');

  const handleSocialShare = async (platformKey: string, platformName: string) => {
    if (isNative) {
      const handled = await nativeShare({
        title: gameName,
        url: shareUrl,
        dialogTitle: `Share ${gameName} to ${platformName}`,
      });
      if (handled) return;
    }

    const copyOnlyPlatforms = ['discord', 'instagram', 'tiktok', 'snapchat', 'threads', 'youtube'];
    if (copyOnlyPlatforms.includes(platformKey)) {
      await copyLink(`Link copied for ${platformName}!`, `Paste this link in ${platformName} to share ${gameName}.`);
      return;
    }

    void openShareWindow(getSocialShareUrl(platformKey, gameName, shareUrl));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 border-[#1B2A33] bg-[#0B1218] w-[calc(100vw-2rem)] max-w-[384px] rounded-3xl overflow-hidden shadow-2xl gap-0 [&>button]:hidden max-h-[90vh]">
        <div className="flex items-center justify-between px-4 sm:px-5 py-4 sm:py-5 border-b border-[#1B2A33]/50">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <ShareLaunchIcon size={20} className="text-[#B7FF1A] shrink-0" />
            <span className="text-[#F5F7F2] text-base sm:text-xl font-bold truncate">Share Game</span>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-white/5 transition-colors shrink-0 ml-2"
            aria-label="Close share dialog"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6 text-[#B8C0AE]" />
          </button>
        </div>

        <div className="p-4 sm:p-5 flex flex-col gap-5 sm:gap-6 overflow-y-auto">
          <div className="rounded-2xl overflow-hidden border border-[#B7FF1A]/20 bg-[#071013]">
            <div
              className="h-24 relative overflow-hidden bg-gradient-to-br from-[#26351a] via-[#101923] to-[#071013]"
              style={bannerUrl ? { backgroundImage: `url(${bannerUrl})`, backgroundPosition: 'center', backgroundSize: 'cover' } : undefined}
            >
              <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/20 to-[#071013]" />
            </div>
            <div className="relative px-4 pb-4">
              <div className="relative -mt-10 mb-3 h-20 w-20 overflow-hidden rounded-2xl border-2 border-[#B7FF1A]/50 bg-[#101923] shadow-xl">
                {gameIconUrl ? (
                  <img src={gameIconUrl} alt={`${gameName} icon`} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[#B7FF1A]">
                    <Gamepad2 size={30} />
                  </div>
                )}
              </div>
              <h2 className="truncate text-lg font-bold leading-7 text-[#F5F7F2]">{gameName}</h2>
              <p className="mt-0.5 text-sm text-[#B8C0AE]">Game profile on Gamefolio</p>
            </div>
          </div>

          <div className="flex flex-col gap-2.5">
            <span className="text-[#B8C0AE] text-sm">Gamefolio Link</span>
            <div className="flex gap-2">
              <div className="flex-1 min-w-0 bg-[#101923] border border-[#1B2A33] rounded-2xl px-3 sm:px-4 py-3 overflow-hidden">
                <span className="text-[#B8C0AE] text-xs sm:text-sm font-mono truncate block">{shareUrl}</span>
              </div>
              <Button
                onClick={handleCopyLink}
                className="flex items-center gap-1.5 sm:gap-2 bg-[#B7FF1A] hover:bg-[#A2F000] text-[#071013] rounded-2xl px-3 sm:px-4 py-3 h-auto shrink-0"
              >
                <Copy className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="text-sm sm:text-base whitespace-nowrap">{copied ? 'Copied!' : 'Copy Link'}</span>
              </Button>
            </div>
          </div>

          <div className="hidden sm:flex flex-col gap-3">
            <span className="text-[#B8C0AE] text-sm">Share on Social Media</span>
            <div className="flex flex-wrap gap-2 sm:gap-2.5">
              {socialPlatforms.map((platform) => {
                const IconComponent = platform.icon;
                return (
                  <button
                    key={platform.name}
                    onClick={() => handleSocialShare(platform.key, platform.name)}
                    className="w-14 h-14 rounded-full border-2 border-[#B7FF1A] bg-transparent hover:bg-[#B7FF1A]/10 text-[#F5F7F2] transition-colors flex items-center justify-center"
                    title={platform.name}
                    aria-label={`Share on ${platform.name}`}
                  >
                    <IconComponent className="w-6 h-6" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}