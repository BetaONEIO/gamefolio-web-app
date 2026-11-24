import test from 'node:test';
import assert from 'node:assert/strict';
import {campaignMetrics,nextCampaignStatus} from '../shared/campaign-management';
import {canEndCampaignEarly} from '../shared/campaign-early-completion';
import {summarizeCampaignSubmissionSlots} from '../server/campaign-submission-status';
const campaign={status:'live',max_places:5,end_date:'2099-01-01',bounty_xp_reward:100,completion_reward_key_required:false};
const p={id:1,user_id:10,status:'completed_and_verified'};
const submissions=[{id:1,participant_id:10,bounty_id:4,slot_index:0,status:'approved'}];
const rewards=[{participant_id:1,reward_type:'completion',status:'awarded',amount:100}];
const data=()=>({campaign,participants:[p],submissions,objectives:[{id:4,quantity:1,content_type:'clip'}],rewards,keys:[]});
test('one completed creator leaves four places free and can end early',()=>{
 const d=data(),m=campaignMetrics(campaign,d.participants,submissions,[],rewards,d.objectives);
 assert.equal(m.placesAvailable,4);assert.equal(m.unclaimedPlaces,4);assert.equal(m.completionPercent,100);
 assert.equal(nextCampaignStatus(campaign,[p],submissions,[],rewards),'live');
 assert.equal(canEndCampaignEarly(d),true);
 assert.equal(nextCampaignStatus({...campaign,end_date:'2000-01-01'},[p],submissions,[],rewards),'completed');
});
test('full capacity does not automatically end a campaign',()=>{
 const d=data();assert.equal(nextCampaignStatus({...campaign,max_places:1},[p],submissions,[],rewards),'live');
 assert.equal(canEndCampaignEarly({...d,participants:[p,{id:2,user_id:11,status:'joined'}]}),false);
});
test('withdrawn, removed and expired participants release places',()=>{
 const participants=[{...p,status:'joined'},{id:2,user_id:11,status:'withdrawn'},{id:3,user_id:12,status:'removed'},{id:4,user_id:13,status:'expired'}];
 const m=campaignMetrics(campaign,participants,[],[],[],[{id:4,quantity:1}]);
 assert.equal(m.placesClaimed,1);assert.equal(m.placesAvailable,4);assert.equal(m.expectedUnits,1);
});
test('early completion cannot bypass pending work, stream verification or rewards',()=>{
 const d=data();assert.equal(canEndCampaignEarly({...d,rewards:[]}),false);
 assert.equal(canEndCampaignEarly({...d,keys:[{key_pool:'access',status:'reserved',assigned_user_id:10}]}),false);
 assert.equal(canEndCampaignEarly({...d,rewards:[{...rewards[0],status:'pending'}]}),false);
 assert.equal(canEndCampaignEarly({...d,submissions:[{...submissions[0],status:'awaiting_review'}]}),false);
 assert.equal(canEndCampaignEarly({...d,submissions:[{...submissions[0],status:'changes_requested'}]}),false);
 assert.equal(canEndCampaignEarly({...d,campaign:{...campaign,completion_reward_key_required:true}}),false);
 assert.equal(canEndCampaignEarly({...d,objectives:[{id:4,quantity:1,content_type:'stream'}],submissions:[{...submissions[0],content_type:'stream',content_data:{claimedMinutes:60}}]}),false);
});
test('zero creators is an open capacity, not an unfinished minimum; deadline can close it',()=>{
 assert.equal(nextCampaignStatus(campaign,[],[],[],[]),'live');
 assert.equal(nextCampaignStatus({...campaign,end_date:'2000-01-01'},[],[],[],[]),'completed');
 assert.equal(canEndCampaignEarly({...data(),participants:[],submissions:[],rewards:[]}),false);
});
test('new individual uploads count as submitted before other objectives are present',()=>{
 const summary=summarizeCampaignSubmissionSlots([{id:1,slot_index:0,status:'awaiting_review'}],3);
 assert.equal(summary.submitted,1);assert.equal(summary.underReview,1);assert.equal(summary.staged,0);
});
