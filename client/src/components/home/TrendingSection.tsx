import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ChevronRight, ChevronLeft, Radio, Users, Zap, Eye, Heart } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import VideoClipCard from "@/components/clips/VideoClipCard";
import { LatestReelsCarousel } from "@/components/clips/LatestReelsCarousel";
import { LiveStreamsSection } from "@/components/home/LiveStreamsSection";
import FeaturedUsersSection from "@/components/home/FeaturedUsersSection";
import { useAuth } from "@/hooks/use-auth";

type TrendingTab = 'clips' | 'reels' | 'creators' | 'streams';

const TABS: { id: TrendingTab; label: string; icon: React.ReactNode }[] = [
  { id: 'clips',    label: 'Trending Clips',    icon: <Zap className="w-3.5 h-3.5" /> },
  { id: 'reels',    label: 'Trending Reels',    icon: <Eye className="w-3.5 h-3.5" /> },
  { id: 'creators', label: 'Top Creators',      icon: <Users className="w-3.5 h-3.5" /> },
  { id: 'streams',  label: 'Live Streams',      icon: <Radio className="w-3.5 h-3.5" /> },
];

function HScrollCarousel({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState(false);
  const [start, setStart] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  return (
    <div className="relative">
      <button
        onClick={() => ref.current && (ref.current.scrollLeft -= 480)}
        className="absolute -left-4 top-1/2 -translate-y-1/2 z-10 bg-black/70 hover:bg-black/90 text-white p-2 rounded-full transition-colors hidden sm:flex items-center justify-center shadow-lg"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button
        onClick={() => ref.current && (ref.current.scrollLeft += 480)}
        className="absolute -right-4 top-1/2 -translate-y-1/2 z-10 bg-black/70 hover:bg-black/90 text-white p-2 rounded-full transition-colors hidden sm:flex items-center justify-center shadow-lg"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
      <div
        ref={ref}
        className={`flex gap-4 overflow-x-auto scrollbar-hide pb-4 px-1 py-2 select-none ${drag ? 'cursor-grabbing' : 'cursor-grab'}`}
        style={{ scrollBehavior: drag ? 'auto' : 'smooth' }}
        onMouseDown={e => { setDrag(true); setStart(e.clientX); setScrollLeft(ref.current?.scrollLeft || 0); e.preventDefault(); }}
        onMouseMove={e => { if (!drag || !ref.current) return; ref.current.scrollLeft = scrollLeft - (e.clientX - start); }}
        onMouseUp={() => setDrag(false)}
        onMouseLeave={() => setDrag(false)}
      >
        {children}
      </div>
    </div>
  );
}

export function TrendingSection() {
  const [activeTab, setActiveTab] = useState<TrendingTab>('clips');
  const { user } = useAuth();
  const userId = user?.id;

  const { data: trendingClips, isLoading: loadingClips } = useQuery<any[]>({
    queryKey: ['/api/clips/trending'],
    queryFn: async () => {
      const r = await fetch('/api/clips/trending', { credentials: 'include' });
      if (!r.ok) throw new Error('Failed');
      return r.json();
    },
    staleTime: 60_000,
  });

  const { data: trendingReels, isLoading: loadingReels } = useQuery<any[]>({
    queryKey: ['/api/clips/reels/trending'],
    queryFn: async () => {
      const r = await fetch('/api/clips/reels/trending', { credentials: 'include' });
      if (!r.ok) throw new Error('Failed');
      return r.json();
    },
    staleTime: 60_000,
  });

  const clips = Array.isArray(trendingClips) ? trendingClips.filter((c: any) => c.videoType !== 'reel') : [];
  const reels = Array.isArray(trendingReels) ? trendingReels : [];

  return (
    <section className="px-4 sm:px-6 md:px-8 pt-8">
      {/* Section header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-5 rounded-full" style={{ background: '#B7FF1A' }} />
          <h2 className="text-xl sm:text-2xl font-black text-white">Trending</h2>
        </div>
        <Link href="/trending" className="text-sm font-semibold flex items-center gap-1 hover:opacity-80 transition-opacity" style={{ color: '#B7FF1A' }}>
          View all <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Tab bar */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-5">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm flex-shrink-0 transition-all"
            style={{
              background: activeTab === tab.id ? '#B7FF1A' : 'rgba(255,255,255,0.06)',
              color: activeTab === tab.id ? '#0B1319' : 'rgba(255,255,255,0.5)',
              border: activeTab === tab.id ? 'none' : '1px solid rgba(255,255,255,0.06)',
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'clips' && (
        loadingClips ? (
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex-shrink-0 w-[280px] sm:w-[360px]">
                <Skeleton className="aspect-video rounded-xl" />
              </div>
            ))}
          </div>
        ) : clips.length > 0 ? (
          <HScrollCarousel>
            {clips.map((clip: any) => (
              <div key={`tc-${clip.id}`} className="flex-shrink-0 w-[280px] sm:w-[360px] md:w-[420px]">
                <VideoClipCard clip={clip} userId={userId} clipsList={clips} />
              </div>
            ))}
          </HScrollCarousel>
        ) : (
          <div className="text-center py-12 rounded-2xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-white/30 text-sm">No trending clips yet</p>
          </div>
        )
      )}

      {activeTab === 'reels' && (
        <LatestReelsCarousel reels={reels} isLoading={loadingReels} userId={userId} />
      )}

      {activeTab === 'creators' && (
        <FeaturedUsersSection />
      )}

      {activeTab === 'streams' && (
        <LiveStreamsSection />
      )}
    </section>
  );
}
