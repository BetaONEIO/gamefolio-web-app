import { sql } from 'drizzle-orm';
// The participant lock makes approval retries and creator key claims converge on one allocation.
export async function unlockApprovedCompletionAccess(tx:any,instanceId:number,participantId:number) {
  const rows=(r:any):any[]=>r.rows??r;
  const [p]=rows(await tx.execute(sql`SELECT p.*,ci.completion_reward_key_required FROM campaign_participants p JOIN campaign_instances ci ON ci.id=p.instance_id WHERE p.id=${participantId} AND p.instance_id=${instanceId} FOR UPDATE OF p`));
  if(!p || !p.completion_reward_key_required || !['completed_and_verified','completed','full_game_awarded'].includes(p.status) || p.full_key_id)return;
  if(!p.completion_reward_key_id)throw new Error('Completion access has no reserved key');
  const [key]=rows(await tx.execute(sql`UPDATE game_keys SET status='rewarded',rewarded_at=COALESCE(rewarded_at,NOW()) WHERE id=${p.completion_reward_key_id} AND instance_id=${instanceId} AND assigned_user_id=${p.user_id} AND key_pool='reward' AND status IN ('reserved','assigned') AND removed_at IS NULL RETURNING id`));
  if(!key)throw new Error('Reserved completion access is unavailable');
  await tx.execute(sql`UPDATE campaign_participants SET full_key_id=${key.id},status='completed',completed_at=COALESCE(completed_at,NOW()) WHERE id=${p.id}`);
  await tx.execute(sql`INSERT INTO campaign_key_events (key_id,instance_id,participant_id,event_type,from_status,to_status) VALUES (${key.id},${instanceId},${p.id},'full_game_unlocked','reserved','rewarded')`);
}
