import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import { monitorEventLoopDelay, performance } from 'node:perf_hooks';
import type { RequestHandler } from 'express';
type Stage = { count: number; durationMs: number; failures: number; active: number; activeMs: number };
type Timing = { requestId: string; stages: Record<string, Stage & { activeSince: number }>; closed: boolean };
const timings = new AsyncLocalStorage<Timing>();
const runtimeId = randomUUID();
const elapsed = (start: number) => Math.round((performance.now() - start) * 100) / 100;
/** Only static operation names: never URLs, SQL, identifiers or user input. */
export function startStage(name: string): (failed?: boolean) => void {
  const context = timings.getStore();
  if (!context || context.closed) return () => {};
  if (!context.stages[name] && Object.keys(context.stages).length >= 32) return () => {};
  const stage = context.stages[name] ??= { count: 0, durationMs: 0, failures: 0, active: 0, activeMs: 0, activeSince: 0 };
  if (stage.active === 0) stage.activeSince = performance.now();
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
    const finish = () => { cleanup(); end(!res.writableFinished); };
    const cleanup = () => { res.off('finish', finish); res.off('close', finish); };
    res.prependOnceListener('finish', finish); res.prependOnceListener('close', finish);
    const advance = (error?: unknown) => { cleanup(); end(Boolean(error)); next(error); };
    try {
      const result: unknown = middleware(req, res, advance);
      // Express 4 does not forward rejected async middleware automatically.
      if (result && typeof (result as Promise<unknown>).catch === 'function') {
        void (result as Promise<unknown>).catch(advance);
      }
    } catch (error) { advance(error); }
  };
}

const instrumentedStores = new WeakSet<object>();
/** Preserve the store instance, callback values, return values and receiver.
 * Never record session IDs, session contents, SQL or error messages. */
export function instrumentSessionStore<T extends object>(store: T): T {
  if (instrumentedStores.has(store)) return store;
  instrumentedStores.add(store);
  for (const method of ['get', 'set', 'touch', 'destroy'] as const) {
    const target = store as Record<string, any>;
    const original = target[method];
    if (typeof original !== 'function') continue;
    target[method] = function(this: unknown, ...args: any[]) {
      const callback = args[args.length - 1];
      // These methods use callbacks; don't change optional-callback semantics.
      if (typeof callback !== 'function') return original.apply(this, args);
      const end = startStage(`session.store.${method}`);
      args[args.length - 1] = function(this: unknown, ...values: any[]) {
        end(Boolean(values[0]));
        return callback.apply(this, values);
      };
      try { return original.apply(this, args); }
      catch (error) { end(true); throw error; }
    };
  }
  return store;
}
export type PerformanceEvent = {
  event: 'request_slow' | 'request_complete' | 'request_aborted';
  requestId: string; runtimeId: string; observedAt: string; method: string; route: string; status: number;
  durationMs: number; stages: Record<string, Stage>;
  // Process-wide activity during this request, including concurrent work.
  processWindow: { cpuUserMs: number; cpuSystemMs: number; eventLoopActiveMs: number;
    eventLoopIdleMs: number; eventLoopUtilization: number };
};
function earlyRoute(path: string): string {
  if (path === '/api/user' || path === '/api/auth/google') return path;
  if (/^\/api\/user\/[^/]+\/daily-activity$/.test(path)) return '/api/user/:userId/daily-activity';
  if (/^\/api\/users\/[^/]+\/clips$/.test(path)) return '/api/users/:username/clips';
  if (/^\/api\/social-preview\/[^/]+$/.test(path)) return '/api/social-preview/:username';
  return '/api/*';
}
export function performanceMiddleware(options: {
  slowMs?: number; stalledMs?: number; alertMs?: number; sampleRate?: number;
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
    const cpuStart = process.cpuUsage();
    const loopStart = performance.eventLoopUtilization();
    res.setHeader('X-Request-ID', context.requestId);
    let alerted = false;
    const report = (event: PerformanceEvent['event']) => {
      const cpu = process.cpuUsage(cpuStart);
      const loop = performance.eventLoopUtilization(loopStart);
      const record: PerformanceEvent = {
        event, requestId: context.requestId, runtimeId, observedAt: new Date().toISOString(), method: req.method,
        route: typeof req.route?.path === 'string' ? req.route.path : earlyRoute(req.path),
        status: event === 'request_complete' ? res.statusCode : 0,
        durationMs: elapsed(start),
        stages: Object.fromEntries(Object.entries(context.stages).map(([key, { activeSince, ...value }]) =>
          [key, { ...value, activeMs: value.active ? elapsed(activeSince) : 0 }])),
        processWindow: { cpuUserMs: cpu.user / 1000, cpuSystemMs: cpu.system / 1000,
          eventLoopActiveMs: loop.active, eventLoopIdleMs: loop.idle, eventLoopUtilization: loop.utilization },
      };
      // Diagnostics must never interrupt a response, even if a reporter fails.
      try { emit(record); } catch { /* best effort */ }
      if (!alerted && (event === "request_slow" || record.durationMs >= (options.alertMs ?? 5000))) {
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
    console.log(JSON.stringify({ event: 'runtime_performance', runtimeId, observedAt: new Date().toISOString(), rss, heapUsed, heapTotal,
      eventLoopUtilization: utilization.utilization,
      eventLoopP99Ms: delay.percentile(99) / 1e6, eventLoopMaxMs: delay.max / 1e6 }));
    delay.reset();
  }, 60000);
  timer.unref();
  return () => { clearInterval(timer); delay.disable(); };
}
