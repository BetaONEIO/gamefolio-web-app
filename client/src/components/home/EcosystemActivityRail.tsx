import { type ElementType } from "react";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { useEffect, useRef } from "react";
import { Video, Image, TrendingUp, Star } from "lucide-react";
import { Link } from "wouter";

interface ActivityItem {
  id: string;
  type: 'clip' | 'reel' | 'screenshot' | 'trending' | 'milestone';
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  text: string;
  subtext?: string | null;
  href?: string | null;
  timestamp?: string | null;
  rank?: number;
  contentId?: number;
}

const TYPE_CONFIG: Record<string, { icon: ElementType; color: string; bg: string; label: string }> = {
  clip: { icon: Video, color: '#B7FF1A', bg: 'rgba(183,255,26,0.12)', label: 'CLIP' },
  reel: { icon: Video, color: '#FF6BFF', bg: 'rgba(255,107,255,0.12)', label: 'REEL' },
  screenshot: { icon: Image, color: '#6BFFFF', bg: 'rgba(107,255,255,0.12)', label: 'SHOT' },
  trending: { icon: TrendingUp, color: '#FF9B3C', bg: 'rgba(255,155,60,0.12)', label: 'HOT' },
  milestone: { icon: Star, color: '#FFD700', bg: 'rgba(255,215,0,0.12)', label: 'MILESTONE' },
};

function timeAgo(ts: string | null | undefined): string {
  if (!ts) return '';
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function EcosystemActivityRail() {
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: items = [] } = useQuery<ActivityItem[]>({
    queryKey: ["/api/activity-feed"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    staleTime: 1000 * 60,
    refetchInterval: 1000 * 60,
  });

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || items.length === 0) return;
    let animId: number;
    let paused = false;

    const step = () => {
      if (!paused) {
        if (el.scrollLeft >= el.scrollWidth / 2) {
          el.scrollLeft = 0;
        } else {
          el.scrollLeft += 0.6;
        }
      }
      animId = requestAnimationFrame(step);
    };

    animId = requestAnimationFrame(step);
    el.addEventListener('mouseenter', () => { paused = true; });
    el.addEventListener('mouseleave', () => { paused = false; });

    return () => cancelAnimationFrame(animId);
  }, [items]);

  if (items.length === 0) return null;

  const doubled = [...items, ...items];

  return (
    <div className="w-full py-4 overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)' }}>
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-hidden cursor-grab active:cursor-grabbing"
        style={{ scrollBehavior: 'auto', userSelect: 'none' }}
      >
        {doubled.map((item, i) => {
          const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.clip;
          const Icon = cfg.icon;
          const inner = (
            <div
              key={`activity-${item.id}-${i}`}
              className="flex-shrink-0 flex items-center gap-3 px-4 py-2.5 rounded-xl border border-white/5 hover:border-white/10 transition-all duration-200 cursor-pointer"
              style={{ background: 'rgba(255,255,255,0.04)', minWidth: 260, maxWidth: 320 }}
            >
              {item.avatarUrl ? (
                <img
                  src={item.avatarUrl}
                  alt={item.displayName}
                  className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                  style={{ border: `2px solid ${cfg.color}33` }}
                />
              ) : (
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: cfg.bg }}
                >
                  <Icon className="w-4 h-4" style={{ color: cfg.color }} />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white/90 font-medium truncate">{item.text}</p>
                {item.subtext && (
                  <p className="text-xs text-white/40 truncate mt-0.5">"{item.subtext}"</p>
                )}
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <span
                  className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                  style={{ background: cfg.bg, color: cfg.color }}
                >
                  {cfg.label}
                </span>
                {item.timestamp && (
                  <span className="text-[9px] text-white/30">{timeAgo(item.timestamp)}</span>
                )}
                {item.rank && (
                  <span className="text-[9px] text-white/30">#{item.rank}</span>
                )}
              </div>
            </div>
          );

          return item.href ? (
            <Link key={`activity-link-${item.id}-${i}`} href={item.href}>
              {inner}
            </Link>
          ) : (
            <div key={`activity-wrap-${item.id}-${i}`}>{inner}</div>
          );
        })}
      </div>
    </div>
  );
}
