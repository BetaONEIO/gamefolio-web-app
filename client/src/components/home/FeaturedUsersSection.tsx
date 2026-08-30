import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { GamefolioTrendingIcon } from "@/components/icons/GamefolioTrendingIcon";
import { CreatorCard } from "@/components/home/CreatorCard";
import { TrendingEntry, CREATOR_CARD_STYLES } from "@/components/home/creator-card-utils";

const SCROLL_SPEED = 0.55; // px per rAF frame (~33px/s at 60fps)
const CARD_GAP = 16;

const STYLES = `
  .fire-carousel-scroll {
    overflow-x: scroll;
    scrollbar-width: none;
    cursor: grab;
    user-select: none;
  }
  .fire-carousel-scroll::-webkit-scrollbar { display: none; }
  .fire-carousel-scroll.dragging { cursor: grabbing; }

  .fire-carousel-track {
    display: flex;
    width: max-content;
  }

  .trending-bg-pattern {
    background-image:
      linear-gradient(rgba(4, 10, 2, 0.34), rgba(4, 10, 2, 0.34)),
      url("/attached_assets/background-trending_1785854153143.png");
    background-position: center;
    background-size: cover;
    background-repeat: repeat;
  }

  /* Mobile snap scroll container */
  .mobile-snap-scroll {
    display: flex;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    scrollbar-width: none;
    -ms-overflow-style: none;
    -webkit-overflow-scrolling: touch;
  }
  .mobile-snap-scroll::-webkit-scrollbar { display: none; }

  ${CREATOR_CARD_STYLES}
`;

