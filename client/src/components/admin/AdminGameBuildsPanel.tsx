import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { HardDrive, Globe, Download, Check, X, ShieldAlert, Loader2 } from "lucide-react";
import { formatBytes, PLATFORM_LABELS, type BuildPlatform, type BuildType } from "@shared/game-builds";

interface QueueBuild {
  id: number;
  buildType: BuildType;
  platform: BuildPlatform | null;
  channel: "demo" | "full";
  label: string;
  originalFileName: string;
  sizeBytes: number;
  storedBytes: number | null;
  status: string;
  reviewNotes: string | null;
  downloadCount: number;
  webEntryPath: string | null;
  createdAt: string;
  profileId: number;
  gameName: string | null;
  userId: number;
  username: string;
  displayName: string;
  isIndieDevSubscriber: boolean;
}

interface QueueResponse {
  builds: QueueBuild[];
  counts: Record<string, number>;
  hostingConfigured: boolean;
}

type Decision = { build: QueueBuild; action: "reject" | "takedown" };

const STATUS_TABS = [
  { id: "pending_review", label: "Awaiting review" },
  { id: "approved", label: "Live" },
  { id: "rejected", label: "Rejected" },
  { id: "pending_upload", label: "Incomplete" },
];

export function AdminGameBuildsPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("pending_review");
  const [decision, setDecision] = useState<Decision | null>(null);
  const [reason, setReason] = useState("");

  const { data, isLoading } = useQuery<QueueResponse>({
    queryKey: ["/api/admin/game-builds", { status }],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["/api/admin/game-builds"] });

  const approve = useMutation({
    mutationFn: async (buildId: number) => {
      const res = await apiRequest("POST", `/api/admin/game-builds/${buildId}/approve`);
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message ?? "Approve failed");
    },
    onSuccess: () => {
      toast({ title: "Build approved", description: "It's live on the game page." });
      invalidate();
    },
    onError: (e: any) => toast({ title: "Could not approve", description: e.message, variant: "destructive" }),
  });

  const decide = useMutation({
    mutationFn: async ({ build, action }: Decision) => {
      const res = await apiRequest("POST", `/api/admin/game-builds/${build.id}/${action}`, { reason });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message ?? "Request failed");
    },
    onSuccess: (_data, variables) => {
      toast({
        title: variables.action === "reject" ? "Build rejected" : "Build taken down",
        description: "The developer has been notified with your reason.",
      });
      setDecision(null);
      setReason("");
      invalidate();
    },
    onError: (e: any) => toast({ title: "Action failed", description: e.message, variant: "destructive" }),
  });

  const builds = data?.builds ?? [];

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <HardDrive className="h-4 w-4" />
            Hosted game builds
          </CardTitle>
          <CardDescription>
            Every developer-uploaded build waits here before it is publicly downloadable.
            Check that the archive is what the developer says it is — an approved build is
            distributed under Gamefolio's name.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {data && !data.hostingConfigured && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              Cloudflare R2 is not configured, so no new builds can be uploaded. Existing
              rows are shown for reference only.
            </div>
          )}

          <Tabs value={status} onValueChange={setStatus}>
            <TabsList className="flex-wrap">
              {STATUS_TABS.map((t) => (
                <TabsTrigger key={t.id} value={t.id} className="text-xs">
                  {t.label}
                  {data?.counts?.[t.id] ? ` (${data.counts[t.id]})` : ""}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {isLoading && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {!isLoading && builds.length === 0 && (
            <p className="py-8 text-center text-xs text-muted-foreground">
              Nothing here.
            </p>
          )}

          {builds.map((build) => (
            <div key={build.id} className="rounded-lg border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {build.buildType === "web"
                      ? <Globe className="h-4 w-4 shrink-0 text-muted-foreground" />
                      : <Download className="h-4 w-4 shrink-0 text-muted-foreground" />}
                    <span className="text-sm font-semibold">{build.label}</span>
                    <Badge variant="secondary" className="text-[10px] uppercase">{build.channel}</Badge>
                    {build.platform && (
                      <Badge variant="outline" className="text-[10px]">{PLATFORM_LABELS[build.platform]}</Badge>
                    )}
                    {!build.isIndieDevSubscriber && (
                      <Badge variant="outline" className="text-[10px]">Free account</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {build.gameName ?? "Untitled game"} · @{build.username} · {formatBytes(build.storedBytes ?? build.sizeBytes)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <span className="font-mono">{build.originalFileName}</span>
                    {build.webEntryPath && <> · entry <span className="font-mono">{build.webEntryPath}</span></>}
                  </p>
                  {build.reviewNotes && (
                    <p className="text-xs text-destructive">Note: {build.reviewNotes}</p>
                  )}
                </div>

                <div className="flex shrink-0 gap-2">
                  {build.status === "pending_review" && (
                    <>
                      <Button size="sm" onClick={() => approve.mutate(build.id)} disabled={approve.isPending}>
                        <Check className="mr-1 h-3.5 w-3.5" /> Approve
                      </Button>
                      <Button size="sm" variant="outline"
                        onClick={() => { setDecision({ build, action: "reject" }); setReason(""); }}>
                        <X className="mr-1 h-3.5 w-3.5" /> Reject
                      </Button>
                    </>
                  )}
                  {build.status === "approved" && (
                    <Button size="sm" variant="destructive"
                      onClick={() => { setDecision({ build, action: "takedown" }); setReason(""); }}>
                      <ShieldAlert className="mr-1 h-3.5 w-3.5" /> Take down
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={!!decision} onOpenChange={(open) => !open && setDecision(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {decision?.action === "reject" ? "Reject this build" : "Take this build down"}
            </DialogTitle>
            <DialogDescription>
              {decision?.action === "reject"
                ? "The developer sees this reason and can fix and re-upload. Their file is kept."
                : "The files are deleted immediately and the developer is notified. This cannot be undone."}
            </DialogDescription>
          </DialogHeader>

          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500}
            placeholder="Why? e.g. the archive contains an installer that isn't the described game." />

          <DialogFooter>
            <Button variant="outline" onClick={() => setDecision(null)}>Cancel</Button>
            <Button
              variant={decision?.action === "takedown" ? "destructive" : "default"}
              disabled={!reason.trim() || decide.isPending}
              onClick={() => decision && decide.mutate(decision)}>
              {decide.isPending && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
              {decision?.action === "reject" ? "Reject build" : "Take down"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
