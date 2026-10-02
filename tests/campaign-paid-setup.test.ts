import test from 'node:test';
import assert from 'node:assert/strict';
import { PgDialect } from 'drizzle-orm/pg-core';
import { activatePaidCampaignInTransaction } from '../server/campaign-paid-setup';
const dialect = new PgDialect();
function fixture({paid=true, fulfilled=false, keys=2, requiresKey=false, scheduled=false}={}) {
  const state = { activations: 0, receipt: {transaction_id: paid ? 'pi_example' : null, status: fulfilled ? 'fulfilled' : 'setup_processing', developer_id:7}, queries: [] as string[] };
  const tx = { execute: async (query: any) => {
    const {sql,params} = dialect.sqlToQuery(query); state.queries.push(sql);
    if (sql.includes('SELECT * FROM campaign_payments')) { assert.match(sql,/FOR UPDATE/); return [state.receipt]; }
    if (sql.includes('SELECT * FROM campaign_instances')) return [{developer_user_id:7,max_places:2,requires_access_key:requiresKey,access_method:'full_game_upfront', game_id:9,start_type:scheduled?'scheduled':'asap', scheduled_start:'2099-01-01T12:00:00Z'}];
    if (sql.includes('SELECT id FROM game_keys')) return Array.from({length:keys},(_,i)=>({id:i+1}));
    if (sql.includes('UPDATE campaign_instances')) {state.activations++; assert.equal(params[0],scheduled?'scheduled':'live');}
    if (sql.includes("status = 'fulfilled'")) state.receipt.status='fulfilled';
    return [];
  }};
  return {state,tx};
}
test('no paid receipt means no activation or key reservation', async()=>{const {state,tx}=fixture({paid:false});await activatePaidCampaignInTransaction(tx,12);assert.equal(state.activations,0);assert.equal(state.queries.length,1);});
test('replayed callback does not activate or reserve twice', async()=>{const {state,tx}=fixture({requiresKey:true});await activatePaidCampaignInTransaction(tx,12);await activatePaidCampaignInTransaction(tx,12);assert.equal(state.activations,1);assert.equal(state.queries.filter(q=>q.includes('UPDATE game_keys')).length,1);});
test('scheduled paid campaign uses scheduled status', async()=>{const {state,tx}=fixture({scheduled:true});await activatePaidCampaignInTransaction(tx,12);assert.equal(state.activations,1);});
test('insufficient keys prevents activation', async()=>{const {state,tx}=fixture({requiresKey:true,keys:1});await assert.rejects(activatePaidCampaignInTransaction(tx,12),/Not enough compatible keys/);assert.equal(state.activations,0);assert.equal(state.receipt.status,'setup_processing');});
