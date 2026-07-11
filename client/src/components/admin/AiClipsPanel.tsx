import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient, getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Sparkles } from "lucide-react";

interface AiClipSettingsResponse {
  settings: {
    id: number | null;
    isEnabled: boolean;
    disabledMessage: string | null;
    updatedAt: string | null;
  };
  stats: {
    statusCounts: Record<string, number>;
    recentJobs: Array<{
      id: number;
      userId: number;
      username: string;
      vodTitle: string;
      status: string;
      candidateCount: number;
      createdAt: string;
    }>;
    queue: Array<{
      id: number;
      userId: number;
      username: string;
      vodTitle: string;
      status: string;
      stageProgress: number;
      createdAt: string;
    }>;
  };
}

const ACTIVE_STATUSES = ["queued", "downloading", "transcribing", "analyzing", "cutting"];

const STATUS_COLORS: Record<string, string> = {
  queued: "bg-slate-500/20 text-slate-400",
  downloading: "bg-blue-500/20 text-blue-400",
  transcribing: "bg-blue-500/20 text-blue-400",
  analyzing: "bg-blue-500/20 text-blue-400",
  cutting: "bg-blue-500/20 text-blue-400",
  completed: "bg-emerald-500/20 text-emerald-400",
  failed: "bg-rose-500/20 text-rose-400",
  cancelled: "bg-slate-500/20 text-slate-400",
};

