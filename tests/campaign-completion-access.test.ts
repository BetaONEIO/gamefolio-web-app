import test from 'node:test';
import assert from 'node:assert/strict';
import { PgDialect } from 'drizzle-orm/pg-core';
import { unlockApprovedCompletionAccess } from '../server/campaign-completion-access';
const dialect=new PgDialect();
test('approval unlock binds the reserved key once and retries do not issue another',async()=>{
  const p:any={id:4,user_id:8,status:'completed_and_verified',completion_reward_key_required:true,completion_reward_key_id:9};let keyUpdates=0;
  const tx={execute:async(q:any)=>{const statement=dialect.sqlToQuery(q).sql;if(statement.startsWith('SELECT'))return[p];if(statement.startsWith('UPDATE game_keys')){keyUpdates++;return[{id:9}];}if(statement.startsWith('UPDATE campaign_participants')){p.full_key_id=9;p.status='completed';}return[];}};
  await unlockApprovedCompletionAccess(tx,2,4);await unlockApprovedCompletionAccess(tx,2,4);assert.equal(keyUpdates,1);
});
test('unapproved work cannot unlock completion access',async()=>{
  let writes=0;const tx={execute:async(q:any)=>{const statement=dialect.sqlToQuery(q).sql;if(statement.startsWith('SELECT'))return[{status:'submitted_for_review',completion_reward_key_required:true}];writes++;return[];}};
  await unlockApprovedCompletionAccess(tx,2,4);assert.equal(writes,0);
});
