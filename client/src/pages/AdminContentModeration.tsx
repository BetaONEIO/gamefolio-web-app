import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Shield, Check, X, AlertTriangle, Inbox, MessageSquare, Sliders } from 'lucide-react';

type ContentType = 'clip' | 'reel' | 'screenshot' | 'avatar';

interface ModerationLabel {
  name: string;
  confidence: number;
  parentName?: string;
}

interface QueueItem {
  id: number;
  contentType: ContentType;
  contentId: number;
  userId: number;
  status: 'open' | 'resolved';
  autoAction: 'flagged' | 'rejected' | 'pending';
  labels: ModerationLabel[] | null;
  confidenceMax: string | null;
  provider: string | null;
  createdAt: string;
  preview: {
    title: string | null;
    thumbnailUrl: string | null;
    mediaUrl: string | null;
    username: string | null;
    displayName: string | null;
  } | null;
}

interface Appeal {
  id: number;
  queueId: number;
  userId: number;
  message: string;
  status: 'open' | 'resolved';
  resolution: 'approved' | 'rejected' | null;
  createdAt: string;
}

interface Threshold {
  id: number;
  label: string;
  rejectThreshold: string;
  flagThreshold: string;
  gamingSuppressed: boolean;
  updatedAt: string;
}

export default function AdminContentModeration() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [typeFilter, setTypeFilter] = useState<ContentType | 'all'>('all');

  // --- Queue ---
  const queueKey = ['/api/admin/moderation/queue', typeFilter];
  const { data: queue, isLoading: queueLoading } = useQuery<{ items: QueueItem[]; total: number }>({
    queryKey: queueKey,
    queryFn: async () => {
      const params = new URLSearchParams({ status: 'open' });
      if (typeFilter !== 'all') params.set('type', typeFilter);
      const res = await fetch(`/api/admin/moderation/queue?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load moderation queue');
      return res.json();
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/admin/moderation/queue/${id}/approve`, { method: 'POST' });
      if (!res.ok) throw new Error('Approve failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queueKey });
      toast({ title: 'Approved', description: 'Content is now live.' });
    },
    onError: (err: Error) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: number; notes?: string }) => {
      const res = await fetch(`/api/admin/moderation/queue/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });
      if (!res.ok) throw new Error('Reject failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queueKey });
      toast({ title: 'Rejected', description: 'Content removed from storage.' });
    },
    onError: (err: Error) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  // --- Appeals ---
  const appealsKey = ['/api/admin/moderation/appeals'];
  const { data: appeals } = useQuery<{ items: Appeal[] }>({
    queryKey: appealsKey,
    queryFn: async () => {
      const res = await fetch('/api/admin/moderation/appeals?status=open');
      if (!res.ok) throw new Error('Failed to load appeals');
      return res.json();
    },
  });

  const resolveAppeal = useMutation({
    mutationFn: async ({ id, decision }: { id: number; decision: 'approved' | 'rejected' }) => {
      const res = await fetch(`/api/admin/moderation/appeals/${id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision }),
      });
      if (!res.ok) throw new Error('Resolve failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: appealsKey });
      queryClient.invalidateQueries({ queryKey: queueKey });
      toast({ title: 'Appeal resolved' });
    },
    onError: (err: Error) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  // --- Thresholds ---
  const thresholdsKey = ['/api/admin/moderation/thresholds'];
  const { data: thresholds } = useQuery<{ items: Threshold[] }>({
    queryKey: thresholdsKey,
    queryFn: async () => {
      const res = await fetch('/api/admin/moderation/thresholds');
      if (!res.ok) throw new Error('Failed to load thresholds');
      return res.json();
    },
  });

  const saveThreshold = useMutation({
    mutationFn: async (t: { label: string; rejectThreshold: number; flagThreshold: number; gamingSuppressed: boolean }) => {
      const res = await fetch(`/api/admin/moderation/thresholds/${encodeURIComponent(t.label)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(t),
      });
      if (!res.ok) throw new Error('Save failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: thresholdsKey });
      toast({ title: 'Threshold updated' });
    },
    onError: (err: Error) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Content Moderation
        </CardTitle>
        <CardDescription>
          Review media items flagged or rejected by the automated scanner. Approve to publish; reject to
          delete from storage permanently.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="queue">
          <TabsList>
            <TabsTrigger value="queue">
              <Inbox className="mr-2 h-4 w-4" />
              Queue {queue?.total ? `(${queue.total})` : ''}
            </TabsTrigger>
            <TabsTrigger value="appeals">
              <MessageSquare className="mr-2 h-4 w-4" />
              Appeals {appeals?.items?.length ? `(${appeals.items.length})` : ''}
            </TabsTrigger>
            <TabsTrigger value="thresholds">
              <Sliders className="mr-2 h-4 w-4" />
              Thresholds
            </TabsTrigger>
          </TabsList>

          {/* Queue Tab */}
          <TabsContent value="queue" className="mt-4 space-y-4">
            <div className="flex items-center gap-3">
              <Label>Filter by type:</Label>
              <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="clip">Clips</SelectItem>
                  <SelectItem value="reel">Reels</SelectItem>
                  <SelectItem value="screenshot">Screenshots</SelectItem>
                  <SelectItem value="avatar">Avatars</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {queueLoading && <p className="text-sm text-muted-foreground">Loading queue…</p>}
            {!queueLoading && queue?.items.length === 0 && (
              <p className="text-sm text-muted-foreground">Nothing in the queue. 🎉</p>
            )}

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {queue?.items.map((item) => (
                <Card key={item.id} className="overflow-hidden">
                  <div className="relative bg-muted">
                    {item.preview?.thumbnailUrl || item.preview?.mediaUrl ? (
                      <img
                        src={item.preview.thumbnailUrl ?? item.preview.mediaUrl ?? ''}
                        alt={item.preview.title ?? 'preview'}
                        className="h-40 w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-40 items-center justify-center">
                        <AlertTriangle className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    <Badge
                      variant={item.autoAction === 'rejected' ? 'destructive' : 'secondary'}
                      className="absolute right-2 top-2"
                    >
                      {item.autoAction}
                    </Badge>
                  </div>
                  <CardContent className="space-y-2 p-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">
                        {item.preview?.title || `#${item.contentId}`}
                      </span>
                      <Badge variant="outline">{item.contentType}</Badge>
                    </div>
                    {item.preview?.username && (
                      <p className="text-xs text-muted-foreground">@{item.preview.username}</p>
                    )}
                    {item.confidenceMax && (
                      <p className="text-xs text-muted-foreground">
                        Max confidence: {Number(item.confidenceMax).toFixed(1)}%
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1">
                      {(item.labels ?? []).slice(0, 4).map((l, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {l.name} {Math.round(l.confidence)}%
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        onClick={() => approveMutation.mutate(item.id)}
                        disabled={approveMutation.isPending}
                      >
                        <Check className="mr-1 h-4 w-4" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => rejectMutation.mutate({ id: item.id })}
                        disabled={rejectMutation.isPending}
                      >
                        <X className="mr-1 h-4 w-4" /> Reject
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Appeals Tab */}
          <TabsContent value="appeals" className="mt-4 space-y-3">
            {!appeals?.items?.length && (
              <p className="text-sm text-muted-foreground">No open appeals.</p>
            )}
            {appeals?.items.map((appeal) => (
              <Card key={appeal.id}>
                <CardContent className="space-y-2 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Appeal #{appeal.id}</p>
                    <span className="text-xs text-muted-foreground">
                      Queue #{appeal.queueId}
                    </span>
                  </div>
                  <p className="rounded bg-muted p-2 text-sm">{appeal.message}</p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => resolveAppeal.mutate({ id: appeal.id, decision: 'approved' })}
                      disabled={resolveAppeal.isPending}
                    >
                      Accept appeal (publish content)
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => resolveAppeal.mutate({ id: appeal.id, decision: 'rejected' })}
                      disabled={resolveAppeal.isPending}
                    >
                      Deny appeal
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Thresholds Tab */}
          <TabsContent value="thresholds" className="mt-4 space-y-2">
            <p className="text-sm text-muted-foreground">
              Confidence thresholds per label. Set the reject threshold high to reduce false positives;
              the flag threshold routes borderline cases to this queue. Gaming-suppressed labels auto-raise
              their bar when the content is tagged with a game.
            </p>
            <div className="space-y-2">
              {thresholds?.items.map((t) => (
                <ThresholdRow key={t.id} threshold={t} onSave={(payload) => saveThreshold.mutate(payload)} />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function ThresholdRow({
  threshold,
  onSave,
}: {
  threshold: Threshold;
  onSave: (t: { label: string; rejectThreshold: number; flagThreshold: number; gamingSuppressed: boolean }) => void;
}) {
  const [reject, setReject] = useState(Number(threshold.rejectThreshold));
  const [flag, setFlag] = useState(Number(threshold.flagThreshold));
  const [suppressed, setSuppressed] = useState(threshold.gamingSuppressed);

  const dirty =
    reject !== Number(threshold.rejectThreshold) ||
    flag !== Number(threshold.flagThreshold) ||
    suppressed !== threshold.gamingSuppressed;

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center gap-3 p-3">
        <div className="min-w-[180px] font-medium">{threshold.label}</div>
        <div className="flex items-center gap-2">
          <Label className="text-xs">Reject ≥</Label>
          <Input
            type="number"
            className="w-20"
            value={reject}
            onChange={(e) => setReject(Number(e.target.value))}
          />
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs">Flag ≥</Label>
          <Input
            type="number"
            className="w-20"
            value={flag}
            onChange={(e) => setFlag(Number(e.target.value))}
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={suppressed}
            onChange={(e) => setSuppressed(e.target.checked)}
          />
          Suppress for gameplay
        </label>
        <Button
          size="sm"
          disabled={!dirty}
          onClick={() =>
            onSave({
              label: threshold.label,
              rejectThreshold: reject,
              flagThreshold: flag,
              gamingSuppressed: suppressed,
            })
          }
        >
          Save
        </Button>
      </CardContent>
    </Card>
  );
}
