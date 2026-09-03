import assert from 'node:assert/strict';
import test from 'node:test';

import { buildStreamGenerateContentRequest, createVtt, extractAudioData, parseSampleRate, pcmDurationSeconds, pcmToWav } from './gemini-tts.mjs';

test('creates the requested streamGenerateContent payload for Zephyr', () => {
  const request = buildStreamGenerateContentRequest('Una guía breve.', {
    selectedVoice: 'Zephyr',
  });
  assert.deepEqual(request.generationConfig.responseModalities, ['audio']);
  assert.equal(request.generationConfig.speech_config.voice_config.prebuilt_voice_config.voice_name, 'Zephyr');
  assert.match(request.contents[0].parts[0].text, /Una guía breve\./);
});

test('wraps 24 kHz PCM in a valid mono 16-bit WAVE file', () => {
  const pcm = Buffer.from([0, 0, 1, 0, 2, 0, 3, 0]);
  const wav = pcmToWav(pcm);
  assert.equal(wav.subarray(0, 4).toString(), 'RIFF');
  assert.equal(wav.subarray(8, 12).toString(), 'WAVE');
  assert.equal(wav.readUInt16LE(22), 1);
  assert.equal(wav.readUInt32LE(24), 24_000);
  assert.equal(wav.readUInt16LE(34), 16);
  assert.equal(wav.length, 44 + pcm.length);
  assert.equal(pcmDurationSeconds(pcm), 4 / 24_000);
});

test('extracts audio data and rejects malformed Gemini replies', () => {
  assert.deepEqual(extractAudioData({ output_audio: { data: Buffer.from('audio').toString('base64') } }), Buffer.from('audio'));
  assert.deepEqual(extractAudioData([{ candidates: [{ content: { parts: [{ inlineData: { data: Buffer.from('stream').toString('base64') } }] } }] }]), Buffer.from('stream'));
  assert.deepEqual(extractAudioData({ steps: [{ content: [{ type: 'audio', data: Buffer.from('steps').toString('base64') }] }] }), Buffer.from('steps'));
  assert.equal(parseSampleRate('audio/l16; rate=24000; channels=1'), 24_000);
  assert.throws(() => extractAudioData({}), /did not return audio data/);
});

test('creates one exact subtitle cue per narration beat', () => {
  const tutorial = {
    beats: [
      { id: 'one', duration: 1, narration: 'Primero.' },
      { id: 'two', duration: 2, narration: 'Después.' },
    ],
  };
  const vtt = createVtt(tutorial, { one: { durationSeconds: 0.5 }, two: { durationSeconds: 2.5 } });
  assert.match(vtt, /^WEBVTT/m);
  assert.match(vtt, /00:00:00.000 --> 00:00:01.100/);
  assert.match(vtt, /00:00:01.100 --> 00:00:04.200/);
  assert.match(vtt, /Después\./);
});
