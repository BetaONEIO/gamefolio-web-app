import type { User } from '@shared/schema';
import { getSignupSource } from './request-context';
import { captureRouteError } from './sentry';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const SIGNUP_CHAT_ID = process.env.TELEGRAM_SIGNUP_CHAT_ID;
const SEND_TIMEOUT_MS = 5_000;
const MAX_ATTEMPTS = 3;

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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type SendResult =
  | { ok: true }
  | { ok: false; status: number; retryAfterMs?: number; body: string };

async function sendOnce(text: string): Promise<SendResult> {
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
    if (res.ok) return { ok: true };
    const body = await res.text().catch(() => '');
    // Telegram's 429 responses include `parameters.retry_after` (seconds) —
    // honor it when present instead of guessing a backoff.
    let retryAfterMs: number | undefined;
    try {
      const parsed = JSON.parse(body);
      if (typeof parsed?.parameters?.retry_after === 'number') {
        retryAfterMs = parsed.parameters.retry_after * 1000;
      }
    } catch {
      /* not JSON — no retry_after available */
    }
    return { ok: false, status: res.status, retryAfterMs, body: body.slice(0, 200) };
  } finally {
    clearTimeout(timeout);
  }
}

// Telegram throttles sendMessage to roughly 1/sec per chat, so two signups
// landing in the same second used to silently drop one notification with only
// a console.error — no retry and no trace anywhere queryable afterward. This
// retries transient failures (429s, timeouts, network errors) with backoff,
// and reports a final failure to Sentry so it's actually visible instead of
// silent.
async function postToTelegram(text: string): Promise<void> {
  if (!BOT_TOKEN || !SIGNUP_CHAT_ID) return;

  let lastError = 'unknown error';
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const result = await sendOnce(text);
      if (result.ok) return;
      lastError = `HTTP ${result.status}: ${result.body}`;
      if (attempt < MAX_ATTEMPTS) {
        await sleep(result.retryAfterMs ?? attempt * 1000);
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      if (attempt < MAX_ATTEMPTS) {
        await sleep(attempt * 1000);
      }
    }
  }

  const finalError = new Error(`[Telegram] sendMessage failed after ${MAX_ATTEMPTS} attempts: ${lastError}`);
  console.error(finalError.message);
  captureRouteError(finalError, { context: 'telegram-notify' });
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

/**
 * Onboarding persona tags, as written by client/src/components/auth/
 * onboarding-flow.tsx into users.user_type (a comma-separated string).
 * The three top-level paths are "gamer" (which additionally stores up to two
 * interest tags), "streamer", and "indie" (stored as `indie_developer`).
 * The trailing entries are legacy values from the previous onboarding that
 * still exist on older accounts.
 */
const USER_TYPE_LABELS: Record<string, string> = {
  gamer: 'Gamer',
  content_creator: 'Content Creator',
  professional_gamer: 'Pro Gamer',
  viewer: 'Viewer',
  competitive: 'Competitive',
  casual: 'Casual Gamer',
  retro: 'Retro Gamer',
  collector: 'Collector',
  streamer: 'Streamer',
  indie_developer: 'Game Developer',
  // Legacy — no longer offered, but present on pre-existing accounts.
  filthy_casual: 'Casual',
  doom_scroller: 'Doom Scroller',
};

function parseUserTypes(userType: string | null | undefined): string[] {
  return (userType || '').split(',').map((t) => t.trim()).filter(Boolean);
}

/**
 * Collapse the persona tags back down to the path the user actually picked on
 * the "choose your path" step. The path isn't stored as its own column, so it
 * has to be derived: `indie_developer` and `streamer` are only ever written by
 * their own paths, and everything else came from the gamer path.
 */
function pathFor(tags: string[]): { emoji: string; label: string } | null {
  if (tags.includes('indie_developer')) return { emoji: '\u{1F6E0}\uFE0F', label: 'Game Developer' };
  if (tags.includes('streamer')) return { emoji: '\u{1F4FA}', label: 'Streamer' };
  if (tags.length > 0) return { emoji: '\u{1F3AE}', label: 'Gamer' };
  return null;
}

/**
 * "🎮 <b>Gamer</b> · Pro Gamer, Competitive" — the chosen path in bold,
 * followed by any extra interest tags. Returns null when the user has no
 * persona yet (i.e. hasn't finished onboarding).
 */
function personaLine(userType: string | null | undefined): string | null {
  const tags = parseUserTypes(userType);
  const path = pathFor(tags);
  if (!path) return null;

  const extras = tags
    .map((t) => USER_TYPE_LABELS[t] || t)
    .filter((label) => label !== path.label);

  const suffix = extras.length > 0 ? ` \u00B7 ${escapeHtml(extras.join(', '))}` : '';
  return `${path.emoji} <b>${escapeHtml(path.label)}</b>${suffix}`;
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

/**
 * Fired when a user finishes onboarding and picks their path (Gamer /
 * Streamer / Game Developer).
 *
 * This is deliberately a separate message from notifyNewSignup: user_type is
 * still null at account-creation time — OAuth sign-in routes explicitly null
 * it to force onboarding — so the signup notification can never carry the
 * persona. Keeping the two events apart also makes signup-to-onboarding
 * drop-off visible in the chat.
 */
export function notifyOnboardingComplete(user: User): void {
  if (!BOT_TOKEN || !SIGNUP_CHAT_ID) return;

  const persona = personaLine(user.userType);
  if (!persona) return;

  const source = escapeHtml(getSignupSource());

  const text =
    `🧭 <b>Onboarding complete</b>\n` +
    `${userLine(user)}\n` +
    `${persona}\n` +
    `ID ${user.id} · 📍 ${source}`;

  void postToTelegram(text).catch((err) => {
    console.error('[Telegram] notifyOnboardingComplete error:', err);
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

  const persona = personaLine(user.userType);

  const text =
    `${heading}\n` +
    `${userLine(user)}\n` +
    (persona ? `${persona}\n` : '') +
    `${plan} · via ${source} · ID ${user.id}`;

  void postToTelegram(text).catch((err) => {
    console.error('[Telegram] notifyProPurchase error:', err);
  });
}
