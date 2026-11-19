import { supabase, supabaseAnonKey } from '../lib/supabase';

/**
 * Live AI conversation through the kaiwa.live serverless proxy.
 *
 * The mobile app never holds provider secrets — it calls `/api/coach`
 * (Azure OpenAI) with the user's Supabase JWT and falls back to
 * `/api/deepseek` when the primary provider is unavailable.
 */

export const API_BASE = (process.env.EXPO_PUBLIC_API_BASE ?? 'https://kaiwa.live').replace(
  /\/+$/,
  '',
);

export type CoachTurn = { role: 'user' | 'assistant'; content: string };

export type CoachWord = { word: string; reading?: string; meaning?: string };

export type CoachReply = {
  reply: string;
  replyUz?: string;
  feedback?: string;
  newWords: CoachWord[];
};

export class CoachError extends Error {
  /** Human readable, already localized for the UI. */
  readonly userMessage: string;

  constructor(message: string, userMessage: string) {
    super(message);
    this.name = 'CoachError';
    this.userMessage = userMessage;
  }
}

const TIMEOUT_MS = 20000;

function buildSystemPrompt(topic: string, level: string, contextPrompt?: string): string {
  if (contextPrompt && contextPrompt.trim().length > 0) {
    return [
      contextPrompt.trim(),
      '',
      'CRITICAL JSON OUTPUT FORMAT RULES:',
      '- "reply" contains ONLY the in-character Japanese response (1-2 short sentences).',
      '- Never put corrections, explanations, scenario instructions or Uzbek inside "reply".',
      '- End "reply" with one simple question to keep the conversation going.',
      `- Match JLPT ${level} grammar and vocabulary; avoid excessively complex kanji for beginners.`,
      '- "reply_uz" is a natural Uzbek translation of "reply" only.',
      '- Write ALL Uzbek text (reply_uz, feedback, new_words.meaning) in Latin script (oʻzbek lotin alifbosi). Never use Cyrillic.',
      '- "feedback" is a short Uzbek correction (1 sentence) ONLY if the learner actually made a grammatical/vocabulary mistake; otherwise exactly "".',
      '- "new_words" holds up to 2 words that literally appear in "reply", with kana reading and Latin-script Uzbek meaning.',
      '- Return STRICT JSON only, no markdown, no code fences, with the shape:',
      '{"reply":"<japanese>","reply_uz":"<uzbek translation>","feedback":"<uzbek correction or empty string>","new_words":[{"word":"<japanese>","reading":"<kana>","meaning":"<uzbek>"}]}',
    ].join('\n');
  }

  return [
    'You are Kaiwa AI, a friendly Japanese conversation partner inside the kaiwa.live mobile app.',
    `Role-play scenario: "${topic}". Learner level: JLPT ${level}.`,
    'Rules:',
    '- "reply" contains ONLY the in-character Japanese response (1-2 short sentences).',
    '- Never put corrections, explanations or Uzbek inside "reply".',
    '- End "reply" with one simple question to keep the conversation going.',
    `- Match JLPT ${level} grammar and vocabulary; avoid rare kanji for beginners.`,
    '- "reply_uz" is a natural Uzbek translation of "reply" only.',
    '- Write ALL Uzbek text (reply_uz, feedback, new_words.meaning) in Latin script (oʻzbek lotin alifbosi). Never use Cyrillic.',
    '- "feedback" is a short Uzbek correction (1 sentence) only when the learner actually made a mistake; empty string otherwise.',
    '- "new_words" holds up to 2 words that literally appear in "reply", with kana reading and Latin-script Uzbek meaning.',
    '- Return STRICT JSON only, no markdown, no code fences, with the shape:',
    '{"reply":"<japanese>","reply_uz":"<uzbek translation>","feedback":"<uzbek correction or empty string>","new_words":[{"word":"<japanese>","reading":"<kana>","meaning":"<uzbek>"}]}',
  ].join('\n');
}

