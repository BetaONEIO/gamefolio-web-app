import assert from 'node:assert/strict';
import test from 'node:test';
import { createGameSearchPlan, gameSearchNameKey, gameSearchRank, rankGameSearchResults } from '../server/services/game-search';

test('recognised acronyms expand regardless of case and surrounding whitespace', () => {
  for (const [input, expected] of [
    ['GTA', 'Grand Theft Auto'], ['  gta  ', 'Grand Theft Auto'],
    ['RDR', 'Red Dead Redemption'], ['rDr', 'Red Dead Redemption'],
    ['COD', 'Call of Duty'], ['NFS', 'Need for Speed'],
    ['WoW', 'World of Warcraft'], ['LoL', 'League of Legends'],
  ]) {
    const plan = createGameSearchPlan(input);
    assert.equal(plan.providerQuery, expected, input);
    assert.equal(plan.preferredTerms[0], expected, input);
    assert.ok(plan.terms.includes(input.trim()), input);
  }
});

test('attached and spaced GTA sequels prefer Roman provider names and search both forms', () => {
  for (const input of ['GTA5', 'GTAV', 'GTA V', 'gta 5', 'GTA-5', 'GTA   V']) {
    const plan = createGameSearchPlan(input);
    assert.equal(plan.providerQuery, 'Grand Theft Auto V', input);
    assert.deepEqual(plan.preferredTerms, ['Grand Theft Auto V', 'Grand Theft Auto 5'], input);
  }
  for (const [input, roman, number] of [
    ['GTA4', 'IV', '4'], ['GTA 6', 'VI', '6'], ['GTA IX', 'IX', '9'], ['GTA10', 'X', '10'],
  ]) {
    assert.deepEqual(createGameSearchPlan(input).preferredTerms, [`Grand Theft Auto ${roman}`, `Grand Theft Auto ${number}`]);
  }
});

test('RDR sequel search preserves specificity with Arabic and Roman variants', () => {
  for (const input of ['RDR2', 'RDR 2', 'rdr II', 'RDRII']) {
    const plan = createGameSearchPlan(input);
    assert.equal(plan.providerQuery, 'Red Dead Redemption 2', input);
    assert.deepEqual(plan.preferredTerms, ['Red Dead Redemption 2', 'Red Dead Redemption II'], input);
  }
  assert.deepEqual(createGameSearchPlan('GTA V: Complete Edition').preferredTerms, [
    'Grand Theft Auto V: Complete Edition', 'Grand Theft Auto 5: Complete Edition',
  ]);
});

test('subtitle queries include colon and space title variants without dropping the subtitle', () => {
  for (const input of ['GTA Vice City', 'GTA: Vice City']) {
    assert.deepEqual(createGameSearchPlan(input).preferredTerms, ['Grand Theft Auto Vice City', 'Grand Theft Auto: Vice City']);
  }
  assert.equal(createGameSearchPlan('NFS Most Wanted').providerQuery, 'Need for Speed Most Wanted');
});

test('full titles and unrelated words are not rewritten as acronyms', () => {
  for (const query of ['Grand Theft Auto V', 'Red Dead Redemption 2', 'Fortnite', 'gtafoo', 'GTAVice', 'GTA5foo', 'wonder', 'lollipop', 'codex', 'AC']) {
    assert.deepEqual(createGameSearchPlan(query), { query, providerQuery: query, preferredTerms: [query], terms: [query] });
  }
  assert.equal(createGameSearchPlan('  Grand   Theft Auto V  ').providerQuery, 'Grand Theft Auto V');
  assert.deepEqual(createGameSearchPlan('  '), { query: '', providerQuery: '', preferredTerms: [], terms: [] });
});

test('franchise titles and direct sequels rank above substring noise and acronym-only clones', () => {
  const names = ['GTA V (George)', 'Grand Theft Auto V Clone', 'My Grand Theft Auto Mod', 'Grand Theft Automobile', 'Grand Theft Auto V', 'Grand Theft Auto', 'GTA'];
  const ranked = rankGameSearchResults(names.map((name) => ({ name })), createGameSearchPlan('GTA'));
  assert.deepEqual(ranked.map((game) => game.name), [
    'Grand Theft Auto', 'Grand Theft Auto V', 'Grand Theft Auto V Clone',
    'My Grand Theft Auto Mod', 'Grand Theft Automobile', 'GTA', 'GTA V (George)',
  ]);
  assert.deepEqual(['Red Dead Redemption', 'Red Dead Redemption 2', 'Solo Leveling: ARISE OVERDRIVE'].map((name) => gameSearchRank(name, createGameSearchPlan('RDR'))), [0, 1, 5]);
});

test('sequel results prefer either exact numeral spelling over other franchise games', () => {
  const names = ['Red Dead Redemption', 'Red Dead Redemption 2: Special Edition', 'Red Dead Redemption II', 'Red Dead Redemption 2'];
  assert.deepEqual(rankGameSearchResults(names.map((name) => ({ name })), createGameSearchPlan('RDR2')).map((game) => game.name), [
    'Red Dead Redemption II', 'Red Dead Redemption 2', 'Red Dead Redemption 2: Special Edition', 'Red Dead Redemption',
  ]);
});

test('deduplication preserves the first existing object and ID without conflating numeral records', () => {
  const first = { id: 4493, name: 'Red Dead Redemption 2', imageUrl: 'saved-artwork' };
  const roman = { id: 388, name: 'Red Dead Redemption II', imageUrl: 'other-artwork' };
  const input = [first, { id: 99, name: ' red  dead redemption 2 ', imageUrl: 'provider-artwork' }, roman];
  const snapshot = input.slice();
  const result = rankGameSearchResults(input, createGameSearchPlan('RDR2'));
  assert.deepEqual(result, [first, roman]);
  assert.equal(result[0], first);
  assert.equal(result[1], roman);
  assert.deepEqual(input, snapshot);
  assert.equal(gameSearchNameKey(' RED  DEAD\nREDEMPTION 2 '), 'red dead redemption 2');
});

test('normal searches keep exact and prefix results first with stable ordering within tiers', () => {
  const input = [{ name: 'My Fortnite Mod' }, { name: 'Fortnite Festival' }, { name: 'Fortnite' }, { name: 'Fortnite: Battle Royale' }];
  assert.deepEqual(rankGameSearchResults(input, createGameSearchPlan('Fortnite')).map((game) => game.name), [
    'Fortnite', 'Fortnite Festival', 'Fortnite: Battle Royale', 'My Fortnite Mod',
  ]);
});
