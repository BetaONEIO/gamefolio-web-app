import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CalendarClock, Film, Image as ImageIcon, Clock, X, Pencil, Loader2 } from 'lucide-react';

interface ScheduledPost {
  id: number;
  contentType: 'clip' | 'screenshot';
  videoType: 'clip' | 'reel' | null;
  scheduledAt: string;
  status: 'scheduled' | 'published' | 'failed' | 'cancelled';
  title: string;
  thumbnailUrl: string | null;
  publishedAt: string | null;
  publishedContentId: number | null;
  errorMessage: string | null;
  createdAt: string;
}

interface ScheduleLimits {
  isUnlimited: boolean;
  max: number | null;
  used: number;
  remaining: number | null;
}

// ISO string -> value for a datetime-local input (local time, no seconds).
function isoToLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function localMin(): string {
  const d = new Date(Date.now() + 5 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function localMax(): string {
  const d = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function typeLabel(post: ScheduledPost): string {
  if (post.contentType === 'screenshot') return 'Screenshot';
  return post.videoType === 'reel' ? 'Reel' : 'Clip';
}

const STATUS_VARIANT: Record<ScheduledPost['status'], { label: string; className: string }> = {
  scheduled: { label: 'Scheduled', className: 'bg-primary/15 text-primary' },
  published: { label: 'Published', className: 'bg-green-500/15 text-green-600 dark:text-green-400' },
  failed: { label: 'Failed', className: 'bg-red-500/15 text-red-600 dark:text-red-400' },
  cancelled: { label: 'Cancelled', className: 'bg-muted text-muted-foreground' },
};

export default function ScheduledPostsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [confirmingId, setConfirmingId] = useState<number | null>(null);

  const { data, isLoading } = useQuery<{ posts: ScheduledPost[] }>({
    queryKey: ['/api/scheduled-posts'],
  });
  const { data: limits } = useQuery<ScheduleLimits>({
    queryKey: ['/api/scheduled-posts/limits'],
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/scheduled-posts'] });
    queryClient.invalidateQueries({ queryKey: ['/api/scheduled-posts/limits'] });
  };

  const reschedule = useMutation({
    mutationFn: async ({ id, scheduledAt }: { id: number; scheduledAt: string }) => {
      const res = await apiRequest('PATCH', `/api/scheduled-posts/${id}`, { scheduledAt });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to reschedule');
      }
      return res.json();
    },
    onSuccess: () => {
      invalidate();
      setEditingId(null);
      toast({ title: 'Rescheduled', description: 'Your post will publish at the new time.' });
    },
    onError: (e: Error) => toast({ title: 'Could not reschedule', description: e.message, variant: 'gamefolioError' }),
  });

  const cancel = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest('DELETE', `/api/scheduled-posts/${id}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to cancel');
      }
      return res.json();
    },
    onSuccess: () => {
      invalidate();
      setConfirmingId(null);
      toast({ title: 'Cancelled', description: 'The scheduled post was removed.' });
    },
    onError: (e: Error) => toast({ title: 'Could not cancel', description: e.message, variant: 'gamefolioError' }),
  });

  const posts = data?.posts ?? [];
  const pending = posts.filter((p) => p.status === 'scheduled');
  const history = posts.filter((p) => p.status !== 'scheduled');

  const startEdit = (post: ScheduledPost) => {
    setEditingId(post.id);
    setEditValue(isoToLocalInput(post.scheduledAt));
  };

  const saveEdit = (id: number) => {
    if (!editValue) {
      toast({ title: 'Pick a time', description: 'Choose a date and time.', variant: 'gamefolioError' });
      return;
    }
    const d = new Date(editValue);
    if (isNaN(d.getTime()) || d.getTime() <= Date.now()) {
      toast({ title: 'Time must be in the future', description: 'Pick a later date and time.', variant: 'gamefolioError' });
      return;
    }
    reschedule.mutate({ id, scheduledAt: d.toISOString() });
  };

  const renderCard = (post: ScheduledPost, editable: boolean) => {
    const status = STATUS_VARIANT[post.status];
    return (
      <div
        key={post.id}
        className="flex gap-3 rounded-lg border border-border bg-card p-3"
        data-testid={`scheduled-post-${post.id}`}
      >
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md bg-muted flex items-center justify-center">
          {post.thumbnailUrl ? (
            <img src={post.thumbnailUrl} alt="" className="h-full w-full object-cover" />
          ) : post.contentType === 'screenshot' ? (
            <ImageIcon className="h-6 w-6 text-muted-foreground" />
          ) : (
            <Film className="h-6 w-6 text-muted-foreground" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">{typeLabel(post)}</span>
            <Badge className={`${status.className} border-0`} variant="secondary">{status.label}</Badge>
          </div>
          <p className="truncate font-medium" title={post.title}>{post.title || 'Untitled'}</p>

          {editable && editingId === post.id ? (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Input
                type="datetime-local"
                min={localMin()}
                max={localMax()}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="h-9 w-auto"
                data-testid={`reschedule-input-${post.id}`}
              />
              <Button size="sm" onClick={() => saveEdit(post.id)} disabled={reschedule.isPending}>
                {reschedule.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
            </div>
          ) : (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              {post.status === 'published' && post.publishedAt
                ? `Published ${new Date(post.publishedAt).toLocaleString()}`
                : new Date(post.scheduledAt).toLocaleString()}
            </p>
          )}

          {post.status === 'failed' && post.errorMessage && (
            <p className="mt-1 text-xs text-red-500">{post.errorMessage}</p>
          )}
        </div>

        {editable && editingId !== post.id && (
          <div className="flex shrink-0 flex-col items-end gap-2">
            {confirmingId === post.id ? (
              <div className="flex items-center gap-1">
                <Button size="sm" variant="destructive" onClick={() => cancel.mutate(post.id)} disabled={cancel.isPending}>
                  {cancel.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirmingId(null)}>Keep</Button>
              </div>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => startEdit(post)}
                  data-testid={`reschedule-${post.id}`}
                >
                  <Pencil className="mr-1 h-3.5 w-3.5" /> Reschedule
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-red-500 hover:text-red-600"
                  onClick={() => setConfirmingId(post.id)}
                  data-testid={`cancel-${post.id}`}
                >
                  <X className="mr-1 h-3.5 w-3.5" /> Cancel
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="container max-w-3xl mx-auto px-4 py-8 pb-28 md:pb-8">
      <div className="mb-6 flex items-center gap-3">
        <CalendarClock className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Scheduled posts</h1>
          <p className="text-sm text-muted-foreground">
            {limits?.isUnlimited
              ? 'You can schedule unlimited posts.'
              : limits
                ? `${limits.used} of ${limits.max} slots in use${limits.remaining != null ? ` · ${limits.remaining} left` : ''}.`
                : 'Manage posts queued to publish later.'}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-8">
          <section>
            <CardTitle className="mb-3 text-base">Upcoming ({pending.length})</CardTitle>
            {pending.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-sm text-muted-foreground">
                  Nothing scheduled. Pick a future time when uploading to queue a post here.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">{pending.map((p) => renderCard(p, true))}</div>
            )}
          </section>

          {history.length > 0 && (
            <section>
              <CardHeader className="px-0 pb-3 pt-0">
                <CardTitle className="text-base">History</CardTitle>
              </CardHeader>
              <div className="space-y-3">{history.map((p) => renderCard(p, false))}</div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
