import test from 'node:test';
import assert from 'node:assert/strict';
import {PgDialect} from 'drizzle-orm/pg-core';
import {syncDeveloperNotifications} from '../server/campaign-developer-notification-events';
function database(){
 const events=new Set<string>(),notifications:any[]=[],activity:any[]=[];const dialect=new PgDialect();
 return {events,notifications,activity,async execute(statement:any){
  const {sql:q,params}=dialect.sqlToQuery(statement);
  if(q.includes('SELECT started_at'))return {rows:[{started_at:'2026-01-01'}]};
  if(q.startsWith('INSERT INTO campaign_developer_notification_events')){const key=String(params[0]);if(events.has(key))return {rows:[]};events.add(key);return {rows:[{event_key:key}]};}
  if(q.startsWith('INSERT INTO notifications')){const grouped=q.includes("'New content is ready for review'");const n={id:notifications.length+1,title:grouped?'New content is ready for review':params[1],message:grouped?params[1]:params[2],metadata:JSON.parse(String(grouped?params[2]:params[3])),url:grouped?params[3]:params[4]};notifications.push(n);return {rows:[{id:n.id}]};}
  if(q.startsWith('SELECT id,metadata FROM notifications')){const n=notifications.find(n=>n.metadata.category==='submissions');return {rows:n?[n]:[]};}
  if(q.startsWith('UPDATE notifications SET message')){const n=notifications.find(n=>n.id===params[3]);Object.assign(n,{message:params[0],metadata:JSON.parse(String(params[1])),url:params[2]});}
  if(q.startsWith('INSERT INTO campaign_management_events'))activity.push(params);
  return {rows:[]};
 }};
}
function data(){return {campaign:{id:5,developer_user_id:99,campaign_title:'Content Boost',status:'live',max_places:5,end_date:'2099-01-01'},participants:[{id:7,user_id:8,username:'Creator',status:'in_progress',joined_at:new Date().toISOString()}],submissions:[{id:11,participant_id:8,content_type:'clip',status:'awaiting_review',submitted_at:new Date().toISOString()}],objectives:[{id:1,quantity:1}],rewards:[],metrics:{placesClaimed:1,pendingReviews:1}};}
test('committed activity notifications are idempotent across retries',async()=>{
 const tx=database(),d=data();await syncDeveloperNotifications(tx,d);const count=tx.notifications.length,history=tx.activity.length;
 await syncDeveloperNotifications(tx,d);assert.equal(tx.notifications.length,count);assert.equal(tx.activity.length,history);
 assert.equal(tx.events.has('join:7'),true);assert.equal(tx.events.has('submission:11'),true);
 const n=tx.notifications.find(n=>n.metadata.category==='submissions');assert.match(n.url,/viewCampaign=5/);assert.match(n.url,/submission=11/);assert.equal(n.metadata.campaignId,5);
});
test('nearby uploads group into a single unread submission notification',async()=>{
 const tx=database(),d=data();await syncDeveloperNotifications(tx,d);
 d.submissions.push({...d.submissions[0],id:12,content_type:'screenshot'});await syncDeveloperNotifications(tx,d);
 const notices=tx.notifications.filter(n=>n.metadata.category==='submissions');assert.equal(notices.length,1);assert.deepEqual(notices[0].metadata.submissionIds,[11,12]);assert.match(notices[0].message,/1 gameplay clip and 1 screenshot/);
});
test('legacy history is preserved without retrospective notification spam',async()=>{
 const tx=database(),d=data();d.participants[0].joined_at='2025-01-01';d.submissions[0].submitted_at='2025-01-02';await syncDeveloperNotifications(tx,d);assert.equal(tx.notifications.length,0);
});
