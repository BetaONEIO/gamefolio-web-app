import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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
import { AmbassadorBadge } from "@/components/ui/ambassador-badge";
import { ArrowLeft, Copy, User, Users } from "lucide-react";

interface AmbassadorConversion {
  userId: number;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  subscriptionType: string | null;
  convertedAt: string;
}

interface AmbassadorStats {
  referralCode: string | null;
  totalConversions: number;
  conversions: AmbassadorConversion[];
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function AmbassadorDashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: stats, isLoading } = useQuery<AmbassadorStats>({
    queryKey: ['/api/ambassador/stats'],
    queryFn: getQueryFn({ on401: 'throw' }),
    enabled: !!user?.isAmbassador,
  });

  const copyCode = () => {
    if (!stats?.referralCode) return;
    navigator.clipboard.writeText(stats.referralCode).then(() => {
      toast({ title: 'Referral code copied!', description: 'Ready to share.', duration: 2000 });
    }).catch(() => {
      toast({ title: 'Copy failed', description: 'Please copy manually.', variant: 'destructive' });
    });
  };

  return (
    <div className="container mx-auto px-4 py-6 pb-24 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href={user ? `/profile/${user.username}` : '/'}>
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-xl font-bold tracking-tight flex items-center">
          Ambassador Dashboard
          <AmbassadorBadge isAmbassador size="lg" />
        </h1>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Your Ambassador Code</CardTitle>
            <CardDescription>
              This is the same code as your referral code. Anyone who signs up with it and
              purchases Gamefolio Pro counts toward your conversions below.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-muted rounded-lg px-4 py-3 font-mono text-xl font-bold tracking-widest text-center border border-border">
                {isLoading ? '…' : stats?.referralCode ?? '—'}
              </div>
              <Button variant="outline" size="icon" onClick={copyCode} disabled={!stats?.referralCode}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 text-center border border-border">
              <div className="flex items-center justify-center mb-2">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div className="text-2xl font-bold">{stats?.totalConversions ?? 0}</div>
              <div className="text-xs text-muted-foreground mt-1">Gamefolio Pro Conversions</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Conversions</CardTitle>
            <CardDescription>
              Everyone who signed up with your code and purchased Gamefolio Pro.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                Loading conversions...
              </div>
            ) : !stats?.conversions?.length ? (
              <div className="text-center py-8 text-muted-foreground">
                No conversions yet. Share your code to start earning conversions.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Converted</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.conversions.map((conversion) => (
                      <TableRow key={conversion.userId}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {conversion.avatarUrl ? (
                              <img
                                src={conversion.avatarUrl}
                                alt={conversion.username}
                                className="w-8 h-8 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                                <User className="w-4 h-4" />
                              </div>
                            )}
                            <div>
                              <p className="font-medium">{conversion.displayName || conversion.username}</p>
                              <p className="text-xs text-muted-foreground">@{conversion.username}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-primary text-white capitalize">
                            {conversion.subscriptionType || 'Pro'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(conversion.convertedAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
