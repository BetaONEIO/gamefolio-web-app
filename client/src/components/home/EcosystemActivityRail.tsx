import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { useEffect, useRef } from "react";

type EventKind = "xp" | "streak" | "trending" | "follow" | "levelup";

interface FeedItem {
  id: string;
  kind: EventKind;
  username: string;
  text: string;
  timestamp?: string | null;
}

const KIND_EMOJI: Record<EventKind, string> = {
  xp:      "⚡",
  streak:  "🔥",
  trending:"📈",
  follow:  "👥",
  levelup: "🏆",
};

export function EcosystemActivityRail() {
  const railRef  = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);
  const animRef  = useRef<number>(0);

  const { data: items = [] } = useQuery<FeedItem[]>({
    queryKey: ["/api/activity-feed"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    staleTime: 1000 * 120,
    refetchInterval: 1000 * 120,
  });

  useEffect(() => {
    const el = railRef.current;
    if (!el || items.length === 0) return;

    const step = () => {
      if (!pausedRef.current && el.scrollWidth > 0) {
        el.scrollLeft += 0.55;
        if (el.scrollLeft >= el.scrollWidth / 2) el.scrollLeft = 0;
      }
      animRef.current = requestAnimationFrame(step);
    };

    animRef.current = requestAnimationFrame(step);

    const pause  = () => { pausedRef.current = true; };
    const resume = () => { pausedRef.current = false; };

    el.addEventListener("mouseenter",  pause);
    el.addEventListener("mouseleave",  resume);
    el.addEventListener("touchstart",  pause,  { passive: true });
    el.addEventListener("touchend",    resume, { passive: true });

    return () => {
      cancelAnimationFrame(animRef.current);
      el.removeEventListener("mouseenter",  pause);
      el.removeEventListener("mouseleave",  resume);
      el.removeEventListener("touchstart",  pause);
      el.removeEventListener("touchend",    resume);
    };
  }, [items]);

  if (items.length === 0) return null;

  const doubled = [...items, ...items];

  return (
    <div
      className="w-full overflow-hidden"
      style={{
        background: "#0B1319",
        borderTop:    "1px solid rgba(183,255,24,0.07)",
        borderBottom: "1px solid rgba(183,255,24,0.07)",
        paddingTop: 9,
        paddingBottom: 9,
      }}
    >
      <div
        ref={railRef}
        className="flex items-center gap-2 overflow-hidden"
        style={{ scrollBehavior: "auto", userSelect: "none", whiteSpace: "nowrap" }}
      >
        {doubled.map((item, i) => (
          <div
            key={`${item.id}-${i}`}
            className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-full"
            style={{
              background: "rgba(255,255,255,0.03)",
              border:     "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <span className="text-sm leading-none select-none">
              {KIND_EMOJI[item.kind] ?? "⚡"}
            </span>
            <span
              className="text-xs font-medium leading-none"
              style={{ color: "rgba(255,255,255,0.72)", letterSpacing: "0.01em" }}
            >
              {item.text}
            </span>
          </div>
        ))}

        {/* Dot separators at the seam between the two copies */}
        <div className="flex-shrink-0 flex items-center gap-1 px-3">
          <span style={{ width: 3, height: 3, borderRadius: "50%", background: "rgba(183,255,24,0.3)", display: "block" }} />
          <span style={{ width: 3, height: 3, borderRadius: "50%", background: "rgba(183,255,24,0.15)", display: "block" }} />
          <span style={{ width: 3, height: 3, borderRadius: "50%", background: "rgba(183,255,24,0.07)", display: "block" }} />
        </div>
      </div>
    </div>
  );
}
