import test from 'node:test';
import assert from 'node:assert/strict';
import { opportunityTypes, discoveryTemplate, contextualBoost, unusedBoostRewards } from '../shared/bounty-discovery';

test('always-on discovery generates independent standard content and stream requirements',()=>{
  assert.equal(opportunityTypes('both').length,6);
  assert.equal(opportunityTypes('content').includes('stream'),false);
  assert.deepEqual(opportunityTypes('stream'),['stream']);
  assert.throws(()=>opportunityTypes('invalid' as any));
  for(const type of opportunityTypes('both')) {
    const config=discoveryTemplate(type);
    assert.deepEqual(config.objectives,{[type]:1});
    assert.ok(config.xp>0&&config.deadlineDays>=7);
    assert.ok(config.format&&config.quality);
    assert.equal(!!config.streamConfig,type==='stream');
  }
  assert.throws(()=>discoveryTemplate('bogus' as any));
});
test('quiet dashboards do not show a constant upgrade prompt',()=>{
  assert.equal(contextualBoost({approved:[],participants:[],listingOpens:0}),null);
});
test('a claim still within its completion window never gets a stalled-claim prompt',()=>{
  assert.equal(contextualBoost({approved:[],listingOpens:0,participants:[{access_key_id:1,deadline:'2026-11-10',status:'active'}],now:Date.parse('2026-11-03')}),null);
  assert.equal(contextualBoost({approved:[],listingOpens:0,participants:[{access_key_id:1,deadline:'2026-11-01',status:'expired',has_submission:false}],now:Date.parse('2026-11-03')})?.id,'expired-claim');
  assert.equal(contextualBoost({approved:[],listingOpens:0,participants:[{access_key_id:1,deadline:'2026-11-01',has_submission:true}],now:Date.parse('2026-11-03')}),null);
});
test('boost recommendations use actual approvals, upcoming releases or sustained interest',()=>{
  assert.equal(contextualBoost({approved:[{content_type:'stream'}],participants:[],listingOpens:0})?.kind,'stream');
  assert.equal(contextualBoost({approved:Array.from({length:3},()=>({content_type:'clip'})),participants:[],listingOpens:0})?.id,'successful-clip');
  assert.equal(contextualBoost({approved:[],participants:[],listingOpens:20})?.id,'strong-interest');
  assert.equal(contextualBoost({approved:[],participants:[],listingOpens:0,releaseDate:'2026-11-15',now:Date.parse('2026-11-03')})?.id,'release');
  assert.equal(contextualBoost({approved:[],participants:[],listingOpens:0,releaseDate:'2026-10-15',now:Date.parse('2026-11-03')}),null);
});
test('unused reward calculation returns uncompleted shares without redistributing or retaining them',()=>{
  assert.equal(unusedBoostRewards(8000,1600,0,5),8000);
  assert.equal(unusedBoostRewards(8000,1600,2,5),4800);
  assert.equal(unusedBoostRewards(8000,1600,5,5),0);
  assert.equal(unusedBoostRewards(8001,1600,5,5),1);
  assert.throws(()=>unusedBoostRewards(8000,1600,6,5));
  assert.throws(()=>unusedBoostRewards(8000,1700,2,5));
  assert.throws(()=>unusedBoostRewards(8000,1600,.5,5));
});
