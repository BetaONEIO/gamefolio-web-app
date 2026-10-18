import { createServer, type RequestListener, type Server } from 'node:http';
import type { ListenOptions } from 'node:net';
import { performance } from 'node:perf_hooks';

// Keep this module free of application imports: even module evaluation can take
// longer than the hosting platform's port-open deadline on a cold machine.
export async function startServer(options: {
  listen: ListenOptions;
  load: (server: Server) => Promise<RequestListener>;
  onFailure: (error: unknown) => void;
  timeoutMs?: number;
}) {
  const started = performance.now();
  let handler: RequestListener | undefined;
  let failed = false;
  const server = createServer((req, res) => {
    const path = req.url?.split('?')[0];
    if (path === '/api/health/live' && !failed) {
      // Once ready, use the application's instrumented liveness route.
      if (handler) return handler(req, res);
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end('{"status":"ok"}');
      return;
    }
    if (path === '/api/health/ready' || !handler || failed) {
      const ready = !!handler && !failed;
      res.writeHead(ready ? 200 : 503, {
        'Content-Type': 'application/json', 'Cache-Control': 'no-store',
        ...(!ready ? { 'Retry-After': '5' } : {}),
      });
      res.end(JSON.stringify({ status: ready ? 'ready' : failed ? 'failed' : 'starting' }));
      return;
    }
    handler(req, res);
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(options.listen, () => { server.removeListener('error', reject); resolve(); });
  });
  console.log(JSON.stringify({ event: 'startup_listening', durationMs: Math.round(performance.now() - started) }));
  const fail = (error: unknown) => {
    if (failed) return;
    failed = true;
    console.error(JSON.stringify({ event: 'startup_failed', durationMs: Math.round(performance.now() - started) }));
    options.onFailure(error);
  };
  const timeoutMs = options.timeoutMs ?? 120_000;
  const deadline = setTimeout(() => fail(new Error(`Application startup exceeded ${timeoutMs} ms`)), timeoutMs);
  const ready = Promise.resolve().then(() => options.load(server)).then(app => {
    if (failed) return;
    handler = app;
    console.log(JSON.stringify({ event: 'startup_ready', durationMs: Math.round(performance.now() - started) }));
  }, fail).finally(() => clearTimeout(deadline));
  return { server, ready };
}
