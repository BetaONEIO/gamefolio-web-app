import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useMobileMenu } from "@/hooks/use-mobile-menu";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { X, Home, Compass, Flame, User, Settings, LogOut, MessageSquare, Trophy, ShoppingBag, Wallet } from "lucide-react";
import { GamefolioProfileIcon } from "@/components/icons/GamefolioProfileIcon";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CustomAvatar } from "@/components/ui/custom-avatar";
import gamefolioLogo from '@assets/gamefolio social logo 3d circle web.png';

const LEVEL_THRESHOLDS = [
  { level: 1, xpRequired: 0 },
  { level: 2, xpRequired: 100 },
  { level: 3, xpRequired: 500 },
  { level: 4, xpRequired: 1000 },
  { level: 5, xpRequired: 2000 },
  { level: 6, xpRequired: 3500 },
  { level: 7, xpRequired: 5500 },
  { level: 8, xpRequired: 8000 },
  { level: 9, xpRequired: 11000 },
  { level: 10, xpRequired: 15000 },
  { level: 11, xpRequired: 20000 },
  { level: 12, xpRequired: 26000 },
  { level: 13, xpRequired: 33000 },
  { level: 14, xpRequired: 41000 },
  { level: 15, xpRequired: 50000 },
];

function LevelProgressBar({ level, totalXP }: { level: number; totalXP: number }) {
  const currentThreshold = LEVEL_THRESHOLDS.find(t => t.level === level) || LEVEL_THRESHOLDS[0];
  const nextThreshold = LEVEL_THRESHOLDS.find(t => t.level === level + 1);
  
  const xpInCurrentLevel = totalXP - currentThreshold.xpRequired;
  const xpNeededForNextLevel = nextThreshold 
    ? nextThreshold.xpRequired - currentThreshold.xpRequired 
    : 0;
  const progress = nextThreshold 
    ? Math.min(100, (xpInCurrentLevel / xpNeededForNextLevel) * 100) 
    : 100;

  return (
    <div className="mt-3">
      <div className="flex justify-between items-center text-xs mb-1">
        <span className="text-primary font-semibold">Level {level}</span>
        <span className="text-muted-foreground">
          {xpInCurrentLevel} / {xpNeededForNextLevel} XP
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
    <div className="fixed inset-0 bg-black/50 z-50 flex">
      <div 
        id="mobile-menu-container"
        className="w-4/5 max-w-xs bg-card shadow-xl h-full transition-transform duration-300 transform"
        style={{ animation: 'slideIn 0.3s forwards' }}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-border flex justify-between items-center">
            <img 
              src={gamefolioLogo} 
              alt="Gamefolio Logo" 
              className="h-8 w-8 object-contain"
            />
            <Button variant="ghost" size="icon" onClick={close}>
              <X className="h-5 w-5" />
            </Button>
          </div>


          {/* User Profile */}
          {user && (
            <div className="p-4 border-b border-border">
              <div className="flex items-center">
                <CustomAvatar 
                  user={user}
                  size="md"
                  borderIntensity="normal"
                  showAvatarBorderOverlay={true}
                />
                <div className="ml-3">
                  <p className="font-medium">{user.displayName}</p>
                  <p className="text-xs text-muted-foreground">@{user.username}</p>
                </div>
              </div>
              {/* Level Progress Bar */}
              <LevelProgressBar level={user.level || 1} totalXP={user.totalPoints || 0} />
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
                  <Flame className="mr-3 h-5 w-5 text-primary" />
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
                    className="flex items-center p-2 rounded-md hover:bg-accent/10 transition-colors w-full text-left no-underline"
                  >
                    <GamefolioProfileIcon className="mr-3 h-5 w-5" />
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