import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useAuth } from './AuthContext';
import {
  ActivityRow,
  DEFAULT_PROGRESS,
  UserProgress,
  bumpActivity,
  ensureUserProgress,
  fetchActivity,
  fetchLessonProgressMap,
  fetchReviewedCardIds,
  markCardReviewedDb,
  saveLessonProgress,
  saveUserProgress,
} from '../services/progress';
import { LessonProgressRow } from '../services/content';

type AppState = {
  /** true while progress is being loaded from PostgreSQL */
  loading: boolean;
  xp: number;
  xpGoal: number;
  streak: number;
  level: string;
  levelProgress: number;
  wordsLearned: number;
  dailyGoalDone: number; // minutes studied today
  dailyGoal: number;
  reviewedToday: number;
  notifications: boolean;
  sound: boolean;
  conversationsDone: number;
  lessonsDone: number;
  /** JLPT answered-correct counts per section id. */
  jlptDone: Record<string, number>;
  /** IDs of flashcards the user has reviewed. */
  reviewedCards: string[];
  /** User's lesson progress rows keyed by lesson id. */
  lessonProgress: Record<string, LessonProgressRow>;
  /** Last 30 days of XP/minutes activity. */
  activity: ActivityRow[];

  addXp: (amount: number) => void;
  markCardReviewed: (id: string) => void;
  /** Count a vocabulary item learned inside a lesson. */
  learnWord: () => void;
  setNotifications: (v: boolean) => void;
  setSound: (v: boolean) => void;
  setDailyGoal: (minutes: number) => void;
  saveLessonScore: (
    lessonId: string,
    patch: { progress?: number; isCompleted?: boolean; score?: number | null },
  ) => void;
  /** Register a finished AI conversation (counts toward achievements). */
  registerConversation: (minutes?: number) => void;
  resetSession: () => void;
  refresh: () => void;
};

const AppContext = createContext<AppState | null>(null);

const today = () => new Date().toISOString().slice(0, 10);

function xpGoalProgress(xp: number, goal: number): number {
  if (goal <= 0) return 0;
  return Math.min(1, Math.round(((xp % goal) / goal) * 100) / 100);
}

/** true when `date` was yesterday */
function consecutive(date: string): boolean {
  const last = new Date(`${date}T00:00:00`).getTime();
  const now = new Date(`${today()}T00:00:00`).getTime();
  return Math.round((now - last) / 86400000) === 1;
}

/** Everything persisted per signed-in user. */
type Store = {
  userId: string | null;
  progress: UserProgress;
  reviewedCards: string[];
  lessonProgress: Record<string, LessonProgressRow>;
  activity: ActivityRow[];
};

