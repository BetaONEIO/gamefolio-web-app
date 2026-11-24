import {test} from 'node:test';import assert from 'node:assert/strict';
import {campaignPrimaryStatus,campaignProgressStage,isVisibleConfirmedCampaign,canDiscardCampaignSetup} from '../shared/campaign-presentation';
import {isEligibleCampaignInvitation} from '../shared/campaign-invite-eligibility';
test('unpaid setup and processing receipts stay out of the campaign list',()=>{
 for(const status of ['draft','payment_processing'])assert.equal(isVisibleConfirmedCampaign({status,commercial_type:'paid',payment_status:'awaiting_payment'}),false);
 assert.equal(isVisibleConfirmedCampaign({status:'live',commercial_type:'paid',payment_status:'awaiting_payment'}),false);
 for(const status of ['live','scheduled','under_review']){assert.equal(campaignPrimaryStatus({status}),'in_progress');assert.equal(isVisibleConfirmedCampaign({status,commercial_type:'paid',payment_status:'fulfilled'}),true);}
 assert.equal(isVisibleConfirmedCampaign({status:'cancelled',archived_at:'today'}),false);
});
test('progress stages use current participant, approval and reward records',()=>{
 assert.equal(campaignProgressStage({status:'scheduled'},{}),'Scheduled');
 assert.equal(campaignProgressStage({status:'live'},{}),'Recruiting creators');
 assert.equal(campaignProgressStage({status:'live'},{creatorsJoined:1}),'Creator work in progress');
 assert.equal(campaignProgressStage({status:'live'},{contentReceived:1}),'Content submitted');
 assert.equal(campaignProgressStage({status:'live'},{pendingReviews:1}),'Awaiting review');
 assert.equal(campaignProgressStage({status:'under_review'},{pendingRewards:1,expectedUnits:1,approvedUnits:1}),'Rewards processing');
});
test('invitations require accepting paid campaigns, capacity and matching capabilities',()=>{
 const data:any={campaign:{status:'live',commercial_type:'paid',payment_status:'fulfilled',requires_access_key:false,platforms:['windows']},participants:[],objectives:[],keys:[],metrics:{placesAvailable:1}};
 const user={id:7,status:'active',role:'user',steam_username:'creator'};
 assert.equal(isEligibleCampaignInvitation(data,user,[]),true);
 for(const status of ['draft','scheduled','under_review','completed','cancelled'])assert.equal(isEligibleCampaignInvitation({...data,campaign:{...data.campaign,status}},user,[]),false);
 assert.equal(isEligibleCampaignInvitation({...data,metrics:{placesAvailable:0}},user,[]),false);
 assert.equal(isEligibleCampaignInvitation({...data,campaign:{...data.campaign,applications_paused:true}},user,[]),false);
 assert.equal(isEligibleCampaignInvitation(data,{id:7,status:'active',role:'user'},[]),false);
 const stream={...data,objectives:[{content_type:'stream',mandatory:true}],campaign:{...data.campaign,stream_config:{allowedPlatforms:['twitch']}}};
 assert.equal(isEligibleCampaignInvitation(stream,user,[]),false);
 assert.equal(isEligibleCampaignInvitation(stream,user,['kick']),false);
 assert.equal(isEligibleCampaignInvitation(stream,user,['twitch']),true);
 assert.equal(isEligibleCampaignInvitation({...data,participants:[{user_id:7}]},user,[]),false);
});

test('discard cannot remove paid, processing or participating campaigns',()=>{
 assert.equal(canDiscardCampaignSetup({status:'draft'},null,false),true);
 assert.equal(canDiscardCampaignSetup({status:'draft'},{status:'payment_failed'},false),true);
 for(const status of ['live','scheduled','completed','cancelled'])assert.equal(canDiscardCampaignSetup({status},null,false),false);
 assert.equal(canDiscardCampaignSetup({status:'draft'},{status:'awaiting_payment',transaction_id:'paid'},false),false);
 assert.equal(canDiscardCampaignSetup({status:'draft'},{status:'payment_processing'},false),false);
 assert.equal(canDiscardCampaignSetup({status:'draft'},null,true),false);
});
