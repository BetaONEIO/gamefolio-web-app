import { sql, type SQL } from 'drizzle-orm';
import { db } from './db';
import { SEASON_DEFS } from '../shared/season-definitions';

export const CREATOR_ANALYTICS_METRICS = [
  'most_liked_clips', 'most_viewed_clips', 'most_liked_reels', 'most_viewed_reels',
  'most_liked_screenshots', 'most_commented_uploads', 'most_fire_reacted_clips',
  'users_most_likes_received', 'users_most_views_received', 'most_visited_profiles',
  'most_xp_today', 'most_xp_this_week', 'most_xp_this_month', 'highest_xp_this_season',
  'biggest_leaderboard_climbers', 'users_reaching_xp_milestones', 'most_challenges_completed',
  'longest_challenge_streaks', 'most_active_uploaders', 'most_new_followers_gained',
  'top_newcomers_by_xp', 'most_uploaded_games', 'most_viewed_games',
  'most_liked_clip_by_game', 'top_creators_by_views_by_game',
] as const;

export type CreatorAnalyticsMetric = typeof CREATOR_ANALYTICS_METRICS[number];
export type AnalyticsPeriod = 'all' | 'today' | 'week' | 'month' | 'season';

const unavailable: Partial<Record<CreatorAnalyticsMetric, string>> = {
};

export function creatorAnalyticsCatalog() {
  return CREATOR_ANALYTICS_METRICS.map(metric => ({
    metric,
    available: !unavailable[metric],
    reason: unavailable[metric] || null,
  }));
}

export function isCreatorAnalyticsMetric(value: string): value is CreatorAnalyticsMetric {
  return (CREATOR_ANALYTICS_METRICS as readonly string[]).includes(value);
}

function currentSeasonBounds(): { start: string; end: string } {
  const season = SEASON_DEFS[0];
  const [startYear, startMonth] = season.months[0].split('-').map(Number);
  const [lastYear, lastMonth] = season.months[season.months.length - 1].split('-').map(Number);
  return {
    start: new Date(Date.UTC(startYear, startMonth - 1, 1)).toISOString(),
    end: new Date(Date.UTC(lastYear, lastMonth, 1)).toISOString(),
  };
}

function periodFilter(column: string, period: AnalyticsPeriod): SQL {
  const value = sql.raw(column);
  if (period === 'all') return sql`TRUE`;
  if (period === 'today') return sql`${value} >= (date_trunc('day', now() AT TIME ZONE 'Europe/London') AT TIME ZONE 'Europe/London')`;
  if (period === 'week') return sql`${value} >= (date_trunc('week', now() AT TIME ZONE 'Europe/London') AT TIME ZONE 'Europe/London')`;
  if (period === 'month') return sql`${value} >= (date_trunc('month', now() AT TIME ZONE 'Europe/London') AT TIME ZONE 'Europe/London')`;
  const bounds = currentSeasonBounds();
  return sql`${value} >= ${bounds.start}::timestamptz AND ${value} < ${bounds.end}::timestamptz`;
}

const eligibleUser = sql`u.role NOT IN ('admin', 'moderator', 'system')
  AND (u.status IS NULL OR u.status NOT IN ('suspended', 'banned'))
  AND COALESCE(u.hide_from_leaderboard, false) = false
  AND LOWER(u.username) NOT LIKE '%test%'
  AND COALESCE(u.user_type, '') NOT ILIKE '%indie_developer%'`;

