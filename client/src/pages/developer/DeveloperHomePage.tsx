import { Link } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Code2, KeyRound, ShieldCheck } from 'lucide-react';

export default function DeveloperHomePage() {
  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Gamefolio Developer Platform</h1>
        <p className="text-muted-foreground mt-1">
          Build apps that read and write Gamefolio data on behalf of your users via OAuth2.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <ShieldCheck className="h-6 w-6 text-primary mb-1" />
            <CardTitle className="text-base">Login with Gamefolio</CardTitle>
            <CardDescription>Standard OAuth2 Authorization Code flow with required PKCE.</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <Code2 className="h-6 w-6 text-primary mb-1" />
            <CardTitle className="text-base">Read & write API</CardTitle>
            <CardDescription>Fetch profile/clip data, and post clips or screenshots on a user's behalf.</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <KeyRound className="h-6 w-6 text-primary mb-1" />
            <CardTitle className="text-base">Your own app</CardTitle>
            <CardDescription>Register an app to get a client ID and secret.</CardDescription>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick start</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
            <li>Register an app and add a redirect URI.</li>
            <li>Redirect users to <code className="text-foreground">/oauth/authorize</code> with your client_id, redirect_uri, scope, state, and a PKCE code_challenge.</li>
            <li>Exchange the returned code for tokens at <code className="text-foreground">POST /oauth/token</code>.</li>
            <li>Call the API at <code className="text-foreground">/api/public/v1/*</code> with <code className="text-foreground">Authorization: Bearer &lt;access_token&gt;</code>.</li>
          </ol>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Link href="/developer/apps/new">
          <Button>Create an app</Button>
        </Link>
        <Link href="/developer/apps">
          <Button variant="outline">My apps</Button>
        </Link>
      </div>
    </div>
  );
}
