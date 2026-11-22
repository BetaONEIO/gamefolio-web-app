import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { QueryClient } from "@tanstack/react-query";
import type { ClipWithUser } from "../shared/schema";
import { evictDeletedContent } from "../client/src/components/clips/delete-cache";

function createClip(overrides: Partial<ClipWithUser> = {}): ClipWithUser {
  return {
    id: 123,
    userId: 7,
    shareCode: "delete-test",
    videoType: "clip",
    user: { id: 7, username: "demo" },
    ...overrides,
  } as ClipWithUser;
}

function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

test("clip deletion removes list entries and exact permalink caches", () => {
  const queryClient = createQueryClient();
  const clip = createClip();
  const other = createClip({ id: 456, shareCode: "keep-test" });

  queryClient.setQueryData(["/api/users/demo/clips"], [clip, other]);
  queryClient.setQueryData(["/api/clips/latest"], { clips: [clip, other] });
  queryClient.setQueryData(["/api/clips/trending", { gameId: 9 }], [clip, other]);
  queryClient.setQueryData(["/api/clips/123"], clip);
  queryClient.setQueryData(["/api/clips/share/delete-test"], clip);
  queryClient.setQueryData(["/api/reels/share/delete-test"], clip);
  queryClient.setQueryData(["/api/trending/screenshots"], [clip]);

  evictDeletedContent(queryClient, clip, "clip");

  assert.deepEqual(queryClient.getQueryData<ClipWithUser[]>(["/api/users/demo/clips"]), [other]);
  assert.deepEqual(
    queryClient.getQueryData<{ clips: ClipWithUser[] }>(["/api/clips/latest"]),
    { clips: [other] },
  );
  assert.deepEqual(
    queryClient.getQueryData<ClipWithUser[]>(["/api/clips/trending", { gameId: 9 }]),
    [other],
  );
  assert.equal(queryClient.getQueryData(["/api/clips/123"]), undefined);
  assert.equal(queryClient.getQueryData(["/api/clips/share/delete-test"]), undefined);
  assert.equal(queryClient.getQueryData(["/api/reels/share/delete-test"]), undefined);
  assert.deepEqual(queryClient.getQueryData(["/api/trending/screenshots"]), [clip]);
});

test("screenshot deletion removes list entries and exact permalink caches", () => {
  const queryClient = createQueryClient();
  const screenshot = createClip({ videoType: null });
  const other = createClip({ id: 456, shareCode: "keep-test", videoType: null });

  queryClient.setQueryData(["/api/users/7/screenshots"], { screenshots: [screenshot, other] });
  queryClient.setQueryData(["/api/trending/screenshots"], [screenshot, other]);
  queryClient.setQueryData(["/api/screenshots/123"], screenshot);
  queryClient.setQueryData(["/api/screenshots/share/delete-test"], screenshot);
  queryClient.setQueryData(["/api/clips/latest"], [screenshot]);

  evictDeletedContent(queryClient, screenshot, "screenshot");

  assert.deepEqual(
    queryClient.getQueryData<{ screenshots: ClipWithUser[] }>(["/api/users/7/screenshots"]),
    { screenshots: [other] },
  );
  assert.deepEqual(
    queryClient.getQueryData<ClipWithUser[]>(["/api/trending/screenshots"]),
    [other],
  );
  assert.equal(queryClient.getQueryData(["/api/screenshots/123"]), undefined);
  assert.equal(queryClient.getQueryData(["/api/screenshots/share/delete-test"]), undefined);
  assert.deepEqual(queryClient.getQueryData(["/api/clips/latest"]), [screenshot]);
});

test("successful delete closes global and viewer-specific overlays", () => {
  const menu = readFileSync("client/src/components/clips/TrendingClipMenu.tsx", "utf8");
  const mobileClips = readFileSync("client/src/components/clips/MobileClipsViewer.tsx", "utf8");
  const mobileOverlay = readFileSync("client/src/components/clips/MobileClipsViewerOverlay.tsx", "utf8");
  const mobileTrending = readFileSync("client/src/components/clips/MobileTrendingViewer.tsx", "utf8");
  const mobileScreenshots = readFileSync("client/src/components/screenshots/MobileScreenshotsViewer.tsx", "utf8");

  assert.match(menu, /const deleteMutation[\s\S]*?onSuccess:[\s\S]*?\(onHide \?\? closeClipDialog\)\(\)/);
  assert.match(mobileClips, /TrendingClipMenu clip=\{clip\} onHide=\{onDeleted\}/);
  assert.match(mobileClips, /ClipFeedCard clip=\{clip\} clips=\{clips\} onDeleted=\{onBack\}/);
  assert.match(mobileOverlay, /ClipFeedCard clip=\{clip\} clips=\{clips\} onDeleted=\{onBack\}/);
  assert.match(mobileTrending, /TrendingClipMenu[\s\S]{0,220}onHide=\{onClose\}/);
  assert.match(mobileScreenshots, /TrendingClipMenu[\s\S]{0,220}onHide=\{onDeleted\}/);
  assert.match(mobileScreenshots, /ScreenshotFeedCard[\s\S]{0,180}onDeleted=\{onBack\}/);
});
