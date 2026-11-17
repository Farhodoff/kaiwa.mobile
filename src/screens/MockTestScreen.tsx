import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../theme';
import { RootStackParamList } from '../navigation/types';
import { Card } from '../components/Card';
import { ProgressBar } from '../components/ProgressBar';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { MOCK_TEST } from '../data/content';
import { useApp } from '../store/AppContext';

type Props = NativeStackScreenProps<RootStackParamList, 'MockTest'>;

const TIME_LIMIT = 105 * 60; // seconds

function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function MockTestScreen({ navigation }: Props) {
  const { addXp } = useApp();
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [finished, setFinished] = useState(false);
  const [awarded, setAwarded] = useState(false);

  const q = MOCK_TEST[index];
  const answered = picked !== null;

  // Simple countdown (runs only while the test is in progress).
  React.useEffect(() => {
    if (!started || finished) return;
    const id = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(id);
          setFinished(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [started, finished]);

  const choose = (i: number) => {
    if (answered) return;
    setPicked(i);
    setAnswers((a) => ({ ...a, [q.id]: i }));
  };

  const next = () => {
    if (index + 1 >= MOCK_TEST.length) {
      setFinished(true);
      return;
    }
    setIndex((i) => i + 1);
    setPicked(null);
  };

  const score = MOCK_TEST.reduce(
    (s, item) => s + (answers[item.id] === item.correctIndex ? 1 : 0),
    0,
  );

  if (!started) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Mock Test" onBack={() => navigation.goBack()} />
        <ScrollView contentContainerStyle={styles.startWrap}>
          <View style={styles.startIcon}>
            <Ionicons name="ribbon" size={44} color={colors.white} />
          </View>
          <Text style={[typography.h1, { textAlign: 'center' }]}>
            JLPT {MOCK_TEST.length > 0 ? 'N3' : ''} Mock imtihon
          </Text>
          <Text style={styles.startSub}>
            Real imtihon muhitida o'z bilimingizni sinab ko'ring
          </Text>

          <Card style={styles.specCard}>
            <SpecRow icon="help-circle-outline" label="Savollar" value={`${MOCK_TEST.length}`} />
            <View style={styles.sep} />
            <SpecRow icon="time-outline" label="Vaqt" value={`${Math.round(TIME_LIMIT / 60)} daqiqa`} />
            <View style={styles.sep} />
            <SpecRow icon="trophy-outline" label="O'tish balli" value="60%" />
            <View style={styles.sep} />
            <SpecRow icon="albums-outline" label="Bo'limlar" value="Vocab · Grammar" />
          </Card>

          <View style={styles.notice}>
            <Ionicons name="information-circle" size={18} color={colors.primary} />
            <Text style={styles.noticeText}>
              Test boshlangandan so'ng vaqt to'xtamaydi. Tayyor bo'lsangiz,
              boshlang.
            </Text>
          </View>

          <PrimaryButton
            title="Imtihonni boshlash"
            onPress={() => setStarted(true)}
            style={{ marginTop: spacing.xl }}
          />
          <PrimaryButton
            title="Bekor qilish"
            variant="ghost"
            onPress={() => navigation.goBack()}
            style={{ marginTop: spacing.md }}
          />
        </ScrollView>
      </View>
    );
  }

  if (finished) {
    const pct = Math.round((score / MOCK_TEST.length) * 100);
    const passed = pct >= 60;
    if (!awarded) {
      setAwarded(true);
      addXp(score * 15);
    }
    return (
      <View style={styles.container}>
        <ScreenHeader
          title="Natijalar"
          onBack={() =>
            navigation.navigate('Auth', { screen: 'Main', params: { screen: 'Home' } })
          }
        />
        <ScrollView contentContainerStyle={styles.startWrap}>
          <View
            style={[
              styles.startIcon,
              { backgroundColor: passed ? colors.success : colors.accent },
            ]}
          >
            <Ionicons
              name={passed ? 'trophy' : 'close'}
              size={44}
              color={colors.white}
            />
          </View>
          <Text style={[typography.h1, { textAlign: 'center' }]}>
            {passed ? "Siz o'tdingiz! 🎉" : "Bu safar o'tmadingiz 😔"}
          </Text>
          <Text style={styles.startSub}>
            {score} / {MOCK_TEST.length} ta to'g'ri javob · {pct}%
          </Text>

          <Card style={styles.specCard}>
            <SpecRow icon="checkmark-circle-outline" label="To'g'ri" value={`${score}`} />
            <View style={styles.sep} />
            <SpecRow icon="close-circle-outline" label="Noto'g'ri" value={`${MOCK_TEST.length - score}`} />
            <View style={styles.sep} />
            <SpecRow icon="flash-outline" label="Yig'ilgan XP" value={`+${score * 15}`} />
          </Card>

          <PrimaryButton
            title="Bosh sahifa"
            onPress={() =>
              navigation.navigate('Auth', { screen: 'Main', params: { screen: 'Home' } })
            }
            style={{ marginTop: spacing.xl }}
          />
          <PrimaryButton
            title="Qaytadan"
            variant="ghost"
            onPress={() => {
              setStarted(false);
              setIndex(0);
              setPicked(null);
              setAnswers({});
              setTimeLeft(TIME_LIMIT);
              setFinished(false);
              setAwarded(false);
            }}
            style={{ marginTop: spacing.md }}
          />
        </ScrollView>
      </View>
    );
  }

  const lowTime = timeLeft < 60;

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={`Savol ${index + 1}/${MOCK_TEST.length}`}
        subtitle="N3 · Mock test"
        onBack={() => navigation.goBack()}
        right={
          <View style={[styles.timer, lowTime && styles.timerLow]}>
            <Ionicons
              name="time"
              size={14}
              color={lowTime ? colors.white : colors.accent}
            />
            <Text style={[styles.timerText, lowTime && { color: colors.white }]}>
              {fmt(timeLeft)}
            </Text>
          </View>
        }
      />
      <View style={{ paddingHorizontal: spacing.xl }}>
        <ProgressBar
          progress={(index + (answered ? 1 : 0)) / MOCK_TEST.length}
          color={colors.accent}
        />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.question}>{q.question}</Text>

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
                  answered && state === 'idle' && { opacity: 0.55 },
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
                <Text style={styles.optionText}>{opt}</Text>
              </Pressable>
            );
          })}
        </View>

        {answered && q.explanation ? (
          <Card style={styles.explanation}>
            <Ionicons name="bulb" size={18} color={colors.primary} />
            <Text style={styles.explanationText}>{q.explanation}</Text>
          </Card>
        ) : null}
      </ScrollView>

      {answered ? (
        <View style={styles.footer}>
          <PrimaryButton
            title={
              index + 1 >= MOCK_TEST.length ? "Imtihonni yakunlash" : 'Keyingi savol'
            }
            onPress={next}
            variant="primary"
          />
        </View>
      ) : null}
    </View>
  );
}

