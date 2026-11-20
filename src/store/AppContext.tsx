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
  activity: ProgressSnapshot['activity'];

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

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const name = user?.name;
  const session = useRef<{ userId: string; client: ProgressSync } | null>(null);
  const [state, setState] = useState<{ userId: string; sync: SyncState } | null>(null);

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

  const addXp = useCallback((amount: number) => {
    const client = getClient();
    const snapshot = client?.snapshot;
    if (!snapshot || amount <= 0 || !Number.isFinite(amount)) return;
    const prev = snapshot.progress;
    const day = today();
    const isToday = prev.lastActivityDate === day;
    const xp = prev.xp + amount;
    const patch: Partial<UserProgress> = {
      xp,
      streak: isToday ? prev.streak
        : prev.lastActivityDate && consecutive(prev.lastActivityDate) ? prev.streak + 1 : 1,
      lastActivityDate: day,
      dailyGoalDone: Math.min(prev.dailyGoal, (isToday ? prev.dailyGoalDone : 0) + 1),
      levelProgress: xpGoalProgress(xp, prev.xpGoal),
    };
    const previous = snapshot.activity.find((row) => row.day === day);
    const row = { day, xp: (previous?.xp ?? 0) + amount, minutes: (previous?.minutes ?? 0) + 1 };
    client!.update({
      ...snapshot, progress: { ...prev, ...patch },
      activity: [row, ...snapshot.activity.filter((item) => item.day !== day)],
    }, {
      progress: { kind: 'progress', patch },
      [`activity:${day}`]: { kind: 'activity', row },
    });
  }, [getClient]);

  const markCardReviewed = useCallback((id: string) => {
    const client = getClient();
    const snapshot = client?.snapshot;
    if (!snapshot || snapshot.reviewedCards.includes(id)) return;
    const patch = { wordsLearned: snapshot.progress.wordsLearned + 1 };
    const day = today();
    client!.update({
      ...snapshot, reviewedCards: [...snapshot.reviewedCards, id],
      progress: { ...snapshot.progress, ...patch },
    }, {
      progress: { kind: 'progress', patch },
      [`review:${id}:${day}`]: { kind: 'review', cardId: id, day },
    });
  }, [getClient]);

  const learnWord = useCallback(() => {
    const snapshot = getClient()?.snapshot;
    if (snapshot) apply({ wordsLearned: snapshot.progress.wordsLearned + 1 });
  }, [apply, getClient]);
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
    const patch = { conversationsDone: snapshot.progress.conversationsDone + 1 };
    const day = today();
    const previous = snapshot.activity.find((row) => row.day === day);
    const row = { day, xp: (previous?.xp ?? 0) + 10, minutes: (previous?.minutes ?? 0) + minutes };
    client!.update({
      ...snapshot, progress: { ...snapshot.progress, ...patch },
      activity: [row, ...snapshot.activity.filter((item) => item.day !== day)],
    }, {
      progress: { kind: 'progress', patch },
      [`activity:${day}`]: { kind: 'activity', row },
    });
  }, [getClient]);

  const resetSession = useCallback(() => {
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
  const value = useMemo<AppState>(() => ({
    loading: !!userId && !snapshot,
    xp: progress.xp, xpGoal: progress.xpGoal, streak: progress.streak,
    level: progress.level, levelProgress: progress.levelProgress, wordsLearned: progress.wordsLearned,
    dailyGoalDone: progress.dailyGoalDone, dailyGoal: progress.dailyGoal,
    reviewedToday: snapshot?.reviewedCards.length ?? 0,
    notifications: progress.notificationsEnabled, sound: progress.soundEnabled,
    conversationsDone: progress.conversationsDone, lessonsDone: progress.lessonsDone,
    jlptDone: progress.jlptDone, reviewedCards: snapshot?.reviewedCards ?? [],
    lessonProgress: snapshot?.lessonProgress ?? {}, activity: snapshot?.activity ?? [],
    addXp, markCardReviewed, learnWord, setNotifications, setSound, setDailyGoal,
    saveLessonScore, registerConversation, resetSession, refresh,
  }), [
    userId, snapshot, progress, addXp, markCardReviewed, learnWord, setNotifications,
    setSound, setDailyGoal, saveLessonScore, registerConversation, resetSession, refresh,
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
