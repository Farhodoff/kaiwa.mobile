import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, shadow, spacing, typography } from '../theme';
import { RootStackParamList } from '../navigation/types';
import { Card } from '../components/Card';
import { ProgressBar } from '../components/ProgressBar';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { useApp } from '../store/AppContext';

type Props = NativeStackScreenProps<RootStackParamList, 'LessonDetail'>;

type Section = 'vocab' | 'grammar' | 'phrases';

const VOCAB = [
  { ja: 'コーヒー', romaji: 'koohii', uz: 'qahva' },
  { ja: 'お願いします', romaji: 'onegai shimasu', uz: 'Iltimos' },
  { ja: '美味しい', romaji: 'oishii', uz: 'mazali' },
  { ja: 'お会計', romaji: 'okaikei', uz: 'hisob' },
  { ja: 'レシート', romaji: 'reshiito', uz: 'chek' },
];

const GRAMMAR = [
  {
    pattern: '〜をください',
    meaning: '…ni bering',
    example: 'コーヒーをください。 — Qahva bering.',
  },
  {
    pattern: '〜ましょう',
    meaning: '…qilaylik',
    example: '飲みましょう。 — Ichamiz.',
  },
  {
    pattern: '〜たいです',
    meaning: '…moqchiman',
    example: '食べたいです — Yemoqchiman',
  },
];

const PHRASES = [
  { ja: 'いらっしゃいませ！', uz: 'Xush kelibsiz!' },
  { ja: '何にしますか？', uz: 'Nima olmoqchisiz?' },
  { ja: '少々お待ちください', uz: 'Biroz kuting' },
  { ja: 'お会計です', uz: 'Hisobingiz' },
];

export default function LessonDetailScreen({ route, navigation }: Props) {
  const { title, level } = route.params;
  const { addXp } = useApp();
  const [section, setSection] = useState<Section>('vocab');
  const [learned, setLearned] = useState<string[]>([]);

  const toggleLearned = (key: string) => {
    setLearned((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key);
      addXp(2);
      return [...prev, key];
    });
  };

  const total = VOCAB.length + GRAMMAR.length + PHRASES.length;
  const done = learned.length;

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={title}
        subtitle={`${level} · Dars materiallari`}
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
            {VOCAB.map((v, i) => {
              const key = `v${i}`;
              const isLearned = learned.includes(key);
              return (
                <Pressable key={key} onPress={() => toggleLearned(key)}>
                  <Card style={[styles.row, isLearned && styles.rowLearned]}>
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
            {GRAMMAR.map((g, i) => {
              const key = `g${i}`;
              const isLearned = learned.includes(key);
              return (
                <Pressable key={key} onPress={() => toggleLearned(key)}>
                  <Card style={[styles.row, isLearned && styles.rowLearned]}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pattern}>{g.pattern}</Text>
                      <Text style={styles.meaning}>{g.meaning}</Text>
                      <Text style={styles.example}>{g.example}</Text>
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
            {PHRASES.map((p, i) => {
              const key = `p${i}`;
              const isLearned = learned.includes(key);
              return (
                <Pressable key={key} onPress={() => toggleLearned(key)}>
                  <Card style={[styles.row, isLearned && styles.rowLearned]}>
                    <View style={styles.speaker}>
                      <Ionicons name="volume-medium" size={18} color={colors.primary} />
                    </View>
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
              lessonId: 'current',
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
