/**
 * SM-2 Spaced Repetition Algorithm (SuperMemo 2)
 *
 * Grade scale:
 *   0 = Total blackout (forgot completely)
 *   1 = Incorrect response
 *   2 = Incorrect response, but the correct one felt familiar
 *   3 = Correct response with serious difficulty
 *   4 = Correct response after a hesitation
 *   5 = Perfect response
 *
 * Grades below 3 restart the card. Otherwise the interval grows:
 * 1 day -> 6 days -> interval * ease factor.
 * Default ease factor: 2.5, minimum: 1.3.
 */

export type SM2Grade = 0 | 1 | 2 | 3 | 4 | 5;

export interface SM2CardState {
  /** Unique card identifier. */
  cardId: string;
  /** Current ease factor (starts at 2.5, never below 1.3). */
  ease: number;
  /** Current interval in days. */
  interval: number;
  /** Due date (`YYYY-MM-DD`) for the next review. */
  dueDate: string;
  /** Number of consecutive correct responses. */
  repetitions: number;
}

/** Local date as `YYYY-MM-DD` (UTC, matching the backend's `reviewed_date`). */
export function isoDay(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

/** Add whole days to an ISO day without timezone drift. */
export function addDays(day: string, days: number): string {
  const [year, month, date] = day.split('-').map(Number);
  const next = new Date(Date.UTC(year, month - 1, date));
  next.setUTCDate(next.getUTCDate() + days);
  return isoDay(next);
}

const round2 = (value: number) => Math.round(value * 100) / 100;

/** Initialize a brand new card — it is due immediately. */
export function initializeCard(cardId: string, day: string = isoDay()): SM2CardState {
  return {
    cardId,
    ease: 2.5,
    interval: 1,
    dueDate: day,
    repetitions: 0,
  };
}

/**
 * Calculate the next SM-2 state for a card.
 *
 * @param current current card state
 * @param grade   user grade (0-5)
 * @param day     day the review happened (`YYYY-MM-DD`)
 */
export function updateCardState(
  current: SM2CardState,
  grade: SM2Grade,
  day: string = isoDay(),
): SM2CardState {
  const { cardId } = current;
  let { ease, interval, repetitions } = current;

  if (grade < 3) {
    // Failed recall — relearn from the beginning.
    repetitions = 0;
    interval = 1;
  } else {
    if (repetitions === 0) interval = 1;
    else if (repetitions === 1) interval = 6;
    else interval = Math.max(1, Math.round(interval * ease));
    repetitions += 1;
  }

  // Standard SM-2 ease update (uses the ease before this review).
  ease = Math.max(1.3, ease + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02)));

  return {
    cardId,
    ease: round2(ease),
    interval,
    repetitions,
    dueDate: addDays(day, interval),
  };
}

/** Apply a grade to a possibly unknown card. */
export function gradeCard(
  current: SM2CardState | undefined,
  cardId: string,
  grade: SM2Grade,
  day: string = isoDay(),
): SM2CardState {
  return updateCardState(current ?? initializeCard(cardId, day), grade, day);
}

/** Card IDs that are due for review on `day` (inclusive). */
export function getDueCards(
  cards: Record<string, SM2CardState>,
  day: string = isoDay(),
): string[] {
  return Object.values(cards)
    .filter((state) => isCardDue(state.dueDate, day))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .map((state) => state.cardId);
}

/** True when the card's due date is today or already in the past. */
export function isCardDue(dueDate: string, day: string = isoDay()): boolean {
  return dueDate <= day;
}
