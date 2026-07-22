import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { useState, useEffect, useRef, useCallback } from "react";

const xpIcon = "/attached_assets/XP-text_1779960376768.png";
const streakIcon = "/attached_assets/upload_streak.png";
const firstPlaceIcon = "/attached_assets/1st-icon_1784739835624.png";
const secondPlaceIcon = "/attached_assets/Silver-2nd_1784739835625.png";
const thirdPlaceIcon = "/attached_assets/bronze-3rd_1784739835625.png";

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

const SEED_ITEMS: FeedItem[] = [
  { id: 'seed-1', kind: 'xp',      username: 'gamer',   text: 'Someone earned +200 XP from uploading' },
  { id: 'seed-2', kind: 'streak',  username: 'player',  text: 'A player is on a 7-day upload streak 🔥' },
  { id: 'seed-3', kind: 'levelup', username: 'pro',     text: 'A pro is #1 this month · 4,200 XP' },
  { id: 'seed-4', kind: 'xp',      username: 'clip',    text: 'Someone earned +25 XP daily login bonus' },
  { id: 'seed-5', kind: 'trending',username: 'rising',  text: 'Gamefolio is growing — join today!' },
];

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
      <span
        className="streak-flare"
        style={{ position: "absolute", inset: -2, borderRadius: "50%", zIndex: 0 }}
      />
      <img
        src={streakIcon}
        alt="Streak"
        style={{ position: "relative", zIndex: 1, width: 28, height: 28, objectFit: "contain", display: "block", filter: "drop-shadow(0 0 4px rgba(255,120,0,0.8))" }}
      />
    </span>
  );
}

function PlaceIcon({ place }: { place: 1 | 2 | 3 }) {
  const icon = place === 1 ? firstPlaceIcon : place === 2 ? secondPlaceIcon : thirdPlaceIcon;
  const glowColor = place === 1 ? "255,215,0" : place === 2 ? "192,192,192" : "205,127,50";
  return (
    <span
      className="relative flex-shrink-0"
      style={{ width: 35, height: 35, display: "inline-flex", alignItems: "center", justifyContent: "center" }}
    >
      <img
        src={icon}
        alt={`${place}${place === 1 ? "st" : place === 2 ? "nd" : "rd"}`}
        style={{ position: "relative", zIndex: 1, width: 35, height: 35, objectFit: "contain", display: "block", filter: `drop-shadow(0 0 4px rgba(${glowColor},0.8))` }}
      />
    </span>
  );
}

function getPlaceFromText(text: string): 1 | 2 | 3 {
  if (text.includes("#1") || text.includes("1st") || text.includes("first")) return 1;
  if (text.includes("#2") || text.includes("2nd") || text.includes("second")) return 2;
  if (text.includes("#3") || text.includes("3rd") || text.includes("third")) return 3;
  return 1; // default to 1st if not specified
}

const seedRailItems: RailItem[] = SEED_ITEMS.map(u => ({ ...u, uid: u.id, status: 'visible' as ItemStatus }));
const seedKeySet = new Set<string>(SEED_ITEMS.map(u => u.id));

export function EcosystemActivityRail() {
  const [items, setItems] = useState<RailItem[]>(seedRailItems);
  const knownKeys = useRef(seedKeySet);
  const queue = useRef<FeedItem[]>([]);
  const animating = useRef(false);

  const { data: feedItems = [] } = useQuery<FeedItem[]>({
    queryKey: ["/api/activity-feed"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    staleTime: 1000 * 120,
    refetchInterval: 1000 * 120,
  });

  const processQueue = useCallback(() => {
    if (animating.current || queue.current.length === 0) return;
    animating.current = true;

    const next = queue.current.shift()!;
    const uid = `${next.id}-${Date.now()}`;

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
    if (!feedItems.length) return;

    const newItems = feedItems.filter(u => !knownKeys.current.has(u.id));
    newItems.forEach(u => knownKeys.current.add(u.id));

    if (newItems.length > 0) {
      queue.current = [...queue.current, ...newItems];
      processQueue();
    }
  }, [feedItems, processQueue]);

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
        @keyframes streak-flare {
          0%, 100% { opacity: 0.6; box-shadow: 0 0 4px 1px rgba(255,120,0,0.5); }
          50%       { opacity: 1;   box-shadow: 0 0 10px 3px rgba(255,120,0,0.9); }
        }
        .streak-flare {
          animation: streak-flare 1.8s ease-in-out infinite;
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
                  <PlaceIcon place={getPlaceFromText(item.text)} />
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
