import assert from "node:assert/strict";
import test from "node:test";
import {
  getConnectedStreamChannels,
  normalizeStreamUrl,
  parseStreamCampaignConfig,
  streamSubmissionIdentities,
  streamSubmissionMeetsDuration,
  streamSubmissionUrls,
  streamUrlDuplicateKey,
  streamUrlMatchesChannel,
  validateDeveloperStreamReview,
  validateStreamSubmission,
} from "../server/stream-livestream-validation";

const config = parseStreamCampaignConfig({
  requiredMinutes: 60,
  allowedPlatforms: ["twitch", "kick"],
  allowAccumulatedTime: true,
  maximumSessions: 2,
  reconnectionGraceMinutes: 5,
  requirePublicVod: true,
  requireTitleMention: true,
});
const channelProfile = {
  twitch_verified: true,
  twitch_user_id: "123",
  twitch_channel_name: "StreamMaker",
  kick_verified: true,
  kick_id: "456",
  kick_channel_name: "streammaker",
};

test("campaign stream configuration is bounded and retains only supported platforms", () => {
  assert.deepEqual(parseStreamCampaignConfig({
    requiredMinutes: 9000,
    maximumSessions: 50,
    reconnectionGraceMinutes: -1,
    allowedPlatforms: ["Twitch", "rumble", "not-a-platform"],
  }), {
    requiredMinutes: 60,
    allowedPlatforms: ["twitch", "rumble"],
    allowAccumulatedTime: true,
    maximumSessions: 2,
    reconnectionGraceMinutes: 5,
    requirePublicVod: false,
    vodRetentionDays: null,
    requireGameMatch: false,
    requireTitleMention: false,
    requireDeveloperApproval: true,
    requireClipFromStream: false,
    instructions: null,
  });
  assert.equal(parseStreamCampaignConfig(null), null);
});

test("only verified connected channels are eligible and links must match their platform", () => {
  const channels = getConnectedStreamChannels(channelProfile);
  assert.deepEqual(channels.map((channel) => channel.platform), ["twitch", "kick"]);
  assert.equal(normalizeStreamUrl("https://twitch.tv/StreamMaker", "twitch"), "https://twitch.tv/StreamMaker");
  assert.equal(normalizeStreamUrl("http://twitch.tv/StreamMaker", "twitch"), null);
  assert.equal(normalizeStreamUrl("https://twitch.tv.evil.example/StreamMaker", "twitch"), null);
  assert.equal(streamUrlMatchesChannel("https://kick.com/streammaker/videos/1", "kick", "StreamMaker"), true);
  assert.equal(streamUrlMatchesChannel("https://kick.com/other", "kick", "StreamMaker"), false);
  assert.equal(streamUrlDuplicateKey("https://www.twitch.tv/StreamMaker/"), "twitch.tv/streammaker");
  assert.equal(streamUrlDuplicateKey("https://youtu.be/Video-1?t=20"), "youtube:video-1");
  assert.equal(streamUrlDuplicateKey("https://www.youtube.com/watch?v=Video-1"), "youtube:video-1");
  assert.deepEqual(streamSubmissionUrls({
    streamUrl: "https://twitch.tv/StreamMaker",
    sessions: [{
      streamUrl: "https://twitch.tv/StreamMaker",
      vodUrl: "https://twitch.tv/videos/1",
    }],
  }), ["https://twitch.tv/StreamMaker", "https://twitch.tv/videos/1"]);
});

test("stream sessions require channel ownership, valid dates, durations, title, and public VOD", () => {
  assert.ok(config);
  const endedAt = Date.now() - 5 * 60_000;
  const startedAt = endedAt - 60 * 60_000;
  const started = new Date(startedAt).toISOString();
  const ended = new Date(endedAt).toISOString();
  const result = validateStreamSubmission({
    platform: "twitch",
    connectedChannelId: "123",
    platformStreamId: "creator-supplied-fake-id",
    streamUrl: "https://twitch.tv/StreamMaker",
    vodUrl: "https://twitch.tv/videos/321",
    streamTitle: "Game Night: Great Game",
    claimedMinutes: 60,
    sessions: [{
      streamedAt: started,
      startedAt: started,
      endedAt: ended,
      claimedMinutes: 60,
      streamUrl: "https://twitch.tv/StreamMaker",
      vodUrl: "https://twitch.tv/videos/321",
    }],
  }, {
    config,
    channels: getConnectedStreamChannels(channelProfile),
    joinedAt: new Date(startedAt - 24 * 60 * 60_000).toISOString(),
    deadline: new Date(endedAt + 24 * 60 * 60_000).toISOString(),
    gameName: "Great Game",
  });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.data.verifiedMinutes, null);
    assert.equal(result.data.verificationStatus, "needs_review");
    assert.equal(result.data.connectedChannelId, "123");
    assert.equal(result.data.platformStreamId, null);
  }
});

