import { supabase } from '../lib/supabase';

/**
 * All learning content is served by PostgreSQL (Supabase) — nothing in this
 * module is bundled or hardcoded. Screens show loading / error states while
 * the catalog is fetched from the backend.
 */

export type LessonContent = {
  vocab?: { ja: string; romaji?: string; uz: string }[];
  grammar?: { pattern: string; meaning: string; example?: string }[];
  phrases?: { ja: string; uz: string }[];
};

export type Lesson = {
  id: string;
  title: string;
  titleJa: string;
  level: string;
  minutes: number;
  xp: number;
  content: LessonContent;
};

export type LessonStatus = 'done' | 'current' | 'locked';

export type LessonWithStatus = Lesson & {
  status: LessonStatus;
  progress: number; // 0..1
};

export type Flashcard = {
  id: string;
  front: string;
  frontJa?: string | null;
  back: string;
  reading?: string | null;
  example?: string | null;
};

export type CardDeck = {
  id: string;
  title: string;
  description: string;
  level: string;
  icon: string;
  badgeColor: string;
  cardCount: number;
};

export type QuizQuestion = {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string | null;
  section?: string | null;
};

export type JlptSection = {
  id: string;
  title: string;
  titleJa: string;
  count: number;
  color: string;
};

export type MobileScenario = {
  id: string;
  language?: string;
  title_ja: string;
  title_uz: string;
  emoji: string;
  difficulty: string;
  category: string;
  description_uz: string;
  opening_line_ja: string;
  opening_line_uz: string;
  context_prompt: string;
  key_phrases: string[];
};

export type ConversationTopic = MobileScenario;

export type LessonProgressRow = {
  lesson_id: string;
  progress: number;
  is_completed: boolean;
  score: number | null;
};

const ORDER = { ascending: true } as const;

const fail = (what: string, error: unknown): never => {
  const detail = error instanceof Error ? error.message : String(error ?? '');
  console.warn(`[content] ${what}:`, detail);
  throw new Error(
    error && typeof error === 'object' && 'message' in error
      ? `${what}: ${String((error as { message: unknown }).message)}`
      : what,
  );
};

export async function fetchLessons(levelFilter?: string): Promise<Lesson[]> {
  let query = supabase
    .from('mobile_lessons')
    .select('id, title, title_ja, level, minutes, xp, content, sort_order')
    .order('sort_order', ORDER);
  if (levelFilter) query = query.eq('level', levelFilter);

  const { data, error } = await query;
  if (error) fail('Darslarni yuklab bo\u2018lmadi', error);

  return (data ?? []).map((r) => ({
    id: r.id,
    title: r.title,
    titleJa: r.title_ja,
    level: r.level,
    minutes: r.minutes,
    xp: r.xp,
    content: (r.content ?? {}) as LessonContent,
  }));
}

export async function fetchLesson(id: string): Promise<Lesson | null> {
  const { data, error } = await supabase
    .from('mobile_lessons')
    .select('id, title, title_ja, level, minutes, xp, content')
    .eq('id', id)
    .maybeSingle();
  if (error) fail('Darsni yuklab bo\u2018lmadi', error);
  if (!data) return null;

  return {
    id: data.id,
    title: data.title,
    titleJa: data.title_ja,
    level: data.level,
    minutes: data.minutes,
    xp: data.xp,
    content: (data.content ?? {}) as LessonContent,
  };
}

export async function fetchQuizQuestions(
  quizType: 'lesson' | 'mock',
  lessonIdOrLevel?: string,
): Promise<QuizQuestion[]> {
  let query = supabase
    .from('mobile_quiz_questions')
    .select('id, question, options, correct_index, explanation, section, sort_order')
    .eq('quiz_type', quizType)
    .order('sort_order', ORDER);

  if (quizType === 'lesson' && lessonIdOrLevel) {
    query = query.eq('lesson_id', lessonIdOrLevel);
  }
  if (quizType === 'mock' && lessonIdOrLevel) {
    query = query.eq('level', lessonIdOrLevel.toUpperCase());
  }

  const { data, error } = await query;
  if (error) fail('Savollarni yuklab bo\u2018lmadi', error);

  return (data ?? []).map((r) => ({
    id: r.id,
    question: r.question,
    options: (r.options ?? []) as string[],
    correctIndex: r.correct_index,
    explanation: r.explanation,
    section: r.section,
  }));
}

export async function fetchDecks(): Promise<CardDeck[]> {
  const { data, error } = await supabase
    .from('mobile_decks')
    .select('id, title, description, level, icon, badge_color, sort_order, cards:mobile_flashcards(count)')
    .order('sort_order', ORDER);
  if (error) fail('To\u2018plamlarni yuklab bo\u2018lmadi', error);

  return (data ?? []).map((r) => {
    const embedded = (r as { cards?: { count?: number }[] }).cards;
    return {
      id: r.id,
      title: r.title,
      description: r.description,
      level: r.level,
      icon: r.icon,
      badgeColor: r.badge_color,
      cardCount: embedded?.[0]?.count ?? 0,
    };
  });
}

