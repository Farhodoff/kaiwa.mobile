import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../theme';
import { RootStackParamList } from '../navigation/types';
import { Card } from '../components/Card';
import { ProgressBar } from '../components/ProgressBar';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { ErrorView, LoadingView } from '../components/StateView';
import { useAsync } from '../hooks/useAsync';
import { fetchQuizQuestions } from '../services/content';
import { useApp } from '../store/AppContext';

type Props = NativeStackScreenProps<RootStackParamList, 'LessonQuiz'>;

export default function LessonQuizScreen({ route, navigation }: Props) {
  const { lessonId, title, level } = route.params;
  const { addXp, saveLessonScore } = useApp();

  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [finished, setFinished] = useState(false);

  const quizQuery = useAsync(() => fetchQuizQuestions('lesson', lessonId), [lessonId]);
  const questions = useMemo(() => quizQuery.data ?? [], [quizQuery.data]);
  const q = questions[index];
  const answered = picked !== null;

  const choose = (i: number) => {
    if (answered || !q) return;
    setPicked(i);
    if (i === q.correctIndex) {
      setCorrectCount((c) => c + 1);
      addXp(10);
    } else {
      addXp(2);
    }
  };

  const next = () => {
    if (index + 1 >= questions.length) {
      setFinished(true);
      const pct = questions.length
        ? Math.round((correctCount / questions.length) * 100)
        : 0;
      // Persist the quiz result against the lesson.
      saveLessonScore(lessonId, {
        progress: 1,
        isCompleted: pct >= 60,
        score: pct,
      });
      return;
    }
    setIndex((i) => i + 1);
    setPicked(null);
  };

  if (quizQuery.loading) {
    return (
      <View style={styles.container}>
        <LoadingView label="Savollar yuklanmoqda…" />
      </View>
    );
  }

  if (quizQuery.error || questions.length === 0) {
    return (
      <View style={styles.container}>
        <ErrorView
          message={quizQuery.error ?? 'Bu dars uchun savollar topilmadi'}
          onRetry={quizQuery.reload}
        />
      </View>
    );
  }

  if (finished) {
    const pct = Math.round((correctCount / questions.length) * 100);
    return (
      <View style={styles.container}>
        <ScreenHeader
          title="Natijalar"
          onBack={() => navigation.navigate('Auth', { screen: 'Main', params: { screen: 'Home' } })}
        />
        <View style={styles.resultWrap}>
          <View
            style={[
              styles.resultRing,
              {
                borderColor:
                  pct >= 80 ? colors.success : pct >= 50 ? colors.warning : colors.accent,
              },
            ]}
          >
            <Text style={styles.resultPct}>{pct}%</Text>
          </View>
          <Text style={[typography.h1, { textAlign: 'center', marginTop: spacing.xl }]}>
            {pct >= 80 ? 'Barakalla! 🎉' : pct >= 50 ? 'Yaxshi! 👏' : "Qaytadan urinib ko'ring 💪"}
          </Text>
          <Text style={styles.resultSub}>
            {correctCount} / {questions.length} ta savol to'g'ri · {title} · {level}
          </Text>

          <Card style={styles.resultCard}>
            <ResultRow label="To'g'ri javoblar" value={`${correctCount}`} />
            <View style={styles.sep} />
            <ResultRow label="Noto'g'ri" value={`${questions.length - correctCount}`} />
            <View style={styles.sep} />
            <ResultRow label="Yig'ilgan XP" value={`+${correctCount * 10}`} accent />
          </Card>

          <PrimaryButton
            title="Davom etish"
            onPress={() =>
              navigation.navigate('Auth', { screen: 'Main', params: { screen: 'Home' } })
            }
            style={{ marginTop: spacing.xl, alignSelf: 'stretch' }}
          />
          <PrimaryButton
            title="Yana bir marta"
            variant="ghost"
            onPress={() => {
              setIndex(0);
              setPicked(null);
              setCorrectCount(0);
              setFinished(false);
            }}
            style={{ marginTop: spacing.md, alignSelf: 'stretch' }}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={title}
        subtitle={`${level} · Savol ${index + 1}/${questions.length}`}
        onBack={() => navigation.goBack()}
      />
      <View style={{ paddingHorizontal: spacing.xl }}>
        <ProgressBar progress={(index + (answered ? 1 : 0)) / questions.length} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.questionWrap}>
          <Text style={styles.question}>{q.question}</Text>
        </View>

        <View style={styles.options}>
          {q.options.map((opt, i) => {
            const isCorrect = i === q.correctIndex;
            const isPicked = picked === i;
            let state: 'idle' | 'correct' | 'wrong' = 'idle';
            if (answered && isCorrect) state = 'correct';
            else if (answered && isPicked && !isCorrect) state = 'wrong';

            return (
              <Pressable
                key={opt}
                onPress={() => choose(i)}
                style={[
                  styles.option,
                  state === 'correct' && styles.optionCorrect,
                  state === 'wrong' && styles.optionWrong,
                  answered && state === 'idle' && styles.optionDim,
                ]}
              >
                <View
                  style={[
                    styles.optionLetter,
                    state === 'correct' && { backgroundColor: colors.success },
                    state === 'wrong' && { backgroundColor: colors.accent },
                  ]}
                >
                  <Text
                    style={[
                      styles.optionLetterText,
                      state !== 'idle' && { color: colors.white },
                    ]}
                  >
                    {String.fromCharCode(65 + i)}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.optionText,
                    state === 'correct' && { color: colors.success, fontWeight: '700' },
                    state === 'wrong' && { color: colors.accent, fontWeight: '700' },
                  ]}
                >
                  {opt}
                </Text>
                {state === 'correct' ? (
                  <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                ) : state === 'wrong' ? (
                  <Ionicons name="close-circle" size={20} color={colors.accent} />
                ) : null}
              </Pressable>
            );
          })}
        </View>

        {answered && q.explanation ? (
          <Card
            style={[
              styles.explanation,
              {
                backgroundColor:
                  picked === q.correctIndex ? colors.successLight : colors.warningLight,
                borderColor: 'transparent',
              },
            ]}
          >
            <Ionicons
              name={picked === q.correctIndex ? 'bulb' : 'information-circle'}
              size={18}
              color={picked === q.correctIndex ? colors.success : colors.warning}
            />
            <Text style={styles.explanationText}>{q.explanation}</Text>
          </Card>
        ) : null}
      </ScrollView>

      {answered ? (
        <View style={styles.footer}>
          <PrimaryButton
            title={index + 1 >= questions.length ? 'Natijani ko\'rish' : 'Keyingi savol'}
            onPress={next}
          />
        </View>
      ) : null}
    </View>
  );
}

