import { useEffect, useState, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { useMobileMenu } from "@/hooks/use-mobile-menu";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { X, Plus, Gift, Users } from "lucide-react";
import { GamefolioHomeIcon } from "@/components/icons/GamefolioHomeIcon";
import { GamefolioLeaderboardIcon } from "@/components/icons/GamefolioLeaderboardIcon";
import { GamefolioWalletIcon } from "@/components/icons/GamefolioWalletIcon";
import { GamefolioCollectionIcon } from "@/components/icons/GamefolioCollectionIcon";
import { GamefolioMessagesIcon } from "@/components/icons/GamefolioMessagesIcon";
import { GamefolioStoreIcon } from "@/components/icons/GamefolioStoreIcon";
import { GamefolioSettingsIcon } from "@/components/icons/GamefolioSettingsIcon";
import { GamefolioSignOutIcon } from "@/components/icons/GamefolioSignOutIcon";
import { GamefolioProfileSettingsIcon } from "@/components/icons/GamefolioProfileSettingsIcon";
import { GamefolioIcon } from "@/components/icons/GamefolioIcon";

import { GamefolioExploreIcon } from "@/components/icons/GamefolioExploreIcon";
import { ZapIconSvg } from "@/components/ui/ZapReactionIcon";
import { GamefolioProfileIcon } from "@/components/icons/GamefolioProfileIcon";
import { Button } from "@/components/ui/button";
import { CustomAvatar } from "@/components/ui/custom-avatar";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Game } from "@shared/schema";
import { FollowListModal } from "@/components/profile/FollowListModal";
import { GiftProSearchDialog } from "@/components/profile/GiftProSearchDialog";

const LEVEL_THRESHOLDS = [
  { level: 1,  xpRequired: 0 },
  { level: 2,  xpRequired: 100 },
  { level: 3,  xpRequired: 500 },
  { level: 4,  xpRequired: 1000 },
  { level: 5,  xpRequired: 2000 },
  { level: 6,  xpRequired: 3500 },
  { level: 7,  xpRequired: 5500 },
  { level: 8,  xpRequired: 8000 },
  { level: 9,  xpRequired: 11000 },
  { level: 10, xpRequired: 15000 },
  { level: 11, xpRequired: 20000 },
  { level: 12, xpRequired: 26000 },
  { level: 13, xpRequired: 33000 },
  { level: 14, xpRequired: 41000 },
  { level: 15, xpRequired: 50000 },
  { level: 16, xpRequired: 60000 },
  { level: 17, xpRequired: 71000 },
  { level: 18, xpRequired: 83000 },
  { level: 19, xpRequired: 96000 },
  { level: 20, xpRequired: 110000 },
  { level: 21, xpRequired: 125000 },
  { level: 22, xpRequired: 141000 },
  { level: 23, xpRequired: 158000 },
  { level: 24, xpRequired: 176000 },
  { level: 25, xpRequired: 195000 },
  { level: 26, xpRequired: 215000 },
  { level: 27, xpRequired: 236000 },
  { level: 28, xpRequired: 258000 },
  { level: 29, xpRequired: 281000 },
  { level: 30, xpRequired: 305000 },
  { level: 31, xpRequired: 330000 },
  { level: 32, xpRequired: 356000 },
  { level: 33, xpRequired: 383000 },
  { level: 34, xpRequired: 411000 },
  { level: 35, xpRequired: 440000 },
  { level: 36, xpRequired: 470000 },
  { level: 37, xpRequired: 501000 },
  { level: 38, xpRequired: 533000 },
  { level: 39, xpRequired: 566000 },
  { level: 40, xpRequired: 600000 },
  { level: 41, xpRequired: 635000 },
  { level: 42, xpRequired: 671000 },
  { level: 43, xpRequired: 708000 },
  { level: 44, xpRequired: 746000 },
  { level: 45, xpRequired: 785000 },
  { level: 46, xpRequired: 825000 },
  { level: 47, xpRequired: 866000 },
  { level: 48, xpRequired: 908000 },
  { level: 49, xpRequired: 951000 },
  { level: 50, xpRequired: 995000 },
];

