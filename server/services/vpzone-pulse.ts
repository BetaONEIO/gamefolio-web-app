import { z } from "zod";

export const VPZONE_XP_PER_PULSE = 0.5;
export const DEFAULT_VPZONE_MAX_PULSES_PER_EVENT = 500;
export const DEFAULT_VPZONE_DAILY_XP_LIMIT = 1_000;
export const DEFAULT_VPZONE_MONTHLY_XP_LIMIT = 5_000;
export const DEFAULT_VPZONE_EVENT_MAX_AGE_MINUTES = 15;

export const vpzonePulseEventSchema = z.object({
  eventId: z.string().trim().min(1).max(128),
  username: z.string().trim().min(1).max(100),
  vpzoneId: z.string().trim().min(1).max(128).optional(),
  pulses: z.number().int().positive().max(1_000_000),
  occurredAt: z.string().datetime({ offset: true }),
}).strict();

export type VPZonePulseEvent = z.infer<typeof vpzonePulseEventSchema>;

// Gamefolio XP is stored as whole numbers. Any half XP in a single event is
// rounded down, so VPZone should preferably send Pulse in multiples of two.
export function calculateVpzoneXP(pulses: number): number {
  return Math.floor(pulses * VPZONE_XP_PER_PULSE);
}

export function vpzoneDedupeKey(eventId: string): string {
  return `vpzone:pulse:${eventId}`;
}

function positiveIntegerEnv(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isSafeInteger(value) && value > 0 ? value : fallback;
}

export function getVpzonePulseLimits() {
  return {
    maxPulsesPerEvent: positiveIntegerEnv("VPZONE_MAX_PULSES_PER_EVENT", DEFAULT_VPZONE_MAX_PULSES_PER_EVENT),
    dailyXp: positiveIntegerEnv("VPZONE_DAILY_XP_LIMIT", DEFAULT_VPZONE_DAILY_XP_LIMIT),
    monthlyXp: positiveIntegerEnv("VPZONE_MONTHLY_XP_LIMIT", DEFAULT_VPZONE_MONTHLY_XP_LIMIT),
    maxAgeMinutes: positiveIntegerEnv("VPZONE_EVENT_MAX_AGE_MINUTES", DEFAULT_VPZONE_EVENT_MAX_AGE_MINUTES),
  };
}

export function isVpzoneEventFresh(occurredAt: string, now = new Date(), maxAgeMinutes = DEFAULT_VPZONE_EVENT_MAX_AGE_MINUTES): boolean {
  const eventTime = new Date(occurredAt).getTime();
  const deltaMs = now.getTime() - eventTime;
  // Permit up to one minute of clock skew, but never replay old events.
  return deltaMs >= -60_000 && deltaMs <= maxAgeMinutes * 60_000;
}
