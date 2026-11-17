import assert from "node:assert/strict";
import test from "node:test";
import { loadIsolatedService } from "./helpers/isolated-typescript.ts";

async function setup() {
  let clip: any = {
    id: 42, userId: 1, status: "ready", videoType: "clip", title: "Great win",
    shareCode: "clipcode", user: { username: "creator" },
  };
  let ownerStatus = "active";
  let followers = [{ id: 2, status: "active" }];
  const blocked = new Set<number>();
  const failed = new Set<number>();
  const claims = new Set<string>();
  const inbox: any[] = [];
  const pushes: any[] = [];
  let followerReads = 0;
  const storage = {
    getClipWithUser: async () => clip,
    getUser: async () => ({ id: 1, status: ownerStatus }),
    getFollowersByUserId: async () => { followerReads++; return followers; },
    isUserBlocked: async (_owner: number, recipient: number) => blocked.has(recipient),
    updateClip: async (_id: number, changes: object) => { clip = { ...clip, ...changes }; },
    createNotification: async (notification: any) => {
      const row = { id: inbox.length + 1, ...notification };
      inbox.push(row);
      return row;
    },
    createNotificationOnce: async (notification: any, key: string) => {
      if (failed.has(notification.userId)) throw new Error("Simulated recipient failure");
      const claim = `${notification.userId}:${key}`;
      if (claims.has(claim)) return null;
      claims.add(claim);
      return storage.createNotification(notification);
    },
  };
  const service = await loadIsolatedService(new URL("../server/notification-service.ts", import.meta.url), {
    "./storage": { storage },
    "./push-service": { sendPushToUser: async (userId: number, options: any) => pushes.push({ userId, ...options }) },
    "nanoid": { nanoid: () => "new-code" },
  });
  return {
    service, inbox, pushes, claims, blocked, failed,
    setClip: (value: any) => { clip = value; },
    clip: () => clip,
    setOwnerStatus: (value: string) => { ownerStatus = value; },
    setFollowers: (value: typeof followers) => { followers = value; },
    followerReads: () => followerReads,
  };
}

test("processing, failed, deleted and wrong-owner clips do not notify followers", async () => {
  const s = await setup();
  const original = s.clip();
  for (const clip of [{ ...original, status: "processing" }, { ...original, status: "failed" }, null, { ...original, userId: 99 }]) {
    s.setClip(clip);
    await s.service.NotificationService.createUploadNotification(1, 42);
  }
  assert.equal(s.followerReads(), 0);
  assert.equal(s.pushes.length, 0);
});

test("ready reels notify eligible followers with a working share link", async () => {
  const s = await setup();
  s.setClip({ ...s.clip(), videoType: "reel" });
  s.setFollowers([{ id: 1, status: "active" }, { id: 2, status: "active" }, { id: 3, status: "active" }, { id: 4, status: "banned" }]);
  s.blocked.add(3);
  await s.service.NotificationService.createUploadNotification(1, 42);
  assert.deepEqual(s.pushes.map(push => push.userId), [2]);
  assert.match(s.pushes[0].body, /new reel/);
  assert.equal(s.pushes[0].actionUrl, "/@creator/clip/clipcode");
  assert.equal(s.pushes[0].data.type, "upload");
  assert.equal(s.pushes[0].data.notificationId, String(s.inbox[0].id));
  assert.ok(s.claims.has("2:upload:42"));
});

test("concurrent completion calls and inbox deletion do not repeat an upload push", async () => {
  const s = await setup();
  await Promise.all([
    s.service.NotificationService.createUploadNotification(1, 42),
    s.service.NotificationService.createUploadNotification(1, 42),
  ]);
  s.inbox.length = 0;
  await s.service.NotificationService.createUploadNotification(1, 42);
  assert.equal(s.pushes.length, 1);
});

test("a failed recipient does not prevent delivery to other followers", async () => {
  const s = await setup();
  s.setFollowers([{ id: 2, status: "active" }, { id: 3, status: "active" }]);
  s.failed.add(2);
  await s.service.NotificationService.createUploadNotification(1, 42);
  assert.deepEqual(s.pushes.map(push => push.userId), [3]);
  s.failed.clear();
  await s.service.NotificationService.createUploadNotification(1, 42);
  assert.deepEqual(s.pushes.map(push => push.userId), [3, 2]);
});

test("inactive creators and uploads with no followers generate no push", async () => {
  const s = await setup();
  s.setOwnerStatus("suspended");
  await s.service.NotificationService.createUploadNotification(1, 42);
  assert.equal(s.followerReads(), 0);
  s.setOwnerStatus("active");
  s.setFollowers([]);
  await s.service.NotificationService.createUploadNotification(1, 42);
  assert.equal(s.pushes.length, 0);
});

test("legacy clips get a share code before followers receive their link", async () => {
  const s = await setup();
  s.setClip({ ...s.clip(), shareCode: null });
  await s.service.NotificationService.createUploadNotification(1, 42);
  assert.equal(s.clip().shareCode, "new-code");
  assert.equal(s.pushes[0].actionUrl, "/@creator/clip/new-code");
});

test("ordinary notifications retain their existing delivery behaviour", async () => {
  const s = await setup();
  const notification = { userId: 2, type: "message", title: "New message", message: "Hello" };
  await s.service.createAndPush(notification);
  await s.service.createAndPush(notification);
  assert.equal(s.inbox.length, 2);
  assert.equal(s.pushes.length, 2);
  assert.equal(s.claims.size, 0);
});
