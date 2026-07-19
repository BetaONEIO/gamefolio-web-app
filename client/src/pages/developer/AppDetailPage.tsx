import { useState } from 'react';
import { useParams } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, getQueryFn, queryClient } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Copy, Loader2 } from 'lucide-react';

interface DeveloperApp {
  id: number;
  clientId: string;
  name: string;
  description: string | null;
  logoUrl: string | null;
  redirectUris: string[];
  isActive: boolean;
}

export default function AppDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [redirectUrisText, setRedirectUrisText] = useState<string | null>(null);
  const [newSecret, setNewSecret] = useState<string | null>(null);

  const { data: app, isLoading } = useQuery<DeveloperApp>({
    queryKey: [`/api/developer/apps/${id}`],
    queryFn: getQueryFn({ on401: 'throw' }),
  });

  const updateMutation = useMutation({
    mutationFn: async (redirectUris: string[]) => {
      const res = await apiRequest('PATCH', `/api/developer/apps/${id}`, { redirectUris });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/developer/apps/${id}`] });
      toast({ title: 'Redirect URIs updated', variant: 'gamefolioSuccess' });
    },
    onError: (error: Error) => toast({ title: 'Update failed', description: error.message, variant: 'gamefolioError' }),
  });

  const regenerateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', `/api/developer/apps/${id}/regenerate-secret`);
      return res.json();
    },
    onSuccess: (data) => setNewSecret(data.clientSecret),
    onError: (error: Error) => toast({ title: 'Failed to regenerate secret', description: error.message, variant: 'gamefolioError' }),
  });

  const deactivateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('PATCH', `/api/developer/apps/${id}/deactivate`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/developer/apps/${id}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/developer/apps'] });
      toast({ title: 'App deactivated', variant: 'gamefolioSuccess' });
    },
  });

  if (isLoading) {
    return <div className="max-w-lg mx-auto p-6"><Skeleton className="h-64 w-full" /></div>;
  }
  if (!app) {
    return <div className="max-w-lg mx-auto p-6 text-muted-foreground">App not found.</div>;
  }

  const redirectUris = redirectUrisText !== null ? redirectUrisText : app.redirectUris.join('\n');

  return (
    <div className="max-w-lg mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{app.name}</h1>
        {app.description && <p className="text-muted-foreground">{app.description}</p>}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Client ID</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 bg-muted rounded-md p-3 font-mono text-sm break-all">
            {app.clientId}
            <Button variant="ghost" size="sm" onClick={() => {
              navigator.clipboard.writeText(app.clientId);
              toast({ title: 'Copied', variant: 'gamefolioSuccess' });
            }}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Redirect URIs</CardTitle>
          <CardDescription>One per line. Exact match required.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <textarea
            className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
            value={redirectUris}
            onChange={(e) => setRedirectUrisText(e.target.value)}
          />
          <Button
            size="sm"
            disabled={updateMutation.isPending}
            onClick={() => updateMutation.mutate(redirectUris.split('\n').map(s => s.trim()).filter(Boolean))}
          >
            {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Client secret</CardTitle>
          <CardDescription>Regenerating revokes all existing tokens for this app — every connected user will need to re-authorize.</CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" disabled={regenerateMutation.isPending}>Regenerate secret</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Regenerate client secret?</AlertDialogTitle>
                <AlertDialogDescription>
                  This immediately revokes every access and refresh token issued to this app. Anyone using it will be signed out until they reconnect with the new secret.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => regenerateMutation.mutate()}>Regenerate</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      {app.isActive && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-destructive">Deactivate app</CardTitle>
            <CardDescription>Blocks new authorizations and token exchanges. Not reversible from here.</CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">Deactivate</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Deactivate this app?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Users will no longer be able to authorize it, and existing token exchanges will fail.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => deactivateMutation.mutate()}>Deactivate</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!newSecret} onOpenChange={(open) => !open && setNewSecret(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New client secret</DialogTitle>
            <DialogDescription>This is the only time you'll see this secret.</DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 bg-muted rounded-md p-3 font-mono text-sm break-all">
            {newSecret}
            <Button variant="ghost" size="sm" onClick={() => {
              if (newSecret) navigator.clipboard.writeText(newSecret);
              toast({ title: 'Copied', variant: 'gamefolioSuccess' });
            }}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={() => setNewSecret(null)}>I've saved it</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