function LevelProgressBar({ level, totalXP }: { level: number; totalXP: number }) {
  const currentThreshold = LEVEL_THRESHOLDS.find(t => t.level === level) || LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  const nextThreshold = LEVEL_THRESHOLDS.find(t => t.level === level + 1);
  const isMaxLevel = !nextThreshold;

  const xpInCurrentLevel = totalXP - currentThreshold.xpRequired;
  const xpNeededForNextLevel = nextThreshold
    ? nextThreshold.xpRequired - currentThreshold.xpRequired
    : 1;
  const progress = isMaxLevel
    ? 100
    : Math.min(100, (xpInCurrentLevel / xpNeededForNextLevel) * 100);

  return (
    <div className="mt-3">
      <div className="flex justify-between items-center text-xs mb-1">
        <span className="text-primary font-semibold">Level {level}</span>
        <span className="text-muted-foreground">
          {isMaxLevel
            ? `${Math.floor(totalXP).toLocaleString()} XP — MAX`
            : `${Math.floor(totalXP).toLocaleString()} / ${nextThreshold!.xpRequired.toLocaleString()} XP`}
        </span>
      </div>
      <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

const MobileMenu = () => {
  const { isOpen, close } = useMobileMenu();
  const { user, logoutMutation } = useAuth();
  const [location, setLocation] = useLocation();
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      close();
    }, 280);
  }, [close]);

  const [followListModal, setFollowListModal] = useState<{ type: 'followers' | 'following'; userId: number } | null>(null);
  const [showGiftProDialog, setShowGiftProDialog] = useState(false);

  const { data: ownProfileData } = useQuery({
    queryKey: [`/api/users/${user?.username}`],
    queryFn: async () => {
      if (!user?.username) return null;
      const res = await apiRequest('GET', `/api/users/${user.username}`);
      return res.json();
    },
    enabled: !!user?.username,
  });
  const followerCount = (ownProfileData as any)?._count?.followers ?? 0;
  const followingCount = (ownProfileData as any)?._count?.following ?? 0;

  const { data: favoriteGames } = useQuery<Game[]>({
    queryKey: [`/api/users/${user?.id}/favorites`],
    queryFn: async () => {
      if (!user?.id) return [];
      const response = await apiRequest("GET", `/api/users/${user.id}/favorites`);
      if (!response.ok) throw new Error("Failed to fetch favorite games");
      return response.json();
    },
    enabled: !!user?.id,
  });

  const displayGames = favoriteGames;

  // Close menu when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (isOpen && !isClosing && e.target instanceof HTMLElement) {
        const menuContainer = document.getElementById('mobile-menu-container');
        if (menuContainer && !menuContainer.contains(e.target)) {
          handleClose();
        }
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen, isClosing, handleClose]);

  // Disable body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  const handleLogout = () => {
    logoutMutation.mutate();
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex"
      style={{
        paddingBottom: 'calc(64px + env(safe-area-inset-bottom, 0px))',
        backgroundColor: isClosing ? 'transparent' : 'rgba(0,0,0,0.5)',
        transition: 'background-color 0.28s ease',
      }}
    >
      <div 
        id="mobile-menu-container"
        className="w-4/5 max-w-xs bg-card shadow-xl h-full transform"
        style={{ animation: isClosing ? 'slideOut 0.28s forwards' : 'slideIn 0.3s forwards' }}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-border flex justify-end items-center">
            <Button variant="ghost" size="icon" onClick={handleClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>


          {/* User Profile */}
          {user && (
            <div className="p-4 border-b border-border">
              <div className="flex items-center">
                <div 
                  className="cursor-pointer"
                  onClick={() => {
                    setLocation(`/profile/${user.username}`);
                    handleClose();
                  }}
                >
                  <CustomAvatar 
                    user={user}
                    size="md"
                    borderIntensity="normal"
                    showAvatarBorderOverlay={true}
                  />
                </div>
                <div className="ml-3">
                  <p className="font-medium">{user.displayName && user.displayName.length > 12 ? user.displayName.slice(0, 12) + '…' : user.displayName}</p>
                  <p className="text-xs text-muted-foreground">@{user.username}</p>
                </div>
              </div>
              {/* Level Progress Bar */}
              <LevelProgressBar level={user.level || 1} totalXP={user.totalXP || 0} />
              {/* Followers / Following / Gift Pro */}
              <div className="flex items-center gap-3 mt-3 flex-wrap">
                <button
                  onClick={() => setFollowListModal({ type: 'followers', userId: user.id })}
                  className="flex items-center gap-1 hover:opacity-75 transition-opacity"
                >
                  <span className="font-black text-sm">{followerCount.toLocaleString()}</span>
                  <span className="text-xs text-muted-foreground">Followers</span>
                </button>
                <span className="text-muted-foreground text-xs">·</span>
                <button
                  onClick={() => setFollowListModal({ type: 'following', userId: user.id })}
                  className="flex items-center gap-1 hover:opacity-75 transition-opacity"
                >
                  <span className="font-black text-sm">{followingCount.toLocaleString()}</span>
                  <span className="text-xs text-muted-foreground">Following</span>
                </button>
                <button
                  onClick={() => setShowGiftProDialog(true)}
                  className="ml-auto flex items-center gap-1 text-xs text-primary font-medium hover:opacity-75 transition-opacity"
                >
                  <Gift className="h-3.5 w-3.5" />
                  Gift Pro
                </button>
              </div>
            </div>
          )}

          {/* Navigation Links */}
          <nav className="flex-1 overflow-y-auto p-4">
            <ul className="space-y-4">
              <li>
                <Link 
                  href="/"
                  onClick={handleClose}
                  className="flex items-center p-2 rounded-md hover:bg-primary hover:text-[#071013] transition-colors w-full text-left no-underline group"
                >
                  <GamefolioHomeIcon className="mr-3 h-5 w-5 text-primary group-hover:text-[#071013]" />
                  <span className="font-medium">Home</span>
                </Link>
              </li>
              <li>
                <Link 
                  href="/explore"
                  onClick={handleClose}
                  className="flex items-center p-2 rounded-md hover:bg-primary hover:text-[#071013] transition-colors w-full text-left no-underline group"
                >
                  <GamefolioExploreIcon className="mr-3 h-5 w-5 text-primary group-hover:text-[#071013]" />
                  <span className="font-medium">Explore</span>
                </Link>
              </li>
              <li>
                <Link 
                  href="/trending"
                  onClick={handleClose}
                  className="flex items-center p-2 rounded-md hover:bg-primary hover:text-[#071013] transition-colors w-full text-left no-underline group"
                >
                  <ZapIconSvg className="mr-3 h-5 w-5" active={true} />
                  <span className="font-medium">Trending</span>
                </Link>
              </li>
              <li>
                <Link 
                  href="/leaderboard"
                  onClick={handleClose}
                  className="flex items-center p-2 rounded-md hover:bg-primary hover:text-[#071013] transition-colors w-full text-left no-underline group"
                >
                  <GamefolioLeaderboardIcon className="mr-3 h-5 w-5 text-primary group-hover:text-[#071013]" />
                  <span className="font-medium">Leaderboard</span>
                </Link>
              </li>
              {/* Store stays on native (crypto-free cosmetics catalogue). */}
              <li>
                <Link
                  href="/store"
                  onClick={handleClose}
                  className="flex items-center p-2 rounded-md hover:bg-primary hover:text-[#071013] transition-colors w-full text-left no-underline group"
                >
                  <GamefolioStoreIcon className="mr-3 h-5 w-5 text-primary group-hover:text-[#071013]" />
                  <span className="font-medium">Store</span>
                </Link>
              </li>
              {/* Wallet stays on native too — the /wallet route renders a
                  redirect-to-web card (App Store / Play financial compliance),
                  same pattern as Store. */}
              <li>
                <Link
                  href="/wallet"
                  onClick={handleClose}
                  className="flex items-center p-2 rounded-md hover:bg-primary hover:text-[#071013] transition-colors w-full text-left no-underline group"
                >
                  <GamefolioWalletIcon className="mr-3 h-5 w-5 text-primary group-hover:text-[#071013]" />
                  <span className="font-medium">Wallet</span>
                </Link>
              </li>
              {/* Collection renders read-only on native (browse only;
                  transactions are web-only). See MintedNftDetailScreen. */}
              <li>
                <Link
                  href="/collection"
                  onClick={handleClose}
                  className="flex items-center p-2 rounded-md hover:bg-primary hover:text-[#071013] transition-colors w-full text-left no-underline group"
                >
                  <GamefolioCollectionIcon className="mr-3 h-5 w-5 text-primary group-hover:text-[#071013]" />
                  <span className="font-medium">Collection</span>
                </Link>
              </li>
              {user && user.messagingEnabled !== false && (
                <li>
                  <Link 
                    href="/messages"
                    onClick={handleClose}
                    className="flex items-center p-2 rounded-md hover:bg-primary hover:text-[#071013] transition-colors w-full text-left no-underline group"
                  >
                    <GamefolioMessagesIcon className="mr-3 h-5 w-5 text-primary group-hover:text-[#071013]" />
                    <span className="font-medium">Messages</span>
                  </Link>
                </li>
              )}
              {user && (
                <li>
                  <Link 
                    href={`/profile/${user.username}`}
                    onClick={handleClose}
                    className="flex items-center p-2 rounded-md hover:bg-primary hover:text-[#071013] transition-colors w-full text-left no-underline group"
                  >
                    <GamefolioIcon glow={location === `/${user?.username}` || location === `/@${user?.username}`} className="mr-3 h-5 w-5 scale-[1.8] flex-shrink-0" />
                    <span className="font-medium">My Gamefolio</span>
                  </Link>
                </li>
              )}
            </ul>

            {/* Settings Section */}
            {user && (
              <>
                <div className="mt-6 mb-2 px-2">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Settings</h3>
                </div>
                <ul className="space-y-2">
                  <li>
                    <Link
                      href="/account/settings"
                      onClick={handleClose}
                      className="flex items-center p-2 rounded-md hover:bg-primary hover:text-[#071013] transition-colors w-full text-left no-underline group"
                    >
                      <GamefolioSettingsIcon className="mr-3 h-5 w-5 text-muted-foreground group-hover:text-[#071013]" />
                      <span>Account Settings</span>
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/settings/profile"
                      onClick={handleClose}
                      className="flex items-center p-2 rounded-md hover:bg-primary hover:text-[#071013] transition-colors w-full text-left no-underline group"
                    >
                      <GamefolioProfileSettingsIcon className="mr-3 h-5 w-5 opacity-70 group-hover:opacity-100 group-hover:text-[#071013]" />
                      <span>Profile Settings</span>
                    </Link>
                  </li>
                </ul>
              </>
            )}

            {/* Games Section */}
            {user && displayGames && displayGames.length > 0 && (
              <div className="mt-6 border-t border-border pt-4">
                <div className="flex items-center justify-between px-2 mb-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Your Games
                  </h3>
                  <button
                    onClick={() => { handleClose(); }}
                    className="text-muted-foreground hover:text-primary transition-colors"
                    title="Manage games in your profile"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2 px-1">
                  {displayGames.slice(0, 9).map((game) => (
                    <button
                      key={`menu-game-${game.id}`}
                      className="flex flex-col items-center gap-1 group"
                      onClick={() => {
                        setLocation(`/profile/${user.username}`);
                        handleClose();
                      }}
                    >
                      <div className="w-full aspect-[3/4] rounded-lg overflow-hidden bg-muted">
                        {game.imageUrl ? (
                          <img
                            src={game.imageUrl.includes('{width}')
                              ? game.imageUrl.replace('{width}', '80').replace('{height}', '107')
                              : game.imageUrl.replace('285x380', '80x107')}
                            alt={game.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className={cn(
                              "w-4 h-4 rounded-full",
                              game.id % 5 === 0 ? "bg-red-500" :
                              game.id % 5 === 1 ? "bg-sky-500" :
                              game.id % 5 === 2 ? "bg-primary" :
                              game.id % 5 === 3 ? "bg-yellow-500" :
                              "bg-orange-500"
                            )} />
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground text-center line-clamp-2 w-full leading-tight px-0.5">
                        {game.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-border">
            {user ? (
              <Button 
                variant="default" 
                className="w-full" 
                onClick={handleLogout}
              >
                <GamefolioSignOutIcon className="mr-2 h-4 w-4" />
                Logout
              </Button>
            ) : (
              <Button 
                className="w-full"
                onClick={() => {
                  setLocation("/auth");
                  handleClose();
                }}
              >
                Sign In
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Follow List Modal */}
      {followListModal && (
        <FollowListModal
          open={!!followListModal}
          onClose={() => setFollowListModal(null)}
          type={followListModal.type}
          userId={followListModal.userId}
        />
      )}

      <GiftProSearchDialog open={showGiftProDialog} onOpenChange={setShowGiftProDialog} />
    </div>
  );
};

export default MobileMenu;