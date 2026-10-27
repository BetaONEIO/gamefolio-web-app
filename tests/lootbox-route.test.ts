import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('reserves /lootbox before the username catch-all and opens the dialog', async () => {
  const source = await readFile(new URL('../client/src/App.tsx', import.meta.url), 'utf8');
  const lootboxRoute = source.indexOf('path="/lootbox"');
  const usernameRoute = source.indexOf('path="/:username"');
  assert.ok(lootboxRoute >= 0, 'expected an explicit /lootbox route');
  assert.ok(usernameRoute > lootboxRoute, 'expected /lootbox before /:username');
  assert.match(source, /dispatchEvent\(new Event\('open-lootbox'\)\)/);
});
