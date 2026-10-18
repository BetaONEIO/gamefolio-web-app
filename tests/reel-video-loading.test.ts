import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const playerPath = new URL("../client/src/components/shared/VideoPlayer.tsx", import.meta.url);
const mobileViewerPath = new URL("../client/src/components/clips/MobileTrendingViewer.tsx", import.meta.url);
const fullscreenViewerPath = new URL("../client/src/components/clips/FullscreenReelsViewer.tsx", import.meta.url);

test("video player holds its poster until a frame can render", async () => {
  const source = await readFile(playerPath, "utf8");
  assert.match(source, /!hasLoadedFrame && effectiveThumbnailUrl/);
  assert.match(source, /onLoadedData=\{\(\) => setHasLoadedFrame\(true\)\}/);
  assert.match(source, /isVideoUrlLoading \? null : signedVideoUrl/);
});

test("mobile reel viewers eagerly preload only the current and adjacent videos", async () => {
  const [mobile, fullscreen] = await Promise.all([
    readFile(mobileViewerPath, "utf8"),
    readFile(fullscreenViewerPath, "utf8"),
  ]);
  assert.match(mobile, /Math\.abs\(index - currentIndex\) <= 1/);
  assert.match(mobile, /preload="auto"/);
  assert.match(fullscreen, /Math\.abs\(index - currentIndex\) <= 1/);
  assert.match(fullscreen, /preload="auto"/);
});
