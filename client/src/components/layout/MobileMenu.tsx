import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useMobileMenu } from "@/hooks/use-mobile-menu";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { X, Search, Home, Compass, Flame, User, Settings, LogOut, MessageSquare, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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
            <h2 className="text-lg font-bold">Menu</h2>
            <Button variant="ghost" size="icon" onClick={close}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Search Bar */}
          <div className="p-4 border-b border-border">
            <div className="relative">
              <Input
                type="text"
                placeholder="Search clips..."
                className="w-full pr-8"
              />
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>
          </div>

          {/* User Profile */}
          {user && (
            <div className="p-4 border-b border-border flex items-center">
              <Avatar className="w-10 h-10 border-2 border-accent">
                <AvatarImage src={user.avatarUrl || undefined} alt={user.displayName} />
                <AvatarFallback className="text-sm">
                  {user.displayName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="ml-3">
                <p className="font-medium">{user.displayName}</p>
                <p className="text-xs text-muted-foreground">@{user.username}</p>
              </div>
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
              {user && (user.messagingEnabled !== false && user.messaging_enabled !== false) && (
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
                    <User className="mr-3 h-5 w-5 text-primary" />
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
                      <User className="mr-3 h-5 w-5 text-muted-foreground" />
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
                variant="destructive" 
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