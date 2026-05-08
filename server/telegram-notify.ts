import type { User } from '@shared/schema';

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

export function notifyNewSignup(user: User): void {
  if (!BOT_TOKEN || !SIGNUP_CHAT_ID) return;

  const username = escapeHtml(user.username || `user-${user.id}`);
  const displayName = user.displayName && user.displayName !== user.username
    ? ` (${escapeHtml(user.displayName)})`
    : '';
  const provider = escapeHtml(providerLabel(user.authProvider));

  const text =
    `🎮 <b>New Gamefolio signup</b>\n` +
    `<b>${username}</b>${displayName}\n` +
    `via ${provider} · ID ${user.id}`;

  void postToTelegram(text).catch((err) => {
    console.error('[Telegram] notifyNewSignup error:', err);
  });
}
