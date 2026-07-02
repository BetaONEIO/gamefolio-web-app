import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { Heart, Eye, Clock, Video, Camera, Film, ChevronRight, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

type FeedTab = 'all' | 'clips' | 'reels' | 'screenshots';

interface FeedItem {
  id: string;
  type: 'clip' | 'reel' | 'screenshot';
  title: string;
  thumbnailUrl: string | null;
  username: string;
  avatarUrl: string | null;
  gameName: string | null;
  views: number;
  likes: number;
  createdAt: string | null;
  href: string;
}

function timeAgo(ts: string | null): string {
  if (!ts) return '';
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function fmtNum(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  clip: <Video className="w-2.5 h-2.5" />,
  reel: <Film className="w-2.5 h-2.5" />,
  screenshot: <Camera className="w-2.5 h-2.5" />,
};

const TYPE_COLORS: Record<string, string> = {
  clip: '#B7FF1A',
  reel: '#9B59B6',
  screenshot: '#1B9ADB',
};

const TYPE_LABELS: Record<string, string> = {
  clip: 'Clip',
  reel: 'Reel',
  screenshot: 'Shot',
};

function FeedCard({ item }: { item: FeedItem }) {
  const accentColor = TYPE_COLORS[item.type];
  return (
    <Link href={item.href}>
      <div
        className="group rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-2xl"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        {/* Thumbnail */}
        <div className="relative aspect-video bg-black overflow-hidden">
          {item.thumbnailUrl ? (
            <img
              src={item.thumbnailUrl}
              alt={item.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-zinc-900">
              {item.type === 'screenshot' ? <Camera className="w-8 h-8 text-white/10" /> : <Video className="w-8 h-8 text-white/10" />}
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          {/* Type badge */}
          <div
            className="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-black"
            style={{ background: `${accentColor}25`, color: accentColor, border: `1px solid ${accentColor}40` }}
          >
            {TYPE_ICONS[item.type]}
            {TYPE_LABELS[item.type]}
          </div>
          {/* Views */}
          <div className="absolute bottom-2 right-2 flex items-center gap-1 text-white/70 text-[10px]">
            <Eye className="w-2.5 h-2.5" />
            <span>{fmtNum(item.views)}</span>
          </div>
        </div>

        {/* Info */}
        <div className="p-3">
          <div className="text-white font-semibold text-sm leading-snug line-clamp-2 mb-2 group-hover:text-white/90 transition-colors">
            {item.title}
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 min-w-0">
              {item.avatarUrl ? (
                <img src={item.avatarUrl} alt={item.username} className="w-5 h-5 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className="w-5 h-5 rounded-full bg-white/10 flex-shrink-0 flex items-center justify-center">
                  <Users className="w-2.5 h-2.5 text-white/30" />
                </div>
              )}
              <span className="text-white/50 text-[11px] truncate">@{item.username}</span>
            </div>
            <div className="flex items-center gap-2 text-white/30 text-[10px] flex-shrink-0 ml-2">
              <span className="flex items-center gap-0.5"><Heart className="w-2.5 h-2.5" />{fmtNum(item.likes)}</span>
              <span className="flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />{timeAgo(item.createdAt)}</span>
            </div>
          </div>
          {item.gameName && (
            <div className="mt-1.5 text-[10px] text-white/30 truncate">{item.gameName}</div>
          )}
        </div>
      </div>
    </Link>
  );
}

function FeedCardSkeleton() {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <Skeleton className="aspect-video w-full" />
      <div className="p-3">
        <Skeleton className="h-4 w-full mb-1" />
        <Skeleton className="h-4 w-3/4 mb-3" />
        <div className="flex items-center gap-2">
          <Skeleton className="w-5 h-5 rounded-full" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
    </div>
  );
}

export function CommunityFeed() {
  const [activeTab, setActiveTab] = useState<FeedTab>('all');
  const { user } = useAuth();

  const { data: clips, isLoading: loadingClips } = useQuery<any[]>({
    queryKey: ['/api/clips/latest'],
    queryFn: async () => {
      const r = await fetch('/api/clips/latest?limit=20', { credentials: 'include' });
      if (!r.ok) throw new Error('Failed');
      return r.json();
    },
    staleTime: 30_000,
  });

  const { data: reels, isLoading: loadingReels } = useQuery<any[]>({
    queryKey: ['/api/reels/latest'],
    queryFn: async () => {
      const r = await fetch('/api/reels/latest?limit=12', { credentials: 'include' });
      if (!r.ok) throw new Error('Failed');
      return r.json();
    },
    staleTime: 30_000,
  });

  const { data: screenshots, isLoading: loadingScreenshots } = useQuery<any[]>({
    queryKey: ['/api/screenshots/latest'],
    queryFn: async () => {
      const r = await fetch('/api/screenshots/latest?limit=12', { credentials: 'include' });
      if (!r.ok) throw new Error('Failed');
      return r.json();
    },
    staleTime: 30_000,
  });

  const isLoading = loadingClips || loadingReels || loadingScreenshots;

  const allItems = useMemo<FeedItem[]>(() => {
    const items: FeedItem[] = [];

    (clips || []).filter((c: any) => c.videoType !== 'reel').slice(0, 10).forEach((c: any) => {
      items.push({
        id: `clip-${c.id}`,
        type: 'clip',
        title: c.title || 'Untitled',
        thumbnailUrl: c.thumbnailUrl || null,
        username: c.user?.username || c.username || 'unknown',
        avatarUrl: c.user?.avatarUrl || null,
        gameName: c.game?.name || c.gameName || null,
        views: c.views || 0,
        likes: c.likesCount || 0,
        createdAt: c.createdAt,
        href: `/clips/${c.id}`,
      });
    });

    (reels || []).slice(0, 8).forEach((r: any) => {
      items.push({
        id: `reel-${r.id}`,
        type: 'reel',
        title: r.title || 'Untitled Reel',
        thumbnailUrl: r.thumbnailUrl || null,
        username: r.user?.username || r.username || 'unknown',
        avatarUrl: r.user?.avatarUrl || null,
        gameName: r.game?.name || r.gameName || null,
        views: r.views || 0,
        likes: r.likesCount || 0,
        createdAt: r.createdAt,
        href: `/clips/${r.id}`,
      });
    });

    (screenshots || []).slice(0, 8).forEach((s: any) => {
      items.push({
        id: `screenshot-${s.id}`,
        type: 'screenshot',
        title: s.title || s.caption || 'Screenshot',
        thumbnailUrl: s.imageUrl || s.thumbnailUrl || null,
        username: s.user?.username || s.username || 'unknown',
        avatarUrl: s.user?.avatarUrl || null,
        gameName: s.game?.name || s.gameName || null,
        views: s.views || 0,
        likes: s.likesCount || 0,
        createdAt: s.createdAt,
        href: `/screenshots/${s.id}`,
      });
    });

    // Sort by time
    return items.sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tb - ta;
    });
  }, [clips, reels, screenshots]);

  const filteredItems = useMemo(() => {
    if (activeTab === 'all') return allItems.slice(0, 18);
    return allItems.filter(i => {
      if (activeTab === 'clips') return i.type === 'clip';
      if (activeTab === 'reels') return i.type === 'reel';
      if (activeTab === 'screenshots') return i.type === 'screenshot';
      return true;
    }).slice(0, 18);
  }, [allItems, activeTab]);

  const tabs: { id: FeedTab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'all', label: 'All', icon: null },
    { id: 'clips', label: 'Clips', icon: <Video className="w-3 h-3" />, count: (clips || []).filter((c: any) => c.videoType !== 'reel').length },
    { id: 'reels', label: 'Reels', icon: <Film className="w-3 h-3" />, count: (reels || []).length },
    { id: 'screenshots', label: 'Screenshots', icon: <Camera className="w-3 h-3" />, count: (screenshots || []).length },
  ];

  return (
    <section className="px-4 sm:px-6 md:px-8 pt-8">
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-5 rounded-full" style={{ background: '#B7FF1A' }} />
            <h2 className="text-xl sm:text-2xl font-black text-white">Latest from the Community</h2>
          </div>
          {/* Live pulse */}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full" style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[10px] font-black text-red-400">LIVE</span>
          </div>
        </div>
        <Link href="/explore" className="text-sm font-semibold flex items-center gap-1 hover:opacity-80 transition-opacity" style={{ color: '#B7FF1A' }}>
          View all <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5 overflow-x-auto scrollbar-hide">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-sm flex-shrink-0 transition-all"
            style={{
              background: activeTab === tab.id ? '#B7FF1A' : 'rgba(255,255,255,0.06)',
              color: activeTab === tab.id ? '#0B1319' : 'rgba(255,255,255,0.5)',
              border: activeTab === tab.id ? 'none' : '1px solid rgba(255,255,255,0.06)',
            }}
          >
            {tab.icon}
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="text-[10px] opacity-60">{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {Array.from({ length: 10 }).map((_, i) => <FeedCardSkeleton key={i} />)}
        </div>
      ) : filteredItems.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {filteredItems.map(item => <FeedCard key={item.id} item={item} />)}
        </div>
      ) : (
        <div className="text-center py-16 rounded-2xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="text-4xl mb-3">🎮</div>
          <p className="text-white/30 text-sm">No content yet — be the first to upload!</p>
        </div>
      )}
    </section>
  );
}