function contentRows(kind: 'clip' | 'reel' | 'screenshot', score: 'likes' | 'views' | 'comments' | 'fire', period: AnalyticsPeriod, limit: number): SQL {
  if (kind === 'screenshot') {
    const scoreExpr = score === 'likes'
      ? sql`(SELECT count(DISTINCT sl.id) FROM screenshot_likes sl WHERE sl.screenshot_id = s.id)`
      : score === 'comments'
        ? sql`(SELECT count(DISTINCT sc.id) FROM screenshot_comments sc WHERE sc.screenshot_id = s.id)`
        : sql`s.views`;
    return sql`SELECT s.id, 'screenshot' AS "contentType", s.title, s.image_url AS "mediaUrl",
      s.thumbnail_url AS "thumbnailUrl", s.views, ${scoreExpr}::int AS value,
      u.id AS "userId", u.username, u.display_name AS "displayName", u.avatar_url AS "avatarUrl",
      g.id AS "gameId", g.name AS "gameName", g.image_url AS "gameImageUrl"
      FROM screenshots s JOIN users u ON u.id=s.user_id LEFT JOIN games g ON g.id=s.game_id
      WHERE ${periodFilter('s.created_at', period)} AND ${eligibleUser}
      ORDER BY value DESC, s.id ASC LIMIT ${limit}`;
  }
  const scoreExpr = score === 'likes'
    ? sql`(SELECT count(DISTINCT l.id) FROM likes l WHERE l.clip_id = c.id)`
    : score === 'comments'
      ? sql`(SELECT count(DISTINCT cm.id) FROM comments cm WHERE cm.clip_id = c.id)`
      : score === 'fire'
        ? sql`(SELECT count(DISTINCT (cr.user_id, cr.emoji)) FROM clip_reactions cr WHERE cr.clip_id = c.id AND cr.emoji = '🔥')`
        : sql`c.views`;
  const typeFilter = kind === 'reel' ? sql`c.video_type = 'reel'` : sql`COALESCE(c.video_type, 'clip') <> 'reel'`;
  return sql`SELECT c.id, ${kind} AS "contentType", c.title, c.video_url AS "mediaUrl",
    c.thumbnail_url AS "thumbnailUrl", c.views, ${scoreExpr}::int AS value,
    u.id AS "userId", u.username, u.display_name AS "displayName", u.avatar_url AS "avatarUrl",
    g.id AS "gameId", g.name AS "gameName", g.image_url AS "gameImageUrl"
    FROM clips c JOIN users u ON u.id=c.user_id LEFT JOIN games g ON g.id=c.game_id
    WHERE ${typeFilter} AND c.status='ready' AND ${periodFilter('c.created_at', period)} AND ${eligibleUser}
    ORDER BY value DESC, c.id ASC LIMIT ${limit}`;
}

function userRanking(valueSql: SQL, joins: SQL, periodSql: SQL, limit: number, extra = sql``): SQL {
  return sql`SELECT u.id AS "userId", u.username, u.display_name AS "displayName", u.avatar_url AS "avatarUrl",
    (${valueSql})::int AS value ${extra}
    FROM users u ${joins} WHERE ${eligibleUser} AND ${periodSql}
    GROUP BY u.id, u.username, u.display_name, u.avatar_url
    HAVING (${valueSql}) > 0 ORDER BY value DESC, u.id ASC LIMIT ${limit}`;
}

