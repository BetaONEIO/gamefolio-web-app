import Anthropic from '@anthropic-ai/sdk';
import { and, asc, desc, eq, gt, isNull, lte } from 'drizzle-orm';
import { db, pool } from '../db';
import { pollOptions, polls, serverSettings } from '@shared/schema';
import { getPollWindow, parseGeneratedPoll, type GeneratedPoll } from './ai-poll-policy';
import { notifyUpcomingPoll } from '../telegram-notify';

const AI_POLL_LOCK = 618_240_214;
const DEFAULT_MODEL = 'claude-haiku-4-5-20251001';
const REVIEW_WINDOW_MS = 2 * 24 * 60 * 60 * 1000;

const POLL_TOOL: Anthropic.Tool = {
  name: 'create_gamefolio_poll',
  description: 'Return one engaging, safe community poll for Gamefolio.',
  input_schema: {
    type: 'object',
    properties: {
      theme: { type: 'string', enum: ['gamefolio', 'gaming'] },
      title: { type: 'string', maxLength: 120 },
      description: { type: 'string', maxLength: 500 },
      options: {
        type: 'array',
        minItems: 2,
        maxItems: 5,
        items: { type: 'string', maxLength: 100 },
      },
    },
    required: ['theme', 'title', 'description', 'options'],
  },
};

function buildPrompt(now: Date, recentTitles: string[], gamingContext: string): string {
  const previous = recentTitles.length > 0
    ? `Do not repeat or closely paraphrase these recent poll topics:\n- ${recentTitles.join('\n- ')}`
    : 'There are no previous poll topics to avoid.';

  const currentContext = gamingContext
    ? `Here is a short, web-researched snapshot of current gaming conversation. Use it only if it supports a neutral, verifiable poll; ignore rumours and unconfirmed claims:\n${gamingContext}`
    : 'No verified live gaming context is available, so keep any gaming-culture option evergreen rather than claiming something is current.';

  return `Create one community poll for Gamefolio, a gaming social app where players share clips and screenshots, build gaming profiles, follow creators, discover games, and participate in the community.

Choose whichever will be more engaging today:
1. A Gamefolio/product poll that helps us understand what players want from the app.
2. A timely gaming-culture poll relevant around ${now.toISOString().slice(0, 10)}.

Use 3-5 short, mutually distinct answer options. Keep it welcoming, playful, and easy to answer. Avoid politics, harassment, adult content, console-war bait, unreleased-game claims, rumours, leaks, and any factual news claim you cannot verify. Do not ask for personal or sensitive information. The description should be one short sentence and must not imply that Gamefolio endorses a game or platform.

${previous}

${currentContext}`;
}

async function getCurrentGamingContext(anthropic: Anthropic, now: Date): Promise<string> {
  try {
    const response = await anthropic.messages.create({
      model: process.env.AI_POLL_CLAUDE_MODEL || DEFAULT_MODEL,
      max_tokens: 400,
      tools: [{
        type: 'web_search_20250305',
        name: 'web_search',
        max_uses: 3,
      } as any],
      messages: [{
        role: 'user',
        content: `Search for two or three broadly relevant, non-rumour gaming topics being discussed around ${now.toISOString().slice(0, 10)}. Return a compact factual summary for another model to use when drafting a community poll. Exclude politics, leaks, adult content, and console-war framing.`,
      }],
    });
    return response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('\n')
      .slice(0, 2_000);
  } catch (error) {
    // Web search is an optional Anthropic capability. Accounts without it
    // still get a safe evergreen/app-oriented poll from the second call.
    console.warn('ai-poll-generator: live gaming context unavailable; using evergreen context', error);
    return '';
  }
}

async function askClaudeForPoll(now: Date, recentTitles: string[]): Promise<GeneratedPoll> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const gamingContext = await getCurrentGamingContext(anthropic, now);
  const response = await anthropic.messages.create({
    model: process.env.AI_POLL_CLAUDE_MODEL || DEFAULT_MODEL,
    max_tokens: 700,
    tools: [POLL_TOOL],
    tool_choice: { type: 'tool', name: POLL_TOOL.name },
    messages: [{ role: 'user', content: buildPrompt(now, recentTitles, gamingContext) }],
  });
  const toolUse = response.content.find((block): block is Anthropic.ToolUseBlock => block.type === 'tool_use');
  if (!toolUse) throw new Error('Claude did not return a poll');
  return parseGeneratedPoll(toolUse.input);
}

export type PollGenerationResult =
  | { status: 'created'; pollId: number; title: string }
  | { status: 'skipped'; reason: 'disabled' | 'missing_api_key' | 'poll_already_scheduled' | 'locked' };

