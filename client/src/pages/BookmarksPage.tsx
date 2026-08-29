import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArrowLeft, Bookmark, Film, Camera, Clapperboard, Gamepad2, ChevronDown, LayoutGrid } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useMobile } from "@/hooks/use-mobile";
import { useClipDialog } from "@/hooks/use-clip-dialog";
import { getQueryFn } from "@/lib/queryClient";
import { ClipWithUser, Game } from "@shared/schema";
import VideoClipGridItem from "@/components/clips/VideoClipGridItem";
import { ScreenshotCard } from "@/components/screenshots/ScreenshotCard";
import { ScreenshotLightbox } from "@/components/screenshots/ScreenshotLightbox";
import { MobileScreenshotsViewer } from "@/components/screenshots/MobileScreenshotsViewer";
import TrendingGameCard from "@/components/clips/TrendingGameCard";

interface BookmarkedClip {
  id: number;
  contentType: 'clip';
  contentId: number;
  createdAt: string;
  content: ClipWithUser;
}

interface BookmarkedScreenshot {
  id: number;
  contentType: 'screenshot';
  contentId: number;
  createdAt: string;
  content: any;
}

interface BookmarkedGame {
  id: number;
  contentType: 'game';
  contentId: number;
  createdAt: string;
  content: Game;
}

type BookmarkEntry = BookmarkedClip | BookmarkedScreenshot | BookmarkedGame;

type FilterOption = 'all' | 'clips' | 'reels' | 'screenshots' | 'games';

const FILTER_OPTIONS: { value: FilterOption; label: string; icon: typeof LayoutGrid }[] = [
  { value: 'all', label: 'All', icon: LayoutGrid },
  { value: 'clips', label: 'Clips', icon: Film },
  { value: 'reels', label: 'Reels', icon: Clapperboard },
  { value: 'screenshots', label: 'Screenshots', icon: Camera },
  { value: 'games', label: 'Games', icon: Gamepad2 },
];

