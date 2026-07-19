import { Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { getQueryFn } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';

interface DeveloperApp {
  id: number;
  name: string;
  description: string | null;
  logoUrl: string | null;
  isActive: boolean;
  createdAt: string;
}

export default function MyAppsPage() {
  const { data: apps, isLoading } = useQuery<DeveloperApp[]>({
    queryKey: ['/api/developer/apps'],
    queryFn: getQueryFn({ on401: 'throw' }),
  });

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Apps</h1>
        <Link href="/developer/apps/new">
          <Button size="sm"><Plus className="h-4 w-4 mr-1" /> New app</Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array(2).fill(0).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : !apps || apps.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            You haven't registered any apps yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {apps.map((app) => (
            <Link key={app.id} href={`/developer/apps/${app.id}`}>
              <Card className="cursor-pointer hover:border-primary/50 transition-colors">
                <CardHeader className="flex-row items-center justify-between space-y-0 py-4">
                  <div className="flex items-center gap-3">
                    {app.logoUrl ? (
                      <img src={app.logoUrl} alt={app.name} className="h-10 w-10 rounded-full object-cover" />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                        {app.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <CardTitle className="text-base">{app.name}</CardTitle>
                      {app.description && <p className="text-sm text-muted-foreground">{app.description}</p>}
                    </div>
                  </div>
                  <Badge variant={app.isActive ? 'default' : 'secondary'}>
                    {app.isActive ? 'Active' : 'Deactivated'}
                  </Badge>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
