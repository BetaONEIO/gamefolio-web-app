import assert from "node:assert/strict";
import test from "node:test";
import { getDueSeasonNotifications } from "../server/season-notification-policy.ts";

const seasons = [
  { num: 9, name: "Autumn Assault", months: ["2026-09", "2026-10", "2026-11"] },
  { num: 10, name: "Winter Warzone", months: ["2026-12", "2027-01", "2027-02"] },
];
const due = (date: string) => getDueSeasonNotifications(new Date(date), seasons);

test("starts only announce during the first day, not on a mid-season deployment", () => {
  assert.equal(due("2026-08-31T23:59:59Z").length, 0);
  assert.deepEqual(due("2026-09-01T00:00:00Z").map(event => event.stage), ["started"]);
  assert.equal(due("2026-09-01T23:59:59Z")[0].key, "season:9:started");
  assert.equal(due("2026-09-02T00:00:00Z").length, 0);
  assert.equal(due("2026-11-17T09:00:00Z").length, 0);
});

test("week and final-day reminders use the UTC season boundary", () => {
  assert.equal(due("2026-11-23T23:59:59Z").length, 0);
  const [week] = due("2026-11-24T00:00:00Z");
  assert.equal(week.stage, "ending_week");
  assert.equal(week.expiresAt.toISOString(), "2026-11-25T00:00:00.000Z");
  assert.equal(due("2026-11-25T00:00:00Z").length, 0);
  assert.deepEqual(due("2026-11-30T00:00:00Z").map(event => event.stage), ["ending_day"]);
  assert.deepEqual(due("2026-11-30T23:59:59Z").map(event => event.stage), ["ending_day"]);
});

test("a rollover ends the previous season and starts only a configured next season", () => {
  const events = due("2026-12-01T00:00:00Z");
  assert.deepEqual(events.map(event => event.key), ["season:9:ended", "season:10:started"]);
  assert.equal(due("2026-12-02T00:00:00Z").length, 0);
  assert.deepEqual(getDueSeasonNotifications(new Date("2026-12-01T00:00:00Z"), [seasons[0]])
    .map(event => event.stage), ["ended"]);
});

test("winter seasons handle year rollover and February correctly", () => {
  assert.deepEqual(due("2027-02-22T12:00:00Z").map(event => event.stage), ["ending_week"]);
  assert.deepEqual(due("2027-02-28T12:00:00Z").map(event => event.stage), ["ending_day"]);
  assert.deepEqual(due("2027-03-01T00:00:00Z").map(event => event.stage), ["ended"]);
  const leap = [{ num: 11, name: "Winter", months: ["2027-12", "2028-01", "2028-02"] }];
  assert.deepEqual(getDueSeasonNotifications(new Date("2028-02-29T12:00:00Z"), leap)
    .map(event => event.stage), ["ending_day"]);
});

test("empty, invalid and future season definitions do not send notifications", () => {
  assert.equal(getDueSeasonNotifications(new Date("2026-09-01"), []).length, 0);
  assert.equal(getDueSeasonNotifications(new Date("2026-09-01"), [
    { num: 1, name: "Empty", months: [] },
    { num: 2, name: "Invalid", months: ["invalid"] },
    seasons[1],
  ]).length, 0);
});
