import { playTTS, stopTTS } from './tts';

export interface AudioQueueItem {
  id: string;
  text: string;
  lang?: 'ja' | 'en' | 'uz';
}

/**
 * Audio playback queue for sentence-by-sentence TTS.
 * Ensures gapless playback of AI responses while fetching the next sentence in the background.
 * Supports instant Barge-in (stopping all current and pending audio).
 */
export class AudioQueue {
  private queue: AudioQueueItem[] = [];
  private isPlaying = false;
  private currentItem: AudioQueueItem | null = null;
  private abortController: AbortController | null = null;
  private onQueueEmpty?: () => void;
  private onSentenceStart?: (item: AudioQueueItem) => void;

  constructor(options: {
    onQueueEmpty?: () => void;
    onSentenceStart?: (item: AudioQueueItem) => void;
  } = {}) {
    this.onQueueEmpty = options.onQueueEmpty;
    this.onSentenceStart = options.onSentenceStart;
  }

  /**
   * Enqueue a sentence to be spoken. Starts playback if queue is idle.
   */
  enqueue(text: string, lang: 'ja' | 'en' | 'uz' = 'ja'): void {
    const trimmed = text.trim();
    if (!trimmed) return;

    const item: AudioQueueItem = {
      id: `audio_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      text: trimmed,
      lang,
    };

    this.queue.push(item);

    if (!this.isPlaying) {
      void this.playNext();
    }
  }

  private async playNext(): Promise<void> {
    if (this.queue.length === 0) {
      this.isPlaying = false;
      this.currentItem = null;
      this.onQueueEmpty?.();
      return;
    }

    this.isPlaying = true;
    const item = this.queue.shift()!;
    this.currentItem = item;
    this.onSentenceStart?.(item);

    try {
      await playTTS(item.text, item.lang ?? 'ja');
    } catch {
      // If a sentence fails or is interrupted, continue or stop
    }

    if (this.isPlaying) {
      void this.playNext();
    }
  }

  /**
   * Barge-in: Stop currently playing audio and cancel all remaining sentences in queue.
   */
  async stop(): Promise<void> {
    this.isPlaying = false;
    this.queue = [];
    this.currentItem = null;
    await stopTTS();
  }

  get active(): boolean {
    return this.isPlaying;
  }
}
