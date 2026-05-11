import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useMobileMenu } from "@/hooks/use-mobile-menu";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { X, Home, Compass, User, Settings, LogOut, MessageSquare, Trophy, ShoppingBag, Wallet, Gift } from "lucide-react";
import { ZapIconSvg } from "@/components/ui/ZapReactionIcon";
import { GamefolioProfileIcon } from "@/components/icons/GamefolioProfileIcon";
import { Button } from "@/components/ui/button";
import { CustomAvatar } from "@/components/ui/custom-avatar";
import gamefolioLogo from '@assets/gamefolio social logo 3d circle web.png';

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
  const [, setLocation] = useLocation();

  // Close menu when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (isOpen && e.target instanceof HTMLElement) {
        const menuContainer = document.getElementById('mobile-menu-container');
        if (menuContainer && !menuContainer.contains(e.target)) {
          close();
        }
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen, close]);

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
    close();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex" style={{ paddingBottom: 'calc(64px + env(safe-area-inset-bottom, 0px))' }}>
      <div 
        id="mobile-menu-container"
        className="w-4/5 max-w-xs bg-card shadow-xl h-full transition-transform duration-300 transform"
        style={{ animation: 'slideIn 0.3s forwards' }}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-border flex justify-end items-center">
            <Button variant="ghost" size="icon" onClick={close}>
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
                    close();
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
            </div>
          )}

          {/* Navigation Links */}
          <nav className="flex-1 overflow-y-auto p-4">
            <ul className="space-y-4">
              <li>
                <Link 
                  href="/"
                  onClick={close}
                  className="flex items-center p-2 rounded-md hover:bg-accent/10 transition-colors w-full text-left no-underline"
                >
                  <Home className="mr-3 h-5 w-5 text-primary" />
                  <span className="font-medium">Home</span>
                </Link>
              </li>
              <li>
                <Link 
                  href="/explore"
                  onClick={close}
                  className="flex items-center p-2 rounded-md hover:bg-accent/10 transition-colors w-full text-left no-underline"
                >
                  <Compass className="mr-3 h-5 w-5 text-primary" />
                  <span className="font-medium">Explore</span>
                </Link>
              </li>
              <li>
                <Link 
                  href="/trending"
                  onClick={close}
                  className="flex items-center p-2 rounded-md hover:bg-accent/10 transition-colors w-full text-left no-underline"
                >
                  <ZapIconSvg className="mr-3 h-5 w-5" active={true} />
                  <span className="font-medium">Trending</span>
                </Link>
              </li>
              <li>
                <Link 
                  href="/leaderboard"
                  onClick={close}
                  className="flex items-center p-2 rounded-md hover:bg-accent/10 transition-colors w-full text-left no-underline"
                >
                  <Trophy className="mr-3 h-5 w-5 text-primary" />
                  <span className="font-medium">Leaderboard</span>
                </Link>
              </li>
              <li>
                <Link 
                  href="/store"
                  onClick={close}
                  className="flex items-center p-2 rounded-md hover:bg-accent/10 transition-colors w-full text-left no-underline"
                >
                  <ShoppingBag className="mr-3 h-5 w-5 text-primary" />
                  <span className="font-medium">Store</span>
                </Link>
              </li>
              <li>
                <Link 
                  href="/wallet"
                  onClick={close}
                  className="flex items-center p-2 rounded-md hover:bg-accent/10 transition-colors w-full text-left no-underline"
                >
                  <Wallet className="mr-3 h-5 w-5 text-primary" />
                  <span className="font-medium">Wallet</span>
                </Link>
              </li>
              <li>
                <Link 
                  href="/collection"
                  onClick={close}
                  className="flex items-center p-2 rounded-md hover:bg-accent/10 transition-colors w-full text-left no-underline"
                >
                  <Gift className="mr-3 h-5 w-5 text-primary" />
                  <span className="font-medium">Collection</span>
                </Link>
              </li>
              {user && user.messagingEnabled !== false && (
                <li>
                  <Link 
                    href="/messages"
                    onClick={close}
                    className="flex items-center p-2 rounded-md hover:bg-accent/10 transition-colors w-full text-left no-underline"
                  >
                    <MessageSquare className="mr-3 h-5 w-5 text-primary" />
                    <span className="font-medium">Messages</span>
                  </Link>
                </li>
              )}
              {user && (
                <li>
                  <Link 
                    href={`/profile/${user.username}`}
                    onClick={close}
                    className="flex items-center p-2 rounded-md hover:bg-accent/10 transition-colors w-full text-left no-underline group"
                  >
                    <span className="mr-3 inline-flex transition-all duration-300 group-hover:[filter:drop-shadow(0_0_7px_#B7FF1A)]">
                      <GamefolioProfileIcon className="h-5 w-5 text-primary" />
                    </span>
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
                      onClick={close}
                      className="flex items-center p-2 rounded-md hover:bg-accent/10 transition-colors w-full text-left no-underline"
                    >
                      <Settings className="mr-3 h-5 w-5 text-muted-foreground" />
                      <span>Account Settings</span>
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/settings/profile"
                      onClick={close}
                      className="flex items-center p-2 rounded-md hover:bg-accent/10 transition-colors w-full text-left no-underline"
                    >
                      <GamefolioProfileIcon className="mr-3 h-5 w-5 opacity-70" />
                      <span>Profile Settings</span>
                    </Link>
                  </li>
                </ul>
              </>
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
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            ) : (
              <Button 
                className="w-full"
                onClick={() => {
                  setLocation("/auth");
                  close();
                }}
              >
                Sign In
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileMenu;