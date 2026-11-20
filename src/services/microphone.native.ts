import { AudioModule, setAudioModeAsync } from 'expo-audio';
import { encodeSpeechWav, joinSamples } from '../lib/speech-audio';
import type { MicrophoneCapture } from './microphone';

export async function openMicrophone(): Promise<MicrophoneCapture> {
  const permission = await AudioModule.requestRecordingPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Mikrofon ruxsati berilmadi. Telefon sozlamalaridan Kaiwa uchun mikrofonni yoqing.');
  }
  await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true, shouldPlayInBackground: false });
  // The lint resolver follows expo-audio's web stub, which omits this native API.
  // eslint-disable-next-line import/namespace
  const { AudioStream } = AudioModule;
  const stream = new AudioStream({ sampleRate: 16000, channels: 1, encoding: 'int16' });
  const chunks: Float32Array[] = [];
  let sampleRate = 16000;
  const subscription = stream.addListener('audioStreamBuffer', (buffer) => {
    sampleRate = buffer.sampleRate;
    const input = new Int16Array(buffer.data);
    const mono = new Float32Array(Math.floor(input.length / buffer.channels));
    for (let i = 0; i < mono.length; i++) {
      for (let ch = 0; ch < buffer.channels; ch++) {
        mono[i] += input[i * buffer.channels + ch] / 32768 / buffer.channels;
      }
    }
    chunks.push(mono);
  });
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    subscription.remove();
    stream.stop();
    stream.release();
    void setAudioModeAsync({ allowsRecording: false }).catch(() => undefined);
  };
  try { await stream.start(); } catch (error) { release(); throw error; }
  return {
    cancel() { release(); chunks.length = 0; },
    async stop() {
      release();
      const samples = joinSamples(chunks);
      chunks.length = 0;
      return encodeSpeechWav(samples, sampleRate);
    },
  };
}
