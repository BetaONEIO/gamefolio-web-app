import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
import { sql } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import { isRegularBounty } from '../shared/bounty-submission-policy';
import { campaignCreatorProgress } from '../shared/campaign-creator-progress';
import { parseStreamCampaignConfig, validateStreamSubmission, getConnectedStreamChannels, streamSubmissionIdentities } from '../server/stream-livestream-validation';
import { hasRegularBountySubmission } from '../server/services/regular-bounty-submissions';

const source = readFileSync('server/routes/bounty-marketplace.ts', 'utf8');
const file = ts.createSourceFile('routes.ts', source, ts.ScriptTarget.Latest, true);
function handler(path: string, deps: Record<string, unknown>) {
  const statement = file.statements.find(node => ts.isExpressionStatement(node) && ts.isCallExpression(node.expression)
    && node.expression.expression.getText(file) === 'router.post' && node.expression.arguments[0].getText(file).includes(`'${path}'`)) as ts.ExpressionStatement;
  assert.ok(statement, path);
  const callback = (statement.expression as ts.CallExpression).arguments.at(-1)!;
  const compiled = ts.transpileModule(`const handler = ${callback.getText(file)};`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  return new Function(...Object.keys(deps), `${compiled};return handler;`)(...Object.values(deps));
}
function response() {
  return { statusCode: 200, headersSent: false, body: null as any,
    status(code: number) { this.statusCode = code; return this; },
    json(body: any) { this.headersSent = true; this.body = body; return this; } };
}
const dialect = new PgDialect();
function fixture(discovery = true, contentType = 'clip') {
  const participant = { id: 9, user_id: 7, status: 'in_progress', deadline: '2099-01-01', previous_month: false, joined_at: '2026-01-01', game_id: 4,
    template_id: 8, confirmed_terms: { model: discovery ? 'discovery-v2' : 'paid' }, stream_config: contentType === 'stream' ? {requiredMinutes: 60, maximumSessions: 1, requirePublicVod: true, allowedPlatforms:['twitch']} : null };
  const objective = { id: 3, template_id: 8, quantity: 1, content_type: contentType, campaign_game_id: 4 };
  const submissions: any[] = [];
  const media = new Map<number, any>();
  const mutations: string[] = [];
  const execute = async (query: any): Promise<any[]> => {
    const { sql: raw, params } = dialect.sqlToQuery(query);
    const text = raw.replace(/\s+/g, ' ').trim();
    if (text.includes('SELECT cp.id, cp.status, cp.deadline') || text.includes('SELECT cp.id, cp.user_id, cp.status, cp.deadline')) return [participant];
    if (text.includes('SELECT b.*, t.id AS template_id') || text.includes('SELECT * FROM campaign_template_bounties')) return [objective];
    if (text.includes('FROM clips') || text.includes('FROM screenshots')) return media.has(Number(params[0])) ? [media.get(Number(params[0]))] : [];
    if (text.includes('FROM users WHERE id')) return [{twitch_verified:true, twitch_user_id:'channel-7', twitch_channel_name:'creator'}];
    if (text.includes('pg_advisory_xact_lock')) return [];
    if (text.includes('SELECT id, content_url, content_data')) return submissions;
    if (text.includes('SELECT COUNT(*) AS qty FROM campaign_bounty_submissions')) return [{ qty: submissions.length }];
    if (text.includes('SELECT COUNT(*) AS count FROM campaign_bounty_submissions')) return [{ count: submissions.length }];
    if (text.includes('JOIN campaign_instances origin')) return submissions.filter(s => s.participant_id === params[1] && s.content_type === params[2]);
    if (text.startsWith('SELECT id, slot_index, status FROM campaign_bounty_submissions')) {
      return submissions.filter(s => s.id === params[0] && s.instance_id === params[1]
        && s.status === 'changes_requested' && !submissions.some(revision => revision.supersedes_submission_id === s.id));
    }
    if (text.includes('FROM generate_series')) return submissions.length ? [] : [{ slot_index: 0 }];
    if (text.includes('SELECT s.id FROM campaign_bounty_submissions s')) {
      return submissions.filter(s => [s.clip_id, s.reel_id, s.screenshot_id].includes(params[4]));
    }
    if (text.startsWith('INSERT INTO campaign_bounty_submissions')) {
      const columns = text.match(/campaign_bounty_submissions\s*\((.*?)\) VALUES/)![1].split(',').map(s => s.trim());
      const expressions = text.match(/ VALUES \((.*)\) RETURNING/)![1].split(',').map(s => s.trim());
      const row: any = { id: submissions.length + 1 };
      columns.forEach((column, index) => { const parameter = expressions[index].match(/^\$(\d+)/); row[column] = parameter ? params[Number(parameter[1]) - 1] : expressions[index] === '0' ? 0 : null; });
      submissions.push(row); mutations.push('insert'); return [row];
    }
    if (text.includes('AS mandatory_total')) return [{ mandatory_total: 1, mandatory_submitted: submissions.filter(s => s.status !== 'staged').length }];
    if (text.startsWith('UPDATE campaign_participants')) { participant.status = text.includes("SET status = 'submitted_for_review'") ? 'submitted_for_review' : String(params[0]); mutations.push('participant'); return [participant]; }
    if (text.startsWith('DELETE FROM campaign_feedback_drafts')) return [];
    if (text.startsWith('SELECT * FROM campaign_bounty_submissions')) return submissions;
    if (text.startsWith('UPDATE campaign_bounty_submissions')) { submissions.forEach(s => { s.status = 'under_review'; }); return submissions; }
    if (text.includes('SELECT COUNT(*) AS count FROM (')) return [{ count: submissions.filter(s => s.status === 'under_review').length }];
    throw new Error(`Unexpected SQL: ${text}`);
  };
  const deps = { db: { transaction: async (fn: any) => fn({ execute }), execute }, sql, toRows: (rows: any) => rows,
    rejectIndieDeveloperParticipation: () => false, isRegularBounty, hasRegularBountySubmission, mergeInstanceObjectives: (rows: any) => rows,
    getXPProfile: () => ({}), computeBountyXP: () => 0, parseStreamCampaignConfig, validateStreamSubmission, getConnectedStreamChannels, streamSubmissionIdentities, jsonValue: (raw:any) => typeof raw==='string'?JSON.parse(raw):raw };
  return { participant, objective, submissions, media, mutations,
    stage: handler('/my/:instanceId/stage/:bountyId', deps), finish: handler('/my/:instanceId/submit-package', deps) };
}
const req = (body: any) => ({ user: { id: 7 }, params: { instanceId: '2', bountyId: '3' }, body });

for (const type of ['clip', 'reel', 'screenshot', 'feedback', 'review']) {
  test(`regular bounty sends one ${type} straight to review and rejects another`, async () => {
    const f = fixture(true, type);
    for (const n of [1, 2]) f.media.set(n, { id: n, game_id: 4, video_type: type });
    const body = (n: number) => ['clip', 'reel', 'screenshot'].includes(type)
      ? { contentType: type, [`${type}Id`]: n, slotIndex: 99 }
      : { contentType: type, contentData: { text: `Contribution ${n}`, ...(type === 'review' ? { rating: 4 } : {}) }, slotIndex: 99 };
    const res = response(); await f.stage(req(body(1)), res);
    assert.equal(res.statusCode, 201, JSON.stringify(res.body));
    assert.equal(res.body.submission.status, 'under_review');
    assert.equal(res.body.submission.slot_index, 0);
    assert.equal(res.body.submission.xp_awarded, 0);
    if (type === 'review') assert.deepEqual(JSON.parse(res.body.submission.content_data), { text: 'Contribution 1', rating: 4 });
    assert.equal(f.participant.status, 'submitted_for_review');
    // An active participation in a new version of the bounty still cannot create a second slot.
    f.participant.status = 'in_progress';
    const retry = response();
    await f.stage({...req(body(2)), params:{instanceId:'12',bountyId:'3'}}, retry);
    assert.equal(retry.statusCode, 409);
    assert.match(retry.body.error, /already submitted/);
    assert.equal(f.submissions.length, 1);
  });
}

test('bounty reviews require a whole-number star rating from 1 to 5', async () => {
  for (const regular of [true, false]) {
    const f = fixture(regular, 'review');
    for (const rating of [undefined, 0, 6, 3.5, '5']) {
      const res = response();
      await f.stage(req({ contentType: 'review', contentData: { text: 'My review', rating } }), res);
      assert.equal(res.statusCode, 400);
      assert.match(res.body.error, /1 to 5 stars/);
    }
    assert.equal(f.submissions.length, 0);
  }
});

test('regular media can only be replaced when a developer requests changes', async () => {
  const f = fixture();
  for (const id of [1,2]) f.media.set(id,{id,game_id:4,video_type:'clip'});
  const first = response(); await f.stage(req({clipId:1}),first);
  assert.equal(first.statusCode,201);
  f.participant.status = 'in_progress';
  const denied = response(); await f.stage(req({clipId:2,supersedesSubmissionId:1}),denied);
  assert.equal(denied.statusCode,400);
  f.participant.status = 'changes_requested';
  f.submissions[0].status = 'changes_requested';
  const revision = response(); await f.stage(req({clipId:2,supersedesSubmissionId:1,slotIndex:2}),revision);
  assert.equal(revision.statusCode,201,JSON.stringify(revision.body));
  assert.equal(revision.body.submission.slot_index,0);
  assert.equal(revision.body.submission.supersedes_submission_id,1);
  assert.equal(f.participant.status,'submitted_for_review');
});

test('paid campaign cap, ownership, game association and duplicate checks remain authoritative', async () => {
  const f = fixture(false);
  f.media.set(1, { id: 1, game_id: 4, video_type: 'clip' });
  let res = response(); await f.stage(req({ contentType: 'clip', clipId: 1 }), res); assert.equal(res.statusCode, 201);
  // Legacy automatic transition is unchanged; emulate another active attempt to exercise its quantity cap.
  f.participant.status = 'in_progress';
  f.media.set(2, { id: 2, game_id: 4, video_type: 'clip' });
  res = response(); await f.stage(req({ contentType: 'clip', clipId: 2, included_discovery: true }), res); assert.equal(res.statusCode, 409);
  const ongoing = fixture();
  res = response(); await ongoing.stage(req({ contentType: 'clip', clipId: 99 }), res); assert.equal(res.statusCode, 403);
  ongoing.media.set(99, { id: 99, game_id: 999, video_type: 'clip' });
  res = response(); await ongoing.stage(req({ contentType: 'clip', clipId: 99 }), res); assert.equal(res.statusCode, 400);
  ongoing.media.set(99, { id: 99, game_id: 4, video_type: 'clip' });
  res = response(); await ongoing.stage(req({ contentType: 'clip', clipId: 99 }), res); assert.equal(res.statusCode, 201);
  res = response(); await ongoing.stage(req({ contentType: 'clip', clipId: 99 }), res); assert.equal(res.statusCode, 409);
});

test('all additional contributions must be approved; approved extras do not multiply campaign XP', () => {
  const submissions = [0, 1, 2].map(slot => ({ id: slot + 1, bounty_id: 3, participant_id: 7, slot_index: slot, status: 'approved' }));
  const data = { campaign: { included_discovery: true }, objectives: [{ id: 3, quantity: 1, content_type: 'clip' }], submissions,
    rewards: [{ participant_id: 9, reward_type: 'completion', status: 'awarded', amount: 1500 }] };
  const participant = { id: 9, user_id: 7, status: 'completed_and_verified' };
  assert.equal(campaignCreatorProgress(data, participant).completed, true);
  assert.equal(campaignCreatorProgress(data, participant).xp, 1500);
  submissions[2].status = 'under_review';
  assert.equal(campaignCreatorProgress(data, participant).completed, false);
  submissions[2].status = 'changes_requested';
  assert.equal(campaignCreatorProgress(data, participant).completed, false);
});

test('one livestream retains connected-account verification and blocks additional streams', async () => {
  const f = fixture(true, 'stream');
  const body = (id:number) => {
    const startedAt = new Date(Date.now()-(id+2)*86400000).toISOString();
    const endedAt = new Date(Date.parse(startedAt)+3600000).toISOString();
    const link = `https://twitch.tv/videos/${id}`;
    return {contentType:'stream', contentData:{platform:'twitch',connectedChannelId:'channel-7',streamUrl:'https://twitch.tv/creator',vodUrl:link,claimedMinutes:60,
      sessions:[{streamedAt:startedAt,startedAt,endedAt,claimedMinutes:60,streamUrl:'https://twitch.tv/creator',vodUrl:link}]}};
  };
  const spoofed=body(4); spoofed.contentData.connectedChannelId='another-channel';
  const denied=response(); await f.stage(req(spoofed),denied); assert.equal(denied.statusCode,400);
  const valid=response(); await f.stage(req(body(1)),valid); assert.equal(valid.statusCode,201,JSON.stringify(valid.body));
  assert.equal(f.submissions[0].status,'under_review');
  const duplicate=response(); await f.stage(req(body(2)),duplicate); assert.equal(duplicate.statusCode,409);
  assert.equal(f.submissions.length,1);
});

test('empty, expired and terminal campaigns cannot be completed or reopened', async () => {
  const empty=fixture();const noContent=response();await empty.finish(req({}),noContent);assert.equal(noContent.statusCode,409);
  for(const status of ['rejected','cancelled','completed_and_verified','submitted_for_review']) {
    const f=fixture();f.participant.status=status;const res=response();
    await f.stage(req({contentType:'clip',clipId:1}),res);assert.equal(res.statusCode,409);assert.equal(f.mutations.length,0);
  }
  const expired=fixture(false);expired.participant.deadline='2000-01-01';const denied=response();
  await expired.stage(req({contentType:'clip',clipId:1}),denied);assert.equal(denied.statusCode,400);assert.equal(expired.mutations.length,0);
});

test('regular bounties ignore old personal deadlines but require the current month for new work', async () => {
  const current = fixture();
  current.participant.deadline = '2000-01-01';
  current.media.set(1, { id: 1, game_id: 4, video_type: 'clip' });
  const accepted = response();
  await current.stage(req({ contentType: 'clip', clipId: 1 }), accepted);
  assert.equal(accepted.statusCode, 201);

  const previous = fixture();
  previous.participant.previous_month = true;
  const denied = response();
  await previous.stage(req({ contentType: 'clip', clipId: 1 }), denied);
  assert.equal(denied.statusCode, 409);
  assert.equal(previous.mutations.length, 0);
});
