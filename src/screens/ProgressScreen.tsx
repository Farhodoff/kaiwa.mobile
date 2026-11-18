import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../theme';
import { RootStackParamList } from '../navigation/types';
import { Card } from '../components/Card';
import { ProgressBar } from '../components/ProgressBar';
import { ScreenHeader } from '../components/ScreenHeader';
import { lastDays } from '../lib/dates';
import { useApp } from '../store/AppContext';

type Props = NativeStackScreenProps<RootStackParamList, 'Progress'>;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export default function ProgressScreen({ navigation }: Props) {
  const {
    xp,
    streak,
    wordsLearned,
    level,
    levelProgress,
    reviewedToday,
    conversationsDone,
    lessonsDone,
    activity,
    lessonProgress,
  } = useApp();

  // Last 7 days of XP, normalized against the best day.
  const week = useMemo(() => {
    const byDay = new Map(activity.map((a) => [a.day, a.xp]));
    const days = lastDays(7).map(({ key, label }) => ({
      d: label,
      v: byDay.get(key) ?? 0,
    }));
    const max = Math.max(1, ...days.map((d) => d.v));
    return days.map((d) => ({ d: d.d, v: d.v === 0 ? 0 : Math.max(0.12, d.v / max) }));
  }, [activity]);

  // Skills derived from real progress instead of hardcoded percentages.
  const scores = Object.values(lessonProgress)
    .map((p) => Number(p.score ?? 0))
    .filter((s) => s > 0);
  const avgQuiz = scores.length
    ? scores.reduce((s, v) => s + v, 0) / scores.length / 100
    : 0;

  const skills = useMemo(
    () => [
      {
        label: "So'zlar",
        value: clamp01(wordsLearned / 200),
        color: colors.primary,
        icon: 'text',
      },
      {
        label: 'Grammatika',
        value: clamp01(avgQuiz),
        color: colors.info,
        icon: 'code-slash',
      },
      {
        label: "O'qish",
        value: clamp01(lessonsDone / 50),
        color: colors.warning,
        icon: 'book',
      },
      {
        label: 'Tinglash',
        value: clamp01(reviewedToday / 20),
        color: colors.success,
        icon: 'headset',
      },
      {
        label: 'Gapirish',
        value: clamp01(conversationsDone / 10),
        color: colors.accent,
        icon: 'mic',
      },
    ],
    [wordsLearned, avgQuiz, lessonsDone, reviewedToday, conversationsDone],
  );

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <ScreenHeader
          title="Progress"
          subtitle="Natijalaringizni kuzating"
          onBack={() => navigation.goBack()}
        />

        {/* Overview */}
        <View style={styles.statsRow}>
          <Stat icon="flash" value={`${xp}`} label="Jami XP" color={colors.warning} bg={colors.warningLight} />
          <Stat icon="flame" value={`${streak}`} label="Streak" color={colors.accent} bg="#FFECEC" />
          <Stat icon="albums" value={`${wordsLearned}`} label="So'zlar" color={colors.success} bg={colors.successLight} />
        </View>

        {/* Weekly chart */}
        <Card style={{ marginTop: spacing.lg }}>
          <View style={styles.cardHead}>
            <Text style={typography.title}>Haftalik faollik</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Bu hafta</Text>
            </View>
          </View>
          <View style={styles.chart}>
            {week.map((m, i) => (
              <View key={i} style={styles.barCol}>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: `${Math.round(m.v * 100)}%`,
                        backgroundColor:
                          m.v >= 0.9 ? colors.primary : colors.primaryLight,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.barLabel}>{m.d}</Text>
              </View>
            ))}
          </View>
        </Card>

        {/* Level progress */}
        <Card style={{ marginTop: spacing.lg }}>
          <View style={styles.cardHead}>
            <Text style={typography.title}>{level} darajasi</Text>
            <Text style={styles.pct}>{Math.round(levelProgress * 100)}%</Text>
          </View>
          <ProgressBar progress={levelProgress} height={10} />
          <View style={styles.levelRow}>
            <Text style={styles.levelChip}>{level}</Text>
            <Ionicons name="arrow-forward" size={16} color={colors.textMuted} />
            <Text style={[styles.levelChip, styles.levelChipNext]}>N2</Text>
            <Text style={styles.levelHint}>42 ta dars qoldi</Text>
          </View>
        </Card>

        {/* Skills */}
        <Text style={[typography.h3, styles.sectionTitle]}>Ko'nikmalar</Text>
        <Card>
          {skills.map((s, i) => (
            <View key={s.label}>
              <View style={styles.skillRow}>
                <View style={[styles.skillIcon, { backgroundColor: `${s.color}1F` }]}>
                  <Ionicons name={s.icon as never} size={16} color={s.color} />
                </View>
                <Text style={styles.skillLabel}>{s.label}</Text>
                <Text style={[styles.skillPct, { color: s.color }]}>
                  {Math.round(s.value * 100)}%
                </Text>
              </View>
              <ProgressBar progress={s.value} color={s.color} height={6} />
              {i < skills.length - 1 ? <View style={styles.skillGap} /> : null}
            </View>
          ))}
        </Card>

        {/* Achievements */}
        <Text style={[typography.h3, styles.sectionTitle]}>Yutuqlar</Text>
        <View style={styles.achvRow}>
          <Achv icon="flame" label={`${streak} kun`} active={streak >= 3} />
          <Achv icon="mic" label="Suhbat" active={conversationsDone >= 1} />
          <Achv icon="book" label="50 dars" active={lessonsDone >= 50} />
          <Achv icon="trophy" label={level} active={levelProgress >= 1} />
        </View>

        {/* Review summary */}
        <Card style={{ marginTop: spacing.lg }}>
          <View style={styles.reviewRow}>
            <View style={styles.reviewIcon}>
              <Ionicons name="albums" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={typography.title}>Bugungi takrorlash</Text>
              <Text style={styles.reviewMeta}>
                {reviewedToday} ta karta ko'rib chiqildi
              </Text>
            </View>
            <ProgressBar
              progress={Math.min(1, reviewedToday / 20)}
              color={colors.primary}
              height={6}
            />
          </View>
        </Card>
      </ScrollView>
    </View>
  );
}

