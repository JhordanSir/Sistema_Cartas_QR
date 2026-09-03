import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ALL_BEATS, TUTORIALS } from './tutorial-data.mjs';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const workspaceRoot = resolve(projectRoot, '..', '..');
const audioDirectory = resolve(projectRoot, 'assets', 'audio');
const manifestPath = resolve(audioDirectory, 'gemini-tts-manifest.json');
const defaultModel = 'gemini-2.5-flash-preview-tts';
const defaultVoice = 'Zephyr';
const sampleRate = 24_000;

function parseDotEnv(source) {
  return Object.fromEntries(
    source
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
      .map((line) => {
        const separator = line.indexOf('=');
        if (separator === -1) return [line, ''];
        const key = line.slice(0, separator).trim();
        const value = line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, '');
        return [key, value];
      }),
  );
}

async function loadEnvironment() {
  try {
    const values = parseDotEnv(await readFile(resolve(workspaceRoot, '.env'), 'utf8'));
    for (const [key, value] of Object.entries(values)) {
      if (!process.env[key]) process.env[key] = value;
    }
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
}

function configuredModel() {
  return process.env.GEMINI_TTS_MODEL || defaultModel;
}

function configuredVoice() {
  return process.env.GEMINI_TTS_VOICE || defaultVoice;
}

export function buildStreamGenerateContentRequest(text, { selectedVoice = configuredVoice() } = {}) {
  return {
    contents: [{
      role: 'user',
      parts: [{
        text: [
          '## Scene:',
          'Tutorial móvil de Sirio para propietarios de restaurantes.',
          '',
          '## Sample Context:',
          'Voz cálida, clara y segura en español peruano neutro. Ritmo pausado y directo. No agregues saludos, música, efectos ni palabras fuera de la transcripción.',
          '',
          '## Transcript:',
          text,
        ].join('\n'),
      }],
    }],
    generationConfig: {
      responseModalities: ['audio'],
      temperature: 1,
      speech_config: {
        voice_config: { prebuilt_voice_config: { voice_name: selectedVoice } },
      },
    },
  };
}

function generatedAudioBlocks(response) {
  const messages = Array.isArray(response) ? response : [response];
  return messages.flatMap((message) => message?.candidates?.[0]?.content?.parts ?? [])
    .map((part) => part.inlineData ?? part.inline_data)
    .filter((audio) => typeof audio?.data === 'string');
}

export function extractAudioData(response) {
  const generated = generatedAudioBlocks(response);
  if (generated.length > 0) {
    return Buffer.concat(generated.map((audio) => Buffer.from(audio.data, 'base64')));
  }
  const stepAudio = response?.steps
    ?.flatMap((step) => step.content ?? [])
    .find((content) => content?.type === 'audio');
  const data = response?.output_audio?.data ?? response?.outputAudio?.data ?? stepAudio?.data;
  if (typeof data !== 'string' || data.length === 0) {
    throw new Error('Gemini did not return audio data for this narration.');
  }
  return Buffer.from(data, 'base64');
}

function audioMimeType(response) {
  const generated = generatedAudioBlocks(response);
  if (generated.length > 0) return generated[0].mimeType ?? generated[0].mime_type;
  const stepAudio = response?.steps
    ?.flatMap((step) => step.content ?? [])
    .find((content) => content?.type === 'audio');
  return stepAudio?.mime_type ?? stepAudio?.mimeType;
}

export function pcmToWav(pcm, { channels = 1, rate = sampleRate, sampleWidth = 2 } = {}) {
  const header = Buffer.alloc(44);
  const byteRate = rate * channels * sampleWidth;
  const blockAlign = channels * sampleWidth;
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(rate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(sampleWidth * 8, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

export function pcmDurationSeconds(pcm, { channels = 1, rate = sampleRate, sampleWidth = 2 } = {}) {
  return pcm.length / (rate * channels * sampleWidth);
}

function toVttTime(seconds) {
  const milliseconds = Math.max(0, Math.round(seconds * 1_000));
  const hours = Math.floor(milliseconds / 3_600_000);
  const minutes = Math.floor((milliseconds % 3_600_000) / 60_000);
  const secs = Math.floor((milliseconds % 60_000) / 1_000);
  const ms = milliseconds % 1_000;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
}

export function createVtt(tutorial, manifestFrames) {
  let cursor = 0;
  const cues = tutorial.beats.map((beat, index) => {
    const frame = manifestFrames[beat.id];
    const duration = Math.max(beat.duration, (frame?.durationSeconds ?? 0) + 0.6);
    const start = cursor;
    cursor += duration;
    return `${index + 1}\n${toVttTime(start)} --> ${toVttTime(cursor)}\n${beat.narration}`;
  });
  return `WEBVTT\n\n${cues.join('\n\n')}\n`;
}

async function requestAudio(text, apiKey) {
  const model = configuredModel();
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(buildStreamGenerateContentRequest(text)),
    },
  );
  if (!response.ok) {
    const body = (await response.text()).replaceAll(apiKey, '[REDACTED]');
    throw new Error(`Gemini TTS request failed with HTTP ${response.status}: ${body.slice(0, 500)}`);
  }
  const generated = await response.json();
  return {
    pcm: extractAudioData(generated),
    rate: parseSampleRate(audioMimeType(generated)),
  };
}

export function parseSampleRate(mimeType, fallback = sampleRate) {
  const match = /rate\s*=\s*(\d+)/i.exec(mimeType ?? '');
  return match ? Number(match[1]) : fallback;
}

function selectedBeats() {
  const fromArgument = process.argv.find((argument) => argument.startsWith('--from='));
  const toArgument = process.argv.find((argument) => argument.startsWith('--to='));
  const from = Math.max(1, Number(fromArgument?.split('=')[1] ?? 1));
  const to = Math.min(ALL_BEATS.length, Number(toArgument?.split('=')[1] ?? ALL_BEATS.length));
  if (!Number.isInteger(from) || !Number.isInteger(to) || from > to) {
    throw new Error(`Use valid inclusive --from and --to positions between 1 and ${ALL_BEATS.length}.`);
  }
  return ALL_BEATS.slice(from - 1, to);
}

async function existingFrames() {
  const frames = {};
  for (const beat of ALL_BEATS) {
    try {
      const wav = await readFile(resolve(audioDirectory, `${beat.id}.wav`));
      if (wav.length < 44 || wav.subarray(0, 4).toString() !== 'RIFF') continue;
      const rate = wav.readUInt32LE(24);
      const pcm = wav.subarray(44);
      frames[beat.id] = {
        file: `${beat.id}.wav`,
        durationSeconds: Number(pcmDurationSeconds(pcm, { rate }).toFixed(3)),
        narration: beat.narration,
      };
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
  }
  return frames;
}


async function main() {
  await loadEnvironment();
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is required in the workspace .env to generate tutorial narration.');

  await mkdir(audioDirectory, { recursive: true });
  const frames = await existingFrames();
  for (const beat of selectedBeats()) {
    const index = ALL_BEATS.findIndex((candidate) => candidate.id === beat.id);
    const outputName = `${beat.id}.wav`;
    process.stdout.write(`[${index + 1}/${ALL_BEATS.length}] Generating ${beat.id}…\n`);
    const audio = await requestAudio(beat.narration, apiKey);
    await writeFile(resolve(audioDirectory, outputName), pcmToWav(audio.pcm, { rate: audio.rate }));
    frames[beat.id] = {
      file: outputName,
      durationSeconds: Number(pcmDurationSeconds(audio.pcm, { rate: audio.rate }).toFixed(3)),
      narration: beat.narration,
    };
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    model: configuredModel(),
    voice: configuredVoice(),
    sampleRate,
    frames,
  };
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  await Promise.all(TUTORIALS.map((tutorial) =>
    writeFile(resolve(audioDirectory, `${tutorial.id}.vtt`), createVtt(tutorial, frames), 'utf8'),
  ));
  process.stdout.write(`Stored ${Object.keys(frames).length}/${ALL_BEATS.length} Zephyr narration clips and ${TUTORIALS.length} caption files.\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
