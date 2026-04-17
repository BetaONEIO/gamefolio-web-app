import { sendEmail } from './email-service';
import { storage } from './storage';
import { db } from './db';
import { sql } from 'drizzle-orm';
import { adminAlerts, type AdminAlert, type AlertRoutingRule, type AlertDeliveryLog } from '@shared/schema';
import { desc, eq } from 'drizzle-orm';

export interface AdminAlertParams {
  subject: string;
  message: string;
  details?: Record<string, unknown>;
  dedupeKey?: string;
  dedupeWindowMs?: number;
  /**
   * Tag identifying the kind of alert (e.g. "stuck_payment", "moderation").
   * Used by the per-type routing rules in admin alert settings to decide which
   * destinations should receive this alert. Defaults to "general".
   */
  type?: string;
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
    await db.execute(sql`ALTER TABLE IF EXISTS admin_alerts ADD COLUMN IF NOT EXISTS deliveries JSON`);
    // Ensure the per-type routing rules column exists on the settings table.
    // (The settings table itself is managed via drizzle-kit; this ALTER is idempotent.)
    await db.execute(sql`
      ALTER TABLE IF EXISTS admin_alert_settings
      ADD COLUMN IF NOT EXISTS routing_rules JSON NOT NULL DEFAULT '{}'::json
    `);
  } catch (err) {
    console.error('Failed to create admin_alerts table:', err);
  }
})();

// Ensure SMS / PagerDuty columns exist on existing admin_alert_settings rows.
// (The base table is owned by the alert-routing migration in HEAD.)
const adminAlertSettingsReady: Promise<void> = (async () => {
  try {
    await db.execute(sql`ALTER TABLE admin_alert_settings ADD COLUMN IF NOT EXISTS sms_numbers TEXT[] NOT NULL DEFAULT '{}'`);
    await db.execute(sql`ALTER TABLE admin_alert_settings ADD COLUMN IF NOT EXISTS pagerduty_routing_key TEXT`);
  } catch (err) {
    console.error('Failed to ensure admin_alert_settings SMS/PagerDuty columns:', err);
  }
})();

async function persistAdminAlert(params: AdminAlertParams): Promise<number | null> {
  try {
    await adminAlertsReady;
    const detailsWithType = params.type
      ? { ...(params.details ?? {}), alertType: params.type }
      : params.details ?? null;
    const [row] = await db.insert(adminAlerts).values({
      subject: params.subject,
      message: params.message,
      details: detailsWithType,
    }).returning({ id: adminAlerts.id });
    return row?.id ?? null;
  } catch (err) {
    console.error('Admin alert: failed to persist alert row:', err);
    return null;
  }
}

