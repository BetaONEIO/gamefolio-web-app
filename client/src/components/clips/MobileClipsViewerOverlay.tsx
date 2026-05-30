import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { ClipWithUser } from "@shared/schema";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import ClipFeedCard from "@/components/clips/ClipFeedCard";

interface MobileClipsViewerOverlayProps {
  clips: ClipWithUser[];
  startClipId: number;
  onBack: () => void;
  viewAllHref?: string;
}

const MobileClipsViewerOverlay = ({ clips, startClipId, onBack, viewAllHref }: MobileClipsViewerOverlayProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Scroll to the starting clip
  useEffect(() => {
    if (!scrollRef.current) return;
    const idx = clips.findIndex(c => c.id === startClipId);
    if (idx > 0) {
      const el = scrollRef.current.children[idx] as HTMLElement | undefined;
      el?.scrollIntoView({ behavior: 'instant' as ScrollBehavior });
    }
  }, [startClipId, clips]);

  const content = (
    <div
      className="fixed top-0 left-0 right-0"
      style={{ background: '#081017', zIndex: 9999, bottom: 'var(--mobile-nav-height, 3.5rem)' }}
    >
      {/* Top bar — floats over the feed, no layout height consumed */}
      <div
        className="absolute left-0 right-0 z-10 flex items-center justify-between px-4 pb-3 bg-gradient-to-b from-black/60 to-transparent pointer-events-none"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}
      >
        <button
          onClick={onBack}
          className="w-9 h-9 flex items-center justify-center rounded-full transition-colors pointer-events-auto"
          style={{ color: '#F5F7F2' }}
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <span className="sr-only">Clips</span>
        {viewAllHref && (
          <Link
            href={viewAllHref}
            onClick={onBack}
            className="text-sm font-semibold px-3 py-1.5 rounded-full transition-colors pointer-events-auto"
            style={{
              color: '#B7FF1A',
              border: '1px solid rgba(183, 255, 26, 0.5)',
              background: 'rgba(183, 255, 26, 0.08)',
            }}
          >
            View all
          </Link>
        )}
      </div>

      {/* Snap-scrolling feed — fills the full container height */}
      <div
        ref={scrollRef}
        style={{
          position: 'absolute',
          inset: 0,
          overflowY: 'auto',
          scrollSnapType: 'y mandatory',
          WebkitOverflowScrolling: 'touch',
          paddingBottom: '8px',
        }}
      >
        {clips.map((clip) => (
          <div
            key={clip.id}
            className="flex flex-col justify-center"
            style={{
              scrollSnapAlign: 'start',
              scrollSnapStop: 'always',
              minHeight: '100%',
            }}
          >
            <ClipFeedCard clip={clip} clips={clips} />
          </div>
        ))}
      </div>
    </div>
  );

  return createPortal(content, document.body);
};

export default MobileClipsViewerOverlay;
