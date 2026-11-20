/**
 * Voice Activity Detector (VAD) using Root Mean Square (RMS) energy calculation.
 * Operates on incoming audio sample chunks (Float32Array or Int16Array).
 * Detects speech start, volume levels, and triggers speech end when silence exceeds a threshold.
 */

export interface VADConfig {
  /** RMS threshold to consider samples as speech (0 to 1). Default ~0.02 */
  speechThreshold?: number;
  /** Milliseconds of silence required after speech before triggering onSpeechEnd. Default 650ms */
  silenceDurationMs?: number;
  /** Minimum speech duration in ms before considering it valid speech. Default 250ms */
  minSpeechDurationMs?: number;
  /** Callback fired when speech starts */
  onSpeechStart?: () => void;
  /** Callback fired when speech ends after silenceDurationMs */
  onSpeechEnd?: (durationMs: number) => void;
  /** Callback fired for current audio level (0 to 1) */
  onVolumeChange?: (volume: number) => void;
}

export class VoiceActivityDetector {
  private speechThreshold: number;
  private silenceDurationMs: number;
  private minSpeechDurationMs: number;
  private onSpeechStart?: () => void;
  private onSpeechEnd?: (durationMs: number) => void;
  private onVolumeChange?: (volume: number) => void;

  private isSpeaking = false;
  private speechStartTime = 0;
  private lastSpeechTime = 0;
  private silenceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(config: VADConfig = {}) {
    this.speechThreshold = config.speechThreshold ?? 0.02;
    this.silenceDurationMs = config.silenceDurationMs ?? 650;
    this.minSpeechDurationMs = config.minSpeechDurationMs ?? 250;
    this.onSpeechStart = config.onSpeechStart;
    this.onSpeechEnd = config.onSpeechEnd;
    this.onVolumeChange = config.onVolumeChange;
  }

  /**
   * Process a chunk of Float32 audio samples (range -1.0 to 1.0).
   */
  processSamples(samples: Float32Array): void {
    if (!samples.length) return;

    // Calculate RMS
    let sumSquares = 0;
    for (let i = 0; i < samples.length; i++) {
      sumSquares += samples[i] * samples[i];
    }
    const rms = Math.sqrt(sumSquares / samples.length);

    // Normalize volume for UI meters (clamped 0 to 1)
    const normalizedVolume = Math.min(1, rms * 5);
    this.onVolumeChange?.(normalizedVolume);

    const now = Date.now();

    if (rms >= this.speechThreshold) {
      this.lastSpeechTime = now;

      // Cancel any pending silence trigger
      if (this.silenceTimer) {
        clearTimeout(this.silenceTimer);
        this.silenceTimer = null;
      }

      if (!this.isSpeaking) {
        this.isSpeaking = true;
        this.speechStartTime = now;
        this.onSpeechStart?.();
      }
    } else if (this.isSpeaking) {
      // Audio level is below threshold; start silence countdown if not already running
      if (!this.silenceTimer) {
        const remainingSilence = Math.max(0, this.silenceDurationMs - (now - this.lastSpeechTime));
        this.silenceTimer = setTimeout(() => {
          this.silenceTimer = null;
          if (!this.isSpeaking) return;

          const totalDuration = Date.now() - this.speechStartTime;
          this.isSpeaking = false;

          // Only trigger speech end if speech was long enough (filters coughs/clicks)
          if (totalDuration >= this.minSpeechDurationMs) {
            this.onSpeechEnd?.(totalDuration);
          }
        }, remainingSilence);
      }
    }
  }

  /**
   * Reset VAD state and clear any pending timers.
   */
  reset(): void {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    this.isSpeaking = false;
    this.speechStartTime = 0;
    this.lastSpeechTime = 0;
  }
}