function queryFor(metric: CreatorAnalyticsMetric, requestedPeriod: AnalyticsPeriod, limit: number): SQL {
  if (metric === 'most_liked_clips') return contentRows('clip', 'likes', requestedPeriod, limit);
  if (metric === 'most_viewed_clips') return contentRows('clip', 'views', requestedPeriod, limit);
  if (metric === 'most_liked_reels') return contentRows('reel', 'likes', requestedPeriod, limit);
  if (metric === 'most_viewed_reels') return contentRows('reel', 'views', requestedPeriod, limit);
  if (metric === 'most_liked_screenshots') return contentRows('screenshot', 'likes', requestedPeriod, limit);
  if (metric === 'most_fire_reacted_clips') return contentRows('clip', 'fire', requestedPeriod, limit);
  if (metric === 'most_commented_uploads') return sql`
    SELECT * FROM (
      ${contentRows('clip', 'comments', requestedPeriod, limit)}
    ) uploads
    UNION ALL SELECT * FROM (${contentRows('reel', 'comments', requestedPeriod, limit)}) reels
    UNION ALL SELECT * FROM (${contentRows('screenshot', 'comments', requestedPeriod, limit)}) screenshots
    ORDER BY value DESC, id ASC LIMIT ${limit}`;

  if (metric === 'users_most_likes_received') return sql`
    SELECT u.id AS "userId", u.username, u.display_name AS "displayName", u.avatar_url AS "avatarUrl",
      (count(DISTINCT l.id) + count(DISTINCT sl.id))::int AS value
    FROM users u LEFT JOIN clips c ON c.user_id=u.id LEFT JOIN likes l ON l.clip_id=c.id AND ${periodFilter('l.created_at', requestedPeriod)}
      LEFT JOIN screenshots s ON s.user_id=u.id LEFT JOIN screenshot_likes sl ON sl.screenshot_id=s.id AND ${periodFilter('sl.created_at', requestedPeriod)}
    WHERE ${eligibleUser} GROUP BY u.id HAVING count(DISTINCT l.id)+count(DISTINCT sl.id)>0
    ORDER BY value DESC, u.id ASC LIMIT ${limit}`;
  if (metric === 'users_most_views_received') return sql`
    SELECT u.id AS "userId", u.username, u.display_name AS "displayName", u.avatar_url AS "avatarUrl",
      (COALESCE((SELECT sum(c.views) FROM clips c WHERE c.user_id=u.id),0)+COALESCE((SELECT sum(s.views) FROM screenshots s WHERE s.user_id=u.id),0))::int AS value
    FROM users u WHERE ${eligibleUser} ORDER BY value DESC, u.id ASC LIMIT ${limit}`;
  if (metric === 'most_visited_profiles') return userRanking(sql`count(pv.id)`, sql`JOIN profile_visits pv ON pv.profile_id=u.id`, periodFilter('pv.created_at', requestedPeriod), limit);

  if (metric.startsWith('most_xp_') || metric === 'highest_xp_this_season') {
    const period: AnalyticsPeriod = metric === 'most_xp_today' ? 'today' : metric === 'most_xp_this_week' ? 'week' : metric === 'most_xp_this_month' ? 'month' : 'season';
    return userRanking(sql`sum(x.xp_amount)`, sql`JOIN user_xp_history x ON x.user_id=u.id`, periodFilter('x.created_at', period), limit);
  }
  if (metric === 'users_reaching_xp_milestones') return userRanking(
    sql`count(*)`, sql`JOIN user_xp_history x ON x.user_id=u.id`,
    sql`${periodFilter('x.created_at', requestedPeriod)} AND (x.source LIKE '%milestone%' OR x.view_count IS NOT NULL)`, limit);
  if (metric === 'biggest_leaderboard_climbers') {
    const season = currentSeasonBounds();
    const recent = periodFilter('x.created_at', requestedPeriod === 'all' ? 'season' : requestedPeriod);
    return sql`WITH scores AS (
      SELECT u.id,u.username,u.display_name,u.avatar_url,
        COALESCE(sum(x.xp_amount),0) AS current_xp,
        COALESCE(sum(x.xp_amount) FILTER (WHERE NOT (${recent})),0) AS previous_xp
      FROM users u LEFT JOIN user_xp_history x ON x.user_id=u.id AND x.created_at>=${season.start}::timestamptz AND x.created_at<${season.end}::timestamptz
      WHERE ${eligibleUser} GROUP BY u.id
    ), ranks AS (
      SELECT *,rank() OVER (ORDER BY current_xp DESC,id ASC)::int AS current_rank,
        rank() OVER (ORDER BY previous_xp DESC,id ASC)::int AS previous_rank FROM scores
    ) SELECT id AS "userId",username,display_name AS "displayName",avatar_url AS "avatarUrl",
      (previous_rank-current_rank)::int AS value,previous_rank AS "previousRank",current_rank AS "currentRank"
      FROM ranks WHERE previous_rank>current_rank ORDER BY value DESC,id ASC LIMIT ${limit}`;
  }
  if (metric === 'most_challenges_completed') return userRanking(
    sql`count(*)`, sql`JOIN user_points_history p ON p.user_id=u.id`,
    sql`${periodFilter('p.created_at', requestedPeriod)} AND p.action='all_challenges_bonus'`, limit);
  if (metric === 'longest_challenge_streaks') return sql`
    WITH days AS (SELECT DISTINCT user_id, (created_at AT TIME ZONE 'Europe/London')::date AS day FROM user_points_history WHERE action='all_challenges_bonus'),
    grouped AS (SELECT user_id, day, day-(row_number() OVER (PARTITION BY user_id ORDER BY day))::int AS grp FROM days),
    streaks AS (SELECT user_id, count(*)::int AS streak FROM grouped GROUP BY user_id, grp),
    best AS (SELECT user_id, max(streak)::int AS value FROM streaks GROUP BY user_id)
    SELECT u.id AS "userId",u.username,u.display_name AS "displayName",u.avatar_url AS "avatarUrl",best.value
    FROM best JOIN users u ON u.id=best.user_id WHERE ${eligibleUser} ORDER BY best.value DESC,u.id ASC LIMIT ${limit}`;
  if (metric === 'most_active_uploaders') return sql`
    SELECT u.id AS "userId",u.username,u.display_name AS "displayName",u.avatar_url AS "avatarUrl",count(*)::int AS value
    FROM users u JOIN (SELECT user_id,created_at FROM clips UNION ALL SELECT user_id,created_at FROM screenshots) a ON a.user_id=u.id
    WHERE ${eligibleUser} AND ${periodFilter('a.created_at', requestedPeriod)} GROUP BY u.id ORDER BY value DESC,u.id ASC LIMIT ${limit}`;
  if (metric === 'most_new_followers_gained') return userRanking(sql`count(f.id)`, sql`JOIN follows f ON f.following_id=u.id`, periodFilter('f.created_at', requestedPeriod), limit);
  if (metric === 'top_newcomers_by_xp') return userRanking(sql`sum(x.xp_amount)`, sql`JOIN user_xp_history x ON x.user_id=u.id`,
    sql`${periodFilter('u.created_at', requestedPeriod)} AND ${periodFilter('x.created_at', requestedPeriod)}`, limit);

  if (metric === 'most_uploaded_games' || metric === 'most_viewed_games') {
    const value = metric === 'most_uploaded_games' ? sql`count(*)` : sql`sum(a.views)`;
    return sql`SELECT g.id AS "gameId",g.name AS "gameName",g.image_url AS "gameImageUrl",(${value})::int AS value
      FROM games g JOIN (SELECT game_id,created_at,COALESCE(views,0) views FROM clips UNION ALL SELECT game_id,created_at,COALESCE(views,0) views FROM screenshots) a ON a.game_id=g.id
      WHERE ${periodFilter('a.created_at', requestedPeriod)} GROUP BY g.id ORDER BY value DESC,g.id ASC LIMIT ${limit}`;
  }
  if (metric === 'most_liked_clip_by_game') return sql`
    SELECT * FROM (SELECT g.id AS "gameId",g.name AS "gameName",g.image_url AS "gameImageUrl",c.id,c.title,c.video_url AS "mediaUrl",c.thumbnail_url AS "thumbnailUrl",
      u.id AS "userId",u.username,u.display_name AS "displayName",count(DISTINCT l.id)::int AS value,
      row_number() OVER (PARTITION BY g.id ORDER BY count(DISTINCT l.id) DESC,c.id ASC) AS game_rank
      FROM clips c JOIN games g ON g.id=c.game_id JOIN users u ON u.id=c.user_id LEFT JOIN likes l ON l.clip_id=c.id
      WHERE COALESCE(c.video_type,'clip')<>'reel' AND ${periodFilter('c.created_at', requestedPeriod)} AND ${eligibleUser}
      GROUP BY g.id,c.id,u.id) ranked WHERE game_rank=1 ORDER BY value DESC,"gameId" ASC LIMIT ${limit}`;
  if (metric === 'top_creators_by_views_by_game') return sql`
    SELECT * FROM (SELECT g.id AS "gameId",g.name AS "gameName",g.image_url AS "gameImageUrl",u.id AS "userId",u.username,u.display_name AS "displayName",u.avatar_url AS "avatarUrl",
      sum(a.views)::int AS value,row_number() OVER (PARTITION BY g.id ORDER BY sum(a.views) DESC,u.id ASC) AS game_rank
      FROM games g JOIN (SELECT game_id,user_id,created_at,COALESCE(views,0) views FROM clips UNION ALL SELECT game_id,user_id,created_at,COALESCE(views,0) views FROM screenshots) a ON a.game_id=g.id
      JOIN users u ON u.id=a.user_id WHERE ${periodFilter('a.created_at', requestedPeriod)} AND ${eligibleUser}
      GROUP BY g.id,u.id) ranked WHERE game_rank=1 ORDER BY value DESC,"gameId" ASC LIMIT ${limit}`;
  throw new Error(unavailable[metric] || `Unsupported analytics metric: ${metric}`);
}

export async function loadCreatorRanking(metric: CreatorAnalyticsMetric, period: AnalyticsPeriod, limit: number) {
  if (unavailable[metric]) throw new Error(unavailable[metric]);
  const rows = await db.execute(queryFor(metric, period, limit));
  return Array.from(rows as unknown as any[]).map((row, index) => ({ rank: index + 1, ...row, value: Number(row.value || 0) }));
}
