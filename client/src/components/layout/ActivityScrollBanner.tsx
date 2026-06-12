import { type ElementType, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { useEffect, useRef } from "react";
import { Upload, Video, Image, Film } from "lucide-react";
import { useClipDialog } from "@/hooks/use-clip-dialog";
import { Link } from "wouter";
import { useMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/use-auth";
import { ScreenshotLightbox } from "@/components/screenshots/ScreenshotLightbox";
import { MobileScreenshotsViewer } from "@/components/screenshots/MobileScreenshotsViewer";

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
  const isMobile = useMobile();
  const { user } = useAuth();

  // Screenshots open in the same lightbox/viewer overlay the home feed uses —
  // NOT via navigation. Navigating to a screenshot URL was unreliable inside the
  // native (Capacitor) webview (route/encoding mismatches landed on a 404), so we
  // fetch the screenshot by id and render the proven overlay directly, mirroring
  // how clips use openClipDialog.
  const [selectedScreenshotId, setSelectedScreenshotId] = useState<number | null>(null);
  const { data: selectedScreenshot } = useQuery<any>({
    queryKey: [`/api/screenshots/${selectedScreenshotId}`],
    enabled: selectedScreenshotId != null,
  });

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
    <>
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
                      setSelectedScreenshotId(upload.id);
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

      {/* Screenshot overlay — same components the home feed uses, opened by
          fetching the screenshot by id. No navigation, so it works on native. */}
      {selectedScreenshot && (
        isMobile ? (
          <MobileScreenshotsViewer
            screenshots={[selectedScreenshot]}
            startId={selectedScreenshot.id}
            onBack={() => setSelectedScreenshotId(null)}
          />
        ) : (
          <ScreenshotLightbox
            screenshot={selectedScreenshot}
            onClose={() => setSelectedScreenshotId(null)}
            currentUserId={user?.id}
            screenshots={[selectedScreenshot]}
          />
        )
      )}
    </>
  );
}
