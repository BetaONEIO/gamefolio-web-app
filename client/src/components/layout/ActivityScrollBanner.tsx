import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { useEffect, useRef } from "react";
import { Upload } from "lucide-react";
import { useClipDialog } from "@/hooks/use-clip-dialog";

interface RecentUpload {
  clipId: number;
  username: string;
  clipTitle: string;
  uploadedAt: string;
}

export function ActivityScrollBanner() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { openClipDialog } = useClipDialog();

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
    // pointer-events: none on the empty banner bg so taps fall through to the
    // header buttons above; each item re-enables pointer-events so the clip
    // links stay tappable. Radix DropdownMenu opens on pointerdown, so if the
    // banner captures pointerdown, the header dropdowns never open.
    <div className="bg-[#B7FF1A] border-b border-[#A2F000] overflow-hidden py-2 pointer-events-none">
      <div
        ref={scrollRef}
        className="flex gap-8 whitespace-nowrap overflow-hidden"
        style={{ scrollBehavior: "auto" }}
      >
        {duplicatedUploads.map((upload, index) => (
          <div
            key={`${upload.clipId}-${index}`}
            className="inline-flex items-center gap-2 text-sm font-medium pointer-events-auto"
            data-testid={`activity-${index}`}
            style={{ color: '#071013' }}
          >
            <Upload className="h-4 w-4" />
            <span className="font-semibold">{upload.username}</span>
            <span>has just uploaded a clip</span>
            <button
              onClick={() => openClipDialog(upload.clipId)}
              className="hover:underline cursor-pointer font-semibold bg-transparent border-none p-0"
              style={{ color: '#071013' }}
            >
              "{upload.clipTitle}"
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