export function AiClipsPanel() {
  const { toast } = useToast();

  const query = useQuery<AiClipSettingsResponse>({
    queryKey: ["/api/admin/ai-clip-settings"],
    queryFn: getQueryFn({ on401: "throw" }),
    refetchInterval: 15000,
  });

  const [isEnabled, setIsEnabled] = useState(true);
  const [disabledMessage, setDisabledMessage] = useState("");

  useEffect(() => {
    if (query.data?.settings) {
      setIsEnabled(query.data.settings.isEnabled);
      setDisabledMessage(query.data.settings.disabledMessage || "");
    }
  }, [query.data?.settings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PUT", "/api/admin/ai-clip-settings", {
        isEnabled,
        disabledMessage: disabledMessage.trim() || null,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: isEnabled ? "AI clips enabled" : "AI clips disabled", description: isEnabled ? "Users can generate new AI clips." : "New generation requests will be blocked until re-enabled." });
      void queryClient.invalidateQueries({ queryKey: ["/api/admin/ai-clip-settings"] });
    },
    onError: (err: Error) => {
      toast({ title: "Couldn't save", description: err.message, variant: "destructive" });
    },
  });

  const stats = query.data?.stats;
  const activeCount = stats ? ACTIVE_STATUSES.reduce((sum, s) => sum + (stats.statusCounts[s] || 0), 0) : 0;
  const dirty = query.data?.settings && (isEnabled !== query.data.settings.isEnabled || disabledMessage !== (query.data.settings.disabledMessage || ""));

  const cancelJobMutation = useMutation({
    mutationFn: async (jobId: number) => {
      const res = await apiRequest("POST", `/api/admin/ai-clip-jobs/${jobId}/cancel`, {});
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Job cancelled" });
      void queryClient.invalidateQueries({ queryKey: ["/api/admin/ai-clip-settings"] });
    },
    onError: (err: Error) => {
      toast({ title: "Couldn't cancel job", description: err.message, variant: "destructive" });
    },
  });

  const cancelQueueMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/ai-clip-jobs/cancel-queued", {});
      return res.json() as Promise<{ cancelled: number }>;
    },
    onSuccess: (data) => {
      toast({ title: `Cleared ${data.cancelled} queued job${data.cancelled === 1 ? "" : "s"}`, description: "Jobs already in progress were not touched — cancel those individually." });
      void queryClient.invalidateQueries({ queryKey: ["/api/admin/ai-clip-settings"] });
    },
    onError: (err: Error) => {
      toast({ title: "Couldn't clear queue", description: err.message, variant: "destructive" });
    },
  });

  const queuedCount = stats?.queue.filter((j) => j.status === "queued").length || 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            AI VOD clip generation
          </CardTitle>
          <CardDescription>
            Controls whether users can start new AI clip-generation jobs. Already-queued or in-progress jobs finish
            even while disabled — this only blocks new requests, useful if the transcription/analysis pipeline is overloaded.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <div className="font-medium text-sm">Accept new generation requests</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {isEnabled ? "Feature is live for users" : "Users will see a disabled message"}
              </div>
            </div>
            <Switch checked={isEnabled} onCheckedChange={setIsEnabled} data-testid="switch-ai-clips-enabled" />
          </div>

          {!isEnabled && (
            <div>
              <Label htmlFor="ai-clips-disabled-message" className="text-xs">Message shown to users (optional)</Label>
              <Textarea
                id="ai-clips-disabled-message"
                value={disabledMessage}
                onChange={(e) => setDisabledMessage(e.target.value)}
                placeholder="AI clip generation is temporarily paused while we scale up — check back soon."
                className="mt-1"
                rows={2}
              />
            </div>
          )}

          <Button onClick={() => saveMutation.mutate()} disabled={!dirty || saveMutation.isPending}>
            {saveMutation.isPending ? "Saving…" : "Save"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Queue</CardTitle>
            <CardDescription>Jobs not yet finished — queued or actively processing. Cancelling an in-progress job stops it at the next checkpoint (within a download/transcribe/analyze/cut step), not instantly.</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => cancelQueueMutation.mutate()}
            disabled={queuedCount === 0 || cancelQueueMutation.isPending}
          >
            {cancelQueueMutation.isPending ? "Clearing…" : `Clear queue${queuedCount > 0 ? ` (${queuedCount})` : ""}`}
          </Button>
        </CardHeader>
        <CardContent>
          {!stats || stats.queue.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing queued or in progress.</p>
          ) : (
            <div className="space-y-2">
              {stats.queue.map((job) => (
                <div key={job.id} className="flex items-center justify-between text-sm border-b border-border/50 pb-2 last:border-0">
                  <div className="min-w-0">
                    <div className="truncate">{job.vodTitle}</div>
                    <div className="text-xs text-muted-foreground">@{job.username} · {new Date(job.createdAt).toLocaleString()}</div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant="secondary" className={STATUS_COLORS[job.status] || ""}>{job.status}</Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => cancelJobMutation.mutate(job.id)}
                      disabled={cancelJobMutation.isPending}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current load</CardTitle>
          <CardDescription>Job counts across all users. Refreshes every 15s.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {activeCount >= 3 && (
            <div className="flex items-start gap-3 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
              <AlertCircle className="mt-0.5 h-4 w-4 text-amber-500" />
              <div>
                <div className="font-medium">{activeCount} jobs actively processing</div>
                <div className="text-muted-foreground">Jobs run sequentially, one at a time — a backlog this size means a long wait for new requests. Consider disabling new requests until it clears.</div>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {Object.entries(stats?.statusCounts || {}).map(([status, count]) => (
              <Badge key={status} variant="secondary" className={STATUS_COLORS[status] || ""}>
                {status}: {count}
              </Badge>
            ))}
            {stats && Object.keys(stats.statusCounts).length === 0 && (
              <span className="text-sm text-muted-foreground">No jobs yet.</span>
            )}
          </div>

          {stats && stats.recentJobs.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">Recent jobs</div>
              {stats.recentJobs.map((job) => (
                <div key={job.id} className="flex items-center justify-between text-sm border-b border-border/50 pb-2 last:border-0">
                  <div className="min-w-0">
                    <div className="truncate">{job.vodTitle}</div>
                    <div className="text-xs text-muted-foreground">@{job.username} · {job.candidateCount} clips · {new Date(job.createdAt).toLocaleString()}</div>
                  </div>
                  <Badge variant="secondary" className={STATUS_COLORS[job.status] || ""}>{job.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
