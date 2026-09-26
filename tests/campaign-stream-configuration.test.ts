import assert from "node:assert/strict";
import test from "node:test";
process.env.NODE_ENV = "test";
import {
  CAMPAIGN_COMMERCIAL_MODEL,
  DEFAULT_STREAM_CAMPAIGN_CONFIGURATION,
  calculateStreamCampaignEstimate,
  calculateStreamRecommendedCompletionXp,
  normalizeStreamCampaignConfiguration,
} from "../shared/campaign-commercial-model";
const {
  canonicalizeStreamSpotlightObjectiveSnapshot,
  normalizeStreamSpotlightConfiguration,
} = await import("../server/routes/campaign-programme");

test("Stream Spotlight is ordered between Content Boost and Creator Showcase", () => {
  const slugs = CAMPAIGN_COMMERCIAL_MODEL.presets.map(preset => preset.slug);
  assert.deepEqual(slugs, [
    "quick-creator",
    "content-boost",
    "stream-spotlight",
    "creator-showcase",
    "custom-campaign",
  ]);
  const preset = CAMPAIGN_COMMERCIAL_MODEL.presets.find(item => item.slug === "stream-spotlight");
  assert.ok(preset);
  assert.equal(preset.objectives.find(objective => objective.type === "stream")?.quantity, 1);
});

test("livestream configuration defaults and validates within supported limits", () => {
  const result = normalizeStreamCampaignConfiguration(DEFAULT_STREAM_CAMPAIGN_CONFIGURATION);
  assert.equal(result.error, null);
  assert.deepEqual(result.configuration, DEFAULT_STREAM_CAMPAIGN_CONFIGURATION);
  assert.equal(result.configuration?.requiredMinutes, 60);
  assert.deepEqual(result.configuration?.allowedPlatforms, ["twitch", "kick", "youtube"]);
  assert.equal(result.configuration?.allowAccumulatedTime, true);
  assert.equal(result.configuration?.maximumSessions, 2);
  assert.equal(result.configuration?.reconnectionGraceMinutes, 5);
  assert.equal(result.configuration?.requireDeveloperApproval, true);
});

test("Stream Spotlight canonicalizes every rule except the selected duration", () => {
  const result = normalizeStreamSpotlightConfiguration({
    requiredMinutes: 90,
    allowedPlatforms: ["rumble"],
    allowAccumulatedTime: false,
    maximumSessions: 5,
    reconnectionGraceMinutes: 0,
    requirePublicVod: true,
    requireGameMatch: false,
    requireTitleMention: true,
    requireDeveloperApproval: false,
    requireClipFromStream: true,
    instructions: "Override the rules",
  });

  assert.equal(result.error, null);
  assert.deepEqual(result.configuration, {
    requiredMinutes: 90,
    allowedPlatforms: ["twitch", "kick", "youtube"],
    allowAccumulatedTime: true,
    maximumSessions: 2,
    reconnectionGraceMinutes: 5,
    requirePublicVod: false,
    vodRetentionDays: 30,
    requireGameMatch: true,
    requireTitleMention: false,
    requireDeveloperApproval: true,
    requireClipFromStream: false,
    instructions: "Submit a publicly accessible stream or VOD link.",
  });
});

test("Stream Spotlight duration defaults to one hour and only accepts 15–240 minutes", () => {
  assert.equal(normalizeStreamSpotlightConfiguration(undefined).configuration?.requiredMinutes, 60);
  assert.equal(normalizeStreamSpotlightConfiguration({}, 120).configuration?.requiredMinutes, 120);
  assert.equal(normalizeStreamSpotlightConfiguration({ requiredMinutes: 15 }).error, null);
  assert.equal(normalizeStreamSpotlightConfiguration({ requiredMinutes: 240 }).error, null);
  for (const requiredMinutes of [14, 241, 60.5, "60"]) {
    assert.match(
      normalizeStreamSpotlightConfiguration({ requiredMinutes }).error ?? "",
      /between 15 and 240/,
    );
  }
});

test("Stream Spotlight create canonicalizes a clip-only objective payload to one required stream", () => {
  const templateObjectives = [
    { id: 1, content_type: "stream", title: "Stream the Game", quantity: 1, mandatory: true },
    { id: 2, content_type: "clip", title: "Stream clip", quantity: 1, mandatory: false },
  ];
  const snapshot = canonicalizeStreamSpotlightObjectiveSnapshot(
    [{ ...templateObjectives[1], mandatory: true }],
    templateObjectives,
  );

  assert.deepEqual(snapshot, [
    { ...templateObjectives[0], mandatory: true, quantity: 1 },
    { ...templateObjectives[1], mandatory: false },
  ]);
  assert.equal(snapshot.filter(objective => objective.content_type === "stream" && objective.mandatory).length, 1);
  assert.equal(snapshot.filter(objective => objective.mandatory && objective.content_type !== "stream").length, 0);
});

