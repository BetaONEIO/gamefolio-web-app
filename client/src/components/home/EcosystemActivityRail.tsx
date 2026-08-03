import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { useState, useEffect, useRef, useCallback } from "react";

const xpIcon = "/attached_assets/XP-text_1779960376768.png";
const streakIcon = "/attached_assets/upload_streak.png";
const firstPlaceIcon = "/attached_assets/1st-icon_1784739835624.png";
const secondPlaceIcon = "/attached_assets/Silver-2nd_1784739835625.png";
const thirdPlaceIcon = "/attached_assets/bronze-3rd_1784739835625.png";
const otherRankIcon = "/attached_assets/Green-bars_1784740690797.png";

type EventKind = "xp" | "streak" | "trending" | "levelup";

interface FeedItem {
  id: string;
  kind: EventKind;
  username: string;
  text: string;
  timestamp?: string | null;
}

type ItemStatus = 'visible' | 'entering' | 'leaving';

interface RailItem extends FeedItem {
  uid: string;
  status: ItemStatus;
}

const KIND_EMOJI: Record<EventKind, string> = {
  xp:      "",
  streak:  "",
  trending:"📈",
  levelup: "",
};

const MAX_ITEMS = 8;
const ANIM_DURATION = 450;

// The rail should only show activity from actual users returned by the API.
const SEED_ITEMS: FeedItem[] = [];

function XPIcon() {
  return (
    <span
      className="relative flex-shrink-0"
      style={{ width: 28, height: 28, display: "inline-flex", alignItems: "center", justifyContent: "center" }}
    >
      <span
        className="xp-glow-ring"
        style={{ position: "absolute", inset: 0, borderRadius: "50%", zIndex: 0 }}
      />
      <span
        className="xp-pulse-bg"
        style={{ position: "absolute", width: 14, height: 14, borderRadius: "50%", background: "rgba(183,255,24,0.08)", zIndex: 1 }}
      />
      <img
        src={xpIcon}
        alt="XP"
        style={{ position: "relative", zIndex: 2, width: 26, height: 26, objectFit: "contain", display: "block", filter: "drop-shadow(0 0 3px rgba(183,255,24,0.7))" }}
      />
    </span>
  );
}

function StreakIcon() {
  return (
    <span
      className="relative flex-shrink-0"
      style={{ width: 28, height: 28, display: "inline-flex", alignItems: "center", justifyContent: "center" }}
    >
      <img
        src={streakIcon}
        alt="Streak"
        style={{ position: "relative", zIndex: 1, width: 28, height: 28, objectFit: "contain", display: "block" }}
      />
    </span>
  );
}

function PlaceIcon({ place }: { place: 1 | 2 | 3 | 4 }) {
  const icon = place === 1 ? firstPlaceIcon : place === 2 ? secondPlaceIcon : thirdPlaceIcon;
  const glowColor = place === 1 ? "255,215,0" : place === 2 ? "192,192,192" : "205,127,50";
  const iconSize = place === 1 ? 43.75 : 35;
  return (
    <span
      className="relative flex-shrink-0"
      style={{ width: iconSize, height: iconSize, display: "inline-flex", alignItems: "center", justifyContent: "center" }}
    >
      <img
        src={icon}
        alt={`${place}${place === 1 ? "st" : place === 2 ? "nd" : "rd"}`}
        style={{ position: "relative", zIndex: 1, width: iconSize, height: iconSize, objectFit: "contain", display: "block", filter: `drop-shadow(0 0 4px rgba(${glowColor},0.8))` }}
      />
    </span>
  );
}