function ResultRow({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <View style={styles.resultRow}>
      <Text style={styles.resultLabel}>{label}</Text>
      <Text style={[styles.resultValue, accent && { color: colors.primary }]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.xl, paddingBottom: spacing.xxxl },
  questionWrap: { marginBottom: spacing.xl },
  question: { fontSize: 20, fontWeight: '800', color: colors.text, lineHeight: 28 },
  questionJa: { ...typography.bodySecondary, marginTop: spacing.sm },
  options: { gap: spacing.md },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  optionCorrect: { borderColor: colors.success, backgroundColor: colors.successLight },
  optionWrong: { borderColor: colors.accent, backgroundColor: '#FFECEC' },
  optionDim: { opacity: 0.55 },
  optionLetter: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLetterText: { fontSize: 13, fontWeight: '800', color: colors.textSecondary },
  optionText: { flex: 1, fontSize: 15, color: colors.text, fontWeight: '500' },
  explanation: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
    alignItems: 'flex-start',
  },
  explanationText: { flex: 1, fontSize: 13, color: colors.text, lineHeight: 19 },
  footer: {
    padding: spacing.xl,
    paddingTop: spacing.md,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  resultWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  resultRing: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
  },
  resultPct: { fontSize: 34, fontWeight: '800', color: colors.text },
  resultSub: {
    ...typography.bodySecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  resultCard: { alignSelf: 'stretch', marginTop: spacing.xl },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  resultLabel: { ...typography.bodySecondary },
  resultValue: { fontSize: 15, fontWeight: '800', color: colors.text },
  sep: { height: 1, backgroundColor: colors.divider, marginVertical: spacing.xs },
});
