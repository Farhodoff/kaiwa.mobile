import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CompositeScreenProps } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, shadow, spacing, typography } from '../theme';
import { MainTabParamList, RootStackParamList } from '../navigation/types';
import { Card } from '../components/Card';
import { ScreenHeader } from '../components/ScreenHeader';
import { ErrorView, LoadingView } from '../components/StateView';
import { useAsync } from '../hooks/useAsync';
import { fetchConversationTopics } from '../services/content';
import { useApp } from '../store/AppContext';
import { MobileScenario } from '../data/scenarios';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Speak'>,
  NativeStackScreenProps<RootStackParamList>
>;

const LEVELS = ['all', 'N5', 'N4', 'N3', 'N2', 'N1'] as const;

export default function SpeakScreen({ navigation }: Props) {
  const { conversationsDone } = useApp();
  const [selectedLevel, setSelectedLevel] = useState<string>('all');

  const topicsQuery = useAsync(() => fetchConversationTopics(), []);
  const allTopics = topicsQuery.data ?? [];

  const filteredTopics = useMemo(() => {
    if (selectedLevel === 'all') return allTopics;
    return allTopics.filter((t) => t.difficulty.toUpperCase() === selectedLevel.toUpperCase());
  }, [allTopics, selectedLevel]);

  const openTopic = (t: MobileScenario) => {
    navigation.navigate('Conversation', {
      topic: t.title_uz || t.title_ja,
      level: t.difficulty,
      topicId: t.id,
    });
  };

  const startQuickConversation = () => {
    const candidate = filteredTopics[0] || allTopics[0];
    if (candidate) {
      openTopic(candidate);
    } else {
      navigation.navigate('Conversation', {
        topic: 'Erkin suhbat',
        level: 'N5',
      });
    }
  };

  if (topicsQuery.loading) {
    return (
      <View style={styles.container}>
        <LoadingView label="Muloqot ssenariylari yuklanmoqda…" />
      </View>
    );
  }

  if (topicsQuery.error) {
    return (
      <View style={styles.container}>
        <ErrorView message={topicsQuery.error} onRetry={topicsQuery.reload} />
      </View>
    );
  }

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
        <Pressable onPress={startQuickConversation}>
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

        {/* Level filter tabs */}
        <View style={styles.levelFilterWrap}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.levelTabs}
          >
            {LEVELS.map((lvl) => {
              const active = selectedLevel === lvl;
              return (
                <Pressable
                  key={lvl}
                  onPress={() => setSelectedLevel(lvl)}
                  style={[styles.levelTab, active && styles.levelTabActive]}
                >
                  <Text style={[styles.levelTabText, active && styles.levelTabTextActive]}>
                    {lvl === 'all' ? 'Barchasi' : `JLPT ${lvl}`}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Scenario Header */}
        <View style={styles.sectionHeadRow}>
          <Text style={typography.h3}>Mavzular</Text>
          <Text style={styles.scenarioCount}>{filteredTopics.length} ta ssenariy</Text>
        </View>

        {/* Scenarios list */}
        <View style={styles.topics}>
          {filteredTopics.length === 0 ? (
            <Card>
              <Text style={styles.emptyText}>Bu darajada ssenariy topilmadi</Text>
            </Card>
          ) : null}

          {filteredTopics.map((t) => {
            const isEasy = t.difficulty === 'N5' || t.difficulty === 'N4';
            return (
              <Pressable
                key={t.id}
                style={styles.topicCard}
                onPress={() => openTopic(t)}
              >
                <View style={styles.topicHeader}>
                  <View style={styles.emojiCircle}>
                    <Text style={styles.emojiText}>{t.emoji || '💬'}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.topicTitle}>{t.title_uz || t.title_ja}</Text>
                    <Text style={styles.topicJa}>{t.title_ja}</Text>
                  </View>
                  <View
                    style={[
                      styles.difficultyBadge,
                      { backgroundColor: isEasy ? `${colors.success}18` : `${colors.primary}18` },
                    ]}
                  >
                    <Text
                      style={[
                        styles.difficultyText,
                        { color: isEasy ? colors.success : colors.primary },
                      ]}
                    >
                      {t.difficulty}
                    </Text>
                  </View>
                </View>

                {t.description_uz ? (
                  <Text style={styles.topicDesc} numberOfLines={2}>
                    {t.description_uz}
                  </Text>
                ) : null}

                {t.key_phrases && t.key_phrases.length > 0 ? (
                  <View style={styles.phrasesRow}>
                    {t.key_phrases.slice(0, 3).map((kp, idx) => (
                      <View key={idx} style={styles.phrasePill}>
                        <Text style={styles.phrasePillText}>{kp}</Text>
                      </View>
                    ))}
                    {t.key_phrases.length > 3 ? (
                      <Text style={styles.phraseMoreText}>+{t.key_phrases.length - 3}</Text>
                    ) : null}
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>

        {/* Session summary */}
        <View style={styles.sectionHeadRow}>
          <Text style={typography.h3}>Suhbat statistikasi</Text>
        </View>
        <Card style={{ marginHorizontal: spacing.xl, marginBottom: spacing.xxl }}>
          <View style={styles.historyRow}>
            <View style={[styles.historyDot, { backgroundColor: `${colors.success}22` }]}>
              <Ionicons name="chatbubbles" size={18} color={colors.success} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={typography.title}>Bajarilgan suhbatlar</Text>
              <Text style={styles.historyMeta}>Kaiwa AI bilan jonli nutq mashqi</Text>
            </View>
            <Text style={[styles.historyScore, { color: colors.success }]}>
              {conversationsDone} ta
            </Text>
          </View>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingBottom: spacing.xxl },
  head: { paddingHorizontal: spacing.xl, marginTop: spacing.md, marginBottom: spacing.lg },
  sub: { ...typography.bodySecondary, marginTop: 4 },
  hero: {
    marginHorizontal: spacing.xl,
    backgroundColor: colors.primary,
    borderRadius: radius.xxl,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    ...shadow.floating,
  },
  pulseRing: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  pulseRing2: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  micCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.white,
    marginTop: spacing.md,
  },
  heroSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
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
  levelFilterWrap: {
    marginTop: spacing.lg,
  },
  levelTabs: {
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  levelTab: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  levelTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  levelTabText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  levelTabTextActive: {
    color: colors.white,
  },
  sectionHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  scenarioCount: {
    ...typography.caption,
    fontWeight: '600',
  },
  topics: {
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  topicCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: spacing.lg,
    ...shadow.card,
  },
  topicHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  emojiCircle: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiText: {
    fontSize: 24,
  },
  topicTitle: {
    ...typography.title,
    fontSize: 15,
  },
  topicJa: {
    ...typography.caption,
    marginTop: 2,
    color: colors.textSecondary,
  },
  difficultyBadge: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  difficultyText: {
    fontSize: 11,
    fontWeight: '800',
  },
  topicDesc: {
    ...typography.bodySecondary,
    fontSize: 12,
    marginTop: spacing.sm,
    lineHeight: 17,
  },
  phrasesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  phrasePill: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  phrasePillText: {
    fontSize: 11,
    color: colors.text,
    fontWeight: '600',
  },
  phraseMoreText: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '600',
  },
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
  historyScore: { fontSize: 16, fontWeight: '800' },
  emptyText: { ...typography.bodySecondary, textAlign: 'center', padding: spacing.lg },
});
