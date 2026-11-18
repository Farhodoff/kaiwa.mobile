/**
 * App clock — a single fixed timestamp captured when the module loads.
 *
 * React's compiler forbids calling impure functions (`Date.now()`, `new Date()`)
 * during render, and screens need "today" to build week/month charts. Capturing
 * the value once at module scope keeps renders pure.
 */
const APP_EPOCH = Date.now();

const MS_DAY = 86400000;
const DAY_LABELS = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'];

/** 'YYYY-MM-DD' of app start (UTC). */
export const TODAY_KEY = new Date(APP_EPOCH).toISOString().slice(0, 10);

/** 'YYYY-MM-DD' exactly `offset` days from app start (negative = past). */
export function dayKey(offset: number): string {
  return new Date(APP_EPOCH + offset * MS_DAY).toISOString().slice(0, 10);
}

/** Uzbek weekday short label for a given day offset from app start. */
export function weekdayLabel(offset: number): string {
  const weekday = new Date(APP_EPOCH + offset * MS_DAY).getUTCDay();
  return DAY_LABELS[(weekday + 6) % 7];
}

/** Greeting based on the local hour of app start. */
export const GREETING = (() => {
  const hour = new Date(APP_EPOCH).getHours();
  if (hour < 11) return 'Xayrli tong';
  if (hour < 18) return 'Xayrli kun';
  return 'Xayrli kech';
})();

/** Last `count` days, oldest first: { key, label }. */
export function lastDays(count: number): { key: string; label: string }[] {
  return Array.from({ length: count }, (_, i) => {
    const offset = -(count - 1 - i);
    return { key: dayKey(offset), label: weekdayLabel(offset) };
  });
}
