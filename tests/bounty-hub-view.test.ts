import test from 'node:test';
import assert from 'node:assert/strict';
import {bountyHubState,bountyHubListingUrl,BOUNTY_HERO_COPY,hubSubmissions,heroArtworkSources,isLiveSubmission,isVerifiedStream} from '../shared/bounty-hub-view';
const base={eligible:true,programme:{is_open:true,access_method:'full_game_upfront'},availableKeys:4,submissions:[]};
test('hub independently renders the five authoritative bounty states',()=>{
  assert.equal(bountyHubState({...base,programme:null}),'never-enabled');
  assert.equal(bountyHubState(base),'active');
  assert.equal(bountyHubState({...base,programme:{...base.programme,is_open:false}}),'paused');
  assert.equal(bountyHubState({...base,availableKeys:0}),'keys-required');
  assert.equal(bountyHubState({...base,submissions:[{id:1,status:'pending'}]}),'awaiting-review');
  assert.equal(BOUNTY_HERO_COPY.paused.primary,'Resume bounties');
  assert.equal(BOUNTY_HERO_COPY['never-enabled'].primary,'Open for Bounties');
});

test('missing profile availability replaces the listing action and keeps review accessible', () => {
  const availabilityIssue = 'Add available regions';
  assert.equal(bountyHubState({ ...base, availabilityIssue }), 'profile-required');
  assert.equal(bountyHubState({ ...base, programme: null, availabilityIssue }), 'profile-required');
  assert.equal(bountyHubState({ ...base, availabilityIssue, submissions: [{ id: 1, status: 'pending' }] }), 'awaiting-review');
});
test('review takes priority over missing keys and paused visibility',()=>{
  assert.equal(bountyHubState({...base,availableKeys:0,programme:{...base.programme,is_open:false},submissions:[{id:1,status:'awaiting_review'}]}),'awaiting-review');
  assert.equal(bountyHubState({...base,availableKeys:0,programme:{...base.programme,opted_out_at:'2026-11-01'}}),'paused');
  assert.equal(bountyHubState({...base,availableKeys:0,programme:{is_open:true,access_method:'free_to_play'}}),'active');
  assert.equal(bountyHubState({...base,eligible:false}),'paused');
});
test('staged and superseded work never triggers a review hero; newest is first',()=>{
  const submissions=[{id:1,status:'pending',submitted_at:'2026-11-01'},{id:2,status:'approved',supersedes_submission_id:1,submitted_at:'2026-11-02'},{id:3,status:'staged',submitted_at:'2026-11-03'}];
  assert.deepEqual(hubSubmissions(submissions).map(s=>s.id),[2]);
  assert.equal(bountyHubState({...base,submissions}),'active');
  assert.deepEqual(hubSubmissions([{id:4,submitted_at:'2026-11-01'},{id:5,submitted_at:'2026-11-02'}]).map(s=>s.id),[5,4]);
});
test('artwork stays game-scoped with deduplicated banner, screenshot and portrait fallbacks',()=>{
  assert.deepEqual(heroArtworkSources({header_image_url:'banner',screenshot_urls:['shot'],capsule_image_url:'cover',catalog_image_url:'cover'}),[{url:'banner',portrait:false},{url:'shot',portrait:false},{url:'cover',portrait:true}]);
  assert.deepEqual(heroArtworkSources({}),[]);
});
test('live and verified badges require real stream evidence',()=>{
  assert.equal(isLiveSubmission({content_type:'stream',content_data:{isLive:true}}),true);
  assert.equal(isLiveSubmission({content_type:'stream',status:'approved'}),false);
  assert.equal(isLiveSubmission({content_type:'clip',content_data:{isLive:true}}),false);
  assert.equal(isVerifiedStream({content_type:'stream',content_data:'{"verificationStatus":"verified"}'}),true);
  assert.equal(isVerifiedStream({content_type:'stream',content_data:'invalid'}),false);
});

test('public hub links use a real accepting opportunity and exclude paused or ended records',()=>{
  assert.equal(bountyHubListingUrl([{instance_id:5,status:'live',applications_paused:true},{instance_id:6,status:'cancelled'},{instance_id:7,status:'live',applications_paused:false}]),'/bounties?campaign=7');
  assert.equal(bountyHubListingUrl([{instance_id:0,status:'live'},{instance_id:'invalid',status:'live'}]),'/bounties');
  assert.equal(bountyHubListingUrl(),'/bounties');
});

test('single creator activity is scoped to its own opportunity and prioritises review',async()=>{
  const {bountyCreatorRows}=await import('../shared/bounty-hub-view');
  const record=(instance:number,user:number,submissions:any[],status='working',type='clip')=>({campaign:{id:instance,status:'live'},participants:[],objectives:[{id:instance,quantity:1,mandatory:true,content_type:type}],submissions,rewards:[]});
  const work=(id:number,instance:number,user:number,status:string)=>({id,instance_id:instance,participant_id:user,bounty_id:instance,status,slot_index:0});
  const first={id:1,user_id:11,username:'one',instance_id:3,status:'joined',joined_at:'2026-11-01',completion_deadline:'2026-11-08'};
  assert.equal(bountyCreatorRows({participants:[first],recordsByInstance:{3:record(3,11,[])}})[0].status,'Working');
  const participants=[first,{...first,id:2,user_id:12,instance_id:4}];
  const submissions=[work(10,3,11,'approved'),work(11,4,12,'pending')];
  const rows=bountyCreatorRows({participants,submissions,recordsByInstance:{3:record(3,11,[submissions[0]]),4:record(4,12,[submissions[1]])}});
  assert.equal(rows[0].participant.user_id,12);
  assert.equal(rows[0].status,'Awaiting review');
  assert.equal(rows[0].review.id,11);
  // An upload/approval alone does not imply a final approved completion.
  assert.equal(rows[1].status,'Working');
  const completed=bountyCreatorRows({participants:[{...first,status:'completed'}],recordsByInstance:{3:record(3,11,[submissions[0]])}})[0];
  assert.equal(completed.status,'Approved');
  assert.equal(completed.deadline,'2026-11-08');
  const changes=bountyCreatorRows({participants:[first],recordsByInstance:{3:record(3,11,[work(12,3,11,'changes_requested')])}})[0];
  assert.equal(changes.status,'Changes requested');
});
test('overview boost stays hidden for fresh, busy, paused or ineligible listings',async()=>{
  const {showOverviewBoost,BOUNTY_NO_INTEREST_DAYS}=await import('../shared/bounty-hub-view');
  const now=Date.parse('2026-11-10'),day=86400000;
  const data={programme:{is_open:true,created_at:new Date(now-day).toISOString()},entitlement:{eligible:true},activity:{participants:[],submissions:[]},analytics:{listing_open:0}};
  assert.equal(showOverviewBoost(data,now),false);
  const stale={...data,programme:{...data.programme,created_at:new Date(now-BOUNTY_NO_INTEREST_DAYS*day).toISOString()}};
  assert.equal(showOverviewBoost(stale,now),true);
  assert.equal(showOverviewBoost({...stale,analytics:{listing_open:1}},now),false);
  assert.equal(showOverviewBoost({...stale,activity:{participants:[{user_id:1,status:'joined'}]}},now),false);
  assert.equal(showOverviewBoost({...stale,feed:[{type:'creator_joined'}]},now),false);
  assert.equal(showOverviewBoost({...stale,programme:{...stale.programme,is_open:false}},now),false);
  assert.equal(showOverviewBoost({...stale,entitlement:{eligible:false}},now),false);
  assert.equal(showOverviewBoost({...data,programme:{...data.programme,created_at:'invalid'}},now),false);
});
