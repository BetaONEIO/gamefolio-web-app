import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import ts from 'typescript';
import { and, desc, eq, sql } from 'drizzle-orm';
import { toPublicUser } from '../server/lib/public-user';

// Execute the actual Express callbacks without starting the application, opening
// sockets, or connecting to storage. Include every registration of a public path.
function handlers(filename: string, method: string, route: string, dependencies: Record<string, unknown>) {
  const source = readFileSync(filename, 'utf8');
  const file = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true);
  const callbacks: ts.Node[] = [];
  const helpers: string[] = [];
  function visit(node: ts.Node) {
    if (ts.isFunctionDeclaration(node) && node.name?.text === 'toPublicScreenshotUsers') helpers.push(node.getText(file));
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)
      && node.expression.name.text === method && node.arguments[0]
      && ts.isStringLiteral(node.arguments[0]) && node.arguments[0].text === route) {
      callbacks.push(node.arguments[node.arguments.length - 1]);
    }
    ts.forEachChild(node, visit);
  }
  visit(file);
  assert.ok(callbacks.length, `Missing ${method} ${route}`);
  return callbacks.map(callback => {
    const code = `${helpers.join('\n')}\nconst handler = ${callback.getText(file)};`;
    const compiled = ts.transpileModule(code.replace(/\bimport\(/g, 'loadDependency('), {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
    }).outputText;
    const deps = { console: { log() {}, warn() {}, error() {} }, captureRouteError(error: unknown) { throw error; }, ...dependencies };
    return new Function(...Object.keys(deps), `${compiled}\nreturn handler;`)(...Object.values(deps));
  });
}

function response() {
  return {
    statusCode: 200, body: undefined as any, headers: {} as Record<string, string>,
    status(code: number) { this.statusCode = code; return this; },
    sendStatus(code: number) { this.statusCode = code; return this; },
    json(body: unknown) { this.body = body; return this; },
    setHeader(name: string, value: string) { this.headers[name] = value; },
  };
}

const storedUser = { id: 42, username: 'creator', displayName: 'Creator', password: 'test-password-hash',
  email: 'private@example.test', twoFactorSecret: 'test-totp', twitchAccessToken: 'test-oauth',
  encryptedPrivateKey: 'test-key', signupIp: '192.0.2.1' };
function assertPublicUser(user: any) {
  assert.equal(user.id, storedUser.id);
  assert.equal(user.username, storedUser.username);
  for (const field of ['password', 'email', 'twoFactorSecret', 'twitchAccessToken', 'encryptedPrivateKey', 'signupIp']) {
    assert.equal(Object.hasOwn(user, field), false, `${field} must not be public`);
  }
}

for (const route of ['/api/screenshots/latest', '/api/trending/screenshots', '/api/screenshots']) {
  test(`${route} projects nested user records in every registration`, async () => {
    const screenshots = [{ id: 8, title: 'Game screenshot', user: storedUser }, { id: 9, user: null }];
    const routes = handlers('server/routes.ts', 'get', route, {
      toPublicUser,
      storage: { getLatestScreenshots: async () => screenshots, getTrendingScreenshots: async () => screenshots },
    });
    for (const handler of routes) {
      const res = response();
      await handler({ query: {} }, res);
      assert.equal(res.statusCode, 200);
      assertPublicUser(res.body[0].user);
      assert.equal(res.body[0].title, 'Game screenshot');
      assert.equal(res.body[1].user, null);
    }
    assert.equal(storedUser.password, 'test-password-hash', 'projection must not mutate storage records');
  });
}

test('featured gamefolio applies the same public-user boundary', async () => {
  const query: any = { from: () => query, innerJoin: () => query, where: () => query, groupBy: () => query, orderBy: () => query,
    limit: () => query, then: (resolve: any) => Promise.resolve([{ count: 0, total: 0 }]).then(resolve) };
  const [handler] = handlers('server/routes.ts', 'get', '/api/featured/gamefolio', {
    toPublicUser, sql, and, desc, eq,
    clips: {}, screenshots: {}, follows: {}, userXPHistory: {}, games: {},
    db: { select: () => query },
    LeaderboardService: { getCurrentWeekLeaderboard: async () => [{ userId: 42, uploadsCount: 0 }] },
    storage: { getUser: async () => storedUser, getUserGameFavorites: async () => [], getClipsByUserId: async () => [] },
  });
  const res = response();
  await handler({}, res);
  assert.equal(res.statusCode, 200);
  assertPublicUser(res.body.user);
});

