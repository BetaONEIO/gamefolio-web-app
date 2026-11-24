import test from 'node:test';
import assert from 'node:assert/strict';
import { nextCampaignStatus, campaignMetrics, campaignHasActivity, managedCampaignStatus } from '../shared/campaign-management';
const campaign={status:'live',max_places:2,bounty_xp_reward:100,completion_reward_key_required:false,end_date:'2099-01-01T00:00:00Z'};
test('unpaid setup remains Draft; an unfulfilled receipt locks setup',()=>{
  assert.equal(managedCampaignStatus({status:'draft',payment_status:'awaiting_payment'}),'draft');
  assert.equal(managedCampaignStatus({status:'draft',payment_status:'setup_processing'}),'payment_processing');
});
test('joining is activity while the campaign stays Live; scheduled campaigns wait for their start',()=>{
  assert.equal(nextCampaignStatus(campaign,[],[],[],[]),'live');
  assert.equal(nextCampaignStatus(campaign,[{id:1,user_id:8,status:'enrolled'}],[],[],[]),'live');
  assert.equal(nextCampaignStatus({...campaign,status:'scheduled',actual_start:'2099-01-01'},[],[],[],[]),'scheduled');
});
test('enrolment closing never completes outstanding work or missing rewards',()=>{
  const closed={...campaign,end_date:'2000-01-01'};
  assert.equal(nextCampaignStatus(closed,[{id:1,user_id:8,status:'enrolled'}],[],[],[]),'under_review');
  assert.equal(nextCampaignStatus(closed,[{id:1,user_id:8,status:'completed_and_verified'}],[],[],[]),'under_review');
  assert.equal(nextCampaignStatus(closed,[{id:1,user_id:8,status:'completed_and_verified'}],[],[],[{participant_id:1,reward_type:'completion',status:'awarded'}]),'completed');
});
test('completion key must be issued before final completion',()=>{
  const p={id:1,user_id:8,status:'completed_and_verified'}, c={...campaign,completion_reward_key_required:true,end_date:'2000-01-01'};
  const rewards=[{participant_id:1,reward_type:'completion',status:'awarded'}];
  assert.equal(nextCampaignStatus(c,[p],[],[],rewards),'under_review');
  assert.equal(nextCampaignStatus(c,[{...p,full_key_id:2}],[],[],rewards),'completed');
});
test('progress caps each creator objective and excludes superseded submissions',()=>{
  const p=[{id:1,user_id:8,status:'enrolled'},{id:2,user_id:9,status:'enrolled'}], o=[{id:10,quantity:1}];
  const submissions=[{id:1,bounty_id:10,participant_id:8,status:'rejected'},{id:2,bounty_id:10,participant_id:8,status:'approved',supersedes_submission_id:1},{id:3,bounty_id:10,participant_id:8,status:'approved'}];
  const metrics=campaignMetrics(campaign,p,submissions,[],[],o);
  assert.equal(metrics.completionPercent,50); assert.equal(metrics.contentReceived,2); assert.equal(metrics.objectives[0].rejected,0);
});
test('cancellation activity checks include keys and reward records even without submissions',()=>{
  assert.equal(campaignHasActivity([],[],[],[]),false);
  assert.equal(campaignHasActivity([],[],[{status:'reserved',assigned_user_id:8}],[]),true);
  assert.equal(campaignHasActivity([],[],[],[{status:'pending'}]),true);
});
