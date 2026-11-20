import { encodeSpeechWav } from '../lib/speech-audio';

export type MicrophoneCapture = { stop: () => Promise<ArrayBuffer>; cancel: () => void };

/** Browser fallback uses Azure too, so recognition does not depend on Google Web Speech. */
export async function openMicrophone(): Promise<MicrophoneCapture> {
  if (!globalThis.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
    throw new Error('Mikrofon uchun HTTPS yoki localhost manzilidan foydalaning.');
  }
  if (typeof MediaRecorder === 'undefined') {
    throw new Error('Bu brauzerda ovoz yozish qo‘llanmaydi. Chrome yoki Safari orqali oching.');
  }
  const stream = await navigator.mediaDevices.getUserMedia({ audio: {
    channelCount: 1, echoCancellation: true, noiseSuppression: true,
  } });
  try {
    const recorder = new MediaRecorder(stream);
    const chunks: Blob[] = [];
    const release = () => stream.getTracks().forEach((track) => track.stop());
    const stopped = new Promise<Blob>((resolve, reject) => {
      recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
      recorder.onerror = () => { release(); reject(new Error('Ovoz yozishda xatolik yuz berdi.')); };
      recorder.onstop = () => { release(); resolve(new Blob(chunks, { type: recorder.mimeType })); };
    });
    // Cancellation may happen without anyone awaiting the recording.
    void stopped.catch(() => undefined);
    recorder.start(250);
    return {
      cancel() { if (recorder.state !== 'inactive') recorder.stop(); release(); },
      async stop() {
        if (recorder.state !== 'inactive') recorder.stop();
        const blob = await stopped;
        if (!blob.size) throw new Error('Ovoz yozilmadi. Qayta urinib ko‘ring.');
        const context = new AudioContext();
        try {
          const audio = await context.decodeAudioData(await blob.arrayBuffer());
          const mono = new Float32Array(audio.length);
          for (let channel = 0; channel < audio.numberOfChannels; channel++) {
            const values = audio.getChannelData(channel);
            for (let i = 0; i < mono.length; i++) mono[i] += values[i] / audio.numberOfChannels;
          }
          return encodeSpeechWav(mono, audio.sampleRate);
        } finally { await context.close(); }
      },
    };
  } catch (error) {
    stream.getTracks().forEach((track) => track.stop());
    throw error;
  }
}
