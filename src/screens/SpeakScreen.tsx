import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CompositeScreenProps } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, shadow, spacing, typography } from '../theme';
import { MainTabParamList, RootStackParamList } from '../navigation/types';
import { Card } from '../components/Card';
import { ScreenHeader } from '../components/ScreenHeader';
import { CONVERSATION_TOPICS } from '../data/content';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Speak'>,
  NativeStackScreenProps<RootStackParamList>
>;

export default function SpeakScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <ScreenHeader brand title="" />

        <View style={styles.head}>
          <Text style={typography.h1}>AI Speaking</Text>
          <Text style={styles.sub}>
            Kaiwa AI bilan yapon tilida jonli suhbat
          </Text>
        </View>

        {/* Big mic hero */}
        <Pressable
          onPress={() =>
            navigation.navigate('Conversation', { topic: 'At the café', level: 'N3' })
          }
        >
          <View style={styles.hero}>
            <View style={styles.pulseRing} />
            <View style={styles.pulseRing2} />
            <View style={styles.micCircle}>
              <Ionicons name="mic" size={44} color={colors.white} />
            </View>
            <Text style={styles.heroTitle}>Tap to speak</Text>
            <Text style={styles.heroSub}>「タップして話す」</Text>
            <View style={styles.livePill}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>Kaiwa AI tayyor</Text>
            </View>
          </View>
        </Pressable>

        {/* Current scenario */}
        <Card style={styles.scenario}>
          <View style={styles.scenarioIcon}>
            <Ionicons name="cafe" size={22} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={typography.title}>At the café</Text>
            <Text style={styles.scenarioMeta}>カフェで · N3 · 5 daqiqa</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </Card>

        <Text style={[typography.h3, styles.sectionTitle]}>Mavzular</Text>
        <View style={styles.topics}>
          {CONVERSATION_TOPICS.map((t) => (
            <Pressable
              key={t.id}
              style={styles.topic}
              onPress={() =>
                navigation.navigate('Conversation', { topic: t.title, level: t.level })
              }
            >
              <View style={styles.topicIcon}>
                <Ionicons
                  name={
                    (t.icon === 'cafe'
                      ? 'cafe-outline'
                      : t.icon === 'cart'
                        ? 'cart-outline'
                        : t.icon === 'airplane'
                          ? 'airplane-outline'
                          : 'briefcase-outline') as never
                  }
                  size={20}
                  color={colors.primary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.topicTitle}>{t.title}</Text>
                <Text style={styles.topicJa}>{t.titleJa}</Text>
              </View>
              <View style={styles.levelChip}>
                <Text style={styles.levelChipText}>{t.level}</Text>
              </View>
            </Pressable>
          ))}
        </View>

        {/* Recent sessions */}
        <Text style={[typography.h3, styles.sectionTitle]}>Oxirgi suhbatlar</Text>
        <Card>
          <HistoryRow
            title="At the café"
            meta="Bugun · 4 daqiqa"
            score="92%"
            color={colors.success}
          />
          <View style={styles.sep} />
          <HistoryRow
            title="Shopping"
            meta="Kecha · 6 daqiqa"
            score="78%"
            color={colors.warning}
          />
          <View style={styles.sep} />
          <HistoryRow
            title="Travel plans"
            meta="2 kun oldin · 8 daqiqa"
            score="85%"
            color={colors.success}
          />
        </Card>
      </ScrollView>
    </View>
  );
}

function HistoryRow({
  title,
  meta,
  score,
  color,
}: {
  title: string;
  meta: string;
  score: string;
  color: string;
}) {
  return (
    <View style={styles.historyRow}>
      <View style={[styles.historyDot, { backgroundColor: `${color}22` }]}>
        <Ionicons name="volume-medium" size={16} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={typography.title}>{title}</Text>
        <Text style={styles.historyMeta}>{meta}</Text>
      </View>
      <Text style={[styles.historyScore, { color }]}>{score}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingBottom: spacing.xxxl },
  head: { paddingHorizontal: spacing.xl },
  sub: { ...typography.bodySecondary, marginTop: 4 },
  hero: {
    marginHorizontal: spacing.xl,
    marginTop: spacing.xl,
    height: 250,
    borderRadius: radius.xl,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...shadow.floating,
  },
  pulseRing: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  pulseRing2: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  micCircle: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.white,
    marginTop: spacing.lg,
  },
  heroSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    marginTop: spacing.md,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#4ADE80',
  },
  liveText: { color: colors.white, fontSize: 12, fontWeight: '600' },
  scenario: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.xl,
    marginTop: spacing.lg,
  },
  scenarioIcon: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scenarioMeta: { ...typography.caption, marginTop: 2 },
  sectionTitle: { paddingHorizontal: spacing.xl, marginTop: spacing.xxl, marginBottom: spacing.md },
  topics: { paddingHorizontal: spacing.xl, gap: spacing.md },
  topic: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadow.card,
  },
  topicIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topicTitle: { ...typography.title },
  topicJa: { ...typography.caption, marginTop: 2 },
  levelChip: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  levelChipText: { fontSize: 12, fontWeight: '700', color: colors.primary },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  historyDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyMeta: { ...typography.caption, marginTop: 2 },
  historyScore: { fontSize: 14, fontWeight: '800' },
  sep: { height: 1, backgroundColor: colors.divider, marginVertical: spacing.sm },
});
