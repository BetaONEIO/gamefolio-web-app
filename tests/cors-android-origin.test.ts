import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import test from 'node:test';
import express from 'express';
import { corsMiddleware } from '../server/cors';

const TUS_PREFLIGHT_HEADERS = {
  'Access-Control-Request-Method': 'POST',
  'Access-Control-Request-Headers': 'tus-resumable,upload-length,upload-metadata',
};

async function withCorsServer(run: (base: string) => Promise<void>): Promise<void> {
  const app = express();
  app.use(corsMiddleware);
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });
  const server: Server = await new Promise((resolve) => {
    const listening = createServer(app);
    listening.listen(0, '127.0.0.1', () => resolve(listening));
  });
  try {
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('test server has no port');
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

async function preflight(base: string, origin: string): Promise<Response> {
  return fetch(`${base}/api/upload/tus`, {
    method: 'OPTIONS',
    headers: { Origin: origin, ...TUS_PREFLIGHT_HEADERS },
  });
}

test('production preflight allows Capacitor Android origins and rejects others', async () => {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  try {
    await withCorsServer(async (base) => {
      const android = await preflight(base, 'https://localhost');
      assert.equal(android.status, 200);
      assert.equal(android.headers.get('access-control-allow-origin'), 'https://localhost');
      assert.equal(android.headers.get('access-control-allow-credentials'), 'true');
      assert.match(android.headers.get('access-control-allow-methods') ?? '', /\bPOST\b/);
      const allowed = android.headers.get('access-control-allow-headers') ?? '';
      assert.match(allowed, /tus-resumable/i);
      assert.match(allowed, /upload-length/i);
      assert.match(allowed, /upload-metadata/i);
      assert.match(allowed, /authorization/i);
      const exposed = android.headers.get('access-control-expose-headers') ?? '';
      assert.match(exposed, /\bLocation\b/);
      assert.match(exposed, /Upload-Offset/);
      assert.match(exposed, /Tus-Resumable/);
      assert.equal(android.headers.get('vary'), 'Origin');

      const httpLocal = await preflight(base, 'http://localhost');
      assert.equal(httpLocal.headers.get('access-control-allow-origin'), 'http://localhost');

      const ios = await preflight(base, 'capacitor://localhost');
      assert.equal(ios.headers.get('access-control-allow-origin'), 'capacitor://localhost');

      const web = await fetch(`${base}/api/health`, {
        headers: { Origin: 'https://localhost' },
      });
      assert.equal(web.status, 200);
      assert.equal(web.headers.get('access-control-allow-origin'), 'https://localhost');

      for (const origin of [
        'https://evil.example',
        'https://localhost.evil.com',
        'http://localhost:8080',
        'http://127.0.0.1',
        'https://app.gamefolio.com.evil.com',
      ]) {
        const rejected = await preflight(base, origin);
        assert.equal(rejected.status, 200, origin);
        assert.equal(rejected.headers.get('access-control-allow-origin'), null, origin);
      }
    });

    process.env.NODE_ENV = 'development';
    await withCorsServer(async (base) => {
      const dev = await preflight(base, 'http://localhost:5173');
      assert.equal(dev.headers.get('access-control-allow-origin'), 'http://localhost:5173');

      const foreign = await preflight(base, 'https://evil.example');
      assert.equal(foreign.headers.get('access-control-allow-origin'), null);
    });
  } finally {
    if (previous === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous;
  }
});
