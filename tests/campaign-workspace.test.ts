import test from 'node:test';
import assert from 'node:assert/strict';
import { validateWorkspaceChanges } from '../shared/campaign-workspace';
import { managedCampaignStatus, nextCampaignStatus } from '../shared/campaign-management';
test('legacy creator activity is Live, with no separate In Progress status',()=>{
  assert.equal(managedCampaignStatus({status:'in_progress'}),'live');
  assert.equal(nextCampaignStatus({status:'live',end_date:'2099-01-01'},[{user_id:1,status:'working'}],[{participant_id:1,status:'pending'}],[],[]),'live');
});
test('safe save rejects every locked agreement field instead of silently accepting it',()=>{
  for(const key of ['objectiveSnapshot','bountyXpReward','accessMethod','startDate','budgetPence','maxPlaces','endDate','confirmed_terms','description'])assert.throws(()=>validateWorkspaceChanges({[key]:'changed'}),/locked after confirmation/);
});
test('safe fields preserve text and reject unsafe links or oversized values',()=>{
  assert.deepEqual(validateWorkspaceChanges({guidance:'  Join our Discord  ',links:'https://example.com/guide.pdf'}),{guidance:'Join our Discord',links:'https://example.com/guide.pdf'});
  assert.throws(()=>validateWorkspaceChanges({links:'javascript:alert(1)'}),/HTTPS/);
  assert.throws(()=>validateWorkspaceChanges({campaignTitle:''}),/required/);
  assert.throws(()=>validateWorkspaceChanges({faq:'x'.repeat(4001)}),/maximum/);
});
test('completed campaigns retain their final lifecycle state',()=>{
  assert.equal(nextCampaignStatus({status:'completed'},[],[],[],[{status:'pending'}]),'completed');
});
