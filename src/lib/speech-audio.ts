/** Azure short-audio input: 16 kHz, mono, signed 16-bit little-endian WAV. */
export function encodeSpeechWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
  if (!Number.isFinite(sampleRate) || sampleRate <= 0 || samples.length === 0) {
    throw new Error('Ovoz yozilmadi. Qayta urinib ko‘ring.');
  }
  const count = Math.floor(samples.length * 16000 / sampleRate);
  const buffer = new ArrayBuffer(44 + count * 2);
  const view = new DataView(buffer);
  const text = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i));
  };
  text(0, 'RIFF'); view.setUint32(4, 36 + count * 2, true);
  text(8, 'WAVE'); text(12, 'fmt '); view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, 16000, true); view.setUint32(28, 32000, true);
  view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  text(36, 'data'); view.setUint32(40, count * 2, true);
  for (let i = 0; i < count; i++) {
    // Average the input window when downsampling to avoid simply dropping frames.
    const start = i * sampleRate / 16000;
    const end = Math.min(samples.length, (i + 1) * sampleRate / 16000);
    let sum = 0;
    let weight = 0;
    for (let j = Math.floor(start); j < Math.ceil(end); j++) {
      const overlap = Math.min(end, j + 1) - Math.max(start, j);
      sum += samples[j] * overlap;
      weight += overlap;
    }
    const value = Math.max(-1, Math.min(1, sum / (weight || 1)));
    view.setInt16(44 + i * 2, Math.round(value * (value < 0 ? 32768 : 32767)), true);
  }
  return buffer;
}

export function joinSamples(chunks: Float32Array[]): Float32Array {
  const result = new Float32Array(chunks.reduce((sum, chunk) => sum + chunk.length, 0));
  let offset = 0;
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.length; }
  return result;
}
