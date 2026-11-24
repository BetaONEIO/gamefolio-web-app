import assert from 'node:assert/strict';
import test from 'node:test';
import { previewCapacity, campaignPreviewOutputs, recommendCampaign } from '../client/src/pages/indie-dashboard/campaign-preview-model';
import { CAMPAIGN_COMMERCIAL_MODEL } from '../shared/campaign-commercial-model';

test('paired access capacity is limited by the smaller inventory and requested places', () => {
  assert.equal(previewCapacity('demo_to_full', { demo: 12, full: 4 }, 10), 4);
  assert.equal(previewCapacity('demo_to_full', { demo: 12, full: 40 }, 10), 10);
  assert.equal(previewCapacity('demo_to_full', { demo: 12 }, 10), 0);
});
test('single access pools and public access use their own capacity', () => {
  assert.equal(previewCapacity('demo', { demo: 6, full: 2 }, 10), 6);
  assert.equal(previewCapacity('full', { demo: 6, full: 2 }, 10), 2);
  assert.equal(previewCapacity('full', { full: -4 }, 10), 0);
  assert.equal(previewCapacity('no_key', {}, 10), 10);
});
test('content estimates scale with usable capacity and stay empty for an empty inventory', () => {
  const preset = CAMPAIGN_COMMERCIAL_MODEL.presets.find(p => p.slug === 'content-boost')!;
  const full = campaignPreviewOutputs(preset, 10), half = campaignPreviewOutputs(preset, 5);
  assert.ok(full.length > 0);
  full.forEach((output, i) => assert.equal(output.max, half[i].max * 2));
  assert.ok(campaignPreviewOutputs(preset, 0).every(o => o.min === 0 && o.max === 0));
});
test('monthly recommendation requires both allowance and usable access', () => {
  assert.equal(recommendCampaign(true, false, { full: 5 }), 'quick-creator');
  assert.equal(recommendCampaign(true, true, {}), 'quick-creator');
  assert.equal(recommendCampaign(true, false, {}), 'content-boost');
  assert.equal(recommendCampaign(false, false, { full: 5 }), 'content-boost');
});
