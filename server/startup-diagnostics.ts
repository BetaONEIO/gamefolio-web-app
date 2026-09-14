import { readFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import type { Profiler } from 'node:inspector';

const round = (n: number) => Math.round(n * 100) / 100;
function counters(path: string, names: string[]): Record<string, number> | null {
  try {
    const text = readFileSync(path, 'utf8');
    const result: Record<string, number> = {};
    for (const name of names) {
      const match = text.match(new RegExp(`^${name}:?\\s+(\\d+)$`, 'm'));
      if (match) result[name] = Number(match[1]);
    }
    return Object.keys(result).length ? result : null;
  } catch { return null; }
}
function snapshot() {
  return {
    wall: performance.now(), cpu: process.cpuUsage(), memory: process.memoryUsage(),
    resource: process.resourceUsage(), loop: performance.eventLoopUtilization(),
    io: counters('/proc/self/io', ['rchar', 'syscr', 'read_bytes']),
    cgroup: counters('/sys/fs/cgroup/cpu.stat', ['usage_usec', 'nr_periods', 'nr_throttled', 'throttled_usec']),
  };
}
function delta(before: Record<string, number> | null, after: Record<string, number> | null) {
  if (!before || !after) return null;
  return Object.fromEntries(Object.keys(before).filter(key => key in after).map(key => [key, after[key] - before[key]]));
}

// Never emit raw profile frames: URLs, source locations and function names can
// contain sensitive values. Only package names and fixed runtime categories pass.
export function profileGroup(url: string, functionName: string): string {
  const dependency = url.split('/node_modules/').at(-1);
  if (dependency !== url) {
    const match = dependency?.match(/^(@[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+|[a-zA-Z0-9_.-]+)(?:\/|$)/);
    if (match) return `package:${match[1]}`;
  }
  if (/^node:[a-zA-Z0-9_./-]+$/.test(url)) return url;
  if (functionName === '(idle)') return 'idle';
  if (functionName === '(garbage collector)') return 'garbage-collection';
  if (functionName === '(program)') return 'native-or-unattributed';
  return 'application-or-unattributed';
}
export function summarizeProfile(profile: Profiler.Profile) {
  const nodes = new Map(profile.nodes.map(node => [node.id, node]));
  const groups = new Map<string, number>();
  const samples = profile.samples ?? [];
  const durations = profile.timeDeltas ?? [];
  for (let i = 0; i < samples.length; i++) {
    const frame = nodes.get(samples[i])?.callFrame;
    const group = frame ? profileGroup(frame.url, frame.functionName) : 'application-or-unattributed';
    groups.set(group, (groups.get(group) ?? 0) + (durations[i] ?? 0));
  }
  return {
    samples: samples.length,
    sampledMs: round(durations.reduce((a, b) => a + b, 0) / 1000),
    top: Array.from(groups).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([group, us]) => ({ group, sampledMs: round(us / 1000) })),
  };
}

export async function profileStartupImports<T>(load: () => Promise<T>, options: {
  emit?: (event: Record<string, unknown>) => void;
  maxDurationMs?: number;
} = {}): Promise<T> {
  const emit = (event: Record<string, unknown>) => {
    try { (options.emit ?? (event => console.log(JSON.stringify(event))))(event); } catch { /* diagnostics cannot break startup */ }
  };
  let session: import('node:inspector/promises').Session | undefined;
  let profiling = false;
  try {
    const { Session } = await import('node:inspector/promises');
    session = new Session();
    session.connect(); // In-process session only; no debugger port is opened.
    await session.post('Profiler.enable');
    await session.post('Profiler.setSamplingInterval', { interval: 10_000 });
    await session.post('Profiler.start');
    profiling = true;
  } catch {
    try { session?.disconnect(); } catch { /* optional profiler */ }
    session = undefined;
  }
  let before: ReturnType<typeof snapshot>;
  try { before = snapshot(); } catch {
    try { session?.disconnect(); } catch { /* optional diagnostics */ }
    emit({ event: 'startup_diagnostics_unavailable', version: 1 });
    return load();
  }
  emit({ event: 'startup_diagnostics_begin', version: 1, node: process.version, profiler: profiling, samplingIntervalUs: 10_000 });
  let finished: Promise<void> | undefined;
  const finish = (outcome: string) => finished ??= (async () => {
    try {
      const after = snapshot();
      const loop = performance.eventLoopUtilization(after.loop, before.loop);
      let profile: ReturnType<typeof summarizeProfile> | null = null;
      if (profiling && session) {
        try { profile = summarizeProfile((await session.post('Profiler.stop')).profile); } catch { /* retain resource metrics */ }
      }
      emit({
        event: 'startup_diagnostics', version: 1, outcome,
        wallMs: round(after.wall - before.wall),
        cpuUserMs: round((after.cpu.user - before.cpu.user) / 1000),
        cpuSystemMs: round((after.cpu.system - before.cpu.system) / 1000),
        eventLoopActiveMs: round(loop.active), eventLoopIdleMs: round(loop.idle),
        rssBeforeMiB: round(before.memory.rss / 1048576), rssAfterMiB: round(after.memory.rss / 1048576),
        heapAfterMiB: round(after.memory.heapUsed / 1048576),
        minorFaults: after.resource.minorPageFault - before.resource.minorPageFault,
        majorFaults: after.resource.majorPageFault - before.resource.majorPageFault,
        voluntaryContextSwitches: after.resource.voluntaryContextSwitches - before.resource.voluntaryContextSwitches,
        involuntaryContextSwitches: after.resource.involuntaryContextSwitches - before.resource.involuntaryContextSwitches,
        processIoDelta: delta(before.io, after.io), cgroupCpuDelta: delta(before.cgroup, after.cgroup),
        mainThreadProfile: profile,
      });
    } catch { emit({ event: 'startup_diagnostics_unavailable', version: 1 }); }
    finally { try { session?.disconnect(); } catch { /* cleanup is best effort */ } }
  })();
  const timer = setTimeout(() => { void finish('diagnostic-deadline'); }, options.maxDurationMs ?? 90_000);
  timer.unref();
  let outcome = 'failed';
  try {
    const result = await load();
    outcome = 'loaded';
    return result;
  } finally {
    clearTimeout(timer);
    await finish(outcome);
  }
}
