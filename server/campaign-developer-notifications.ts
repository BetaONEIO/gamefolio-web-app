import {sql} from 'drizzle-orm';
export {syncDeveloperNotifications} from './campaign-developer-notification-events';
import {db} from './db';
import {sendEmail} from './email-service';
const rows=(r:any):any[]=>r.rows??r;
export const CAMPAIGN_EMAIL_CATEGORIES=['joins','submissions','reviews','creator_completions','deadlines','campaign_completion'] as const;
let ready:Promise<void>|null=null;
export async function ensureDeveloperNotifications(){
 if(!ready)ready=(async()=>{
  await db.execute(sql`CREATE TABLE IF NOT EXISTS campaign_notification_rollout(id INTEGER PRIMARY KEY DEFAULT 1,started_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
  await db.execute(sql`INSERT INTO campaign_notification_rollout(id) VALUES(1) ON CONFLICT DO NOTHING`);
  await db.execute(sql`CREATE TABLE IF NOT EXISTS campaign_developer_notification_events(event_key TEXT PRIMARY KEY,campaign_id INTEGER NOT NULL REFERENCES campaign_instances(id),notification_id INTEGER REFERENCES notifications(id),created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
  await db.execute(sql`CREATE TABLE IF NOT EXISTS campaign_email_preferences(user_id INTEGER PRIMARY KEY REFERENCES users(id),preferences JSONB NOT NULL DEFAULT '{}'::jsonb)`);
  await db.execute(sql`CREATE TABLE IF NOT EXISTS campaign_notification_email_queue(notification_id INTEGER PRIMARY KEY REFERENCES notifications(id),user_id INTEGER NOT NULL REFERENCES users(id),category TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending',created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
 })().catch(e=>{ready=null;throw e;});await ready;
}
const escape=(text:string)=>text.replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]!));
export async function deliverCampaignEmails(){
 if(process.env.NODE_ENV!=='production'||!process.env.BREVO_API_KEY)return;
 const queue=rows(await db.execute(sql`UPDATE campaign_notification_email_queue SET status='sending' WHERE notification_id IN (SELECT notification_id FROM campaign_notification_email_queue WHERE status='pending' AND created_at<NOW()-INTERVAL '5 minutes' ORDER BY created_at LIMIT 20 FOR UPDATE SKIP LOCKED) RETURNING *`));
 for(const item of queue){const [n]=rows(await db.execute(sql`SELECT n.title,n.message,n.action_url,u.email FROM notifications n JOIN users u ON u.id=n.user_id JOIN campaign_email_preferences p ON p.user_id=u.id WHERE n.id=${item.notification_id} AND p.preferences->>${item.category}='true'`));
  const sent=n?await sendEmail({to:n.email,subject:n.title,html:`<p>${escape(n.message)}</p><p><a href="https://app.gamefolio.com${escape(n.action_url)}">View campaign</a></p>`}):true;
  await db.execute(sql`UPDATE campaign_notification_email_queue SET status=${sent?'sent':'failed'} WHERE notification_id=${item.notification_id}`);
 }
}
