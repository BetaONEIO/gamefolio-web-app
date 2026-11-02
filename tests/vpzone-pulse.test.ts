import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateVpzoneXP,
  isVpzoneEventFresh,
  vpzoneDedupeKey,
  vpzonePulseEventSchema,
} from "../server/services/vpzone-pulse";

test("converts Pulse to whole Gamefolio XP at a 0.5 rate", () => {
  assert.equal(calculateVpzoneXP(2), 1);
  assert.equal(calculateVpzoneXP(10), 5);
  assert.equal(calculateVpzoneXP(5), 2);
});

test("requires a positive integer Pulse amount, event ID, and timestamp", () => {
  const valid = { eventId: "evt-1", username: "player", pulses: 10, occurredAt: "2026-11-02T12:00:00Z" };
  assert.equal(vpzonePulseEventSchema.safeParse(valid).success, true);
  assert.equal(vpzonePulseEventSchema.safeParse({ ...valid, eventId: undefined }).success, false);
  assert.equal(vpzonePulseEventSchema.safeParse({ ...valid, pulses: 1.5 }).success, false);
  assert.equal(vpzonePulseEventSchema.safeParse({ ...valid, occurredAt: undefined }).success, false);
});

test("accepts recent events and rejects stale or far-future events", () => {
  const now = new Date("2026-11-02T12:15:00Z");
  assert.equal(isVpzoneEventFresh("2026-11-02T12:00:00Z", now, 15), true);
  assert.equal(isVpzoneEventFresh("2026-11-02T11:59:59Z", now, 15), false);
  assert.equal(isVpzoneEventFresh("2026-11-02T12:16:01Z", now, 15), false);
});

test("namespaces VPZone event IDs for XP idempotency", () => {
  assert.equal(vpzoneDedupeKey("evt-123"), "vpzone:pulse:evt-123");
});
