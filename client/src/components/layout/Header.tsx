import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Settings, LogOut, CheckCircle2, Palette, UserCog, Menu, ShieldCheck, Flame, Trophy, Crown, Video, Film, Camera, Gift } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useMobileMenu } from "@/hooks/use-mobile-menu";
import { useMobile } from "@/hooks/use-mobile";
import { useQuery } from "@tanstack/react-query";
import { User, Game } from "@shared/schema";
import { GamefolioProfileIcon } from "@/components/icons/GamefolioProfileIcon";


import { CustomAvatar } from "@/components/ui/custom-avatar";
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
import { LootboxDialog, LootboxTrigger } from "@/components/lootbox/LootboxDialog";
import { ModeratorBadge } from "@/components/ui/moderator-badge";
import { ProBadge } from "@/components/ui/pro-badge";
import { LevelTrackerModal } from "@/components/level/LevelTrackerModal";
import { useRevenueCat } from "@/hooks/use-revenuecat";
import { useLevelTracker } from "@/hooks/use-level-tracker";
import ProUpgradeDialog from "@/components/ProUpgradeDialog";
import ManageProDialog from "@/components/ManageProDialog";

const Header = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [lootboxOpen, setLootboxOpen] = useState(false);
  const [levelTrackerOpen, setLevelTrackerOpen] = useState(false);

  useEffect(() => {
    const handleOpenLootbox = () => setLootboxOpen(true);
    const handleOpenProUpgrade = () => setProUpgradeOpen(true);
    window.addEventListener('open-lootbox', handleOpenLootbox);
    window.addEventListener('open-pro-upgrade', handleOpenProUpgrade);
    return () => {
      window.removeEventListener('open-lootbox', handleOpenLootbox);
      window.removeEventListener('open-pro-upgrade', handleOpenProUpgrade);
    };
  }, []);
  const [proUpgradeOpen, setProUpgradeOpen] = useState(false);
  const [manageProOpen, setManageProOpen] = useState(false);
  const { user, logoutMutation } = useAuth();
  const { isPro } = useRevenueCat();
  const { state: levelTrackerState, hideLevelTracker } = useLevelTracker();
  
  const isLevelTrackerOpen = levelTrackerOpen || levelTrackerState.isOpen;
  const handleLevelTrackerClose = (open: boolean) => {
    setLevelTrackerOpen(open);
    if (!open) hideLevelTracker();
  };
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
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      const isInsideDesktopSearch = searchRef.current && searchRef.current.contains(target);
      const isInsideMobileSearch = mobileSearchRef.current && mobileSearchRef.current.contains(target);
      if (!isInsideDesktopSearch && !isInsideMobileSearch) {
        setShowDropdown(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
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
    const gameSlug = gameName
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .replace(/^-+|-+$/g, '');
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
                    {userResults.slice(0, 3).map((searchUser) => (
                      <button
                        key={searchUser.id}
                        onClick={() => handleUserSelect(searchUser.username)}
                        className="w-full flex items-center gap-3 px-3 py-3 rounded-md hover:bg-secondary transition-colors text-left"
                      >
                        <CustomAvatar 
                          user={searchUser}
                          size="sm"
                          borderIntensity="subtle"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-foreground">{searchUser.displayName}</span>
                            <ModeratorBadge 
                              isModerator={(searchUser.role === "moderator" || searchUser.role === "admin") && !searchUser.selectedVerificationBadgeId} 
                              size="sm" 
                            />
                            <ProBadge selectedVerificationBadgeId={searchUser.selectedVerificationBadgeId} size="sm" />
                          </div>
                          <div className="text-sm text-muted-foreground">@{searchUser.username}</div>
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
              <LootboxTrigger onClick={() => setLootboxOpen(true)} />
              <NotificationBell />
              <LootboxDialog open={lootboxOpen} onOpenChange={setLootboxOpen} />
              <LevelTrackerModal 
                open={isLevelTrackerOpen} 
                onOpenChange={handleLevelTrackerClose}
                level={user?.level || 1}
                totalXP={user?.totalXP || 0}
                username={user?.username}
                xpDelta={levelTrackerState.xpDelta}
                previousXP={levelTrackerState.previousXP}
              />
              <ProUpgradeDialog 
                open={proUpgradeOpen} 
                onOpenChange={setProUpgradeOpen}
              />
              <ManageProDialog 
                open={manageProOpen} 
                onOpenChange={setManageProOpen}
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    className="ml-2 sm:ml-4 flex items-center px-3 sm:px-6 py-2 sm:py-3 text-sm sm:text-lg transition-all duration-300 bg-primary hover:bg-primary/90 border-primary shadow-[0_0_0_1px_hsl(var(--primary)/0.4),0_2px_8px_hsl(var(--primary)/0.13)]"
                  >
                    <Plus className="mr-1 sm:mr-3 h-4 w-4 sm:h-6 sm:w-6" />
                    <span className="hidden sm:inline">Upload</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 mt-2">
                  <DropdownMenuItem onClick={() => { window.dispatchEvent(new CustomEvent('upload-type-change', { detail: 'clips' })); setLocation('/upload?type=clips'); }} className="cursor-pointer">
                    <Video className="h-4 w-4 mr-2" />
                    Upload Clip
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { window.dispatchEvent(new CustomEvent('upload-type-change', { detail: 'reels' })); setLocation('/upload?type=reels'); }} className="cursor-pointer">
                    <Film className="h-4 w-4 mr-2" />
                    Upload Reel
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { window.dispatchEvent(new CustomEvent('upload-type-change', { detail: 'screenshots' })); setLocation('/upload?type=screenshots'); }} className="cursor-pointer">
                    <Camera className="h-4 w-4 mr-2" />
                    Upload Screenshot
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="relative">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="ml-2 sm:ml-4 p-1 h-auto hover:bg-transparent">
                      <CustomAvatar 
                        user={user}
                        size="md"
                        borderIntensity="normal"
                        showAvatarBorderOverlay={true}
                      />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 mt-2">
                    <div className="px-3 py-4 border-b">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 flex-shrink-0">
                            <CustomAvatar 
                              user={user}
                              size="md"
                              borderIntensity="normal"
                              showAvatarBorderOverlay={true}
                            />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{user.displayName && user.displayName.length > 12 ? user.displayName.slice(0, 12) + '…' : user.displayName}</p>
                            <p className="text-sm text-muted-foreground">@{user.username}</p>
                          </div>
                        </div>
                        {user.currentStreak && user.currentStreak > 0 && (
                          <div className="flex items-center gap-1 bg-orange-500/10 px-2 py-1 rounded-md" title="Daily login streak">
                            <Flame className="h-4 w-4 text-orange-500" />
                            <span className="text-sm font-semibold text-orange-500">{user.currentStreak}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <DropdownMenuItem
                      className="cursor-pointer"
                      onClick={() => setLocation(`/profile/${user.username}`)}
                    >
                      <GamefolioProfileIcon className="mr-2 h-4 w-4" />
                      <span>View Gamefolio</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onClick={() => setLocation("/level-tracker")}
                      data-testid="button-level-tracker"
                    >
                      <Trophy className="mr-2 h-4 w-4" />
                      <span>Level Tracker</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onClick={() => setLocation("/account-settings?tab=referral")}
                      data-testid="button-referral"
                    >
                      <Gift className="mr-2 h-4 w-4" />
                      <span>Refer a Friend</span>
                    </DropdownMenuItem>
                    
                    {!(isPro || user?.isPro || (user?.proSubscriptionEndDate && new Date(user.proSubscriptionEndDate) > new Date())) && (
                      <DropdownMenuItem
                        className="cursor-pointer text-white"
                        style={{ background: 'linear-gradient(to right, #4ADE80 0%, rgba(30, 41, 59, 0) 70%)' }}
                        onClick={() => setProUpgradeOpen(true)}
                        data-testid="button-go-pro"
                      >
                        <img src="/attached_assets/Gamefolio logo copy.png" alt="Gamefolio" className="mr-2 h-4 w-4 rounded-full object-cover" />
                        <span>Go Pro</span>
                      </DropdownMenuItem>
                    )}
                    
                    {(isPro || user?.isPro || (user?.proSubscriptionEndDate && new Date(user.proSubscriptionEndDate) > new Date())) && (
                      <DropdownMenuItem
                        className="cursor-pointer"
                        onClick={() => setManageProOpen(true)}
                        data-testid="button-manage-pro"
                      >
                        <Crown className="mr-2 h-4 w-4 text-yellow-500" />
                        <span>Manage Pro Subscription</span>
                      </DropdownMenuItem>
                    )}

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
                      <DropdownMenuItem
                        className="cursor-pointer"
                        onClick={() => setLocation("/admin")}
                      >
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
        <div className="fixed inset-0 bg-black/50 z-50 md:hidden flex flex-col pointer-events-none">
          <div className="bg-card w-full p-4 shadow-lg safe-area-top pointer-events-auto">
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
                          className="w-full flex items-center gap-3 px-3 py-3 rounded-md hover:bg-secondary transition-colors text-left touch-manipulation active:bg-secondary/50"
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
                            className="w-full flex items-center gap-3 px-3 py-3 rounded-md hover:bg-secondary transition-colors text-left touch-manipulation active:bg-secondary/50"
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
                        {userResults.slice(0, 3).map((searchUser) => (
                          <button
                            key={searchUser.id}
                            onClick={() => handleUserSelect(searchUser.username)}
                            className="w-full flex items-center gap-3 px-3 py-3 rounded-md hover:bg-secondary transition-colors text-left touch-manipulation active:bg-secondary/50"
                          >
                            <CustomAvatar 
                              user={searchUser}
                              size="sm"
                              borderIntensity="subtle"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1">
                                <span className="font-medium text-foreground">{searchUser.displayName}</span>
                                <ModeratorBadge 
                                  isModerator={(searchUser.role === "moderator" || searchUser.role === "admin") && !searchUser.selectedVerificationBadgeId} 
                                  size="sm" 
                                />
                                <ProBadge selectedVerificationBadgeId={searchUser.selectedVerificationBadgeId} size="sm" />
                              </div>
                              <div className="text-sm text-muted-foreground">@{searchUser.username}</div>
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
                          className="w-full px-3 py-2 text-sm text-primary hover:bg-secondary rounded-md transition-colors text-center touch-manipulation active:bg-secondary/50"
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