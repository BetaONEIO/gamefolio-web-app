import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, getQueryFn, queryClient } from "@/lib/queryClient";

type AdminPoll = {
  id: number;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  options: Array<{ id: number; label: string; voteCount: number }>;
};

const dateTimeLocal = (date: Date) => {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

export function PollPanel() {
  const { toast } = useToast();
  const now = new Date();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [items, setItems] = useState(["", ""]);
  const [startsAt, setStartsAt] = useState(() => dateTimeLocal(now));
  const [endsAt, setEndsAt] = useState(() => dateTimeLocal(new Date(now.getTime() + 7 * 86_400_000)));

  const { data: polls = [], isLoading } = useQuery<AdminPoll[]>({
    queryKey: ["/api/admin/polls"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const createPoll = useMutation({
    mutationFn: async () => apiRequest("POST", "/api/admin/polls", {
      title,
      description,
      items: items.map((item) => item.trim()).filter(Boolean),
      startsAt: new Date(startsAt).toISOString(),
      endsAt: new Date(endsAt).toISOString(),
    }),
    onSuccess: () => {
      setTitle("");
      setDescription("");
      setItems(["", ""]);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/polls"] });
      queryClient.invalidateQueries({ queryKey: ["/api/polls/active"] });
      toast({ title: "Poll scheduled", description: "The poll will appear automatically during its scheduled window.", variant: "gamefolioSuccess" });
    },
    onError: (error: Error) => toast({ title: "Could not create poll", description: error.message, variant: "gamefolioError" }),
  });

  const deletePoll = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/polls/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/polls"] });
      queryClient.invalidateQueries({ queryKey: ["/api/polls/active"] });
      toast({ title: "Poll deleted", variant: "gamefolioSuccess" });
    },
  });

  const canSubmit = title.trim() && description.trim() && items.filter((item) => item.trim()).length >= 2 && new Date(endsAt) > new Date(startsAt);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      <Card>
        <CardHeader>
          <CardTitle>Create a poll</CardTitle>
          <CardDescription>Schedule an infrequent homepage takeover with up to five answers.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2"><Label htmlFor="poll-title">Poll title</Label><Input id="poll-title" maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="poll-description">Description</Label><Textarea id="poll-description" maxLength={500} value={description} onChange={(event) => setDescription(event.target.value)} /></div>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Items</legend>
            {items.map((item, index) => (
              <div className="flex gap-2" key={index}>
                <Input aria-label={`Poll item ${index + 1}`} maxLength={100} value={item} onChange={(event) => setItems((current) => current.map((value, itemIndex) => itemIndex === index ? event.target.value : value))} />
                {items.length > 2 ? <Button type="button" variant="outline" size="icon" aria-label={`Remove item ${index + 1}`} onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))}><Trash2 className="h-4 w-4" /></Button> : null}
              </div>
            ))}
            {items.length < 5 ? <Button type="button" variant="outline" size="sm" onClick={() => setItems((current) => [...current, ""])}><Plus className="mr-2 h-4 w-4" />Add item</Button> : null}
          </fieldset>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label htmlFor="poll-start">Starts</Label><Input id="poll-start" type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="poll-end">Ends</Label><Input id="poll-end" type="datetime-local" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} /></div>
          </div>
          <Button disabled={!canSubmit || createPoll.isPending} onClick={() => createPoll.mutate()}>{createPoll.isPending ? "Scheduling…" : "Schedule poll"}</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Poll history</CardTitle><CardDescription>Upcoming, live, and completed polls with response totals.</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? <p className="text-sm text-muted-foreground">Loading polls…</p> : polls.length === 0 ? <p className="text-sm text-muted-foreground">No polls yet.</p> : polls.map((poll) => {
            const currentTime = Date.now();
            const status = currentTime < new Date(poll.startsAt).getTime() ? "Upcoming" : currentTime >= new Date(poll.endsAt).getTime() ? "Ended" : "Live";
            const total = poll.options.reduce((sum, option) => sum + Number(option.voteCount), 0);
            return <div key={poll.id} className="rounded-lg border p-4">
              <div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{poll.title}</p><p className="text-xs text-muted-foreground">{status} · {new Date(poll.startsAt).toLocaleString()} – {new Date(poll.endsAt).toLocaleString()}</p></div><Button variant="ghost" size="icon" aria-label={`Delete ${poll.title}`} onClick={() => { if (window.confirm(`Delete “${poll.title}” and all of its votes?`)) deletePoll.mutate(poll.id); }}><Trash2 className="h-4 w-4" /></Button></div>
              <div className="mt-3 space-y-1">{poll.options.map((option) => <div key={option.id} className="flex justify-between text-sm"><span>{option.label}</span><span className="text-muted-foreground">{option.voteCount} vote{Number(option.voteCount) === 1 ? "" : "s"}</span></div>)}</div>
              <p className="mt-2 text-xs font-medium text-muted-foreground">{total} total vote{total === 1 ? "" : "s"}</p>
            </div>;
          })}
        </CardContent>
      </Card>
    </div>
  );
}
