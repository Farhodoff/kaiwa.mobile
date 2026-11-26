/**
 * Local ledger of learned vocabulary.
 *
 * `wordsLearned` lives on the server as a plain counter, so without a local
 * ledger reopening the same lesson inflates it. The ledger makes the counter
 * idempotent per word on this device; the server count is only incremented
 * for words that were not seen here before.
 */

export type LearnedWordLedger = { version: 1; keys: string[] };

/** Stable identity for a vocabulary item: its Japanese headword, normalized. */
export function wordKey(ja: string): string {
  return ja.replace(/\s+/g, '').trim();
}

/** Read a ledger from AsyncStorage, tolerating missing or corrupt data. */
export function parseLearnedWords(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Partial<LearnedWordLedger> | string[] | null;
    const keys = Array.isArray(parsed) ? parsed : parsed?.keys;
    if (!Array.isArray(keys)) return [];
    return keys.filter((key): key is string => typeof key === 'string' && key.length > 0);
  } catch {
    return [];
  }
}

/** Add `key` unless it is already known. */
export function addLearnedWord(
  keys: readonly string[],
  key: string,
): { keys: string[]; added: boolean } {
  const normalized = key.trim();
  if (!normalized || keys.includes(normalized)) {
    return { keys: [...keys], added: false };
  }
  return { keys: [...keys, normalized], added: true };
}

export function serializeLearnedWords(keys: readonly string[]): string {
  const ledger: LearnedWordLedger = { version: 1, keys: [...keys] };
  return JSON.stringify(ledger);
}
