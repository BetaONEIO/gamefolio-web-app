import { type ElementType } from "react";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { useEffect, useRef } from "react";
import { Upload, Video, Image, Film } from "lucide-react";
import { useClipDialog } from "@/hooks/use-clip-dialog";
import { Link, useLocation } from "wouter";

interface RecentUpload {
  id: number;
  contentType: 'clip' | 'reel' | 'screenshot';
  username: string;
  displayName: string;
  title: string;
  uploadedAt: string | null;
  thumbnailUrl?: string | null;
}

const CONTENT_LABELS: Record<string, string> = {
  clip: 'just uploaded a clip',
  reel: 'just posted a reel',
  screenshot: 'just shared a screenshot',
};

const CONTENT_ICONS: Record<string, ElementType> = {
  clip: Video,
  reel: Film,
  screenshot: Image,
};

export function ActivityScrollBanner() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { openClipDialog } = useClipDialog();
  const [, setLocation] = useLocation();

  const { data: recentUploads = [] } = useQuery<RecentUpload[]>({
    queryKey: ["/api/recent-uploads"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 30,
  });

  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer || recentUploads.length === 0) return;

    const scroll = () => {
      if (scrollContainer.scrollLeft >= scrollContainer.scrollWidth / 2) {
        scrollContainer.scrollLeft = 0;
      } else {
        scrollContainer.scrollLeft += 1;
      }
    };

    const intervalId = setInterval(scroll, 30);

    return () => clearInterval(intervalId);
  }, [recentUploads]);

  if (recentUploads.length === 0) return null;

  const duplicatedUploads = [...recentUploads, ...recentUploads];

  return (
    <div className="bg-[#B7FF1A] border-b border-[#A2F000] overflow-hidden py-2 pointer-events-none">
      <div
        ref={scrollRef}
        className="flex gap-8 whitespace-nowrap overflow-hidden"
        style={{ scrollBehavior: "auto" }}
      >
        {duplicatedUploads.map((upload, index) => {
          const Icon = CONTENT_ICONS[upload.contentType] || Upload;
          const label = CONTENT_LABELS[upload.contentType] || 'just uploaded content';

          return (
            <div
              key={`${upload.id}-${upload.contentType}-${index}`}
              className="inline-flex items-center gap-2 text-sm font-medium pointer-events-auto"
              style={{ color: '#071013' }}
            >
              <Icon className="h-4 w-4" />
              <Link
                href={`/profile/${upload.username}`}
                className="font-semibold hover:underline"
                style={{ color: '#071013' }}
              >
                {upload.displayName || upload.username}
              </Link>
              <span>{label}</span>
              <button
                onClick={() => {
                  if (upload.contentType === 'screenshot') {
                    // Canonical client-side route — ProfilePage opens the
                    // screenshot lightbox from the :screenshotId param. The old
                    // /view/screenshot/:id path relied on a server redirect that
                    // never runs for in-app SPA navigation, so on native it fell
                    // through to /:username and 404'd as user "view".
                    setLocation(`/@${upload.username}/screenshots/${upload.id}`);
                  } else {
                    openClipDialog(upload.id);
                  }
                }}
                className="hover:underline cursor-pointer font-semibold bg-transparent border-none p-0"
                style={{ color: '#071013' }}
              >
                "{upload.title}"
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