// ── Desktop skeleton card ────────────────────────────────────────────────────
function CardSkeleton() {
  return (
    <div
      className="flex-shrink-0 rounded-2xl overflow-hidden"
      style={{ width: 228, height: 480, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <Skeleton className="w-full h-[90px]" />
      <div className="flex justify-center -mt-7 mb-2">
        <Skeleton className="w-14 h-14 rounded-full" />
      </div>
      <Skeleton className="h-4 w-28 mx-auto mb-1" />
      <Skeleton className="h-3 w-20 mx-auto mb-3" />
      <Skeleton className="h-14 mx-3 rounded-xl mb-2" />
      <Skeleton className="h-10 mx-3 rounded-xl mb-2" />
      <Skeleton className="h-10 mx-3 rounded-xl mb-auto" />
      <Skeleton className="h-9 mx-3 rounded-xl mt-4" />
    </div>
  );
}

// ── Mobile skeleton card (compact height) ────────────────────────────────────
function MobileCardSkeleton() {
  return (
    <div
      className="rounded-2xl overflow-hidden w-full"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <Skeleton className="w-full" style={{ height: 90 }} />
      <div className="flex justify-center -mt-9 mb-2">
        <Skeleton className="rounded-full" style={{ width: 72, height: 72 }} />
      </div>
      <Skeleton className="h-4 w-32 mx-auto mb-1" />
      <Skeleton className="h-3 w-24 mx-auto mb-4" />
      <Skeleton className="h-12 mx-3 rounded-xl mb-2" />
      <Skeleton className="h-10 mx-3 rounded-xl mb-2" />
      <Skeleton className="h-10 mx-3 rounded-xl mb-4" />
      <Skeleton className="h-10 mx-3 rounded-xl mb-4" />
    </div>
  );
}

const FeaturedUsersSection = () => {
  const period = 'week' as const;

  const { data: entries = [], isLoading } = useQuery<TrendingEntry[]>({
    queryKey: ["/api/trending-gamefolios", period],
    queryFn: async () => {
      const res = await fetch(`/api/trending-gamefolios?period=${period}&limit=10`);
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
    staleTime: 1000 * 60 * 5,
  });

  const validEntries = entries.filter(e => e.user);
  const displayEntries = validEntries.length > 0
    ? [...validEntries, ...validEntries, ...validEntries]
    : [];

  // ── Desktop: auto-scroll refs ─────────────────────────────────────────────
  const scrollRef    = useRef<HTMLDivElement>(null);
  const rafRef       = useRef<number>(0);
  const dragging     = useRef(false);
  const didDrag      = useRef(false);
  const suppressClick = useRef(false);
  const scrollPosition = useRef(0);
  const dragData     = useRef({ startX: 0, startScrollLeft: 0 });

  // ── Mobile: snap carousel state ───────────────────────────────────────────
  const mobileScrollRef  = useRef<HTMLDivElement>(null);
  const [mobileActiveIdx, setMobileActiveIdx] = useState(0);

  /* ── Desktop auto-scroll + init ─────────────────────────────────────────── */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || validEntries.length === 0) return;

    const setup = setTimeout(() => {
      const track = el.firstElementChild as HTMLElement | null;
      const firstCard = track?.firstElementChild as HTMLElement | null;
      const renderedCardWidth = firstCard?.getBoundingClientRect().width ?? 0;
      const oneCopyWidth = renderedCardWidth > 0
        ? renderedCardWidth * validEntries.length
        : el.scrollWidth / 3;
      scrollPosition.current = oneCopyWidth;
      el.scrollLeft = scrollPosition.current;

      const tick = () => {
        if (!dragging.current) {
          scrollPosition.current += SCROLL_SPEED;
          el.scrollLeft = scrollPosition.current;

          const w = oneCopyWidth;
          if (scrollPosition.current >= w * 2) {
            scrollPosition.current -= w;
            el.scrollLeft = scrollPosition.current;
          } else if (scrollPosition.current <= 0) {
            scrollPosition.current += w;
            el.scrollLeft = scrollPosition.current;
          }
        }
        rafRef.current = requestAnimationFrame(tick);
      };

      rafRef.current = requestAnimationFrame(tick);
    }, 60);

    return () => {
      clearTimeout(setup);
      cancelAnimationFrame(rafRef.current);
    };
  }, [validEntries.length]);

  /* ── Desktop drag handlers ──────────────────────────────────────────────── */
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    if (!el || (e.pointerType === 'mouse' && e.button !== 0)) return;
    dragging.current = true;
    didDrag.current = false;
    scrollPosition.current = el.scrollLeft;
    dragData.current = { startX: e.clientX, startScrollLeft: el.scrollLeft };
    el.classList.add('dragging');
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    const el = scrollRef.current;
    if (!el) return;
    const dx = e.clientX - dragData.current.startX;
    if (!didDrag.current) {
      if (Math.abs(dx) < 6) return;
      didDrag.current = true;
      suppressClick.current = true;
      el.setPointerCapture(e.pointerId);
    }
    scrollPosition.current = dragData.current.startScrollLeft - dx;
    const track = el.firstElementChild as HTMLElement | null;
    const firstCard = track?.firstElementChild as HTMLElement | null;
    const renderedCardWidth = firstCard?.getBoundingClientRect().width ?? 0;
    const w = renderedCardWidth > 0
      ? renderedCardWidth * validEntries.length
      : el.scrollWidth / 3;
    if (scrollPosition.current >= w * 2) {
      scrollPosition.current -= w;
      dragData.current.startScrollLeft -= w;
    } else if (scrollPosition.current < 0) {
      scrollPosition.current += w;
      dragData.current.startScrollLeft += w;
    }
    el.scrollLeft = scrollPosition.current;
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    dragging.current = false;
    const el = scrollRef.current;
    el?.classList.remove('dragging');
    if (el?.hasPointerCapture(e.pointerId)) {
      el.releasePointerCapture(e.pointerId);
    }
  };

  const onCarouselClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!suppressClick.current) return;
    e.preventDefault();
    e.stopPropagation();
    suppressClick.current = false;
  };

  const onPointerLeave = () => {
    // Before the drag threshold, no pointer capture has been taken, so a
    // release outside the carousel would otherwise leave auto-scroll paused.
    if (!didDrag.current) {
      dragging.current = false;
      scrollRef.current?.classList.remove('dragging');
    }
  };

  /* ── Mobile scroll → dot pagination ────────────────────────────────────── */
  const handleMobileScroll = () => {
    const el = mobileScrollRef.current;
    if (!el) return;
    // Card width is 76vw; gap is 12px between cards; padding-left is 12vw.
    // With scroll-snap-align: center, snap positions increment by (cardW + gap).
    const vw = window.innerWidth;
    const cardW = vw * 0.76;
    const idx = Math.round(el.scrollLeft / (cardW + 12));
    setMobileActiveIdx(Math.max(0, Math.min(idx, validEntries.length - 1)));
  };

  const scrollMobileTo = (idx: number) => {
    const el = mobileScrollRef.current;
    if (!el) return;
    const vw = window.innerWidth;
    const cardW = vw * 0.76;
    el.scrollTo({ left: idx * (cardW + 12), behavior: 'smooth' });
  };

  return (
    <div>
      <style>{STYLES}</style>

      {/* Section header */}
      <div className="flex justify-between items-center mb-4 px-4 sm:px-6 md:px-8">
        <div className="flex items-center gap-2">
          <GamefolioTrendingIcon className="w-5 h-5 text-primary" />
          <h2 className="text-xl sm:text-2xl font-bold">Trending Gamefolios</h2>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          MOBILE — snap carousel (hidden on sm+)
          ═══════════════════════════════════════════════════════════════════════ */}
      <div className="sm:hidden">
        {/* Dark, blurred background — card is the focal point */}
        <div
          className="relative rounded-2xl overflow-hidden"
          style={{
            backgroundImage: 'url("/attached_assets/background-trending_1785854153143.png")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          {/* Heavy dark overlay + blur to subordinate the background */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'rgba(14,16,25,0.84)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            }}
          />

          <div style={{ position: 'relative', zIndex: 2 }}>
            {/* Snap scroll track */}
            <div
              ref={mobileScrollRef}
              className="mobile-snap-scroll"
              onScroll={handleMobileScroll}
              style={{
                gap: 12,
                /* 12vw padding on each side: first card starts at 12vw, peek = ~12vw of next */
                padding: '20px 12vw 0',
              }}
            >
              {isLoading
                ? Array.from({ length: 3 }).map((_, i) => (
                    <div
                      key={i}
                      style={{ flexShrink: 0, width: '76vw', scrollSnapAlign: 'center' }}
                    >
                      <MobileCardSkeleton />
                    </div>
                  ))
                : validEntries.length === 0
                  ? (
                    <div className="flex items-center justify-center py-16 text-white/30 text-sm w-full">
                      No trending data yet.
                    </div>
                  )
                  : validEntries.map((entry) => (
                      <div
                        key={entry.userId}
                        style={{ flexShrink: 0, width: '76vw', scrollSnapAlign: 'center' }}
                      >
                        <CreatorCard entry={entry} period={period} compact />
                      </div>
                    ))
              }
            </div>

            {/* Dot pagination */}
            {validEntries.length > 1 && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: 6,
                  padding: '14px 0 20px',
                }}
              >
                {validEntries.slice(0, 15).map((_, i) => (
                  <button
                    key={i}
                    aria-label={`Go to card ${i + 1}`}
                    onClick={() => scrollMobileTo(i)}
                    style={{
                      width: i === mobileActiveIdx ? 20 : 5,
                      height: 4,
                      borderRadius: 2,
                      background: i === mobileActiveIdx ? '#B7FF1A' : 'rgba(255,255,255,0.22)',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      transition: 'width 0.28s ease, background 0.28s ease',
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          DESKTOP — existing infinite auto-scroll (hidden on mobile)
          ═══════════════════════════════════════════════════════════════════════ */}
      <div
        className="hidden sm:block relative overflow-hidden rounded-2xl trending-bg-pattern"
        style={{ padding: '20px 0' }}
      >
        {/* Navy veil keeps the lightning pattern atmospheric without competing with cards. */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'rgba(14,16,25,0.68)',
            backdropFilter: 'blur(2px)',
            WebkitBackdropFilter: 'blur(2px)',
            zIndex: 1,
          }}
        />

        {/* Edge fade overlays */}
        <div className="absolute left-0 top-0 bottom-0 w-16 pointer-events-none"
          style={{ background: 'linear-gradient(to right, #0B1319, transparent)', zIndex: 10 }} />
        <div className="absolute right-0 top-0 bottom-0 w-16 pointer-events-none"
          style={{ background: 'linear-gradient(to left, #0B1319, transparent)', zIndex: 10 }} />

        {isLoading ? (
          <div className="flex gap-4 px-5" style={{ zIndex: 11, position: 'relative' }}>
            {Array(6).fill(0).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        ) : validEntries.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-white/30 text-sm" style={{ zIndex: 11, position: 'relative' }}>
            No trending data yet.
          </div>
        ) : (
          <div
            ref={scrollRef}
            className="fire-carousel-scroll"
            style={{ zIndex: 11, position: 'relative' }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onPointerLeave={onPointerLeave}
            onClickCapture={onCarouselClick}
          >
            <div className="fire-carousel-track" style={{ paddingLeft: CARD_GAP }}>
              {displayEntries.map((entry, idx) => (
                <div key={`${entry.userId}-${idx}`} style={{ paddingRight: CARD_GAP, flexShrink: 0 }}>
                  <CreatorCard entry={entry} period={period} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FeaturedUsersSection;
