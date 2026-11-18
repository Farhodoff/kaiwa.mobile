import { supabase } from '../lib/supabase';
import type { LessonProgressRow } from './content';

/**
 * User progress service — all gamification state lives in PostgreSQL
 * (`mobile_user_progress`, `mobile_lesson_progress`, `mobile_card_reviews`,
 * `mobile_daily_activity`) instead of in-memory React state.
 */

export type UserProgress = {
  xp: number;
  xpGoal: number;
  streak: number;
  level: string;
  levelProgress: number;
  wordsLearned: number;
  dailyGoal: number;
  dailyGoalDone: number;
  conversationsDone: number;
  lessonsDone: number;
  lastActivityDate: string | null;
  notificationsEnabled: boolean;
  soundEnabled: boolean;
  jlptDone: Record<string, number>;
};

export type ActivityRow = { day: string; xp: number; minutes: number };

export type NotificationRow = {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
};

export const DEFAULT_PROGRESS: UserProgress = {
  xp: 0,
  xpGoal: 200,
  streak: 0,
  level: 'N3',
  levelProgress: 0,
  wordsLearned: 0,
  dailyGoal: 30,
  dailyGoalDone: 0,
  conversationsDone: 0,
  lessonsDone: 0,
  lastActivityDate: null,
  notificationsEnabled: true,
  soundEnabled: true,
  jlptDone: {},
};

type ProgressRow = {
  xp: number;
  xp_goal: number;
  streak: number;
  level: string;
  level_progress: number;
  words_learned: number;
  daily_goal: number;
  daily_goal_done: number;
  conversations_done: number;
  lessons_done: number;
  last_activity_date: string | null;
  notifications_enabled: boolean;
  sound_enabled: boolean;
  jlpt_done: Record<string, number> | null;
};

function toProgress(row: ProgressRow): UserProgress {
  return {
    xp: row.xp ?? 0,
    xpGoal: row.xp_goal ?? 200,
    streak: row.streak ?? 0,
    level: row.level ?? 'N3',
    levelProgress: Number(row.level_progress ?? 0),
    wordsLearned: row.words_learned ?? 0,
    dailyGoal: row.daily_goal ?? 30,
    dailyGoalDone: row.daily_goal_done ?? 0,
    conversationsDone: row.conversations_done ?? 0,
    lessonsDone: row.lessons_done ?? 0,
    lastActivityDate: row.last_activity_date,
    notificationsEnabled: row.notifications_enabled ?? true,
    soundEnabled: row.sound_enabled ?? true,
    jlptDone: row.jlpt_done ?? {},
  };
}

const PROGRESS_COLUMNS =
  'xp, xp_goal, streak, level, level_progress, words_learned, daily_goal, daily_goal_done, conversations_done, lessons_done, last_activity_date, notifications_enabled, sound_enabled, jlpt_done';

export async function fetchUserProgress(userId: string): Promise<UserProgress | null> {
  try {
    const { data, error } = await supabase
      .from('mobile_user_progress')
      .select(PROGRESS_COLUMNS)
      .eq('user_id', userId)
      .maybeSingle();
    if (!error && data) return toProgress(data as ProgressRow);
  } catch (e) {
    console.warn('[fetchUserProgress] Offline fallback:', e);
  }
  return null;
}

/** Load the user's progress row, creating it on first launch. */
export async function ensureUserProgress(
  userId: string,
  fullName?: string | null,
): Promise<UserProgress> {
  try {
    const existing = await fetchUserProgress(userId);
    if (existing) return existing;

    const { data, error } = await supabase
      .from('mobile_user_progress')
      .insert({ user_id: userId, full_name: fullName ?? null })
      .select(PROGRESS_COLUMNS)
      .single();
    if (!error && data) {
      return toProgress(data as ProgressRow);
    }
    const again = await fetchUserProgress(userId);
    if (again) return again;
  } catch (e) {
    console.warn('[ensureUserProgress] Offline fallback:', e);
  }
  return DEFAULT_PROGRESS;
}

export async function saveUserProgress(
  userId: string,
  patch: Partial<UserProgress>,
): Promise<void> {
  const body: Record<string, unknown> = { user_id: userId, updated_at: new Date().toISOString() };
  if (patch.xp !== undefined) body.xp = patch.xp;
  if (patch.xpGoal !== undefined) body.xp_goal = patch.xpGoal;
  if (patch.streak !== undefined) body.streak = patch.streak;
  if (patch.level !== undefined) body.level = patch.level;
  if (patch.levelProgress !== undefined) body.level_progress = patch.levelProgress;
  if (patch.wordsLearned !== undefined) body.words_learned = patch.wordsLearned;
  if (patch.dailyGoal !== undefined) body.daily_goal = patch.dailyGoal;
  if (patch.dailyGoalDone !== undefined) body.daily_goal_done = patch.dailyGoalDone;
  if (patch.conversationsDone !== undefined) body.conversations_done = patch.conversationsDone;
  if (patch.lessonsDone !== undefined) body.lessons_done = patch.lessonsDone;
  if (patch.lastActivityDate !== undefined) body.last_activity_date = patch.lastActivityDate;
  if (patch.notificationsEnabled !== undefined)
    body.notifications_enabled = patch.notificationsEnabled;
  if (patch.soundEnabled !== undefined) body.sound_enabled = patch.soundEnabled;
  if (patch.jlptDone !== undefined) body.jlpt_done = patch.jlptDone;

  const { error } = await supabase.from('mobile_user_progress').upsert(body, {
    onConflict: 'user_id',
  });
  if (error) throw new Error(error.message);
}

