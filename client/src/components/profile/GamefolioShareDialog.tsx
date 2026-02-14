import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Share2, X, Copy, Video, Gamepad2, Trophy, Upload, Code, Eye, Coffee, Scroll } from 'lucide-react';
import { FaFacebook, FaReddit, FaLinkedin, FaWhatsapp, FaTelegram, FaDiscord, FaEnvelope } from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';
import { toast } from '@/hooks/use-toast';
import { CustomAvatar } from '@/components/ui/custom-avatar';
import { VerificationBadge } from '@/components/ui/verification-badge';
import { ProBadge } from '@/components/ui/pro-badge';
import { Badge } from '@/components/ui/badge';
import { useSignedUrl } from '@/hooks/use-signed-url';

const userTypeConfig: Record<string, { label: string; icon: any; color: string }> = {
  streamer: { label: "Streamer", icon: Video, color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  gamer: { label: "Gamer", icon: Gamepad2, color: "bg-green-500/20 text-green-400 border-green-500/30" },
  professional_gamer: { label: "Professional Gamer", icon: Trophy, color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  content_creator: { label: "Content Creator", icon: Upload, color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  indie_developer: { label: "Indie Developer", icon: Code, color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" },
  viewer: { label: "Viewer", icon: Eye, color: "bg-gray-500/20 text-gray-400 border-gray-500/30" },
  filthy_casual: { label: "Filthy Casual", icon: Coffee, color: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  doom_scroller: { label: "Doom Scroller", icon: Scroll, color: "bg-red-500/20 text-red-400 border-red-500/30" },
};

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
    selectedAvatarBorderId?: number | null;
    avatarBorderColor?: string | null;
    nftProfileTokenId?: number | null;
    nftProfileImageUrl?: string | null;
    emailVerified?: boolean | null;
    role?: string | null;
    isPro?: boolean | null;
    userType?: string | null;
    showUserType?: boolean | null;
    accentColor?: string | null;
    backgroundColor?: string | null;
    cardColor?: string | null;
    primaryColor?: string | null;
  };
  userStats?: {
    clips?: number;
    followers?: number;
    following?: number;
  };
  favoriteGames?: Array<{
    id: number;
    name: string;
    imageUrl?: string | null;
  }>;
}

export function GamefolioShareDialog({ 
  username, 
  trigger, 
  open: controlledOpen, 
  onOpenChange: controlledOnOpenChange,
  userProfile,
  userStats,
  favoriteGames
}: GamefolioShareDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [shareData, setShareData] = useState<GamefolioShareData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const open = controlledOpen !== undefined ? controlledOpen : isOpen;
  const setOpen = controlledOnOpenChange || setIsOpen;

  const { signedUrl: bannerSignedUrl } = useSignedUrl(userProfile?.bannerUrl);

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
        generateFallbackData();
      }
    } catch (error) {
      console.error('Error fetching share data:', error);
      generateFallbackData();
    } finally {
      setIsLoading(false);
    }
  };

  const generateFallbackData = () => {
    const baseUrl = window.location.origin;
    const profileUrl = `${baseUrl}/@${username}`;
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
  };

  const handleCopyLink = async () => {
    if (!shareData) return;
    try {
      await navigator.clipboard.writeText(shareData.profileUrl);
      setCopied(true);
      toast({ title: "Link copied!", description: "Profile link has been copied to your clipboard." });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({ title: "Copy Failed", description: "Unable to copy link to clipboard.", variant: "destructive" });
    }
  };

  const handleSocialShare = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer,width=600,height=500');
  };

  const socialPlatforms = [
    { name: 'X', icon: FaXTwitter, key: 'twitter' },
    { name: 'Facebook', icon: FaFacebook, key: 'facebook' },
    { name: 'LinkedIn', icon: FaLinkedin, key: 'linkedin' },
    { name: 'WhatsApp', icon: FaWhatsapp, key: 'whatsapp' },
    { name: 'Telegram', icon: FaTelegram, key: 'telegram' },
    { name: 'Reddit', icon: FaReddit, key: 'reddit' },
    { name: 'Discord', icon: FaDiscord, key: 'discord' },
    { name: 'Email', icon: FaEnvelope, key: 'email' },
  ];

  const bannerUrl = bannerSignedUrl || userProfile?.bannerUrl;
  const themeAccent = userProfile?.accentColor || '#4ADE80';
  const themeBg = userProfile?.backgroundColor || '#0B2232';
  const themeCard = userProfile?.cardColor || '#1E3A8A';
  const themePrimary = userProfile?.primaryColor || '#02172C';

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
      <DialogContent 
        className="p-0 border-[#1e293b] bg-[#0f172a] w-[calc(100vw-2rem)] max-w-[384px] rounded-3xl overflow-hidden shadow-2xl gap-0 [&>button]:hidden max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-4 sm:py-5 border-b border-[#1e293b]/50">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Share2 className="w-5 h-5 sm:w-6 sm:h-6 text-[#4ADE80] shrink-0" />
            <span className="text-[#f8fafc] text-base sm:text-xl font-bold truncate">Share Gamefolio Profile</span>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-white/5 transition-colors shrink-0 ml-2"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6 text-[#94a3b8]" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 flex flex-col gap-5 sm:gap-6 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin w-8 h-8 border-4 border-[#4ADE80] border-t-transparent rounded-full" />
            </div>
          ) : shareData ? (
            <>
              {/* Profile Preview Card */}
              <div className="rounded-2xl overflow-hidden" style={{ background: `linear-gradient(180deg, ${themePrimary} 0%, ${themeBg} 60%, ${themeBg} 100%)`, border: `1px solid ${themeAccent}20` }}>
                {/* Banner */}
                <div 
                  className="h-20 bg-cover bg-center"
                  style={{
                    backgroundImage: bannerUrl
                      ? `url(${bannerUrl})`
                      : `linear-gradient(270deg, ${themeAccent}, ${themeBg})`,
                  }}
                />

                {/* Profile Info Area */}
                <div className="relative px-4 pb-4">
                  {/* Avatar - overlapping banner */}
                  <div className="relative -mt-10 mb-2 w-20 h-20">
                    <div className="w-20 h-20 rounded-full border-4 border-[#0f172a] overflow-hidden bg-[#0f172a]">
                      {userProfile?.nftProfileTokenId && userProfile?.nftProfileImageUrl ? (
                        <img 
                          src={userProfile.nftProfileImageUrl} 
                          alt={userProfile?.displayName || username}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <CustomAvatar 
                          user={{
                            username,
                            displayName: userProfile?.displayName || username,
                            avatarUrl: userProfile?.avatarUrl || null,
                            selectedAvatarBorderId: userProfile?.selectedAvatarBorderId || null,
                            avatarBorderColor: userProfile?.avatarBorderColor || null,
                          }}
                          size="lg"
                          showBorder={false}
                          showAvatarBorderOverlay={false}
                        />
                      )}
                    </div>
                  </div>

                  {/* Name & Username with badges */}
                  <div className="flex items-center gap-1 mb-0.5 flex-wrap">
                    <span className="text-[#f8fafc] text-lg font-bold leading-7 truncate">
                      {userProfile?.displayName || username}
                    </span>
                    <VerificationBadge isVerified={!!userProfile?.emailVerified} size="sm" />
                    <ProBadge isPro={userProfile?.isPro === true} size="sm" />
                  </div>
                  <span className="text-[#94a3b8] text-sm leading-5">@{username}</span>

                  {/* User type badges */}
                  {userProfile?.userType && userProfile?.showUserType !== false && (
                    <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                      {userProfile.userType.split(',').map(t => t.trim()).filter(Boolean).slice(0, 2).map((type, index) => {
                        const config = userTypeConfig[type];
                        if (!config) return null;
                        const IconComponent = config.icon;
                        return (
                          <Badge 
                            key={`${type}-${index}`}
                            variant="outline" 
                            className={`${config.color} border text-[10px] font-medium px-1.5 py-0`}
                          >
                            <IconComponent className="w-2.5 h-2.5 mr-0.5" />
                            {config.label}
                          </Badge>
                        );
                      })}
                    </div>
                  )}

                  {/* Bio */}
                  {userProfile?.bio && (
                    <p className="text-[#94a3b8] text-sm leading-5 mt-1 line-clamp-1 pr-8">
                      {userProfile.bio}
                    </p>
                  )}

                  {/* Favorite Games */}
                  {favoriteGames && favoriteGames.length > 0 && (
                    <div className="flex items-center gap-2 mt-2">
                      {favoriteGames.slice(0, 5).map((game) => (
                        <div 
                          key={game.id} 
                          className="w-10 h-[53px] rounded-md overflow-hidden flex-shrink-0"
                          style={{ border: `1px solid ${themeAccent}30` }}
                          title={game.name}
                        >
                          <img 
                            src={game.imageUrl 
                              ? (game.imageUrl.includes('{width}') 
                                  ? game.imageUrl.replace('{width}', '80').replace('{height}', '107')
                                  : game.imageUrl)
                              : "/placeholder-game.png"} 
                            alt={game.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Stats */}
                  <div className="flex items-center border-t border-[#1e293b]/30 mt-3 pt-3">
                    <div className="flex-1 flex flex-col items-center">
                      <span className="text-[#f8fafc] text-lg font-bold leading-7">{userStats?.clips || 0}</span>
                      <span className="text-[#94a3b8] text-xs leading-4">Clips</span>
                    </div>
                    <div className="flex-1 flex flex-col items-center">
                      <span className="text-[#f8fafc] text-lg font-bold leading-7">{userStats?.followers || 0}</span>
                      <span className="text-[#94a3b8] text-xs leading-4">Followers</span>
                    </div>
                    <div className="flex-1 flex flex-col items-center">
                      <span className="text-[#f8fafc] text-lg font-bold leading-7">{userStats?.following || 0}</span>
                      <span className="text-[#94a3b8] text-xs leading-4">Following</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Profile Link Section */}
              <div className="flex flex-col gap-2.5">
                <span className="text-[#94a3b8] text-sm">Profile Link</span>
                <div className="flex gap-2">
                  <div className="flex-1 min-w-0 bg-[#1e293b] border border-[#1e293b] rounded-2xl px-3 sm:px-4 py-3 overflow-hidden">
                    <span className="text-[#94a3b8] text-xs sm:text-sm font-mono truncate block">
                      {shareData.profileUrl}
                    </span>
                  </div>
                  <button
                    onClick={handleCopyLink}
                    className="flex items-center gap-1.5 sm:gap-2 bg-[#a855f7] hover:bg-[#9333ea] text-white rounded-2xl px-3 sm:px-4 py-3 transition-colors shrink-0"
                  >
                    <Copy className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="text-sm sm:text-base whitespace-nowrap">{copied ? 'Copied!' : 'Copy Link'}</span>
                  </button>
                </div>
              </div>

              {/* Social Media Section - hidden on mobile */}
              <div className="hidden sm:flex flex-col gap-3">
                <span className="text-[#94a3b8] text-sm">Share on Social Media</span>
                <div className="flex flex-wrap gap-2 sm:gap-2.5">
                  {socialPlatforms.map((platform) => {
                    const IconComponent = platform.icon;
                    const shareUrl = shareData.socialMediaLinks?.[platform.key as keyof typeof shareData.socialMediaLinks];
                    return (
                      <button
                        key={platform.name}
                        onClick={() => shareUrl && handleSocialShare(shareUrl)}
                        disabled={!shareUrl}
                        className="w-14 h-14 rounded-full border-2 border-[#4ADE80] bg-transparent hover:bg-[#4ADE80]/10 text-[#f8fafc] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                        title={platform.name}
                      >
                        <IconComponent className="w-6 h-6" />
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-[#94a3b8]">Unable to generate sharing options</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
