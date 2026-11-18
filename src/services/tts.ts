import { Platform } from 'react-native';
import { supabase, supabaseAnonKey } from '../lib/supabase';
import { API_BASE } from './coach';

let currentSound: any = null;
let currentHtmlAudio: any = null;

/**
 * Stop any ongoing TTS audio playback (Barge-in support).
 */
export async function stopTTS(): Promise<void> {
  if (Platform.OS === 'web') {
    if (currentHtmlAudio) {
      currentHtmlAudio.pause();
      currentHtmlAudio.currentTime = 0;
      currentHtmlAudio = null;
    }
    return;
  }

  if (currentSound) {
    try {
      await currentSound.stopAsync();
      await currentSound.unloadAsync();
    } catch {
      /* ignore */
    } finally {
      currentSound = null;
    }
  }
}

/** Convert ArrayBuffer to Base64 in React Native without external dependencies */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  if (typeof btoa === 'function') {
    return btoa(binary);
  }
  return '';
}

/**
 * Play Japanese or Uzbek text via kaiwa.live Neural TTS API.
 */
export async function playTTS(text: string, lang: 'ja' | 'en' | 'uz' = 'ja'): Promise<void> {
  const clean = text.trim();
  if (!clean) return;

  // Stop any currently playing audio first
  await stopTTS();

  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token || supabaseAnonKey;

  const res = await fetch(`${API_BASE}/api/tts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ text: clean, lang }),
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => '');
    throw new Error(`TTS API error (${res.status}): ${errorText.slice(0, 100)}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  const base64Audio = arrayBufferToBase64(arrayBuffer);
  const audioUri = `data:audio/mp3;base64,${base64Audio}`;

  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && (window as any).Audio) {
      return new Promise<void>((resolve, reject) => {
        const audio = new (window as any).Audio(audioUri);
        currentHtmlAudio = audio;
        audio.onended = () => {
          currentHtmlAudio = null;
          resolve();
        };
        audio.onerror = (e: any) => {
          currentHtmlAudio = null;
          reject(e);
        };
        audio.play().catch(reject);
      });
    }
  } else {
    try {
      // Lazy load expo-av for native platforms
      const { Audio } = require('expo-av');
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });

      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUri },
        { shouldPlay: true }
      );
      currentSound = sound;

      sound.setOnPlaybackStatusUpdate((status: any) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync().catch(() => {});
          currentSound = null;
        }
      });
    } catch (nativeErr) {
      console.warn('[playTTS] Native audio playback fallback:', nativeErr);
    }
  }
}
