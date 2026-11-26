import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState as NativeAppState, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from './AuthContext';
import { DEFAULT_PROGRESS, type UserProgress } from '../services/progress';
import { type LessonProgressRow } from '../services/content';
import { createProgressSync } from '../services/progressSync';
import { ProgressSync, type ProgressSnapshot, type SyncState } from '../lib/progress-sync';
import { recordLessonProgress } from '../lib/lesson-progress';
import { ErrorView, LoadingView } from '../components/StateView';
import { colors, spacing } from '../theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  type SM2CardState,
  type SM2Grade,
  gradeCard,
  isCardDue,
} from '../lib/spaced-repetition';
import {
  addActivity,
  elapsedMinutes,
  isFirstReviewEver,
  localDay,
  minutesOn,
  reviewsOn,
  streakOn,
} from '../lib/daily';
import {
  addLearnedWord,
  parseLearnedWords,
  serializeLearnedWords,
} from '../lib/learned-words';

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
  /** Unique cards reviewed today (local day, resets at midnight). */
  reviewedToday: number;
  notifications: boolean;
  sound: boolean;
  conversationsDone: number;
  lessonsDone: number;
  /** JLPT answered-correct counts per section id. */
  jlptDone: Record<string, number>;
  /** User's lesson progress rows keyed by lesson id. */
  lessonProgress: Record<string, LessonProgressRow>;
  /** Last 30 days of XP/minutes activity. */
  activity: ProgressSnapshot['activity'];
  /** SM-2 spaced-repetition state per card, cached on this device. */
  sm2Cards: Record<string, SM2CardState>;

  /** Award XP; `minutes` defaults to the time actually spent since the last award. */
  addXp: (amount: number, minutes?: number) => void;
  /** Grade a due card. Returns false when the card was not due (nothing counted). */
  markCardReviewed: (id: string, grade?: SM2Grade) => boolean;
  /** Count a vocabulary item once. Returns false when it was already learned. */
  learnWord: (word: string) => boolean;
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

const sm2Key = (userId: string) => `kaiwa-sm2:${userId}`;
const EMPTY_SM2: Record<string, SM2CardState> = {};
const EMPTY_ACTIVITY: ProgressSnapshot['activity'] = [];
const wordsKey = (userId: string) => `kaiwa-words:${userId}`;

