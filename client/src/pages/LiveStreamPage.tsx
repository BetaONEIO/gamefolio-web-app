import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Radio, ArrowLeft } from "lucide-react";

interface PublicStream {
  status: "idle" | "live";
  title: string | null;
  viewerCount: number;
  playbackId: string;
  playerUrl: string | null;
  user?: { username: string; displayName: string; avatarUrl: string | null };
}

export default function LiveStreamPage() {
  const { username } = useParams<{ username: string }>();

  const { data: stream, isLoading, error } = useQuery<PublicStream>({
    queryKey: [`/api/streams/u/${username}`],
    queryFn: async () => {
      const res = await fetch(`/api/streams/u/${username}`);
      if (!res.ok) throw new Error("Stream not found");
      return res.json();
    },
    refetchInterval: 30_000, // poll so the page flips to live without a reload
  });

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        <Skeleton className="aspect-video w-full rounded-xl" />
        <Skeleton className="h-6 w-1/2" />
      </div>
    );
  }

  if (error || !stream) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-2">Stream not found</h1>
        <Link href="/">
          <Button variant="outline">Back home</Button>
        </Link>
      </div>
    );
  }

  const isLive = stream.status === "live";

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <Link href="/" className="inline-flex items-center text-sm text-muted-foreground mb-4 hover:text-foreground">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back
      </Link>

      <div className="aspect-video w-full rounded-xl overflow-hidden bg-black relative">
        {isLive && stream.playerUrl ? (
          <iframe
            src={stream.playerUrl}
            className="w-full h-full"
            allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
            allowFullScreen
            title={`${stream.user?.displayName ?? username} live`}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground gap-2">
            <Radio className="h-8 w-8" />
            <p className="font-medium">Offline</p>
            <p className="text-sm">This streamer isn't live right now.</p>
          </div>
        )}
        {isLive && (
          <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-red-600 text-white">
            <Radio className="h-3 w-3" /> LIVE
          </span>
        )}
      </div>

      <div className="flex items-center gap-3 mt-4">
        {stream.user && (
          <Link href={`/profile/${stream.user.username}`}>
            <Avatar className="h-11 w-11">
              <AvatarImage src={stream.user.avatarUrl ?? undefined} />
              <AvatarFallback>{stream.user.displayName?.[0]?.toUpperCase() ?? "?"}</AvatarFallback>
            </Avatar>
          </Link>
        )}
        <div className="min-w-0">
          <h1 className="font-bold truncate">{stream.title || `${stream.user?.displayName ?? username} is live`}</h1>
          {stream.user && (
            <Link href={`/profile/${stream.user.username}`} className="text-sm text-muted-foreground hover:text-foreground">
              @{stream.user.username}
              {isLive && ` · ${stream.viewerCount} watching`}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
