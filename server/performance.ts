import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import { monitorEventLoopDelay, performance } from 'node:perf_hooks';
import type { RequestHandler } from 'express';
type Stage = { count: number; durationMs: number; failures: number; active: number };
type Timing = { requestId: string; stages: Record<string, Stage>; closed: boolean };
const timings = new AsyncLocalStorage<Timing>();
const elapsed = (start: number) => Math.round((performance.now() - start) * 100) / 100;
/** Only static operation names: never URLs, SQL, identifiers or user input. */
export function startStage(name: string): (failed?: boolean) => void {
  const context = timings.getStore();
  if (!context || context.closed) return () => {};
  if (!context.stages[name] && Object.keys(context.stages).length >= 32) return () => {};
  const stage = context.stages[name] ??= { count: 0, durationMs: 0, failures: 0, active: 0 };
  stage.active++;
  const start = performance.now();
  let ended = false;
  return (failed = false) => {
    if (ended) return;
    ended = true;
    stage.active--; stage.count++; stage.durationMs += elapsed(start);
    if (failed) stage.failures++;
  };
}
export async function measureStage<T>(name: string, work: () => T | PromiseLike<T>): Promise<T> {
  const end = startStage(name);
  try { const result = await work(); end(); return result; }
  catch (error) { end(true); throw error; }
}
export function timedMiddleware(name: string, middleware: RequestHandler): RequestHandler {
  return (req, res, next) => {
    const end = startStage(name);
    try { middleware(req, res, (error?: unknown) => { end(Boolean(error)); next(error); }); }
    catch (error) { end(true); next(error); }
  };
}
export type PerformanceEvent = {
  event: 'request_slow' | 'request_complete' | 'request_aborted';
  requestId: string; method: string; route: string; status: number;
  durationMs: number; stages: Record<string, Stage>;
};
function earlyRoute(path: string): string {
  if (path === '/api/user' || path === '/api/auth/google') return path;
  if (/^\/api\/user\/[^/]+\/daily-activity$/.test(path)) return '/api/user/:userId/daily-activity';
  if (/^\/api\/users\/[^/]+\/clips$/.test(path)) return '/api/users/:username/clips';
  if (/^\/api\/social-preview\/[^/]+$/.test(path)) return '/api/social-preview/:username';
  return '/api/*';
}
export function performanceMiddleware(options: {
  slowMs?: number; stalledMs?: number; sampleRate?: number;
  emit?: (event: PerformanceEvent) => void;
  onSlow?: (event: PerformanceEvent) => void;
} = {}): RequestHandler {
  const slowMs = options.slowMs ?? 2000;
  const stalledMs = options.stalledMs ?? 10000;
  const emit = options.emit ?? (event => console.log(JSON.stringify(event)));
  return (req, res, next) => {
    if (!req.path.startsWith('/api/')) return next();
    const context: Timing = { requestId: randomUUID(), stages: {}, closed: false };
    const start = performance.now();
    res.setHeader('X-Request-ID', context.requestId);
    let alerted = false;
    const report = (event: PerformanceEvent['event']) => {
      const record: PerformanceEvent = {
        event, requestId: context.requestId, method: req.method,
        route: typeof req.route?.path === 'string' ? req.route.path : earlyRoute(req.path),
        status: event === 'request_complete' ? res.statusCode : 0,
        durationMs: elapsed(start),
        stages: Object.fromEntries(Object.entries(context.stages).map(([key, value]) => [key, { ...value }])),
      };
      // Diagnostics must never interrupt a response, even if a reporter fails.
      try { emit(record); } catch { /* best effort */ }
      if (!alerted && (event === "request_slow" || record.durationMs >= stalledMs)) {
        alerted = true;
        try { options.onSlow?.(record); } catch { /* best effort */ }
      }
    };
    const timer = setTimeout(() => report('request_slow'), stalledMs);
    timer.unref();
    const complete = (aborted: boolean) => {
      if (context.closed) return;
      context.closed = true; clearTimeout(timer);
      if (aborted || elapsed(start) >= slowMs || res.statusCode >= 500 ||
          Math.random() < (options.sampleRate ?? 0.01)) {
        report(aborted ? 'request_aborted' : 'request_complete');
      }
    };
    res.once('finish', () => complete(false));
    res.once('close', () => complete(!res.writableFinished));
    timings.run(context, next);
  };
}
export function startRuntimeMetrics(): () => void {
  const delay = monitorEventLoopDelay({ resolution: 20 }); delay.enable();
  let previous = performance.eventLoopUtilization();
  const timer = setInterval(() => {
    const current = performance.eventLoopUtilization();
    const utilization = performance.eventLoopUtilization(current, previous); previous = current;
    const { rss, heapUsed, heapTotal } = process.memoryUsage();
    console.log(JSON.stringify({ event: 'runtime_performance', rss, heapUsed, heapTotal,
      eventLoopUtilization: utilization.utilization,
      eventLoopP99Ms: delay.percentile(99) / 1e6, eventLoopMaxMs: delay.max / 1e6 }));
    delay.reset();
  }, 60000);
  timer.unref();
  return () => { clearInterval(timer); delay.disable(); };
}