// Guard so XP is only awarded once for a finished test.
function SpecRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.specRow}>
      <Ionicons name={icon} size={18} color={colors.primary} />
      <Text style={styles.specLabel}>{label}</Text>
      <Text style={styles.specValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.xl, paddingBottom: spacing.xxxl },
  startWrap: {
    padding: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
  },
  startIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  startSub: {
    ...typography.bodySecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  specCard: { alignSelf: 'stretch' },
  specRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  specLabel: { flex: 1, ...typography.bodySecondary },
  specValue: { fontSize: 14, fontWeight: '700', color: colors.text },
  sep: { height: 1, backgroundColor: colors.divider, marginVertical: spacing.xs },
  notice: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  noticeText: { flex: 1, fontSize: 13, color: colors.text, lineHeight: 19 },
  timer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFECEC',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  timerLow: { backgroundColor: colors.accent },
  timerText: { fontSize: 13, fontWeight: '800', color: colors.accent },
  question: { fontSize: 19, fontWeight: '800', color: colors.text, lineHeight: 27 },
  options: { gap: spacing.md, marginTop: spacing.xl },
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
    backgroundColor: colors.primarySoft,
    borderColor: 'transparent',
  },
  explanationText: { flex: 1, fontSize: 13, color: colors.text, lineHeight: 19 },
  footer: {
    padding: spacing.xl,
    paddingTop: spacing.md,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
