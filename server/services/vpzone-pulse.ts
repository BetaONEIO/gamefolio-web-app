import { z } from "zod";

export const VPZONE_XP_PER_PULSE = 0.5;

export const vpzonePulseEventSchema = z.object({
  eventId: z.string().trim().min(1).max(128),
  username: z.string().trim().min(1).max(100),
  pulses: z.number().int().positive().max(1_000_000),
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