for (const wrapped of [false, true]) {
  test(`public game library reads ${wrapped ? 'wrapped' : 'postgres-js array'} query results`, async () => {
    const published = { key: 'clip-3', publication_status: 'published', title: 'Featured clip',
      video_url: 'https://media.example.test/clip.mp4', thumbnail_url: 'https://storage.example.test/thumb.jpg',
      private_owner_notes: 'must not be returned' };
    const [handler] = handlers('server/routes.ts', 'get', '/api/games/:id/library-content', {
      sql,
      db: { execute: async () => wrapped ? { rows: [{ id: 10, user_id: 42 }] } : [{ id: 10, user_id: 42 }] },
      gameLibrary: async (ownerId: number, profileId: number) => {
        assert.deepEqual([ownerId, profileId], [42, 10]);
        return { items: [published, { key: 'clip-4', publication_status: 'private' }] };
      },
      supabaseStorage: { convertToSignedUrl: async (url: string) => url.includes('storage.') ? 'https://signed.example.test/thumb.jpg' : null },
    });
    const res = response();
    await handler({ params: { id: '7' } }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.length, 1);
    assert.equal(res.body[0].key, 'clip-3');
    assert.equal(res.body[0].video_url, published.video_url, 'public R2 URLs must remain playable');
    assert.equal(res.body[0].thumbnail_url, 'https://signed.example.test/thumb.jpg');
    assert.equal(res.body[0].private_owner_notes, undefined);
    assert.equal(res.headers['Cache-Control'], 'no-store');
  });
}

for (const route of ['/api/indie/profile/upload-trailer', '/api/indie/upload/trailer']) {
  test(`${route} uploads to public storage and persists its URL`, async () => {
    const saved: any[] = [];
    const db = { update: () => ({ set: (value: any) => ({ where: async () => { saved.push(value); } }) }) };
    const uploads: any[][] = [];
    const [handler] = handlers('server/routes.ts', 'post', route, {
      db, eq, hasIndieDeveloperAccess: () => true,
      _indieResolveGameId: async () => 10, _indieUpsertMeta: async () => {},
      loadDependency: async () => ({ indieGameProfiles: {}, db, eq }),
      publicMediaStorage: { uploadBuffer: async (...args: any[]) => {
        uploads.push(args); return { url: 'https://media.example.test/trailer.mp4', path: 'canonical/trailer.mp4' };
      } },
      supabaseStorage: { uploadBuffer: async () => { throw new Error('Supabase video uploads are disabled'); } },
    });
    const res = response();
    await handler({ isAuthenticated: () => true, user: { id: 42 }, body: { gameId: 10 }, query: {},
      file: { buffer: Buffer.from('test video'), originalname: 'trailer.mp4', mimetype: 'video/mp4' } }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(uploads.length, 1);
    assert.equal(uploads[0][3], 'video');
    assert.equal(saved[0].trailerUrl, 'https://media.example.test/trailer.mp4');
    assert.equal(res.body.url, saved[0].trailerUrl);
  });
}

for (const uploadType of ['video', 'clip', 'reel']) {
  test(`direct ${uploadType} upload returns the public storage object's actual path`, async () => {
    const uploads: any[][] = [];
    const [handler] = handlers('server/routes/upload.ts', 'post', '/video-direct', {
      path, fs: { readFileSync: () => Buffer.from('test video'), unlink: (_path: string, callback: any) => callback(null) },
      storage: { getUploadLimits: async () => ({ maxClipSizeMB: 100, maxReelSizeMB: 100,
        maxClipDurationSeconds: 300, maxReelDurationSeconds: 60, isPro: true }) },
      VideoProcessor: { getVideoInfo: async () => ({ duration: 20 }) },
      publicMediaStorage: { uploadBuffer: async (...args: any[]) => {
        uploads.push(args); return { url: 'https://media.example.test/video.mp4', path: 'canonical/video.mp4' };
      } },
      uploadTelemetryContext: () => ({}),
      supabaseStorage: { uploadBuffer: async () => { throw new Error('Supabase video uploads are disabled'); } },
    });
    const res = response();
    await handler({ user: { id: 42 }, body: { uploadType },
      file: { path: '/unused-test-file', originalname: 'video.mp4', mimetype: 'video/mp4', size: 10 } }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(uploads.length, 1);
    assert.equal(uploads[0][3], 'video');
    assert.equal(res.body.result.path, 'canonical/video.mp4');
    assert.equal(res.body.result.url, 'https://media.example.test/video.mp4');
  });
}
