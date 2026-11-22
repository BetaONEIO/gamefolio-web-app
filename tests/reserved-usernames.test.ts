import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { isReservedUsername } from '../shared/reserved-usernames';

test('reserves application routes as profile names case-insensitively', () => {
  assert.equal(isReservedUsername('lootbox'), true);
  assert.equal(isReservedUsername('LootBox'), true);
  assert.equal(isReservedUsername(' lootbox '), true);
  assert.equal(isReservedUsername('user'), true);
  assert.equal(isReservedUsername('Admin'), true);
  assert.equal(isReservedUsername('settings'), true);
  assert.equal(isReservedUsername('api'), true);
  assert.equal(isReservedUsername('lootboxer'), false);
  assert.equal(isReservedUsername('ordinary-player'), false);
});

test('rejects reserved usernames across profile and admin update paths', async () => {
  const routesSource = await readFile(new URL('../server/routes.ts', import.meta.url), 'utf8');
  const profileUpdate = routesSource.indexOf('app.patch("/api/users/:id"');
  const safeProfileBody = routesSource.indexOf('const safeBody = Object.fromEntries(', profileUpdate);
  const profileReservedGuard = routesSource.indexOf(
    'isReservedUsername(safeBody.username)',
    safeProfileBody,
  );
  const profileWrite = routesSource.indexOf('storage.updateUser(userId, safeBody)', safeProfileBody);

  assert.ok(profileUpdate >= 0, 'expected the profile update route');
  assert.ok(profileReservedGuard > safeProfileBody, 'expected a reserved-name profile guard');
  assert.ok(profileReservedGuard < profileWrite, 'expected the profile guard before the database write');

  const legacyCheck = routesSource.indexOf('app.get("/api/check-username/:username"');
  const legacyReservedGuard = routesSource.indexOf('isReservedUsername(username)', legacyCheck);
  const legacyLookup = routesSource.indexOf('storage.getUserByUsername(username)', legacyCheck);

  assert.ok(legacyCheck >= 0, 'expected the legacy username availability route');
  assert.ok(legacyReservedGuard > legacyCheck, 'expected the legacy route to reject reserved names');
  assert.ok(legacyReservedGuard < legacyLookup, 'expected the legacy guard before availability lookup');

  const adminSource = await readFile(new URL('../server/routes/admin.ts', import.meta.url), 'utf8');
  const adminUpdate = adminSource.indexOf('adminRouter.patch("/users/:id"');
  const adminReservedGuard = adminSource.indexOf('isReservedUsername(req.body.username)', adminUpdate);
  const adminWrite = adminSource.indexOf('storage.updateUser(userId, req.body)', adminUpdate);

  assert.ok(adminUpdate >= 0, 'expected the admin user update route');
  assert.ok(adminReservedGuard > adminUpdate, 'expected a reserved-name admin guard');
  assert.ok(adminReservedGuard < adminWrite, 'expected the admin guard before the database write');
});
