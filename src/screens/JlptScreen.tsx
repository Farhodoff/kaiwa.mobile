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
import { ErrorView, LoadingView } from '../components/StateView';
import { useAsync } from '../hooks/useAsync';
import { fetchJlptSections } from '../services/content';
import { LEVELS } from '../data/content';
import { useApp } from '../store/AppContext';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Jlpt'>,
  NativeStackScreenProps<RootStackParamList>
>;

export default function JlptScreen({ navigation }: Props) {
  const [level, setLevel] = useState('N3');
  const { jlptDone: progress } = useApp();

  const sectionsQuery = useAsync(() => fetchJlptSections(), []);

  const sections = useMemo(
    () =>
      (sectionsQuery.data ?? []).map((s) => ({
        ...s,
        done: Math.min(s.count, progress[s.id] ?? 0),
      })),
    [sectionsQuery.data, progress],
  );

  const totalDone = sections.reduce((s, x) => s + x.done, 0);
  const total = sections.reduce((s, x) => s + x.count, 0);

  if (sectionsQuery.loading) {
    return (
      <View style={styles.container}>
        <LoadingView label="JLPT boʻlimlari yuklanmoqda…" />
      </View>
    );
  }

  if (sectionsQuery.error) {
    return (
      <View style={styles.container}>
        <ErrorView message={sectionsQuery.error} onRetry={sectionsQuery.reload} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <ScreenHeader brand title="" />

        <View style={styles.head}>
          <Text style={typography.h1}>JLPT</Text>
          <Text style={styles.sub}>Ready for the real exam?</Text>
        </View>

        {/* Level selector */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.levelsScroll}
          contentContainerStyle={styles.levels}
        >
          {LEVELS.map((l) => {
            const active = l.id === level;
            return (
              <Pressable
                key={l.id}
                onPress={() => setLevel(l.id)}
                style={[styles.levelChip, active && styles.levelChipActive]}
              >
                <Text
                  style={[styles.levelChipText, active && styles.levelChipTextActive]}
                >
                  {l.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Success plan hero */}
        <View style={styles.hero}>
          <View style={styles.heroRow}>
            <View>
              <Text style={styles.heroKicker}>JLPT SUCCESS PLAN</Text>
              <Text style={styles.heroTitle}>{level} tayyorgarligi</Text>
            </View>
            <View style={styles.heroRing}>
              <Text style={styles.heroRingText}>
                {Math.round((totalDone / total) * 100)}%
              </Text>
            </View>
          </View>
          <ProgressBar
            progress={totalDone / total}
            color={colors.white}
            trackColor="rgba(255,255,255,0.3)"
            height={8}
          />
          <Text style={styles.heroMeta}>
            {totalDone} / {total} ta savol to'g'ri javob berildi
          </Text>
        </View>

        {/* Sections */}
        <Text style={[typography.h3, styles.sectionTitle]}>Bo'limlar</Text>
        <View style={styles.sections}>
          {sections.map((s) => (
            <Card key={s.id} style={styles.section}>
              <View style={styles.sectionHead}>
                <View
                  style={[styles.sectionDot, { backgroundColor: `${s.color}22` }]}
                >
                  <View
                    style={[styles.sectionDotInner, { backgroundColor: s.color }]}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={typography.title}>{s.title}</Text>
                  <Text style={styles.sectionJa}>{s.titleJa}</Text>
                </View>
                <Text style={styles.sectionCount}>
                  {s.done}/{s.count}
                </Text>
              </View>
              <ProgressBar
                progress={s.done / s.count}
                color={s.color}
                height={6}
              />
            </Card>
          ))}
        </View>

        {/* Exam card */}
        <Card style={styles.exam}>
          <View style={styles.examIcon}>
            <Ionicons name="timer-outline" size={22} color={colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={typography.title}>Mock imtihon</Text>
            <Text style={styles.examMeta}>
              105 daqiqa · 180 savol · {level}
            </Text>
          </View>
          <PrimaryButton
            title="Boshlash"
            small
            onPress={() => navigation.navigate('MockTest', { level })}
          />
        </Card>

        <PrimaryButton
          title="To'liq simulyatsiya"
          variant="secondary"
          onPress={() => navigation.navigate('MockTest', { level })}
          style={{ marginTop: spacing.lg, marginHorizontal: spacing.xl }}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingBottom: spacing.xxxl },
  head: { paddingHorizontal: spacing.xl },
  sub: { ...typography.bodySecondary, marginTop: 4 },
  levelsScroll: {
    // Web (RNW) gives horizontal scrollers flex:1 — pin them to content height.
    flexGrow: 0,
    flexShrink: 0,
  },
  levels: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
    marginTop: spacing.lg,
    paddingBottom: spacing.xs,
  },
  levelChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  levelChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  levelChipText: { fontSize: 14, fontWeight: '700', color: colors.textSecondary },
  levelChipTextActive: { color: colors.white },
  hero: {
    marginHorizontal: spacing.xl,
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    padding: spacing.xl,
    ...shadow.floating,
  },
  heroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  heroKicker: {
    fontSize: 11,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.75)',
    letterSpacing: 1,
    marginBottom: 4,
  },
  heroTitle: { fontSize: 22, fontWeight: '800', color: colors.white },
  heroRing: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroRingText: { color: colors.white, fontWeight: '800', fontSize: 15 },
  heroMeta: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    marginTop: spacing.sm,
    fontWeight: '600',
  },
  sectionTitle: {
    paddingHorizontal: spacing.xl,
    marginTop: spacing.xxl,
    marginBottom: spacing.md,
  },
  sections: { paddingHorizontal: spacing.xl, gap: spacing.md },
  section: {},
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  sectionDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionDotInner: { width: 14, height: 14, borderRadius: 7 },
  sectionJa: { ...typography.caption, marginTop: 2 },
  sectionCount: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
  exam: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.xl,
    marginTop: spacing.xl,
  },
  examIcon: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: '#FFECEC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  examMeta: { ...typography.caption, marginTop: 2 },
});
