import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
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
import { Badge } from '@/components/ui/badge';
import { useSignedUrl } from '@/hooks/use-signed-url';
import { openShareWindow, nativeShare, isNative } from '@/lib/platform';

const userTypeConfig: Record<string, { label: string; icon: any; color: string }> = {
  streamer: { label: "Streamer", icon: Video, color: "bg-primary/20 text-primary border-primary/30" },
  gamer: { label: "Gamer", icon: Gamepad2, color: "bg-primary/20 text-primary border-primary/30" },
  professional_gamer: { label: "Professional Gamer", icon: Trophy, color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  content_creator: { label: "Content Creator", icon: Upload, color: "bg-[#B7FF1A]/20 text-[#B7FF1A] border-[#B7FF1A]/30" },
  indie_developer: { label: "Indie Developer", icon: Code, color: "bg-primary/20 text-primary border-primary/30" },
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
  userId?: number | null;
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
    selectedVerificationBadgeId?: number | null;
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
  userId,
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

  const { data: verificationBadgeData } = useQuery<{ verificationBadge: { id: number; name: string; imageUrl: string } | null }>({
    queryKey: [`/api/user/${userId}/verification-badge`],
    queryFn: async () => {
      const response = await fetch(`/api/user/${userId}/verification-badge`, { credentials: 'include' });
      if (!response.ok) return { verificationBadge: null };
      return response.json();
    },
    enabled: !!userId && (!!userProfile?.selectedVerificationBadgeId || !!userProfile?.isPro),
  });

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

  const handleSocialShare = async (url: string) => {
    if (isNative && shareData?.profileUrl) {
      const handled = await nativeShare({
        title: 'My Gamefolio',
        url: shareData.profileUrl,
      });
      if (handled) return;
    }
    void openShareWindow(url);
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
  const themeAccent = userProfile?.accentColor || '#B7FF1A';
  const themeBg = userProfile?.backgroundColor || '#0B2232';

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
            <Share2 className="w-5 h-5 sm:w-6 sm:h-6 text-[#B7FF1A] shrink-0" />
            <span className="text-[#f8fafc] text-base sm:text-xl font-bold truncate">Share Gamefolio</span>
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
              <div className="animate-spin w-8 h-8 border-4 border-[#B7FF1A] border-t-transparent rounded-full" />
            </div>
          ) : shareData ? (
            <>
              {/* Profile Preview Card */}
              <div className="rounded-2xl overflow-hidden" style={{ background: `linear-gradient(180deg, ${themeAccent}28 0%, ${themeBg} 45%, ${themeBg} 100%)`, border: `1px solid ${themeAccent}30` }}>
                {/* Banner */}
                <div 
                  className="h-20 relative overflow-hidden"
                  style={{
                    background: bannerUrl
                      ? `url(${bannerUrl}) center/cover no-repeat`
                      : `linear-gradient(135deg, ${themeAccent}, ${themeBg})`,
                  }}
                >
                  <div
                    className="absolute inset-0"
                    style={{ background: `linear-gradient(135deg, ${themeAccent}66 0%, transparent 60%, ${themeBg}99 100%)` }}
                  />
                </div>

                {/* Profile Info Area */}
                <div className="relative px-4 pb-4">
                  {/* Avatar - overlapping banner */}
                  <div className="relative -mt-10 mb-2 w-20 h-20">
                    {userProfile?.nftProfileTokenId && userProfile?.nftProfileImageUrl && userProfile?.activeProfilePicType === 'nft' ? (
                      <div className="relative w-20 h-20">
                        <div
                          className="w-full h-full rounded-lg overflow-hidden border-2"
                          style={{ borderColor: `${userProfile?.avatarBorderColor || '#ffffff'}66` }}
                        >
                          <img 
                            src={userProfile.nftProfileImageUrl} 
                            alt={userProfile?.displayName || username}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div 
                          className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center shadow-sm"
                          style={{ backgroundColor: userProfile?.avatarBorderColor || '#ffffff' }}
                        >
                          <svg width="9" height="9" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path fillRule="evenodd" clipRule="evenodd" d="M6.3515 1.97329C6.24341 2.0703 6.13026 2.1615 6.01252 2.24653C5.80845 2.38349 5.57904 2.47799 5.338 2.52593C5.23322 2.54647 5.12365 2.55537 4.9052 2.57249C4.35668 2.61632 4.08208 2.63823 3.85335 2.71904C3.3235 2.9058 2.90677 3.32253 2.72001 3.85238C2.63921 4.0811 2.61729 4.3557 2.57347 4.90423C2.5656 5.04921 2.55006 5.19368 2.5269 5.33702C2.47897 5.57807 2.38446 5.80748 2.2475 6.01154C2.18793 6.10057 2.11671 6.18411 1.97427 6.35052C1.61749 6.76962 1.43876 6.97916 1.33398 7.1983C1.09225 7.70505 1.09225 8.29397 1.33398 8.80072C1.43876 9.01986 1.61749 9.22941 1.97427 9.6485C2.11671 9.81491 2.18793 9.89846 2.2475 9.98748C2.38446 10.1915 2.47897 10.421 2.5269 10.662C2.54745 10.7668 2.55635 10.8763 2.57347 11.0948C2.61729 11.6433 2.63921 11.9179 2.72001 12.1466C2.90677 12.6765 3.3235 13.0932 3.85335 13.28C4.08208 13.3608 4.35668 13.3827 4.9052 13.4265C5.12365 13.4437 5.23322 13.4526 5.338 13.4731C5.57904 13.521 5.80845 13.6162 6.01252 13.7525C6.10154 13.8121 6.18509 13.8833 6.3515 14.0257C6.77059 14.3825 6.98014 14.5612 7.19928 14.666C7.70603 14.9077 8.29495 14.9077 8.8017 14.666C9.02084 14.5612 9.23038 14.3825 9.64948 14.0257C9.81589 13.8833 9.89943 13.8121 9.98846 13.7525C10.1925 13.6155 10.4219 13.521 10.663 13.4731C10.7678 13.4526 10.8773 13.4437 11.0958 13.4265C11.6443 13.3827 11.9189 13.3608 12.1476 13.28C12.6775 13.0932 13.0942 12.6765 13.281 12.1466C13.3618 11.9179 13.3837 11.6433 13.4275 11.0948C13.4446 10.8763 13.4535 10.7668 13.4741 10.662C13.522 10.421 13.6172 10.1915 13.7535 9.98748C13.813 9.89846 13.8843 9.81491 14.0267 9.6485C14.3835 9.22941 14.5622 9.01986 14.667 8.80072C14.9087 8.29397 14.9087 7.70505 14.667 7.1983C14.5622 6.97916 14.3835 6.76962 14.0267 6.35052C13.9297 6.24244 13.8385 6.12929 13.7535 6.01154C13.6164 5.80751 13.5214 5.5782 13.4741 5.33702C13.4509 5.19368 13.4354 5.04921 13.4275 4.90423C13.3837 4.3557 13.3618 4.0811 13.281 3.85238C13.0942 3.32253 12.6775 2.9058 12.1476 2.71904C11.9189 2.63823 11.6443 2.61632 11.0958 2.57249C10.8773 2.55537 10.7678 2.54647 10.663 2.52593C10.4219 2.47799 10.1925 2.38349 9.98846 2.24653C9.89943 2.1875 9.81589 2.11627 9.64948 1.97384C9.23038 1.61706 9.02084 1.43833 8.8017 1.33355C8.29495 1.09182 7.70603 1.09182 7.19928 1.33355C6.98014 1.43833 6.77059 1.61706 6.3515 1.97329ZM11.2071 6.70711C11.5976 6.31658 11.5976 5.68342 11.2071 5.29289C10.8166 4.90237 10.1834 4.90237 9.79289 5.29289L7 8.08579L6.20711 7.29289C5.81658 6.90237 5.18342 6.90237 4.79289 7.29289C4.40237 7.68342 4.40237 8.31658 4.79289 8.70711L6.29289 10.2071C6.68342 10.5976 7.31658 10.5976 7.70711 10.2071L11.2071 6.70711Z" fill="white"/>
                          </svg>
                        </div>
                      </div>
                    ) : (
                      <div className="w-20 h-20 rounded-full border-4 border-[#0f172a] overflow-hidden bg-[#0f172a]">
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
                      </div>
                    )}
                  </div>

                  {/* Name & Username with badges */}
                  <div className="flex items-center gap-1 mb-0.5 flex-wrap">
                    <span className="text-[#f8fafc] text-lg font-bold leading-7 truncate">
                      {userProfile?.displayName || username}
                    </span>
                    {verificationBadgeData?.verificationBadge ? (
                      <VerificationBadge 
                        isVerified={true} 
                        badgeImageUrl={verificationBadgeData.verificationBadge.imageUrl}
                        badgeName={verificationBadgeData.verificationBadge.name}
                        size="sm" 
                      />
                    ) : (userProfile?.isPro || userProfile?.selectedVerificationBadgeId) ? (
                      <VerificationBadge isVerified={true} size="sm" />
                    ) : null}
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
                  <div className="flex items-center gap-4 border-t border-[#1e293b]/30 mt-3 pt-3">
                    <div className="flex items-center gap-1">
                      <span className="text-[#f8fafc] text-lg font-bold leading-7">{userStats?.clips || 0}</span>
                      <span className="text-[#94a3b8] text-xs leading-4">Clips</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[#f8fafc] text-lg font-bold leading-7">{userStats?.followers || 0}</span>
                      <span className="text-[#94a3b8] text-xs leading-4">Followers</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[#f8fafc] text-lg font-bold leading-7">{userStats?.following || 0}</span>
                      <span className="text-[#94a3b8] text-xs leading-4">Following</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Profile Link Section */}
              <div className="flex flex-col gap-2.5">
                <span className="text-[#94a3b8] text-sm">Gamefolio Link</span>
                <div className="flex gap-2">
                  <div className="flex-1 min-w-0 bg-[#1e293b] border border-[#1e293b] rounded-2xl px-3 sm:px-4 py-3 overflow-hidden">
                    <span className="text-[#94a3b8] text-xs sm:text-sm font-mono truncate block">
                      {shareData.profileUrl}
                    </span>
                  </div>
                  <button
                    onClick={handleCopyLink}
                    className="flex items-center gap-1.5 sm:gap-2 bg-[#B7FF1A] hover:bg-[#A2F000] text-[#071013] rounded-2xl px-3 sm:px-4 py-3 transition-colors shrink-0"
                  >
                    <Copy className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="text-sm sm:text-base whitespace-nowrap">{copied ? 'Copied!' : 'Copy Link'}</span>
                  </button>
                </div>
              </div>

              {/* Social Media Section - desktop only */}
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
                        className="w-14 h-14 rounded-full border-2 border-[#B7FF1A] bg-transparent hover:bg-[#B7FF1A]/10 text-[#f8fafc] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
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
