import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Share2, Copy, ExternalLink } from 'lucide-react';
import { FaTwitter, FaFacebook, FaReddit, FaLinkedin, FaWhatsapp, FaTelegram, FaDiscord, FaEnvelope } from 'react-icons/fa';
import { toast } from '@/hooks/use-toast';

interface GamefolioShareData {
  profileUrl: string;
  username: string;
  displayName?: string;
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
}

interface GamefolioShareDialogProps {
  username: string;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  userProfile?: {
    displayName?: string | null;
    bio?: string | null;
    avatarUrl?: string | null;
    bannerUrl?: string | null;
  };
  userStats?: {
    clips?: number;
    followers?: number;
    following?: number;
  };
}

export function GamefolioShareDialog({ 
  username, 
  trigger, 
  open: controlledOpen, 
  onOpenChange: controlledOnOpenChange,
  userProfile,
  userStats
}: GamefolioShareDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [shareData, setShareData] = useState<GamefolioShareData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Use controlled state if provided, otherwise use internal state
  const open = controlledOpen !== undefined ? controlledOpen : isOpen;
  const setOpen = controlledOnOpenChange || setIsOpen;

  useEffect(() => {
    if (open && !shareData) {
      fetchShareData();
    }
  }, [open, username]);

  const fetchShareData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/users/${username}/share`);
      if (response.ok) {
        const data = await response.json();
        setShareData(data);
      } else {
        // Generate basic share data if endpoint doesn't exist
        const baseUrl = window.location.origin;
        const profileUrl = `${baseUrl}/profile/${username}`;
        
        setShareData({
          profileUrl,
          username,
          qrCode: `${baseUrl}/api/qr?url=${encodeURIComponent(profileUrl)}`,
          socialMediaLinks: {
            twitter: `https://twitter.com/intent/tweet?text=Check%20out%20my%20gaming%20portfolio!&url=${encodeURIComponent(profileUrl)}`,
            facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(profileUrl)}`,
            reddit: `https://reddit.com/submit?url=${encodeURIComponent(profileUrl)}&title=Check%20out%20my%20gaming%20portfolio!`,
            linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(profileUrl)}`,
            whatsapp: `https://wa.me/?text=Check%20out%20my%20gaming%20portfolio!%20${encodeURIComponent(profileUrl)}`,
            telegram: `https://t.me/share/url?url=${encodeURIComponent(profileUrl)}&text=Check%20out%20my%20gaming%20portfolio!`,
            discord: `https://discord.com/channels/@me`,
            email: `mailto:?subject=Check%20out%20my%20gaming%20portfolio!&body=Hey!%20Check%20out%20my%20gaming%20portfolio:%20${encodeURIComponent(profileUrl)}`
          }
        });
      }
    } catch (error) {
      console.error('Error fetching share data:', error);
      // Fallback to basic share data
      const baseUrl = window.location.origin;
      const profileUrl = `${baseUrl}/profile/${username}`;
      
      setShareData({
        profileUrl,
        username,
        qrCode: `${baseUrl}/api/qr?url=${encodeURIComponent(profileUrl)}`,
        socialMediaLinks: {
          twitter: `https://twitter.com/intent/tweet?text=Check%20out%20my%20gaming%20portfolio!&url=${encodeURIComponent(profileUrl)}`,
          facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(profileUrl)}`,
          reddit: `https://reddit.com/submit?url=${encodeURIComponent(profileUrl)}&title=Check%20out%20my%20gaming%20portfolio!`,
          linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(profileUrl)}`,
          whatsapp: `https://wa.me/?text=Check%20out%20my%20gaming%20portfolio!%20${encodeURIComponent(profileUrl)}`,
          telegram: `https://t.me/share/url?url=${encodeURIComponent(profileUrl)}&text=Check%20out%20my%20gaming%20portfolio!`,
          discord: `https://discord.com/channels/@me`,
          email: `mailto:?subject=Check%20out%20my%20gaming%20portfolio!&body=Hey!%20Check%20out%20my%20gaming%20portfolio:%20${encodeURIComponent(profileUrl)}`
        }
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (!shareData) return;
    
    try {
      await navigator.clipboard.writeText(shareData.profileUrl);
      toast({
        title: "Link copied!",
        description: "Profile link has been copied to your clipboard.",
      });
    } catch (error) {
      console.error('Failed to copy link:', error);
      toast({
        title: "Copy Failed",
        description: "Unable to copy link to clipboard.",
        variant: "destructive",
      });
    }
  };

  const handleSocialShare = (platform: string, url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer,width=600,height=500');
  };

  // Social media platforms configuration
  const socialPlatforms = [
    { name: 'Twitter', icon: FaTwitter, color: 'bg-blue-500 hover:bg-blue-600', key: 'twitter' },
    { name: 'Facebook', icon: FaFacebook, color: 'bg-blue-600 hover:bg-blue-700', key: 'facebook' },
    { name: 'LinkedIn', icon: FaLinkedin, color: 'bg-blue-700 hover:bg-blue-800', key: 'linkedin' },
    { name: 'WhatsApp', icon: FaWhatsapp, color: 'bg-green-500 hover:bg-green-600', key: 'whatsapp' },
    { name: 'Telegram', icon: FaTelegram, color: 'bg-blue-400 hover:bg-blue-500', key: 'telegram' },
    { name: 'Reddit', icon: FaReddit, color: 'bg-orange-500 hover:bg-orange-600', key: 'reddit' },
    { name: 'Discord', icon: FaDiscord, color: 'bg-indigo-500 hover:bg-indigo-600', key: 'discord' },
    { name: 'Email', icon: FaEnvelope, color: 'bg-gray-500 hover:bg-gray-600', key: 'email' },
  ];

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
            Share Gamefolio
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Share2 className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            Share Gamefolio Profile
          </DialogTitle>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : shareData ? (
          <div className="space-y-4 sm:space-y-6">
            {/* Gamefolio Profile Preview - Smaller on Mobile */}
            <div className="relative rounded-xl overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 shadow-2xl mx-auto max-w-full sm:max-w-2xl">
              {/* Banner Background */}
              <div 
                className="h-20 sm:h-32 bg-cover bg-center relative"
                style={{
                  backgroundImage: userProfile?.bannerUrl 
                    ? `url(${userProfile.bannerUrl})` 
                    : `linear-gradient(135deg, #0f172a, #1e293b, #0f172a)`,
                }}
              >
                {/* Overlay for better contrast */}
                <div className="absolute inset-0 bg-black/40"></div>
              </div>
              
              {/* Profile Section */}
              <div className="relative px-3 sm:px-6 pb-4 sm:pb-6 -mt-8 sm:-mt-12">
                <div className="flex items-start gap-2 sm:gap-4">
                  {/* Profile Picture with Purple Border */}
                  <div className="relative">
                    {userProfile?.avatarUrl ? (
                      <img 
                        src={userProfile.avatarUrl} 
                        alt={`${username}'s avatar`}
                        className="w-16 h-16 sm:w-24 sm:h-24 rounded-full border-2 sm:border-4 border-purple-500 shadow-lg bg-slate-800 object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-full border-2 sm:border-4 border-purple-500 shadow-lg bg-slate-800 flex items-center justify-center">
                        <span className="text-lg sm:text-2xl font-bold text-purple-400">{username[0]?.toUpperCase()}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Profile Info */}
                  <div className="flex-1 pt-2 sm:pt-4">
                    <div className="flex items-center gap-1 sm:gap-2 mb-1">
                      <h3 className="text-sm sm:text-xl font-bold text-white truncate">
                        {userProfile?.displayName || username}
                      </h3>
                      <span className="text-xs sm:text-sm text-gray-400 truncate">@{username}</span>
                    </div>
                    
                    {userProfile?.bio && (
                      <p className="text-gray-300 text-xs sm:text-sm mb-2 sm:mb-3 line-clamp-2">
                        {userProfile.bio}
                      </p>
                    )}
                    
                    {/* Stats Row */}
                    <div className="flex items-center gap-3 sm:gap-6 text-xs sm:text-sm">
                      <div className="text-center">
                        <div className="font-bold text-white">{userStats?.clips || 0}</div>
                        <div className="text-gray-400">Clips</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-white">{userStats?.followers || 0}</div>
                        <div className="text-gray-400">Followers</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-white">{userStats?.following || 0}</div>
                        <div className="text-gray-400">Following</div>
                      </div>
                    </div>
                    
                    {/* Badges - Hidden on very small screens */}
                    <div className="hidden sm:flex gap-2 mt-3">
                      <span className="px-3 py-1 bg-purple-600 text-white text-xs rounded-full font-medium">
                        Gamer
                      </span>
                      <span className="px-3 py-1 bg-green-600 text-white text-xs rounded-full font-medium">
                        Expert
                      </span>
                    </div>
                  </div>
                  
                  {/* Share Button (smaller) - Hidden on very small screens */}
                  <div className="hidden sm:block pt-4">
                    <div className="px-3 py-1 border border-gray-600 rounded-lg text-xs text-gray-400">
                      Share
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Copy Link Section */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Profile Link</label>
              <div className="flex items-center gap-2">
                <Input
                  value={shareData.profileUrl}
                  readOnly
                  className="flex-1 text-sm"
                />
                <Button
                  onClick={handleCopyLink}
                  className="px-4"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Link
                </Button>
              </div>
            </div>

            {/* Social Media Sharing */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Share on Social Media</label>
              <div className="flex flex-wrap gap-3 justify-start">
                {socialPlatforms.map((platform) => {
                  const IconComponent = platform.icon;
                  const shareUrl = shareData.socialMediaLinks?.[platform.key as keyof typeof shareData.socialMediaLinks];
                  
                  return (
                    <button
                      key={platform.name}
                      onClick={() => shareUrl && handleSocialShare(platform.name, shareUrl)}
                      disabled={!shareUrl}
                      className="w-12 h-12 rounded-full border-2 border-[#4ADE80] bg-transparent hover:bg-[#4ADE80]/10 text-[#4ADE80] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                      title={platform.name}
                    >
                      <IconComponent className="w-5 h-5" />
                    </button>
                  );
                })}
              </div>
            </div>

          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Unable to generate sharing options</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}