function getPlaceFromText(text: string): 1 | 2 | 3 | 4 {
  if (text.includes("#1") || text.includes("1st") || text.includes("first")) return 1;
  if (text.includes("#2") || text.includes("2nd") || text.includes("second")) return 2;
  if (text.includes("#3") || text.includes("3rd") || text.includes("third")) return 3;
  // Any rank #4 or higher -> use the "other" icon
  const match = text.match(/#(\d+)/);
  if (match && parseInt(match[1], 10) >= 4) return 4;
  if (text.includes("4th") || text.includes("fourth")) return 4;
  return 1;
}

function OtherRankIcon() {
  return (
    <span
      className="relative flex-shrink-0"
      style={{ width: 35, height: 35, display: "inline-flex", alignItems: "center", justifyContent: "center" }}
    >
      <img
        src={otherRankIcon}
        alt="Rank"
        style={{ position: "relative", zIndex: 1, width: 35, height: 35, objectFit: "contain", display: "block", filter: "drop-shadow(0 0 4px rgba(183,255,24,0.6))" }}
      />
    </span>
  );
}

const seedRailItems: RailItem[] = SEED_ITEMS.map(u => ({ ...u, uid: u.id, status: 'visible' as ItemStatus }));
const seedKeySet = new Set<string>(SEED_ITEMS.map(u => u.id));

// How long to wait before auto-cycling to the next item when idle (ms)
const AUTO_CYCLE_INTERVAL = 4500;

export function EcosystemActivityRail() {
  const [items, setItems] = useState<RailItem[]>(seedRailItems);
  const knownKeys = useRef(seedKeySet);
  const queue = useRef<FeedItem[]>([]);
  const animating = useRef(false);
  const lastKind = useRef<EventKind | undefined>(undefined);

  // Pool of all known items for continuous cycling
  const allKnownItems = useRef<FeedItem[]>([]);
  const cycleIndex = useRef(0);
  const cycleTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: feedItems } = useQuery<FeedItem[]>({
    queryKey: ["/api/activity-feed"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    staleTime: 1000 * 120,
    refetchInterval: 1000 * 120,
  });

  const processQueue = useCallback(() => {
    if (animating.current || queue.current.length === 0) return;
    animating.current = true;

    // Prefer a different activity type from the last shown item
    // so XP notifications do not stack together.
    const nextIndex = queue.current.findIndex(item => item.kind !== lastKind.current);
    const [next] = queue.current.splice(nextIndex >= 0 ? nextIndex : 0, 1);
    const uid = `${next.id}-${Date.now()}`;
    lastKind.current = next.kind;

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

  // Continuously cycle through known items so the rail always animates
  const startCycle = useCallback(() => {
    if (cycleTimer.current) return; // already running
    cycleTimer.current = setInterval(() => {
      if (allKnownItems.current.length === 0) return;
      if (queue.current.length > 0) return; // let real queue drain first
      const idx = cycleIndex.current % allKnownItems.current.length;
      cycleIndex.current++;
      queue.current.push(allKnownItems.current[idx]);
      processQueue();
    }, AUTO_CYCLE_INTERVAL);
  }, [processQueue]);

  // Clean up the cycle timer on unmount
  useEffect(() => {
    return () => { if (cycleTimer.current) clearInterval(cycleTimer.current); };
  }, []);

  useEffect(() => {
    const safeItems = Array.isArray(feedItems) ? feedItems : [];
    if (safeItems.length === 0) return;

    const newItems = safeItems.filter(u => !knownKeys.current.has(u.id));
    newItems.forEach(u => {
      knownKeys.current.add(u.id);
      allKnownItems.current.push(u);
    });

    if (newItems.length > 0) {
      queue.current = [...queue.current, ...newItems];
      processQueue();
    }

    // Start continuous cycling once we have data
    startCycle();
  }, [feedItems, processQueue, startCycle]);

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
          animation: xp-ring-spin 2.4s linear infinite, xp-ring-pulse 2.4s ease-in-out infinite;
        }
        .xp-pulse-bg {
          animation: xp-bg-pulse 2.4s ease-in-out infinite;
        }
        @keyframes place-glow {
          0%, 100% { opacity: 0.6; box-shadow: 0 0 4px 1px rgba(var(--glow-color),0.5); }
          50%       { opacity: 1;   box-shadow: 0 0 10px 3px rgba(var(--glow-color),0.9); }
        }
        .place-glow {
          animation: place-glow 2.4s ease-in-out infinite;
        }
      `}</style>

      <div
        className="w-full overflow-hidden"
        style={{
          background: "transparent",
          borderTop:    "1px solid rgba(183,255,24,0.07)",
          borderBottom: "1px solid rgba(183,255,24,0.07)",
          padding: "10px 0",
        }}
      >
        <div
          className="flex items-center gap-3 whitespace-nowrap"
          style={{ userSelect: "none" }}
        >
          {items.map(item => {
            const animStyle: React.CSSProperties =
              item.status === 'entering'
                ? { animation: `push-enter ${ANIM_DURATION}ms cubic-bezier(0.22,1,0.36,1) forwards` }
                : item.status === 'leaving'
                ? { animation: `push-leave ${ANIM_DURATION}ms cubic-bezier(0.64,0,0.78,0) forwards` }
                : {};

            return (
              <div
                key={item.uid}
                className="flex-shrink-0 flex items-center gap-2 px-3 py-1"
                style={animStyle}
              >
                {item.kind === "xp" ? (
                  <XPIcon />
                ) : item.kind === "streak" ? (
                  <StreakIcon />
                ) : item.kind === "levelup" ? (
                  (() => {
                    const place = getPlaceFromText(item.text);
                    return place >= 4 ? <OtherRankIcon /> : <PlaceIcon place={place} />;
                  })()
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
            );
          })}

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
