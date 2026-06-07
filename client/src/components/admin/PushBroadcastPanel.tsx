import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient, getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Send, X, CheckCircle2, Smartphone } from "lucide-react";

type AudienceKind = "all" | "role" | "pro" | "users";

interface PushStatus {
  enabled: boolean;
  reason: string | null;
  registeredDeviceCount: number;
}

interface BroadcastRow {
  id: number;
  sentByUserId: number;
  title: string;
  body: string;
  actionUrl: string | null;
  audience: { kind: AudienceKind; role?: string; userIds?: number[] };
  recipientCount: number;
  successCount: number;
  failureCount: number;
  createdAt: string;
}

interface UserSearchHit {
  id: number;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}

interface BroadcastResult {
  recipientCount: number;
  successCount: number;
  failureCount: number;
  removedTokens: number;
}

function describeAudience(a: BroadcastRow["audience"]): string {
  switch (a.kind) {
    case "all": return "All users";
    case "pro": return "Pro subscribers";
    case "role": return `Role: ${a.role}`;
    case "users": return `${a.userIds?.length ?? 0} specific user(s)`;
    default: return JSON.stringify(a);
  }
}

export function PushBroadcastPanel() {
  const { toast } = useToast();

  const status = useQuery<PushStatus>({
    queryKey: ["/api/admin/push/status"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const broadcasts = useQuery<{ broadcasts: BroadcastRow[] }>({
    queryKey: ["/api/admin/push/broadcasts"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const [audience, setAudience] = useState<AudienceKind>("all");
  const [role, setRole] = useState<"user" | "admin" | "moderator">("user");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [actionUrl, setActionUrl] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [pickedUsers, setPickedUsers] = useState<UserSearchHit[]>([]);

  const userResults = useQuery<{ users: UserSearchHit[] }>({
    queryKey: [`/api/admin/users?search=${encodeURIComponent(userSearch)}&limit=10`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: audience === "users" && userSearch.trim().length >= 2,
  });

  const buildAudience = useMemo(() => {
    return () => {
      switch (audience) {
        case "all": return { kind: "all" as const };
        case "pro": return { kind: "pro" as const };
        case "role": return { kind: "role" as const, role };
        case "users": return { kind: "users" as const, userIds: pickedUsers.map(u => u.id) };
      }
    };
  }, [audience, role, pickedUsers]);

  const sendMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/push/broadcast", {
        title: title.trim(),
        body: body.trim(),
        actionUrl: actionUrl.trim() || undefined,
        audience: buildAudience(),
      });
      return (await res.json()) as { broadcast: BroadcastRow } & BroadcastResult;
    },
    onSuccess: (data) => {
      if (data.recipientCount === 0) {
        toast({
          title: "Nothing sent — no registered devices",
          description: "0 devices have push tokens in the database. Users must open the native app and grant notification permission first.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Push sent",
          description: `Delivered ${data.successCount}/${data.recipientCount}${data.failureCount ? ` · ${data.failureCount} failed` : ""}${data.removedTokens ? ` · ${data.removedTokens} stale tokens removed` : ""}.`,
        });
      }
      setTitle("");
      setBody("");
      setActionUrl("");
      setPickedUsers([]);
      void queryClient.invalidateQueries({ queryKey: ["/api/admin/push/broadcasts"] });
    },
    onError: (err: Error) => {
      toast({ title: "Push failed", description: err.message, variant: "destructive" });
    },
  });

  const sendDisabled =
    !status.data?.enabled ||
    sendMutation.isPending ||
    title.trim().length === 0 ||
    body.trim().length === 0 ||
    (audience === "users" && pickedUsers.length === 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Push notifications</CardTitle>
          <CardDescription>
            Send a push to a chosen audience. Recipients see it on their iOS or Android device immediately.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!status.isLoading && status.data && !status.data.enabled && (
            <div className="flex items-start gap-3 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
              <AlertCircle className="mt-0.5 h-4 w-4 text-amber-500" />
              <div>
                <div className="font-medium">Push is not configured on the server.</div>
                <div className="text-muted-foreground">
                  {status.data.reason ?? "FIREBASE_SERVICE_ACCOUNT_JSON env var is missing."}
                </div>
              </div>
            </div>
          )}

          {!status.isLoading && status.data?.enabled && (
            <div className={`flex items-center gap-3 rounded-md border p-3 text-sm ${
              status.data.registeredDeviceCount === 0
                ? "border-rose-500/30 bg-rose-500/10"
                : "border-emerald-500/30 bg-emerald-500/10"
            }`}>
              <Smartphone className={`h-4 w-4 shrink-0 ${
                status.data.registeredDeviceCount === 0 ? "text-rose-500" : "text-emerald-500"
              }`} />
              <div>
                <span className="font-medium">
                  {status.data.registeredDeviceCount === 0
                    ? "No devices registered"
                    : `${status.data.registeredDeviceCount} device${status.data.registeredDeviceCount === 1 ? "" : "s"} registered`}
                </span>
                {status.data.registeredDeviceCount === 0 && (
                  <div className="text-muted-foreground text-xs mt-0.5">
                    Users must open the native iOS/Android app and grant notification permission before any push can be delivered.
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Audience</Label>
            <Select value={audience} onValueChange={(v) => setAudience(v as AudienceKind)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All users</SelectItem>
                <SelectItem value="pro">Pro subscribers</SelectItem>
                <SelectItem value="role">By role</SelectItem>
                <SelectItem value="users">Specific user(s)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {audience === "role" && (
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as typeof role)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">user</SelectItem>
                  <SelectItem value="admin">admin</SelectItem>
                  <SelectItem value="moderator">moderator</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {audience === "users" && (
            <div className="space-y-2">
              <Label>Pick users</Label>
              <Input
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search by username or display name…"
              />
              {userSearch.trim().length >= 2 && userResults.data?.users && (
                <div className="rounded-md border max-h-48 overflow-y-auto">
                  {userResults.data.users.length === 0 ? (
                    <div className="p-2 text-xs text-muted-foreground">No matches</div>
                  ) : userResults.data.users.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm hover:bg-muted"
                      onClick={() => {
                        setPickedUsers((prev) => prev.find(p => p.id === u.id) ? prev : [...prev, u]);
                        setUserSearch("");
                      }}
                    >
                      <span className="font-medium">@{u.username}</span>
                      {u.displayName && <span className="text-muted-foreground">({u.displayName})</span>}
                    </button>
                  ))}
                </div>
              )}
              {pickedUsers.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {pickedUsers.map((u) => (
                    <Badge key={u.id} variant="secondary" className="gap-1">
                      @{u.username}
                      <button
                        type="button"
                        className="ml-1 inline-flex"
                        onClick={() => setPickedUsers((prev) => prev.filter(p => p.id !== u.id))}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="push-title">Title</Label>
            <Input id="push-title" maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="New feature dropping today" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="push-body">Message</Label>
            <Textarea id="push-body" maxLength={500} value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder="Open the app to check it out." />
          </div>

          <div className="space-y-2">
            <Label htmlFor="push-url">Deep link (optional)</Label>
            <Input id="push-url" maxLength={500} value={actionUrl} onChange={(e) => setActionUrl(e.target.value)} placeholder="/clips/123" />
            <p className="text-xs text-muted-foreground">Tap routes to this in-app path. Leave blank to just open the app.</p>
          </div>

          <div className="flex justify-end">
            <Button onClick={() => sendMutation.mutate()} disabled={sendDisabled} className="gap-2">
              <Send className="h-4 w-4" />
              {sendMutation.isPending ? "Sending…" : "Send push"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent broadcasts</CardTitle>
          <CardDescription>Last 50 admin-sent pushes.</CardDescription>
        </CardHeader>
        <CardContent>
          {broadcasts.isLoading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : !broadcasts.data?.broadcasts.length ? (
            <div className="text-sm text-muted-foreground">No broadcasts yet.</div>
          ) : (
            <ul className="divide-y">
              {broadcasts.data.broadcasts.map((b) => (
                <li key={b.id} className="py-2 text-sm">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-medium">{b.title}</span>
                    <span className="text-xs text-muted-foreground">{new Date(b.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="text-xs text-muted-foreground line-clamp-2">{b.body}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                    <Badge variant="outline">{describeAudience(b.audience)}</Badge>
                    <span className="inline-flex items-center gap-1 text-emerald-600">
                      <CheckCircle2 className="h-3 w-3" />
                      {b.successCount}/{b.recipientCount}
                    </span>
                    {b.failureCount > 0 && (
                      <span className="inline-flex items-center gap-1 text-rose-600">
                        <X className="h-3 w-3" />
                        {b.failureCount} failed
                      </span>
                    )}
                    {b.actionUrl && <span className="text-muted-foreground">→ {b.actionUrl}</span>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
