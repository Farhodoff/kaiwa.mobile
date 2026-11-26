import AsyncStorage from '@react-native-async-storage/async-storage';
import { ProgressSync, type SyncState } from '../lib/progress-sync';
import {
  ensureUserProgress, fetchActivity, fetchCardReviews, fetchLessonProgressMap,
  markCardReviewedDb, saveActivity, saveLessonProgress, saveUserProgress,
} from './progress';

export function createProgressSync(
  userId: string,
  name: string | undefined,
  onChange: (state: SyncState) => void,
): ProgressSync {
  return new ProgressSync({
    userId,
    storage: AsyncStorage,
    onChange,
    read: async () => {
      const [progress, lessonProgress, reviews, activity] = await Promise.all([
        ensureUserProgress(userId, name), fetchLessonProgressMap(userId),
        fetchCardReviews(userId), fetchActivity(userId),
      ]);
      return { progress, lessonProgress, reviews, activity };
    },
    write: async (write) => {
      switch (write.kind) {
        case 'progress': return saveUserProgress(userId, write.patch);
        case 'lesson': return saveLessonProgress(userId, write.row.lesson_id, {
          progress: write.row.progress,
          isCompleted: write.row.is_completed,
          score: write.row.score,
        });
        case 'review': return markCardReviewedDb(userId, write.cardId, write.grade, write.day);
        case 'activity': return saveActivity(userId, write.row);
      }
    },
  });
}
