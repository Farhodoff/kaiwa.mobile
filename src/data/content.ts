/**
 * Static UI configuration for the mobile app.
 *
 * All learning content (lessons, flashcards, quizzes, JLPT sections,
 * conversation topics) now lives in PostgreSQL and is loaded through
 * `src/services/content.ts` — nothing here is mock data.
 */

export const LEVELS = [
  { id: 'N5', label: 'N5', desc: 'Boshlang\'ich', words: 800 },
  { id: 'N4', label: 'N4', desc: 'Elementar', words: 1500 },
  { id: 'N3', label: 'N3', desc: 'O\'rta', words: 3700 },
  { id: 'N2', label: 'N2', desc: 'Yuqori o\'rta', words: 6000 },
  { id: 'N1', label: 'N1', desc: 'Ilg\'or', words: 10000 },
] as const;
