import assert from 'node:assert/strict';
import test from 'node:test';
import { filterAllowedGames, isBlockedGameTitle } from '../server/services/game-catalog-policy';

test('blocks non-game API categories regardless of casing', () => {
  for (const title of ['Non-gaming', 'NON-GAMING', 'Social Media', 'Slots', 'DJs', 'Always On']) {
    assert.equal(isBlockedGameTitle(title), true, title);
  }
});

test('blocks titles with unambiguous explicit-storefront markers', () => {
  for (const title of ['Hentai Clicker: Lily is streaming', 'Example XXX Game', 'NSFW Puzzle', 'Adult Only']) {
    assert.equal(isBlockedGameTitle(title), true, title);
  }
});

test('blocks exact provider-noise titles without broad substring matching', () => {
  assert.equal(isBlockedGameTitle('# Project Myriam - Life and Explorations'), true);
  assert.equal(isBlockedGameTitle('svg'), true);
  assert.equal(isBlockedGameTitle('SVG Racer'), false);
});

test('does not block legitimate games containing ambiguous mature themes', () => {
  for (const title of ['The Witcher 3: Wild Hunt', 'Cyberpunk 2077', 'Boyfriend Dungeon', 'Onechanbara: Bikini Samurai Squad']) {
    assert.equal(isBlockedGameTitle(title), false, title);
  }
});

test('filters a mixed API response without changing allowed entries', () => {
  const games = [{ name: 'Minecraft', id: 1 }, { name: 'Just Chatting', id: 2 }];
  assert.deepEqual(filterAllowedGames(games), [{ name: 'Minecraft', id: 1 }]);
});
