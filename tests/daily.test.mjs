import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  addActivity,
  elapsedMinutes,
  isFirstReviewEver,
  isFirstReviewOfDay,
  localDay,
  minutesOn,
  previousDay,
  reviewsOn,
  streakOn,
} from '../src/lib/daily.ts';

test('localDay formats the device-local calendar day', () => {
  assert.equal(localDay(new Date(2026, 10, 22, 23, 59)), '2026-11-22');
  assert.equal(localDay(new Date(2027, 0, 1, 0, 0)), '2027-01-01');
});

test('previousDay crosses month and year boundaries', () => {
  assert.equal(previousDay('2026-12-01'), '2026-11-30');
  assert.equal(previousDay('2027-01-01'), '2026-12-31');
  assert.equal(previousDay('2024-03-01'), '2024-02-29');
});

test('streak continues only when the last activity was yesterday', () => {
  assert.equal(streakOn('2026-11-22', '2026-11-22', 4), 4);
  assert.equal(streakOn('2026-11-22', '2026-11-21', 4), 5);
  assert.equal(streakOn('2026-11-22', '2026-11-19', 4), 1);
  assert.equal(streakOn('2026-11-22', null, 0), 1);
});

test('elapsedMinutes credits real time, at least one and at most the cap', () => {
  assert.equal(elapsedMinutes(null, 1_000), 1);
  assert.equal(elapsedMinutes(0, 30_000), 1);
  assert.equal(elapsedMinutes(0, 3 * 60_000), 3);
  assert.equal(elapsedMinutes(0, 3 * 60 * 60_000), 5);
  assert.equal(elapsedMinutes(5_000, 1_000), 1);
});

test('addActivity accumulates XP and minutes for the same day', () => {
  const first = addActivity([], '2026-11-22', 10, 2);
  assert.deepEqual(first, [{ day: '2026-11-22', xp: 10, minutes: 2 }]);

  const second = addActivity(first, '2026-11-22', 5, 3);
  assert.deepEqual(second, [{ day: '2026-11-22', xp: 15, minutes: 5 }]);

  const third = addActivity(second, '2026-11-23', 2, 1);
  assert.deepEqual(third[0], { day: '2026-11-23', xp: 2, minutes: 1 });
  assert.equal(minutesOn(third, '2026-11-22'), 5);
  assert.equal(minutesOn(third, '2026-11-24'), 0);
});

test('review helpers count unique cards per day', () => {
  const reviews = [
    { cardId: 'a', day: '2026-11-22' },
    { cardId: 'a', day: '2026-11-22' },
    { cardId: 'b', day: '2026-11-22' },
    { cardId: 'c', day: '2026-11-21' },
  ];

  assert.equal(reviewsOn(reviews, '2026-11-22'), 2);
  assert.equal(reviewsOn(reviews, '2026-11-20'), 0);
  assert.equal(isFirstReviewEver(reviews, 'a'), false);
  assert.equal(isFirstReviewEver(reviews, 'z'), true);
  assert.equal(isFirstReviewOfDay(reviews, 'c', '2026-11-22'), true);
  assert.equal(isFirstReviewOfDay(reviews, 'a', '2026-11-22'), false);
});
