import { sql } from 'drizzle-orm';
import { db } from './db';
import {
  sendDailyActivitySummary,
  type DailyActivitySummary,
} from './telegram-notify';
import {
  telegramReportDate,
  TELEGRAM_REPORT_TIME_ZONE,
} from './daily-telegram-report-time';

const REPORT_HOUR = 23;
const TICK_INTERVAL_MS = 60 * 1000;

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
        ((${reportDate}::date + 1) AT TIME ZONE ${TELEGRAM_REPORT_TIME_ZONE}) AT TIME ZONE 'UTC' AS ends_at
    )
    SELECT
      (SELECT count(*)::int FROM clips, bounds
        WHERE clips.created_at >= bounds.starts_at AND clips.created_at < bounds.ends_at
          AND coalesce(clips.video_type, 'clip') <> 'reel') AS clips,
      (SELECT count(*)::int FROM clips, bounds
        WHERE clips.created_at >= bounds.starts_at AND clips.created_at < bounds.ends_at
          AND clips.video_type = 'reel') AS reels,
      (SELECT count(*)::int FROM screenshots, bounds
        WHERE screenshots.created_at >= bounds.starts_at AND screenshots.created_at < bounds.ends_at) AS screenshots,
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
          WHERE screenshot_reactions.created_at >= bounds.starts_at AND screenshot_reactions.created_at < bounds.ends_at)) AS reactions
  `);
  const row = rows[0] as Record<string, number | string | null> | undefined;
  const count = (key: string) => Number(row?.[key] ?? 0);

  return {
    reportDate,
    clips: count('clips'),
    reels: count('reels'),
    screenshots: count('screenshots'),
    likes: count('likes'),
    comments: count('comments'),
    follows: count('follows'),
    shares: count('shares'),
    reactions: count('reactions'),
  };
}

export async function runDailyTelegramReport(now = new Date()): Promise<boolean> {
  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_SIGNUP_CHAT_ID) return false;
  await ensureReportLog();
  const reportDate = telegramReportDate(now, REPORT_HOUR);
  if (!(await claimReport(reportDate))) return false;

  try {
    const summary = await loadSummary(reportDate);
    await sendDailyActivitySummary(summary);
    await db.execute(sql`
      UPDATE telegram_daily_reports
      SET status = 'sent', sent_at = now()
      WHERE report_date = ${reportDate}::date
    `);
    console.log(`[Telegram] Daily activity report sent for ${reportDate}`);
    return true;
  } catch (error) {
    await db.execute(sql`
      UPDATE telegram_daily_reports
      SET status = 'failed'
      WHERE report_date = ${reportDate}::date
    `).catch(() => {});
    throw error;
  }
}

export function startDailyTelegramReportScheduler(): void {
  const tick = () => {
    runDailyTelegramReport().catch((error) => {
      console.error('[Telegram] Daily activity report failed:', error);
    });
  };

  setTimeout(tick, 30_000);
  setInterval(tick, TICK_INTERVAL_MS).unref();
}