test("stream duration validation counts accumulated minutes without auto-verifying", () => {
  assert.equal(streamSubmissionMeetsDuration({ claimedMinutes: 60 }, 60), true);
  assert.equal(streamSubmissionMeetsDuration({ claimedMinutes: 59 }, 60), false);
  assert.equal(streamSubmissionMeetsDuration({ claimedMinutes: 60, verifiedMinutes: null }, 60), true);
});

test("repeated channel links allow distinct sessions but reject reused VODs", () => {
  assert.ok(config);
  const now = Date.now();
  const firstStart = new Date(now - 180 * 60_000).toISOString();
  const firstEnd = new Date(now - 120 * 60_000).toISOString();
  const secondStart = new Date(now - 110 * 60_000).toISOString();
  const secondEnd = new Date(now - 50 * 60_000).toISOString();
  const makeSession = (startedAt: string, endedAt: string, vodUrl: string) => ({
    streamedAt: startedAt,
    startedAt,
    endedAt,
    claimedMinutes: 60,
    streamUrl: "https://twitch.tv/StreamMaker",
    vodUrl,
  });
  const makeSubmission = (secondVod: string) => validateStreamSubmission({
    platform: "twitch",
    connectedChannelId: "123",
    streamUrl: "https://twitch.tv/StreamMaker",
    vodUrl: "https://twitch.tv/videos/first",
    streamTitle: "Great Game stream",
    claimedMinutes: 120,
    sessions: [
      makeSession(firstStart, firstEnd, "https://twitch.tv/videos/first"),
      makeSession(secondStart, secondEnd, secondVod),
    ],
  }, {
    config,
    channels: getConnectedStreamChannels(channelProfile),
    joinedAt: new Date(now - 24 * 60 * 60_000),
    deadline: new Date(now + 24 * 60 * 60_000),
    gameName: "Great Game",
  });

  const distinctSessions = makeSubmission("https://twitch.tv/videos/second");
  assert.equal(distinctSessions.ok, true);
  if (!distinctSessions.ok) return;
  const first = {
    ...distinctSessions.data,
    sessions: [distinctSessions.data.sessions[0]],
    vodUrl: distinctSessions.data.sessions[0].vodUrl,
  };
  const second = {
    ...distinctSessions.data,
    sessions: [distinctSessions.data.sessions[1]],
    vodUrl: distinctSessions.data.sessions[1].vodUrl,
  };
  const firstIdentities = streamSubmissionIdentities(first);
  const secondIdentities = streamSubmissionIdentities(second);
  assert.equal(firstIdentities.some((identity) => secondIdentities.includes(identity)), false);
  assert.equal(makeSubmission("https://twitch.tv/videos/first").ok, false);

  const reusedVod = { ...second, sessions: [{
    ...second.sessions[0],
    vodUrl: first.sessions[0].vodUrl,
  }] };
  assert.ok(streamSubmissionIdentities(first).some((identity) =>
    streamSubmissionIdentities(reusedVod).includes(identity)));
});

test("developer stream review requires explicit bounded minutes and matching game evidence", () => {
  assert.ok(config);
  const now = Date.now();
  const startedAt = new Date(now - 65 * 60_000).toISOString();
  const endedAt = new Date(now - 5 * 60_000).toISOString();
  const submission = validateStreamSubmission({
    platform: "twitch",
    connectedChannelId: "123",
    streamUrl: "https://twitch.tv/StreamMaker",
    vodUrl: "https://twitch.tv/videos/321",
    streamTitle: "Great Game stream",
    claimedMinutes: 60,
    sessions: [{
      streamedAt: startedAt,
      startedAt,
      endedAt,
      claimedMinutes: 60,
      streamUrl: "https://twitch.tv/StreamMaker",
      vodUrl: "https://twitch.tv/videos/321",
    }],
  }, {
    config,
    channels: getConnectedStreamChannels(channelProfile),
    joinedAt: new Date(now - 24 * 60 * 60_000),
    deadline: new Date(now + 24 * 60 * 60_000),
    gameName: "Great Game",
  });
  assert.equal(submission.ok, true);
  if (!submission.ok) return;
  const options = {
    requiredMinutes: 60,
    requireGameMatch: true,
    gameTargets: ["Great Game", "Action RPG"],
  };
  assert.equal(validateDeveloperStreamReview(submission.data, null, options).ok, false);
  assert.equal(validateDeveloperStreamReview(submission.data, { verifiedMinutes: 59, detectedGame: "Great Game" }, options).ok, false);
  assert.equal(validateDeveloperStreamReview(submission.data, { verifiedMinutes: 61, detectedGame: "Great Game" }, options).ok, false);
  assert.equal(validateDeveloperStreamReview(submission.data, { verifiedMinutes: 60 }, options).ok, false);
  const approved = validateDeveloperStreamReview(submission.data, {
    verifiedMinutes: 60,
    detectedGame: "Action RPG",
  }, options);
  assert.equal(approved.ok, true);
  if (approved.ok) {
    assert.equal(approved.data.verifiedMinutes, 60);
    assert.equal(approved.data.detectedGame, "Action RPG");
    assert.equal(approved.data.verificationMethod, "developer");
  }
});