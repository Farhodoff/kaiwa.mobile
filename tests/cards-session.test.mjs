import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  EMPTY_REPORT,
  addGrade,
  completion,
  percent,
  recallRate,
} from '../src/lib/cards-session.ts';

test('the session report sums the XP actually awarded', () => {
  let report = EMPTY_REPORT;
  report = addGrade(report, 'yana', 1);
  report = addGrade(report, 'qiyin', 3);
  report = addGrade(report, 'yaxshi', 3);

  assert.equal(report.xp, 7);
  assert.equal(report.graded, 3);
  assert.equal(report.yana, 1);
  assert.equal(report.qiyin, 1);
  assert.equal(report.yaxshi, 1);
  assert.equal(report.oson, 0);
});

test('a review that was not counted adds no XP', () => {
  const report = addGrade(EMPTY_REPORT, 'oson', 0);
  assert.equal(report.xp, 0);
  assert.equal(report.graded, 1);
  assert.equal(report.oson, 1);
});

test('recall and completion stay within 0..1 and round for display', () => {
  const report = addGrade(addGrade(addGrade(EMPTY_REPORT, 'oson', 3), 'yana', 1), 'yaxshi', 3);
  assert.equal(recallRate(report), 2 / 3);
  assert.equal(percent(recallRate(report)), 67);
  assert.equal(completion(report, 3), 1);
  assert.equal(completion(report, 6), 0.5);
  assert.equal(completion(report, 0), 0);
  assert.equal(percent(1.4), 100);
  assert.equal(percent(-1), 0);
});
