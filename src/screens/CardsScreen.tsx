import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CompositeScreenProps } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, shadow, spacing, typography } from '../theme';
import { MainTabParamList, RootStackParamList } from '../navigation/types';
import { Card } from '../components/Card';
import { ProgressBar } from '../components/ProgressBar';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { FLASHCARDS } from '../data/content';
import { useApp } from '../store/AppContext';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Cards'>,
  NativeStackScreenProps<RootStackParamList>
>;

type Grade = 'yana' | 'qiyin' | 'yaxshi' | 'oson';

export default function CardsScreen({ navigation }: Props) {
  const { reviewedCards, markCardReviewed, addXp } = useApp();
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [sessionDone, setSessionDone] = useState(false);

  const card = FLASHCARDS[index];
  const progress = useMemo(
    () => (FLASHCARDS.length ? index / FLASHCARDS.length : 0),
    [index],
  );

  const grade = (g: Grade) => {
    if (!card) return;
    markCardReviewed(card.id);
    addXp(g === 'yana' ? 1 : 3);
    setFlipped(false);

    if (index + 1 >= FLASHCARDS.length) {
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
            {FLASHCARDS.length} ta kartani ko'rib chiqdingiz
          </Text>
          <View style={styles.doneStats}>
            <DoneStat value={`${FLASHCARDS.length * 3}`} label="XP" />
            <DoneStat value={`${reviewedCards.length}`} label="Kartalar" />
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
          <Text style={styles.sub}>Make every word stick</Text>
        </View>

        <View style={styles.progressRow}>
          <Text style={styles.progressText}>
            {index + 1} / {FLASHCARDS.length}
          </Text>
          <Text style={styles.progressXp}>SM-2 rejim</Text>
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
                <Text style={styles.deckChipText}>N3 · So'zlar</Text>
              </View>
              <Pressable hitSlop={10} onPress={() => {}}>
                <Ionicons name="star-outline" size={22} color={colors.textMuted} />
              </Pressable>
            </View>

            <View style={styles.cardCenter}>
              {!flipped ? (
                <>
                  <Text style={styles.front}>{card.front}</Text>
                  {card.frontJa ? (
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
                {flipped ? 'Oldini ko\'rish' : 'Joyini ko\'rish uchun bosing'}
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
            title="Javobni ko'rsatish"
            variant="secondary"
            onPress={() => setFlipped(true)}
            style={{ marginHorizontal: spacing.xl, marginTop: spacing.xl }}
          />
        )}

        <Text style={styles.hint}>
          Kartani {"o'ngga/songa"} siljiting yoki bosing
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
    <Pressable style={[styles.grade, { borderColor: `${color}55` }]} onPress={onPress}>
      <Text style={[styles.gradeLabel, { color }]}>{label}</Text>
      <Text style={styles.gradeSub}>{sub}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingBottom: spacing.xxxl },
  head: { paddingHorizontal: spacing.xl },
  sub: { ...typography.bodySecondary, marginTop: 4 },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  progressText: { fontSize: 13, fontWeight: '700', color: colors.text },
  progressXp: { fontSize: 13, fontWeight: '600', color: colors.primary },
  cardWrap: { paddingHorizontal: spacing.xl, marginTop: spacing.xl },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    minHeight: 300,
    justifyContent: 'space-between',
    ...shadow.card,
  },
  cardBack: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deckChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  deckChipText: { fontSize: 11, fontWeight: '700', color: colors.primary },
  cardCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  front: { fontSize: 56, fontWeight: '800', color: colors.text, textAlign: 'center' },
  frontJa: { fontSize: 16, color: colors.textSecondary, marginTop: spacing.sm },
  back: { fontSize: 30, fontWeight: '800', color: colors.primary, textAlign: 'center' },
  reading: { fontSize: 15, color: colors.textSecondary, marginTop: spacing.sm },
  example: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.lg,
    textAlign: 'center',
    lineHeight: 21,
    fontStyle: 'italic',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  flipHint: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  grades: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    marginTop: spacing.xl,
  },
  grade: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  gradeLabel: { fontSize: 14, fontWeight: '800' },
  gradeSub: { fontSize: 10, color: colors.textMuted, marginTop: 2 },
  hint: {
    ...typography.caption,
    textAlign: 'center',
    marginTop: spacing.lg,
    color: colors.textMuted,
  },
  doneWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  doneIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  doneSub: { ...typography.bodySecondary, marginTop: spacing.sm, textAlign: 'center' },
  doneStats: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xxl,
  },
  doneStat: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    minWidth: 92,
  },
  doneStatValue: { fontSize: 20, fontWeight: '800', color: colors.primary },
  doneStatLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
});
