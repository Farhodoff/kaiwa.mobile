import { Platform } from 'react-native';
import { Audio } from 'expo-av';
import { fetchSpeechToken } from './speech';

export interface STTListener {
  onStart?: () => void;
  onPartial?: (text: string) => void;
  onFinal?: (text: string) => void;
  onError?: (error: string) => void;
  onEnd?: () => void;
}

let activeRecognition: any = null;
let activeRecording: Audio.Recording | null = null;
let isListeningState = false;

/**
 * Checks if browser has native Web Speech API support (Chrome, Safari, Edge).
 */
export function isWebSpeechSupported(): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
  const win = window as any;
  return Boolean(win.SpeechRecognition || win.webkitSpeechRecognition);
}

/**
 * Start live Japanese speech recognition.
 * Automatically selects Web Speech API (for zero-latency on browser/Safari/Chrome)
 * or expo-av + Azure Neural STT on native mobile.
 */
export async function startSpeechRecognition(
  listener: STTListener,
  language: string = 'ja-JP',
): Promise<boolean> {
  // If already listening, stop previous session first
  if (isListeningState) {
    await stopSpeechRecognition();
  }

  // ================= 1. WEB SPEECH API (BROWSER / PWA / SAFARI / CHROME) =================
  if (isWebSpeechSupported()) {
    try {
      const win = window as any;
      const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();

      recognition.lang = language;
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        isListeningState = true;
        listener.onStart?.();
      };

      recognition.onresult = (event: any) => {
        let partialText = '';
        let finalText = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          const transcript = item[0]?.transcript || '';
          if (item.isFinal) {
            finalText += transcript;
          } else {
            partialText += transcript;
          }
        }

        if (partialText) {
          listener.onPartial?.(partialText);
        }
        if (finalText) {
          listener.onFinal?.(finalText);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('[STT] Web Speech API event error:', event.error);
        if (event.error === 'not-allowed') {
          listener.onError?.('Mikrofon ruxsati berilmadi. Brauzer sozlamalaridan ruxsat bering.');
        } else if (event.error === 'no-speech') {
          // No speech detected — normal timeout
        } else {
          listener.onError?.(`Ovozni tanishda xatolik: ${event.error}`);
        }
      };

      recognition.onend = () => {
        isListeningState = false;
        activeRecognition = null;
        listener.onEnd?.();
      };

      activeRecognition = recognition;
      recognition.start();
      return true;
    } catch (err: any) {
      console.warn('[STT] Failed to start Web Speech API, trying fallback:', err);
    }
  }

  // ================= 2. NATIVE EXPO-AV AUDIO RECORDING + AZURE STT REST =================
  try {
    const perm = await Audio.requestPermissionsAsync();
    if (!perm.granted) {
      listener.onError?.('Mikrofon ruxsati berilmadi. Ilova sozlamalaridan mikrofonni yoqing.');
      return false;
    }

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    const recording = new Audio.Recording();
    await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);

    recording.setOnRecordingStatusUpdate((status) => {
      if (status.isRecording && !status.isDoneRecording) {
        // Can emit recording metering if needed
      }
    });

    await recording.startAsync();
    activeRecording = recording;
    isListeningState = true;
    listener.onStart?.();
    return true;
  } catch (err: any) {
    console.error('[STT] Failed to start recording:', err);
    listener.onError?.('Ovoz yozishni boshlashda xatolik yuz berdi.');
    isListeningState = false;
    return false;
  }
}

/**
 * Stop live speech recognition and transcribe if recording audio.
 */
export async function stopSpeechRecognition(
  listener?: STTListener,
  language: string = 'ja-JP',
): Promise<string | null> {
  // If Web Speech API was active:
  if (activeRecognition) {
    try {
      activeRecognition.stop();
    } catch {
      // ignore
    }
    activeRecognition = null;
    isListeningState = false;
    return null;
  }

  // If expo-av recording was active:
  if (activeRecording) {
    const recording = activeRecording;
    activeRecording = null;
    isListeningState = false;

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      if (!uri) {
        listener?.onEnd?.();
        return null;
      }

      // Fetch Azure STS token
      const { token, region } = await fetchSpeechToken();
      if (!token || !region) {
        throw new Error('Azure Speech token topilmadi');
      }

      // Transcribe via Azure Cognitive Services STT REST API
      const sttUrl = `https://${region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=${language}&format=detailed`;

      const audioResponse = await fetch(uri);
      const audioBlob = await audioResponse.blob();

      const sttResponse = await fetch(sttUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'audio/wav',
          Accept: 'application/json',
        },
        body: audioBlob,
      });

      if (!sttResponse.ok) {
        throw new Error(`Azure STT HTTP ${sttResponse.status}`);
      }

      const result = (await sttResponse.json()) as {
        RecognitionStatus: string;
        DisplayText?: string;
        NBest?: { Display: string; Confidence: number }[];
      };

      const recognizedText =
        result.DisplayText || result.NBest?.[0]?.Display || '';

      if (recognizedText && recognizedText.trim()) {
        const cleanText = recognizedText.trim();
        listener?.onFinal?.(cleanText);
        listener?.onEnd?.();
        return cleanText;
      }
    } catch (err: any) {
      console.warn('[STT] Azure recognition fallback note:', err);
      listener?.onError?.('Yaponcha nutqni aniqlab boʻlmadi.');
    } finally {
      listener?.onEnd?.();
    }
  }

  isListeningState = false;
  return null;
}

/**
 * Checks if speech recognition is currently listening.
 */
export function isRecognizing(): boolean {
  return isListeningState;
}
