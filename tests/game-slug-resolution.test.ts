import assert from 'node:assert/strict';
import test from 'node:test';
import { findGameBySlug, resolveGameBySlug } from '../server/services/game-slug-resolution';
import { publicGameBountyPath, publicGamePath, toGameSlug } from '../shared/game-routes';

interface Game {
  id: number;
  name: string;
  isApproved: boolean;
  isUserAdded: boolean;
  twitchId: string | null;
  imageUrl?: string;
}

const game = (id: number, name: string, overrides: Partial<Game> = {}): Game => ({
  id, name, isApproved: true, isUserAdded: false, twitchId: null, ...overrides,
});
const providerGame = (id: string, name: string) => ({
  id, name, box_art_url: `https://covers.example/${id}-{width}x{height}.jpg`,
});

function fixture(local: Game[] = [], remote: ReturnType<typeof providerGame>[] = []) {
  const searches: string[] = [];
  const creations: Array<{ name: string; imageUrl: string; twitchId: string }> = [];
  const dependencies = {
    async getAllGames() { return local; },
    async searchGames(query: string) { searches.push(query); return remote; },
    async createGame(data: typeof creations[number]) {
      creations.push(data);
      return game(9000, data.name, data);
    },
  };
  return { dependencies, searches, creations };
}

test('audited game links select the established approved catalogue record in either input order', () => {
  const cases: Array<{ slug: string; expected: Game; duplicates: Game[] }> = [
    {
      slug: 'fortnite', expected: game(2, 'Fortnite', { twitchId: '33214' }),
      duplicates: [game(7641, 'fortnite', { isApproved: false, isUserAdded: true }), game(1236, 'Fortnite?')],
    },
    {
      slug: 'delta-force', expected: game(270, 'Delta Force'),
      duplicates: [game(545, 'Delta force', { isUserAdded: true })],
    },
    {
      slug: 'marvel-rivals', expected: game(80, 'Marvel Rivals'),
      duplicates: [game(7647, 'marvel rivals', { isApproved: false, isUserAdded: true })],
    },
    {
      slug: 'rocket-league', expected: game(12, 'Rocket League', { twitchId: '30921' }),
      duplicates: [game(7653, 'Rocket league', { isApproved: false, isUserAdded: true })],
    },
    {
      slug: 'dead-by-daylight', expected: game(132, 'Dead by Daylight'),
      duplicates: [game(650, 'dead by daylight', { isApproved: false, isUserAdded: true })],
    },
    {
      slug: 'meccha-chameleon', expected: game(409, 'MECCHA CHAMELEON'),
      duplicates: [game(3264, 'meccha chameleon', { isUserAdded: true })],
    },
    {
      slug: 'battlefield-6', expected: game(192, 'Battlefield 6', { twitchId: '168648543' }),
      duplicates: [game(153, 'BATTLEFIELD 6')],
    },
  ];
  for (const { slug, expected, duplicates } of cases) {
    const input = [...duplicates, expected];
    for (const ordered of [input, [...input].reverse()]) {
      assert.deepEqual(findGameBySlug(ordered, slug), { status: 'found', game: expected }, slug);
    }
  }
});

test('identical metadata uses a stable catalogue ID without mutating the input', () => {
  const older = game(15, 'Some Game');
  const newer = game(90, 'SOME GAME');
  const input = [newer, older];
  assert.deepEqual(findGameBySlug(input, 'some-game'), { status: 'found', game: older });
  assert.deepEqual(input, [newer, older]);
  assert.deepEqual(findGameBySlug([...input].reverse(), 'some-game'), { status: 'found', game: older });
});

test('different provider identities sharing one public URL retain the existing catalogue selection', () => {
  const current = game(451, 'Star Wars Battlefront II', { twitchId: '492546' });
  const differentRelease = game(321, 'Star Wars: Battlefront II', { twitchId: '6490' });
  assert.deepEqual(findGameBySlug([current, differentRelease], 'star-wars-battlefront-ii'), {
    status: 'found', game: current,
  });
});

test('duplicate records for the same provider identity use the stable oldest catalogue ID', () => {
  const original = game(12, 'Rocket League', { twitchId: '30921' });
  const duplicate = game(777, 'ROCKET LEAGUE', { twitchId: '30921' });
  assert.deepEqual(findGameBySlug([duplicate, original], 'rocket-league'), { status: 'found', game: original });
});

test('a custom entry cannot displace an established catalogue row by claiming a provider ID', () => {
  const existing = game(200, 'Some Game');
  const custom = game(1, 'some game', { isUserAdded: true, twitchId: '123' });
  assert.deepEqual(findGameBySlug([custom, existing], 'some-game'), { status: 'found', game: existing });
});

test('legitimate approved custom games remain accessible', () => {
  const indie = game(500, 'Our Indie Game', { isUserAdded: true });
  assert.deepEqual(findGameBySlug([indie], 'our-indie-game'), { status: 'found', game: indie });
});

