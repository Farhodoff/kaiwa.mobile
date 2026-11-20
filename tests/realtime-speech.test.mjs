import assert from 'node:assert/strict';
import { test } from 'node:test';
import { VoiceActivityDetector } from '../src/services/vad.ts';

test('VoiceActivityDetector detects speech start when RMS exceeds threshold', () => {
  let speechStarted = false;
  let detectedVolume = 0;

  const vad = new VoiceActivityDetector({
    speechThreshold: 0.05,
    onSpeechStart: () => {
      speechStarted = true;
    },
    onVolumeChange: (vol) => {
      detectedVolume = vol;
    },
  });

  // Silent samples (RMS = 0)
  vad.processSamples(new Float32Array(100).fill(0));
  assert.equal(speechStarted, false);
  assert.equal(detectedVolume, 0);

  // Loud samples (amplitude 0.5 > 0.05)
  vad.processSamples(new Float32Array(100).fill(0.5));
  assert.equal(speechStarted, true);
  assert.ok(detectedVolume > 0);
});

test('VoiceActivityDetector triggers onSpeechEnd after silence duration', async () => {
  let speechEnded = false;
  let duration = 0;

  const vad = new VoiceActivityDetector({
    speechThreshold: 0.05,
    silenceDurationMs: 50,
    minSpeechDurationMs: 20,
    onSpeechEnd: (d) => {
      speechEnded = true;
      duration = d;
    },
  });

  // Start speech
  vad.processSamples(new Float32Array(100).fill(0.5));

  // Wait 30ms of active speech
  await new Promise((r) => setTimeout(r, 30));
  vad.processSamples(new Float32Array(100).fill(0.5));

  // Now silence for 70ms (> 50ms silenceDurationMs)
  vad.processSamples(new Float32Array(100).fill(0));
  await new Promise((r) => setTimeout(r, 70));

  assert.equal(speechEnded, true);
  assert.ok(duration >= 20);
});

test('VoiceActivityDetector reset cancels any pending speech triggers', async () => {
  let speechEnded = false;

  const vad = new VoiceActivityDetector({
    speechThreshold: 0.05,
    silenceDurationMs: 40,
    minSpeechDurationMs: 10,
    onSpeechEnd: () => {
      speechEnded = true;
    },
  });

  // Start speech
  vad.processSamples(new Float32Array(100).fill(0.5));
  await new Promise((r) => setTimeout(r, 15));

  // Send silence
  vad.processSamples(new Float32Array(100).fill(0));

  // Immediate reset
  vad.reset();

  // Wait past silence window
  await new Promise((r) => setTimeout(r, 60));
  assert.equal(speechEnded, false);
});
