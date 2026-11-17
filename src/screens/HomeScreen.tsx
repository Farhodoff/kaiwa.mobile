import React from 'react';
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
import { LESSONS, USER } from '../data/content';
import { useApp } from '../store/AppContext';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Home'>,
  NativeStackScreenProps<RootStackParamList>
>;

const WEEK = [
  { d: 'Du', done: true },
  { d: 'Se', done: true },
  { d: 'Ch', done: true },
  { d: 'Pa', done: true },
  { d: 'Ju', done: true },
  { d: 'Sh', done: false },
  { d: 'Ya', done: false },
];

export default function HomeScreen({ navigation }: Props) {
  const { xp, xpGoal, streak, level, levelProgress, dailyGoalDone, dailyGoal } =
    useApp();
  const current = LESSONS.find((l) => l.status === 'current')!;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <ScreenHeader
          brand
          title=""
          right={
            <View style={styles.headerRight}>
              <View style={styles.xpPill}>
                <Ionicons name="flash" size={14} color={colors.warning} />
                <Text style={styles.xpText}>{xp} XP</Text>
              </View>
              <Pressable
                style={styles.iconBtn}
                onPress={() => navigation.navigate('Notifications')}
                hitSlop={8}
              >
                <Ionicons name="notifications-outline" size={20} color={colors.text} />
                <View style={styles.notifDot} />
              </Pressable>
              <Pressable
                style={styles.avatar}
                onPress={() => navigation.navigate('Settings')}
              >
                <Text style={styles.avatarText}>{USER.name[0]}</Text>
              </Pressable>
            </View>
          }
        />

        {/* Greeting */}
        <View style={styles.greeting}>
          <Text style={typography.h1}>{USER.greeting}, {USER.name} 👋</Text>
          <Text style={styles.greetingSub}>
            Bugungi maqsaddan {Math.max(0, dailyGoal - dailyGoalDone)} daqiqa qoldi
          </Text>
        </View>

        {/* Stats row */}
        <Pressable onPress={() => navigation.navigate('Progress')}>
          <View style={styles.statsRow}>
            <Card style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: colors.warningLight }]}>
                <Ionicons name="flame" size={18} color={colors.warning} />
              </View>
              <Text style={styles.statValue}>{streak}</Text>
              <Text style={styles.statLabel}>Kunlik streak</Text>
            </Card>
            <Card style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="trophy" size={18} color={colors.primary} />
              </View>
              <Text style={styles.statValue}>{xp}</Text>
              <Text style={styles.statLabel}>Bugungi XP</Text>
            </Card>
            <Card style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: colors.successLight }]}>
                <Ionicons name="albums" size={18} color={colors.success} />
              </View>
              <Text style={styles.statValue}>{USER.words}</Text>
              <Text style={styles.statLabel}>So'zlar</Text>
            </Card>
          </View>
        </Pressable>

        {/* Continue lesson */}
        <Pressable
          onPress={() =>
            navigation.navigate('LessonDetail', {
              lessonId: current.id,
              title: current.title,
              level: current.level,
            })
          }
        >
          <View style={styles.hero}>
            <View style={styles.heroTop}>
              <View>
                <Text style={styles.heroKicker}>DARSNI DAVOM ETING</Text>
                <Text style={styles.heroTitle}>{current.title}</Text>
                <Text style={styles.heroJa}>
                  {current.titleJa} · {current.level} · {current.minutes} daqiqa
                </Text>
              </View>
              <View style={styles.playBtn}>
                <Ionicons name="play" size={22} color={colors.white} />
              </View>
            </View>
            <View style={styles.heroProgress}>
              <ProgressBar
                progress={current.progress}
                color={colors.white}
                trackColor="rgba(255,255,255,0.3)"
                height={6}
              />
              <Text style={styles.heroProgressText}>
                {Math.round(current.progress * 100)}% tugallandi
              </Text>
            </View>
          </View>
        </Pressable>

        {/* Weekly activity */}
        <Card style={{ marginTop: spacing.lg }}>
          <View style={styles.cardHead}>
            <Text style={typography.title}>Haftalik faollik</Text>
            <Text style={styles.cardHeadRight}>7 kun</Text>
          </View>
          <View style={styles.weekRow}>
            {WEEK.map((w) => (
              <View key={w.d} style={styles.weekItem}>
                <View style={[styles.weekDot, w.done && styles.weekDotDone]}>
                  {w.done ? (
                    <Ionicons name="checkmark" size={12} color={colors.white} />
                  ) : null}
                </View>
                <Text style={styles.weekDay}>{w.d}</Text>
              </View>
            ))}
          </View>
        </Card>

        {/* Level progress */}
        <Card style={{ marginTop: spacing.lg }}>
          <View style={styles.cardHead}>
            <Text style={typography.title}>{level} darajasi</Text>
            <Text style={styles.cardHeadRight}>
              {Math.round(levelProgress * 100)}%
            </Text>
          </View>
          <ProgressBar progress={levelProgress} />
          <Text style={styles.levelHint}>
            N2 ga o'tish uchun yana 42 ta dars qoldi
          </Text>
        </Card>

        {/* Quick actions */}
        <Text style={[typography.h3, styles.sectionTitle]}>Tezkor amallar</Text>
        <View style={styles.actionsRow}>
          <ActionTile
            icon="mic"
            label="AI suhbat"
            color={colors.primary}
            onPress={() => navigation.navigate('Speak')}
          />
          <ActionTile
            icon="book"
            label="Darslar"
            color={colors.info}
            onPress={() => navigation.navigate('Learn')}
          />
          <ActionTile
            icon="albums"
            label="Kartalar"
            color={colors.success}
            onPress={() => navigation.navigate('Cards')}
          />
          <ActionTile
            icon="ribbon"
            label="Mock test"
            color={colors.accent}
            onPress={() => navigation.navigate('MockTest')}
          />
          <ActionTile
            icon="stats-chart"
            label="Progress"
            color={colors.warning}
            onPress={() => navigation.navigate('Progress')}
          />
        </View>

        <PrimaryButton
          title="Sozlamalar"
          variant="secondary"
          onPress={() => navigation.navigate('Settings')}
          style={{ marginTop: spacing.xl }}
        />
      </ScrollView>
    </View>
  );
}

