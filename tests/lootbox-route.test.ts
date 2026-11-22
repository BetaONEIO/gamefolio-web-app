import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('reserves /lootbox before the username catch-all and opens the dialog', async () => {
  const source = await readFile(new URL('../client/src/App.tsx', import.meta.url), 'utf8');
  const lootboxRoute = source.indexOf('path="/lootbox"');
  const usernameRoute = source.indexOf('path="/:username"');
  assert.ok(lootboxRoute >= 0, 'expected an explicit /lootbox route');
  assert.ok(usernameRoute > lootboxRoute, 'expected /lootbox before /:username');
  assert.match(source, /sessionStorage\.setItem\('pending_lootbox_open', '1'\)/);
  assert.match(source, /dispatchEvent\(new Event\('open-lootbox'\)\)/);
  const header = await readFile(new URL('../client/src/components/layout/Header.tsx', import.meta.url), 'utf8');
  assert.match(header, /sessionStorage\.getItem\('pending_lootbox_open'\)/);
  assert.match(header, /setLootboxOpen\(true\)/);
});

test('redirects reserved profile usernames to the canonical home route', async () => {
  const clientSource = await readFile(new URL('../client/src/App.tsx', import.meta.url), 'utf8');

  assert.match(
    clientSource,
    /isReservedUsername\(username\)\s*\?\s*<Redirect to="\/" \/>\s*:\s*<ProfilePage \/>/,
  );
  assert.match(
    clientSource,
    /<Route path="\/profile\/:username" component=\{UsernameProfileRoute\} \/>/,
  );

  const serverSource = await readFile(new URL('../server/index.ts', import.meta.url), 'utf8');
  const profileRoute = serverSource.indexOf("app.get('/profile/:username'");
  const reservedGuard = serverSource.indexOf('if (isReservedUsername(req.params.username))', profileRoute);
  const userAgentHandling = serverSource.indexOf("const userAgent = req.headers['user-agent']", profileRoute);

  assert.ok(profileRoute >= 0, 'expected the direct profile request handler');
  assert.ok(reservedGuard > profileRoute, 'expected a reserved-username guard in the profile handler');
  assert.ok(
    reservedGuard < userAgentHandling,
    'expected reserved usernames to redirect before social preview handling',
  );
  assert.match(
    serverSource.slice(reservedGuard, userAgentHandling),
    /return res\.redirect\(302, '\/'\)/,
  );
});
