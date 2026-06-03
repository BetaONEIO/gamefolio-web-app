import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { useState, useEffect, useRef, useCallback } from "react";

const xpIcon = "/attached_assets/XP-text_1779960376768.png";

type EventKind = "xp" | "streak" | "trending" | "follow" | "levelup";

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
  streak:  "🔥",
  trending:"📈",
  follow:  "👥",
  levelup: "🏆",
};

const MAX_ITEMS = 8;
const ANIM_DURATION = 450;

const SEED_ITEMS: FeedItem[] = [
  { id: 'seed-1', kind: 'xp',      username: 'gamer',   text: 'Someone earned +200 XP from uploading' },
  { id: 'seed-2', kind: 'streak',  username: 'player',  text: 'A player is on a 7-day upload streak 🔥' },
  { id: 'seed-3', kind: 'levelup', username: 'pro',     text: 'A pro is #1 this month · 4,200 XP' },
  { id: 'seed-4', kind: 'xp',      username: 'clip',    text: 'Someone earned +25 XP daily login bonus' },
  { id: 'seed-5', kind: 'follow',  username: 'fan',     text: 'New players are joining the community' },
  { id: 'seed-6', kind: 'trending',username: 'rising',  text: 'Gamefolio is growing — join today!' },
];

function XPIcon() {
  return (
    <span
      className="relative flex-shrink-0"
      style={{ width: 16, height: 16, display: "inline-flex", alignItems: "center", justifyContent: "center" }}
    >
      <span
        className="xp-glow-ring"
        style={{ position: "absolute", inset: 0, borderRadius: "50%", zIndex: 0 }}
      />
      <span
        className="xp-pulse-bg"
        style={{ position: "absolute", width: 8, height: 8, borderRadius: "50%", background: "rgba(183,255,24,0.08)", zIndex: 1 }}
      />
      <img
        src={xpIcon}
        alt="XP"
        style={{ position: "relative", zIndex: 2, width: 14, height: 14, objectFit: "contain", display: "block", filter: "drop-shadow(0 0 2px rgba(183,255,24,0.7))" }}
      />
    </span>
  );
}

export function EcosystemActivityRail() {
  const [items, setItems] = useState<RailItem[]>([]);
  const knownKeys = useRef(new Set<string>());
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

  // Seed with placeholder items immediately so the rail always renders
  useEffect(() => {
    if (knownKeys.current.size === 0) {
      const initial = SEED_ITEMS.map(u => ({ ...u, uid: u.id, status: 'visible' as ItemStatus }));
      setItems(initial);
      SEED_ITEMS.forEach(u => knownKeys.current.add(u.id));
    }
  }, []);

  useEffect(() => {
    if (!feedItems.length) return;

    if (knownKeys.current.size === 0) {
      const initial = feedItems.slice(0, MAX_ITEMS).map(u => ({
        ...u,
        uid: u.id,
        status: 'visible' as ItemStatus,
      }));
      setItems(initial);
      feedItems.forEach(u => knownKeys.current.add(u.id));
      return;
    }

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
