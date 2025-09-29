import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClipWithUser, Game, User, Screenshot } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import VideoClipCard from "@/components/clips/VideoClipCard";
import TrendingGameCard from "@/components/clips/TrendingGameCard";
import { Link, useLocation } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { UserPlus, Check, Search, FileImage, Film, Video } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface SearchResultsProps {
  query?: string;
}

const SearchResults = ({ query: initialQuery }: SearchResultsProps) => {
  const [activeTab, setActiveTab] = useState("all");
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  
  // Get current query from URL to make component reactive to URL changes
  const [currentQuery, setCurrentQuery] = useState("");
  
  // Update query when URL changes (including programmatic navigation from header)
  useEffect(() => {
    const updateQuery = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const urlQuery = urlParams.get('q') || initialQuery || "";
      console.log("SearchResults query updated:", urlQuery);
      setCurrentQuery(urlQuery);
    };
    
    // Initial load
    updateQuery();
    
    // Listen for URL changes (popstate for back/forward, custom event for programmatic changes)
    window.addEventListener('popstate', updateQuery);
    
    // Listen for pushstate/replacestate changes (for header navigation)
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;
    
    window.history.pushState = function(...args) {
      originalPushState.apply(window.history, args);
      setTimeout(updateQuery, 0);
    };
    
    window.history.replaceState = function(...args) {
      originalReplaceState.apply(window.history, args);
      setTimeout(updateQuery, 0);
    };
    
    return () => {
      window.removeEventListener('popstate', updateQuery);
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
    };
  }, [initialQuery]);
  
  // Use currentQuery instead of the prop
  const query = currentQuery;

  const { data: clipResults, isLoading: isLoadingClips } = useQuery<ClipWithUser[]>({
    queryKey: [`/api/search/clips?q=${encodeURIComponent(query)}`],
    enabled: !!query && query.trim().length > 0,
  });

  const { data: reelResults, isLoading: isLoadingReels } = useQuery<ClipWithUser[]>({
    queryKey: [`/api/search/reels?q=${encodeURIComponent(query)}`],
    enabled: !!query && query.trim().length > 0,
  });

  const { data: screenshotResults, isLoading: isLoadingScreenshots } = useQuery<Screenshot[]>({
    queryKey: [`/api/search/screenshots?q=${encodeURIComponent(query)}`],
    enabled: !!query && query.trim().length > 0,
  });

  const { data: userResults, isLoading: isLoadingUsers } = useQuery<User[]>({
    queryKey: [`/api/search/users?q=${encodeURIComponent(query)}`],
    enabled: !!query && query.trim().length > 0,
  });

  const { data: gameResults, isLoading: isLoadingGames } = useQuery<Game[]>({
    queryKey: [`/api/search/games?q=${encodeURIComponent(query)}`],
    enabled: !!query && query.trim().length > 0,
  });

  const isLoading = isLoadingClips || isLoadingReels || isLoadingScreenshots || isLoadingUsers || isLoadingGames;
  const hasResults = 
    (clipResults && clipResults.length > 0) || 
    (reelResults && reelResults.length > 0) ||
    (screenshotResults && screenshotResults.length > 0) ||
    (userResults && userResults.length > 0) || 
    (gameResults && gameResults.length > 0);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 flex items-center">
        <Search className="mr-2 h-5 w-5" />
        Search results for "{query}"
      </h1>

      <Tabs defaultValue="all" onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="all">All results</TabsTrigger>
          <TabsTrigger value="clips" className="flex items-center gap-2">
            <Video className="h-4 w-4" />
            Clips
          </TabsTrigger>
          <TabsTrigger value="reels" className="flex items-center gap-2">
            <Film className="h-4 w-4" />
            Reels
          </TabsTrigger>
          <TabsTrigger value="screenshots" className="flex items-center gap-2">
            <FileImage className="h-4 w-4" />
            Screenshots
          </TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="games">Games</TabsTrigger>
        </TabsList>

        {isLoading ? (
          <div className="space-y-8">
            {Array(3).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : !hasResults ? (
          <div className="text-center py-10">
            <Search className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h2 className="text-xl font-semibold mb-2">No results found</h2>
            <p className="text-muted-foreground mb-6">
              We couldn't find any clips, reels, screenshots, users, or games matching "{query}"
            </p>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Try:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Checking your spelling</li>
                <li>• Using different keywords</li>
                <li>• Searching for hashtags with #</li>
              </ul>
            </div>
            <Button 
              onClick={() => setLocation("/explore")}
              className="mt-6"
            >
              Browse Explore Page
            </Button>
          </div>
        ) : (
          <>
            <TabsContent value="all">
              {/* Users section */}
              {userResults && userResults.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-xl font-semibold mb-4">Users</h2>
                  <div className="space-y-4">
                    {userResults.slice(0, 3).map((user) => (
                      <UserResultCard key={user.id} user={user} />
                    ))}
                    {userResults.length > 3 && (
                      <div className="text-center mt-4">
                        <Button 
                          variant="outline"
                          onClick={() => setActiveTab("users")}
                        >
                          View all {userResults.length} users
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Games section */}
              {gameResults && gameResults.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-xl font-semibold mb-4">Games</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {gameResults.slice(0, 4).map((game) => (
                      <TrendingGameCard key={game.id} game={game} />
                    ))}
                  </div>
                  {gameResults.length > 4 && (
                    <div className="text-center mt-4">
                      <Button 
                        variant="outline"
                        onClick={() => setActiveTab("games")}
                      >
                        View all {gameResults.length} games
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Clips section */}
              {clipResults && clipResults.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-xl font-semibold mb-4">Clips</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {clipResults.slice(0, 4).map((clip) => (
                      <VideoClipCard key={clip.id} clip={clip} userId={user?.id || 0} clipsList={clipResults} />
                    ))}
                  </div>
                  {clipResults.length > 4 && (
                    <div className="text-center mt-4">
                      <Button 
                        variant="outline"
                        onClick={() => setActiveTab("clips")}
                      >
                        View all {clipResults.length} clips
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Reels section */}
              {reelResults && reelResults.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-xl font-semibold mb-4">Reels</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {reelResults.slice(0, 4).map((reel) => (
                      <VideoClipCard key={reel.id} clip={reel} userId={user?.id || 0} clipsList={reelResults} />
                    ))}
                  </div>
                  {reelResults.length > 4 && (
                    <div className="text-center mt-4">
                      <Button 
                        variant="outline"
                        onClick={() => setActiveTab("reels")}
                      >
                        View all {reelResults.length} reels
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Screenshots section */}
              {screenshotResults && screenshotResults.length > 0 && (
                <div>
                  <h2 className="text-xl font-semibold mb-4">Screenshots</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {screenshotResults.slice(0, 6).map((screenshot) => (
                      <div key={screenshot.id} className="bg-card rounded-lg overflow-hidden">
                        <img 
                          src={screenshot.imageUrl} 
                          alt={screenshot.title}
                          className="w-full h-48 object-cover"
                        />
                        <div className="p-4">
                          <h3 className="font-semibold text-sm mb-1">{screenshot.title}</h3>
                          {screenshot.description && (
                            <p className="text-muted-foreground text-xs line-clamp-2">{screenshot.description}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  {screenshotResults.length > 6 && (
                    <div className="text-center mt-4">
                      <Button 
                        variant="outline"
                        onClick={() => setActiveTab("screenshots")}
                      >
                        View all {screenshotResults.length} screenshots
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="clips">
              {clipResults && clipResults.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {clipResults.map((clip) => (
                    <VideoClipCard key={clip.id} clip={clip} userId={user?.id || 0} clipsList={clipResults} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Video className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">No clips found matching "{query}"</p>
                  <p className="text-sm text-muted-foreground mt-2">Try searching for different keywords or hashtags</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="reels">
              {reelResults && reelResults.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {reelResults.map((reel) => (
                    <VideoClipCard key={reel.id} clip={reel} userId={user?.id || 0} clipsList={reelResults} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Film className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">No reels found matching "{query}"</p>
                  <p className="text-sm text-muted-foreground mt-2">Try searching for different keywords or hashtags</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="screenshots">
              {screenshotResults && screenshotResults.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {screenshotResults.map((screenshot) => (
                    <div key={screenshot.id} className="bg-card rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                      <img 
                        src={screenshot.imageUrl} 
                        alt={screenshot.title}
                        className="w-full h-48 object-cover"
                        loading="lazy"
                      />
                      <div className="p-4">
                        <h3 className="font-semibold text-sm mb-1">{screenshot.title}</h3>
                        {screenshot.description && (
                          <p className="text-muted-foreground text-xs line-clamp-2">{screenshot.description}</p>
                        )}
                        {screenshot.tags && screenshot.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {screenshot.tags.slice(0, 3).map((tag) => (
                              <span key={tag} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileImage className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">No screenshots found matching "{query}"</p>
                  <p className="text-sm text-muted-foreground mt-2">Try searching for different keywords or hashtags</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="users">
              {userResults && userResults.length > 0 ? (
                <div className="space-y-4">
                  {userResults.map((user) => (
                    <UserResultCard key={user.id} user={user} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No users found matching "{query}"</p>
                  <p className="text-sm text-muted-foreground mt-2">Try searching for different usernames or display names</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="games">
              {gameResults && gameResults.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {gameResults.map((game) => (
                    <TrendingGameCard key={game.id} game={game} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No games found matching "{query}"</p>
                  <p className="text-sm text-muted-foreground mt-2">Try searching for different game titles</p>
                </div>
              )}
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
};

interface UserResultCardProps {
  user: User;
}

const UserResultCard = ({ user }: UserResultCardProps) => {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  
  // Check if current user is following this user
  const { data: isFollowing = false } = useQuery<boolean>({
    queryKey: [`/api/users/${user.id}/following/check`],
    enabled: !!currentUser?.id,
  });

  const followMutation = useMutation({
    mutationFn: async () => {
      if (isFollowing) {
        await apiRequest("DELETE", `/api/users/${user.id}/follow`);
      } else {
        await apiRequest("POST", `/api/users/${user.id}/follow`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user.id}/following/check`] });
      toast({
        description: isFollowing ? `Unfollowed ${user.displayName}` : `Following ${user.displayName}`,
        variant: "gamefolioSuccess",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update follow status",
        variant: "destructive",
      });
    },
  });

  const handleFollow = () => {
    if (!currentUser) {
      toast({
        title: "Authentication Required",
        description: "Please log in to follow users",
        variant: "destructive",
      });
      return;
    }
    followMutation.mutate();
  };

  return (
    <div className="bg-card rounded-lg p-4 flex items-center justify-between">
      <Link href={`/profile/${user.username}`}>
        <a className="flex items-center group">
          <Avatar className="h-12 w-12">
            <AvatarImage 
              src={user.avatarUrl || undefined} 
              alt={user.displayName} 
            />
            <AvatarFallback>
              {user.displayName[0]}
            </AvatarFallback>
          </Avatar>
          <div className="ml-3">
            <h3 className="font-semibold group-hover:text-primary transition-colors">
              {user.displayName}
            </h3>
            <p className="text-muted-foreground text-sm">@{user.username}</p>
          </div>
        </a>
      </Link>
      
      <Button 
        variant={isFollowing ? "secondary" : "default"}
        size="sm"
        onClick={handleFollow}
        disabled={followMutation.isPending || !currentUser}
      >
        {isFollowing ? (
          <>
            <Check className="mr-1 h-4 w-4" /> Following
          </>
        ) : (
          <>
            <UserPlus className="mr-1 h-4 w-4" /> Follow
          </>
        )}
      </Button>
    </div>
  );
};

export default SearchResults;
