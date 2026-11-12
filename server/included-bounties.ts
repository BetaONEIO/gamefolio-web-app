import { hasRegularBountySubmission } from './services/regular-bounty-submissions';
import { sql } from 'drizzle-orm';
import { db } from './db';
import { randomUUID } from 'node:crypto';
import { monthlyTemplate, includedMonth, bountyKeyType, assertIncludedActivation, type MonthlyOutcome } from '../shared/included-bounty';
import { discoveryTemplate, opportunityTypes, type CreatorPreference, type OpportunityType } from '../shared/bounty-discovery';
import { CUSTOM_OBJECTIVE_VALUES } from '../shared/bounty-rewards';
import { bountyGameAvailabilityIssue } from '../shared/bounty-game-availability';

export const bountyRows = (result: any): any[] => result.rows ?? result;
// Shared game inventory is visible to included bounties without pre-reserving keys.
// Aliases are fixed by the existing marketplace queries.
export const includedAccessKeyScope = () => sql`(gk.instance_id=ci.id OR (gk.instance_id IS NULL AND gk.game_id=ci.game_id AND gk.developer_user_id=ci.developer_user_id
  AND gk.removed_at IS NULL AND gk.revealed_at IS NULL AND gk.assigned_user_id IS NULL AND gk.assigned_participant_id IS NULL
  AND (EXISTS(SELECT 1 FROM included_bounty_months ibm WHERE ibm.instance_id=ci.id) OR EXISTS(SELECT 1 FROM included_bounty_opportunities ibo WHERE ibo.instance_id=ci.id))))`;
export const existingDiscoveryKey = (userId: number | null) => sql`(
  SELECT gk.id FROM game_keys gk JOIN campaign_instances origin ON origin.id=gk.instance_id
  WHERE ci.confirmed_terms->>'model'='discovery-v2'
    AND origin.confirmed_terms->>'programmeId'=ci.confirmed_terms->>'programmeId'
    AND gk.assigned_user_id=${userId} AND gk.revealed_at IS NOT NULL AND gk.removed_at IS NULL
    AND gk.key_pool='access' AND gk.key_type=CASE ci.access_method WHEN 'full_game_upfront' THEN 'full' WHEN 'private_playtest' THEN 'demo' END
  ORDER BY gk.id LIMIT 1)`;