/** Tolerant JSON parse: strips code fences and grabs the outermost object. */
function parseJsonObject(raw: string): Record<string, unknown> | null {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/, '')
    .trim();
  try {
    const parsed = JSON.parse(cleaned);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>;
      } catch {
        return null;
      }
    }
    return null;
  }
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token ?? supabaseAnonKey;
  return {
    'Content-Type': 'application/json',
    apikey: supabaseAnonKey,
    Authorization: `Bearer ${token}`,
  };
}

/** POST to one proxy endpoint and return the assistant message content. */
async function callProxy(
  path: '/api/coach' | '/api/deepseek',
  topic: string,
  level: string,
  history: CoachTurn[],
  contextPrompt?: string,
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify({
        messages: [
          { role: 'system', content: buildSystemPrompt(topic, level, contextPrompt) },
          ...history,
        ],
        stream: false,
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new CoachError(
        `${path} HTTP ${res.status}: ${text.slice(0, 200)}`,
        res.status === 429
          ? 'Biroz kutib, qayta urinib koʻring'
          : 'Kaiwa AI bilan aloqa uzildi',
      );
    }

    const payload = (await res.json()) as {
      choices?: { message?: { content?: unknown } }[];
    };
    const content = payload.choices?.[0]?.message?.content;
    if (typeof content === 'string' && content.trim()) return content;
    if (content && typeof content === 'object') return JSON.stringify(content);
    throw new CoachError(`${path}: empty completion`, 'Kaiwa AI javob bermadi');
  } catch (error) {
    if (error instanceof CoachError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new CoachError('timeout', 'Kaiwa AI sekin javob berdi');
    }
    throw new CoachError(
      error instanceof Error ? error.message : 'network error',
      'Internet aloqasi yoʻq',
    );
  } finally {
    clearTimeout(timer);
  }
}

function toCoachReply(content: string): CoachReply {
  const parsed = parseJsonObject(content);
  if (!parsed) {
    // Some models answer with plain text — still usable as the reply.
    return { reply: content.trim(), newWords: [] };
  }

  const reply = typeof parsed.reply === 'string' ? parsed.reply.trim() : '';
  if (!reply) return { reply: content.trim(), newWords: [] };

  const words = Array.isArray(parsed.new_words) ? parsed.new_words : [];
  const newWords: CoachWord[] = words
    .filter((w): w is Record<string, unknown> => !!w && typeof w === 'object')
    .map((w) => ({
      word: typeof w.word === 'string' ? w.word : '',
      reading: typeof w.reading === 'string' ? w.reading : undefined,
      meaning: typeof w.meaning === 'string' ? w.meaning : undefined,
    }))
    .filter((w) => w.word.length > 0)
    .slice(0, 3);

  return {
    reply,
    replyUz: typeof parsed.reply_uz === 'string' ? parsed.reply_uz.trim() : undefined,
    feedback: typeof parsed.feedback === 'string' ? parsed.feedback.trim() : undefined,
    newWords,
  };
}

/**
 * Ask the live AI coach for the next turn.
 * Tries `/api/coach`, then `/api/deepseek`, then throws `CoachError`
 * (the caller falls back to the scripted replies stored in PostgreSQL).
 */
export async function askCoach(params: {
  topic: string;
  level: string;
  history: CoachTurn[];
  contextPrompt?: string;
}): Promise<CoachReply> {
  const { topic, level, history, contextPrompt } = params;
  const turns = history.filter((t) => t.content.trim().length > 0).slice(-12);

  let lastError: CoachError | null = null;
  for (const path of ['/api/coach', '/api/deepseek'] as const) {
    try {
      const content = await callProxy(path, topic, level, turns, contextPrompt);
      return toCoachReply(content);
    } catch (error) {
      lastError =
        error instanceof CoachError
          ? error
          : new CoachError('unknown', 'Kaiwa AI bilan aloqa uzildi');
    }
  }

  throw lastError ?? new CoachError('unavailable', 'Kaiwa AI hozircha mavjud emas');
}
