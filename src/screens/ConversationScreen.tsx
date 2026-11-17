import React, { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../theme';
import { RootStackParamList } from '../navigation/types';
import { ScreenHeader } from '../components/ScreenHeader';
import { AI_REPLIES } from '../data/content';
import { useApp } from '../store/AppContext';

type Props = NativeStackScreenProps<RootStackParamList, 'Conversation'>;
type Msg = { id: string; from: 'me' | 'ai'; text: string; uz?: string };

let seq = 0;
const nextId = () => `m${++seq}`;

export default function ConversationScreen({ route, navigation }: Props) {
  const { topic, level } = route.params;
  const { addXp } = useApp();
  const [messages, setMessages] = useState<Msg[]>([
    {
      id: nextId(),
      from: 'ai',
      text: 'いらっしゃいませ！今日は何にしますか？',
      uz: 'Xush kelibsiz! Bugun nima olmoqchisiz?',
    },
  ]);
  const [input, setInput] = useState('');
  const [listening, setListening] = useState(false);
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<React.ElementRef<typeof ScrollView>>(null);
  const replyIndex = useRef(1);

  const push = (msg: Msg) => {
    setMessages((prev) => [...prev, msg]);
    requestAnimationFrame(() =>
      scrollRef.current?.scrollToEnd({ animated: true }),
    );
  };

  const send = (text?: string) => {
    const value = (text ?? input).trim();
    if (!value) return;
    push({ id: nextId(), from: 'me', text: value });
    setInput('');
    setThinking(true);

    const reply = AI_REPLIES[replyIndex.current % AI_REPLIES.length];
    replyIndex.current += 1;

    setTimeout(() => {
      setThinking(false);
      push({ id: nextId(), from: 'ai', text: reply.ja, uz: reply.uz });
      addXp(5);
    }, 900);
  };

  const toggleMic = () => {
    setListening((v) => !v);
    if (!listening) {
      // Simulate speech recognition result after a moment.
      setTimeout(() => {
        setListening(false);
        send('これをください。');
      }, 1400);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScreenHeader
        title={topic}
        subtitle={`${level} · Kaiwa AI`}
        onBack={() => navigation.goBack()}
        right={
          <View style={styles.scorePill}>
            <Ionicons name="sparkles" size={14} color={colors.primary} />
            <Text style={styles.scoreText}>+5 XP</Text>
          </View>
        }
      />

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.messages}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((m) => (
          <View
            key={m.id}
            style={[
              styles.bubbleRow,
              m.from === 'me' ? styles.rowMe : styles.rowAi,
            ]}
          >
            {m.from === 'ai' ? (
              <View style={styles.aiAvatar}>
                <Ionicons name="sparkles" size={14} color={colors.white} />
              </View>
            ) : null}
            <View
              style={[
                styles.bubble,
                m.from === 'me' ? styles.bubbleMe : styles.bubbleAi,
              ]}
            >
              <Text
                style={[
                  styles.bubbleText,
                  m.from === 'me' && styles.bubbleTextMe,
                ]}
              >
                {m.text}
              </Text>
              {m.uz ? <Text style={styles.bubbleUz}>{m.uz}</Text> : null}
            </View>
          </View>
        ))}

        {thinking ? (
          <View style={[styles.bubbleRow, styles.rowAi]}>
            <View style={styles.aiAvatar}>
              <Ionicons name="sparkles" size={14} color={colors.white} />
            </View>
            <View style={[styles.bubble, styles.bubbleAi]}>
              <Text style={styles.typing}>• • •</Text>
            </View>
          </View>
        ) : null}
      </ScrollView>

      {listening ? (
        <View style={styles.listening}>
          <View style={styles.listeningBars}>
            {[10, 20, 28, 16, 24].map((h, i) => (
              <View key={i} style={[styles.bar, { height: h }]} />
            ))}
          </View>
          <Text style={styles.listeningText}>Eshitilmoqda…</Text>
        </View>
      ) : null}

      <View style={styles.inputBar}>
        <Pressable
          onPress={toggleMic}
          style={[styles.micBtn, listening && styles.micBtnActive]}
        >
          <Ionicons
            name={listening ? 'stop' : 'mic'}
            size={22}
            color={colors.white}
          />
        </Pressable>
        <TextInput
          style={styles.input}
          placeholder="Yapon tilida yozing…"
          placeholderTextColor={colors.textMuted}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={() => send()}
          returnKeyType="send"
        />
        <Pressable
          onPress={() => send()}
          style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]}
          disabled={!input.trim()}
        >
          <Ionicons name="arrow-up" size={20} color={colors.white} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scorePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  scoreText: { fontSize: 12, fontWeight: '700', color: colors.primary },
  messages: { padding: spacing.lg, paddingBottom: spacing.xl, gap: spacing.md },
  bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  rowMe: { justifyContent: 'flex-end' },
  rowAi: { justifyContent: 'flex-start' },
  aiAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
  },
  bubbleAi: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderBottomLeftRadius: 6,
  },
  bubbleMe: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    borderBottomRightRadius: 6,
  },
  bubbleText: { fontSize: 15, color: colors.text, lineHeight: 21 },
  bubbleTextMe: { color: colors.white, fontWeight: '600' },
  bubbleUz: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 6,
    fontStyle: 'italic',
  },
  typing: { color: colors.textMuted, fontWeight: '800', letterSpacing: 2 },
  listening: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  listeningBars: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  bar: { width: 4, borderRadius: 2, backgroundColor: colors.primary },
  listeningText: { fontSize: 13, fontWeight: '600', color: colors.primary },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  micBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micBtnActive: { backgroundColor: colors.accent },
  input: {
    flex: 1,
    height: 46,
    backgroundColor: colors.bg,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    fontSize: 15,
    color: colors.text,
  },
  sendBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: colors.textMuted, opacity: 0.5 },
});
