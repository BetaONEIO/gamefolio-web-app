import { Link } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Code2, KeyRound, ShieldCheck } from 'lucide-react';

// Kept in sync by hand with server/routes/public-api-v1.ts — there are more
// entries in shared/schema.ts's VALID_OAUTH_SCOPES (profile:write,
// screenshots:read, screenshots:write, games:read) but no endpoint currently
// checks them, so they're deliberately left off this list rather than
// advertising access that doesn't exist yet.
const API_ENDPOINTS = [
  {
    method: 'GET',
    path: '/api/public/v1/me',
    scope: 'profile:read',
    description: "The authenticated user's public profile.",
    response: `{
  "id": 123,
  "username": "player1",
  "displayName": "Player One",
  "avatarUrl": "https://...",
  "bio": "..."
}`,
  },
  {
    method: 'GET',
    path: '/api/public/v1/clips',
    scope: 'clips:read',
    description: "The authenticated user's own clips.",
    response: `{ "clips": [ { "id": 1, "title": "...", ... } ] }`,
  },
  {
    method: 'GET',
    path: '/api/public/v1/clips/:id',
    scope: 'clips:read',
    description: "A single clip owned by the authenticated user.",
    response: `{ "clip": { "id": 1, "title": "...", ... } }`,
  },
  {
    method: 'POST',
    path: '/api/public/v1/clips',
    scope: 'clips:write',
    description: 'Uploads a video and creates a clip on the user\'s behalf. Multipart form: file (required), title (required), description, gameId, tags, videoType, ageRestricted, trimStart, trimEnd.',
    response: `201 Created — the newly created clip`,
  },
];

const SCOPES = [
  { scope: 'profile:read', label: 'View your public profile (username, display name, avatar, bio)' },
  { scope: 'clips:read', label: 'View your clips' },
  { scope: 'clips:write', label: 'Post clips on your behalf' },
];

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
            <CardDescription>Fetch profile/clip data, and post clips on a user's behalf.</CardDescription>
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

      <Card>
        <CardHeader>
          <CardTitle>Available scopes</CardTitle>
          <CardDescription>Request only the scopes your app needs — the consent screen shows these to the user by name.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {SCOPES.map((s) => (
              <li key={s.scope} className="flex items-start gap-2">
                <code className="text-foreground shrink-0">{s.scope}</code>
                <span className="text-muted-foreground">{s.label}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>API reference</CardTitle>
          <CardDescription>All endpoints live under <code className="text-foreground">/api/public/v1</code> and require <code className="text-foreground">Authorization: Bearer &lt;access_token&gt;</code>.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {API_ENDPOINTS.map((e) => (
            <div key={`${e.method} ${e.path}`} className="border rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={e.method === 'GET' ? 'bg-primary text-white' : 'bg-blue-600 text-white'}>{e.method}</Badge>
                <code className="text-foreground text-sm">{e.path}</code>
                <code className="text-xs text-muted-foreground">{e.scope}</code>
              </div>
              <p className="text-sm text-muted-foreground">{e.description}</p>
              <pre className="text-xs bg-muted rounded-md p-2 overflow-x-auto"><code>{e.response}</code></pre>
            </div>
          ))}
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
