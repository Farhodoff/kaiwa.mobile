import { Platform } from 'react-native';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { File, Paths } from 'expo-file-system';
import { supabase, supabaseAnonKey } from '../lib/supabase';
import { API_BASE } from './coach';

let generation = 0;
let request: AbortController | null = null;
let dispose: (() => void) | null = null;

export async function stopTTS(): Promise<void> {
  generation++;
  request?.abort();
  request = null;
  dispose?.();
  dispose = null;
}

/** Resolve on finish or deliberate interruption; report service/playback failures. */
export async function playTTS(text: string, lang: 'ja' | 'en' | 'uz' = 'ja'): Promise<void> {
  if (!text.trim()) return;
  const stopped = stopTTS();
  const current = generation;
  await stopped;
  if (current !== generation) return;
  const controller = new AbortController();
  request = controller;
  const timeout = setTimeout(() => controller.abort(), 20_000);
  let buffer: ArrayBuffer;
  try {
    const { data } = await supabase.auth.getSession();
    const response = await fetch(`${API_BASE}/api/tts`, {
      method: 'POST', signal: controller.signal,
      headers: {
        'Content-Type': 'application/json', apikey: supabaseAnonKey,
        Authorization: `Bearer ${data.session?.access_token || supabaseAnonKey}`,
      },
      body: JSON.stringify({ text: text.trim(), lang }),
    });
    if (!response.ok) throw new Error(`Ovoz xizmatiga ulanib bo‘lmadi (${response.status}).`);
    buffer = await response.arrayBuffer();
    if (!buffer.byteLength) throw new Error('Ovoz xizmati bo‘sh javob qaytardi.');
  } catch (error) {
    if (current !== generation) return;
    if (controller.signal.aborted) throw new Error('Ovozni yuklash vaqti tugadi. Qayta urinib ko‘ring.');
    throw error;
  } finally {
    clearTimeout(timeout);
    if (request === controller) request = null;
  }
  if (current !== generation) return;

  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([buffer], { type: 'audio/mpeg' }));
    const audio = new Audio(url);
    await new Promise<void>((resolve, reject) => {
      let done = false;
      const timer = setTimeout(() => finish(new Error('Ovozni eshittirib bo‘lmadi.')), 60_000);
      const finish = (error?: Error) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        audio.onended = null; audio.onerror = null;
        audio.pause(); audio.removeAttribute('src'); audio.load(); URL.revokeObjectURL(url);
        if (dispose === cancel) dispose = null;
        if (error) reject(error); else resolve();
      };
      const cancel = () => finish();
      dispose = cancel;
      audio.onended = () => finish();
      audio.onerror = () => finish(new Error('Ovozni eshittirib bo‘lmadi. Qayta urinib ko‘ring.'));
      void audio.play().catch(() => finish(new Error('Ovoz bloklandi. Xabar yonidagi ovoz tugmasini bosing.')));
    });
    return;
  }

  await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true, shouldPlayInBackground: false });
  if (current !== generation) return;
  const file = new File(Paths.cache, `kaiwa-voice-${current}.mp3`);
  await file.write(new Uint8Array(buffer));
  if (current !== generation) { if (file.exists) file.delete(); return; }
  try {
    const player = createAudioPlayer(file.uri, { updateInterval: 100 });
    await new Promise<void>((resolve, reject) => {
      let done = false;
      const timer = setTimeout(() => finish(new Error('Ovozni eshittirib bo‘lmadi.')), 60_000);
      const subscription = player.addListener('playbackStatusUpdate', (status) => {
        if (status.didJustFinish) finish();
      });
      const finish = (error?: Error) => {
        if (done) return;
        done = true;
        clearTimeout(timer); subscription.remove(); player.remove();
        if (dispose === cancel) dispose = null;
        if (error) reject(error); else resolve();
      };
      const cancel = () => finish();
      dispose = cancel;
      try { player.play(); } catch { finish(new Error('Ovozni eshittirib bo‘lmadi.')); }
    });
  } finally { if (file.exists) file.delete(); }
}
