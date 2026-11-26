import { supabase } from '../lib/supabase';
import type { LessonProgressRow } from './content';
import { localDay, type ReviewEntry } from '../lib/daily';

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
  const { data, error } = await supabase
    .from('mobile_user_progress')
    .select(PROGRESS_COLUMNS)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toProgress(data as ProgressRow) : null;
}

/** A failed read is not evidence that a user is new. */
export async function ensureUserProgress(
  userId: string,
  fullName?: string | null,
): Promise<UserProgress> {
  const existing = await fetchUserProgress(userId);
  if (existing) return existing;
  const { data, error } = await supabase
    .from('mobile_user_progress')
    .insert({ user_id: userId, full_name: fullName ?? null })
    .select(PROGRESS_COLUMNS)
    .single();
  if (!error && data) return toProgress(data as ProgressRow);
  // Another device may have created the row concurrently.
  if (error?.code === '23505') {
    const again = await fetchUserProgress(userId);
    if (again) return again;
  }
  throw new Error(error?.message ?? 'Progressni yaratib bo‘lmadi');
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
  const { data, error } = await supabase
    .from('mobile_lesson_progress')
    .select('lesson_id, progress, is_completed, score')
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
  const map: Record<string, LessonProgressRow> = {};
  for (const row of data ?? []) map[row.lesson_id] = row;
  return map;
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

/** Every card review with the day it happened (unique per user/card/day). */
export async function fetchCardReviews(userId: string): Promise<ReviewEntry[]> {
  const { data, error } = await supabase
    .from('mobile_card_reviews')
    .select('card_id, reviewed_date')
    .eq('user_id', userId)
    .order('reviewed_date', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    cardId: row.card_id as string,
    day: row.reviewed_date as string,
  }));
}

export async function markCardReviewedDb(
  userId: string,
  cardId: string,
  grade = 3,
  day = localDay(),
): Promise<void> {
  const { error } = await supabase.from('mobile_card_reviews').upsert(
    { user_id: userId, card_id: cardId, reviewed_date: day, grade },
    { onConflict: 'user_id,card_id,reviewed_date', ignoreDuplicates: true },
  );
  if (error) throw new Error(error.message);
}

/* -------------------------------------------------------------------------- */
/* Daily activity                                                             */
/* -------------------------------------------------------------------------- */

export async function fetchActivity(userId: string, days = 30): Promise<ActivityRow[]> {
  const since = localDay(new Date(Date.now() - days * 86400000));
  const { data, error } = await supabase
    .from('mobile_daily_activity')
    .select('day, xp, minutes')
    .eq('user_id', userId)
    .gte('day', since)
    .order('day', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({ day: r.day as string, xp: r.xp, minutes: r.minutes }));
}

/** Persist the captured total; retrying a lost response must not add XP twice. */
export async function saveActivity(userId: string, row: ActivityRow): Promise<void> {
  const { error } = await supabase.from('mobile_daily_activity').upsert(
    { user_id: userId, ...row },
    { onConflict: 'user_id,day' },
  );
  if (error) throw new Error(error.message);
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

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidUuid(str: string): boolean {
  return typeof str === 'string' && UUID_REGEX.test(str.trim());
}

const GUEST_NOTIFICATIONS: NotificationRow[] = [
  {
    id: 'guest-welcome',
    title: 'Xush kelibsiz! 👋',
    message: 'Kaiwa-da yapon tili bo‘yicha birinchi darsingizni boshlang va XP to‘plang.',
    type: 'system',
    isRead: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'guest-speaking',
    title: 'AI Speaking tayyor 🎙️',
    message: 'Speak bo‘limiga o‘ting va Kaiwa AI bilan real-time suhbat qiling.',
    type: 'daily',
    isRead: false,
    createdAt: new Date().toISOString(),
  },
];

export function notificationIcon(type: string): string {
  return TYPE_ICONS[type] ?? 'notifications';
}

export async function fetchNotifications(userId: string): Promise<NotificationRow[]> {
  if (!isValidUuid(userId)) {
    return GUEST_NOTIFICATIONS;
  }

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
  if (!isValidUuid(userId)) {
    const item = GUEST_NOTIFICATIONS.find((n) => n.id === id);
    if (item) item.isRead = true;
    return;
  }

  const { error } = await supabase
    .from('user_notifications')
    .update({ is_read: true })
    .eq('id', id)
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
}

/** First launch: seed a welcome notification so the screen is not empty. */
export async function seedWelcomeNotification(userId: string): Promise<void> {
  if (!isValidUuid(userId)) return;

  const existing = await fetchNotifications(userId);
  if (existing.length > 0) return;
  await supabase.from('user_notifications').insert({
    user_id: userId,
    title: 'Xush kelibsiz! 👋',
    message: 'Kaiwa-da birinchi darsingizni boshlang va XP to\'plang.',
    type: 'system',
  });
}