const EMPTY_STORE: Store = {
  userId: null,
  progress: DEFAULT_PROGRESS,
  reviewedCards: [],
  lessonProgress: {},
  activity: [],
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [store, setStore] = useState<Store>(EMPTY_STORE);
  const [loading, setLoading] = useState(false);

  // Active store: matches the signed-in user, otherwise everything renders
  // as defaults (no state-reset effect needed on sign-out).
  const active: Store = userId && store.userId === userId ? store : EMPTY_STORE;
  const activeProgress = active.progress;

  // Ref mirrors so event handlers can read the freshest values.
  const progressRef = useRef(activeProgress);
  const reviewedRef = useRef(active.reviewedCards);
  useEffect(() => {
    progressRef.current = activeProgress;
    reviewedRef.current = active.reviewedCards;
  }, [activeProgress, active.reviewedCards]);

  const hydratedFor = useRef<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userIdRef = useRef<string | null>(userId);
  const nameRef = useRef<string | undefined>(user?.name);
  useEffect(() => {
    userIdRef.current = userId;
    nameRef.current = user?.name;
  });

  /** Persist a partial patch (debounced unless `immediate`). */
  const save = useCallback((patch: Partial<UserProgress>, immediate = false) => {
    const id = userIdRef.current;
    if (!id) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    const run = () => saveUserProgress(id, patch).catch(() => undefined);
    if (immediate) run();
    else saveTimer.current = setTimeout(run, 600);
  }, []);

  /** Apply a patch to state (only for the current user) and persist it. */
  const apply = useCallback(
    (patch: Partial<UserProgress>, immediate = true) => {
      setStore((prev) =>
        prev.userId === userIdRef.current
          ? { ...prev, progress: { ...prev.progress, ...patch } }
          : prev,
      );
      progressRef.current = { ...progressRef.current, ...patch };
      save(patch, immediate);
    },
    [save],
  );

  const hydrate = useCallback(async () => {
    const id = userIdRef.current;
    if (!id) return;
    setLoading(true);
    try {
      const [p, lp, reviewed, act] = await Promise.all([
        ensureUserProgress(id, nameRef.current),
        fetchLessonProgressMap(id),
        fetchReviewedCardIds(id),
        fetchActivity(id, 30),
      ]);
      // Ignore the result if the user changed while loading.
      if (userIdRef.current !== id) return;
      progressRef.current = p;
      reviewedRef.current = reviewed;
      setStore({ userId: id, progress: p, reviewedCards: reviewed, lessonProgress: lp, activity: act });
      hydratedFor.current = id;
    } catch {
      // Offline or transient error — defaults remain, `refresh()` retries.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    userIdRef.current = userId;
    if (userId && hydratedFor.current !== userId) hydrate();
    if (!userId) hydratedFor.current = null;
  }, [userId, hydrate]);

  useEffect(
    () => () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    },
    [],
  );

  const addXp = useCallback(
    (amount: number) => {
      if (amount <= 0) return;
      const prev = progressRef.current;
      const isToday = prev.lastActivityDate === today();
      const xp = prev.xp + amount;
      const streak = isToday
        ? prev.streak
        : prev.lastActivityDate && consecutive(prev.lastActivityDate)
          ? prev.streak + 1
          : 1;
      apply({
        xp,
        streak,
        lastActivityDate: today(),
        dailyGoalDone: Math.min(prev.dailyGoal, prev.dailyGoalDone + 1),
        levelProgress: xpGoalProgress(xp, prev.xpGoal),
      });
      const id = userIdRef.current;
      if (id) bumpActivity(id, amount, 1).catch(() => undefined);
    },
    [apply],
  );

  const markCardReviewed = useCallback(
    (id: string) => {
      if (reviewedRef.current.includes(id)) return;
      const next = [...reviewedRef.current, id];
      reviewedRef.current = next;
      setStore((prev) =>
        prev.userId === userIdRef.current ? { ...prev, reviewedCards: next } : prev,
      );
      apply({ wordsLearned: progressRef.current.wordsLearned + 1 });
      const uid = userIdRef.current;
      if (uid) markCardReviewedDb(uid, id).catch(() => undefined);
    },
    [apply],
  );

  const learnWord = useCallback(() => {
    apply({ wordsLearned: progressRef.current.wordsLearned + 1 });
  }, [apply]);

  const setNotifications = useCallback(
    (v: boolean) => apply({ notificationsEnabled: v }),
    [apply],
  );

  const setSound = useCallback((v: boolean) => apply({ soundEnabled: v }), [apply]);

  const setDailyGoal = useCallback((minutes: number) => apply({ dailyGoal: minutes }), [apply]);

  const saveLessonScore = useCallback(
    (
      lessonId: string,
      patch: { progress?: number; isCompleted?: boolean; score?: number | null },
    ) => {
      setStore((prev) => {
        if (prev.userId !== userIdRef.current) return prev;
        const existing = prev.lessonProgress[lessonId];
        return {
          ...prev,
          lessonProgress: {
            ...prev.lessonProgress,
            [lessonId]: {
              lesson_id: lessonId,
              progress: patch.progress ?? existing?.progress ?? 0,
              is_completed: patch.isCompleted ?? existing?.is_completed ?? false,
              score: patch.score ?? existing?.score ?? null,
            },
          },
        };
      });
      const id = userIdRef.current;
      if (!id) return;
      saveLessonProgress(id, lessonId, patch).catch(() => undefined);
      if (patch.isCompleted) {
        apply({ lessonsDone: progressRef.current.lessonsDone + 1 });
      }
    },
    [apply],
  );

  /** Register a finished AI conversation. */
  const registerConversation = useCallback(
    (minutes = 1) => {
      apply({ conversationsDone: progressRef.current.conversationsDone + 1 });
      const id = userIdRef.current;
      if (id) bumpActivity(id, 10, minutes).catch(() => undefined);
    },
    [apply],
  );

  const resetSession = useCallback(() => {
    apply({ xp: 0, dailyGoalDone: 0, streak: 0, lastActivityDate: null });
    reviewedRef.current = [];
    setStore((prev) =>
      prev.userId === userIdRef.current ? { ...prev, reviewedCards: [] } : prev,
    );
  }, [apply]);

  const refresh = useCallback(() => {
    if (userIdRef.current) hydrate();
  }, [hydrate]);

  const value = useMemo<AppState>(
    () => ({
      loading,
      xp: activeProgress.xp,
      xpGoal: activeProgress.xpGoal,
      streak: activeProgress.streak,
      level: activeProgress.level,
      levelProgress: activeProgress.levelProgress,
      wordsLearned: activeProgress.wordsLearned,
      dailyGoalDone: activeProgress.dailyGoalDone,
      dailyGoal: activeProgress.dailyGoal,
      reviewedToday: active.reviewedCards.length,
      notifications: activeProgress.notificationsEnabled,
      sound: activeProgress.soundEnabled,
      conversationsDone: activeProgress.conversationsDone,
      lessonsDone: activeProgress.lessonsDone,
      jlptDone: activeProgress.jlptDone,
      reviewedCards: active.reviewedCards,
      lessonProgress: active.lessonProgress,
      activity: active.activity,
      addXp,
      markCardReviewed,
      learnWord,
      setNotifications,
      setSound,
      setDailyGoal,
      saveLessonScore,
      registerConversation,
      resetSession,
      refresh,
    }),
    [
      loading,
      active,
      activeProgress,
      addXp,
      markCardReviewed,
      learnWord,
      setNotifications,
      setSound,
      setDailyGoal,
      saveLessonScore,
      registerConversation,
      resetSession,
      refresh,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}

export type { AppState };