/* -------------------------------------------------------------------------- */
/* Lesson progress                                                            */
/* -------------------------------------------------------------------------- */

export async function fetchLessonProgressMap(
  userId: string,
): Promise<Record<string, LessonProgressRow>> {
  try {
    const { data, error } = await supabase
      .from('mobile_lesson_progress')
      .select('lesson_id, progress, is_completed, score')
      .eq('user_id', userId);
    if (!error && data) {
      const map: Record<string, LessonProgressRow> = {};
      for (const row of data) map[row.lesson_id] = row;
      return map;
    }
  } catch (e) {
    console.warn('[fetchLessonProgressMap] Offline fallback:', e);
  }
  return {};
}

export async function saveLessonProgress(
  userId: string,
  lessonId: string,
  patch: { progress?: number; isCompleted?: boolean; score?: number | null },
): Promise<void> {
  const { error } = await supabase.from('mobile_lesson_progress').upsert(
    {
      user_id: userId,
      lesson_id: lessonId,
      progress: patch.progress ?? 0,
      is_completed: patch.isCompleted ?? false,
      score: patch.score ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,lesson_id' },
  );
  if (error) throw new Error(error.message);
}

/* -------------------------------------------------------------------------- */
/* Flashcard reviews                                                          */
/* -------------------------------------------------------------------------- */

/** All card ids the user has ever reviewed (for "words learned" + session guard). */
export async function fetchReviewedCardIds(userId: string): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('mobile_card_reviews')
      .select('card_id')
      .eq('user_id', userId);
    if (!error && data) {
      return Array.from(new Set(data.map((r) => r.card_id)));
    }
  } catch (e) {
    console.warn('[fetchReviewedCardIds] Offline fallback:', e);
  }
  return [];
}

export async function markCardReviewedDb(
  userId: string,
  cardId: string,
  grade = 3,
): Promise<void> {
  const { error } = await supabase.from('mobile_card_reviews').upsert(
    { user_id: userId, card_id: cardId, reviewed_date: new Date().toISOString().slice(0, 10), grade },
    { onConflict: 'user_id,card_id,reviewed_date', ignoreDuplicates: true },
  );
  if (error) throw new Error(error.message);
}

/* -------------------------------------------------------------------------- */
/* Daily activity                                                             */
/* -------------------------------------------------------------------------- */

export async function fetchActivity(userId: string, days = 30): Promise<ActivityRow[]> {
  try {
    const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from('mobile_daily_activity')
      .select('day, xp, minutes')
      .eq('user_id', userId)
      .gte('day', since)
      .order('day', { ascending: false });
    if (!error && data) {
      return data.map((r) => ({ day: r.day as string, xp: r.xp, minutes: r.minutes }));
    }
  } catch (e) {
    console.warn('[fetchActivity] Offline fallback:', e);
  }
  return [];
}

/**
 * Read-modify-write is not atomic over REST, so concurrent bumps would lose
 * updates. All activity writes go through one promise chain (FIFO).
 */
let activityQueue: Promise<unknown> = Promise.resolve();

async function doBumpActivity(
  userId: string,
  xp: number,
  minutes: number,
): Promise<void> {
  const day = new Date().toISOString().slice(0, 10);
  const { data: row } = await supabase
    .from('mobile_daily_activity')
    .select('id, xp, minutes')
    .eq('user_id', userId)
    .eq('day', day)
    .maybeSingle();

  if (row) {
    const { error } = await supabase
      .from('mobile_daily_activity')
      .update({ xp: row.xp + xp, minutes: row.minutes + minutes })
      .eq('id', row.id);
    if (error) throw new Error(error.message);
    return;
  }

  const { error } = await supabase
    .from('mobile_daily_activity')
    .insert({ user_id: userId, day, xp, minutes })
    .select();
  if (error && error.code !== '23505') throw new Error(error.message);
}

/** Enqueue a daily-activity increment so parallel calls never overwrite each other. */
export function bumpActivity(userId: string, xp = 0, minutes = 0): Promise<void> {
  activityQueue = activityQueue
    .then(() => doBumpActivity(userId, xp, minutes))
    .catch(() => undefined);
  return activityQueue.then(() => undefined);
}

/* -------------------------------------------------------------------------- */
/* Notifications (shared web table `user_notifications`)                      */
/* -------------------------------------------------------------------------- */

const TYPE_ICONS: Record<string, string> = {
  streak: 'flame',
  daily: 'mic',
  achievement: 'trophy',
  system: 'ribbon',
  admin: 'ribbon',
};

export function notificationIcon(type: string): string {
  return TYPE_ICONS[type] ?? 'notifications';
}

export async function fetchNotifications(userId: string): Promise<NotificationRow[]> {
  const { data, error } = await supabase
    .from('user_notifications')
    .select('id, title, message, type, is_read, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    id: r.id,
    title: r.title,
    message: r.message,
    type: r.type ?? 'system',
    isRead: r.is_read ?? false,
    createdAt: r.created_at,
  }));
}

export async function markNotificationRead(userId: string, id: string): Promise<void> {
  const { error } = await supabase
    .from('user_notifications')
    .update({ is_read: true })
    .eq('id', id)
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
}

/** First launch: seed a welcome notification so the screen is not empty. */
export async function seedWelcomeNotification(userId: string): Promise<void> {
  const existing = await fetchNotifications(userId);
  if (existing.length > 0) return;
  await supabase.from('user_notifications').insert({
    user_id: userId,
    title: 'Xush kelibsiz! 👋',
    message: 'Kaiwa-da birinchi darsingizni boshlang va XP to\'plang.',
    type: 'system',
  });
}
