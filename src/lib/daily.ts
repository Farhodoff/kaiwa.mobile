/**
 * Local-day and activity helpers.
 *
 * All day keys are the user's *local* calendar day (`YYYY-MM-DD`), because a
 * streak or a daily goal is a local concept. The database stores the same
 * format, so values stay comparable across devices.
 */

export type ActivityEntry = { day: string; xp: number; minutes: number };

export type ReviewEntry = { cardId: string; day: string };

const MS_MINUTE = 60_000;

/** Idle time is not study time: cap a single jump to five minutes. */
export const MAX_ACTIVITY_MINUTES = 5;

/** `YYYY-MM-DD` in the device's local timezone. */
export function localDay(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** The local day before `day`. */
export function previousDay(day: string): string {
  const [year, month, date] = day.split('-').map(Number);
  const previous = new Date(year, month - 1, date);
  previous.setDate(previous.getDate() - 1);
  return localDay(previous);
}

/**
 * Streak value after activity on `day`.
 * - already active today -> unchanged
 * - active yesterday      -> +1
 * - anything else         -> restart at 1
 */
export function streakOn(
  day: string,
  lastActivityDate: string | null,
  streak: number,
): number {
  if (!lastActivityDate) return 1;
  if (lastActivityDate === day) return Math.max(1, streak);
  if (lastActivityDate === previousDay(day)) return Math.max(1, streak) + 1;
  return 1;
}

/**
 * Minutes to credit for one tracked action. Time actually spent in the app
 * since the previous action is rounded, at least one minute, at most `cap`.
 */
export function elapsedMinutes(
  lastActivityAt: number | null,
  now: number,
  cap: number = MAX_ACTIVITY_MINUTES,
): number {
  if (lastActivityAt == null) return 1;
  const raw = (now - lastActivityAt) / MS_MINUTE;
  if (!Number.isFinite(raw) || raw <= 0) return 1;
  return Math.min(cap, Math.max(1, Math.round(raw)));
}

/** Add XP/minutes to the row for `day`, keeping newest day first. */
export function addActivity(
  activity: readonly ActivityEntry[],
  day: string,
  xp: number,
  minutes: number,
): ActivityEntry[] {
  const previous = activity.find((row) => row.day === day);
  const row = {
    day,
    xp: Math.max(0, (previous?.xp ?? 0) + xp),
    minutes: Math.max(0, (previous?.minutes ?? 0) + minutes),
  };
  return [row, ...activity.filter((item) => item.day !== day)];
}

/** Minutes recorded for `day` (0 when there is no row yet). */
export function minutesOn(activity: readonly ActivityEntry[], day: string): number {
  return activity.find((row) => row.day === day)?.minutes ?? 0;
}

/** Unique cards reviewed on `day`. */
export function reviewsOn(reviews: readonly ReviewEntry[], day: string): number {
  const ids = new Set<string>();
  for (const review of reviews) {
    if (review.day === day) ids.add(review.cardId);
  }
  return ids.size;
}

/** True when the snapshot has no review for this card on this day. */
export function isFirstReviewOfDay(
  reviews: readonly ReviewEntry[],
  cardId: string,
  day: string,
): boolean {
  return !reviews.some((review) => review.cardId === cardId && review.day === day);
}

/** True when this card has never been reviewed before. */
export function isFirstReviewEver(reviews: readonly ReviewEntry[], cardId: string): boolean {
  return !reviews.some((review) => review.cardId === cardId);
}
