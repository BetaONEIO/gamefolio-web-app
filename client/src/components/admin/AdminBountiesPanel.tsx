import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, Users, ListChecks, Clock } from "lucide-react";

interface BountyOverview {
  totalBounties: number;
  activeBounties: number;
  totalParticipants: number;
  totalCompletions: number;
  totalSubmissions: number;
  pendingSubmissions: number;
}

interface BountyRow {
  id: number;
  title: string;
  status: string;
  bountyType: string;
  rewardType: string;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  gameId: number | null;
  gameName: string | null;
  gameImageUrl: string | null;
  participantCount: number;
  completedCount: number;
  submissionCount: number;
  pendingSubmissionCount: number;
  approvedSubmissionCount: number;
  rejectedSubmissionCount: number;
}

interface Participant {
  id: number;
  status: string;
  progressPercent: number;
  clipsUploaded: number;
  reelsUploaded: number;
  screenshotsUploaded: number;
  totalViews: number;
  xpEarned: number;
  joinedAt: string;
  completedAt: string | null;
  userId: number;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}

interface Submission {
  id: number;
  contentType: string;
  contentId: number;
  status: string;
  rejectionReason: string | null;
  reviewedAt: string | null;
  createdAt: string;
  userId: number;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}

interface BountyDetail {
  bounty: Record<string, any>;
  participants: Participant[];
  submissions: Submission[];
}

function statusVariant(status: string): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "active": return "default";
    case "paused": return "secondary";
    case "ended": return "outline";
    default: return "outline";
  }
}

function StatTile({ icon: Icon, label, value }: { icon: typeof Trophy; label: string; value: number | string }) {
  return (
    <div className="flex items-center gap-3 rounded-md border p-3">
      <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
      <div>
        <div className="text-lg font-semibold leading-tight">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

export function AdminBountiesPanel() {
  const [selectedBountyId, setSelectedBountyId] = useState<number | null>(null);

  const overview = useQuery<{ overview: BountyOverview }>({
    queryKey: ["/api/admin/bounties/overview"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const bounties = useQuery<{ bounties: BountyRow[] }>({
    queryKey: ["/api/admin/bounties"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const detail = useQuery<BountyDetail>({
    queryKey: [`/api/admin/bounties/${selectedBountyId}`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: selectedBountyId !== null,
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Bounties</CardTitle>
          <CardDescription>Participation and completion across all game bounties.</CardDescription>
        </CardHeader>
        <CardContent>
          {overview.isLoading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : overview.data && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <StatTile icon={Trophy} label="Total bounties" value={overview.data.overview.totalBounties} />
              <StatTile icon={Trophy} label="Active" value={overview.data.overview.activeBounties} />
              <StatTile icon={Users} label="Participants" value={overview.data.overview.totalParticipants} />
              <StatTile icon={Users} label="Completions" value={overview.data.overview.totalCompletions} />
              <StatTile icon={ListChecks} label="Submissions" value={overview.data.overview.totalSubmissions} />
              <StatTile icon={Clock} label="Pending review" value={overview.data.overview.pendingSubmissions} />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All bounties</CardTitle>
          <CardDescription>Click a row to see who's participating and their submission status.</CardDescription>
        </CardHeader>
        <CardContent>
          {bounties.isLoading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : !bounties.data?.bounties.length ? (
            <div className="text-sm text-muted-foreground">No bounties yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bounty</TableHead>
                  <TableHead>Game</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Participants</TableHead>
                  <TableHead className="text-right">Completed</TableHead>
                  <TableHead className="text-right">Submissions</TableHead>
                  <TableHead className="text-right">Pending</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bounties.data.bounties.map((b) => (
                  <TableRow
                    key={b.id}
                    className="cursor-pointer"
                    onClick={() => setSelectedBountyId(b.id)}
                    data-testid={`row-bounty-${b.id}`}
                  >
                    <TableCell className="font-medium">{b.title}</TableCell>
                    <TableCell className="text-muted-foreground">{b.gameName ?? "—"}</TableCell>
                    <TableCell><Badge variant={statusVariant(b.status)}>{b.status}</Badge></TableCell>
                    <TableCell className="text-right">{b.participantCount}</TableCell>
                    <TableCell className="text-right">{b.completedCount}</TableCell>
                    <TableCell className="text-right">{b.submissionCount}</TableCell>
                    <TableCell className="text-right">
                      {b.pendingSubmissionCount > 0 ? (
                        <Badge variant="secondary">{b.pendingSubmissionCount}</Badge>
                      ) : "0"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={selectedBountyId !== null} onOpenChange={(open) => !open && setSelectedBountyId(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detail.data?.bounty?.title ?? "Bounty detail"}</DialogTitle>
            <DialogDescription>
              {detail.data?.bounty?.gameName ? `Game: ${detail.data.bounty.gameName}` : ""}
            </DialogDescription>
          </DialogHeader>

          {detail.isLoading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : detail.data && (
            <div className="space-y-6">
              <div>
                <h4 className="mb-2 text-sm font-semibold">Participants ({detail.data.participants.length})</h4>
                {detail.data.participants.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No one has joined yet.</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Progress</TableHead>
                        <TableHead className="text-right">XP earned</TableHead>
                        <TableHead>Joined</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detail.data.participants.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={p.avatarUrl ?? undefined} />
                                <AvatarFallback>{p.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <span>@{p.username}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={p.completedAt ? "default" : "outline"}>
                              {p.completedAt ? "completed" : p.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">{p.progressPercent}%</TableCell>
                          <TableCell className="text-right">{p.xpEarned}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(p.joinedAt).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>

              <div>
                <h4 className="mb-2 text-sm font-semibold">Submissions ({detail.data.submissions.length})</h4>
                {detail.data.submissions.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No submissions yet.</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Submitted</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detail.data.submissions.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell>@{s.username}</TableCell>
                          <TableCell className="text-muted-foreground">{s.contentType}</TableCell>
                          <TableCell>
                            <Badge variant={
                              s.status === "approved" ? "default" : s.status === "rejected" ? "destructive" : "secondary"
                            }>
                              {s.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(s.createdAt).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