test('punctuation-distinct public paths resolve to their own game despite competing provider metadata', () => {
  const dotted = game(4035, 'V.O.I.D');
  const plain = game(4032, 'Void.', { twitchId: '999' });
  const retro = game(387, 'Retro', { twitchId: '888' });
  const retroDotted = game(1895, 'R.E.T.R.O');
  const input = [plain, dotted, retro, retroDotted];
  for (const expected of input) {
    const slug = publicGamePath(expected.name).slice('/games/'.length);
    assert.deepEqual(findGameBySlug(input, slug), { status: 'found', game: expected }, expected.name);
  }
  assert.notEqual(toGameSlug(dotted.name), toGameSlug(plain.name));
  assert.notEqual(toGameSlug(retro.name), toGameSlug(retroDotted.name));
});

test('shared game route generation preserves bounty query parameters and existing URLs', () => {
  assert.equal(publicGamePath('V.O.I.D'), '/games/v-o-i-d');
  assert.equal(publicGamePath('Void.'), '/games/void');
  assert.equal(publicGameBountyPath('V.O.I.D', 123), '/games/v-o-i-d?tab=bounties&campaign=123');
  assert.equal(publicGameBountyPath('Grand Theft Auto V', 456), '/games/grand-theft-auto-v?tab=bounties&campaign=456');
});

test('legacy compact links resolve only when all matching names share one current slug', () => {
  const expected = game(12, 'Rocket League', { twitchId: '30921' });
  const duplicate = game(100, 'rocket league', { isUserAdded: true });
  assert.deepEqual(findGameBySlug([duplicate, expected], 'rocketleague'), { status: 'found', game: expected });
  assert.deepEqual(findGameBySlug([game(4035, 'V.O.I.D'), game(4032, 'Void.')], 'v-oid'), { status: 'unavailable' });
});

test('known rejected exact paths cannot fall through to another punctuation-distinct title', () => {
  const rejected = game(4035, 'V.O.I.D', { isApproved: false });
  const approved = game(4032, 'Void.', { twitchId: '999' });
  assert.deepEqual(findGameBySlug([approved, rejected], 'v-o-i-d'), { status: 'unavailable' });
});

test('missing titles are distinguished from invalid or rejected paths', () => {
  assert.deepEqual(findGameBySlug([game(1, 'Fortnite')], 'new-game'), { status: 'missing' });
  for (const slug of ['', '---', '!!!']) {
    assert.deepEqual(findGameBySlug([], slug), { status: 'unavailable' }, slug);
  }
  assert.deepEqual(findGameBySlug([game(2, 'Hidden Game', { isApproved: false })], 'hidden-game'), { status: 'unavailable' });
});

test('resolving an existing duplicate group never searches or creates provider records', async () => {
  const expected = game(270, 'Delta Force');
  const f = fixture([game(545, 'Delta force', { isUserAdded: true }), expected]);
  assert.equal(await resolveGameBySlug('delta-force', f.dependencies), expected);
  assert.deepEqual(f.searches, []);
  assert.deepEqual(f.creations, []);
});

test('rejected and ambiguous local matches cannot be recreated through provider fallback', async () => {
  for (const [slug, local] of [
    ['hidden-game', [game(1, 'Hidden Game', { isApproved: false })]],
    ['v-oid', [game(4035, 'V.O.I.D'), game(4032, 'Void.')]],
  ] as const) {
    const f = fixture([...local], [providerGame('123', slug.replaceAll('-', ' '))]);
    assert.equal(await resolveGameBySlug(slug, f.dependencies), null);
    assert.deepEqual(f.searches, [], slug);
    assert.deepEqual(f.creations, [], slug);
  }
});

test('provider fallback selects the exact generated slug instead of the first search result', async () => {
  const f = fixture([], [providerGame('111', 'New Game: DLC'), providerGame('222', 'New Game')]);
  const result = await resolveGameBySlug('new-game', f.dependencies);
  assert.equal(result?.name, 'New Game');
  assert.equal(result?.twitchId, '222');
  assert.deepEqual(f.searches, ['new game']);
  assert.deepEqual(f.creations, [{ name: 'New Game', twitchId: '222', imageUrl: 'https://covers.example/222-600x800.jpg' }]);
});

test('unrelated or merely compact-matching provider results cannot create the requested page', async () => {
  for (const [slug, remote] of [
    ['new-game', [providerGame('111', 'New Game: DLC')]],
    ['v-o-i-d', [providerGame('222', 'Void')]],
    ['new-game', []],
  ] as const) {
    const f = fixture([], [...remote]);
    assert.equal(await resolveGameBySlug(slug, f.dependencies), null);
    assert.deepEqual(f.creations, [], slug);
  }
});

test('a provider match reuses its existing catalogue ID even after a title change', async () => {
  const existing = game(45, 'Previous Title', { twitchId: '222' });
  const f = fixture([existing], [providerGame('222', 'New Title')]);
  assert.equal(await resolveGameBySlug('new-title', f.dependencies), existing);
  assert.deepEqual(f.creations, []);
});

test('provider identity cannot recreate or publish a previously rejected catalogue record', async () => {
  const existing = game(45, 'Previous Title', { twitchId: '222', isApproved: false });
  const f = fixture([existing], [providerGame('222', 'New Title')]);
  assert.equal(await resolveGameBySlug('new-title', f.dependencies), null);
  assert.deepEqual(f.creations, []);
});
