import assert from 'node:assert/strict';
import test from 'node:test';
import { isReservedUsername } from '../shared/reserved-usernames';

test('reserves the lootbox profile name case-insensitively', () => {
  assert.equal(isReservedUsername('lootbox'), true);
  assert.equal(isReservedUsername('LootBox'), true);
  assert.equal(isReservedUsername(' lootbox '), true);
  assert.equal(isReservedUsername('lootboxer'), false);
});