export default function BookmarksPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const isMobile = useMobile();
  const { openClipDialog } = useClipDialog();
  const [filter, setFilter] = useState<FilterOption>('all');
  const [selectedScreenshot, setSelectedScreenshot] = useState<any>(null);

  const { data: bookmarks, isLoading } = useQuery<BookmarkEntry[]>({
    queryKey: ['/api/bookmarks'],
    queryFn: getQueryFn({ on401: 'returnNull' }),
    enabled: !!user,
  });

  const clipBookmarks = (bookmarks || []).filter(
    (b): b is BookmarkedClip => b.contentType === 'clip' && !!b.content && b.content.videoType !== 'reel'
  );
  const reelBookmarks = (bookmarks || []).filter(
    (b): b is BookmarkedClip => b.contentType === 'clip' && !!b.content && b.content.videoType === 'reel'
  );
  const screenshotBookmarks = (bookmarks || []).filter(
    (b): b is BookmarkedScreenshot => b.contentType === 'screenshot' && !!b.content
  );
  const gameBookmarks = (bookmarks || []).filter(
    (b): b is BookmarkedGame => b.contentType === 'game' && !!b.content
  );

  const clips = clipBookmarks.map(b => b.content);
  const reels = reelBookmarks.map(b => b.content);
  const screenshots = screenshotBookmarks.map(b => b.content);
  const games = gameBookmarks.map(b => b.content);

  const totalCount = clips.length + reels.length + screenshots.length + games.length;
  const activeFilter = FILTER_OPTIONS.find(o => o.value === filter) ?? FILTER_OPTIONS[0];

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <Bookmark className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Sign in to view your bookmarks</h2>
      </div>
    );
  }

  const renderClips = () => (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {clips.map((clip) => (
        <VideoClipGridItem
          key={clip.id}
          clip={clip}
          clipsList={clips}
          onCardClick={(clipId, clipsList) => openClipDialog(clipId, clipsList)}
        />
      ))}
    </div>
  );

  const renderReels = () => (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {reels.map((reel) => (
        <VideoClipGridItem
          key={reel.id}
          clip={reel}
          reelsList={reels}
          onCardClick={(clipId, clipsList) => openClipDialog(clipId, clipsList)}
        />
      ))}
    </div>
  );

  const renderScreenshots = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {screenshots.map((screenshot) => (
        <ScreenshotCard
          key={screenshot.id}
          screenshot={screenshot}
          profile={screenshot.user || {}}
          showUserInfo={true}
          onSelect={(s: any) => setSelectedScreenshot(s)}
        />
      ))}
    </div>
  );

  const renderGames = () => (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {games.map((game) => (
        <TrendingGameCard key={game.id} game={game} />
      ))}
    </div>
  );

  const emptyState = (label: string) => (
    <div className="text-center py-12">
      <Bookmark className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
      <h3 className="text-xl font-semibold mb-2">No bookmarked {label} yet</h3>
      <p className="text-muted-foreground">Tap the bookmark icon on any {label.replace(/s$/, '')} to save it here</p>
    </div>
  );

  const sectionHeading = (icon: React.ReactNode, label: string, count: number) => (
    <div className="flex items-center gap-2 mb-4">
      {icon}
      <h2 className="text-lg font-semibold">{label}</h2>
      <span className="text-sm text-muted-foreground">({count})</span>
    </div>
  );

  return (
    <div className={`container mx-auto px-4 py-6 space-y-6 overflow-x-hidden ${isMobile ? 'pb-24' : ''}`}>
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation('/')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Bookmarks</h1>
          <p className="text-muted-foreground">Content you've saved for later</p>
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="flex items-center gap-2 w-fit"
            data-testid="dropdown-bookmarks-filter"
          >
            <activeFilter.icon className="h-4 w-4" />
            {activeFilter.label}
            {filter === 'all' && <span className="text-muted-foreground">({totalCount})</span>}
            <ChevronDown className="h-4 w-4 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {FILTER_OPTIONS.map((option) => {
            const count =
              option.value === 'all' ? totalCount :
              option.value === 'clips' ? clips.length :
              option.value === 'reels' ? reels.length :
              option.value === 'screenshots' ? screenshots.length :
              games.length;
            return (
              <DropdownMenuItem
                key={option.value}
                onClick={() => setFilter(option.value)}
                className="flex items-center gap-2"
                data-testid={`filter-option-${option.value}`}
              >
                <option.icon className="h-4 w-4" />
                <span>{option.label}</span>
                <span className="ml-auto text-muted-foreground text-xs">({count})</span>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array(8).fill(0).map((_, i) => (
            <Skeleton key={i} className="aspect-[9/16] w-full rounded-lg" />
          ))}
        </div>
      ) : filter === 'all' ? (
        totalCount > 0 ? (
          <div className="space-y-10">
            {clips.length > 0 && (
              <div>
                {sectionHeading(<Film className="h-5 w-5" />, "Clips", clips.length)}
                {renderClips()}
              </div>
            )}
            {clips.length > 0 && (reels.length > 0 || screenshots.length > 0 || games.length > 0) && (
              <div className="border-t border-border" />
            )}
            {reels.length > 0 && (
              <div>
                {sectionHeading(<Clapperboard className="h-5 w-5" />, "Reels", reels.length)}
                {renderReels()}
              </div>
            )}
            {reels.length > 0 && (screenshots.length > 0 || games.length > 0) && (
              <div className="border-t border-border" />
            )}
            {screenshots.length > 0 && (
              <div>
                {sectionHeading(<Camera className="h-5 w-5" />, "Screenshots", screenshots.length)}
                {renderScreenshots()}
              </div>
            )}
            {screenshots.length > 0 && games.length > 0 && (
              <div className="border-t border-border" />
            )}
            {games.length > 0 && (
              <div>
                {sectionHeading(<Gamepad2 className="h-5 w-5" />, "Games", games.length)}
                {renderGames()}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <Bookmark className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No bookmarks yet</h3>
            <p className="text-muted-foreground">Tap the bookmark icon on any clip, reel, screenshot, or game to save it here</p>
          </div>
        )
      ) : filter === 'clips' ? (
        clips.length > 0 ? renderClips() : emptyState('clips')
      ) : filter === 'reels' ? (
        reels.length > 0 ? renderReels() : emptyState('reels')
      ) : filter === 'screenshots' ? (
        screenshots.length > 0 ? renderScreenshots() : emptyState('screenshots')
      ) : (
        games.length > 0 ? renderGames() : emptyState('games')
      )}

      {selectedScreenshot && isMobile ? (
        <MobileScreenshotsViewer
          screenshots={screenshots}
          startId={selectedScreenshot.id}
          onBack={() => setSelectedScreenshot(null)}
        />
      ) : (
        <ScreenshotLightbox
          screenshot={selectedScreenshot}
          onClose={() => setSelectedScreenshot(null)}
          currentUserId={user?.id}
          screenshots={screenshots}
          onNavigate={(s: any) => setSelectedScreenshot(s)}
        />
      )}
    </div>
  );
}
