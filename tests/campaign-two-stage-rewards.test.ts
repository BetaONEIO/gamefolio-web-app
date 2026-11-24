import test from 'node:test';
import assert from 'node:assert/strict';
import {allocateCampaignCompletionRewards,campaignRewardExamples} from '../shared/campaign-reward-allocation';
test('approval allocation plus closure bonus conserves every penny for all capacities',()=>{
 for(let capacity=1;capacity<=25;capacity++)for(let count=1;count<=capacity;count++)for(const total of [0,1000,12000,12501]){
 const allocations=allocateCampaignCompletionRewards(total,capacity,Array.from({length:count},(_,i)=>i+1));
 assert.equal(allocations.reduce((n,a)=>n+a.guaranteedPence+a.bonusPence,0),total-Math.round(total*.2));
 assert.ok(allocations.every(a=>a.bonusPence>=0));
 }
});
test('£96 example and stable rounding',()=>{
 assert.deepEqual(allocateCampaignCompletionRewards(12000,10,[7,2]).map(a=>[a.participantId,a.guaranteedPence,a.bonusPence]),[[2,960,3840],[7,960,3840]]);
 assert.deepEqual(allocateCampaignCompletionRewards(12501,3,[3,1,2]).map(a=>a.finalPence),[3334,3334,3333]);
});
test('examples clamp and deduplicate, invalid participation cannot overspend',()=>{
 assert.deepEqual(campaignRewardExamples(12000,3).map(r=>r.count),[1,2,3]);
 assert.throws(()=>allocateCampaignCompletionRewards(1000,1,[1,2]));
 assert.throws(()=>allocateCampaignCompletionRewards(1000,2,[1,1]));
 assert.deepEqual(allocateCampaignCompletionRewards(1000,2,[]),[]);
});
