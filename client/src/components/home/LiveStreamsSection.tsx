import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { useRef } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Radio } from "lucide-react";

interface TwitchStream {
  id: string;
  user_login: string;
  user_name: string;
  game_name: string;
  title: string;
  viewer_count: number;
  thumbnail_url: string | null;
  is_mature: boolean;
}

function formatViewers(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

function StreamCard({ stream }: { stream: TwitchStream }) {
  const href = `https://www.twitch.tv/${stream.user_login}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex-shrink-0 group rounded-xl overflow-hidden transition-all duration-200 hover:scale-[1.02] hover:shadow-xl"
      style={{ width: 240, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video overflow-hidden bg-black">
        {stream.thumbnail_url ? (
          <img
            src={stream.thumbnail_url}
            alt={stream.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-zinc-900">
            <Radio className="w-8 h-8 text-white/20" />
          </div>
        )}
        {/* Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        {/* LIVE badge */}
        <div className="absolute top-2 left-2 flex items-center gap-1 bg-red-600 px-1.5 py-0.5 rounded text-white text-[10px] font-bold tracking-wide">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          LIVE
        </div>
        {/* Viewer count */}
        <div className="absolute bottom-2 left-2 flex items-center gap-1 text-white text-xs font-medium">
          <Users className="w-3 h-3" />
          <span>{formatViewers(stream.viewer_count)}</span>
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="text-white text-sm font-semibold truncate">{stream.user_name}</p>
        <p className="text-white/50 text-xs truncate mt-0.5">{stream.title}</p>
        {stream.game_name && (
          <span
            className="inline-block mt-2 text-[10px] font-medium px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(183,255,26,0.12)', color: '#B7FF1A' }}
          >
            {stream.game_name}
          </span>
        )}
      </div>
    </a>
  );
}

function StreamCardSkeleton() {
  return (
    <div
      className="flex-shrink-0 rounded-xl overflow-hidden"
      style={{ width: 240, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <Skeleton className="w-full aspect-video" />
      <div className="p-3 space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-36" />
        <Skeleton className="h-4 w-16 rounded-full" />
      </div>
    </div>
  );
}

export function LiveStreamsSection() {
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: streams, isLoading, error } = useQuery<TwitchStream[]>({
    queryKey: ["/api/twitch/streams/top"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    staleTime: 1000 * 60 * 2,
    refetchInterval: 1000 * 60 * 3,
    retry: 1,
  });

  if (error || (!isLoading && (!streams || streams.length === 0))) return null;

  return (
    <section className="mt-12 px-0">
      <div className="flex justify-between items-center mb-5">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <h2 className="text-xl font-semibold text-foreground">Live Now</h2>
          </div>
          <span className="text-xs text-white/30 font-normal">on Twitch</span>
        </div>
        <a
          href="https://www.twitch.tv"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary text-sm font-medium hover:underline flex items-center gap-1"
        >
          View all →
        </a>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto pb-3"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {isLoading
          ? Array(6).fill(0).map((_, i) => <StreamCardSkeleton key={i} />)
          : streams?.map(s => <StreamCard key={s.id} stream={s} />)
        }
      </div>
      <div className="mt-1 text-[9px] text-white/20 flex justify-end">Data: Twitch API</div>
    </section>
  );
}