let ready: Promise<void> | undefined;
export function ensureIncludedBounties() {
  return ready ??= (async () => {
    await db.execute(sql`CREATE TABLE IF NOT EXISTS included_bounty_programmes (
      id SERIAL PRIMARY KEY, developer_user_id INTEGER NOT NULL UNIQUE REFERENCES users(id),
      profile_game_id INTEGER NOT NULL REFERENCES indie_game_profiles(id), game_id INTEGER NOT NULL,
      access_method TEXT NOT NULL, next_outcome TEXT NOT NULL CHECK(next_outcome IN ('content','stream')),
      is_open BOOLEAN NOT NULL DEFAULT true, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    await db.execute(sql`CREATE TABLE IF NOT EXISTS included_bounty_months (
      id SERIAL PRIMARY KEY, programme_id INTEGER NOT NULL REFERENCES included_bounty_programmes(id),
      period_start TIMESTAMP NOT NULL, period_end TIMESTAMP NOT NULL,
      outcome TEXT NOT NULL, instance_id INTEGER NOT NULL UNIQUE REFERENCES campaign_instances(id),
      legacy BOOLEAN NOT NULL DEFAULT false, UNIQUE(programme_id,period_start))`);
    await db.execute(sql`CREATE TABLE IF NOT EXISTS included_bounty_notices (
      programme_id INTEGER NOT NULL REFERENCES included_bounty_programmes(id), period_start TIMESTAMP NOT NULL,
      kind TEXT NOT NULL, PRIMARY KEY(programme_id,period_start,kind))`);
    await db.execute(sql`CREATE TABLE IF NOT EXISTS included_bounty_introductions (user_id INTEGER PRIMARY KEY REFERENCES users(id),seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    await db.execute(sql`ALTER TABLE included_bounty_programmes ADD COLUMN IF NOT EXISTS opted_out_at TIMESTAMPTZ`);
    await db.execute(sql`ALTER TABLE included_bounty_programmes ADD COLUMN IF NOT EXISTS model_version TEXT NOT NULL DEFAULT 'monthly-v1'`);
    await db.execute(sql`ALTER TABLE included_bounty_programmes ADD COLUMN IF NOT EXISTS activity_preference TEXT NOT NULL DEFAULT 'both'`);
    await db.execute(sql`ALTER TABLE included_bounty_programmes DROP CONSTRAINT IF EXISTS included_bounty_programmes_developer_user_id_key`);
    await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS included_bounty_programme_game_unique ON included_bounty_programmes(developer_user_id,profile_game_id)`);
    await db.execute(sql`CREATE TABLE IF NOT EXISTS included_bounty_opportunities (
      programme_id INTEGER NOT NULL REFERENCES included_bounty_programmes(id), opportunity_type TEXT NOT NULL,
      instance_id INTEGER NOT NULL UNIQUE REFERENCES campaign_instances(id), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY(programme_id,opportunity_type))`);
    await db.execute(sql`CREATE TABLE IF NOT EXISTS included_bounty_opportunity_history (
      programme_id INTEGER NOT NULL REFERENCES included_bounty_programmes(id),
      instance_id INTEGER PRIMARY KEY REFERENCES campaign_instances(id))`);
    await db.execute(sql`CREATE TABLE IF NOT EXISTS bounty_funnel_events (
      id BIGSERIAL PRIMARY KEY, programme_id INTEGER REFERENCES included_bounty_programmes(id), instance_id INTEGER REFERENCES campaign_instances(id),
      event_type TEXT NOT NULL, content_type TEXT, actor_user_id INTEGER, event_key TEXT NOT NULL UNIQUE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS bounty_funnel_programme_event_idx ON bounty_funnel_events(programme_id,event_type,created_at)`);

  })().catch(error => { ready = undefined; throw error; });
}
export async function includedPlan(tx: any, developerId: number) {
  const [user] = bountyRows(await tx.execute(sql`SELECT role,partner_type,is_indie_dev_subscriber,indie_dev_subscription_start_date,indie_dev_subscription_end_date FROM users WHERE id=${developerId}`));
  const period = user?.is_indie_dev_subscriber ? includedMonth(user.indie_dev_subscription_start_date, user.indie_dev_subscription_end_date) : null;
  return { eligible: !!period, period, developer: !!user && (['developer','indie_developer','admin','moderator'].includes(user.role) || user.partner_type === 'indie' || user.is_indie_dev_subscriber) };
}
export async function includedInventory(tx: any, developerId: number, gameId: number) {
  const counts = bountyRows(await tx.execute(sql`SELECT key_type,
    COUNT(*) FILTER(WHERE status='available' AND instance_id IS NULL AND assigned_user_id IS NULL AND assigned_participant_id IS NULL AND revealed_at IS NULL)::int AS available,
    COUNT(*) FILTER(WHERE status='reserved' AND revealed_at IS NULL)::int AS reserved,
    COUNT(*) FILTER(WHERE revealed_at IS NOT NULL OR status IN ('assigned','claimed','revealed','rewarded'))::int AS issued
    FROM game_keys WHERE developer_user_id=${developerId} AND game_id=${gameId} AND key_pool='access' AND removed_at IS NULL GROUP BY key_type`));
  return Object.fromEntries(['demo','full'].map(type => [type, counts.find(row => row.key_type === type) ?? { available: 0, reserved: 0, issued: 0 }]));
}
async function makeTemplate(tx: any, outcome: MonthlyOutcome) {
  const definition = monthlyTemplate(outcome);
  const [template] = bountyRows(await tx.execute(sql`INSERT INTO campaign_templates
    (name,slug,category,description,duration,participant_capacity,demo_keys_required,full_keys_required,completion_reward,bounty_xp_reward,completion_bonus_xp,reward_config,status,objective_config,access_method,max_places,requires_access_key)
    VALUES(${outcome==='content'?'Content Drop':'Stream Spotlight'},${`included-${outcome}-${randomUUID()}`},'custom','Included monthly Gamefolio bounty',${definition.deadlineDays},1,0,0,'bounty_xp',${definition.xp},${definition.completionBonus},${JSON.stringify({totalReward:definition.xp,completionBonus:definition.completionBonus})}::jsonb,'archived',${JSON.stringify(definition.objectives)}::jsonb,'free_to_play',1,false) RETURNING id`));
  const snapshot = [];
  const names: Record<string,string> = {clip:'Gameplay clips',reel:'Vertical reels',screenshot:'Screenshots',feedback:'Creator feedback',stream:'Verified livestream'};
  for (const [type,quantity] of Object.entries(definition.objectives)) {
    const [objective] = bountyRows(await tx.execute(sql`INSERT INTO campaign_template_bounties(template_id,title,description,quantity,mandatory,completion_order,xp_reward,validation_method,content_type)
      VALUES(${template.id},${names[type]},${`Submit ${quantity} ${names[type]}`},${quantity},true,${snapshot.length},${CUSTOM_OBJECTIVE_VALUES[type]?.unitReward??0},'manual_review',${type}) RETURNING *`));
    snapshot.push(objective);
  }
  return { ...definition, templateId: Number(template.id), snapshot };
}
async function notice(tx: any, programme: any, period: { start: Date }, kind: string, title: string, message: string) {
  const claimed = bountyRows(await tx.execute(sql`INSERT INTO included_bounty_notices(programme_id,period_start,kind) VALUES(${programme.id},${period.start.toISOString()},${kind}) ON CONFLICT DO NOTHING RETURNING programme_id`));
  if (claimed.length) await tx.execute(sql`INSERT INTO notifications(user_id,type,title,message,action_url) VALUES(${programme.developer_user_id},'campaign_activity',${title},${message},${`/game-dashboard?tab=campaigns&campaignSub=bounties&gameId=${programme.profile_game_id}`})`);
}
// Caller holds the account advisory lock. The shared allowance ledger is authoritative.
export async function ensureIncludedMonth(tx: any, programme: any, plan: Awaited<ReturnType<typeof includedPlan>>) {
  if (!plan.period) return null;
  const period = plan.period;
  const [existing] = bountyRows(await tx.execute(sql`SELECT * FROM included_bounty_months WHERE programme_id=${programme.id} AND period_start=${period.start.toISOString()}`));
  if (existing) return existing;
  const [allowance] = bountyRows(await tx.execute(sql`SELECT a.*,ci.status,ci.stream_config FROM campaign_starter_allowances a JOIN campaign_instances ci ON ci.id=a.instance_id
    WHERE a.developer_user_id=${programme.developer_user_id} AND a.period_start<${period.end.toISOString()} AND a.period_end>${period.start.toISOString()} ORDER BY a.period_start DESC LIMIT 1`));
  if (allowance) {
    const [activity]=bountyRows(await tx.execute(sql`SELECT EXISTS(SELECT 1 FROM campaign_participants WHERE instance_id=${allowance.instance_id}) AS has_claims`));
    if(['draft','changes_requested'].includes(allowance.status)&&!activity.has_claims) {
      // Release only the unused draft's allowance reservation. Keep the draft itself intact.
      await tx.execute(sql`DELETE FROM campaign_starter_allowances WHERE id=${allowance.id}`);
    } else {
    const [month] = bountyRows(await tx.execute(sql`INSERT INTO included_bounty_months(programme_id,period_start,period_end,outcome,instance_id,legacy)
      VALUES(${programme.id},${period.start.toISOString()},${period.end.toISOString()},${allowance.stream_config?'stream':'content'},${allowance.instance_id},true) ON CONFLICT DO NOTHING RETURNING *`));
    return month;
    }
  }
  if (!programme.is_open) return null;
  const inventory = await includedInventory(tx, programme.developer_user_id, programme.game_id);
  const keyType = bountyKeyType(programme.access_method);
  if (keyType && Number(inventory[keyType].available) < 1) {
    await notice(tx, programme, period, 'keys', 'Add keys to keep bounties open', 'Your monthly bounty is ready. Add a valid game key so a creator can join.');
    return null;
  }
  const [profile] = bountyRows(await tx.execute(sql`SELECT * FROM indie_game_profiles WHERE id=${programme.profile_game_id} AND user_id=${programme.developer_user_id}`));
  if (!profile) throw new Error('The registered game is no longer available');
  if (bountyGameAvailabilityIssue(profile.platforms, profile.available_regions)) return null;
  const config = await makeTemplate(tx, programme.next_outcome);
  const [instance] = bountyRows(await tx.execute(sql`INSERT INTO campaign_instances
    (template_id,developer_user_id,campaign_title,description,game_id,game_name,game_artwork_url,platforms,regions,status,start_type,actual_start,end_date,submitted_at,approved_at,max_places,access_method,requires_access_key,completion_reward_type,completion_reward_key_required,creator_deadline_days,application_period_days,objective_snapshot,stream_config,bounty_xp_reward,completion_bonus_xp,reward_config,confirmed_terms,commercial_type,budget_pence,lifecycle_state,billing_period_start,billing_period_end,manual_approval_required)
    VALUES(${config.templateId},${programme.developer_user_id},${`${profile.game_name} · ${programme.next_outcome==='content'?'Content Drop':'Stream Spotlight'}`},${profile.short_description||'Play, create and share.'},${programme.game_id},${profile.game_name},${profile.header_image_url??null},ARRAY(SELECT jsonb_array_elements_text(${JSON.stringify(profile.platforms??[])}::jsonb)),'worldwide','live','asap',NOW(),${period.end.toISOString()},NOW(),NOW(),1,${programme.access_method},${!!keyType},'bounty_xp',false,${config.deadlineDays},30,${JSON.stringify(config.snapshot)}::jsonb,${config.streamConfig?JSON.stringify(config.streamConfig):null}::jsonb,${config.xp},${config.completionBonus},${JSON.stringify({totalReward:config.xp,completionBonus:config.completionBonus})}::jsonb,${JSON.stringify({model:'included-monthly-v1',programmeId:programme.id,outcome:programme.next_outcome,platforms:profile.platforms,regions:profile.available_regions})}::jsonb,'included',0,'accepting',${period.start.toISOString()},${period.end.toISOString()},false) RETURNING id`));
  await tx.execute(sql`INSERT INTO campaign_starter_allowances(developer_user_id,period_start,period_end,instance_id) VALUES(${programme.developer_user_id},${period.start.toISOString()},${period.end.toISOString()},${instance.id})`);
  const [month] = bountyRows(await tx.execute(sql`INSERT INTO included_bounty_months(programme_id,period_start,period_end,outcome,instance_id) VALUES(${programme.id},${period.start.toISOString()},${period.end.toISOString()},${programme.next_outcome},${instance.id}) RETURNING *`));
  return month;
}

export async function activateIncludedInTransaction(tx: any, developerId: number, input: { profileGameId: number; access: string; outcome: MonthlyOutcome }) {
  // Same lock as monthly rollover: repeat clicks and multiple app servers cannot spend twice.
  await tx.execute(sql`SELECT pg_advisory_xact_lock(48391,${developerId})`);
  const plan = await includedPlan(tx, developerId);
  const [existing] = bountyRows(await tx.execute(sql`SELECT * FROM included_bounty_programmes WHERE developer_user_id=${developerId} FOR UPDATE`));
  if (existing) return { programme: existing, month: await ensureIncludedMonth(tx, existing, plan), repeated: true };
  const [game] = bountyRows(await tx.execute(sql`SELECT * FROM indie_game_profiles WHERE id=${input.profileGameId} AND user_id=${developerId}`));
  const inventory = game?.catalog_game_id ? await includedInventory(tx, developerId, game.catalog_game_id) : {};
  const keyType = bountyKeyType(input.access);
  monthlyTemplate(input.outcome);
  assertIncludedActivation({eligible:plan.eligible,owned:!!game?.catalog_game_id,access:input.access,availableKeys:keyType?Number(inventory[keyType]?.available??0):0,used:false});
  const issue = bountyGameAvailabilityIssue(game.platforms, game.available_regions);
  if (issue) throw new Error(issue);
  const [programme] = bountyRows(await tx.execute(sql`INSERT INTO included_bounty_programmes(developer_user_id,profile_game_id,game_id,access_method,next_outcome) VALUES(${developerId},${game.id},${game.catalog_game_id},${input.access},${input.outcome}) RETURNING *`));
  return { programme, month: await ensureIncludedMonth(tx, programme, plan), repeated: false };
}

// Run inside the EXISTING creator join transaction, after locking the campaign.
// It only attaches inventory; existing reservation/reveal/cancellation code remains authoritative.
export async function prepareIncludedBountyClaim(tx: any, instanceId: number, userId?: number, startOnSubmission = false, hasGameAccess = false) {
  await ensureIncludedBounties();
  const [bounty] = bountyRows(await tx.execute(sql`SELECT p.*,ci.billing_period_end AS period_end,true AS discovery FROM included_bounty_opportunities o JOIN included_bounty_programmes p ON p.id=o.programme_id JOIN campaign_instances ci ON ci.id=o.instance_id WHERE o.instance_id=${instanceId}
    UNION ALL SELECT p.*,NULL::timestamp,true FROM included_bounty_opportunity_history h JOIN included_bounty_programmes p ON p.id=h.programme_id WHERE h.instance_id=${instanceId}
    UNION ALL SELECT p.*,m.period_end,false AS discovery FROM included_bounty_months m JOIN included_bounty_programmes p ON p.id=m.programme_id WHERE m.instance_id=${instanceId} LIMIT 1`));
  if (!bounty) return false;
  const plan = await includedPlan(tx, bounty.developer_user_id);
  if (bounty.discovery && bountyRows(await tx.execute(sql`SELECT 1 FROM included_bounty_opportunity_history WHERE instance_id=${instanceId}`)).length)throw Object.assign(new Error('This bounty is not accepting creators'),{statusCode:409});
  if (!bounty.is_open || !plan.eligible || bounty.period_end && new Date(bounty.period_end) <= new Date()) throw Object.assign(new Error('This bounty is not accepting creators'),{statusCode:409});
  if(bounty.discovery && userId) {
    const [opportunity] = bountyRows(await tx.execute(sql`SELECT opportunity_type FROM included_bounty_opportunities WHERE instance_id = ${instanceId}`));
    if (opportunity && await hasRegularBountySubmission(tx, instanceId, userId, opportunity.opportunity_type)) {
      throw Object.assign(new Error('You already submitted this type of content for this bounty'), { statusCode: 409 });
    }
    // The join handler holds the creator's row lock. Public-access submissions
    // can run in parallel across content types, including while awaiting review.
    const [active] = bountyRows(await tx.execute(sql`
      SELECT 1 FROM campaign_participants cp
      JOIN campaign_instances ci ON ci.id = cp.instance_id
      WHERE (cp.instance_id IN (SELECT instance_id FROM included_bounty_opportunities WHERE programme_id = ${bounty.id})
        OR cp.instance_id IN (SELECT instance_id FROM included_bounty_opportunity_history WHERE programme_id = ${bounty.id}))
        AND cp.user_id = ${userId}
        AND (ci.billing_period_end IS NULL OR ci.billing_period_end > NOW() AT TIME ZONE 'UTC')
        AND cp.status NOT IN ('expired','cancelled','rejected','withdrawn','removed','completed','completed_and_verified','full_game_awarded')
        AND (${!opportunity || (!startOnSubmission && !hasGameAccess)} OR ci.confirmed_terms->>'opportunity' = ${opportunity?.opportunity_type ?? null})
      LIMIT 1
    `));
    if (active) throw Object.assign(new Error('Complete or cancel your current opportunity for this game before claiming another'), {statusCode:409});
  }
  const type = bountyKeyType(bounty.access_method);
  if (type && !hasGameAccess) {
    const [key] = bountyRows(await tx.execute(sql`SELECT id FROM game_keys WHERE developer_user_id=${bounty.developer_user_id} AND game_id=${bounty.game_id} AND key_type=${type} AND key_pool='access'
      AND removed_at IS NULL AND revealed_at IS NULL AND assigned_user_id IS NULL AND assigned_participant_id IS NULL
      AND ((instance_id=${instanceId} AND status IN('available','reserved')) OR (instance_id IS NULL AND status='available'))
      ORDER BY CASE WHEN instance_id=${instanceId} THEN 0 ELSE 1 END,id LIMIT 1 FOR UPDATE SKIP LOCKED`));
    if (!key) throw Object.assign(new Error('No valid game keys remain for this bounty'),{statusCode:409});
    await tx.execute(sql`UPDATE game_keys SET instance_id=${instanceId},status='available' WHERE id=${key.id}`);
  }
  return true;
}

export async function syncIncludedBounties(developerId?: number, publicGameId?: number | null) {
  await ensureIncludedBounties();
  const programmes = bountyRows(await db.execute(sql`SELECT p.id,p.developer_user_id FROM included_bounty_programmes p
    WHERE p.model_version='discovery-v2' AND ${developerId ? sql`p.developer_user_id=${developerId}` : sql`p.is_open=true`}
    ${publicGameId === undefined ? sql`` : sql`
      AND (${publicGameId}::int IS NULL OR p.game_id=${publicGameId})
      AND EXISTS (SELECT 1 FROM included_bounty_opportunities o JOIN campaign_instances ci ON ci.id=o.instance_id
        WHERE o.programme_id=p.id AND (ci.billing_period_start IS NULL OR ci.billing_period_end <= NOW() AT TIME ZONE 'UTC'
          OR ci.end_date IS NOT NULL AND ci.status IN ('live','approved','in_progress')))`}`));
  for (const row of programmes) await db.transaction(async tx => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(48391,${row.developer_user_id})`);
    const [programme] = bountyRows(await tx.execute(sql`SELECT * FROM included_bounty_programmes WHERE id=${row.id} FOR UPDATE`));
    if(programme.is_open && (await includedPlan(tx,row.developer_user_id)).eligible)await ensureDiscoveryOpportunities(tx,programme);
  });
}

export async function setIncludedAvailability(tx: any, developerId: number, open: boolean, optOut = false, profileGameId?:number) {
  if (typeof open !== 'boolean' || typeof optOut !== 'boolean' || open && optOut) throw new Error('Choose whether bounties are open');
  await tx.execute(sql`SELECT pg_advisory_xact_lock(48391,${developerId})`);
  const [programme] = bountyRows(await tx.execute(sql`SELECT * FROM included_bounty_programmes WHERE developer_user_id=${developerId} AND ${profileGameId?sql`profile_game_id=${profileGameId}`:sql`true`} ORDER BY id LIMIT 1`));
  if (!programme) throw new Error('Open your game for bounties first');
  const plan = await includedPlan(tx, developerId);
  if (open && !plan.eligible) throw new Error('An active Indie Game Pro membership is required');
  if (open) {
    const [game] = bountyRows(await tx.execute(sql`SELECT platforms,available_regions FROM indie_game_profiles
      WHERE id=${programme.profile_game_id} AND user_id=${developerId} AND catalog_game_id=${programme.game_id} FOR SHARE`));
    const issue = bountyGameAvailabilityIssue(game?.platforms, game?.available_regions);
    if (issue) throw new Error(issue);
  }
  // Campaign locks serialize this transition with creator joins. Existing work stays intact.
  await tx.execute(sql`UPDATE campaign_instances SET applications_paused=${!open},updated_at=NOW()
    WHERE (id IN(SELECT instance_id FROM included_bounty_opportunities WHERE programme_id=${programme.id}) OR id IN(SELECT instance_id FROM included_bounty_months WHERE programme_id=${programme.id}) OR developer_user_id=${developerId} AND game_id=${programme.game_id} AND commercial_type IN('starter','included'))
    AND status IN('live','in_progress','approved')`);
  await tx.execute(sql`UPDATE included_bounty_programmes SET is_open=${open},opted_out_at=CASE WHEN ${optOut} THEN NOW() WHEN ${open} THEN NULL ELSE opted_out_at END WHERE id=${programme.id}`);
  await tx.execute(sql`UPDATE campaign_instances SET applications_paused=true WHERE id IN(SELECT instance_id FROM included_bounty_opportunity_history WHERE programme_id=${programme.id})`);
  if(open&&programme.model_version==='discovery-v2')await ensureDiscoveryOpportunities(tx,{...programme,is_open:true});
}

export async function changeIncludedOutcome(tx: any, developerId: number, outcome: MonthlyOutcome, nextMonth: boolean) {
  monthlyTemplate(outcome);
  const [programme] = bountyRows(await tx.execute(sql`SELECT * FROM included_bounty_programmes WHERE developer_user_id=${developerId}`));
  if (!programme) throw new Error('Open your game for bounties first');
  const plan = await includedPlan(tx, developerId);
  if (!plan.eligible) throw new Error('An active Indie Game Pro membership is required');
  const [month] = bountyRows(await tx.execute(sql`SELECT m.* FROM included_bounty_months m JOIN campaign_instances ci ON ci.id=m.instance_id WHERE m.programme_id=${programme.id} AND m.period_start=${plan.period!.start.toISOString()} FOR UPDATE OF ci`));
  if (!nextMonth && month) {
    const [claims] = bountyRows(await tx.execute(sql`SELECT COUNT(*)::int AS count FROM campaign_participants WHERE instance_id=${month.instance_id}`));
    if (Number(claims.count)>0 || month.legacy) throw Object.assign(new Error('This month’s outcome is locked. You can change next month’s bounty instead.'),{statusCode:409});
    const config = await makeTemplate(tx, outcome);
    await tx.execute(sql`UPDATE campaign_instances SET template_id=${config.templateId},objective_snapshot=${JSON.stringify(config.snapshot)}::jsonb,stream_config=${config.streamConfig?JSON.stringify(config.streamConfig):null}::jsonb,bounty_xp_reward=${config.xp},completion_bonus_xp=${config.completionBonus},reward_config=${JSON.stringify({totalReward:config.xp,completionBonus:config.completionBonus})}::jsonb,campaign_title=game_name||${outcome==='content'?' · Content Drop':' · Stream Spotlight'},confirmed_terms=confirmed_terms||${JSON.stringify({outcome})}::jsonb,updated_at=NOW() WHERE id=${month.instance_id}`);
    await tx.execute(sql`UPDATE included_bounty_months SET outcome=${outcome} WHERE id=${month.id}`);
  }
  await tx.execute(sql`UPDATE included_bounty_programmes SET next_outcome=${outcome} WHERE id=${programme.id}`);
}


/** Standard opportunities are immutable snapshots. New preferences only change new-join availability. */
export async function ensureDiscoveryOpportunities(tx:any,programme:any) {
  const enabled=opportunityTypes(programme.activity_preference);
  const [profile]=bountyRows(await tx.execute(sql`SELECT * FROM indie_game_profiles WHERE id=${programme.profile_game_id} AND user_id=${programme.developer_user_id} FOR SHARE`));
  if(!profile)throw new Error('Choose a registered game that you own');
  const ready = !bountyGameAvailabilityIssue(profile.platforms, profile.available_regions);
  const monthStart = sql`date_trunc('month', NOW() AT TIME ZONE 'UTC')`;
  const nextMonth = sql`(${monthStart} + interval '1 month')`;
  for(const type of opportunityTypes('both')) {
    const [saved]=bountyRows(await tx.execute(sql`SELECT o.instance_id,
        ci.billing_period_end <= NOW() AT TIME ZONE 'UTC' AS previous_month
      FROM included_bounty_opportunities o JOIN campaign_instances ci ON ci.id=o.instance_id
      WHERE o.programme_id=${programme.id} AND o.opportunity_type=${type}`));
    if (saved?.previous_month && programme.is_open && ready) {
      await tx.execute(sql`UPDATE campaign_instances SET applications_paused=true,
        end_date=billing_period_end,updated_at=NOW() WHERE id=${saved.instance_id}`);
      // Serialize against access reveals and return only unused access keys.
      await tx.execute(sql`WITH unused AS (
        UPDATE campaign_participants SET status='expired',expired_at=NOW()
        WHERE instance_id=${saved.instance_id} AND access_revealed_at IS NULL
          AND status IN ('joined','access_reserved','accepted') RETURNING access_key_id
      ) UPDATE game_keys SET instance_id=NULL,status='available',assigned_user_id=NULL,assigned_participant_id=NULL,assigned_at=NULL
        WHERE instance_id=${saved.instance_id} AND key_pool='access' AND status IN ('available','reserved')
          AND revealed_at IS NULL AND removed_at IS NULL
          AND (id IN (SELECT access_key_id FROM unused) OR assigned_user_id IS NULL AND assigned_participant_id IS NULL)`);
      await tx.execute(sql`INSERT INTO included_bounty_opportunity_history(programme_id,instance_id)
        VALUES(${programme.id},${saved.instance_id}) ON CONFLICT DO NOTHING`);
      await tx.execute(sql`DELETE FROM included_bounty_opportunities WHERE instance_id=${saved.instance_id}`);
    } else if (saved) {
      await tx.execute(sql`UPDATE campaign_instances SET applications_paused=${!programme.is_open||!enabled.includes(type)||!!saved.previous_month},
        billing_period_start=COALESCE(billing_period_start,${monthStart}),billing_period_end=COALESCE(billing_period_end,${nextMonth}),
        end_date=CASE WHEN status IN ('live','approved','in_progress') AND NOT ${!!saved.previous_month} THEN NULL ELSE end_date END,
        updated_at=NOW()
        WHERE id=${saved.instance_id}`);
      continue;
    }
    if(!ready||!enabled.includes(type)||!programme.is_open)continue;
    const config=discoveryTemplate(type);
    const [template]=bountyRows(await tx.execute(sql`INSERT INTO campaign_templates(name,slug,category,description,duration,participant_capacity,demo_keys_required,full_keys_required,completion_reward,bounty_xp_reward,completion_bonus_xp,reward_config,status,objective_config,access_method,max_places,requires_access_key)
      VALUES(${config.title},${`discovery-${type}-${randomUUID()}`},'custom',${config.format+' '+config.quality},${config.deadlineDays},2147483647,0,0,'bounty_xp',${config.xp},${config.completionBonus},${JSON.stringify({totalReward:config.xp,completionBonus:config.completionBonus})}::jsonb,'archived',${JSON.stringify(config.objectives)}::jsonb,${programme.access_method},2147483647,${!!bountyKeyType(programme.access_method)}) RETURNING id`));
    const [objective]=bountyRows(await tx.execute(sql`INSERT INTO campaign_template_bounties(template_id,title,description,quantity,mandatory,completion_order,xp_reward,validation_method,content_type)
      VALUES(${template.id},${config.title},${config.format+' '+config.quality},1,true,0,${CUSTOM_OBJECTIVE_VALUES[type].unitReward},${type==='feedback'?'form_submission':'manual_review'},${type}) RETURNING *`));
    const [instance]=bountyRows(await tx.execute(sql`INSERT INTO campaign_instances(template_id,developer_user_id,campaign_title,description,game_id,game_name,game_artwork_url,platforms,regions,status,start_type,actual_start,end_date,submitted_at,approved_at,max_places,access_method,requires_access_key,completion_reward_type,completion_reward_key_required,creator_deadline_days,application_period_days,objective_snapshot,stream_config,bounty_xp_reward,completion_bonus_xp,reward_config,confirmed_terms,commercial_type,budget_pence,lifecycle_state,billing_period_start,billing_period_end,manual_approval_required)
      VALUES(${template.id},${programme.developer_user_id},${profile.game_name+' · '+config.title},${profile.short_description||'Discover, play and share your experience.'},${programme.game_id},${profile.game_name},${profile.header_image_url??null},NULL,NULL,'live','asap',NOW(),NULL,NOW(),NOW(),2147483647,${programme.access_method},${!!bountyKeyType(programme.access_method)},'bounty_xp',false,${config.deadlineDays},30,${JSON.stringify([objective])}::jsonb,${config.streamConfig?JSON.stringify(config.streamConfig):null}::jsonb,${config.xp},${config.completionBonus},${JSON.stringify({totalReward:config.xp,completionBonus:config.completionBonus})}::jsonb,${JSON.stringify({model:'discovery-v2',programmeId:programme.id,opportunity:type})}::jsonb,'included',0,'accepting',NULL,NULL,false) RETURNING id`));
    await tx.execute(sql`INSERT INTO included_bounty_opportunities(programme_id,opportunity_type,instance_id) VALUES(${programme.id},${type},${instance.id})`);
    await tx.execute(sql`UPDATE campaign_instances SET billing_period_start=${monthStart},billing_period_end=${nextMonth} WHERE id=${instance.id}`);
  }
}
export async function openDiscoveryInTransaction(tx:any,developerId:number,input:{profileGameId:number;access:string;preference:CreatorPreference}) {
  opportunityTypes(input.preference);
  await tx.execute(sql`SELECT pg_advisory_xact_lock(48391,${developerId})`);
  const plan=await includedPlan(tx,developerId);
  const [game]=bountyRows(await tx.execute(sql`SELECT * FROM indie_game_profiles WHERE id=${input.profileGameId} AND user_id=${developerId} FOR SHARE`));
  const inventory=game?.catalog_game_id?await includedInventory(tx,developerId,game.catalog_game_id):{};
  const keyType=bountyKeyType(input.access);
  assertIncludedActivation({eligible:plan.eligible,owned:!!game?.catalog_game_id,access:input.access,availableKeys:keyType?Number(inventory[keyType]?.available??0):0,used:false});
  const issue = bountyGameAvailabilityIssue(game.platforms, game.available_regions);
  if (issue) throw new Error(issue);
  let [programme]=bountyRows(await tx.execute(sql`SELECT * FROM included_bounty_programmes WHERE developer_user_id=${developerId} AND profile_game_id=${game.id} FOR UPDATE`));
  if(programme?.model_version==='discovery-v2') {
    // An explicit setup confirmation can resume/reconfigure the existing listing.
    // Keep prior snapshots, keys and creator work through the normal access path.
    if(programme.access_method!==input.access)await changeDiscoveryAccess(tx,developerId,game.id,input.access);
    await tx.execute(sql`UPDATE included_bounty_programmes SET activity_preference=${input.preference} WHERE id=${programme.id}`);
    await setIncludedAvailability(tx,developerId,true,false,game.id);
    [programme]=bountyRows(await tx.execute(sql`SELECT * FROM included_bounty_programmes WHERE id=${programme.id}`));
    return {programme,repeated:true};
  }
  if(programme) {
    // Keep every historical instance and its agreement; it stays linked in the dashboard.
    [programme]=bountyRows(await tx.execute(sql`UPDATE included_bounty_programmes SET model_version='discovery-v2',activity_preference=${input.preference},access_method=${input.access},is_open=true,opted_out_at=NULL WHERE id=${programme.id} RETURNING *`));
  } else [programme]=bountyRows(await tx.execute(sql`INSERT INTO included_bounty_programmes(developer_user_id,profile_game_id,game_id,access_method,next_outcome,is_open,model_version,activity_preference)
    VALUES(${developerId},${game.id},${game.catalog_game_id},${input.access},'content',true,'discovery-v2',${input.preference}) RETURNING *`));
  await ensureDiscoveryOpportunities(tx,programme);
  return {programme,repeated:false};
}
export async function changeDiscoveryPreference(tx:any,developerId:number,preference:CreatorPreference,profileGameId?:number) {
  opportunityTypes(preference);
  await tx.execute(sql`SELECT pg_advisory_xact_lock(48391,${developerId})`);
  if(!(await includedPlan(tx,developerId)).eligible)throw new Error('An active Indie Game Pro membership is required');
  const [programme]=bountyRows(await tx.execute(sql`UPDATE included_bounty_programmes SET activity_preference=${preference} WHERE developer_user_id=${developerId} AND ${profileGameId?sql`profile_game_id=${profileGameId}`:sql`true`} AND model_version='discovery-v2' RETURNING *`));
  if(!programme)throw new Error('Open your game for creator opportunities first');
  await ensureDiscoveryOpportunities(tx,programme);
}

/** Change access for future claims without rewriting any existing creator agreement. */
export async function changeDiscoveryAccess(tx:any,developerId:number,profileGameId:number,access:string) {
  if(!Number.isSafeInteger(profileGameId)||profileGameId<1||!['private_playtest','full_game_upfront','free_to_play'].includes(access))throw new Error('Choose a game and game access');
  await tx.execute(sql`SELECT pg_advisory_xact_lock(48391,${developerId})`);
  const [programme]=bountyRows(await tx.execute(sql`SELECT p.*,g.platforms,g.available_regions FROM included_bounty_programmes p JOIN indie_game_profiles g ON g.id=p.profile_game_id AND g.user_id=p.developer_user_id WHERE p.developer_user_id=${developerId} AND p.profile_game_id=${profileGameId} FOR UPDATE OF p FOR SHARE OF g`));
  if(!programme)throw new Error('Choose a registered game that you own');
  const plan=await includedPlan(tx,developerId),inventory=await includedInventory(tx,developerId,programme.game_id),type=bountyKeyType(access);
  assertIncludedActivation({eligible:plan.eligible,owned:true,access,availableKeys:type?Number(inventory[type]?.available??0):0,used:false});
  if(programme.access_method===access)return;
  if (programme.is_open) {
    const issue = bountyGameAvailabilityIssue(programme.platforms, programme.available_regions);
    if (issue) throw new Error(issue);
  }
  // Archive references, never the underlying campaign or participant records.
  await tx.execute(sql`UPDATE campaign_instances SET applications_paused=true,updated_at=NOW() WHERE id IN(SELECT instance_id FROM included_bounty_opportunities WHERE programme_id=${programme.id}) OR id IN(SELECT instance_id FROM included_bounty_months WHERE programme_id=${programme.id})`);
  await tx.execute(sql`INSERT INTO included_bounty_opportunity_history(programme_id,instance_id) SELECT programme_id,instance_id FROM included_bounty_opportunities WHERE programme_id=${programme.id} ON CONFLICT DO NOTHING`);
  await tx.execute(sql`INSERT INTO included_bounty_opportunity_history(programme_id,instance_id) SELECT programme_id,instance_id FROM included_bounty_months WHERE programme_id=${programme.id} ON CONFLICT DO NOTHING`);
  await tx.execute(sql`DELETE FROM included_bounty_opportunities WHERE programme_id=${programme.id}`);
  const [updated]=bountyRows(await tx.execute(sql`UPDATE included_bounty_programmes SET access_method=${access},model_version='discovery-v2' WHERE id=${programme.id} RETURNING *`));
  await ensureDiscoveryOpportunities(tx,updated);
}
