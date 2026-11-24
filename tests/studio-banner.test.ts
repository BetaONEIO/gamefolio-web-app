import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_STUDIO_BANNER_URL, studioBannerSources } from "../shared/studio-banner";

const games = [{headerImageUrl:"other-game.jpg"}, {isPrimary:true,headerImageUrl:"banner.jpg",capsuleImageUrl:"cover.jpg",catalogImageUrl:"catalog.jpg"}];

test("Use game artwork replaces the custom upload with the featured game's sources", () => {
  assert.deepEqual(studioBannerSources("upload.jpg",games),["upload.jpg"]);
  assert.deepEqual(studioBannerSources("",games),["banner.jpg","cover.jpg","catalog.jpg"]);
  assert.deepEqual(studioBannerSources(DEFAULT_STUDIO_BANNER_URL,games),studioBannerSources("",games));
});

test("missing banners fall back to real covers, with no duplication or artwork from another game", () => {
  assert.deepEqual(studioBannerSources(null,[{capsuleImageUrl:"cover.jpg",catalogImageUrl:"cover.jpg"}]),["cover.jpg"]);
  assert.deepEqual(studioBannerSources(null,[]),[]);
  assert.deepEqual(studioBannerSources(null,[{}, {headerImageUrl:"unrelated.jpg"}]),[]);
});
