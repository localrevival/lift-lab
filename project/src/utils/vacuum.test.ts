import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sanitizeLiftData, syncPayload, emptyLiftData } from '../data/liftState.ts';
import { vacuumStreak } from './format.ts';

const today = '2026-11-04';

test('streak is zero when today and yesterday are open', () => {
  assert.equal(vacuumStreak([], today), 0);
  assert.equal(vacuumStreak(['2026-11-02'], today), 0);
});

test('streak counts today and the run behind it', () => {
  assert.equal(vacuumStreak(['2026-11-04'], today), 1);
  assert.equal(vacuumStreak(['2026-11-02', '2026-11-03', '2026-11-04'], today), 3);
  assert.equal(vacuumStreak(['2026-11-02', '2026-11-04'], today), 1);
});

test('an open today still keeps a streak that ended yesterday', () => {
  assert.equal(vacuumStreak(['2026-11-02', '2026-11-03'], today), 2);
});

test('streak crosses month and leap-day boundaries on the calendar', () => {
  assert.equal(vacuumStreak(['2026-02-28', '2026-03-01'], '2026-03-01'), 2);
  assert.equal(vacuumStreak(['2024-02-28', '2024-02-29', '2024-03-01'], '2024-03-01'), 3);
  assert.equal(vacuumStreak(['2024-02-28', '2024-03-01'], '2024-03-01'), 1);
});

test('sanitize keeps unique local dates and sync ships them', () => {
  const clean = sanitizeLiftData({
    vacuumDays: ['2026-11-04', 'nope', '2026-11-04', '2026-11-03', 4],
  });
  assert.deepEqual(clean.vacuumDays, ['2026-11-03', '2026-11-04']);
  assert.deepEqual(sanitizeLiftData({}).vacuumDays, []);
  assert.deepEqual(syncPayload({ ...emptyLiftData(), vacuumDays: ['2026-11-04'] }).vacuumDays, ['2026-11-04']);
});