async function sendReviewNotification(poll: {
  id: number;
  title: string;
  description: string;
  startsAt: Date;
  endsAt: Date;
  options: string[];
}): Promise<void> {
  const key = `ai_poll_telegram_notified_${poll.id}`;
  // The deliberately simple key lookup below is separate from poll state so a
  // failed Telegram request can be retried by the next scheduler tick.
  const notificationRows = await db.select({ key: serverSettings.key }).from(serverSettings)
    .where(eq(serverSettings.key, key))
    .limit(1);
  if (notificationRows.length > 0) return;
  const sent = await notifyUpcomingPoll(poll);
  if (!sent) {
    console.warn('ai-poll-generator: Telegram poll notifications are not configured');
    return;
  }
  await db.insert(serverSettings).values({ key, value: new Date().toISOString(), updatedAt: new Date() })
    .onConflictDoUpdate({ target: serverSettings.key, set: { value: new Date().toISOString(), updatedAt: new Date() } });
}

/**
 * Creates at most one two-week poll. A PostgreSQL advisory lock prevents
 * duplicate generation during overlapping ticks or multi-instance deploys.
 */
export async function runFortnightlyPollGenerator(now = new Date()): Promise<PollGenerationResult> {
  if (process.env.AI_POLL_GENERATION_ENABLED !== 'true') return { status: 'skipped', reason: 'disabled' };
  if (!process.env.ANTHROPIC_API_KEY) return { status: 'skipped', reason: 'missing_api_key' };

  const connection = await pool.reserve();
  let locked = false;
  try {
    const [lockResult] = await connection.unsafe(`SELECT pg_try_advisory_lock(${AI_POLL_LOCK}) AS ok`);
    locked = lockResult?.ok === true;
    if (!locked) return { status: 'skipped', reason: 'locked' };

    const reviewCutoff = new Date(now.getTime() + REVIEW_WINDOW_MS);
    const [upcomingAiPoll] = await db.select({
      id: polls.id,
      title: polls.title,
      description: polls.description,
      startsAt: polls.startsAt,
      endsAt: polls.endsAt,
    }).from(polls)
      .where(and(isNull(polls.createdBy), gt(polls.startsAt, now), lte(polls.startsAt, reviewCutoff)))
      .orderBy(asc(polls.startsAt))
      .limit(1);
    if (upcomingAiPoll) {
      const options = await db.select({ label: pollOptions.label }).from(pollOptions)
        .where(eq(pollOptions.pollId, upcomingAiPoll.id))
        .orderBy(asc(pollOptions.displayOrder));
      await sendReviewNotification({ ...upcomingAiPoll, options: options.map((option) => option.label) });
    }

    const [scheduledPoll] = await db.select({ id: polls.id, endsAt: polls.endsAt }).from(polls)
      .where(gt(polls.endsAt, now))
      .orderBy(desc(polls.endsAt))
      .limit(1);
    if (scheduledPoll && scheduledPoll.endsAt > reviewCutoff) return { status: 'skipped', reason: 'poll_already_scheduled' };

    const recent = await db.select({ title: polls.title }).from(polls)
      .orderBy(desc(polls.createdAt))
      .limit(8);
    const generated = await askClaudeForPoll(now, recent.map((poll) => poll.title));
    const { startsAt, endsAt } = getPollWindow(now, scheduledPoll?.endsAt);

    const created = await db.transaction(async (tx) => {
      // Re-check inside the write transaction in case an admin scheduled a
      // poll while Claude was generating the draft.
      const [overlap] = await tx.select({ id: polls.id }).from(polls)
        .where(and(gt(polls.endsAt, startsAt), gt(endsAt, polls.startsAt)))
        .limit(1);
      if (overlap) return null;

      const [poll] = await tx.insert(polls).values({
        title: generated.title,
        description: generated.description,
        startsAt,
        endsAt,
        createdBy: null,
      }).returning({ id: polls.id, title: polls.title });
      await tx.insert(pollOptions).values(generated.options.map((label, displayOrder) => ({
        pollId: poll.id,
        label,
        displayOrder,
      })));
      return { ...poll, description: generated.description };
    });

    if (!created) return { status: 'skipped', reason: 'poll_already_scheduled' };
    console.log(`ai-poll-generator: created poll #${created.id} "${created.title}" through ${endsAt.toISOString()}`);
    try {
      await sendReviewNotification({ ...created, startsAt, endsAt, options: generated.options });
    } catch (error) {
      // The poll remains scheduled and will run automatically. The unsent
      // marker means the next tick can retry the Telegram review notice.
      console.error('ai-poll-generator: Telegram review notification failed', error);
    }
    return { status: 'created', pollId: created.id, title: created.title };
  } finally {
    if (locked) await connection.unsafe(`SELECT pg_advisory_unlock(${AI_POLL_LOCK})`);
    connection.release();
  }
}

