import { sql } from 'drizzle-orm';
// The participation transaction owns this call. A revealed key is never recycled.
export async function releaseUnrevealedCampaignAccess(tx:any,keyId:number|null,accessWasRevealed:boolean) {
  if(!keyId||accessWasRevealed)return false;
  const result=await tx.execute(sql`UPDATE game_keys SET status='available',assigned_user_id=NULL,assigned_participant_id=NULL,assigned_at=NULL
    WHERE id=${keyId} AND status='reserved' AND revealed_at IS NULL RETURNING id`);
  return (result.rows??result).length>0;
}
