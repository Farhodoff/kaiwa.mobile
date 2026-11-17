import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { FLASHCARDS, USER } from '../data/content';

type AppState = {
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
  /** IDs of flashcards the user has reviewed in this session. */
  reviewedCards: string[];

  addXp: (amount: number) => void;
  markCardReviewed: (id: string) => void;
  setNotifications: (v: boolean) => void;
  setSound: (v: boolean) => void;
  resetSession: () => void;
};

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [xp, setXp] = useState(USER.xp);
  const [dailyGoalDone, setDailyGoalDone] = useState(6);
  const [reviewedCards, setReviewedCards] = useState<string[]>([]);
  const [notifications, setNotificationsState] = useState(true);
  const [sound, setSoundState] = useState(true);

  const addXp = useCallback((amount: number) => {
    setXp((v) => v + amount);
    setDailyGoalDone((v) => Math.min(30, v + 1));
  }, []);

  const markCardReviewed = useCallback((id: string) => {
    setReviewedCards((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  const setNotifications = useCallback((v: boolean) => setNotificationsState(v), []);
  const setSound = useCallback((v: boolean) => setSoundState(v), []);

  const resetSession = useCallback(() => {
    setXp(USER.xp);
    setReviewedCards([]);
    setDailyGoalDone(6);
  }, []);

  const value = useMemo<AppState>(
    () => ({
      xp,
      xpGoal: USER.xpGoal,
      streak: USER.streak,
      level: USER.level,
      levelProgress: USER.levelProgress,
      wordsLearned: USER.words,
      dailyGoalDone,
      dailyGoal: 30,
      reviewedToday: reviewedCards.length,
      notifications,
      sound,
      reviewedCards,
      addXp,
      markCardReviewed,
      setNotifications,
      setSound,
      resetSession,
    }),
    [
      xp,
      dailyGoalDone,
      reviewedCards,
      notifications,
      sound,
      addXp,
      markCardReviewed,
      setNotifications,
      setSound,
      resetSession,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}

export { FLASHCARDS };
