import React, { useEffect, useRef, useState } from 'react';
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
import { colors, radius, spacing } from '../theme';
import { RootStackParamList } from '../navigation/types';
import { ScreenHeader } from '../components/ScreenHeader';
import { ErrorView, LoadingView } from '../components/StateView';
import { useAsync } from '../hooks/useAsync';
import { fetchScenario } from '../services/content';
import { CoachTurn, askCoach } from '../services/coach';
import { playTTS, stopTTS } from '../services/tts';
import { startSpeechRecognition, stopSpeechRecognition } from '../services/stt';
import { useApp } from '../store/AppContext';

type Props = NativeStackScreenProps<RootStackParamList, 'Conversation'>;
type Msg = {
  id: string;
  from: 'me' | 'ai';
  text: string;
  uz?: string;
  feedback?: string;
  words?: string[];
};

let seq = 0;
const nextId = () => `m${++seq}`;

export default function ConversationScreen({ route, navigation }: Props) {
  const { topic, level, topicId } = route.params;
  const { addXp, registerConversation } = useApp();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [listening, setListening] = useState(false);
  const [thinking, setThinking] = useState(false);
  /** Whether the live AI proxy answered at least once this session. */
  const [live, setLive] = useState<'unknown' | 'live' | 'offline'>('unknown');
  const scrollRef = useRef<React.ElementRef<typeof ScrollView>>(null);
  const sendingRef = useRef(false);
  const messagesRef = useRef<Msg[]>([]);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // The scenario (opening line, key phrases, AI role-play prompt) comes from PostgreSQL.
  const scenarioQuery = useAsync(
    () => (topicId ? fetchScenario(topicId) : Promise.resolve(null)),
    [topicId],
  );
  const scenario = scenarioQuery.data ?? null;
  const openingJa = scenario?.opening_line_ja ?? '';
  const openingUz = scenario?.opening_line_uz || scenario?.description_uz || '';
  const openingMsg: Msg | null = openingJa
    ? { id: 'opening', from: 'ai', text: openingJa, uz: openingUz || undefined }
    : null;

  // Play the scenario's opening line once (external system, no state update).
  useEffect(() => {
    if (openingJa) void playTTS(openingJa, 'ja').catch(() => {});
  }, [openingJa]);

  // Stop ongoing TTS audio and STT when unmounting
  useEffect(() => {
    return () => {
      void stopTTS();
      void stopSpeechRecognition();
    };
  }, []);

  // Register the conversation as done when leaving with real dialogue.
  useEffect(
    () => () => {
      if (messagesRef.current.filter((m) => m.from === 'me').length > 0) {
        registerConversation(3);
      }
    },
    [registerConversation],
  );

  const push = (msg: Msg) => {
    setMessages((prev) => [...prev, msg]);
    requestAnimationFrame(() =>
      scrollRef.current?.scrollToEnd({ animated: true }),
    );
  };

  const send = async (text?: string) => {
    const value = (text ?? input).trim();
    if (!value || sendingRef.current) return;
    sendingRef.current = true;

    const mine: Msg = { id: nextId(), from: 'me', text: value };
    push(mine);
    setInput('');
    setThinking(true);

    // Last 12 turns give the coach enough context without bloating the request.
    const turns: CoachTurn[] = openingMsg
      ? [{ role: 'assistant', content: openingMsg.text }]
      : [];
    for (const m of messagesRef.current) {
      turns.push({ role: m.from === 'me' ? 'user' : 'assistant', content: m.text });
    }
    turns.push({ role: 'user', content: value });
    const history = turns
      .filter((t) => t.content.trim().length > 0)
      .slice(-12);

    try {
      const res = await askCoach({
        topic,
        level,
        history,
        contextPrompt: scenario?.context_prompt,
      });
      setLive('live');
      push({
        id: nextId(),
        from: 'ai',
        text: res.reply,
        uz: res.replyUz,
        feedback: res.feedback || undefined,
        words: res.newWords
          .map((w) => [w.word, w.meaning].filter(Boolean).join(' — '))
          .filter((w) => w.length > 0),
      });
      // Speak AI reply via Neural TTS
      void playTTS(res.reply, 'ja').catch(() => {});
    } catch {
      // No scripted fallback: tell the learner the coach is unreachable and
      // let them retry, instead of faking an AI reply.
      setLive('offline');
      push({
        id: nextId(),
        from: 'ai',
        text: 'すみません、いま通信できません。もう一度お願いします。',
        uz: 'Kechirasiz, Kaiwa AI bilan aloqa uzildi. Yana bir marta yuboring.',
      });
    } finally {
      sendingRef.current = false;
      setThinking(false);
      addXp(5);
    }
  };

  const toggleMic = async () => {
    if (listening) {
      setListening(false);
      await stopSpeechRecognition({
        onFinal: (text) => {
          if (text && text.trim()) {
            setInput('');
            void send(text.trim());
          }
        },
        onError: (err) => {
          console.warn('[STT stop error]:', err);
        },
        onEnd: () => {
          setListening(false);
        },
      });
      return;
    }

    // Instant barge-in: stop any playing coach voice
    await stopTTS();
    setListening(true);

    try {
      const started = await startSpeechRecognition({
        onStart: () => {
          setListening(true);
        },
        onPartial: (partial) => {
          // Show partial recognized text in the input bar in real-time
          setInput(partial);
        },
        onFinal: (finalText) => {
          if (finalText && finalText.trim()) {
            setInput('');
            setListening(false);
            void send(finalText.trim());
          }
        },
        onError: (err) => {
          console.warn('[STT Error]:', err);
          setListening(false);
        },
        onEnd: () => {
          setListening(false);
        },
      }, 'ja-JP');

      if (!started) {
        setListening(false);
      }
    } catch (err) {
      console.warn('[STT start failed]:', err);
      setListening(false);
    }
  };

  if (topicId && scenarioQuery.loading) {
    return (
      <View style={styles.container}>
        <LoadingView label="Suhbat yuklanmoqda…" />
      </View>
    );
  }

  if (topicId && scenarioQuery.error) {
    return (
      <View style={styles.container}>
        <ErrorView message={scenarioQuery.error} onRetry={scenarioQuery.reload} />
      </View>
    );
  }

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
          <View style={styles.headerRight}>
            <View style={[styles.statusPill, live === 'offline' && styles.statusPillOffline]}>
              <View
                style={[
                  styles.statusDot,
                  live === 'offline' && { backgroundColor: colors.textMuted },
                ]}
              />
              <Text
                style={[styles.statusText, live === 'offline' && { color: colors.textMuted }]}
              >
                {live === 'live' ? 'Jonli' : live === 'offline' ? 'Oflayn' : 'AI'}
              </Text>
            </View>
            <View style={styles.scorePill}>
              <Ionicons name="sparkles" size={14} color={colors.primary} />
              <Text style={styles.scoreText}>+5 XP</Text>
            </View>
          </View>
        }
      />

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.messages}
        showsVerticalScrollIndicator={false}
      >
        {[...(openingMsg ? [openingMsg] : []), ...messages].map((m) => (
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
              <View style={styles.bubbleTopRow}>
                <Text
                  style={[
                    styles.bubbleText,
                    m.from === 'me' && styles.bubbleTextMe,
                  ]}
                >
                  {m.text}
                </Text>
                {m.from === 'ai' ? (
                  <Pressable
                    onPress={() => {
                      void playTTS(m.text, 'ja');
                    }}
                    hitSlop={8}
                    style={styles.speakerBtn}
                  >
                    <Ionicons name="volume-medium-outline" size={16} color={colors.primary} />
                  </Pressable>
                ) : null}
              </View>
              {m.uz ? <Text style={styles.bubbleUz}>{m.uz}</Text> : null}
              {m.feedback ? (
                <View style={styles.feedbackRow}>
                  <Ionicons name="bulb-outline" size={13} color={colors.warning} />
                  <Text style={styles.feedbackText}>{m.feedback}</Text>
                </View>
              ) : null}
              {m.words && m.words.length > 0 ? (
                <View style={styles.wordsRow}>
                  {m.words.map((w) => (
                    <View key={w} style={styles.wordChip}>
                      <Text style={styles.wordChipText}>{w}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
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

      {scenario?.key_phrases && scenario.key_phrases.length > 0 ? (
        <View style={styles.phrasesBar}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.phrasesScroll}
          >
            {scenario.key_phrases.map((phrase, idx) => (
              <Pressable
                key={idx}
                style={styles.phraseChip}
                onPress={() => {
                  setInput((prev) => (prev ? `${prev} ${phrase}` : phrase));
                }}
              >
                <Text style={styles.phraseChipText}>💬 {phrase}</Text>
              </Pressable>
            ))}
          </ScrollView>
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
          onSubmitEditing={() => {
            void send();
          }}
          returnKeyType="send"
        />
        <Pressable
          onPress={() => {
            void send();
          }}
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
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: `${colors.success}1f`,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  statusPillOffline: { backgroundColor: colors.divider },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success },
  statusText: { fontSize: 11, fontWeight: '700', color: colors.success },
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
  bubbleTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  speakerBtn: {
    padding: 2,
    marginLeft: 4,
  },
  bubbleText: { fontSize: 15, color: colors.text, lineHeight: 21 },
  bubbleTextMe: { color: colors.white, fontWeight: '600' },
  bubbleUz: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 6,
    fontStyle: 'italic',
  },
  feedbackRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 5,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  feedbackText: { flex: 1, fontSize: 12, color: colors.textSecondary, lineHeight: 17 },
  wordsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: spacing.sm,
  },
  wordChip: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
  },
  wordChipText: { fontSize: 11, fontWeight: '600', color: colors.primary },
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
  phrasesBar: {
    paddingVertical: spacing.xs,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  phrasesScroll: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    paddingVertical: 2,
  },
  phraseChip: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: `${colors.primary}22`,
  },
  phraseChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
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