test("Stream Spotlight PATCH restores a removed stream and clears other required objectives", () => {
  const snapshot = canonicalizeStreamSpotlightObjectiveSnapshot([
    { id: 1, content_type: "stream", title: "Stream the Game", quantity: 0, mandatory: false },
    { id: 2, content_type: "clip", title: "Stream clip", quantity: 1, mandatory: true },
  ]);

  assert.deepEqual(snapshot, [
    { id: 1, content_type: "stream", title: "Stream the Game", quantity: 1, mandatory: true },
    { id: 2, content_type: "clip", title: "Stream clip", quantity: 1, mandatory: false },
  ]);
});

test("livestream configuration rejects missing platforms, invalid duration and extra persisted keys", () => {
  assert.match(normalizeStreamCampaignConfiguration({
    ...DEFAULT_STREAM_CAMPAIGN_CONFIGURATION,
    allowedPlatforms: [],
  }).error ?? "", /at least one/i);
  assert.match(normalizeStreamCampaignConfiguration({
    ...DEFAULT_STREAM_CAMPAIGN_CONFIGURATION,
    requiredMinutes: 481,
  }).error ?? "", /15 and 480/);
  assert.match(normalizeStreamCampaignConfiguration({
    ...DEFAULT_STREAM_CAMPAIGN_CONFIGURATION,
    futureAutoVerification: true,
  }).error ?? "", /unsupported fields/);
});

test("accumulated stream sessions are capped at five", () => {
  assert.equal(normalizeStreamCampaignConfiguration({
    ...DEFAULT_STREAM_CAMPAIGN_CONFIGURATION,
    allowAccumulatedTime: true,
    maximumSessions: 5,
  }).error, null);
  assert.match(normalizeStreamCampaignConfiguration({
    ...DEFAULT_STREAM_CAMPAIGN_CONFIGURATION,
    allowAccumulatedTime: true,
    maximumSessions: 6,
  }).error ?? "", /between 1 and 5/);
  assert.match(normalizeStreamCampaignConfiguration({
    ...DEFAULT_STREAM_CAMPAIGN_CONFIGURATION,
    allowAccumulatedTime: false,
    maximumSessions: 2,
  }).error ?? "", /must be 1/);
});

test("stream completion XP defaults higher than upload objectives and responds to duration, sessions, VOD and clips", () => {
  assert.equal(calculateStreamRecommendedCompletionXp(DEFAULT_STREAM_CAMPAIGN_CONFIGURATION), 4_000);
  assert.equal(calculateStreamRecommendedCompletionXp(DEFAULT_STREAM_CAMPAIGN_CONFIGURATION, {
    baseCompletionXp: 1_000,
  }), 5_000);
  assert.equal(calculateStreamRecommendedCompletionXp({
    ...DEFAULT_STREAM_CAMPAIGN_CONFIGURATION,
    requiredMinutes: 120,
    maximumSessions: 4,
    requirePublicVod: true,
    requireClipFromStream: true,
  }), 9_750);
});

test("custom stream completion reward combines canonical completion base and stream uplift once", () => {
  const xp = calculateStreamRecommendedCompletionXp({
    ...DEFAULT_STREAM_CAMPAIGN_CONFIGURATION,
    requireClipFromStream: true,
  }, {
    baseCompletionXp: 1_000,
    streamObjectiveCount: 2,
    clipObjectiveCount: 3,
    additionalContentCount: 2,
  });
  // 1,000 completion base + 7,000 streaming + 1,000 session uplift
  // + 2,250 clips + 500 additional content; objective XP is not added.
  assert.equal(xp, 11_750);
});

test("stream campaign forecast is directional and keeps access and reward keys separate", () => {
  const configuration = {
    ...DEFAULT_STREAM_CAMPAIGN_CONFIGURATION,
    requireClipFromStream: true,
  };
  const forecast = calculateStreamCampaignEstimate(configuration, {
    streamerCapacity: 5,
    campaignDurationDays: 14,
    completionXpPerCreator: 4_000,
    requiresDemoAccessKey: true,
    requiresFullGameRewardKey: true,
  });
  assert.deepEqual(forecast.estimatedStreamers, { min: 3, max: 5 });
  assert.deepEqual(forecast.requiredKeys, { demoAccess: 5, fullGameAccess: 0, fullGameReward: 5, total: 10 });
  assert.equal(forecast.minimumLiveCoverageMinutes, 180);
  assert.equal(forecast.potentialMaximumLiveCoverageMinutes, 600);
  assert.deepEqual(forecast.estimatedClips, { min: 3, max: 10 });
  assert.deepEqual(forecast.totalXpRewardPool, { min: 12_000, max: 20_000 });
  assert.equal(forecast.campaignDurationDays, 14);
  assert.equal(forecast.estimatesGuaranteed, false);

  const noKeyForecast = calculateStreamCampaignEstimate(configuration, {
    streamerCapacity: 5,
    campaignDurationDays: 14,
    completionXpPerCreator: 4_000,
  });
  assert.equal(noKeyForecast.requiredKeys.total, 0);
});