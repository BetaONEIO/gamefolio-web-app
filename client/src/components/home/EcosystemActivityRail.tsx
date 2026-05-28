import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { useEffect, useRef } from "react";
const xpIcon = "/attached_assets/XP-text_1779960376768.png";

type EventKind = "xp" | "streak" | "trending" | "follow" | "levelup";

interface FeedItem {
  id: string;
  kind: EventKind;
  username: string;
  text: string;
  timestamp?: string | null;
}

const KIND_EMOJI: Record<EventKind, string> = {
  xp:      "",
  streak:  "🔥",
  trending:"📈",
  follow:  "👥",
  levelup: "🏆",
};

function XPIcon() {
  return (
    <span
      className="relative flex-shrink-0"
      style={{ width: 6, height: 6, display: "inline-flex", alignItems: "center", justifyContent: "center" }}
    >
      {/* Rotating glow ring */}
      <span
        className="xp-glow-ring"
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          zIndex: 0,
        }}
      />
      {/* Pulsing background circle */}
      <span
        className="xp-pulse-bg"
        style={{
          position: "absolute",
          width: 3,
          height: 3,
          borderRadius: "50%",
          background: "rgba(183,255,24,0.08)",
          zIndex: 1,
        }}
      />
      {/* XP image */}
      <img
        src={xpIcon}
        alt="XP"
        style={{
          position: "relative",
          zIndex: 2,
          width: 4,
          height: 4,
          objectFit: "contain",
          display: "block",
          filter: "drop-shadow(0 0 0.5px rgba(183,255,24,0.7))",
        }}
      />
    </span>
  );
}

export function EcosystemActivityRail() {
  const railRef   = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);
  const animRef   = useRef<number>(0);

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
    <>
      <style>{`
        @keyframes xp-ring-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes xp-ring-pulse {
          0%, 100% { opacity: 0.7; box-shadow: 0 0 4px 1px rgba(183,255,24,0.5); }
          50%       { opacity: 1;   box-shadow: 0 0 8px 3px rgba(183,255,24,0.9); }
        }
        @keyframes xp-bg-pulse {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50%       { opacity: 1;   transform: scale(1.08); }
        }
        .xp-glow-ring {
          border: 1.5px solid rgba(183,255,24,0.0);
          border-top-color: #B7FF18;
          border-right-color: rgba(183,255,24,0.4);
          animation:
            xp-ring-spin  2.4s linear infinite,
            xp-ring-pulse 2.4s ease-in-out infinite;
        }
        .xp-pulse-bg {
          animation: xp-bg-pulse 2.4s ease-in-out infinite;
        }
      `}</style>

      <div
        className="w-full"
        style={{
          background: "transparent",
          borderTop:    "1px solid rgba(183,255,24,0.07)",
          borderBottom: "1px solid rgba(183,255,24,0.07)",
          padding: "10px 0",
        }}
      >
        <div
          ref={railRef}
          className="flex items-center gap-3"
          style={{ scrollBehavior: "auto", userSelect: "none", whiteSpace: "nowrap", overflow: "visible" }}
        >
          {doubled.map((item, i) => (
            <div
              key={`${item.id}-${i}`}
              className="flex-shrink-0 flex items-center gap-2 px-3 py-1"
            >
              {item.kind === "xp" ? (
                <XPIcon />
              ) : (
                <span className="text-sm leading-none select-none">
                  {KIND_EMOJI[item.kind]}
                </span>
              )}
              <span
                className="text-xs font-medium leading-none"
                style={{ color: "rgba(255,255,255,0.68)", letterSpacing: "0.01em" }}
              >
                {item.text}
              </span>
            </div>
          ))}

          {/* Visual separator between the two copies */}
          <div className="flex-shrink-0 flex items-center gap-1 px-2">
            <span style={{ width: 3, height: 3, borderRadius: "50%", background: "rgba(183,255,24,0.35)", display: "block" }} />
            <span style={{ width: 3, height: 3, borderRadius: "50%", background: "rgba(183,255,24,0.18)", display: "block" }} />
            <span style={{ width: 3, height: 3, borderRadius: "50%", background: "rgba(183,255,24,0.08)", display: "block" }} />
          </div>
        </div>
      </div>
    </>
  );
}
