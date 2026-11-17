import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CompositeScreenProps } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, shadow, spacing, typography } from '../theme';
import { MainTabParamList, RootStackParamList } from '../navigation/types';
import { Card } from '../components/Card';
import { ProgressBar } from '../components/ProgressBar';
import { ScreenHeader } from '../components/ScreenHeader';
import { LESSONS, USER } from '../data/content';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Learn'>,
  NativeStackScreenProps<RootStackParamList>
>;

const TABS = ['Darslar', 'Yo\'l xaritasi', 'Yutuqlar'] as const;

export default function LearnScreen({ navigation }: Props) {
  const [tab, setTab] = useState<(typeof TABS)[number]>('Darslar');

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <ScreenHeader brand title="" />

        <View style={styles.head}>
          <Text style={typography.h1}>My lessons</Text>
          <Text style={styles.sub}>Beginner II · Lesson 12</Text>
        </View>

        {/* Level summary */}
        <Card style={styles.summary}>
          <View style={styles.summaryLeft}>
            <View style={styles.levelBadge}>
              <Text style={styles.levelBadgeText}>{USER.level}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={typography.title}>Minna no Nihongo I</Text>
              <Text style={styles.summaryMeta}>12 / 48 dars tugallandi</Text>
            </View>
          </View>
          <ProgressBar progress={0.25} />
        </Card>

        {/* Tabs */}
        <View style={styles.tabs}>
          {TABS.map((t) => (
            <Pressable
              key={t}
              onPress={() => setTab(t)}
              style={[styles.tab, tab === t && styles.tabActive]}
            >
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                {t}
              </Text>
            </Pressable>
          ))}
        </View>

        {tab === 'Darslar' ? (
          <View style={styles.lessonList}>
            {LESSONS.map((l) => {
              const locked = l.status === 'locked';
              const current = l.status === 'current';
              return (
                <Pressable
                  key={l.id}
                  disabled={locked}
                  onPress={() =>
                    navigation.navigate('LessonDetail', {
                      lessonId: l.id,
                      title: l.title,
                      level: l.level,
                    })
                  }
                >
                  <Card
                    style={[
                      styles.lesson,
                      current && styles.lessonCurrent,
                      locked && styles.lessonLocked,
                    ]}
                  >
                    <View
                      style={[
                        styles.lessonIcon,
                        l.status === 'done' && { backgroundColor: colors.successLight },
                        current && { backgroundColor: colors.primary },
                        locked && { backgroundColor: colors.divider },
                      ]}
                    >
                      <Ionicons
                        name={
                          l.status === 'done'
                            ? 'checkmark'
                            : locked
                              ? 'lock-closed'
                              : 'play'
                        }
                        size={18}
                        color={
                          l.status === 'done'
                            ? colors.success
                            : current
                              ? colors.white
                              : colors.textMuted
                        }
                      />
                    </View>

                    <View style={{ flex: 1 }}>
                      <View style={styles.lessonTop}>
                        <Text
                          style={[
                            typography.title,
                            locked && { color: colors.textMuted },
                          ]}
                        >
                          {l.title}
                        </Text>
                        <View style={styles.lessonLevel}>
                          <Text style={styles.lessonLevelText}>{l.level}</Text>
                        </View>
                      </View>
                      <Text style={styles.lessonJa}>
                        {l.titleJa} · {l.minutes} daqiqa · +{l.xp} XP
                      </Text>
                      {current ? (
                        <View style={{ marginTop: spacing.sm }}>
                          <ProgressBar progress={l.progress} height={6} />
                        </View>
                      ) : null}
                    </View>

                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color={colors.textMuted}
                    />
                  </Card>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {tab === "Yo'l xaritasi" ? (
          <View style={styles.path}>
            {LESSONS.map((l, i) => {
              const done = l.status === 'done';
              const current = l.status === 'current';
              return (
                <View key={l.id} style={styles.pathRow}>
                  <View style={styles.pathLine}>
                    <View
                      style={[
                        styles.pathNode,
                        done && { backgroundColor: colors.success },
                        current && { backgroundColor: colors.primary },
                      ]}
                    >
                      <Text
                        style={[
                          styles.pathNum,
                          (done || current) && { color: colors.white },
                        ]}
                      >
                        {i + 1}
                      </Text>
                    </View>
                    {i < LESSONS.length - 1 ? (
                      <View
                        style={[
                          styles.pathConnector,
                          done && { backgroundColor: colors.success },
                        ]}
                      />
                    ) : null}
                  </View>
                  <View style={styles.pathBody}>
                    <Text style={[typography.title, l.status === 'locked' && { color: colors.textMuted }]}>
                      {l.title}
                    </Text>
                    <Text style={styles.pathMeta}>
                      {l.titleJa} · {l.level}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        ) : null}

        {tab === 'Yutuqlar' ? (
          <View style={styles.achievements}>
            {[
              { icon: 'flame', title: '12 kunlik streak', desc: 'Barqaror davom eting', earned: true },
              { icon: 'mic', title: 'Birinchi suhbat', desc: 'AI bilan 1 ta suhbat', earned: true },
              { icon: 'book', title: '50 dars', desc: '50 ta darsni tugating', earned: false },
              { icon: 'trophy', title: 'N3 sertifikat', desc: 'N3 imtihonini o\'ting', earned: false },
            ].map((a) => (
              <Card key={a.title} style={styles.achv}>
                <View
                  style={[
                    styles.achvIcon,
                    !a.earned && { backgroundColor: colors.divider },
                  ]}
                >
                  <Ionicons
                    name={a.icon as never}
                    size={22}
                    color={a.earned ? colors.primary : colors.textMuted}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.title, !a.earned && { color: colors.textMuted }]}>
                    {a.title}
                  </Text>
                  <Text style={styles.achvDesc}>{a.desc}</Text>
                </View>
                {a.earned ? (
                  <Ionicons name="checkmark-circle" size={22} color={colors.success} />
                ) : (
                  <Ionicons name="lock-closed" size={18} color={colors.textMuted} />
                )}
              </Card>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingBottom: spacing.xxxl },
  head: { paddingHorizontal: spacing.xl },
  sub: { ...typography.bodySecondary, marginTop: 4 },
  summary: { marginHorizontal: spacing.xl, marginTop: spacing.lg },
  summaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  levelBadge: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelBadgeText: { color: colors.white, fontWeight: '800', fontSize: 16 },
  summaryMeta: { ...typography.caption, marginTop: 2 },
  tabs: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  tab: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  tabTextActive: { color: colors.white },
  lessonList: { paddingHorizontal: spacing.xl, gap: spacing.md },
  lesson: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  lessonCurrent: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  lessonLocked: { opacity: 0.7 },
  lessonIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lessonTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  lessonLevel: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  lessonLevelText: { fontSize: 11, fontWeight: '700', color: colors.primary },
  lessonJa: { ...typography.caption, marginTop: 2 },
  path: { paddingHorizontal: spacing.xl, marginTop: spacing.sm },
  pathRow: { flexDirection: 'row', gap: spacing.lg },
  pathLine: { alignItems: 'center', width: 40 },
  pathNode: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pathNum: { fontWeight: '800', color: colors.textMuted, fontSize: 14 },
  pathConnector: { width: 3, flex: 1, backgroundColor: colors.border, marginVertical: 4 },
  pathBody: { flex: 1, paddingBottom: spacing.xl },
  pathMeta: { ...typography.caption, marginTop: 2 },
  achievements: { paddingHorizontal: spacing.xl, gap: spacing.md },
  achv: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  achvIcon: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  achvDesc: { ...typography.caption, marginTop: 2 },
});
