import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ChevronRight, Star, Gamepad2, Trophy, Calendar, Swords } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface DiscoverCard {
  id: string;
  type: 'featured_game' | 'featured_creator' | 'weekend_event' | 'tournament' | 'campaign';
  title: string;
  subtitle: string;
  imageUrl?: string | null;
  accentColor: string;
  icon: React.ReactNode;
  cta: string;
  href: string;
}

function DiscoverCard({ card }: { card: DiscoverCard }) {
  return (
    <Link href={card.href}>
      <div
        className="group relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 hover:scale-[1.03] hover:shadow-2xl flex-shrink-0"
        style={{
          width: 240,
          minHeight: 160,
          background: card.imageUrl
            ? `linear-gradient(135deg, rgba(11,19,25,0.85) 0%, rgba(11,19,25,0.5) 100%)`
            : `linear-gradient(135deg, ${card.accentColor}18 0%, rgba(11,19,25,0.95) 100%)`,
          border: `1px solid ${card.accentColor}30`,
          boxShadow: `0 0 20px ${card.accentColor}10`,
        }}
      >
        {card.imageUrl && (
          <img
            src={card.imageUrl}
            alt={card.title}
            className="absolute inset-0 w-full h-full object-cover -z-10 transition-transform duration-300 group-hover:scale-105"
          />
        )}
        <div className="absolute inset-0" style={{ background: `linear-gradient(to top, rgba(11,19,25,0.95) 30%, rgba(11,19,25,0.3) 100%)` }} />

        <div className="relative p-4 flex flex-col justify-end h-full" style={{ minHeight: 160 }}>
          <div className="mb-auto pt-1">
            <div
              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest mb-2"
              style={{ background: `${card.accentColor}25`, color: card.accentColor, border: `1px solid ${card.accentColor}40` }}
            >
              {card.icon}
              {card.type.replace('_', ' ')}
            </div>
          </div>
          <div>
            <div className="text-white font-black text-base leading-snug mb-1">{card.title}</div>
            <div className="text-white/50 text-xs mb-3 line-clamp-2">{card.subtitle}</div>
            <div
              className="inline-flex items-center gap-1 text-xs font-black px-3 py-1.5 rounded-lg transition-all group-hover:opacity-90"
              style={{ background: card.accentColor, color: '#0B1319' }}
            >
              {card.cta} <ChevronRight className="w-3 h-3" />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

function CardSkeleton() {
  return (
    <div className="flex-shrink-0 rounded-2xl overflow-hidden" style={{ width: 240, minHeight: 160, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <Skeleton className="w-full h-full" style={{ minHeight: 160 }} />
    </div>
  );
}

export function DiscoverSection() {
  const { data: featuredGamefolio, isLoading } = useQuery<any>({
    queryKey: ['/api/featured/gamefolio'],
    queryFn: async () => {
      const r = await fetch('/api/featured/gamefolio', { credentials: 'include' });
      if (!r.ok) throw new Error('Failed');
      return r.json();
    },
    staleTime: 60_000,
  });

  const { data: trendingGames } = useQuery<any[]>({
    queryKey: ['/api/twitch/games/top'],
    queryFn: async () => {
      const r = await fetch('/api/twitch/games/top', { credentials: 'include' });
      if (!r.ok) throw new Error('Failed');
      return r.json();
    },
    staleTime: 120_000,
  });

  const cards: DiscoverCard[] = [];

  // Featured creator card
  if (featuredGamefolio?.user) {
    const u = featuredGamefolio.user;
    cards.push({
      id: 'featured-creator',
      type: 'featured_creator',
      title: u.displayName || u.username,
      subtitle: `Level ${u.level || 1} · ${featuredGamefolio.clipsCount || 0} clips · ${featuredGamefolio.followersCount || 0} followers`,
      imageUrl: u.bannerUrl || u.avatarUrl || null,
      accentColor: u.accentColor || '#B7FF1A',
      icon: <Star className="w-2.5 h-2.5" />,
      cta: 'View Profile',
      href: `/@${u.username}`,
    });
  }

  // Featured game from Twitch top games
  if (trendingGames && trendingGames.length > 0) {
    const game = trendingGames[0];
    const artUrl = game.box_art_url
      ? game.box_art_url.replace('{width}', '144').replace('{height}', '192')
      : null;
    cards.push({
      id: 'featured-game',
      type: 'featured_game',
      title: game.name,
      subtitle: 'Trending on Twitch right now — upload your clips!',
      imageUrl: artUrl,
      accentColor: '#9B59B6',
      icon: <Gamepad2 className="w-2.5 h-2.5" />,
      cta: 'Browse Game',
      href: '/explore',
    });
  }

  // Weekend XP event (static for now)
  cards.push({
    id: 'weekend-event',
    type: 'weekend_event',
    title: 'Double XP Weekend',
    subtitle: 'Earn 2× XP on all uploads and interactions this weekend only!',
    imageUrl: null,
    accentColor: '#F59E0B',
    icon: <Star className="w-2.5 h-2.5" />,
    cta: 'Join Event',
    href: '/explore',
  });

  // Community tournament (static)
  cards.push({
    id: 'tournament',
    type: 'tournament',
    title: 'Monthly Clip Tournament',
    subtitle: 'Submit your best clip to win GFT rewards and a featured spot.',
    imageUrl: null,
    accentColor: '#1B9ADB',
    icon: <Trophy className="w-2.5 h-2.5" />,
    cta: 'Enter Now',
    href: '/explore',
  });

  // Sponsored campaign
  cards.push({
    id: 'campaign',
    type: 'campaign',
    title: 'Indie Dev Spotlight',
    subtitle: 'Discover and promote hidden gem indie games — earn bounty rewards.',
    imageUrl: null,
    accentColor: '#22C55E',
    icon: <Swords className="w-2.5 h-2.5" />,
    cta: 'Explore',
    href: '/explore',
  });

  return (
    <section className="px-4 sm:px-6 md:px-8 pt-8 pb-24 sm:pb-10">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-5 rounded-full" style={{ background: '#B7FF1A' }} />
          <h2 className="text-xl sm:text-2xl font-black text-white">Discover</h2>
        </div>
        <Link href="/explore" className="text-sm font-semibold flex items-center gap-1 hover:opacity-80 transition-opacity" style={{ color: '#B7FF1A' }}>
          Explore all <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
        ) : (
          cards.map(card => <DiscoverCard key={card.id} card={card} />)
        )}
      </div>
    </section>
  );
}
