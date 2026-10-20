import test from 'node:test';
import assert from 'node:assert/strict';
import {campaignLifecycleTimeline,recentCampaignActivity} from '../shared/campaign-lifecycle-timeline';
const now=new Date('2026-10-13T12:00:00Z');
const data=()=>({campaign:{status:'live',actual_start:'2026-10-10T12:00:00Z',end_date:'2026-10-20T12:00:00Z',max_places:10},participants:[] as any[],submissions:[] as any[],objectives:[{id:1,content_type:'clip',quantity:2,mandatory:true},{id:2,content_type:'feedback',quantity:1,mandatory:true}],rewards:[],timeline:[] as any[]});
const participant={id:100,user_id:7,status:'in_progress',joined_at:'2026-10-11T12:00:00Z'};
const work=(status='awaiting_review')=>[{id:1,bounty_id:1,slot_index:0,participant_id:7,status,submitted_at:'2026-10-12T12:00:00Z'},{id:2,bounty_id:1,slot_index:1,participant_id:7,status,submitted_at:'2026-10-12T13:00:00Z'},{id:3,bounty_id:2,slot_index:0,participant_id:7,status,submitted_at:'2026-10-12T14:00:00Z'}];
test('live campaign waits for creators; time alone does not complete milestones',()=>{
 const view=campaignLifecycleTimeline(data(),now);assert.equal(view.title,'Waiting for creators');assert.equal(view.stages[1].state,'current');assert.equal(view.stages[2].state,'future');assert.equal(view.completed,0);assert.equal(view.placesAvailable,10);
 assert.equal(campaignLifecycleTimeline(data(),new Date('2026-11-01')).stages[4].state,'future');
});
test('scheduled launch is not marked started before activation',()=>{
 const d=data();d.campaign.status='scheduled';d.campaign.actual_start='2026-10-15T12:00:00Z';const view=campaignLifecycleTimeline(d,now);assert.equal(view.stages[0].state,'current');assert.equal(view.title,'Campaign scheduled');
});
test('submission readiness uses required objective slots and participants, not capacity',()=>{
 const d=data();d.participants=[participant,{...participant,id:101,user_id:8}];d.submissions=work().slice(0,2);let view=campaignLifecycleTimeline(d,now);assert.match(view.stages[2].description,/0 of 2/);assert.equal(view.stages[3].state,'action');
 d.submissions=work();view=campaignLifecycleTimeline(d,now);assert.match(view.stages[2].description,/1 of 2/);assert.match(view.message,/1 creator has submitted all required content/);assert.equal(view.nextReviewer,7);assert.equal(view.placesAvailable,8);
 d.submissions[1].slot_index=0;assert.match(campaignLifecycleTimeline(d,now).stages[2].description,/0 of 2/);
});
test('one completed creator cannot complete the campaign',()=>{
 const d=data();d.participants=[{...participant,status:'completed_and_verified'},{...participant,id:101,user_id:8}];d.submissions=work('approved');const view=campaignLifecycleTimeline(d,now);assert.equal(view.completed,1);assert.equal(view.stages[4].state,'future');assert.equal(view.title,'Creators working');
});
test('changes requested produce clear copy without an approval action',()=>{
 const d=data();d.participants=[participant];d.submissions=work('changes_requested');const view=campaignLifecycleTimeline(d,now);assert.equal(view.title,'Changes requested');assert.equal(view.pending,0);assert.equal(view.cta,'View submission');
});
test('completed campaigns show green completed stages and no countdown',()=>{
 const d=data();d.campaign.status='completed';(d.campaign as any).completed_at='2026-10-13T10:00:00Z';d.participants=[{...participant,status:'completed_and_verified'}];d.submissions=work('approved').map(s=>({...s,reviewed_at:'2026-10-13T09:00:00Z'}));const view=campaignLifecycleTimeline(d,now);assert.ok(view.stages.every(s=>s.state==='completed'));assert.equal(view.daysRemaining,null);assert.equal(view.stages[4].date,'2026-10-13T10:00:00.000Z');
});
test('cancelled campaigns preserve reached milestones and append a cancellation node',()=>{
 const d=data();d.campaign.status='cancelled';(d.campaign as any).cancelled_at='2026-10-12T10:00:00Z';(d.campaign as any).cancellation_reason='Launch postponed';d.participants=[participant];const view=campaignLifecycleTimeline(d,now);assert.equal(view.stages[0].state,'completed');assert.equal(view.stages[2].state,'future');assert.equal(view.stages.at(-1)?.title,'Campaign cancelled');assert.equal(view.stages.at(-1)?.description,'Launch postponed');assert.equal(view.daysRemaining,null);
});
test('recent activity groups repeats by recorded event and day',()=>{
 const events=[{type:'creator_joined',actor:'A',at:'2026-10-12T10:00:00Z'},{type:'creator_joined',actor:'B',at:'2026-10-12T11:00:00Z'},{type:'creator_joined',actor:'C',at:'2026-10-11T11:00:00Z'}];const activity=recentCampaignActivity(events);assert.equal(activity.length,2);assert.equal(activity[0].title,'2 creators joined the campaign');assert.equal(events.length,3);
});
