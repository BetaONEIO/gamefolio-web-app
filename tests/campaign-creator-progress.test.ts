import {test} from 'node:test';
import assert from 'node:assert/strict';
import {campaignCreatorProgress} from '../shared/campaign-creator-progress';
const participant={id:10,user_id:20,status:'completed_and_verified',completed_at:'2026-10-04'};
const base=()=>({campaign:{status:'completed'},objectives:[{id:1,quantity:2,content_type:'clip',mandatory:true},{id:2,quantity:1,content_type:'feedback',mandatory:true}],submissions:[{id:1,participant_id:20,bounty_id:1,slot_index:0,status:'approved'},{id:2,participant_id:20,bounty_id:1,slot_index:1,status:'approved'},{id:3,participant_id:20,bounty_id:2,slot_index:0,status:'approved'}],rewards:[{participant_id:10,reward_type:'completion',status:'awarded',amount:3000}]});
test('completed creators require final participation and all objective slots approved',()=>{
 const data=base();assert.equal(campaignCreatorProgress(data,participant).completed,true);assert.equal(campaignCreatorProgress(data,participant).xp,3000);
 assert.equal(campaignCreatorProgress(data,{...participant,status:'in_progress'}).completed,false);
 assert.equal(campaignCreatorProgress({...data,submissions:data.submissions.slice(0,1)},participant).completed,false);
 assert.equal(campaignCreatorProgress({...data,submissions:[...data.submissions,{id:4,participant_id:20,bounty_id:1,slot_index:1,status:'changes_requested',supersedes_submission_id:2}]},participant).completed,false);
 assert.equal(campaignCreatorProgress({...data,submissions:data.submissions.map(s=>({...s,slot_index:0}))},participant).completed,false);
});
test('stream completion requires verified duration, not claimed minutes or approval alone',()=>{
 const data:any={campaign:{stream_config:{requiredMinutes:60}},objectives:[{id:5,quantity:1,content_type:'stream'}],submissions:[{id:8,participant_id:20,bounty_id:5,slot_index:0,status:'approved',content_data:{claimedMinutes:120}}],rewards:[]};
 assert.equal(campaignCreatorProgress(data,participant).completed,false);
 data.submissions[0].content_data={verifiedMinutes:45,verificationStatus:'verified'};assert.equal(campaignCreatorProgress(data,participant).completed,false);
 data.submissions[0].content_data={verifiedMinutes:60,verificationStatus:'verified'};assert.equal(campaignCreatorProgress(data,participant).completed,true);
});
