import assert from 'node:assert/strict';
import test from 'node:test';
import * as drizzle from 'drizzle-orm';
import { PgDialect, integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import * as gameSearch from '../server/services/game-search';
import * as gameSearchSql from '../server/services/game-search-sql';
import { loadIsolatedService } from './helpers/isolated-typescript';

const games = pgTable('games', {
  id: integer('id'),
  name: text('name').notNull(),
  imageUrl: text('image_url'),
  createdAt: timestamp('created_at'),
});
const dialect = new PgDialect();
const localGame = (id: number, name: string) => ({
  id, name, imageUrl: `/covers/${id}.jpg`, createdAt: new Date('2026-01-01'),
});
const providerGame = (id: number, name: string) => ({
  id, name, background_image: `https://provider.example/${id}.jpg`,
  released: '2025-01-01', platforms: [{ platform: { name: 'PC' } }],
});

async function fixture(options: {
  local?: ReturnType<typeof localGame>[];
  remote?: ReturnType<typeof providerGame>[];
  providerError?: Error;
  databaseError?: Error;
} = {}) {
  const requests: Array<{ url: string; params: Record<string, unknown> }> = [];
  const queries: Array<{
    filter?: ReturnType<PgDialect['sqlToQuery']>;
    order: ReturnType<PgDialect['sqlToQuery']>[];
    limit?: number;
    steps: string[];
  }> = [];
  const db = {
    select() {
      const query: typeof queries[number] = { order: [], steps: ['select'] };
      queries.push(query);
      const chain = {
        from(table: unknown) {
          assert.equal(table, games);
          query.steps.push('from');
          return chain;
        },
        where(filter: drizzle.SQL) {
          query.steps.push('where');
          query.filter = dialect.sqlToQuery(filter);
          return chain;
        },
        orderBy(...order: drizzle.SQLWrapper[]) {
          query.steps.push('orderBy');
          query.order = order.map(expression => dialect.sqlToQuery(expression.getSQL()));
          return chain;
        },
        async limit(limit: number) {
          query.steps.push('limit');
          query.limit = limit;
          if (options.databaseError) throw options.databaseError;
          return [...(options.local ?? [])];
        },
      };
      return chain;
    },
  };
  const module = await loadIsolatedService(
    new URL('../server/services/rawg-service.ts', import.meta.url),
    {
      axios: { default: {
        async get(url: string, config: { params: Record<string, unknown> }) {
          requests.push({ url, params: config.params });
          if (options.providerError) throw options.providerError;
          return { data: { results: options.remote ?? [] } };
        },
        isAxiosError: () => false,
      } },
      '@shared/schema': { games, Game: undefined },
      '../db': { db },
      'drizzle-orm': drizzle,
      './game-search': gameSearch,
      './game-search-sql': gameSearchSql,
    },
  );
  return { service: module.rawgService, requests, queries };
}

test('RAWG receives canonical franchise and sequel names for acronym searches', async () => {
  const { service, requests } = await fixture();
  for (const [input, expected] of [
    ['GTA', 'Grand Theft Auto'],
    [' gta5 ', 'Grand Theft Auto V'],
    ['GTAV', 'Grand Theft Auto V'],
    ['GTA V', 'Grand Theft Auto V'],
    ['RDR', 'Red Dead Redemption'],
    ['rdr2', 'Red Dead Redemption 2'],
    ['RDR 2', 'Red Dead Redemption 2'],
  ]) {
    await service.searchGames(input);
    assert.equal(requests.at(-1)?.params.search, expected, input);
  }
});

test('local acronym lookup expands titles and orders by relevance before the result limit', async () => {
  const { service, queries } = await fixture();
  await service.searchGames('GTA5');
  assert.equal(queries.length, 1);
  const query = queries[0];
  const values = query.filter!.params.map(String).join(' ').toLowerCase();
  assert.match(values, /grand theft auto/);
  assert.match(query.filter!.sql, /(?:ilike|lower\()/i);
  assert.ok(query.order.length > 0, 'local results must be ranked before limiting');
  assert.ok(query.steps.indexOf('orderBy') < query.steps.indexOf('limit'));
  assert.equal(query.limit, 10);
});

test('merged results rank canonical games ahead of literal acronym noise', async () => {
  const { service } = await fixture({
    local: [localGame(90, 'GTA Fangame')],
    remote: [providerGame(1, 'GTA 6 (leaked)'), providerGame(2, 'Grand Theft Auto V')],
  });
  const results = await service.searchGames('GTA');
  assert.equal(results[0].name, 'Grand Theft Auto V');
  assert.ok(results.some((game: { name: string }) => game.name === 'GTA Fangame'),
    'literal matches should remain available below canonical matches');
});

test('matching provider data enriches the existing game without replacing its ID or artwork', async () => {
  const local = localGame(4493, 'Red Dead Redemption 2');
  const { service } = await fixture({
    local: [local],
    remote: [providerGame(28, 'red dead redemption 2'), providerGame(28, 'red dead redemption 2')],
  });
  const results = await service.searchGames('RDR2');
  assert.equal(results.length, 1);
  assert.equal(results[0].id, local.id);
  assert.equal(results[0].name, local.name);
  assert.equal(results[0].imageUrl, local.imageUrl);
  assert.equal(results[0].createdAt, local.createdAt);
  assert.equal(results[0].released, '2025-01-01');
  assert.deepEqual(results[0].platforms, ['PC']);
});

test('provider failure returns the already-fetched acronym matches without another database query', async () => {
  const local = localGame(4493, 'Red Dead Redemption 2');
  const { service, queries, requests } = await fixture({
    local: [local], providerError: new Error('Provider unavailable'),
  });
  const results = await service.searchGames('rdr2');
  assert.deepEqual(results, [local]);
  assert.equal(queries.length, 1);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].params.search, 'Red Dead Redemption 2');
  assert.match(queries[0].filter!.params.map(String).join(' ').toLowerCase(), /red dead redemption/);
});

test('ordinary game titles retain their provider query and local identity', async () => {
  const local = localGame(12, 'Minecraft');
  const { service, requests } = await fixture({
    local: [local], remote: [providerGame(99, 'Minecraft')],
  });
  const results = await service.searchGames('Minecraft');
  assert.equal(requests[0].params.search, 'Minecraft');
  assert.equal(results.length, 1);
  assert.equal(results[0].id, local.id);
});

test('empty and one-character queries do not access the database or provider', async () => {
  const { service, queries, requests } = await fixture();
  for (const query of ['', '  ', 'g']) assert.deepEqual(await service.searchGames(query), []);
  assert.equal(queries.length, 0);
  assert.equal(requests.length, 0);
});

test('local database failures propagate so the route can apply its fallback', async () => {
  const failure = new Error('Database unavailable');
  const { service, queries, requests } = await fixture({ databaseError: failure });
  await assert.rejects(service.searchGames('GTA'), error => error === failure);
  assert.equal(queries.length, 1);
  assert.equal(requests.length, 0);
});
