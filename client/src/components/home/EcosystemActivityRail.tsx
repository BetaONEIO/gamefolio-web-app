import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { useEffect, useRef, useMemo } from "react";

interface ApiFeedItem {
  id: string;
  username: string;
  displayName?: string;
}

type EventKind =
  | "xp"
  | "levelup"
  | "streak"
  | "lootbox"
  | "reward"
  | "follower"
  | "badge"
  | "bounty"
  | "challenge"
  | "trending"
  | "cosmetic"
  | "quest";

interface TickerEvent {
  id: string;
  kind: EventKind;
  text: string;
}

const KIND_META: Record<EventKind, { emoji: string; color: string }> = {
  xp:        { emoji: "⚡", color: "#B7FF18" },
  levelup:   { emoji: "🏆", color: "#FFD700" },
  streak:    { emoji: "🔥", color: "#FF6B35" },
  lootbox:   { emoji: "🎁", color: "#C084FC" },
  reward:    { emoji: "💎", color: "#67E8F9" },
  follower:  { emoji: "👥", color: "#B7FF18" },
  badge:     { emoji: "🎖️", color: "#FFD700" },
  bounty:    { emoji: "🎯", color: "#FF6B35" },
  challenge: { emoji: "🕹️", color: "#A78BFA" },
  trending:  { emoji: "📈", color: "#B7FF18" },
  cosmetic:  { emoji: "✨", color: "#F472B6" },
  quest:     { emoji: "📋", color: "#34D399" },
};

const EVENT_TEMPLATES: Array<{ kind: EventKind; make: (u: string) => string }> = [
  { kind: "xp",        make: u => `${u} earned +${pick([50,100,150,200,250,300,500])} XP` },
  { kind: "xp",        make: u => `${u} is on a +${pick([2,3,5,8,10])}x XP bonus` },
  { kind: "levelup",   make: u => `${u} reached Level ${pick([5,8,10,12,15,18,20,22,25,30])}` },
  { kind: "levelup",   make: u => `${u} just levelled up` },
  { kind: "streak",    make: u => `${u} is on a ${pick([3,5,7,10,14,21])}-day upload streak 🔥` },
  { kind: "streak",    make: u => `${u} kept their ${pick([7,14,30])}-day streak alive` },
  { kind: "lootbox",   make: u => `${u} opened a ${pick(["Rare","Epic","Legendary"])} Lootbox` },
  { kind: "lootbox",   make: u => `${u} unlocked a loot drop` },
  { kind: "reward",    make: u => `${u} claimed a GFT reward` },
  { kind: "reward",    make: u => `${u} earned a creator reward` },
  { kind: "follower",  make: u => `${u} gained ${pick([10,25,50,100])} new followers` },
  { kind: "follower",  make: u => `${u} hit ${pick([100,250,500,1000])} followers` },
  { kind: "badge",     make: u => `${u} unlocked a new badge` },
  { kind: "badge",     make: u => `${u} earned the ${pick(["Veteran","Sharpshooter","Night Owl","Grinder","Trendsetter"])} badge` },
  { kind: "bounty",    make: u => `${u} completed a bounty` },
  { kind: "bounty",    make: u => `${u} finished a weekly bounty` },
  { kind: "challenge", make: u => `${u} completed an indie challenge` },
  { kind: "challenge", make: u => `${u} beat the ${pick(["Daily","Weekly","Monthly"])} Challenge` },
  { kind: "trending",  make: u => `${u} reached Top ${pick([3,5,10,20])} Trending` },
  { kind: "trending",  make: u => `${u} is trending in ${pick(["FPS","RPG","Battle Royale","Indie","Sports"])}` },
  { kind: "cosmetic",  make: u => `${u} unlocked a rare profile cosmetic` },
  { kind: "cosmetic",  make: u => `${u} equipped a ${pick(["Legendary","Epic","Rare"])} border` },
  { kind: "quest",     make: u => `${u} completed a daily quest` },
  { kind: "quest",     make: u => `${u} finished ${pick([3,5,7])} quests today` },
];

