import { sql } from 'drizzle-orm';
import { db } from './db';
import {
  telegramReportDate,
  TELEGRAM_REPORT_TIME_ZONE,
} from './daily-telegram-report-time';

const REPORT_HOUR = 23;

export interface DailyActivitySummary {
  reportDate: string;
  signups: number;
  activeUsers: number;
  clips: number;
  reels: number;
  screenshots: number;
  uniqueUploaders: number;
  failedUploads: number;
  likes: number;
  comments: number;
  follows: number;
  shares: number;
  reactions: number;
  bookmarks: number;
  previousUploads: number;
  previousInteractions: number;
  previousActiveUsers: number;
}

async function ensureReportLog(): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS telegram_daily_reports (
      report_date date PRIMARY KEY,
      status text NOT NULL DEFAULT 'sending',
      attempted_at timestamp with time zone NOT NULL DEFAULT now(),
      sent_at timestamp with time zone
    )
  `);
}

async function claimReport(reportDate: string): Promise<boolean> {
  const rows = await db.execute(sql`
    INSERT INTO telegram_daily_reports (report_date, status, attempted_at)
    VALUES (${reportDate}::date, 'sending', now())
    ON CONFLICT (report_date) DO UPDATE
      SET status = 'sending', attempted_at = now()
      WHERE telegram_daily_reports.status <> 'sent'
        AND telegram_daily_reports.attempted_at < now() - interval '30 minutes'
    RETURNING report_date
  `);
  return rows.length > 0;
}

async function loadSummary(reportDate: string): Promise<DailyActivitySummary> {
  const rows = await db.execute(sql`
    WITH bounds AS (
      SELECT
        (${reportDate}::date AT TIME ZONE ${TELEGRAM_REPORT_TIME_ZONE}) AT TIME ZONE 'UTC' AS starts_at,
        ((${reportDate}::date + 1) AT TIME ZONE ${TELEGRAM_REPORT_TIME_ZONE}) AT TIME ZONE 'UTC' AS ends_at,
        ((${reportDate}::date - 1) AT TIME ZONE ${TELEGRAM_REPORT_TIME_ZONE}) AT TIME ZONE 'UTC' AS previous_starts_at
    )
    SELECT
      (SELECT count(*)::int FROM users, bounds
        WHERE users.created_at >= bounds.starts_at AND users.created_at < bounds.ends_at) AS signups,
      (SELECT count(*)::int FROM users, bounds
        WHERE users.last_login_at >= bounds.starts_at AND users.last_login_at < bounds.ends_at) AS active_users,
      (SELECT count(*)::int FROM clips, bounds
        WHERE clips.created_at >= bounds.starts_at AND clips.created_at < bounds.ends_at
          AND coalesce(clips.video_type, 'clip') <> 'reel') AS clips,
      (SELECT count(*)::int FROM clips, bounds
        WHERE clips.created_at >= bounds.starts_at AND clips.created_at < bounds.ends_at
          AND clips.video_type = 'reel') AS reels,
      (SELECT count(*)::int FROM screenshots, bounds
        WHERE screenshots.created_at >= bounds.starts_at AND screenshots.created_at < bounds.ends_at) AS screenshots,
      (SELECT count(DISTINCT creator_id)::int FROM (
        SELECT clips.user_id AS creator_id FROM clips, bounds
          WHERE clips.created_at >= bounds.starts_at AND clips.created_at < bounds.ends_at
        UNION
        SELECT screenshots.user_id AS creator_id FROM screenshots, bounds
          WHERE screenshots.created_at >= bounds.starts_at AND screenshots.created_at < bounds.ends_at
      ) creators) AS unique_uploaders,
      (SELECT count(*)::int FROM clips, bounds
        WHERE clips.created_at >= bounds.starts_at AND clips.created_at < bounds.ends_at
          AND clips.status = 'failed') AS failed_uploads,
      ((SELECT count(*)::int FROM likes, bounds
          WHERE likes.created_at >= bounds.starts_at AND likes.created_at < bounds.ends_at) +
       (SELECT count(*)::int FROM screenshot_likes, bounds
          WHERE screenshot_likes.created_at >= bounds.starts_at AND screenshot_likes.created_at < bounds.ends_at)) AS likes,
      ((SELECT count(*)::int FROM comments, bounds
          WHERE comments.created_at >= bounds.starts_at AND comments.created_at < bounds.ends_at) +
       (SELECT count(*)::int FROM screenshot_comments, bounds
          WHERE screenshot_comments.created_at >= bounds.starts_at AND screenshot_comments.created_at < bounds.ends_at)) AS comments,
      (SELECT count(*)::int FROM follows, bounds
        WHERE follows.created_at >= bounds.starts_at AND follows.created_at < bounds.ends_at) AS follows,
      (SELECT count(*)::int FROM user_points_history, bounds
        WHERE user_points_history.created_at >= bounds.starts_at
          AND user_points_history.created_at < bounds.ends_at
          AND user_points_history.action = 'share_received') AS shares,
      ((SELECT count(*)::int FROM clip_reactions, bounds
          WHERE clip_reactions.created_at >= bounds.starts_at AND clip_reactions.created_at < bounds.ends_at) +
       (SELECT count(*)::int FROM screenshot_reactions, bounds
          WHERE screenshot_reactions.created_at >= bounds.starts_at AND screenshot_reactions.created_at < bounds.ends_at)) AS reactions,
      (SELECT count(*)::int FROM bookmarks, bounds
        WHERE bookmarks.created_at >= bounds.starts_at AND bookmarks.created_at < bounds.ends_at) AS bookmarks,
      ((SELECT count(*)::int FROM clips, bounds
          WHERE clips.created_at >= bounds.previous_starts_at AND clips.created_at < bounds.starts_at) +
       (SELECT count(*)::int FROM screenshots, bounds
          WHERE screenshots.created_at >= bounds.previous_starts_at AND screenshots.created_at < bounds.starts_at)) AS previous_uploads,
      ((SELECT count(*)::int FROM likes, bounds
          WHERE likes.created_at >= bounds.previous_starts_at AND likes.created_at < bounds.starts_at) +
       (SELECT count(*)::int FROM screenshot_likes, bounds
          WHERE screenshot_likes.created_at >= bounds.previous_starts_at AND screenshot_likes.created_at < bounds.starts_at) +
       (SELECT count(*)::int FROM comments, bounds
          WHERE comments.created_at >= bounds.previous_starts_at AND comments.created_at < bounds.starts_at) +
       (SELECT count(*)::int FROM screenshot_comments, bounds
          WHERE screenshot_comments.created_at >= bounds.previous_starts_at AND screenshot_comments.created_at < bounds.starts_at) +
       (SELECT count(*)::int FROM follows, bounds
          WHERE follows.created_at >= bounds.previous_starts_at AND follows.created_at < bounds.starts_at) +
       (SELECT count(*)::int FROM user_points_history, bounds
          WHERE user_points_history.created_at >= bounds.previous_starts_at
            AND user_points_history.created_at < bounds.starts_at
            AND user_points_history.action = 'share_received') +
       (SELECT count(*)::int FROM clip_reactions, bounds
          WHERE clip_reactions.created_at >= bounds.previous_starts_at AND clip_reactions.created_at < bounds.starts_at) +
       (SELECT count(*)::int FROM screenshot_reactions, bounds
          WHERE screenshot_reactions.created_at >= bounds.previous_starts_at AND screenshot_reactions.created_at < bounds.starts_at) +
       (SELECT count(*)::int FROM bookmarks, bounds
          WHERE bookmarks.created_at >= bounds.previous_starts_at AND bookmarks.created_at < bounds.starts_at)) AS previous_interactions,
      (SELECT count(*)::int FROM users, bounds
        WHERE users.last_login_at >= bounds.previous_starts_at AND users.last_login_at < bounds.starts_at) AS previous_active_users
  `);
  const row = rows[0] as Record<string, number | string | null> | undefined;
  const count = (key: string) => Number(row?.[key] ?? 0);

  return {
    reportDate,
    signups: count('signups'),
    activeUsers: count('active_users'),
    clips: count('clips'),
    reels: count('reels'),
    screenshots: count('screenshots'),
    uniqueUploaders: count('unique_uploaders'),
    failedUploads: count('failed_uploads'),
    likes: count('likes'),
    comments: count('comments'),
    follows: count('follows'),
    shares: count('shares'),
    reactions: count('reactions'),
    bookmarks: count('bookmarks'),
    previousUploads: count('previous_uploads'),
    previousInteractions: count('previous_interactions'),
    previousActiveUsers: count('previous_active_users'),
  };
}

export async function claimDailyActivityReport(now = new Date()): Promise<DailyActivitySummary | null> {
  await ensureReportLog();
  const reportDate = telegramReportDate(now, REPORT_HOUR);
  if (!(await claimReport(reportDate))) return null;

  try {
    return await loadSummary(reportDate);
  } catch (error) {
    await failDailyActivityReport(reportDate).catch(() => {});
    throw error;
  }
}

export async function completeDailyActivityReport(reportDate: string): Promise<void> {
  await db.execute(sql`
    UPDATE telegram_daily_reports
    SET status = 'sent', sent_at = now()
    WHERE report_date = ${reportDate}::date AND status = 'sending'
  `);
}

export async function failDailyActivityReport(reportDate: string): Promise<void> {
  await db.execute(sql`
    UPDATE telegram_daily_reports
    SET status = 'failed'
    WHERE report_date = ${reportDate}::date AND status = 'sending'
  `);
}
