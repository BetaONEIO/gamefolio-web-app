import { useState } from 'react';
import { useLocation } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Copy } from 'lucide-react';
import type { OAuthClientType } from '@shared/schema';

export default function CreateAppPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [redirectUri, setRedirectUri] = useState('');
  const [clientType, setClientType] = useState<OAuthClientType>('confidential');
  const [createdApp, setCreatedApp] = useState<{ id: number; clientSecret: string | null } | null>(null);

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/developer/apps', {
        name,
        description: description || undefined,
        redirectUris: [redirectUri],
        clientType,
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/developer/apps'] });
      if (data.clientSecret) {
        setCreatedApp({ id: data.id, clientSecret: data.clientSecret });
      } else {
        // Public clients get no secret — nothing to show/save, go straight
        // to the app page.
        setLocation(`/developer/apps/${data.id}`);
      }
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to create app', description: error.message, variant: 'gamefolioError' });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !redirectUri.trim()) return;
    createMutation.mutate();
  };

  return (
    <div className="max-w-lg mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Create a new app</h1>
      <Card>
        <CardHeader>
          <CardTitle>App details</CardTitle>
          <CardDescription>You can edit these later.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="app-name">Name</Label>
              <Input id="app-name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="app-description">Description</Label>
              <Textarea id="app-description" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="app-redirect">Redirect URI</Label>
              <Input
                id="app-redirect"
                placeholder="https://yourapp.com/oauth/callback"
                value={redirectUri}
                onChange={(e) => setRedirectUri(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">Must be https:// (or http://localhost for local development).</p>
            </div>
            <div className="space-y-2">
              <Label>Client type</Label>
              <RadioGroup value={clientType} onValueChange={(v) => setClientType(v as OAuthClientType)} className="space-y-2">
                <div className="flex items-start gap-2">
                  <RadioGroupItem value="confidential" id="type-confidential" className="mt-1" />
                  <Label htmlFor="type-confidential" className="font-normal cursor-pointer">
                    <span className="block">Confidential</span>
                    <span className="block text-xs text-muted-foreground font-normal">
                      A server-side app that can keep a client secret private. Issues a client secret.
                    </span>
                  </Label>
                </div>
                <div className="flex items-start gap-2">
                  <RadioGroupItem value="public" id="type-public" className="mt-1" />
                  <Label htmlFor="type-public" className="font-normal cursor-pointer">
                    <span className="block">Public</span>
                    <span className="block text-xs text-muted-foreground font-normal">
                      A desktop, mobile, or CLI app whose code ships to users — no client secret can stay
                      secret in that context. Authenticates with PKCE only (RFC 8252).
                    </span>
                  </Label>
                </div>
              </RadioGroup>
              <p className="text-xs text-muted-foreground">Fixed once the app is created.</p>
            </div>
            <Button type="submit" className="w-full" disabled={createMutation.isPending}>
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create app'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Dialog open={!!createdApp} onOpenChange={(open) => {
        if (!open && createdApp) setLocation(`/developer/apps/${createdApp.id}`);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save your client secret</DialogTitle>
            <DialogDescription>
              This is the only time you'll see this secret. Store it securely — you can regenerate it later if it's lost or compromised.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 bg-muted rounded-md p-3 font-mono text-sm break-all">
            {createdApp?.clientSecret}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                if (createdApp?.clientSecret) navigator.clipboard.writeText(createdApp.clientSecret);
                toast({ title: 'Copied to clipboard', variant: 'gamefolioSuccess' });
              }}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={() => createdApp && setLocation(`/developer/apps/${createdApp.id}`)}>
              I've saved it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
