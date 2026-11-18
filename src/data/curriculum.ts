import minna1 from './minna_shokyu1_complete.json';
import minna2 from './minna_shokyu2_complete.json';
import { Lesson, LessonContent } from '../services/content';

function buildLessonsFromMinna(): Lesson[] {
  const allRaw = [...minna1, ...minna2];
  return allRaw.map((item: any, idx: number) => {
    const isN5 = item.lessonNumber <= 25;
    const level = isN5 ? 'N5' : 'N4';

    const vocab = (item.vocabulary || []).map((v: any) => ({
      ja: v.kanji ? `${v.kanji} (${v.kana})` : v.kana,
      romaji: v.kana,
      uz: v.meaning,
    }));

    const grammar = (item.grammar || []).map((g: any) => ({
      pattern: g.pattern || `Grammatika #${g.ruleNumber || 1}`,
      meaning: g.meaning || '',
      example: g.explanation || '',
    }));

    const rawDialogue = Array.isArray(item.dialogue)
      ? item.dialogue
      : (item.dialogue && Array.isArray(item.dialogue.lines) ? item.dialogue.lines : []);

    const phrases = rawDialogue.map((d: any) => ({
      ja: d.japanese || d.ja || (d.speaker ? `${d.speaker}: ${d.text || ''}` : d.text || ''),
      uz: d.uzbek || d.uz || d.text || '',
    }));

    const content: LessonContent = {
      vocab,
      grammar,
      phrases: phrases.filter((p: any) => p.ja && p.uz),
    };

    return {
      id: `m-l${item.lessonNumber}`,
      title: item.title || `${item.lessonNumber}-dars`,
      titleJa: item.title_ja || `第${item.lessonNumber}課`,
      level,
      minutes: 10 + (item.lessonNumber % 5) * 2,
      xp: 30 + (item.lessonNumber % 3) * 5,
      content,
    };
  });
}

// Full 50 Minna no Nihongo lessons
export const REAL_CURRICULUM_LESSONS: Lesson[] = buildLessonsFromMinna();
