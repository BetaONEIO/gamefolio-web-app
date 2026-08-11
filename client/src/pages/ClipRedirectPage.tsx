import { useEffect, useMemo, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ClipWithUser } from "@shared/schema";
import { useClipDialog } from "@/hooks/use-clip-dialog";

/**
 * ClipRedirectPage — handles external deep-links like:
 *   /clip/:id           /reel/:id
 *   /@:username/clip/:clipId  (share codes or numeric IDs)
 *
 * Rather than rendering the old full-page ClipPage, it resolves the clip,
 * navigates to home, and opens the standard ClipDialog modal.
 */
export default function ClipRedirectPage() {
  const params = useParams<{
    id?: string;
    username?: string;
    clipId?: string;
    reelId?: string;
  }>();
  const [, navigate] = useLocation();
  const { openClipDialog } = useClipDialog();
  const openedRef = useRef(false);

  const rawId = params.clipId ?? params.reelId ?? params.id ?? null;
  const isNumericId = rawId !== null && /^\d+$/.test(rawId);
  const isReelRoute = !!params.reelId;

  const apiEndpoint = useMemo(() => {
    if (!rawId || isNumericId) return null;
    if (isReelRoute) return `/api/reels/share/${rawId}`;
    return `/api/clips/share/${rawId}`;
  }, [rawId, isNumericId, isReelRoute]);

  const { data: clip } = useQuery<ClipWithUser>({
    queryKey: [apiEndpoint],
    queryFn: async () => {
      const res = await fetch(apiEndpoint!, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch clip");
      return res.json();
    },
    enabled: !!apiEndpoint,
    retry: 2,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (openedRef.current) return;

    if (!rawId) {
      navigate("/");
      return;
    }

    if (isNumericId) {
      openedRef.current = true;
      // Navigate to home first so the dialog's "previous URL" stores "/" correctly,
      // meaning closing the dialog returns the user to the home feed.
      navigate("/");
      openClipDialog(parseInt(rawId, 10));
      return;
    }

    // Share code path — wait for the API to resolve the numeric ID
    if (clip) {
      openedRef.current = true;
      navigate("/");
      openClipDialog(clip.id);
    }
  }, [rawId, isNumericId, clip?.id]);

  return (
    <div className="min-h-screen bg-[#071013] flex items-center justify-center">
      <div
        className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
        style={{ borderColor: "#B7FF1A", borderTopColor: "transparent" }}
      />
    </div>
  );
}
