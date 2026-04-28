import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { useEffect, useRef } from "react";
import { Link } from "wouter";
import { Upload } from "lucide-react";

interface RecentUpload {
  clipId: number;
  username: string;
  clipTitle: string;
  uploadedAt: string;
}

export function ActivityScrollBanner() {
  const scrollRef = useRef<HTMLDivElement>(null);

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
    <div className="bg-[#B7FF1A] border-b border-[#A2F000] overflow-hidden py-2">
      <div
        ref={scrollRef}
        className="flex gap-8 whitespace-nowrap overflow-hidden"
        style={{ scrollBehavior: "auto" }}
      >
        {duplicatedUploads.map((upload, index) => (
          <div
            key={`${upload.clipId}-${index}`}
            className="inline-flex items-center gap-2 text-sm font-medium"
            data-testid={`activity-${index}`}
            style={{ color: '#131E2B' }}
          >
            <Upload className="h-4 w-4" />
            <span className="font-semibold">{upload.username}</span>
            <span>has just uploaded a clip</span>
            <Link href={`/clip/${upload.clipId}`}>
              <span className="hover:underline cursor-pointer font-semibold">
                "{upload.clipTitle}"
              </span>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