function xpGoalProgress(xp: number, goal: number): number {
  if (goal <= 0) return 0;
  return Math.min(1, Math.round(((xp % goal) / goal) * 100) / 100);
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const name = user?.name;
  const session = useRef<{ userId: string; client: ProgressSync } | null>(null);
  const [state, setState] = useState<{ userId: string; sync: SyncState } | null>(null);
  // Cards are tied to the owner id so a different account never sees the
  // previous user's SM-2 state, without resetting state inside an effect.
  const [sm2Store, setSm2Store] = useState<{
    owner: string | null;
    cards: Record<string, SM2CardState>;
  }>({ owner: null, cards: {} });
  const sm2Cards = sm2Store.owner === userId ? sm2Store.cards : EMPTY_SM2;
  const sm2CardsRef = useRef<Record<string, SM2CardState>>({});
  const sm2Loaded = useRef<Promise<void>>(Promise.resolve());

  // Local day: recomputed while the app is open so goals and streaks reset at
  // midnight without needing a restart.
  const [todayKey, setTodayKey] = useState(() => localDay());
  const lastActivityAt = useRef<number | null>(null);

  // Learned vocabulary ledger (idempotent word counting on this device).
  const learnedWordsRef = useRef<string[]>([]);
  const learnedLoaded = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    const tick = () => {
      const now = localDay();
      setTodayKey((previous) => (previous === now ? previous : now));
    };
    const timer = setInterval(tick, 30_000);
    const subscription = NativeAppState.addEventListener('change', (status) => {
      if (status === 'active') tick();
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    learnedWordsRef.current = [];
    if (!userId) return;

    let alive = true;
    learnedLoaded.current = AsyncStorage.getItem(wordsKey(userId))
      .then((raw) => {
        if (!alive) return;
        const stored = parseLearnedWords(raw);
        // Keep words learned while the ledger was still loading.
        const merged = Array.from(new Set([...stored, ...learnedWordsRef.current]));
        learnedWordsRef.current = merged;
      })
      .catch((error: unknown) => {
        console.warn('O‘rganilgan so‘zlar ro‘yxatini o‘qish muvaffaqiyatsiz:', error);
      });

    return () => {
      alive = false;
    };
  }, [userId]);

  const persistLearnedWords = useCallback(() => {
    if (!userId) return;
    void learnedLoaded.current
      .then(() =>
        AsyncStorage.setItem(wordsKey(userId), serializeLearnedWords(learnedWordsRef.current)),
      )
      .catch((error: unknown) => {
        console.warn('O‘rganilgan so‘zlar ro‘yxatini saqlash muvaffaqiyatsiz:', error);
      });
  }, [userId]);

  useEffect(() => {
    sm2CardsRef.current = {};
    if (!userId) return;

    let alive = true;
    sm2Loaded.current = AsyncStorage.getItem(sm2Key(userId))
      .then((raw) => {
        if (!alive || !raw) return;
        const parsed = JSON.parse(raw) as Record<string, SM2CardState>;
        if (!parsed || typeof parsed !== 'object') return;
        // Keep cards graded while the local cache was still loading.
        const merged = { ...parsed, ...sm2CardsRef.current };
        sm2CardsRef.current = merged;
        setSm2Store({ owner: userId, cards: merged });
      })
      .catch((error: unknown) => {
        console.warn('SM-2 holatini o‘qish muvaffaqiyatsiz:', error);
      });

    return () => {
      alive = false;
    };
  }, [userId]);

  const persistSm2 = useCallback(() => {
    if (!userId) return;
    void sm2Loaded.current
      .then(() => AsyncStorage.setItem(sm2Key(userId), JSON.stringify(sm2CardsRef.current)))
      .catch((error: unknown) => {
        console.warn('SM-2 holatini saqlash muvaffaqiyatsiz:', error);
      });
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    const client = createProgressSync(userId, name, (sync) => setState({ userId, sync }));
    session.current = { userId, client };
    void client.start();
    // Retry while the app is active; no additional connectivity dependency.
    const retry = () => {
      if (client.snapshot) void client.sync();
      else void client.start();
    };
    const timer = setInterval(() => {
      if (NativeAppState.currentState === 'active' && client.needsRetry) retry();
    }, 30_000);
    const subscription = NativeAppState.addEventListener('change', (status) => {
      if (status === 'active') retry();
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
      client.stop();
      if (session.current?.client === client) session.current = null;
    };
  }, [userId, name]);

  const getClient = useCallback(() => {
    return session.current?.userId === userId ? session.current.client : null;
  }, [userId]);

  const apply = useCallback((patch: Partial<UserProgress>) => {
    const client = getClient();
    const snapshot = client?.snapshot;
    if (!snapshot) return;
    client!.update({ ...snapshot, progress: { ...snapshot.progress, ...patch } }, {
      progress: { kind: 'progress', patch },
    });
  }, [getClient]);

  const addXp = useCallback((amount: number, minutes?: number) => {
    const client = getClient();
    const snapshot = client?.snapshot;
    if (!snapshot || amount <= 0 || !Number.isFinite(amount)) return;

    const prev = snapshot.progress;
    const day = localDay();
    const now = Date.now();
    const gainedMinutes = minutes ?? elapsedMinutes(lastActivityAt.current, now);
    lastActivityAt.current = now;

    const xp = prev.xp + amount;
    const activity = addActivity(snapshot.activity, day, amount, gainedMinutes);
    const patch: Partial<UserProgress> = {
      xp,
      streak: streakOn(day, prev.lastActivityDate, prev.streak),
      lastActivityDate: day,
      dailyGoalDone: Math.min(prev.dailyGoal, minutesOn(activity, day)),
      levelProgress: xpGoalProgress(xp, prev.xpGoal),
    };
    const row = activity.find((item) => item.day === day)!;
    client!.update({ ...snapshot, progress: { ...prev, ...patch }, activity }, {
      progress: { kind: 'progress', patch },
      [`activity:${day}`]: { kind: 'activity', row },
    });
  }, [getClient]);

  const markCardReviewed = useCallback((id: string, grade: SM2Grade = 3): boolean => {
    const client = getClient();
    const snapshot = client?.snapshot;
    if (!snapshot) return false;

    const day = localDay();
    const previous = sm2CardsRef.current[id];
    // A card that is scheduled for a future day is not due yet.
    if (previous && !isCardDue(previous.dueDate, day)) return false;

    const next = gradeCard(previous, id, grade, day);
    sm2CardsRef.current = { ...sm2CardsRef.current, [id]: next };
    setSm2Store({ owner: userId, cards: sm2CardsRef.current });
    persistSm2();

    // Only the first review of a card counts toward `wordsLearned`; later
    // reviews are scheduled by SM-2 and recorded with their own grade.
    const firstEver = isFirstReviewEver(snapshot.reviews, id);
    const reviews = [
      { cardId: id, day },
      ...snapshot.reviews.filter((review) => !(review.cardId === id && review.day === day)),
    ];
    const patch = firstEver
      ? { wordsLearned: snapshot.progress.wordsLearned + 1 }
      : {};
    client!.update({ ...snapshot, reviews, progress: { ...snapshot.progress, ...patch } }, {
      progress: { kind: 'progress', patch },
      [`review:${id}:${day}`]: { kind: 'review', cardId: id, day, grade },
    });
    return true;
  }, [getClient, persistSm2, userId]);

  const learnWord = useCallback((word: string): boolean => {
    const client = getClient();
    const snapshot = client?.snapshot;
    if (!snapshot) return false;

    const result = addLearnedWord(learnedWordsRef.current, word);
    if (!result.added) return false;
    learnedWordsRef.current = result.keys;
    persistLearnedWords();

    const patch = { wordsLearned: snapshot.progress.wordsLearned + 1 };
    client!.update({ ...snapshot, progress: { ...snapshot.progress, ...patch } }, {
      progress: { kind: 'progress', patch },
    });
    return true;
  }, [getClient, persistLearnedWords]);
  const setNotifications = useCallback((v: boolean) => apply({ notificationsEnabled: v }), [apply]);
  const setSound = useCallback((v: boolean) => apply({ soundEnabled: v }), [apply]);
  const setDailyGoal = useCallback((minutes: number) => apply({ dailyGoal: minutes }), [apply]);

  const saveLessonScore = useCallback((
    lessonId: string,
    patch: { progress?: number; isCompleted?: boolean; score?: number | null },
  ) => {
    const client = getClient();
    const snapshot = client?.snapshot;
    if (!snapshot) return;
    const result = recordLessonProgress(snapshot, lessonId, patch);
    client!.update(result.snapshot, result.writes);
  }, [getClient]);

  const registerConversation = useCallback((minutes = 1) => {
    const client = getClient();
    const snapshot = client?.snapshot;
    if (!snapshot) return;
    const prev = snapshot.progress;
    const day = localDay();
    const activity = addActivity(snapshot.activity, day, 10, Math.max(1, minutes));
    const patch = {
      conversationsDone: prev.conversationsDone + 1,
      dailyGoalDone: Math.min(prev.dailyGoal, minutesOn(activity, day)),
    };
    const row = activity.find((item) => item.day === day)!;
    client!.update({ ...snapshot, progress: { ...prev, ...patch }, activity }, {
      progress: { kind: 'progress', patch },
      [`activity:${day}`]: { kind: 'activity', row },
    });
  }, [getClient]);

  const resetSession = useCallback(() => {
    lastActivityAt.current = null;
    apply({ xp: 0, dailyGoalDone: 0, streak: 0, lastActivityDate: null });
  }, [apply]);
  const refresh = useCallback(() => {
    const client = getClient();
    if (client?.snapshot) void client.sync();
    else if (client) void client.start();
  }, [getClient]);

  const sync = state?.userId === userId ? state.sync : null;
  const snapshot = sync?.snapshot;
  const progress = snapshot?.progress ?? DEFAULT_PROGRESS;
  const activity = snapshot?.activity ?? EMPTY_ACTIVITY;
  // Both values are derived for the *current local day*, so they reset at
  // midnight and can never drift from the activity/review records.
  const dailyGoalDone = Math.min(progress.dailyGoal, minutesOn(activity, todayKey));
  const reviewedToday = snapshot ? reviewsOn(snapshot.reviews, todayKey) : 0;
  const value = useMemo<AppState>(() => ({
    loading: !!userId && !snapshot,
    xp: progress.xp, xpGoal: progress.xpGoal, streak: progress.streak,
    level: progress.level, levelProgress: progress.levelProgress, wordsLearned: progress.wordsLearned,
    dailyGoalDone, dailyGoal: progress.dailyGoal,
    reviewedToday,
    notifications: progress.notificationsEnabled, sound: progress.soundEnabled,
    conversationsDone: progress.conversationsDone, lessonsDone: progress.lessonsDone,
    jlptDone: progress.jlptDone,
    lessonProgress: snapshot?.lessonProgress ?? {}, activity,
    sm2Cards,
    addXp, markCardReviewed, learnWord, setNotifications, setSound, setDailyGoal,
    saveLessonScore, registerConversation, resetSession, refresh,
  }), [
    userId, snapshot, progress, activity, dailyGoalDone, reviewedToday,
    addXp, markCardReviewed, learnWord, setNotifications,
    setSound, setDailyGoal, saveLessonScore, registerConversation, resetSession, refresh,
    sm2Cards,
  ]);

  return (
    <AppContext.Provider value={value}>
      <View style={{ flex: 1 }}>
        {userId && snapshot && sync?.error ? (
          <SafeAreaView edges={['top']} style={{ backgroundColor: colors.warningLight }}>
            <Pressable
              onPress={refresh}
              accessibilityRole="button"
              accessibilityLabel={`${sync.error} Qayta urinish`}
              style={{ padding: spacing.md }}
            >
              <Text style={{ color: colors.text, textAlign: 'center' }}>{sync.error} Qayta urinish</Text>
            </Pressable>
          </SafeAreaView>
        ) : null}
        <View
          style={{ flex: 1 }}
          accessibilityElementsHidden={!!userId && !snapshot}
          importantForAccessibility={userId && !snapshot ? 'no-hide-descendants' : 'auto'}
        >
          {children}
        </View>
        {userId && !snapshot ? (
          <View style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}>
            {sync?.error ? <ErrorView message={sync.error} onRetry={refresh} />
              : <LoadingView label="Progress yuklanmoqda…" />}
          </View>
        ) : null}
      </View>
    </AppContext.Provider>
  );
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}

export type { AppState };
