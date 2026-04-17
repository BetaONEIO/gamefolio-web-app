import { sendEmail } from './email-service';

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

async function postSlack(webhook: string, subject: string, message: string, details?: Record<string, unknown>): Promise<boolean> {
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

export async function sendAdminAlert(params: AdminAlertParams): Promise<{ slack: boolean; email: boolean; suppressed: boolean }> {
  const dedupeKey = params.dedupeKey || params.subject;
  const dedupeWindow = params.dedupeWindowMs ?? DEFAULT_DEDUPE_WINDOW_MS;
  if (shouldSuppress(dedupeKey, dedupeWindow)) {
    return { slack: false, email: false, suppressed: true };
  }

  console.error(`🚨 ADMIN ALERT: ${params.subject} — ${params.message}`, params.details || {});

  const slackWebhook = process.env.ADMIN_ALERT_SLACK_WEBHOOK_URL;
  const adminEmail = process.env.ADMIN_ALERT_EMAIL;

  const tasks: Promise<boolean>[] = [];
  if (slackWebhook) {
    tasks.push(postSlack(slackWebhook, params.subject, params.message, params.details));
  } else {
    tasks.push(Promise.resolve(false));
  }

  if (adminEmail) {
    const html = `<p>${params.message.replace(/\n/g, '<br>')}</p>${formatDetailsAsHtml(params.details)}`;
    tasks.push(
      sendEmail({
        to: adminEmail,
        subject: `[Gamefolio Admin] ${params.subject}`,
        html,
      }).catch((err) => {
        console.error('Admin alert: email send failed:', err);
        return false;
      }),
    );
  } else {
    tasks.push(Promise.resolve(false));
  }

  const [slack, email] = await Promise.all(tasks);
  return { slack, email, suppressed: false };
}
