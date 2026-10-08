import test from 'node:test';
import assert from 'node:assert/strict';
import { campaignSamples, sampleCampaignById, isSampleCampaignId, COMPLETED_SAMPLE_ID } from '../client/src/pages/indie-dashboard/completed-campaign-sample';
import { isVisibleConfirmedCampaign, campaignProgressStage } from '../shared/campaign-presentation';

test('development samples cover lifecycle filters with distinct IDs and game references', () => {
  const samples=campaignSamples(42);
  assert.equal(samples.length,8);
  assert.equal(new Set(samples.map(s=>s.campaign.id)).size,8);
  for(const sample of samples) {
    assert.equal(sample.campaign.profile_game_id,42);
    assert.ok(isVisibleConfirmedCampaign(sample.campaign,true));
    assert.ok(isSampleCampaignId(sample.campaign.id));
    assert.ok(sampleCampaignById(sample.campaign.id));
  }
  assert.equal(isSampleCampaignId(1),false);
  assert.equal(sampleCampaignById(COMPLETED_SAMPLE_ID)?.campaign.status,'completed');
  const stages=samples.map(s=>campaignProgressStage(s.campaign,s.metrics));
  for(const stage of ['Scheduled','Recruiting creators','Creator work in progress','Awaiting review','Rewards processing'])assert.ok(stages.includes(stage));
});
test('sample review work and awarded XP remain consistent with lifecycle', () => {
  const samples=campaignSamples();
  const completed=samples[0];
  assert.equal(completed.metrics.contentApproved,6);
  assert.equal(completed.metrics.creatorsCompleted,2);
  assert.equal(completed.metrics.xpDistributed,6000);
  assert.ok(samples.some(s=>s.metrics.pendingReviews===6));
  assert.ok(samples.some(s=>s.metrics.contentRejected===2));
  const pending=samples.find(s=>s.metrics.pendingRewards>0)!;
  assert.equal(pending.metrics.xpDistributed,0);
  assert.equal(pending.metrics.pendingRewards,2);
});