function Stat({
  icon,
  value,
  label,
  color,
  bg,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
  color: string;
  bg: string;
}) {
  return (
    <Card style={styles.stat}>
      <View style={[styles.statIcon, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Card>
  );
}

function Achv({
  icon,
  label,
  active,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  active?: boolean;
}) {
  return (
    <View style={styles.achv}>
      <View style={[styles.achvCircle, !active && styles.achvCircleLocked]}>
        <Ionicons
          name={icon}
          size={22}
          color={active ? colors.white : colors.textMuted}
        />
      </View>
      <Text style={[styles.achvLabel, !active && { color: colors.textMuted }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingBottom: spacing.xxxl },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  stat: { flex: 1, alignItems: 'center', paddingVertical: spacing.lg },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  statValue: { fontSize: 20, fontWeight: '800', color: colors.text },
  statLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  cardHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  badge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  badgeText: { fontSize: 11, fontWeight: '700', color: colors.primary },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 130,
  },
  barCol: { alignItems: 'center', flex: 1, gap: 6 },
  barTrack: {
    width: 22,
    height: 110,
    backgroundColor: colors.divider,
    borderRadius: radius.pill,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  bar: { width: '100%', borderRadius: radius.pill },
  barLabel: { fontSize: 11, fontWeight: '600', color: colors.textSecondary },
  pct: { fontSize: 15, fontWeight: '800', color: colors.primary },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  levelChip: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  levelChipNext: { color: colors.textSecondary, backgroundColor: colors.divider },
  levelHint: { ...typography.caption, marginLeft: 'auto' },
  sectionTitle: {
    paddingHorizontal: spacing.xl,
    marginTop: spacing.xxl,
    marginBottom: spacing.md,
  },
  skillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  skillIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skillLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text },
  skillPct: { fontSize: 13, fontWeight: '800' },
  skillGap: { height: spacing.md },
  achvRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
  },
  achv: { alignItems: 'center', gap: 6, flex: 1 },
  achvCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  achvCircleLocked: { backgroundColor: colors.divider },
  achvLabel: { fontSize: 11, fontWeight: '600', color: colors.text },
  reviewRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  reviewIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewMeta: { ...typography.caption, marginTop: 2 },
});
