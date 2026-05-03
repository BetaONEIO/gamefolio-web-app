import { useState, useEffect, useRef, RefObject } from "react";
import { RefreshCw } from "lucide-react";
import { useMobile } from "@/hooks/use-mobile";

const TRIGGER_DISTANCE = 80;
const MAX_PULL = 120;
const RESISTANCE = 0.5;

interface PullToRefreshProps {
  containerRef: RefObject<HTMLElement>;
  onRefresh: () => Promise<void> | void;
  children: React.ReactNode;
}

export function PullToRefresh({ containerRef, onRefresh, children }: PullToRefreshProps) {
  const isMobile = useMobile();
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Mirror state into a ref so the gesture handlers (re-attached only on
  // mount) can read the latest values without triggering re-attachment on
  // every state update.
  const stateRef = useRef({ pullDistance: 0, isRefreshing: false });
  stateRef.current.pullDistance = pullDistance;
  stateRef.current.isRefreshing = isRefreshing;

  useEffect(() => {
    if (!isMobile) return;
    const container = containerRef.current;
    if (!container) return;

    let startY: number | null = null;
    let pulling = false;

    const handleTouchStart = (e: TouchEvent) => {
      if (container.scrollTop > 0 || stateRef.current.isRefreshing) return;
      startY = e.touches[0].clientY;
      pulling = true;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!pulling || startY === null) return;
      const dy = e.touches[0].clientY - startY;
      if (dy <= 0) {
        pulling = false;
        setPullDistance(0);
        return;
      }
      const distance = Math.min(dy * RESISTANCE, MAX_PULL);
      setPullDistance(distance);
      if (distance > 5) e.preventDefault();
    };

    const handleTouchEnd = async () => {
      if (!pulling) return;
      pulling = false;
      const triggered = stateRef.current.pullDistance >= TRIGGER_DISTANCE;
      setPullDistance(0);
      startY = null;
      if (triggered) {
        setIsRefreshing(true);
        try {
          await onRefresh();
        } finally {
          setIsRefreshing(false);
        }
      }
    };

    container.addEventListener("touchstart", handleTouchStart, { passive: true });
    container.addEventListener("touchmove", handleTouchMove, { passive: false });
    container.addEventListener("touchend", handleTouchEnd);
    container.addEventListener("touchcancel", handleTouchEnd);

    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
      container.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [isMobile, containerRef, onRefresh]);

  if (!isMobile) return <>{children}</>;

  const visible = pullDistance > 0 || isRefreshing;
  const opacity = Math.min(pullDistance / TRIGGER_DISTANCE, 1);

  return (
    <>
      {visible && (
        <div
          className="flex items-center justify-center sticky top-0 z-30 pointer-events-none"
          style={{
            height: isRefreshing ? 60 : pullDistance,
            opacity: isRefreshing ? 1 : opacity,
          }}
        >
          <RefreshCw
            className={`h-6 w-6 text-primary ${isRefreshing ? "animate-spin" : ""}`}
            style={{
              transform: !isRefreshing ? `rotate(${pullDistance * 4}deg)` : undefined,
            }}
          />
        </div>
      )}
      {children}
    </>
  );
}
