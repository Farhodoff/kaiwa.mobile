import { supabase } from '../lib/supabase';
import { REAL_SCENARIOS, MobileScenario } from '../data/scenarios';
import { REAL_DECKS, MobileCard } from '../data/decks';
import { REAL_CURRICULUM_LESSONS } from '../data/curriculum';
import { JLPT_MOCK_EXAM_DATA, ExamQuestion } from '../data/mockExams';

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

export type QuizQuestion = {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string | null;
};

export type JlptSection = {
  id: string;
  title: string;
  titleJa: string;
  count: number;
  color: string;
};

export type ConversationTopic = MobileScenario;

export type AiReply = { ja: string; uz: string };

export type LessonProgressRow = {
  lesson_id: string;
  progress: number;
  is_completed: boolean;
  score: number | null;
};

const ORDER = { ascending: true } as const;

export async function fetchLessons(levelFilter?: string): Promise<Lesson[]> {
  try {
    let query = supabase
      .from('mobile_lessons')
      .select('id, title, title_ja, level, minutes, xp, content, sort_order')
      .order('sort_order', ORDER);
    if (levelFilter) query = query.eq('level', levelFilter);
    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      return data.map((r) => ({
        id: r.id,
        title: r.title,
        titleJa: r.title_ja,
        level: r.level,
        minutes: r.minutes,
        xp: r.xp,
        content: (r.content ?? {}) as LessonContent,
      }));
    }
  } catch (e) {
    console.warn('[fetchLessons] Offline / Network fallback:', e);
  }

  if (levelFilter) {
    return REAL_CURRICULUM_LESSONS.filter((l) => l.level.toUpperCase() === levelFilter.toUpperCase());
  }
  return REAL_CURRICULUM_LESSONS;
}

export async function fetchLesson(id: string): Promise<Lesson | null> {
  try {
    const { data, error } = await supabase
      .from('mobile_lessons')
      .select('id, title, title_ja, level, minutes, xp, content, sort_order')
      .eq('id', id)
      .maybeSingle();
    if (!error && data) {
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
  } catch (e) {
    console.warn('[fetchLesson] Offline / Network fallback:', e);
  }
  return REAL_CURRICULUM_LESSONS.find((l) => l.id === id) ?? null;
}

export async function fetchQuizQuestions(
  quizType: 'lesson' | 'mock',
  lessonIdOrLevel?: string,
): Promise<QuizQuestion[]> {
  try {
    let query = supabase
      .from('mobile_quiz_questions')
      .select('id, question, options, correct_index, explanation, sort_order')
      .eq('quiz_type', quizType)
      .order('sort_order', ORDER);
    if (quizType === 'lesson' && lessonIdOrLevel) query = query.eq('lesson_id', lessonIdOrLevel);
    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      return data.map((r) => ({
        id: r.id,
        question: r.question,
        options: (r.options ?? []) as string[],
        correctIndex: r.correct_index,
        explanation: r.explanation,
      }));
    }
  } catch (e) {
    console.warn('[fetchQuizQuestions] Database fallback:', e);
  }

  // Use real JLPT Mock exam questions from JLPT_MOCK_EXAM_DATA
  const levelKey = (lessonIdOrLevel?.toUpperCase() as 'N5' | 'N4' | 'N3' | 'N2' | 'N1') || 'N5';
  const realQuestions: ExamQuestion[] = JLPT_MOCK_EXAM_DATA[levelKey] || JLPT_MOCK_EXAM_DATA.N5;

  return realQuestions.slice(0, 15).map((q) => ({
    id: `q_${q.id}`,
    question: q.questionText,
    options: q.options,
    correctIndex: q.correctAnswer,
    explanation: q.explanationUzbek,
  }));
}

export async function fetchFlashcards(deckId?: string): Promise<Flashcard[]> {
  try {
    const { data, error } = await supabase
      .from('mobile_flashcards')
      .select('id, front, front_ja, back, reading, example, sort_order')
      .order('sort_order', ORDER);
    if (!error && data && data.length > 0 && !deckId) {
      return data.map((r) => ({
        id: r.id,
        front: r.front,
        frontJa: r.front_ja,
        back: r.back,
        reading: r.reading,
        example: r.example,
      }));
    }
  } catch (e) {
    console.warn('[fetchFlashcards] Offline fallback:', e);
  }

  const selectedDeck = REAL_DECKS.find((d) => d.id === deckId) || REAL_DECKS[0];
  return selectedDeck.cards.map((c) => ({
    id: c.id,
    front: c.front,
    frontJa: c.frontJa,
    back: c.back,
    reading: c.reading,
    example: c.example,
  }));
}

export async function fetchJlptSections(): Promise<JlptSection[]> {
  try {
    const { data, error } = await supabase
      .from('mobile_jlpt_sections')
      .select('id, title, title_ja, total_count, color, sort_order')
      .order('sort_order', ORDER);
    if (!error && data && data.length > 0) {
      return data.map((r) => ({
        id: r.id,
        title: r.title,
        titleJa: r.title_ja,
        count: r.total_count,
        color: r.color,
      }));
    }
  } catch (e) {
    console.warn('[fetchJlptSections] Offline fallback:', e);
  }

  return [
    { id: 'vocab', title: 'Vocabulary & Kanji', titleJa: '文字・語彙', count: 35, color: '#6C5CE7' },
    { id: 'grammar', title: 'Grammar', titleJa: '文法', count: 30, color: '#38BDF8' },
    { id: 'reading', title: 'Reading (Dokkai)', titleJa: '読解', count: 20, color: '#F59E0B' },
    { id: 'listening', title: 'Listening (Choukai)', titleJa: '聴解', count: 25, color: '#22C55E' },
  ];
}

export async function fetchConversationTopics(levelFilter?: string): Promise<ConversationTopic[]> {
  if (levelFilter && levelFilter !== 'all') {
    return REAL_SCENARIOS.filter((s) => s.difficulty.toUpperCase() === levelFilter.toUpperCase());
  }
  return REAL_SCENARIOS;
}

export async function fetchAiReplies(topicId?: string): Promise<AiReply[]> {
  const scenario = REAL_SCENARIOS.find((s) => s.id === topicId);
  if (scenario) {
    return [
      { ja: scenario.opening_line_ja, uz: scenario.opening_line_uz },
      { ja: 'かしこまりました。他にご質問やご注文はありますか？', uz: 'Tushunarli. Yana biror savol yoki buyurtmangiz bormi?' },
    ];
  }
  return [
    { ja: 'はじめまして！わたしはユキです。', uz: 'Tanishganimdan xursandman! Men Yukiman.' },
    { ja: '今日はどんなお話をしましょうか？', uz: 'Bugun nima haqida gaplashamiz?' },
  ];
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
