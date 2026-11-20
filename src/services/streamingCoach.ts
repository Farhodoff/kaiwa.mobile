import { supabase, supabaseAnonKey } from '../lib/supabase';
import { API_BASE, askCoach, CoachReply, CoachTurn } from './coach';

export interface StreamingCoachCallbacks {
  /** Called as new text chunks arrive */
  onChunk?: (chunk: string) => void;
  /** Called when a complete Japanese sentence (ends in 。 / ？ / ！ / \n) is formed */
  onSentence?: (sentence: string) => void;
  /** Called when the full response has finished */
  onComplete?: (reply: CoachReply) => void;
  /** Called on error */
  onError?: (error: Error) => void;
}

// Japanese sentence punctuation marks
const SENTENCE_END_REGEX = /([。？！\n])/;

/**
 * Streams the AI Coach response from /api/coach with sentence-level extraction.
 * Enables playing TTS on the very first sentence while the rest of the response is still generating.
 */
export async function streamCoachResponse(
  params: {
    topic: string;
    level: string;
    history: CoachTurn[];
    contextPrompt?: string;
  },
  callbacks: StreamingCoachCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  const { topic, level, history, contextPrompt } = params;

  // If streaming body reader is unavailable, fallback to askCoach
  const fallback = async () => {
    try {
      const reply = await askCoach({ topic, level, history, contextPrompt });
      callbacks.onChunk?.(reply.reply);
      callbacks.onSentence?.(reply.reply);
      callbacks.onComplete?.(reply);
    } catch (err) {
      callbacks.onError?.(err instanceof Error ? err : new Error(String(err)));
    }
  };

  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    const res = await fetch(`${API_BASE}/api/coach`, {
      method: 'POST',
      signal,
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${token || supabaseAnonKey}`,
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content: `You are Kaiwa AI speaking coach for JLPT ${level}. Topic: ${topic}. ${contextPrompt || ''} Speak natural conversational Japanese. Keep answers short (1-2 sentences).`,
          },
          ...history.map((h) => ({ role: h.role, content: h.content })),
        ],
        stream: true,
        max_tokens: 250,
        temperature: 0.7,
      }),
    });

    if (!res.ok || !res.body || typeof (res.body as ReadableStream<Uint8Array>).getReader !== 'function') {
      return await fallback();
    }

    const reader = (res.body as ReadableStream<Uint8Array>).getReader();
    const decoder = new TextDecoder('utf-8');
    let accumulatedText = '';
    let sentenceBuffer = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;
        const jsonStr = trimmed.replace(/^data:\s*/, '');
        if (jsonStr === '[DONE]') break;

        try {
          const parsed = JSON.parse(jsonStr) as {
            choices?: { delta?: { content?: string } }[];
          };
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) {
            accumulatedText += delta;
            sentenceBuffer += delta;
            callbacks.onChunk?.(delta);

            // Check if sentenceBuffer has a sentence boundary
            const parts = sentenceBuffer.split(SENTENCE_END_REGEX);
            if (parts.length > 2) {
              // We have at least one complete sentence: parts[0] + parts[1]
              const completeSentence = (parts[0] + parts[1]).trim();
              if (completeSentence) {
                callbacks.onSentence?.(completeSentence);
              }
              sentenceBuffer = parts.slice(2).join('');
            }
          }
        } catch {
          // ignore non-json SSE lines
        }
      }
    }

    // Flush any remaining text in sentenceBuffer
    const remainingSentence = sentenceBuffer.trim();
    if (remainingSentence) {
      callbacks.onSentence?.(remainingSentence);
    }

    callbacks.onComplete?.({
      reply: accumulatedText.trim(),
      newWords: [],
    });
  } catch {
    if (signal?.aborted) return;
    await fallback();
  }
}
