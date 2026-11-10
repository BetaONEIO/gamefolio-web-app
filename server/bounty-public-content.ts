import { sql } from 'drizzle-orm';
const rows = (result: any): any[] => Array.isArray(result) ? result : result?.rows ?? [];

/** Public media only. Feedback, review notes, keys and unapproved work never enter this response. */
export async function publicBountyContent(tx: any, instanceId: number, before?: number) {
  const [campaign] = rows(await tx.execute(sql`
    SELECT id, game_id, developer_user_id, confirmed_terms
    FROM campaign_instances
    WHERE id = ${instanceId} AND status IN ('live','approved','in_progress','completed')
      AND (actual_start IS NULL OR actual_start <= NOW() AT TIME ZONE 'UTC')
  `));
  if (!campaign) return null;
  const scope = campaign.confirmed_terms?.model === 'discovery-v2'
    ? sql`ci.game_id = ${campaign.game_id} AND ci.developer_user_id = ${campaign.developer_user_id}
        AND ci.confirmed_terms->>'model' = 'discovery-v2'`
    : sql`ci.id = ${instanceId}`;
  const content = rows(await tx.execute(sql`
    SELECT s.id, s.content_type,
      COALESCE(c.id, ss.id) AS media_id,
      COALESCE(c.title, ss.title) AS title,
      COALESCE(c.video_url, ss.image_url) AS media_url,
      COALESCE(c.thumbnail_url, ss.image_url) AS thumbnail_url,
      CASE WHEN c.trim_end > 0 THEN GREATEST(c.trim_end - COALESCE(c.trim_start, 0), 0) ELSE c.duration END AS duration,
      COALESCE(c.views, ss.views, 0) AS views,
      COALESCE(c.description, ss.description) AS description,
      COALESCE(c.pinned_at, ss.pinned_at) AS pinned_at,
      COALESCE(c.share_code, ss.share_code) AS share_code,
      COALESCE(c.created_at, ss.created_at) AS created_at,
      s.submitted_at, u.id AS user_id, u.username, u.display_name
    FROM campaign_bounty_submissions s
    JOIN campaign_instances ci ON ci.id = s.instance_id
    JOIN users u ON u.id = s.participant_id
    LEFT JOIN clips c ON c.id = COALESCE(s.clip_id, s.reel_id)
      AND c.user_id = s.participant_id AND c.game_id = ci.game_id
      AND COALESCE(c.video_type, 'clip') = s.content_type
      AND c.status = 'ready' AND c.age_restricted = false
    LEFT JOIN screenshots ss ON ss.id = s.screenshot_id
      AND ss.user_id = s.participant_id AND ss.game_id = ci.game_id
      AND s.content_type = 'screenshot' AND ss.age_restricted = false
    WHERE ${scope} AND s.status = 'approved'
      AND ci.status IN ('live','approved','in_progress','completed')
      AND s.content_type IN ('clip','reel','screenshot')
      AND COALESCE(u.is_private, false) = false AND u.status = 'active'
      AND (c.id IS NOT NULL OR ss.id IS NOT NULL)
      AND (${before ?? null}::int IS NULL OR s.id < ${before ?? null}::int)
      AND NOT EXISTS (SELECT 1 FROM campaign_bounty_submissions newer WHERE newer.supersedes_submission_id = s.id)
    ORDER BY s.id DESC LIMIT 13
  `));
  return { items: content.slice(0, 12), nextCursor: content.length > 12 ? Number(content[11].id) : null };
}