async function recordAlertDeliveries(id: number, deliveries: AlertDeliveryLog): Promise<void> {
  try {
    await db.update(adminAlerts).set({ deliveries }).where(eq(adminAlerts.id, id));
  } catch (err) {
    console.error('Admin alert: failed to record delivery results:', err);
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

export async function sendSms(toNumber: string, subject: string, message: string): Promise<boolean> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;
  if (!accountSid || !authToken || !fromNumber) {
    console.error('Admin alert: SMS skipped — TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM_NUMBER not configured');
    return false;
  }
  try {
    const body = new URLSearchParams({
      To: toNumber,
      From: fromNumber,
      // Cap body well under Twilio's 1600-char hard limit.
      Body: `[Gamefolio Admin] ${subject}\n${message}`.slice(0, 1500),
    });
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error(`Admin alert: Twilio SMS returned ${res.status} for ${toNumber}: ${text}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error(`Admin alert: Twilio SMS failed for ${toNumber}:`, err);
    return false;
  }
}

export async function postPagerDuty(
  routingKey: string,
  subject: string,
  message: string,
  details: Record<string, unknown> | undefined,
  dedupeKey: string,
): Promise<boolean> {
  try {
    const res = await fetch('https://events.pagerduty.com/v2/enqueue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        routing_key: routingKey,
        event_action: 'trigger',
        dedup_key: dedupeKey,
        payload: {
          summary: `${subject} — ${message}`.slice(0, 1024),
          source: 'gamefolio',
          severity: 'error',
          custom_details: details ?? {},
        },
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error(`Admin alert: PagerDuty returned ${res.status}: ${text}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Admin alert: PagerDuty enqueue failed:', err);
    return false;
  }
}

interface ResolvedDestinations {
  emails: string[];
  slackWebhooks: string[];
  smsNumbers: string[];
  pagerDutyKey: string | null;
}

async function resolveDestinations(alertType: string): Promise<ResolvedDestinations> {
  await adminAlertSettingsReady;

  let configuredEmails: string[] = [];
  let configuredWebhooks: string[] = [];
  let configuredSms: string[] = [];
  let configuredPagerDuty: string | null = null;
  let useEnvFallback = true;
  let rule: AlertRoutingRule | undefined;

  try {
    const settings = await storage.getAdminAlertSettings();
    if (settings) {
      configuredEmails = settings.emailRecipients || [];
      configuredWebhooks = settings.slackWebhooks || [];
      configuredSms = (settings as any).smsNumbers || [];
      configuredPagerDuty = (settings as any).pagerDutyRoutingKey || null;
      useEnvFallback = settings.useEnvFallback ?? true;
      const rules = (settings.routingRules || {}) as Record<string, AlertRoutingRule>;
      rule = rules[alertType];
    }
  } catch (err) {
    console.error('Admin alert: failed to load configured destinations, falling back to env:', err);
  }

  // Apply per-type routing rule, if any. Unknown types or rules in `all` mode keep the
  // legacy fan-out behavior; `selected` mode restricts to the listed destinations
  // (intersected with what's still configured globally). PagerDuty is only included for
  // `selected` rules when `includePagerDuty` is true.
  let typeEmails = configuredEmails;
  let typeWebhooks = configuredWebhooks;
  let typeSms = configuredSms;
  let typePagerDuty: string | null = configuredPagerDuty;
  if (rule && rule.mode === 'selected') {
    const allowedEmails = new Set(rule.emails || []);
    const allowedWebhooks = new Set(rule.slackWebhooks || []);
    const allowedSms = new Set(rule.smsNumbers || []);
    typeEmails = configuredEmails.filter((e) => allowedEmails.has(e));
    typeWebhooks = configuredWebhooks.filter((w) => allowedWebhooks.has(w));
    typeSms = configuredSms.filter((n) => allowedSms.has(n));
    typePagerDuty = rule.includePagerDuty ? configuredPagerDuty : null;
  }

  const envEmail = process.env.ADMIN_ALERT_EMAIL;
  const envWebhook = process.env.ADMIN_ALERT_SLACK_WEBHOOK_URL;
  const envPagerDuty = process.env.PAGERDUTY_ROUTING_KEY;

  const hasConfigured =
    typeEmails.length > 0 ||
    typeWebhooks.length > 0 ||
    typeSms.length > 0 ||
    !!typePagerDuty;
  const envForType = rule?.includeEnv ?? useEnvFallback;
  const includeEnv = envForType || !hasConfigured;

  const emails = new Set<string>(typeEmails);
  const slackWebhooks = new Set<string>(typeWebhooks);
  const smsNumbers = Array.from(new Set<string>(typeSms));
  let pagerDutyKey: string | null = typePagerDuty;
  if (includeEnv) {
    if (envEmail) emails.add(envEmail);
    if (envWebhook) slackWebhooks.add(envWebhook);
    if (!pagerDutyKey && envPagerDuty) pagerDutyKey = envPagerDuty;
  }

  return {
    emails: Array.from(emails),
    slackWebhooks: Array.from(slackWebhooks),
    smsNumbers,
    pagerDutyKey,
  };
}

export interface AdminAlertResult {
  slack: boolean;
  email: boolean;
  sms: boolean;
  pagerduty: boolean;
  suppressed: boolean;
}

export async function sendAdminAlert(params: AdminAlertParams): Promise<AdminAlertResult> {
  const dedupeKey = params.dedupeKey || params.subject;
  const dedupeWindow = params.dedupeWindowMs ?? DEFAULT_DEDUPE_WINDOW_MS;
  if (shouldSuppress(dedupeKey, dedupeWindow)) {
    return { slack: false, email: false, sms: false, pagerduty: false, suppressed: true };
  }

  const alertType = params.type || 'general';
  console.error(`🚨 ADMIN ALERT [${alertType}]: ${params.subject} — ${params.message}`, params.details || {});

  const persistedId = await persistAdminAlert(params);

  const { emails, slackWebhooks, smsNumbers, pagerDutyKey } = await resolveDestinations(alertType);

  const slackTasks = slackWebhooks.map((url) =>
    postSlack(url, params.subject, params.message, params.details),
  );
  const emailTasks = emails.map((to) =>
    sendAdminEmail(to, params.subject, params.message, params.details),
  );
  const smsTasks = smsNumbers.map((n) => sendSms(n, params.subject, params.message));
  const pagerDutyTask = pagerDutyKey
    ? postPagerDuty(pagerDutyKey, params.subject, params.message, params.details, dedupeKey)
    : Promise.resolve(false);

  const [slackResults, emailResults, smsResults, pagerduty] = await Promise.all([
    Promise.all(slackTasks),
    Promise.all(emailTasks),
    Promise.all(smsTasks),
    pagerDutyTask,
  ]);

  const deliveries: AlertDeliveryLog = {
    emails: emails.map((target, i) => ({ target, ok: !!emailResults[i] })),
    slack: slackWebhooks.map((target, i) => ({ target, ok: !!slackResults[i] })),
  };

  if (persistedId != null) {
    await recordAlertDeliveries(persistedId, deliveries);
  }

  return {
    slack: slackResults.some((r) => r),
    email: emailResults.some((r) => r),
    sms: smsResults.some((r) => r),
    pagerduty,
    suppressed: false,
  };
}
