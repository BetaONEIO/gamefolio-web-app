import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Radio, Maximize2 } from "lucide-react";

interface PublicStream {
  status: "idle" | "live";
  title: string | null;
  viewerCount: number;
  playerUrl: string | null;
}

/**
 * Live-stream card shown on a user's profile. Self-contained: polls the public
 * stream endpoint and renders NOTHING unless the user is currently live, so it's
 * safe to drop into any profile without affecting non-streamers.
 */
export function ProfileLiveStream({ username }: { username: string }) {
  const { data } = useQuery<PublicStream | null>({
    queryKey: [`/api/streams/u/${username}`],
    queryFn: async () => {
      const res = await fetch(`/api/streams/u/${username}`);
      if (res.status === 404) return null; // user has no stream — normal
      if (!res.ok) return null;
      return res.json();
    },
    refetchInterval: 30_000, // flip to live without a reload
    retry: false,
  });

  if (!data || data.status !== "live" || !data.playerUrl) return null;

  return (
    <div className="w-full max-w-2xl mt-4 rounded-xl overflow-hidden border border-red-500/30 bg-black/40">
      <div className="flex items-center justify-between px-3 py-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-red-600 text-white">
          <Radio className="h-3 w-3" /> LIVE
          {data.viewerCount > 0 && (
            <span className="font-normal opacity-90">· {data.viewerCount} watching</span>
          )}
        </span>
        <Link
          href={`/live/${username}`}
          className="inline-flex items-center gap-1 text-xs text-white/70 hover:text-white"
        >
          <Maximize2 className="h-3.5 w-3.5" /> Full screen
        </Link>
      </div>
      <div className="aspect-video w-full bg-black">
        <iframe
          src={data.playerUrl}
          className="w-full h-full"
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
          allowFullScreen
          title={`${username} live`}
        />
      </div>
      {data.title && (
        <p className="px-3 py-2 text-sm font-medium text-white/90 truncate">{data.title}</p>
      )}
    </div>
  );
}
