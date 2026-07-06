import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, getQueryFn, queryClient } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { ShieldCheck } from 'lucide-react';

interface Authorization {
  clientId: number;
  name: string;
  logoUrl: string | null;
  scopes: string[];
  lastUsedAt: string | null;
}

const SCOPE_LABELS: Record<string, string> = {
  'profile:read': 'View your public profile',
  'profile:write': 'Update your public profile',
  'clips:read': 'View your clips',
  'clips:write': 'Post clips and screenshots on your behalf',
  'screenshots:read': 'View your screenshots',
  'screenshots:write': 'Post screenshots on your behalf',
  'games:read': 'View game data',
};

export default function ConnectedAppsPage() {
  const { toast } = useToast();
  const { data, isLoading } = useQuery<{ authorizations: Authorization[] }>({
    queryKey: ['/api/oauth/my-authorizations'],
    queryFn: getQueryFn({ on401: 'throw' }),
  });

  const revokeMutation = useMutation({
    mutationFn: async (clientId: number) => {
      const res = await apiRequest('DELETE', `/api/oauth/my-authorizations/${clientId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/oauth/my-authorizations'] });
      toast({ title: 'Access revoked', variant: 'gamefolioSuccess' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to revoke access', description: error.message, variant: 'gamefolioError' });
    },
  });

  const authorizations = data?.authorizations || [];

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Connected Apps</h1>
        <p className="text-muted-foreground mt-1">Apps you've given access to your Gamefolio account.</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array(2).fill(0).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : authorizations.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            You haven't connected any third-party apps.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {authorizations.map((auth) => (
            <Card key={auth.clientId}>
              <CardHeader className="flex-row items-start justify-between space-y-0">
                <div className="flex items-center gap-3">
                  {auth.logoUrl ? (
                    <img src={auth.logoUrl} alt={auth.name} className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                    <ShieldCheck className="h-10 w-10 text-primary" />
                  )}
                  <div>
                    <CardTitle className="text-base">{auth.name}</CardTitle>
                    <ul className="mt-1 space-y-0.5">
                      {auth.scopes.map((s) => (
                        <li key={s} className="text-sm text-muted-foreground">{SCOPE_LABELS[s] || s}</li>
                      ))}
                    </ul>
                    {auth.lastUsedAt && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Last used {new Date(auth.lastUsedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" disabled={revokeMutation.isPending}>Revoke</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Revoke access for {auth.name}?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This app will immediately lose access to your Gamefolio account. You can reconnect it later if needed.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => revokeMutation.mutate(auth.clientId)}>Revoke</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
