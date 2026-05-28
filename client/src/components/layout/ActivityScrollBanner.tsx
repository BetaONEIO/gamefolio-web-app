import { type ElementType, useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { Upload, Video, Image, Film } from "lucide-react";
import { useClipDialog } from "@/hooks/use-clip-dialog";
import { useLocation } from "wouter";

interface RecentUpload {
  id: number;
  contentType: 'clip' | 'reel' | 'screenshot';
  username: string;
  displayName: string;
  title: string;
  uploadedAt: string | null;
  thumbnailUrl?: string | null;
}

type ItemStatus = 'visible' | 'entering' | 'leaving';

interface BannerItem extends RecentUpload {
  uid: string;
  status: ItemStatus;
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

const MAX_ITEMS = 6;
const ANIM_DURATION = 450;

function itemKey(u: RecentUpload) {
  return `${u.id}-${u.contentType}`;
}

export function ActivityScrollBanner() {
  const { openClipDialog } = useClipDialog();
  const [, setLocation] = useLocation();

  const [items, setItems] = useState<BannerItem[]>([]);
  const knownKeys = useRef(new Set<string>());
  const queue = useRef<RecentUpload[]>([]);
  const animating = useRef(false);

  const { data: recentUploads = [] } = useQuery<RecentUpload[]>({
    queryKey: ["/api/recent-uploads"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 30,
  });

  const processQueue = useCallback(() => {
    if (animating.current || queue.current.length === 0) return;
    animating.current = true;

    const next = queue.current.shift()!;
    const uid = `${itemKey(next)}-${Date.now()}`;

    setItems(prev => {
      const withLeaving = prev.length >= MAX_ITEMS
        ? prev.map((item, i) => i === 0 ? { ...item, status: 'leaving' as ItemStatus } : item)
        : prev;
      return [...withLeaving, { ...next, uid, status: 'entering' }];
    });

    setTimeout(() => {
      setItems(prev =>
        prev
          .filter(item => item.status !== 'leaving')
          .map(item => item.uid === uid ? { ...item, status: 'visible' as ItemStatus } : item)
      );
      animating.current = false;
      processQueue();
    }, ANIM_DURATION + 50);
  }, []);

  useEffect(() => {
    if (!recentUploads.length) return;

    if (knownKeys.current.size === 0) {
      const initial = recentUploads.slice(0, MAX_ITEMS).map(u => ({
        ...u,
        uid: itemKey(u),
        status: 'visible' as ItemStatus,
      }));
      setItems(initial);
      recentUploads.forEach(u => knownKeys.current.add(itemKey(u)));
      return;
    }

    const newItems = recentUploads.filter(u => !knownKeys.current.has(itemKey(u)));
    newItems.forEach(u => knownKeys.current.add(itemKey(u)));

    if (newItems.length > 0) {
      queue.current = [...queue.current, ...newItems];
      processQueue();
    }
  }, [recentUploads, processQueue]);

  if (items.length === 0) return null;

  return (
    <div className="bg-[#B7FF1A] border-b border-[#A2F000] overflow-hidden py-2">
      <div className="flex gap-8 whitespace-nowrap items-center overflow-hidden">
        {items.map(item => {
          const Icon = CONTENT_ICONS[item.contentType] || Upload;
          const label = CONTENT_LABELS[item.contentType] || 'just uploaded content';

          const animStyle: React.CSSProperties =
            item.status === 'entering'
              ? { animation: `push-enter ${ANIM_DURATION}ms cubic-bezier(0.22,1,0.36,1) forwards` }
              : item.status === 'leaving'
              ? { animation: `push-leave ${ANIM_DURATION}ms cubic-bezier(0.64,0,0.78,0) forwards` }
              : {};

          return (
            <div
              key={item.uid}
              className="inline-flex items-center gap-2 text-sm font-medium flex-shrink-0"
              style={{ color: '#071013', ...animStyle }}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span className="font-semibold">{item.displayName || item.username}</span>
              <span>{label}</span>
              <button
                onClick={() => {
                  if (item.contentType === 'screenshot') {
                    setLocation(`/view/screenshot/${item.id}`);
                  } else {
                    openClipDialog(item.id);
                  }
                }}
                className="hover:underline cursor-pointer font-semibold bg-transparent border-none p-0"
                style={{ color: '#071013' }}
              >
                "{item.title}"
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
