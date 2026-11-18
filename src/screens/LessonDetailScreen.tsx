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
import { ErrorView, LoadingView } from '../components/StateView';
import { useAsync } from '../hooks/useAsync';
import { fetchLesson } from '../services/content';
import { playTTS } from '../services/tts';
import { useApp } from '../store/AppContext';

type Props = NativeStackScreenProps<RootStackParamList, 'LessonDetail'>;

type Section = 'vocab' | 'grammar' | 'phrases';

export default function LessonDetailScreen({ route, navigation }: Props) {
  const { lessonId, title, level } = route.params;
  const { addXp, learnWord, saveLessonScore } = useApp();
  const [section, setSection] = useState<Section>('vocab');
  const [learned, setLearned] = useState<string[]>([]);

  const lessonQuery = useAsync(() => fetchLesson(lessonId), [lessonId]);
  const lesson = lessonQuery.data;
  const vocab = lesson?.content.vocab ?? [];
  const grammar = lesson?.content.grammar ?? [];
  const phrases = lesson?.content.phrases ?? [];

  const total = vocab.length + grammar.length + phrases.length;
  const done = learned.length;

  const toggleLearned = (key: string) => {
    if (learned.includes(key)) return;
    const nextDone = done + 1;
    setLearned((prev) => [...prev, key]);
    addXp(2);
    // Only vocabulary items count toward "words learned".
    if (key.startsWith('v')) learnWord();
    // Persist lesson progress so Home/Learn reflect the real percentage.
    saveLessonScore(lessonId, {
      progress: total ? Math.min(1, nextDone / total) : 0,
      isCompleted: total > 0 && nextDone >= total,
      score: null,
    });
  };

  if (lessonQuery.loading) {
    return (
      <View style={styles.container}>
        <LoadingView label="Dars yuklanmoqda…" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={lesson?.title ?? title}
        subtitle={`${lesson?.level ?? level} · Dars materiallari`}
        onBack={() => navigation.goBack()}
        right={
          <View style={styles.xpPill}>
            <Ionicons name="flash" size={13} color={colors.warning} />
            <Text style={styles.xpText}>+{done * 2}</Text>
          </View>
        }
      />

      <View style={styles.progressWrap}>
        <View style={styles.progressHead}>
          <Text style={styles.progressLabel}>O'rganildi</Text>
          <Text style={styles.progressValue}>
            {done} / {total}
          </Text>
        </View>
        <ProgressBar progress={total ? done / total : 0} />
      </View>

      {/* Section tabs */}
      <View style={styles.tabs}>
        {(
          [
            { id: 'vocab', label: "So'zlar", icon: 'text' },
            { id: 'grammar', label: 'Grammatika', icon: 'code-slash' },
            { id: 'phrases', label: 'Iboralar', icon: 'chatbubble-ellipses' },
          ] as const
        ).map((t) => (
          <Pressable
            key={t.id}
            onPress={() => setSection(t.id)}
            style={[styles.tab, section === t.id && styles.tabActive]}
          >
            <Ionicons
              name={t.icon as never}
              size={15}
              color={section === t.id ? colors.white : colors.textSecondary}
            />
            <Text
              style={[styles.tabText, section === t.id && styles.tabTextActive]}
            >
              {t.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {section === 'vocab' ? (
          <View style={styles.list}>
            {vocab.map((v, i) => {
              const key = `v${i}`;
              const isLearned = learned.includes(key);
              return (
                <Pressable key={key} onPress={() => toggleLearned(key)}>
                  <Card style={[styles.row, isLearned && styles.rowLearned]}>
                    <Pressable
                      hitSlop={8}
                      onPress={(e) => {
                        e.stopPropagation();
                        void playTTS(v.ja, 'ja');
                      }}
                      style={styles.speaker}
                    >
                      <Ionicons name="volume-medium" size={18} color={colors.primary} />
                    </Pressable>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.ja}>{v.ja}</Text>
                      <Text style={styles.romaji}>{v.romaji}</Text>
                      <Text style={styles.uz}>{v.uz}</Text>
                    </View>
                    <View
                      style={[
                        styles.check,
                        isLearned && { backgroundColor: colors.success },
                      ]}
                    >
                      <Ionicons
                        name={isLearned ? 'checkmark' : 'add'}
                        size={16}
                        color={isLearned ? colors.white : colors.textMuted}
                      />
                    </View>
                  </Card>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {section === 'grammar' ? (
          <View style={styles.list}>
            {grammar.map((g, i) => {
              const key = `g${i}`;
              const isLearned = learned.includes(key);
              return (
                <Pressable key={key} onPress={() => toggleLearned(key)}>
                  <Card style={[styles.row, isLearned && styles.rowLearned]}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pattern}>{g.pattern}</Text>
                      <Text style={styles.meaning}>{g.meaning}</Text>
                      {g.example ? (
                        <Pressable
                          hitSlop={8}
                          onPress={(e) => {
                            e.stopPropagation();
                            void playTTS(g.example || '', 'ja');
                          }}
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}
                        >
                          <Ionicons name="volume-medium" size={14} color={colors.primary} />
                          <Text style={styles.example}>{g.example}</Text>
                        </Pressable>
                      ) : null}
                    </View>
                    <View
                      style={[
                        styles.check,
                        isLearned && { backgroundColor: colors.success },
                      ]}
                    >
                      <Ionicons
                        name={isLearned ? 'checkmark' : 'add'}
                        size={16}
                        color={isLearned ? colors.white : colors.textMuted}
                      />
                    </View>
                  </Card>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {section === 'phrases' ? (
          <View style={styles.list}>
            {phrases.map((p, i) => {
              const key = `p${i}`;
              const isLearned = learned.includes(key);
              return (
                <Pressable key={key} onPress={() => toggleLearned(key)}>
                  <Card style={[styles.row, isLearned && styles.rowLearned]}>
                    <Pressable
                      hitSlop={8}
                      onPress={(e) => {
                        e.stopPropagation();
                        void playTTS(p.ja, 'ja');
                      }}
                      style={styles.speaker}
                    >
                      <Ionicons name="volume-medium" size={18} color={colors.primary} />
                    </Pressable>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.jaSm}>{p.ja}</Text>
                      <Text style={styles.uz}>{p.uz}</Text>
                    </View>
                    <View
                      style={[
                        styles.check,
                        isLearned && { backgroundColor: colors.success },
                      ]}
                    >
                      <Ionicons
                        name={isLearned ? 'checkmark' : 'add'}
                        size={16}
                        color={isLearned ? colors.white : colors.textMuted}
                      />
                    </View>
                  </Card>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        <PrimaryButton
          title="Testni boshlash"
          onPress={() =>
            navigation.navigate('LessonQuiz', {
              lessonId,
              title,
              level,
            })
          }
          style={{ marginTop: spacing.xl }}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  xpPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.warningLight,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  xpText: { fontSize: 13, fontWeight: '800', color: colors.text },
  progressWrap: { paddingHorizontal: spacing.xl, marginBottom: spacing.md },
  progressHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  progressLabel: { ...typography.caption },
  progressValue: { ...typography.caption, color: colors.primary, fontWeight: '700' },
  tabs: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
  tabTextActive: { color: colors.white },
  scroll: { padding: spacing.xl, paddingTop: 0, paddingBottom: spacing.xxxl },
  list: { gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rowLearned: { borderColor: colors.success, backgroundColor: colors.successLight },
  ja: { fontSize: 22, fontWeight: '800', color: colors.text },
  jaSm: { fontSize: 17, fontWeight: '700', color: colors.text },
  romaji: { fontSize: 13, color: colors.primary, fontWeight: '600', marginTop: 2 },
  uz: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
  pattern: { fontSize: 18, fontWeight: '800', color: colors.primary },
  meaning: { fontSize: 14, color: colors.text, marginTop: 3, fontWeight: '600' },
  example: { fontSize: 13, color: colors.textSecondary, marginTop: 4, fontStyle: 'italic' },
  speaker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
