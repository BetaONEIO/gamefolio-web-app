import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateVpzoneXP,
  vpzoneDedupeKey,
  vpzonePulseEventSchema,
} from "../server/services/vpzone-pulse";

test("converts Pulse to whole Gamefolio XP at a 0.5 rate", () => {
  assert.equal(calculateVpzoneXP(2), 1);
  assert.equal(calculateVpzoneXP(10), 5);
  assert.equal(calculateVpzoneXP(5), 2);
});

test("requires a positive integer Pulse amount and an event ID", () => {
  assert.equal(vpzonePulseEventSchema.safeParse({ eventId: "evt-1", username: "player", pulses: 10 }).success, true);
  assert.equal(vpzonePulseEventSchema.safeParse({ username: "player", pulses: 10 }).success, false);
  assert.equal(vpzonePulseEventSchema.safeParse({ eventId: "evt-1", username: "player", pulses: 1.5 }).success, false);
});

test("namespaces VPZone event IDs for XP idempotency", () => {
  assert.equal(vpzoneDedupeKey("evt-123"), "vpzone:pulse:evt-123");
});
