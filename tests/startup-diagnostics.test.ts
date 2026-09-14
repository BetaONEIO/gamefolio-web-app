import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { url as inspectorUrl } from 'node:inspector';
import { profileGroup, profileStartupImports, summarizeProfile } from '../server/startup-diagnostics';

test('CPU summaries group dependencies without exposing raw paths or function names', () => {
  assert.equal(profileGroup('file:///private/secret/node_modules/@sentry/node/lib/a.js', 'privateUserValue'), 'package:@sentry/node');
  assert.equal(profileGroup('https://private.example/user?token=secret', 'privateUserValue'), 'application-or-unattributed');
  assert.equal(profileGroup('', 'readFileUtf8'), 'native:readFileUtf8');
  assert.equal(profileGroup('', 'spawnSync'), 'native:spawnSync');
  assert.equal(profileGroup('file:///private/source.ts', 'privateUserValue'), 'application-or-unattributed');
  const summary = summarizeProfile({ startTime: 0, endTime: 3000, nodes: [
    { id: 1, callFrame: { functionName: 'privateUserValue', scriptId: '1', url: 'file:///private/node_modules/express/index.js', lineNumber: 0, columnNumber: 0 } },
    { id: 2, callFrame: { functionName: '(idle)', scriptId: '0', url: '', lineNumber: 0, columnNumber: 0 } },
  ], samples: [1, 1, 2], timeDeltas: [1000, 1000, 1000] });
  assert.deepEqual(summary.top, [{ group: 'package:express', sampledMs: 2 }, { group: 'idle', sampledMs: 1 }]);
  assert.doesNotMatch(JSON.stringify(summary), /private/);
});

test('profiles actual work once, reports numeric resources and opens no debugger listener', async () => {
  const events: Record<string, any>[] = [];
  const listener = inspectorUrl();
  const value = await profileStartupImports(async () => {
    await readFile(new URL(import.meta.url));
    const until = performance.now() + 40;
    while (performance.now() < until) Math.sqrt(performance.now());
    return 123;
  }, { emit: event => events.push(event) });
  assert.equal(value, 123);
  assert.equal(inspectorUrl(), listener);
  const report = events.find(e => e.event === 'startup_diagnostics');
  assert.equal(report.outcome, 'loaded');
  assert.ok(report.wallMs >= 40);
  assert.ok(report.cpuUserMs > 0);
  assert.ok(report.rssAfterMiB > 0);
  assert.ok(report.mainThreadProfile.samples > 0);
  assert.equal(events.filter(e => e.event === 'startup_diagnostics').length, 1);
});

test('preserves import failure and allows a subsequent profiler session', async () => {
  const original = Error('private error contents');
  const events: Record<string, any>[] = [];
  await assert.rejects(profileStartupImports(async () => { throw original; }, { emit: e => events.push(e) }), e => e === original);
  assert.equal(events.find(e => e.event === 'startup_diagnostics').outcome, 'failed');
  assert.doesNotMatch(JSON.stringify(events), /private error contents/);
  await profileStartupImports(async () => 1, { emit: e => { if (e.event === 'startup_diagnostics_begin') assert.equal(e.profiler, true); } });
});

test('diagnostic deadline stops collection without timing out the import or emitting twice', async () => {
  const events: Record<string, any>[] = [];
  const value = await profileStartupImports(async () => {
    await new Promise(resolve => setTimeout(resolve, 60));
    return 'loaded later';
  }, { emit: e => events.push(e), maxDurationMs: 10 });
  assert.equal(value, 'loaded later');
  const reports = events.filter(e => e.event === 'startup_diagnostics');
  assert.equal(reports.length, 1);
  assert.equal(reports[0].outcome, 'diagnostic-deadline');
});

test('unavailable metrics and failing log sinks do not block application imports', async () => {
  const resource = mock.method(process, 'resourceUsage', () => { throw Error('unavailable'); });
  let called = 0;
  try {
    assert.equal(await profileStartupImports(async () => { called++; return 5; }, { emit: () => { throw Error('sink failed'); } }), 5);
    assert.equal(called, 1);
  } finally { resource.mock.restore(); }
});