function ActionTile({
  icon,
  label,
  color,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.tile} onPress={onPress}>
      <View style={[styles.tileIcon, { backgroundColor: `${color}1A` }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={styles.tileLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingBottom: spacing.xxxl },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifDot: {
    position: 'absolute',
    top: 8,
    right: 9,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.accent,
    borderWidth: 1.5,
    borderColor: colors.card,
  },
  xpPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.warningLight,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  xpText: { fontSize: 13, fontWeight: '700', color: colors.text },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.white, fontWeight: '800', fontSize: 16 },
  greeting: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm },
  greetingSub: { ...typography.bodySecondary, marginTop: 4 },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    marginTop: spacing.lg,
  },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: spacing.lg },
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
  hero: {
    marginHorizontal: spacing.xl,
    marginTop: spacing.xl,
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    padding: spacing.xl,
    ...shadow.floating,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroKicker: {
    fontSize: 11,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.75)',
    letterSpacing: 1,
    marginBottom: 6,
  },
  heroTitle: { fontSize: 24, fontWeight: '800', color: colors.white },
  heroJa: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
    fontWeight: '500',
  },
  playBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroProgress: { marginTop: spacing.xl },
  heroProgressText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
  },
  cardHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  cardHeadRight: { ...typography.caption, color: colors.primary, fontWeight: '700' },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between' },
  weekItem: { alignItems: 'center', gap: 6 },
  weekDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekDotDone: { backgroundColor: colors.success },
  weekDay: { fontSize: 11, color: colors.textSecondary, fontWeight: '600' },
  levelHint: { ...typography.caption, marginTop: spacing.sm },
  sectionTitle: { paddingHorizontal: spacing.xl, marginTop: spacing.xxl },
  actionsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    marginTop: spacing.md,
    gap: spacing.md,
  },
  tile: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
    ...shadow.card,
  },
  tileIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileLabel: { fontSize: 11, fontWeight: '700', color: colors.text },
});
