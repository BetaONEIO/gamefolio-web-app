import { Fragment, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChevronDown, ChevronRight, RefreshCw, User, Users } from "lucide-react";

interface AmbassadorRow {
  id: number;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  referralCode: string | null;
  totalConversions: number;
}

interface AmbassadorConversion {
  userId: number;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  subscriptionType: string | null;
  convertedAt: string;
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function AmbassadorConversionsRow({ ambassadorId }: { ambassadorId: number }) {
  const { data: conversions, isLoading } = useQuery<AmbassadorConversion[]>({
    queryKey: [`/api/admin/ambassadors/${ambassadorId}/conversions`],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  if (isLoading) {
    return (
      <TableRow>
        <TableCell colSpan={4} className="text-center text-muted-foreground py-4">
          Loading conversions...
        </TableCell>
      </TableRow>
    );
  }

  if (!conversions?.length) {
    return (
      <TableRow>
        <TableCell colSpan={4} className="text-center text-muted-foreground py-4">
          No conversions yet.
        </TableCell>
      </TableRow>
    );
  }

  return (
    <TableRow>
      <TableCell colSpan={4} className="p-0">
        <div className="bg-muted/30 px-4 py-3">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Converted</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {conversions.map((c) => (
                <TableRow key={c.userId}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {c.avatarUrl ? (
                        <img src={c.avatarUrl} alt={c.username} className="w-6 h-6 rounded-full object-cover" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                          <User className="w-3 h-3" />
                        </div>
                      )}
                      <span>{c.displayName || c.username}</span>
                      <span className="text-xs text-muted-foreground">@{c.username}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className="bg-primary text-white capitalize">{c.subscriptionType || 'Pro'}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(c.convertedAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </TableCell>
    </TableRow>
  );
}

export function AmbassadorManagementPanel() {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data: ambassadors, isLoading, refetch } = useQuery<AmbassadorRow[]>({
    queryKey: ['/api/admin/ambassadors'],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const totalConversions = ambassadors?.reduce((sum, a) => sum + a.totalConversions, 0) ?? 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Ambassadors</p>
              <Users className="w-4 h-4 text-primary" />
            </div>
            <p className="text-2xl font-bold mt-1">{ambassadors?.length ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Total Pro Conversions</p>
              <Users className="w-4 h-4 text-primary" />
            </div>
            <p className="text-2xl font-bold mt-1">{totalConversions}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Ambassadors</CardTitle>
              <CardDescription>
                Ambassadors and how many Gamefolio Pro purchases they've driven via their referral code.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin mr-2" />
              Loading ambassadors...
            </div>
          ) : !ambassadors?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              No ambassadors yet. Grant ambassador status from the Users tab.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8" />
                    <TableHead>Ambassador</TableHead>
                    <TableHead>Referral Code</TableHead>
                    <TableHead>Conversions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ambassadors.map((ambassador) => (
                    <Fragment key={ambassador.id}>
                      <TableRow
                        className="cursor-pointer"
                        onClick={() => setExpandedId(expandedId === ambassador.id ? null : ambassador.id)}
                      >
                        <TableCell>
                          {expandedId === ambassador.id ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {ambassador.avatarUrl ? (
                              <img
                                src={ambassador.avatarUrl}
                                alt={ambassador.username}
                                className="w-8 h-8 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                                <User className="w-4 h-4" />
                              </div>
                            )}
                            <div>
                              <p className="font-medium">{ambassador.displayName || ambassador.username}</p>
                              <p className="text-xs text-muted-foreground">@{ambassador.username}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono">{ambassador.referralCode || '—'}</TableCell>
                        <TableCell>
                          <Badge className="bg-primary text-white">{ambassador.totalConversions}</Badge>
                        </TableCell>
                      </TableRow>
                      {expandedId === ambassador.id && (
                        <AmbassadorConversionsRow ambassadorId={ambassador.id} />
                      )}
                    </Fragment>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default AmbassadorManagementPanel;
