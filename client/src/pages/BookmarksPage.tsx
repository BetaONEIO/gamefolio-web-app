import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Bookmark, Film, Camera } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useMobile } from "@/hooks/use-mobile";
import { useClipDialog } from "@/hooks/use-clip-dialog";
import { getQueryFn } from "@/lib/queryClient";
import { ClipWithUser } from "@shared/schema";
import VideoClipGridItem from "@/components/clips/VideoClipGridItem";
import { ScreenshotCard } from "@/components/screenshots/ScreenshotCard";
import { ScreenshotLightbox } from "@/components/screenshots/ScreenshotLightbox";
import { MobileScreenshotsViewer } from "@/components/screenshots/MobileScreenshotsViewer";

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

type BookmarkEntry = BookmarkedClip | BookmarkedScreenshot;

export default function BookmarksPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const isMobile = useMobile();
  const { openClipDialog } = useClipDialog();
  const [tab, setTab] = useState<'clips' | 'screenshots'>('clips');
  const [selectedScreenshot, setSelectedScreenshot] = useState<any>(null);

  const { data: bookmarks, isLoading } = useQuery<BookmarkEntry[]>({
    queryKey: ['/api/bookmarks'],
    queryFn: getQueryFn({ on401: 'returnNull' }),
    enabled: !!user,
  });

  const clipBookmarks = (bookmarks || []).filter(
    (b): b is BookmarkedClip => b.contentType === 'clip' && !!b.content
  );
  const screenshotBookmarks = (bookmarks || []).filter(
    (b): b is BookmarkedScreenshot => b.contentType === 'screenshot' && !!b.content
  );

  const clips = clipBookmarks.map(b => b.content);
  const screenshots = screenshotBookmarks.map(b => b.content);

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <Bookmark className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Sign in to view your bookmarks</h2>
      </div>
    );
  }

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

      <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1 w-fit">
        <button
          onClick={() => setTab('clips')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            tab === 'clips' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
          data-testid="tab-bookmarks-clips"
        >
          <Film className="h-4 w-4" />
          Clips ({clips.length})
        </button>
        <button
          onClick={() => setTab('screenshots')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            tab === 'screenshots' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
          data-testid="tab-bookmarks-screenshots"
        >
          <Camera className="h-4 w-4" />
          Screenshots ({screenshots.length})
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array(8).fill(0).map((_, i) => (
            <Skeleton key={i} className="aspect-[9/16] w-full rounded-lg" />
          ))}
        </div>
      ) : tab === 'clips' ? (
        clips.length > 0 ? (
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
        ) : (
          <div className="text-center py-12">
            <Bookmark className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No bookmarked clips yet</h3>
            <p className="text-muted-foreground">Tap the bookmark icon on any clip or reel to save it here</p>
          </div>
        )
      ) : screenshots.length > 0 ? (
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
      ) : (
        <div className="text-center py-12">
          <Bookmark className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">No bookmarked screenshots yet</h3>
          <p className="text-muted-foreground">Tap the bookmark icon on any screenshot to save it here</p>
        </div>
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
