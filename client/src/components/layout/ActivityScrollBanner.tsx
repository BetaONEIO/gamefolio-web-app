import { type ElementType } from "react";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { useEffect, useRef, useState } from "react";
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

function makeKey(u: RecentUpload) {
  return `${u.id}-${u.contentType}`;
}

export function ActivityScrollBanner() {
  const { openClipDialog } = useClipDialog();
  const [, setLocation] = useLocation();

  const [displayedItems, setDisplayedItems] = useState<RecentUpload[]>([]);
  const knownKeys = useRef(new Set<string>());

  const { data: recentUploads = [] } = useQuery<RecentUpload[]>({
    queryKey: ["/api/recent-uploads"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    staleTime: 1000 * 60,
    refetchInterval: 1000 * 60,
  });

  useEffect(() => {
    if (!recentUploads.length) return;

    const newItems = recentUploads.filter(u => !knownKeys.current.has(makeKey(u)));
    if (newItems.length === 0) return;

    newItems.forEach(u => knownKeys.current.add(makeKey(u)));
    setDisplayedItems(prev => {
      const merged = [...newItems, ...prev];
      return merged.slice(0, 20);
    });
  }, [recentUploads]);

  if (displayedItems.length === 0) return null;

  const duplicated = [...displayedItems, ...displayedItems];

  return (
    <div className="bg-[#B7FF1A] border-b border-[#A2F000] overflow-hidden py-2">
      <style>{`
        @keyframes banner-marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        .banner-track {
          display: flex;
          width: max-content;
          animation: banner-marquee 40s linear infinite;
          will-change: transform;
        }
        .banner-track:hover {
          animation-play-state: paused;
        }
      `}</style>
      <div className="overflow-hidden">
        <div className="banner-track gap-8 whitespace-nowrap flex">
          {duplicated.map((upload, index) => {
            const Icon = CONTENT_ICONS[upload.contentType] || Upload;
            const label = CONTENT_LABELS[upload.contentType] || 'just uploaded content';

            return (
              <div
                key={`${makeKey(upload)}-${index}`}
                className="inline-flex items-center gap-2 text-sm font-medium px-4"
                style={{ color: '#071013' }}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
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
                      setLocation(`/view/screenshot/${upload.id}`);
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
    </div>
  );
}
