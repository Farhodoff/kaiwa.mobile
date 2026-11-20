import { createSpeechRecognition } from '../lib/speech-recognition';
import { openMicrophone } from './microphone';
import { speechTokenManager } from './speechTokenManager';

export type { STTListener } from '../lib/speech-recognition';

const recognition = createSpeechRecognition({
  openMicrophone,
  async transcribe(wav, language, signal) {
    const { token, region } = await speechTokenManager.getValidToken(signal);
    const response = await fetch(
      `https://${region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=${encodeURIComponent(language)}&format=detailed`,
      {
        method: 'POST', signal,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'audio/wav; codecs=audio/pcm; samplerate=16000',
          Accept: 'application/json',
        },
        body: wav,
      },
    );
    if (!response.ok) throw new Error(`Ovozni tanish xizmati javob bermadi (${response.status}). Qayta urinib ko‘ring.`);
    const result = await response.json() as { RecognitionStatus: string; DisplayText?: string; NBest?: { Display?: string }[] };
    const text = (result.DisplayText || result.NBest?.[0]?.Display || '').trim();
    if (result.RecognitionStatus !== 'Success' || !text) {
      throw new Error('Nutq aniqlanmadi. Mikrofonni bosib, yaponcha gapiring va to‘xtating.');
    }
    return text;
  },
});

export const { startSpeechRecognition, stopSpeechRecognition, cancelSpeechRecognition } = recognition;
