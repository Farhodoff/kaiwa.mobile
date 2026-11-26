/**
 * Per-session flashcard report — pure helpers so the summary shown on the
 * "done" screen matches what was actually awarded during the session.
 */

export type CardGrade = 'yana' | 'qiyin' | 'yaxshi' | 'oson';

/** XP granted for each grade (mirrors the old award table). */
export const GRADE_XP: Record<CardGrade, number> = {
  yana: 1,
  qiyin: 3,
  yaxshi: 3,
  oson: 3,
};

export const GRADES: readonly CardGrade[] = ['yana', 'qiyin', 'yaxshi', 'oson'];

export type SessionReport = {
  xp: number;
  graded: number;
  yana: number;
  qiyin: number;
  yaxshi: number;
  oson: number;
};

export const EMPTY_REPORT: SessionReport = {
  xp: 0,
  graded: 0,
  yana: 0,
  qiyin: 0,
  yaxshi: 0,
  oson: 0,
};

/** Record one grade. `xpGained` is 0 when the review was not counted. */
export function addGrade(
  report: SessionReport,
  grade: CardGrade,
  xpGained: number,
): SessionReport {
  return {
    ...report,
    xp: report.xp + Math.max(0, xpGained),
    graded: report.graded + 1,
    [grade]: report[grade] + 1,
  };
}

/** Share of cards graded in this session, 0..1. */
export function completion(report: SessionReport, totalCards: number): number {
  if (totalCards <= 0) return 0;
  return Math.min(1, report.graded / totalCards);
}

/** Share of graded cards answered without a failure, 0..1. */
export function recallRate(report: SessionReport): number {
  if (report.graded <= 0) return 0;
  return (report.yaxshi + report.oson) / report.graded;
}

/** Percentage rounded for display. */
export function percent(value: number): number {
  return Math.round(Math.min(1, Math.max(0, value)) * 100);
}
