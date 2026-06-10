import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Copy, Check, RefreshCw, Radio, Video, Lock } from "lucide-react";

interface OwnerStream {
  id: number;
  status: "idle" | "live";
  title: string | null;
  viewerCount: number;
  playbackId: string;
  ingestUrl: string;
  streamKey: string;
  playerUrl: string | null;
}

function CopyField({ label, value, secret = false }: { label: string; value: string; secret?: boolean }) {
  const [copied, setCopied] = useState(false);
  const [reveal, setReveal] = useState(!secret);
  const copy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <div className="flex gap-2">
        <Input
          readOnly
          value={reveal ? value : "•".repeat(Math.min(value.length, 32))}
          className="font-mono text-sm"
          onFocus={(e) => e.target.select()}
        />
        {secret && (
          <Button variant="outline" size="icon" onClick={() => setReveal((r) => !r)} title={reveal ? "Hide" : "Reveal"}>
            <Lock className="h-4 w-4" />
          </Button>
        )}
        <Button variant="outline" size="icon" onClick={copy} title="Copy">
          {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}

export default function StreamStudioPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: stream, isLoading } = useQuery<OwnerStream | null>({
    queryKey: ["/api/streams/me"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/streams/me");
      return res.json();
    },
    enabled: !!user?.isPartner,
  });

  const provision = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/streams/live-input");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/streams/me"], data);
      toast({ title: "Stream ready", description: "Paste the server URL + key into OBS." });
    },
    onError: (e: any) => toast({ title: "Couldn't set up stream", description: e.message, variant: "destructive" }),
  });

  const rotate = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/streams/rotate-key");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/streams/me"], data);
      toast({ title: "Stream key rotated", description: "Update OBS with the new key." });
    },
    onError: (e: any) => toast({ title: "Couldn't rotate key", description: e.message, variant: "destructive" }),
  });

  // Non-partners don't get the studio.
  if (user && !user.isPartner) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <Lock className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold mb-2">Streamer Partners only</h1>
        <p className="text-muted-foreground mb-6">
          Live streaming to Gamefolio is part of the Streamer Partner programme.
        </p>
        <Link href="/">
          <Button variant="outline">Back home</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <Link href="/" className="inline-flex items-center text-sm text-muted-foreground mb-4 hover:text-foreground">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Video className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Stream Studio</h1>
          <p className="text-sm text-muted-foreground">Go live on Gamefolio straight from OBS.</p>
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-48 w-full rounded-xl" />
      ) : !stream ? (
        <Card>
          <CardHeader>
            <CardTitle>Set up live streaming</CardTitle>
            <CardDescription>
              We'll create your personal ingest endpoint. You'll paste a server URL and stream key into OBS, then hit
              "Start Streaming".
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => provision.mutate()} disabled={provision.isPending}>
              {provision.isPending ? "Setting up…" : "Enable live streaming"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Status</CardTitle>
              <span
                className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
                  stream.status === "live"
                    ? "bg-red-500/15 text-red-500"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <Radio className="h-3 w-3" />
                {stream.status === "live" ? "LIVE" : "Offline"}
              </span>
            </CardHeader>
            {stream.status === "live" && (
              <CardContent className="text-sm text-muted-foreground">
                {stream.viewerCount} watching ·{" "}
                <Link href={`/live/${user?.username}`} className="text-primary hover:underline">
                  View your stream page
                </Link>
              </CardContent>
            )}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">OBS settings</CardTitle>
              <CardDescription>
                In OBS: Settings → Stream → Service "Custom…", then paste these. Keep your stream key private.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <CopyField label="Server (URL)" value={stream.ingestUrl} />
              <CopyField label="Stream key" value={stream.streamKey} secret />
              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => rotate.mutate()}
                  disabled={rotate.isPending}
                  className="gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${rotate.isPending ? "animate-spin" : ""}`} />
                  Rotate key
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
