import { z } from 'zod';

const FORTNIGHT_MS = 14 * 24 * 60 * 60 * 1000;
const REVIEW_WINDOW_MS = 2 * 24 * 60 * 60 * 1000;

const generatedPollSchema = z.object({
  theme: z.enum(['gamefolio', 'gaming']),
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(500),
  options: z.array(z.string().trim().min(1).max(100)).min(2).max(5),
}).superRefine((value, context) => {
  const unique = new Set(value.options.map((option) => option.toLocaleLowerCase()));
  if (unique.size !== value.options.length) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['options'], message: 'Poll options must be unique' });
  }
});

export type GeneratedPoll = z.infer<typeof generatedPollSchema>;

export function getPollWindow(now: Date, previousEndsAt?: Date): { startsAt: Date; endsAt: Date } {
  const startsAt = previousEndsAt && previousEndsAt > now
    ? previousEndsAt
    : new Date(now.getTime() + REVIEW_WINDOW_MS);
  return { startsAt, endsAt: new Date(startsAt.getTime() + FORTNIGHT_MS) };
}

export function parseGeneratedPoll(input: unknown): GeneratedPoll {
  return generatedPollSchema.parse(input);
}

