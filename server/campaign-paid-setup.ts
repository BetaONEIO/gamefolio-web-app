import { sql } from 'drizzle-orm';
const rows = (result: any): any[] => result.rows ?? result;
// The caller must run this inside a database transaction. The receipt lock serializes callbacks.
export async function activatePaidCampaignInTransaction(tx: { execute: (query: any) => Promise<any> }, id: number) {

      const [payment] = rows(await tx.execute(sql`SELECT * FROM campaign_payments WHERE campaign_id = ${id} FOR UPDATE`));
      if (!payment?.transaction_id || payment.status === 'fulfilled') return;
      const [campaign] = rows(await tx.execute(sql`SELECT * FROM campaign_instances WHERE id = ${id} FOR UPDATE`));
      if (!campaign || Number(campaign.developer_user_id) !== Number(payment.developer_id)) throw new Error('Campaign ownership mismatch');
      const capacity = Number(campaign.max_places);
      if (!Number.isInteger(capacity) || capacity < 1) throw new Error('Invalid campaign capacity');
      if (campaign.requires_access_key !== false) {
        const keyType = campaign.access_method === 'full_game_upfront' ? 'full' : 'demo';
        const keys = rows(await tx.execute(sql`SELECT id FROM game_keys WHERE developer_user_id = ${payment.developer_id}
          AND key_pool = 'access' AND key_type = ${keyType} AND removed_at IS NULL
          AND revealed_at IS NULL AND assigned_user_id IS NULL AND assigned_participant_id IS NULL
          AND ((instance_id = ${id} AND status IN ('available', 'reserved')) OR
            (instance_id IS NULL AND game_id = ${campaign.game_id} AND status = 'available'))
          ORDER BY CASE WHEN instance_id = ${id} THEN 0 ELSE 1 END, id LIMIT ${capacity} FOR UPDATE SKIP LOCKED`));
        if (keys.length < capacity) throw new Error('Not enough compatible keys. Add keys to finish paid campaign setup.');
        const ids = keys.map(k => Number(k.id));
        await tx.execute(sql`UPDATE game_keys SET instance_id = ${id}, status = 'reserved' WHERE id = ANY(${ids}::int[])`);
        await tx.execute(sql`INSERT INTO campaign_key_events (key_id,instance_id,actor_user_id,event_type,to_status) SELECT unnest(${ids}::int[]), ${id}, ${payment.developer_id}, 'allocated', 'reserved'`);
      }
      if (campaign.completion_reward_key_required === true) {
        const [rewardPool] = rows(await tx.execute(sql`SELECT COUNT(*)::int AS available FROM game_keys
          WHERE instance_id = ${id} AND developer_user_id = ${payment.developer_id}
          AND key_pool = 'reward' AND key_type = 'full' AND status = 'available' AND removed_at IS NULL`));
        if (Number(rewardPool?.available ?? 0) < capacity) throw new Error('Not enough completion reward keys to finish paid campaign setup.');
      }
      const rawLaunch = campaign.scheduled_start;
      const launchTime = rawLaunch instanceof Date ? rawLaunch.getTime() : Date.parse(
        /(?:Z|[+-]\d{2}:?\d{2})$/.test(String(rawLaunch)) ? String(rawLaunch) : `${String(rawLaunch).replace(' ', 'T')}Z`);
      const scheduled = campaign.start_type === 'scheduled' && launchTime > Date.now();
      await tx.execute(sql`UPDATE campaign_instances SET status = ${scheduled ? 'scheduled' : 'live'},
        confirmed_terms = COALESCE(confirmed_terms, jsonb_build_object('campaign_title',campaign_title,'description',description,'template_id',template_id,'game_id',game_id,'game_name',game_name,'regions',COALESCE(to_jsonb(regions),(SELECT to_jsonb(available_regions) FROM indie_game_profiles WHERE user_id=campaign_instances.developer_user_id AND catalog_game_id=campaign_instances.game_id LIMIT 1)),'platforms',COALESCE(to_jsonb(platforms),(SELECT to_jsonb(platforms) FROM indie_game_profiles WHERE user_id=campaign_instances.developer_user_id AND catalog_game_id=campaign_instances.game_id LIMIT 1)),'objectives',objective_snapshot,'access_method',access_method,'access_instructions',access_instructions,'creator_deadline_days',creator_deadline_days,'application_period_days',application_period_days,'max_places',max_places,'bounty_xp_reward',bounty_xp_reward,'completion_bonus_xp',completion_bonus_xp,'reward_config',reward_config,'stream_config',stream_config,'budget_pence',budget_pence,'start_type',start_type,'scheduled_start',scheduled_start,'confirmed_at',NOW())),
        lifecycle_state = ${scheduled ? 'scheduled' : 'accepting'}, approved_at = NOW(), submitted_at = NOW(),
        actual_start = CASE WHEN ${scheduled} THEN scheduled_start ELSE NOW() AT TIME ZONE 'UTC' END,
        end_date = (CASE WHEN ${scheduled} THEN scheduled_start ELSE NOW() AT TIME ZONE 'UTC' END)
          + COALESCE(application_period_days, 30) * interval '1 day', updated_at = NOW() WHERE id = ${id}`);
      await tx.execute(sql`UPDATE campaign_payments SET status = 'fulfilled', last_error = NULL, updated_at = NOW() WHERE campaign_id = ${id}`);

}
