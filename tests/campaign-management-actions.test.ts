import test from 'node:test';
import assert from 'node:assert/strict';
import { sql } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import { loadIsolatedService } from './helpers/isolated-typescript';

const dialect = new PgDialect();

async function fixture({ paid = false, funded = false, slug = 'custom-campaign' } = {}) {
  const campaign = { id: 12, developer_user_id: 7, status: 'live', max_places: 2,
    commercial_type: paid ? 'paid' : null, requires_access_key: false,
    completion_reward_key_required: false, end_date: '2026-12-01T00:00:00.000Z' };
  const changes: { sql: string; params: any[] }[] = [];
  const database: any = {
    transaction: async (run: any) => run(database),
    execute: async (query: any) => {
      const compiled = dialect.sqlToQuery(query);
      if (compiled.sql.includes('FROM campaign_instances')) {
        assert.deepEqual(compiled.params, [12, 7], 'ownership must remain scoped to the requesting developer');
        assert.match(compiled.sql, /FOR UPDATE OF ci/);
        return compiled.sql.includes('JOIN campaign_templates')
          ? [{ ...campaign, template_slug: slug, template_category: slug.startsWith('custom-') ? 'custom' : 'standard' }]
          : [campaign];
      }
      if (compiled.sql.includes('FROM campaign_funding_allocations')) return funded ? [{ campaign_id: 12 }] : [];
      changes.push(compiled);
      return [];
    },
  };
  const routes = new Map<string, any>();
  const router = { use() {}, get() {}, patch() {}, delete() {}, post: (path: string, handler: any) => routes.set(path, handler) };
  const unexpected = () => { throw new Error('Unexpected external dependency'); };
  // These routes register unrelated handlers at module load. Stub their imports
  // so a management action can exercise the real router without network or DB.
  const unusedImports: Record<string, string[]> = {
    '../services/bounty-clip-ai-review': ['reviewBountyClip'],
    '../campaign-instance-objectives': ['mergeInstanceObjectives'],
    '../campaign-streamer-capacity': ['ensureStreamerCapacity', 'startStreamerCapacityPayment', 'fulfilStreamerCapacityPayment'],
    zod: ['z'],
    '@shared/game-content-library': ['libraryPublicationAllowed'],
    '../game-content-library': ['gameLibrary', 'ensureGameLibrary'],
    '../campaign-download-jobs': ['getCampaignDownload', 'prepareCampaignDownload'],
    '../notification-service': ['createAndPush'],
    '@shared/campaign-early-completion': ['canEndCampaignEarly'],
    '../campaign-developer-notifications': ['CAMPAIGN_EMAIL_CATEGORIES', 'campaignEmailEnabled'],
    '@shared/campaign-creator-progress': ['campaignCreatorProgress'],
    '@shared/campaign-thanks': ['validateCampaignThanks', 'canEditCampaignThanks'],
    '@shared/campaign-invite-eligibility': ['isEligibleCampaignInvitation'],
    '../stream-livestream-validation': ['getConnectedStreamChannels'],
    '../stripeClient': ['getUncachableStripeClient'],
    '@shared/campaign-presentation': ['isVisibleConfirmedCampaign', 'canDiscardCampaignSetup'],
    '../campaign-season-pool': ['seasonPoolSummary'],
    '@shared/season-definitions': ['SEASON_DEFS'],
    '../campaign-key-security': ['decryptCampaignKey'],
    '@shared/campaign-management': ['campaignMetrics', 'managedCampaignStatus'],
    '@shared/campaign-commercial-model': ['CAMPAIGN_COMMERCIAL_MODEL'],
    '@shared/campaign-workspace': ['validateWorkspaceChanges'],
  };
  await loadIsolatedService(new URL('../server/routes/campaign-management.ts', import.meta.url), {
    ...Object.fromEntries(Object.entries(unusedImports).map(([module, names]) => [module, Object.fromEntries(names.map(name => [name, unexpected]))])),
    express: { default: { Router: () => router } },
    '../db': { db: database },
    'drizzle-orm': { sql },
    '../campaign-management': {
      ensureCampaignManagement: async () => {},
      campaignRecords: async () => ({ campaign, participants: [], objectives: [] }),
      campaignEvent: async () => {}, reconcileCampaign: unexpected, cancellationAllowed: unexpected,
    },
  });
  const run = async (body: any) => {
    const response = { statusCode: 200, body: null as any, status(code: number) { this.statusCode = code; return this; }, json(body: any) { this.body = body; } };
    await routes.get('/instances/:id/manage')({ params: { id: '12' }, user: { id: 7 }, body }, response);
    return response;
  };
  return { run, changes };
}

test('extending a deadline binds an ISO timestamp supported by the database driver', async () => {
  const { run, changes } = await fixture();
  const response = await run({ action: 'extend', endDate: '2026-12-12T12:00:00+01:00' });
  assert.equal(response.statusCode, 200);
  assert.deepEqual(changes[0].params, ['2026-12-12T11:00:00.000Z', 12]);
});

test('a legacy custom campaign can increase places using its joined template identity', async () => {
  const { run, changes } = await fixture();
  const response = await run({ action: 'places', places: 3 });
  assert.equal(response.statusCode, 200, JSON.stringify(response.body));
  assert.equal(changes.length, 1);
  assert.match(changes[0].sql, /SET max_places=/);
  assert.deepEqual(changes[0].params, [3, 12]);
});

test('custom cash rewards cannot admit extra creators without additional funding', async () => {
  for (const options of [{ paid: true }, { funded: true }]) {
    const { run, changes } = await fixture(options);
    const response = await run({ action: 'places', places: 3 });
    assert.equal(response.statusCode, 409);
    assert.match(response.body.error, /quote to preserve creator rewards/);
    assert.equal(changes.length, 0);
  }
});

test('preset capacity remains protected from the legacy custom action', async () => {
  const { run, changes } = await fixture({ slug: 'content-boost' });
  const response = await run({ action: 'places', places: 3 });
  assert.equal(response.statusCode, 400);
  assert.equal(changes.length, 0);
});
