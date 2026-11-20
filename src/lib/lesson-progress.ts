import type { LessonProgressRow } from '../services/content';
import type { ProgressSnapshot, ProgressWrite } from './progress-sync';

export function recordLessonProgress(
  snapshot: ProgressSnapshot,
  lessonId: string,
  patch: { progress?: number; isCompleted?: boolean; score?: number | null },
): { snapshot: ProgressSnapshot; writes: Record<string, ProgressWrite> } {
  const existing = snapshot.lessonProgress[lessonId];
  const row: LessonProgressRow = {
    lesson_id: lessonId,
    progress: Math.max(patch.progress ?? 0, existing?.progress ?? 0),
    is_completed: !!(patch.isCompleted || existing?.is_completed),
    score: patch.score ?? existing?.score ?? null,
  };
  const lessonProgress = { ...snapshot.lessonProgress, [lessonId]: row };
  const progressPatch = {
    lessonsDone: Object.values(lessonProgress).filter((item) => item.is_completed).length,
  };
  return {
    snapshot: { ...snapshot, lessonProgress, progress: { ...snapshot.progress, ...progressPatch } },
    writes: {
      [`lesson:${lessonId}`]: { kind: 'lesson', row },
      progress: { kind: 'progress', patch: progressPatch },
    },
  };
}
