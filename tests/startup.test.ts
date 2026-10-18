import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { RequestListener } from 'node:http';
import { startServer } from '../server/startup';

test('opens port before loading app, blocks normal traffic until ready, then hands off same server', async () => {
  let release!: (handler: RequestListener) => void;
  let called = 0;
  const running = await startServer({
    listen: { port: 0, host: '127.0.0.1' },
    load: async server => {
      assert.ok(server.listening);
      return new Promise<RequestListener>(resolve => { release = resolve; });
    },
    onFailure: error => { throw error; },
  });
  const base = `http://127.0.0.1:${(running.server.address() as { port: number }).port}`;
  try {
    assert.equal((await fetch(base + '/api/health/live')).status, 200);
    for (const route of ['/', '/api/user', '/api/health/ready']) {
      const response = await fetch(base + route);
      assert.equal(response.status, 503);
      assert.equal(response.headers.get('retry-after'), '5');
      assert.equal(response.headers.get('cache-control'), 'no-store');
    }
    release((_req, res) => { called++; res.end('application'); });
    await running.ready;
    assert.equal(await (await fetch(base + '/api/user')).text(), 'application');
    assert.equal((await fetch(base + '/api/health/ready')).status, 200);
    assert.equal(called, 1);
  } finally { running.server.closeAllConnections(); running.server.close(); }
});

test('initialisation failure never exposes partially initialised application', async () => {
  const errors: unknown[] = [];
  const running = await startServer({ listen: { port: 0, host: '127.0.0.1' }, load: async () => { throw Error('database unavailable'); }, onFailure: error => { errors.push(error); } });
  await running.ready;
  try {
    const base = `http://127.0.0.1:${(running.server.address() as { port: number }).port}`;
    assert.equal(errors.length, 1);
    assert.equal((await fetch(base + '/api/health/live')).status, 503);
    assert.equal((await fetch(base + '/')).status, 503);
  } finally { running.server.closeAllConnections(); running.server.close(); }
});

test('startup deadline prevents a late completion from becoming ready', async () => {
  let release!: (handler: RequestListener) => void;
  let failure!: () => void;
  const failed = new Promise<void>(resolve => { failure = resolve; });
  const running = await startServer({ listen: { port: 0, host: '127.0.0.1' }, timeoutMs: 20, load: () => new Promise(resolve => { release = resolve; }), onFailure: failure });
  await failed;
  release((_req, res) => res.end('must not serve'));
  await running.ready;
  try {
    const base = `http://127.0.0.1:${(running.server.address() as { port: number }).port}`;
    assert.equal((await fetch(base + '/api/health/ready')).status, 503);
  } finally { running.server.closeAllConnections(); running.server.close(); }
});
