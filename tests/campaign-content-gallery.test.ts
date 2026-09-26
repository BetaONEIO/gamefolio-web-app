import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CampaignContentGallery, campaignContentItems } from "../client/src/components/bounties/CampaignContentGallery";

const objectives = [
  { id: 10, content_type: "screenshot", title: "Capture the Game", submissions: [
    { id: 1, slot_index: 0, status: "changes_requested", thumbnail_url: "/old.jpg" },
    { id: 3, slot_index: 0, status: "staged", media_title: "Gameplay screen", media_url: "/actual.jpg", thumbnail_url: "/actual-thumb.jpg" },
    { id: 4, slot_index: 1, status: "staged", media_url: "/second.jpg" },
  ] },
  { id: 20, content_type: "clip", title: "Gameplay Clip", submissions: [
    { id: 5, slot_index: 0, status: "under_review", media_title: "Boss fight", media_url: "/boss.mp4", thumbnail_url: "/boss.jpg", media_duration_seconds: 34 },
  ] },
  { id: 30, content_type: "feedback", title: "Share Your Feedback", submissions: [
    { id: 6, slot_index: 0, status: "staged", content_data: { text: "The combat feels responsive and satisfying." } },
  ] },
];

test("gallery shows only the current persisted submission for each objective slot", () => {
  const items = campaignContentItems(objectives);
  assert.equal(items.length, 4);
  assert.equal(items.some(item => item.id === 1), false);
  assert.equal(items.find(item => item.id === 3)?.mediaUrl, "/actual.jpg");
  assert.equal(items.find(item => item.id === 6)?.text, "The combat feels responsive and satisfying.");
  assert.equal(items.find(item => item.id === 5)?.duration, 34);
});

test("gallery renders real media, text, dynamic category counts and draft actions", () => {
  const html = renderToStaticMarkup(createElement(CampaignContentGallery, { objectives, onRemove: () => {}, onEdit: () => {} }));
  assert.match(html, /Uploaded content/i);
  assert.match(html, /All.*4/);
  assert.match(html, /Screenshots.*2/);
  assert.match(html, /Gameplay clips.*1/);
  assert.match(html, /Feedback.*1/);
  assert.match(html, /actual-thumb\.jpg/);
  assert.match(html, /boss\.jpg/);
  assert.match(html, /00:34/);
  assert.match(html, /combat feels responsive/);
  assert.match(html, /View \/ edit/);
  assert.match(html, /Remove/);
  assert.doesNotMatch(html, /old\.jpg/);
});

test("submitted content remains visible with no edit or removal controls", () => {
  const html = renderToStaticMarkup(createElement(CampaignContentGallery, { objectives, state: "submitted", onRemove: () => {}, onEdit: () => {} }));
  assert.match(html, /Submitted content/i);
  assert.match(html, /actual-thumb\.jpg/);
  assert.doesNotMatch(html, /View \/ edit/);
  assert.doesNotMatch(html, /Remove Gameplay screen/);
});

test("owner reviews the same media and feedback with per-item change selection", () => {
  const html = renderToStaticMarkup(createElement(CampaignContentGallery, { objectives, reviewer: true, onMarkForChanges: () => {}, selectedIds: [5] }));
  assert.match(html, /Creator submission/i);
  assert.match(html, /actual-thumb\.jpg/);
  assert.match(html, /combat feels responsive/);
  assert.match(html, /Selected for changes/);
  assert.doesNotMatch(html, /View \/ edit/);
  assert.doesNotMatch(html, /Remove Gameplay screen/);
});

test("empty persisted package has a small empty state", () => {
  const html = renderToStaticMarkup(createElement(CampaignContentGallery, { objectives: [] }));
  assert.match(html, /Nothing added yet/);
  assert.doesNotMatch(html, /role="tab"/);
});