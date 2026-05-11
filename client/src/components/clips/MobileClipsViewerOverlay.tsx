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
      className="fixed inset-0 flex flex-col"
      style={{ background: '#03080A', zIndex: 60 }}
    >
      {/* Top bar */}
      <div
        className="flex-shrink-0 flex items-center justify-between px-4 pb-3"
        style={{ background: '#03080A', paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}
      >
        <button
          onClick={onBack}
          className="w-9 h-9 flex items-center justify-center rounded-full transition-colors"
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
            className="text-sm font-semibold px-3 py-1.5 rounded-full transition-colors"
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

      {/* Snap-scrolling feed */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          scrollSnapType: 'y mandatory',
          WebkitOverflowScrolling: 'touch',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 60px)',
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
