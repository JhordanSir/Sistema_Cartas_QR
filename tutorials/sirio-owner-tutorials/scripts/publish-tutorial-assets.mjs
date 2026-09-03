import { copyFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { TUTORIALS } from './tutorial-data.mjs';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const renderedDirectory = resolve(projectRoot, 'renders');
const subtitlesDirectory = resolve(projectRoot, 'assets', 'audio');
const publicDirectory = resolve(projectRoot, '..', '..', 'apps', 'web', 'public', 'tutorials');

await mkdir(publicDirectory, { recursive: true });
await Promise.all(TUTORIALS.flatMap((tutorial) => [
  copyFile(resolve(renderedDirectory, `${tutorial.id}.mp4`), resolve(publicDirectory, `${tutorial.id}.mp4`)),
  copyFile(resolve(subtitlesDirectory, `${tutorial.id}.vtt`), resolve(publicDirectory, `${tutorial.id}.vtt`)),
  copyFile(resolve(renderedDirectory, `${tutorial.id}.jpg`), resolve(publicDirectory, `${tutorial.id}.jpg`)),
]));

console.log(`Published ${TUTORIALS.length} tutorial videos, posters and caption tracks to ${publicDirectory}`);
