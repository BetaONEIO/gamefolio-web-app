import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

test('production application imports exclude the development toolchain', async () => {
  const result = await build({
    entryPoints: ['server/bootstrap.ts'], platform: 'node', packages: 'external',
    bundle: true, format: 'esm', splitting: true, outdir: 'dist',
    entryNames: 'index', metafile: true, write: false,
  });
  const outputs = result.metafile!.outputs;
  const app = Object.keys(outputs).find(path => outputs[path].entryPoint === 'server/index.ts');
  assert.ok(app, 'application remains a separate lazy bootstrap entry');
  const visited = new Set<string>();
  const external = new Set<string>();
  function visit(path: string) {
    if (visited.has(path)) return;
    visited.add(path);
    assert.ok(outputs[path], `missing output ${path}`);
    for (const dependency of outputs[path].imports) {
      if (dependency.kind === 'dynamic-import') continue;
      if (dependency.external) external.add(dependency.path);
      else visit(dependency.path);
    }
  }
  visit('dist/index.js');
  visit(app);
  assert.ok(external.has('express'), 'walk reaches actual application dependencies');
  assert.ok(![...external].some(name => name === 'vite' || name.startsWith('@vitejs/') || name.startsWith('@replit/vite-plugin-')),
    `development tooling in static graph: ${[...external].filter(name => name.includes('vite'))}`);
  assert.ok(Object.values(outputs).some(output => output.entryPoint === 'vite.config.ts'),
    'development configuration remains available as a lazy output');
});
