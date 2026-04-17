import { sendEmail } from './email-service';
import { storage } from './storage';
import { db } from './db';
import { sql } from 'drizzle-orm';
import { adminAlerts, type AdminAlert } from '@shared/schema';
import { desc, eq } from 'drizzle-orm';

export interface AdminAlertParams {
  subject: string;
  message: string;
  details?: Record<string, unknown>;
  dedupeKey?: string;
  dedupeWindowMs?: number;
}

const DEFAULT_DEDUPE_WINDOW_MS = 10 * 60 * 1000;
const recentAlerts = new Map<string, number>();

function shouldSuppress(key: string, windowMs: number): boolean {
  const now = Date.now();
  const last = recentAlerts.get(key);
  if (last && now - last < windowMs) return true;
  recentAlerts.set(key, now);
  if (recentAlerts.size > 500) {
    const cutoff = now - windowMs;
    for (const [k, t] of recentAlerts) {
      if (t < cutoff) recentAlerts.delete(k);
    }
  }
  return false;
}

const adminAlertsReady: Promise<void> = (async () => {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS admin_alerts (
        id SERIAL PRIMARY KEY,
        subject TEXT NOT NULL,
        message TEXT NOT NULL,
        details JSON,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        resolved_at TIMESTAMP,
        resolved_by INTEGER
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS admin_alerts_created_at_idx ON admin_alerts (created_at)`);
  } catch (err) {
    console.error('Failed to create admin_alerts table:', err);
  }
})();

async function persistAdminAlert(params: AdminAlertParams): Promise<void> {
  try {
    await adminAlertsReady;
    await db.insert(adminAlerts).values({
      subject: params.subject,
      message: params.message,
      details: params.details ?? null,
    });
  } catch (err) {
    console.error('Admin alert: failed to persist alert row:', err);
  }
}

export async function listRecentAdminAlerts(limit = 50): Promise<AdminAlert[]> {
  await adminAlertsReady;
  return db.select().from(adminAlerts).orderBy(desc(adminAlerts.createdAt)).limit(limit);
}

export async function resolveAdminAlert(id: number, resolvedBy: number): Promise<AdminAlert | null> {
  await adminAlertsReady;
  const [row] = await db
    .update(adminAlerts)
    .set({ resolvedAt: new Date(), resolvedBy })
    .where(eq(adminAlerts.id, id))
    .returning();
  return row ?? null;
}

function formatDetailsAsText(details?: Record<string, unknown>): string {
  if (!details) return '';
  return Object.entries(details)
    .map(([k, v]) => `${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`)
    .join('\n');
}

function formatDetailsAsHtml(details?: Record<string, unknown>): string {
  if (!details) return '';
  const rows = Object.entries(details)
    .map(([k, v]) => {
      const val = typeof v === 'string' ? v : JSON.stringify(v);
      return `<tr><td style="padding:4px 8px;border:1px solid #ddd;font-weight:600;">${k}</td><td style="padding:4px 8px;border:1px solid #ddd;font-family:monospace;word-break:break-all;">${val}</td></tr>`;
    })
    .join('');
  return `<table style="border-collapse:collapse;margin-top:12px;">${rows}</table>`;
}

export async function postSlack(webhook: string, subject: string, message: string, details?: Record<string, unknown>): Promise<boolean> {
  try {
    const text = `*${subject}*\n${message}${details ? '\n```\n' + formatDetailsAsText(details) + '\n```' : ''}`;
    const res = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) {
      console.error(`Admin alert: Slack webhook returned ${res.status}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Admin alert: Slack webhook failed:', err);
    return false;
  }
}

export async function sendAdminEmail(to: string, subject: string, message: string, details?: Record<string, unknown>): Promise<boolean> {
  const html = `<p>${message.replace(/\n/g, '<br>')}</p>${formatDetailsAsHtml(details)}`;
  try {
    return await sendEmail({
      to,
      subject: `[Gamefolio Admin] ${subject}`,
      html,
    });
  } catch (err) {
    console.error('Admin alert: email send failed:', err);
    return false;
  }
}

interface ResolvedDestinations {
  emails: string[];
  slackWebhooks: string[];
}

async function resolveDestinations(): Promise<ResolvedDestinations> {
  let configuredEmails: string[] = [];
  let configuredWebhooks: string[] = [];
  let useEnvFallback = true;

  try {
    const settings = await storage.getAdminAlertSettings();
    if (settings) {
      configuredEmails = settings.emailRecipients || [];
      configuredWebhooks = settings.slackWebhooks || [];
      useEnvFallback = settings.useEnvFallback ?? true;
    }
  } catch (err) {
    console.error('Admin alert: failed to load configured destinations, falling back to env:', err);
  }

  const envEmail = process.env.ADMIN_ALERT_EMAIL;
  const envWebhook = process.env.ADMIN_ALERT_SLACK_WEBHOOK_URL;

  const hasConfigured = configuredEmails.length > 0 || configuredWebhooks.length > 0;
  const includeEnv = useEnvFallback || !hasConfigured;

  const emails = new Set<string>(configuredEmails);
  const slackWebhooks = new Set<string>(configuredWebhooks);
  if (includeEnv) {
    if (envEmail) emails.add(envEmail);
    if (envWebhook) slackWebhooks.add(envWebhook);
  }

  return {
    emails: Array.from(emails),
    slackWebhooks: Array.from(slackWebhooks),
  };
}

export async function sendAdminAlert(params: AdminAlertParams): Promise<{ slack: boolean; email: boolean; suppressed: boolean }> {
  const dedupeKey = params.dedupeKey || params.subject;
  const dedupeWindow = params.dedupeWindowMs ?? DEFAULT_DEDUPE_WINDOW_MS;
  if (shouldSuppress(dedupeKey, dedupeWindow)) {
    return { slack: false, email: false, suppressed: true };
  }

  console.error(`🚨 ADMIN ALERT: ${params.subject} — ${params.message}`, params.details || {});

  await persistAdminAlert(params);

  const { emails, slackWebhooks } = await resolveDestinations();

  const slackTasks = slackWebhooks.map((url) =>
    postSlack(url, params.subject, params.message, params.details),
  );
  const emailTasks = emails.map((to) =>
    sendAdminEmail(to, params.subject, params.message, params.details),
  );

  const [slackResults, emailResults] = await Promise.all([
    Promise.all(slackTasks),
    Promise.all(emailTasks),
  ]);

  return {
    slack: slackResults.some((r) => r),
    email: emailResults.some((r) => r),
    suppressed: false,
  };
}
