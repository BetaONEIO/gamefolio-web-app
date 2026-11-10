import { sql } from 'drizzle-orm';
export const rows=(result:any):any[]=>result.rows??result;
export const PUBLIC_BOUNTY_EVENTS=['listing_impression','listing_open','game_page_visit'] as const;
export async function recordBountyFunnel(tx:any,event:{programmeId?:number|null;instanceId?:number|null;type:string;actor?:number|null;key:string;contentType?:string|null}) {
  await tx.execute(sql`INSERT INTO bounty_funnel_events(programme_id,instance_id,event_type,actor_user_id,event_key,content_type)
    VALUES(${event.programmeId??null},${event.instanceId??null},${event.type},${event.actor??null},${event.key},${event.contentType??null}) ON CONFLICT DO NOTHING`);
}
export async function discoveryAnalytics(tx:any,programmeId:number,ids:number[]) {
  const events=rows(await tx.execute(sql`SELECT event_type,COUNT(*)::int AS count FROM bounty_funnel_events WHERE programme_id=${programmeId} GROUP BY event_type`));
  const result=Object.fromEntries(events.map(e=>[e.event_type,Number(e.count)]));
  if(!ids.length)return result;
  const scope=sql`IN(${sql.join(ids.map(id=>sql`${id}`),sql`,`)})`;
  const [actual]=rows(await tx.execute(sql`SELECT
    (SELECT COUNT(*)::int FROM campaign_participants WHERE instance_id ${scope}) AS opportunities_claimed,
    (SELECT COUNT(*)::int FROM campaign_participants WHERE instance_id ${scope} AND access_accepted_at IS NOT NULL) AS participation_started,
    (SELECT COUNT(*)::int FROM campaign_key_events WHERE instance_id ${scope} AND event_type='reserved') AS key_claims,
    (SELECT COUNT(*)::int FROM campaign_bounty_submissions WHERE instance_id ${scope} ) AS submission_started,
    (SELECT COUNT(*)::int FROM campaign_bounty_submissions WHERE instance_id ${scope} AND status<>'staged') AS submission_completed,
    (SELECT COUNT(*)::int FROM campaign_bounty_submissions WHERE instance_id ${scope} AND status='approved') AS submission_approved`));
  return {...result,...actual};
}
