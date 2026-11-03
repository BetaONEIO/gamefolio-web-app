import assert from 'node:assert/strict';
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
