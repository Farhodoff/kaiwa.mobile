import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CompositeScreenProps } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, shadow, spacing, typography } from '../theme';
import { MainTabParamList, RootStackParamList } from '../navigation/types';
import { ProgressBar } from '../components/ProgressBar';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { ErrorView, LoadingView } from '../components/StateView';
import { useAsync } from '../hooks/useAsync';
import { fetchFlashcards } from '../services/content';
import { playTTS } from '../services/tts';
import { REAL_DECKS } from '../data/decks';
import { useApp } from '../store/AppContext';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Cards'>,
  NativeStackScreenProps<RootStackParamList>
>;

type Grade = 'yana' | 'qiyin' | 'yaxshi' | 'oson';

const GRADE_XP: Record<Grade, number> = { yana: 1, qiyin: 3, yaxshi: 3, oson: 3 };

export default function CardsScreen({ navigation }: Props) {
  const { reviewedToday, markCardReviewed, addXp } = useApp();
  const [selectedDeckId, setSelectedDeckId] = useState<string>(REAL_DECKS[0].id);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [sessionDone, setSessionDone] = useState(false);

  const cardsQuery = useAsync(() => fetchFlashcards(selectedDeckId), [selectedDeckId]);
  const cards = cardsQuery.data ?? [];
  const card = cards[index];

  const currentDeck = useMemo(
    () => REAL_DECKS.find((d) => d.id === selectedDeckId) || REAL_DECKS[0],
    [selectedDeckId],
  );

  const progress = useMemo(
    () => (cards.length ? index / cards.length : 0),
    [index, cards.length],
  );

  const selectDeck = (deckId: string) => {
    setSelectedDeckId(deckId);
    setIndex(0);
    setFlipped(false);
    setSessionDone(false);
  };

  const handleSpeak = (text: string) => {
    void playTTS(text, 'ja');
  };

  const grade = (g: Grade) => {
    if (!card) return;
    markCardReviewed(card.id);
    addXp(GRADE_XP[g]);
    setFlipped(false);

    if (index + 1 >= cards.length) {
      setSessionDone(true);
    } else {
      setIndex((i) => i + 1);
    }
  };

  const restart = () => {
    setIndex(0);
    setFlipped(false);
    setSessionDone(false);
  };

  if (cardsQuery.loading) {
    return (
      <View style={styles.container}>
        <LoadingView label="Kartalar yuklanmoqda…" />
      </View>
    );
  }

  if (cardsQuery.error) {
    return (
      <View style={styles.container}>
        <ErrorView message={cardsQuery.error} onRetry={cardsQuery.reload} />
      </View>
    );
  }

  if (cards.length === 0) {
    return (
      <View style={styles.container}>
        <ErrorView message="Hozircha kartalar mavjud emas" onRetry={cardsQuery.reload} />
      </View>
    );
  }

  if (sessionDone) {
    return (
      <View style={styles.container}>
        <ScreenHeader brand title="" />
        <View style={styles.doneWrap}>
          <View style={styles.doneIcon}>
            <Ionicons name="trophy" size={44} color={colors.white} />
          </View>
          <Text style={[typography.h1, { textAlign: 'center' }]}>
            Ajoyib! 🎉
          </Text>
          <Text style={styles.doneSub}>
            "{currentDeck.title}" toʻplamidan {cards.length} ta kartani koʻrib chiqdingiz
          </Text>
          <View style={styles.doneStats}>
            <DoneStat value={`${cards.length * 3}`} label="XP" />
            <DoneStat value={`${reviewedToday}`} label="Kartalar" />
            <DoneStat value="100%" label="Bajarildi" />
          </View>
          <PrimaryButton title="Qaytadan" onPress={restart} style={{ marginTop: spacing.xl }} />
          <PrimaryButton
            title="Bosh sahifa"
            variant="ghost"
            onPress={() => navigation.navigate('Home')}
            style={{ marginTop: spacing.md }}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <ScreenHeader brand title="" />

        <View style={styles.head}>
          <Text style={typography.h1}>Flashcards</Text>
          <Text style={styles.sub}>{currentDeck.description}</Text>
        </View>

        {/* Deck selection selector */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.deckScroll}
          contentContainerStyle={styles.deckList}
        >
          {REAL_DECKS.map((d) => {
            const active = d.id === selectedDeckId;
            return (
              <Pressable
                key={d.id}
                onPress={() => selectDeck(d.id)}
                style={[styles.deckTab, active && styles.deckTabActive]}
              >
                <Text style={[styles.deckTabText, active && styles.deckTabTextActive]}>
                  {d.title.split(' ')[0]} {d.level} ({d.cardCount})
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.progressRow}>
          <Text style={styles.progressText}>
            {index + 1} / {cards.length}
          </Text>
          <Text style={styles.progressXp}>SM-2 Spaced Repetition</Text>
        </View>
        <View style={{ paddingHorizontal: spacing.xl }}>
          <ProgressBar progress={progress} />
        </View>

        {/* Card */}
        <Pressable
          style={styles.cardWrap}
          onPress={() => setFlipped((v) => !v)}
        >
          <View style={[styles.card, flipped && styles.cardBack]}>
            <View style={styles.cardTop}>
              <View style={styles.deckChip}>
                <Ionicons name="albums" size={12} color={colors.primary} />
                <Text style={styles.deckChipText}>
                  {currentDeck.level} · {currentDeck.title}
                </Text>
              </View>
              <Pressable
                hitSlop={10}
                onPress={() => handleSpeak(card.frontJa || card.front)}
                style={styles.audioBtn}
              >
                <Ionicons name="volume-medium" size={22} color={colors.primary} />
              </Pressable>
            </View>

            <View style={styles.cardCenter}>
              {!flipped ? (
                <>
                  <Text style={styles.front}>{card.front}</Text>
                  {card.frontJa && card.frontJa !== card.front ? (
                    <Text style={styles.frontJa}>{card.frontJa}</Text>
                  ) : null}
                </>
              ) : (
                <>
                  <Text style={styles.back}>{card.back}</Text>
                  {card.reading ? (
                    <Text style={styles.reading}>{card.reading}</Text>
                  ) : null}
                  {card.example ? (
                    <Text style={styles.example}>{card.example}</Text>
                  ) : null}
                </>
              )}
            </View>

            <View style={styles.cardFooter}>
              <Ionicons
                name="refresh"
                size={14}
                color={colors.textMuted}
                style={{ transform: [{ rotate: '180deg' }] }}
              />
              <Text style={styles.flipHint}>
                {flipped ? 'Old qismini koʻrish' : 'Tarjima va oʻqilishini koʻrish'}
              </Text>
            </View>
          </View>
        </Pressable>

        {/* Grades */}
        {flipped ? (
          <View style={styles.grades}>
            <GradeBtn label="Yana" sub="< 1 kun" color={colors.accent} onPress={() => grade('yana')} />
            <GradeBtn label="Qiyin" sub="1 kun" color={colors.warning} onPress={() => grade('qiyin')} />
            <GradeBtn label="Yaxshi" sub="3 kun" color={colors.info} onPress={() => grade('yaxshi')} />
            <GradeBtn label="Oson" sub="7 kun" color={colors.success} onPress={() => grade('oson')} />
          </View>
        ) : (
          <PrimaryButton
            title="Javobni koʻrsatish"
            variant="secondary"
            onPress={() => setFlipped(true)}
            style={{ marginHorizontal: spacing.xl, marginTop: spacing.xl }}
          />
        )}

        <Text style={styles.hint}>
          Yaponcha talaffuzni eshitish uchun 🔊 tugmasini bosing
        </Text>
      </ScrollView>
    </View>
  );
}

function DoneStat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.doneStat}>
      <Text style={styles.doneStatValue}>{value}</Text>
      <Text style={styles.doneStatLabel}>{label}</Text>
    </View>
  );
}

function GradeBtn({
  label,
  sub,
  color,
  onPress,
}: {
  label: string;
  sub: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.gradeBtn, { borderColor: color }]} onPress={onPress}>
      <Text style={[styles.gradeLabel, { color }]}>{label}</Text>
      <Text style={styles.gradeSub}>{sub}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingBottom: spacing.xxl },
  head: { paddingHorizontal: spacing.xl, marginTop: spacing.md, marginBottom: spacing.md },
  sub: { ...typography.bodySecondary, marginTop: 4 },
  deckScroll: { marginBottom: spacing.md },
  deckList: { paddingHorizontal: spacing.xl, gap: spacing.sm },
  deckTab: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  deckTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  deckTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  deckTabTextActive: {
    color: colors.white,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  progressText: { fontSize: 13, fontWeight: '700', color: colors.text },
  progressXp: { ...typography.caption, color: colors.primary, fontWeight: '700' },
  cardWrap: {
    paddingHorizontal: spacing.xl,
    marginTop: spacing.lg,
  },
  card: {
    minHeight: 280,
    backgroundColor: colors.card,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    justifyContent: 'space-between',
    ...shadow.card,
  },
  cardBack: {
    borderColor: colors.primaryLight,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  deckChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  deckChipText: { fontSize: 11, fontWeight: '700', color: colors.primary },
  audioBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  front: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  frontJa: {
    fontSize: 18,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  back: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  reading: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  example: {
    ...typography.bodySecondary,
    fontSize: 13,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  flipHint: { ...typography.caption },
  grades: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    marginTop: spacing.xl,
  },
  gradeBtn: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    paddingVertical: spacing.md,
    alignItems: 'center',
    ...shadow.card,
  },
  gradeLabel: { fontSize: 13, fontWeight: '800' },
  gradeSub: { ...typography.caption, fontSize: 10, marginTop: 2 },
  hint: {
    ...typography.caption,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  doneWrap: {
    flex: 1,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    ...shadow.floating,
  },
  doneSub: { ...typography.bodySecondary, textAlign: 'center', marginTop: spacing.xs },
  doneStats: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
    width: '100%',
  },
  doneStat: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  doneStatValue: { fontSize: 18, fontWeight: '800', color: colors.text },
  doneStatLabel: { ...typography.caption, marginTop: 2 },
});
