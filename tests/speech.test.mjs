import assert from 'node:assert/strict';
import { test } from 'node:test';
import { encodeSpeechWav, joinSamples } from '../src/lib/speech-audio.ts';
import { createSpeechRecognition } from '../src/lib/speech-recognition.ts';

test('speech output has a real 16 kHz mono PCM WAV header and clips sample values', () => {
  const wav = encodeSpeechWav(new Float32Array([-2, -1, 0, 1, 2]), 16000);
  const view = new DataView(wav);
  const tag = (offset, size) => new TextDecoder().decode(new Uint8Array(wav, offset, size));
  assert.equal(tag(0, 4), 'RIFF');
  assert.equal(tag(8, 4), 'WAVE');
  assert.equal(view.getUint32(4, true), wav.byteLength - 8);
  assert.equal(view.getUint16(20, true), 1);
  assert.equal(view.getUint16(22, true), 1);
  assert.equal(view.getUint32(24, true), 16000);
  assert.equal(view.getUint32(28, true), 32000);
  assert.equal(view.getUint16(34, true), 16);
  assert.equal(view.getUint32(40, true), 10);
  assert.deepEqual(Array.from({ length: 5 }, (_, i) => view.getInt16(44 + i * 2, true)), [-32768, -32768, 0, 32767, 32767]);
});

test('hardware 48 kHz input is resampled to exactly one second of 16 kHz audio', () => {
  const samples = new Float32Array(48000).fill(0.5);
  const wav = encodeSpeechWav(samples, 48000);
  assert.equal(wav.byteLength, 44 + 32000);
  assert.equal(new DataView(wav).getInt16(44, true), 16384);
});

test('empty recordings are rejected and native chunks preserve sample order', () => {
  assert.throws(() => encodeSpeechWav(new Float32Array(), 16000));
  assert.throws(() => encodeSpeechWav(new Float32Array([1]), 0));
  assert.deepEqual([...joinSamples([new Float32Array([1, 2]), new Float32Array([3])])], [1, 2, 3]);
});

function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

function fixture(overrides = {}) {
  const events = [];
  let uploads = 0;
  let releases = 0;
  const capture = { async stop() { return new ArrayBuffer(46); }, cancel() { releases++; } };
  const recognition = createSpeechRecognition({
    async openMicrophone() { return capture; },
    async transcribe(_wav, language) { uploads++; assert.equal(language, 'ja-JP'); return 'こんにちは'; },
    ...overrides,
  });
  const listener = {
    onStart() { events.push('start'); }, onProcessing() { events.push('processing'); },
    onFinal(text) { events.push(text); }, onError(error) { events.push(error); },
    onEnd() { events.push('end'); },
  };
  return { recognition, listener, capture, events, get uploads() { return uploads; }, get releases() { return releases; } };
}

test('double stop uploads once and submits exactly one final transcription', async () => {
  const f = fixture();
  assert.equal(await f.recognition.startSpeechRecognition(f.listener), true);
  const results = await Promise.all([f.recognition.stopSpeechRecognition(), f.recognition.stopSpeechRecognition()]);
  assert.deepEqual(results, ['こんにちは', 'こんにちは']);
  assert.equal(f.uploads, 1);
  assert.deepEqual(f.events, ['start', 'processing', 'こんにちは', 'end']);
});

test('leaving while the permission dialog is open cancels the late microphone without uploading', async () => {
  const gate = deferred();
  const f = fixture({ openMicrophone: () => gate.promise });
  const starting = f.recognition.startSpeechRecognition(f.listener);
  f.recognition.cancelSpeechRecognition();
  gate.resolve(f.capture);
  assert.equal(await starting, false);
  assert.equal(f.releases, 1);
  assert.equal(f.uploads, 0);
  assert.deepEqual(f.events, ['end']);
});

test('background cancellation aborts recognition and ignores a late service response', async () => {
  const gate = deferred();
  let signal;
  const f = fixture({ async transcribe(_wav, _language, requestSignal) { signal = requestSignal; return gate.promise; } });
  await f.recognition.startSpeechRecognition(f.listener);
  const stopping = f.recognition.stopSpeechRecognition();
  await Promise.resolve();
  f.recognition.cancelSpeechRecognition();
  assert.equal(signal.aborted, true);
  gate.resolve('must not submit');
  assert.equal(await stopping, null);
  assert.deepEqual(f.events, ['start', 'processing', 'end']);
});

test('denied microphone permission is visible and leaves recognition idle', async () => {
  const f = fixture({ async openMicrophone() { throw new DOMException('Denied', 'NotAllowedError'); } });
  assert.equal(await f.recognition.startSpeechRecognition(f.listener), false);
  assert.match(f.events[0], /Mikrofon ruxsati berilmadi/);
  assert.equal(f.events[1], 'end');
  assert.equal(await f.recognition.stopSpeechRecognition(), null);
});

test('unrecognized speech reports the service error and permits the next recording', async () => {
  const f = fixture({ async transcribe() { throw new Error('Nutq aniqlanmadi'); } });
  await f.recognition.startSpeechRecognition(f.listener);
  assert.equal(await f.recognition.stopSpeechRecognition(), null);
  assert.deepEqual(f.events, ['start', 'processing', 'Nutq aniqlanmadi', 'end']);
  assert.equal(await f.recognition.startSpeechRecognition(f.listener), true);
  f.recognition.cancelSpeechRecognition();
});
