import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { builtinModules } from 'node:module';
import { serverBuildOptions } from '../scripts/server-build-options.mjs';

test('production application imports exclude the development toolchain', async () => {
  const result = await build({
    ...serverBuildOptions(), metafile: true, write: false,
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
  assert.ok([...external].every(name => name.startsWith('node:') || builtinModules.includes(name)),
    'bootstrap must not eagerly import application packages');
  visit(app);
  const inputs = Object.keys(result.metafile!.inputs);
  for (const packageName of ['express', 'viem', 'ethers', 'drizzle-orm', 'jsonwebtoken']) {
    assert.ok(inputs.some(path => path.includes(`node_modules/${packageName}/`)), `${packageName} is bundled`);
    assert.ok(!external.has(packageName), `${packageName} no longer requires filesystem resolution`);
  }
  assert.ok(!external.has('@huggingface/transformers'), 'transcription SDK stays off the eager graph');
  assert.ok(external.has('sharp'), 'native image package remains external for binary resolution');
  assert.ok(![...external].some(name => name === 'vite' || name.startsWith('@vitejs/') || name.startsWith('@replit/vite-plugin-')),
    `development tooling in static graph: ${[...external].filter(name => name.includes('vite'))}`);
  assert.ok(Object.values(outputs).some(output => output.entryPoint === 'vite.config.ts'),
    'development configuration remains available as a lazy output');
});
