import test from 'node:test';
import assert from 'node:assert/strict';
import { CAMPAIGN_COMMERCIAL_MODEL, getPresetSubmissionEstimate } from '../shared/campaign-commercial-model';

test('Quick Creator advertises the same five places as its allocation', () => {
  const preset = CAMPAIGN_COMMERCIAL_MODEL.presets.find(p => p.slug === 'quick-creator')!;
  assert.equal(preset.estimatedCreatorMin, CAMPAIGN_COMMERCIAL_MODEL.starter.creatorPlaces);
  assert.equal(preset.estimatedCreatorMax, CAMPAIGN_COMMERCIAL_MODEL.starter.creatorPlaces);
  assert.equal(getPresetSubmissionEstimate(preset)?.submissionMax, 20);
});
test('Showcase content package does not include separately priced livestreams', () => {
  const preset = CAMPAIGN_COMMERCIAL_MODEL.presets.find(p => p.slug === 'creator-showcase')!;
  assert.equal(preset.priceFromPence, 5000);
  assert.equal(preset.objectives.some(o => o.type === 'stream'), false);
  assert.equal(preset.objectives.reduce((sum, o) => sum + o.quantity, 0), 5);
  assert.equal(getPresetSubmissionEstimate(preset)?.submissionMax, 100);
});
