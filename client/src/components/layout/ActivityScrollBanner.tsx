import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

interface RecentUpload {
  username: string;
  clipTitle: string;
  uploadedAt: string;
}

export function ActivityScrollBanner() {
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: recentUploads = [] } = useQuery<RecentUpload[]>({
    queryKey: ["/api/recent-uploads"],
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
    <div className="bg-black/80 border-b border-green-500/30 overflow-hidden py-2">
      <div
        ref={scrollRef}
        className="flex gap-8 whitespace-nowrap overflow-hidden"
        style={{ scrollBehavior: "auto" }}
      >
        {duplicatedUploads.map((upload, index) => (
          <div
            key={`${upload.username}-${index}`}
            className="inline-flex items-center gap-2 text-green-400 text-sm font-medium"
            data-testid={`activity-${index}`}
          >
            <span className="text-green-500">🎮</span>
            <span className="text-green-300">{upload.username}</span>
            <span className="text-green-400">has just uploaded a clip</span>
            <span className="text-green-500/60">"{upload.clipTitle}"</span>
          </div>
        ))}
      </div>
    </div>
  );
}
