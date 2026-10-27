import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CREATOR_ANALYTICS_METRICS,
  creatorAnalyticsCatalog,
  isCreatorAnalyticsMetric,
} from '../server/creator-analytics';

test('publishes every requested creator analytics metric once', () => {
  assert.equal(CREATOR_ANALYTICS_METRICS.length, 25);
  assert.equal(new Set(CREATOR_ANALYTICS_METRICS).size, CREATOR_ANALYTICS_METRICS.length);
  assert.equal(creatorAnalyticsCatalog().length, CREATOR_ANALYTICS_METRICS.length);
});

test('reports every requested metric as available', () => {
  const catalog = new Map(creatorAnalyticsCatalog().map(item => [item.metric, item]));
  assert.equal(catalog.get('most_visited_profiles')?.available, true);
  assert.equal(catalog.get('biggest_leaderboard_climbers')?.available, true);
  assert.equal(catalog.get('most_liked_clips')?.available, true);
});

test('rejects arbitrary metric names', () => {
  assert.equal(isCreatorAnalyticsMetric('most_liked_clips'), true);
  assert.equal(isCreatorAnalyticsMetric('drop table users'), false);
});