const FALLBACK_NAMES = [
  "Player1","xxTOWERDOGxx","reaperofdarkness","JawaTheGathering",
  "SKYHAWKS","syndicate","dabu2k25","flash","GhostTag","ArcaneAce",
  "PixelRift","NovaStar","IronFox","LunarEdge","ZeroKelvin",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const out = [...arr];
  let s = seed;
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    const j = Math.abs(s) % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function buildEvents(names: string[], count = 28): TickerEvent[] {
  const pool = names.length >= 5 ? names : [...names, ...FALLBACK_NAMES];
  const shuffled = seededShuffle(pool, 42);
  const events: TickerEvent[] = [];
  for (let i = 0; i < count; i++) {
    const tpl = EVENT_TEMPLATES[i % EVENT_TEMPLATES.length];
    const user = shuffled[i % shuffled.length];
    events.push({ id: `evt-${i}`, kind: tpl.kind, text: tpl.make(user) });
  }
  return seededShuffle(events, 99);
}

export function EcosystemActivityRail() {
  const railRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);
  const animRef = useRef<number>(0);

  const { data: feedItems = [] } = useQuery<ApiFeedItem[]>({
    queryKey: ["/api/activity-feed"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    staleTime: 1000 * 120,
  });

  const events = useMemo(() => {
    const names = feedItems.length
      ? [...new Set(feedItems.map(f => f.username).filter(Boolean))]
      : FALLBACK_NAMES;
    return buildEvents(names, 28);
  }, [feedItems]);

  useEffect(() => {
    const el = railRef.current;
    if (!el || events.length === 0) return;

    const speed = 0.55;

    const step = () => {
      if (!pausedRef.current && el.scrollWidth > 0) {
        el.scrollLeft += speed;
        if (el.scrollLeft >= el.scrollWidth / 2) {
          el.scrollLeft = 0;
        }
      }
      animRef.current = requestAnimationFrame(step);
    };

    animRef.current = requestAnimationFrame(step);

    const pause = () => { pausedRef.current = true; };
    const resume = () => { pausedRef.current = false; };

    el.addEventListener("mouseenter", pause);
    el.addEventListener("mouseleave", resume);
    el.addEventListener("touchstart", pause, { passive: true });
    el.addEventListener("touchend", resume, { passive: true });

    return () => {
      cancelAnimationFrame(animRef.current);
      el.removeEventListener("mouseenter", pause);
      el.removeEventListener("mouseleave", resume);
      el.removeEventListener("touchstart", pause);
      el.removeEventListener("touchend", resume);
    };
  }, [events]);

  if (events.length === 0) return null;

  const doubled = [...events, ...events];

  return (
    <div
      className="w-full overflow-hidden"
      style={{
        background: "linear-gradient(90deg, #0B1319 0%, rgba(11,19,25,0.95) 100%)",
        borderTop: "1px solid rgba(183,255,24,0.06)",
        borderBottom: "1px solid rgba(183,255,24,0.06)",
        paddingTop: 10,
        paddingBottom: 10,
      }}
    >
      <div
        ref={railRef}
        className="flex items-center gap-2 overflow-hidden"
        style={{ scrollBehavior: "auto", userSelect: "none", whiteSpace: "nowrap" }}
      >
        {doubled.map((evt, i) => {
          const meta = KIND_META[evt.kind];
          return (
            <div
              key={`${evt.id}-${i}`}
              className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-200"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
                cursor: "default",
              }}
            >
              <span className="text-sm leading-none" style={{ filter: "grayscale(0.1)" }}>
                {meta.emoji}
              </span>
              <span
                className="text-xs font-medium leading-none"
                style={{ color: "rgba(255,255,255,0.75)", letterSpacing: "0.01em" }}
              >
                {evt.text}
              </span>
            </div>
          );
        })}

        {/* Subtle separator dots between loops */}
        {[0, 1].map(i => (
          <div key={`sep-${i}`} className="flex-shrink-0 flex items-center gap-1.5 px-2">
            <span style={{ width: 3, height: 3, borderRadius: "50%", background: "rgba(183,255,24,0.25)", display: "block" }} />
            <span style={{ width: 3, height: 3, borderRadius: "50%", background: "rgba(183,255,24,0.15)", display: "block" }} />
            <span style={{ width: 3, height: 3, borderRadius: "50%", background: "rgba(183,255,24,0.08)", display: "block" }} />
          </div>
        ))}
      </div>
    </div>
  );
}
