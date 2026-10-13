import assert from 'node:assert/strict';
import test from 'node:test';
import { previousLondonDate, telegramReportDate } from '../server/daily-telegram-report-time';

test('uses the previous UK calendar date around midnight and DST', () => {
  assert.equal(previousLondonDate(new Date('2026-06-01T00:30:00Z')), '2026-05-31');
  assert.equal(previousLondonDate(new Date('2026-12-01T09:00:00Z')), '2026-11-30');
});

test('reports the current UK day from 23:00 and catches up before then', () => {
  assert.equal(telegramReportDate(new Date('2026-06-01T21:59:00Z')), '2026-05-31');
  assert.equal(telegramReportDate(new Date('2026-06-01T22:00:00Z')), '2026-06-01');
  assert.equal(telegramReportDate(new Date('2026-12-01T22:59:00Z')), '2026-11-30');
  assert.equal(telegramReportDate(new Date('2026-12-01T23:00:00Z')), '2026-12-01');
});
