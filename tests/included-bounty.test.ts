import test from 'node:test';
import assert from 'node:assert/strict';
import { monthlyTemplate, includedMonth, assertIncludedActivation, includedStatus, paidBountySpecification, PAID_OUTPUT_LEVELS } from '../shared/included-bounty';
import { validateCreatorBudget } from '../shared/campaign-commercial-model';
import { bountyGameAvailabilityIssue } from '../shared/bounty-game-availability';

test('opening a bounty requires a platform and a region, including worldwide', () => {
  assert.equal(bountyGameAvailabilityIssue(['Windows'], ['worldwide']), null);
  assert.match(bountyGameAvailabilityIssue(['Windows'], null)!, /available regions/);
  assert.match(bountyGameAvailabilityIssue([], ['worldwide'])!, /supported platforms/);
  assert.match(bountyGameAvailabilityIssue([' '], [])!, /supported platforms and available regions/);
});

test('the monthly content allowance totals five media pieces, independently of feedback',()=>{
  const config=monthlyTemplate('content');
  assert.equal(config.objectives.clip+config.objectives.reel+config.objectives.screenshot,5);
  assert.equal(config.objectives.feedback,1);
  assert.equal(config.capacity,1);
  assert.equal(config.streamConfig,null);
  assert.ok(config.xp>0);
});
test('the alternative is exactly one verified stream with platform-managed duration and approval',()=>{
  const config=monthlyTemplate('stream');
  assert.equal(config.objectives.stream,1);
  assert.equal(config.objectives.clip,undefined);
  assert.equal(config.streamConfig?.requiredMinutes,60);
  assert.equal(config.streamConfig?.requireDeveloperApproval,true);
  assert.equal(config.streamConfig?.requirePublicVod,true);
  assert.throws(()=>monthlyTemplate('both' as any));
});
test('subscription months retain their original month-end anniversary and stop at expiry',()=>{
  const window=includedMonth('2026-01-31T15:30:00Z','2027-01-31T15:30:00Z',new Date('2026-03-30T12:00:00Z'))!;
  assert.equal(window.start.toISOString(),'2026-02-28T15:30:00.000Z');
  assert.equal(window.end.toISOString(),'2026-03-31T15:30:00.000Z');
  assert.equal(includedMonth('2026-11-02','2026-12-02',new Date('2026-12-02')),null);
  assert.equal(includedMonth(null,'2027-01-01'),null);
  assert.equal(includedMonth('invalid','2027-01-01'),null);
});
test('activation checks entitlement, ownership, a compatible key and an unused allowance',()=>{
  const input={eligible:true,owned:true,access:'full_game_upfront',availableKeys:1,used:false};
  assert.doesNotThrow(()=>assertIncludedActivation(input));
  assert.throws(()=>assertIncludedActivation({...input,eligible:false}),/membership/);
  assert.throws(()=>assertIncludedActivation({...input,owned:false}),/own/);
  assert.throws(()=>assertIncludedActivation({...input,availableKeys:0}),/valid game key/);
  assert.throws(()=>assertIncludedActivation({...input,used:true}),/already/);
  assert.doesNotThrow(()=>assertIncludedActivation({...input,access:'free_to_play',availableKeys:0}));
  assert.throws(()=>assertIncludedActivation({...input,access:'unexpected'}),/access/);
});
test('bounty states distinguish pause, entitlement and unclaimed key shortages',()=>{
  assert.equal(includedStatus(true,true,'demo',0,false),'Keys required');
  assert.equal(includedStatus(true,true,'demo',0,true),'Open');
  assert.equal(includedStatus(true,true,null,0,false),'Open');
  assert.equal(includedStatus(false,true,null,0,false),'Paused');
  assert.equal(includedStatus(true,false,null,0,false),'Indie Game Pro required');
});
test('paid presets, totals and 80/20 allocation use valid integer minor units',()=>{
  for(const level of Object.keys(PAID_OUTPUT_LEVELS) as (keyof typeof PAID_OUTPUT_LEVELS)[]) {
    const quote=paidBountySpecification({kind:'content',level,creators:5});
    assert.deepEqual(quote.objectives,PAID_OUTPUT_LEVELS[level]);
    assert.equal(quote.poolPence+quote.feePence,quote.totalPence);
    assert.equal(Number.isSafeInteger(quote.totalPence),true);
    assert.equal(validateCreatorBudget(quote.totalPence,quote.objectives,5),null);
  }
  const combined=paidBountySpecification({kind:'both',level:'Boost',creators:3});
  assert.equal(combined.objectives.stream,1);
  assert.equal(combined.objectives.clip,2);
  assert.ok(combined.totalPence>paidBountySpecification({kind:'content',level:'Boost',creators:3}).totalPence);
});
test('paid input cannot bypass creator limits or introduce unrelated objectives',()=>{
  assert.throws(()=>paidBountySpecification({kind:'stream',level:'Boost',creators:11}),/1 and 10/);
  assert.throws(()=>paidBountySpecification({kind:'content',level:'Boost',creators:101}),/1 and 100/);
  assert.throws(()=>paidBountySpecification({kind:'stream',level:'Boost',creators:1,objectives:{stream:1,clip:2}}),/campaign type/);
  assert.throws(()=>paidBountySpecification({kind:'content',level:'Boost',creators:1,objectives:{clip:99}}),/at most/);
  assert.throws(()=>paidBountySpecification({kind:'content',level:'Boost',creators:1,objectives:{unknown:1}}),/Unsupported/);
});
