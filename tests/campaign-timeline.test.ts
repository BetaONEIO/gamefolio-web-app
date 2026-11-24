import assert from "node:assert/strict";
import test from "node:test";
import { formatCampaignMoment, parseLocalCampaignLaunch } from "../client/src/lib/campaign-timeline";

test("scheduled local launch becomes a canonical instant and keeps a precise close", () => {
  const previous = process.env.TZ;
  try {
    process.env.TZ = "Europe/London";
    const launch = parseLocalCampaignLaunch("2026-10-01", "10:00");
    assert.equal(launch?.toISOString(), "2026-10-01T09:00:00.000Z");
    assert.deepEqual(formatCampaignMoment(launch), { dateLabel: "1 Oct 2026", timeLabel: "10:00 BST" });
    const close = new Date(launch!.getTime() + 30 * 86_400_000);
    assert.equal(close.toISOString(), "2026-10-31T09:00:00.000Z");
    assert.deepEqual(formatCampaignMoment(close), { dateLabel: "31 Oct 2026", timeLabel: "09:00 GMT" });
    process.env.TZ = "America/New_York";
    assert.deepEqual(formatCampaignMoment(launch), { dateLabel: "1 Oct 2026", timeLabel: "05:00 GMT-4" });
  } finally {
    if (previous === undefined) delete process.env.TZ;
    else process.env.TZ = previous;
  }
});

test("invalid and unknown instants are never shown as dates", () => {
  assert.equal(parseLocalCampaignLaunch("2026-02-30", "10:00"), null);
  assert.equal(parseLocalCampaignLaunch("", "10:00"), null);
  assert.equal(formatCampaignMoment(null), null);
  assert.equal(formatCampaignMoment("not-a-date"), null);
});