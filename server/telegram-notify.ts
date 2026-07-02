import type { User } from '@shared/schema';
import { getSignupSource } from './request-context';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const SIGNUP_CHAT_ID = process.env.TELEGRAM_SIGNUP_CHAT_ID;
const SEND_TIMEOUT_MS = 5_000;

if (!BOT_TOKEN || !SIGNUP_CHAT_ID) {
  console.warn(
    '[Telegram] TELEGRAM_BOT_TOKEN or TELEGRAM_SIGNUP_CHAT_ID not set — signup notifications disabled',
  );
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] || c));
}

function providerLabel(authProvider: string | null | undefined): string {
  switch (authProvider) {
    case 'google': return 'Google';
    case 'discord': return 'Discord';
    case 'xbox': return 'Xbox';
    case 'apple': return 'Apple';
    case 'local':
    case null:
    case undefined:
    case '':
      return 'Email';
    default:
      return authProvider;
  }
}

async function postToTelegram(text: string): Promise<void> {
  if (!BOT_TOKEN || !SIGNUP_CHAT_ID) return;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);
  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: SIGNUP_CHAT_ID,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error(`[Telegram] sendMessage failed (${res.status}): ${body.slice(0, 200)}`);
    }
  } finally {
    clearTimeout(timeout);
  }
}

function userLine(user: User): string {
  const username = escapeHtml(user.username || `user-${user.id}`);
  const displayName = user.displayName && user.displayName !== user.username
    ? ` (${escapeHtml(user.displayName)})`
    : '';
  return `<b>${username}</b>${displayName}`;
}

function planLabel(plan: string | null | undefined): string {
  switch (plan) {
    case 'yearly': return 'Yearly';
    case 'monthly': return 'Monthly';
    case null:
    case undefined:
    case '':
      return 'Pro';
    default:
      return plan;
  }
}

export function notifyNewSignup(user: User): void {
  if (!BOT_TOKEN || !SIGNUP_CHAT_ID) return;

  const provider = escapeHtml(providerLabel(user.authProvider));
  const source = escapeHtml(getSignupSource());

  const text =
    `🎮 <b>New Gamefolio signup</b>\n` +
    `${userLine(user)}\n` +
    `via ${provider} · ID ${user.id}\n` +
    `📍 ${source}`;

  void postToTelegram(text).catch((err) => {
    console.error('[Telegram] notifyNewSignup error:', err);
  });
}

export interface ProPurchaseInfo {
  /** 'new' for a first-time subscription, 'renewal' for a billing-cycle renewal. */
  kind: 'new' | 'renewal';
  /** 'monthly' | 'yearly' — best-effort, falls back to "Pro". */
  plan?: string | null;
  /** Where the payment came from, e.g. 'Stripe' or 'RevenueCat'. */
  source: string;
}

export function notifyProPurchase(user: User, info: ProPurchaseInfo): void {
  if (!BOT_TOKEN || !SIGNUP_CHAT_ID) return;

  const heading = info.kind === 'renewal'
    ? '🔁 <b>Pro renewal</b>'
    : '💎 <b>New Pro subscription</b>';
  const plan = escapeHtml(planLabel(info.plan));
  const source = escapeHtml(info.source);

  const text =
    `${heading}\n` +
    `${userLine(user)}\n` +
    `${plan} · via ${source} · ID ${user.id}`;

  void postToTelegram(text).catch((err) => {
    console.error('[Telegram] notifyProPurchase error:', err);
  });
}
