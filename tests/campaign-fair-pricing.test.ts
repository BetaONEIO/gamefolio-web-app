import test from 'node:test';
import assert from 'node:assert/strict';
import { CAMPAIGN_COMMERCIAL_MODEL, calculatePresetPricePence, calculateStreamCampaignPricePence, getPresetObjectiveSnapshot, minimumCreatorPoolPence, validateCreatorBudget } from '../shared/campaign-commercial-model';
import { calculateCampaignFunding } from '../shared/campaign-funding';
import { campaignPreviewOutputs, previewCapacity } from '../client/src/pages/indie-dashboard/campaign-preview-model';
import { getPresetDecisionBlocker } from '../client/src/pages/indie-dashboard/preset-personalise-model';
test('launch packages allocate 80/20 and additional places increase the pool', () => {
  for (const [slug, capacity, price, pool, fee, extra] of [['content-boost',3,2500,2000,500,800],['creator-showcase',5,5000,4000,1000,1000]] as const) {
    assert.equal(calculatePresetPricePence(slug,capacity),price);
    assert.equal(calculatePresetPricePence(slug,1),price);
    const base=calculateCampaignFunding(price,capacity);
    assert.equal(base.creatorPoolPence,pool); assert.equal(base.platformFeePence,fee);
    const upgraded=calculateCampaignFunding(calculatePresetPricePence(slug,capacity+1),capacity+1);
    assert.equal(upgraded.grossAmountPence,price+extra);
    assert.equal(upgraded.creatorPoolPence,pool+Math.round(extra*.8));
  }
  assert.deepEqual([3,4,5,6].map(n=>calculatePresetPricePence('content-boost',n)),[2500,3300,4100,4900]);
  assert.deepEqual([5,6,7,8].map(n=>calculatePresetPricePence('creator-showcase',n)),[5000,6000,7000,8000]);
  assert.equal(calculatePresetPricePence('content-boost',5,'2026-10-fair-work'),6000);
  assert.equal(calculatePresetPricePence('creator-showcase',6,'2026-10-fair-work'),15000);
  assert.equal(calculateStreamCampaignPricePence(2,60,'2026-10-fair-work'),4000);
});
test('capacity estimates count each required objective exactly without rounding or invented reach',()=>{
  const expected={ 'quick-creator':{clip:3,screenshot:3,feedback:3},'content-boost':{clip:6,screenshot:3,feedback:3},'creator-showcase':{clip:10,reel:5,screenshot:5,review:5}};
  for(const [slug,totals] of Object.entries(expected)) {
    const preset=CAMPAIGN_COMMERCIAL_MODEL.presets.find(p=>p.slug===slug)!;
    assert.deepEqual(Object.fromEntries(campaignPreviewOutputs(preset,preset.estimatedCreatorMax!).map(o=>[o.type,o.max])),totals);
    for(const count of [1,3,6]) for(const output of campaignPreviewOutputs(preset,count)) {
      assert.equal(output.min,output.max); assert.equal(output.max,getPresetObjectiveSnapshot(preset)[output.type as keyof ReturnType<typeof getPresetObjectiveSnapshot>]*count);
    }
  }
});
test('workload budgets reject underfunding and accept the package floors',()=>{
  const objectives={clip:2,screenshot:1,feedback:1};
  assert.equal(minimumCreatorPoolPence(objectives,5),4800);
  assert.match(validateCreatorBudget(2500,objectives,5)??'',/Increase/);
  assert.equal(validateCreatorBudget(6000,objectives,5),null);
  assert.match(validateCreatorBudget(6000,objectives,6)??'',/Increase/);
  assert.equal(validateCreatorBudget(7200,objectives,6),null);
  assert.equal(validateCreatorBudget(4000,{stream:1},2,60),null);
  for(const amount of [-1,NaN,1000.5]) assert.ok(validateCreatorBudget(amount,objectives,5));
  for(const invalid of [{clip:-1},{clip:1.5},{unknown:1},{}]) assert.ok(validateCreatorBudget(10000,invalid,5));
});
test('invalid places cannot be priced and stream rates use integer pence',()=>{
  for(const capacity of [0,-1,1.5,26,NaN]) assert.throws(()=>calculatePresetPricePence('content-boost',capacity));
  assert.equal(calculateStreamCampaignPricePence(2,60),3000);
  assert.equal(calculateStreamCampaignPricePence(3,120),7500);
});
test('paired and deferred key access enforce both inventories without changing desired capacity',()=>{
  assert.equal(previewCapacity('full_after',{full:2},3),2);
  assert.equal(previewCapacity('demo_to_full',{full:5,demo:2},3),2);
  assert.equal(previewCapacity('no_key',{},3),3);
  const input={title:'Test',accessChoice:'demo_to_full',capacity:3,rewardKeyRequired:true,fullKeyCount:3,demoKeyCount:2,noKeyConfirmed:true,startType:'asap' as const,scheduledDate:'',scheduledTime:'',launchIsValid:true};
  assert.match(getPresetDecisionBlocker(input)??'',/2 available, 3 required/);
  assert.equal(getPresetDecisionBlocker({...input,demoKeyCount:3}),null);
  assert.match(getPresetDecisionBlocker({...input,accessChoice:'custom_access',fullKeyCount:2})??'',/full-game keys/);
});
