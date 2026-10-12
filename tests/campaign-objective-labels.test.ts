import test from 'node:test';
import assert from 'node:assert/strict';
import { getDeveloperObjectiveLabel, getDeveloperOutputLabel, getCreatorObjectiveInstruction } from '../client/src/pages/indie-dashboard/developer-objective-labels';
import { CAMPAIGN_COMMERCIAL_MODEL } from '../shared/campaign-commercial-model';
import { campaignPreviewOutputs } from '../client/src/pages/indie-dashboard/campaign-preview-model';

test('developer labels describe contributions in sentence case', () => {
  for (const [type, quantity, expected] of [
    ['clip', 1, '1 gameplay clip'], ['clip', 2, '2 gameplay clips'],
    ['reel', 1, '1 vertical gameplay reel'], ['screenshot', 3, '3 gameplay screenshots'],
    ['feedback', 1, 'Creator feedback'], ['review', 1, '1 creator review'],
    ['play_session', 1, '1 verified play session'],
  ] as const) assert.equal(getDeveloperObjectiveLabel({type,quantity}), expected);
  assert.equal(getDeveloperObjectiveLabel({type:'stream',quantity:1},60), '1 verified 60-minute livestream');
  assert.equal(getDeveloperObjectiveLabel({type:'stream',quantity:1},30), '1 verified 30-minute livestream');
});
test('creator instructions and underlying objectives remain untouched', () => {
  for (const preset of CAMPAIGN_COMMERCIAL_MODEL.presets) for (const objective of preset.objectives) {
    const before = JSON.stringify(objective);
    assert.equal(getCreatorObjectiveInstruction(objective), objective.title);
    assert.doesNotMatch(getDeveloperObjectiveLabel(objective), /upload|submit|create|complete /i);
    assert.equal(JSON.stringify(objective), before);
  }
});
test('total-output labels remain separate from individual contributions and dynamic quantities', () => {
  assert.equal(getDeveloperOutputLabel('feedback'), 'Creator feedback responses');
  assert.equal(getDeveloperOutputLabel('screenshot'), 'Gameplay screenshots');
  const preset = CAMPAIGN_COMMERCIAL_MODEL.presets.find(p => p.slug === 'content-boost')!;
  for (const capacity of [3,5,6]) {
    const clip = campaignPreviewOutputs(preset, capacity).find(row => row.type === 'clip')!;
    assert.equal(clip.max, capacity * 2);
    assert.equal(getDeveloperObjectiveLabel(preset.objectives.find(row => row.type === 'clip')!), '2 gameplay clips');
  }
});