export async function fetchFlashcards(deckId: string): Promise<Flashcard[]> {
  // Supabase caps a single REST response (default 1000 rows), so decks are paged.
  const PAGE = 1000;
  const rows: Record<string, unknown>[] = [];

  for (let from = 0; ; from += PAGE) {
    let query = supabase
      .from('mobile_flashcards')
      .select('id, front, front_ja, back, reading, example, sort_order')
      .order('sort_order', ORDER)
      .range(from, from + PAGE - 1);
    if (deckId) query = query.eq('deck_id', deckId);

    const { data, error } = await query;
    if (error) fail('Kartalarni yuklab bo\u2018lmadi', error);
    const page = data ?? [];
    rows.push(...(page as Record<string, unknown>[]));
    if (page.length < PAGE) break;
  }

  return rows.map((r) => ({
    id: String(r.id ?? ''),
    front: String(r.front ?? ''),
    frontJa: (r.front_ja as string) ?? null,
    back: String(r.back ?? ''),
    reading: (r.reading as string) ?? null,
    example: (r.example as string) ?? null,
  }));
}

/** Exact number of mock questions available for a level (for the JLPT card). */
export async function countMockQuestions(level: string): Promise<number> {
  const { count, error } = await supabase
    .from('mobile_quiz_questions')
    .select('id', { count: 'exact', head: true })
    .eq('quiz_type', 'mock')
    .eq('level', (level || 'N5').toUpperCase());
  if (error) fail('Savollar sonini o\u2018lab bo\u2018lmadi', error);
  return count ?? 0;
}

export async function fetchJlptSections(): Promise<JlptSection[]> {
  const { data, error } = await supabase
    .from('mobile_jlpt_sections')
    .select('id, title, title_ja, total_count, color, sort_order')
    .order('sort_order', ORDER);
  if (error) fail('JLPT bo\u2018limlarini yuklab bo\u2018lmadi', error);

  return (data ?? []).map((r) => ({
    id: r.id,
    title: r.title,
    titleJa: r.title_ja,
    count: r.total_count,
    color: r.color,
  }));
}

function toScenario(r: Record<string, unknown>): MobileScenario {
  return {
    id: String(r.id ?? ''),
    language: (r.language as string) ?? 'ja',
    title_ja: String(r.title_ja ?? ''),
    title_uz: String(r.title_uz ?? ''),
    emoji: String(r.emoji ?? '💬'),
    difficulty: String(r.difficulty ?? 'N5'),
    category: String(r.category ?? 'daily'),
    description_uz: String(r.description_uz ?? ''),
    opening_line_ja: String(r.opening_line_ja ?? ''),
    opening_line_uz: String(r.opening_line_uz ?? ''),
    context_prompt: String(r.context_prompt ?? ''),
    key_phrases: Array.isArray(r.key_phrases) ? (r.key_phrases as string[]) : [],
  };
}

export async function fetchConversationTopics(levelFilter?: string): Promise<ConversationTopic[]> {
  let query = supabase
    .from('mobile_scenarios')
    .select(
      'id, language, title_ja, title_uz, emoji, difficulty, category, description_uz, opening_line_ja, opening_line_uz, key_phrases, sort_order',
    )
    .order('sort_order', ORDER);
  if (levelFilter && levelFilter !== 'all') {
    query = query.eq('difficulty', levelFilter.toUpperCase());
  }

  const { data, error } = await query;
  if (error) fail('Muloqot ssenariylarini yuklab bo\u2018lmadi', error);
  return (data ?? []).map((r) => toScenario(r as Record<string, unknown>));
}

export async function fetchScenario(id: string): Promise<MobileScenario | null> {
  const { data, error } = await supabase
    .from('mobile_scenarios')
    .select(
      'id, language, title_ja, title_uz, emoji, difficulty, category, description_uz, opening_line_ja, opening_line_uz, context_prompt, key_phrases',
    )
    .eq('id', id)
    .maybeSingle();
  if (error) fail('Ssenariyni yuklab bo\u2018lmadi', error);
  return data ? toScenario(data as Record<string, unknown>) : null;
}

/** Merge lessons with the user's progress rows and derive each status. */
export function computeLessonStatuses(
  lessons: Lesson[],
  progressMap: Record<string, LessonProgressRow>,
): LessonWithStatus[] {
  let currentAssigned = false;
  return lessons.map((lesson) => {
    const row = progressMap[lesson.id];
    if (row?.is_completed) {
      return { ...lesson, status: 'done' as const, progress: 1 };
    }
    if (!currentAssigned) {
      currentAssigned = true;
      return {
        ...lesson,
        status: 'current' as const,
        progress: Math.min(1, Math.max(0, row?.progress ?? 0)),
      };
    }
    return { ...lesson, status: 'locked' as const, progress: row?.progress ?? 0 };
  });
}
