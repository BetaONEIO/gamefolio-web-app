import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, User as UserIcon, Settings, LogOut, CheckCircle2, Palette, UserCog, Menu, ShieldCheck } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useMobileMenu } from "@/hooks/use-mobile-menu";
import { useMobile } from "@/hooks/use-mobile";
import { useQuery } from "@tanstack/react-query";
import { User, Game } from "@shared/schema";

import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { NotificationBell } from "@/components/notifications/NotificationBell";

const Header = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const { user, logoutMutation } = useAuth();
  const { toggle } = useMobileMenu();
  const isMobile = useMobile();
  const [, setLocation] = useLocation();
  const searchRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLDivElement>(null);

  // Debounce search query for dropdown
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);

  // Search users for dropdown
  const { data: userResults } = useQuery<User[]>({
    queryKey: ['/api/search/users', debouncedQuery],
    queryFn: async () => {
      const response = await fetch(`/api/search/users?q=${encodeURIComponent(debouncedQuery)}`);
      if (!response.ok) throw new Error("Failed to search users");
      return await response.json();
    },
    enabled: !!debouncedQuery && debouncedQuery.length >= 2,
  });

  // Search games for dropdown
  const { data: gameResults } = useQuery<Game[]>({
    queryKey: ['/api/search/games', debouncedQuery],
    queryFn: async () => {
      const response = await fetch(`/api/search/games?q=${encodeURIComponent(debouncedQuery)}`);
      if (!response.ok) throw new Error("Failed to search games");
      return await response.json();
    },
    enabled: !!debouncedQuery && debouncedQuery.length >= 2,
  });

  // Handle clicks outside search to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
      // Don't auto-close mobile search on outside clicks - user must use Cancel button
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      const isHashtag = searchQuery.startsWith('#');
      if (isHashtag) {
        // For hashtag searches, route to dedicated hashtag page
        setLocation(`/hashtag/${encodeURIComponent(searchQuery.slice(1))}`);
      } else {
        setLocation(`/explore?q=${encodeURIComponent(searchQuery)}`);
      }
      setShowDropdown(false);
      setShowMobileSearch(false);
      setSearchQuery("");
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    setShowDropdown(value.length >= 2);
  };

  const handleUserSelect = (username: string) => {
    setLocation(`/profile/${username}`);
    setShowDropdown(false);
    setShowMobileSearch(false);
    setSearchQuery("");
  };

  const handleGameSelect = (gameId: number, gameName: string) => {
    // Create a URL-safe slug from the game name to match explore page behavior
    const gameSlug = gameName.toLowerCase().replace(/[^a-z0-9]/g, '');
    setLocation(`/games/${gameSlug}`);
    setShowDropdown(false);
    setShowMobileSearch(false);
    setSearchQuery("");
  };

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const getInitials = (name: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .filter(word => word.length > 0)
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'U';
  };

  return (
    <header className="bg-card shadow-md sticky top-0 z-50 w-full">
      <div className="w-full px-3 sm:px-4 lg:px-8 py-3 sm:py-4 md:py-6 flex items-center justify-between">
        {/* Header left section */}
        <div className="flex items-center">
          {/* Mobile Menu Button - positioned before logo */}
          {isMobile && (
            <Button
              variant="ghost"
              size="icon"
              className="mr-2 p-2"
              onClick={toggle}
              aria-label="Menu"
              data-testid="mobile-menu-button"
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}
          
          {/* Logo */}
          <Link href="/">
            <div className="flex items-center">
              <img
                src="/attached_assets/Gamefolio logo copy.png"
                alt="Gamefolio"
                className="h-8 sm:h-10 md:h-12 xl:h-16 w-auto"
              />
            </div>
          </Link>
        </div>

        {/* Search Bar with Dropdown */}
        <div
          ref={searchRef}
          className="w-full max-w-2xl xl:max-w-3xl mx-6 relative hidden md:block"
        >
          <form onSubmit={handleSearch}>
            <Input
              type="text"
              placeholder="Search #hashtags, users, games..."
              className="w-full py-6 px-10 pr-20 rounded-full bg-secondary text-foreground text-3xl"
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={() => searchQuery.length >= 2 && setShowDropdown(true)}
            />
            <Button
              type="submit"
              variant="ghost"
              size="icon"
              className="absolute right-6 top-1/2 transform -translate-y-1/2 text-muted-foreground"
            >
              <Search className="h-8 w-8" />
            </Button>
          </form>

          {/* Search Dropdown */}
          {showDropdown && (searchQuery.startsWith('#') || (userResults && userResults.length > 0) || (gameResults && gameResults.length > 0)) && (
            <div className="absolute top-full mt-2 w-full bg-card border border-border rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
              <div className="p-2">
                {/* Hashtag Section */}
                {searchQuery.startsWith('#') && searchQuery.length > 1 && (
                  <>
                    <div className="text-xs text-muted-foreground px-3 py-2 font-medium">Hashtags</div>
                    <button
                      onClick={() => {
                        setLocation(`/hashtag/${encodeURIComponent(searchQuery.slice(1))}`);
                        setShowDropdown(false);
                        setSearchQuery("");
                      }}
                      className="w-full flex items-center gap-3 px-3 py-3 rounded-md hover:bg-secondary transition-colors text-left"
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                        #
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-foreground block truncate">{searchQuery}</span>
                        <div className="text-sm text-muted-foreground">Search for clips with this hashtag</div>
                      </div>
                    </button>
                  </>
                )}

                {/* Games Section */}
                {gameResults && gameResults.length > 0 && (
                  <>
                    {searchQuery.startsWith('#') && <div className="border-t border-border my-2"></div>}
                    <div className="text-xs text-muted-foreground px-3 py-2 font-medium">Games</div>
                    {gameResults.slice(0, 3).map((game) => (
                      <button
                        key={game.id}
                        onClick={() => handleGameSelect(game.id, game.name)}
                        className="w-full flex items-center gap-3 px-3 py-3 rounded-md hover:bg-secondary transition-colors text-left"
                      >
                        <div className="w-8 h-8 rounded-md overflow-hidden bg-secondary flex-shrink-0">
                          {game.imageUrl ? (
                            <img
                              src={game.imageUrl}
                              alt={game.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs">
                              {getInitials(game.name)}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-foreground block truncate">{game.name}</span>
                          <div className="text-sm text-muted-foreground">Game</div>
                        </div>
                      </button>
                    ))}
                  </>
                )}

                {/* Users Section */}
                {userResults && userResults.length > 0 && (
                  <>
                    {((gameResults && gameResults.length > 0) || searchQuery.startsWith('#')) && <div className="border-t border-border my-2"></div>}
                    <div className="text-xs text-muted-foreground px-3 py-2 font-medium">Users</div>
                    {userResults.slice(0, 3).map((user) => (
                      <button
                        key={user.id}
                        onClick={() => handleUserSelect(user.username)}
                        className="w-full flex items-center gap-3 px-3 py-3 rounded-md hover:bg-secondary transition-colors text-left"
                      >
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                          {getInitials(user.displayName)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground">{user.displayName}</span>
                            {user.emailVerified && (
                              <CheckCircle2 className="h-3 w-3 text-primary" />
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">@{user.username}</div>
                        </div>
                      </button>
                    ))}
                  </>
                )}

                {/* View All Results */}
                {((userResults && userResults.length > 3) || (gameResults && gameResults.length > 3)) && (
                  <>
                    <div className="border-t border-border my-2"></div>
                    <button
                      onClick={() => {
                        setLocation(`/explore?q=${encodeURIComponent(searchQuery)}`);
                        setShowDropdown(false);
                      }}
                      className="w-full px-3 py-2 text-sm text-primary hover:bg-secondary rounded-md transition-colors text-center"
                    >
                      View all results
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Actions */}
        <div className="flex items-center">
          {/* Mobile Search Button */}
          {isMobile && (
            <Button
              variant="ghost"
              size="icon"
              className="mr-2 p-2 touch-manipulation"
              onClick={() => setShowMobileSearch(true)}
              aria-label="Search"
              data-testid="mobile-search-button"
            >
              <Search className="h-5 w-5" />
            </Button>
          )}
          
          
          {user ? (
            <>
              <NotificationBell />
              <Link href="/upload">
                <Button 
                  className="ml-2 sm:ml-4 flex items-center px-3 sm:px-6 py-2 sm:py-3 text-sm sm:text-lg transition-all duration-300 bg-primary hover:bg-primary/90 border-primary shadow-[0_0_0_1px_hsl(var(--primary)/0.4),0_2px_8px_hsl(var(--primary)/0.13)]"
                >
                  <Plus className="mr-1 sm:mr-3 h-4 w-4 sm:h-6 sm:w-6" />
                  <span className="hidden sm:inline">Upload</span>
                </Button>
              </Link>

              <div className="relative">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="ml-2 sm:ml-4 p-1 h-auto hover:bg-transparent">
                      <Avatar 
                        className="w-10 h-10 sm:w-12 sm:h-12 md:w-8 md:h-8 lg:w-10 lg:h-10 xl:w-12 xl:h-12 border-2 transition-all duration-300 border-primary shadow-[0_0_0_2px_hsl(var(--primary)/0.4),0_0_15px_hsl(var(--primary)/0.2)]"
                      >
                        <AvatarImage src={user.avatarUrl || undefined} alt={user.displayName} />
                        <AvatarFallback className="text-xs sm:text-sm">
                          {getInitials(user.displayName)}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 mt-2">
                    <div className="px-4 py-3 border-b">
                      <div className="flex items-center">
                        <p className="text-sm font-medium">{user.displayName}</p>
                      </div>
                      <p className="text-sm text-muted-foreground">@{user.username}</p>
                    </div>

                    <DropdownMenuItem
                      className="cursor-pointer"
                      onClick={() => setLocation(`/profile/${user.username}`)}
                    >
                      <UserIcon className="mr-2 h-4 w-4" />
                      <span>View Profile</span>
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                      <DropdownMenuLabel className="text-xs font-medium text-muted-foreground px-2 pt-0">
                        Settings
                      </DropdownMenuLabel>
                      <DropdownMenuItem
                        className="cursor-pointer"
                        onClick={() => setLocation("/account/settings")}
                      >
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Account Settings</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="cursor-pointer"
                        onClick={() => setLocation("/settings/profile")}
                      >
                        <UserCog className="mr-2 h-4 w-4" />
                        <span>Profile & Appearance</span>
                      </DropdownMenuItem>
                    </DropdownMenuGroup>

                    <DropdownMenuSeparator />
                    {user.role === "admin" && (
                      <DropdownMenuItem onClick={() => window.location.href = "/admin"}>
                        <ShieldCheck className="mr-2 h-4 w-4" />
                        Admin Panel
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      onClick={handleLogout}
                      className="text-red-600 focus:text-red-600"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </>
          ) : (
            <Link href="/auth">
              <Button className="ml-3">Sign In</Button>
            </Link>
          )}
        </div>
      </div>
      
      {/* Mobile Search Overlay */}
      {showMobileSearch && (
        <div className="fixed inset-0 bg-black/50 z-50 md:hidden flex flex-col">
          <div className="bg-card w-full p-4 shadow-lg safe-area-top">
            <div
              ref={mobileSearchRef}
              className="relative max-w-full"
            >
              <form onSubmit={handleSearch} className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <Input
                    type="text"
                    placeholder="Search #hashtags, users, games..."
                    className="w-full py-3 px-4 pr-12 rounded-lg bg-secondary text-foreground text-base"
                    value={searchQuery}
                    onChange={handleSearchChange}
                    onFocus={() => searchQuery.length >= 2 && setShowDropdown(true)}
                    autoFocus
                    inputMode="search"
                    data-testid="mobile-search-input"
                  />
                  <Button
                    type="submit"
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-muted-foreground"
                  >
                    <Search className="h-5 w-5" />
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setShowMobileSearch(false);
                    setShowDropdown(false);
                    setSearchQuery("");
                  }}
                  className="text-muted-foreground touch-manipulation min-w-[60px] px-3"
                  data-testid="mobile-search-close"
                >
                  Cancel
                </Button>
              </form>

              {/* Mobile Search Dropdown */}
              {showDropdown && (searchQuery.startsWith('#') || (userResults && userResults.length > 0) || (gameResults && gameResults.length > 0)) && (
                <div className="absolute top-full mt-2 w-full bg-card border border-border rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto left-0 right-0">
                  <div className="p-2">
                    {/* Hashtag Section */}
                    {searchQuery.startsWith('#') && searchQuery.length > 1 && (
                      <>
                        <div className="text-xs text-muted-foreground px-3 py-2 font-medium">Hashtags</div>
                        <button
                          onClick={() => {
                            setLocation(`/hashtag/${encodeURIComponent(searchQuery.slice(1))}`);
                            setShowDropdown(false);
                            setShowMobileSearch(false);
                            setSearchQuery("");
                          }}
                          className="w-full flex items-center gap-3 px-3 py-3 rounded-md hover:bg-secondary transition-colors text-left"
                        >
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                            #
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="font-medium text-foreground block truncate">{searchQuery}</span>
                            <div className="text-sm text-muted-foreground">Search for clips with this hashtag</div>
                          </div>
                        </button>
                      </>
                    )}

                    {/* Games Section */}
                    {gameResults && gameResults.length > 0 && (
                      <>
                        {searchQuery.startsWith('#') && <div className="border-t border-border my-2"></div>}
                        <div className="text-xs text-muted-foreground px-3 py-2 font-medium">Games</div>
                        {gameResults.slice(0, 3).map((game) => (
                          <button
                            key={game.id}
                            onClick={() => handleGameSelect(game.id, game.name)}
                            className="w-full flex items-center gap-3 px-3 py-3 rounded-md hover:bg-secondary transition-colors text-left"
                          >
                            <div className="w-8 h-8 rounded-md overflow-hidden bg-secondary flex-shrink-0">
                              {game.imageUrl ? (
                                <img
                                  src={game.imageUrl}
                                  alt={game.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs">
                                  {getInitials(game.name)}
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="font-medium text-foreground block truncate">{game.name}</span>
                              <div className="text-sm text-muted-foreground">Game</div>
                            </div>
                          </button>
                        ))}
                      </>
                    )}

                    {/* Users Section */}
                    {userResults && userResults.length > 0 && (
                      <>
                        {((gameResults && gameResults.length > 0) || searchQuery.startsWith('#')) && <div className="border-t border-border my-2"></div>}
                        <div className="text-xs text-muted-foreground px-3 py-2 font-medium">Users</div>
                        {userResults.slice(0, 3).map((user) => (
                          <button
                            key={user.id}
                            onClick={() => handleUserSelect(user.username)}
                            className="w-full flex items-center gap-3 px-3 py-3 rounded-md hover:bg-secondary transition-colors text-left"
                          >
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                              {getInitials(user.displayName)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-foreground">{user.displayName}</span>
                                {user.emailVerified && (
                                  <CheckCircle2 className="h-3 w-3 text-primary" />
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground">@{user.username}</div>
                            </div>
                          </button>
                        ))}
                      </>
                    )}

                    {/* View All Results */}
                    {((userResults && userResults.length > 3) || (gameResults && gameResults.length > 3)) && (
                      <>
                        <div className="border-t border-border my-2"></div>
                        <button
                          onClick={() => {
                            setLocation(`/explore?q=${encodeURIComponent(searchQuery)}`);
                            setShowDropdown(false);
                            setShowMobileSearch(false);
                          }}
                          className="w-full px-3 py-2 text-sm text-primary hover:bg-secondary rounded-md transition-colors text-center"
                        >
                          View all results
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;