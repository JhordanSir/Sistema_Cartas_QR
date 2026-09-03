import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { TUTORIALS } from './tutorial-data.mjs';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputDirectory = resolve(projectRoot, 'compositions', 'tutorials');
const manifestPath = resolve(projectRoot, 'assets', 'audio', 'gemini-tts-manifest.json');

function esc(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

async function getManifest() {
  try {
    return { ...JSON.parse(await readFile(manifestPath, 'utf8')), exists: true };
  } catch (error) {
    if (error?.code === 'ENOENT') return { exists: false, frames: {} };
    throw error;
  }
}

function durationFor(beat, manifest) {
  return Number(Math.max(beat.duration, (manifest.frames?.[beat.id]?.durationSeconds ?? 0) + 0.6).toFixed(3));
}

function audioDurationFor(beat, manifest) {
  return Number((manifest.frames?.[beat.id]?.durationSeconds ?? beat.duration).toFixed(3));
}

function rowMarkup(rows, kind) {
  return rows.map((row, index) => {
    const className = index === rows.length - 1 ? 'ui-row ui-row-final' : 'ui-row';
    const indicator = kind === 'comparison' ? '' : `<span class="row-dot">${String(index + 1).padStart(2, '0')}</span>`;
    return `<div class="${className}">${indicator}<span>${esc(row)}</span>${kind === 'form' && index === rows.length - 1 ? '<span class="toggle">✓</span>' : ''}</div>`;
  }).join('');
}

function qrMarkup() {
  const filled = new Set([0, 1, 2, 4, 6, 8, 9, 12, 13, 16, 18, 20, 21, 22, 24, 26, 28, 29, 32, 33, 35, 37, 38, 40, 43, 45, 46, 48]);
  return `<div class="qr-code" aria-hidden="true">${Array.from({ length: 49 }, (_, index) => `<i class="${filled.has(index) ? 'qr-fill' : ''}"></i>`).join('')}</div>`;
}

function phoneContent(beat) {
  const rows = rowMarkup(beat.rows, beat.kind);
  const qr = beat.kind === 'qr' || beat.kind === 'share' || beat.kind === 'closing' ? qrMarkup() : '';
  const logo = beat.kind === 'opening' || beat.kind === 'closing'
    ? '<img class="phone-logo" src=".media/images/logo_001.webp" alt="" />'
    : '';
  const kindClass = `phone-${beat.kind}`;
  const icon = beat.kind === 'success' || beat.kind === 'closing' ? '<span class="status-mark">✓</span>' : '';
  const compare = beat.kind === 'comparison' ? '<span class="comparison-note">Buena luz y texto enfocado</span>' : '';
  const scan = beat.kind === 'processing' ? '<div class="scan-line"></div>' : '';
  return `<section class="phone ${kindClass}" aria-label="Interfaz simulada de Sirio">
    <div class="phone-speaker"></div>
    <div class="phone-topline"><span>Sirio</span><span class="phone-live">${beat.kind === 'processing' ? 'Procesando' : 'Guía móvil'}</span></div>
    <div class="phone-panel">
      <div class="ui-label">${esc(beat.uiTitle)}</div>
      ${logo}${icon}${qr}${scan}
      <div class="ui-rows">${rows}</div>
      ${compare}
      <div class="ui-action">${esc(beat.accent)}<span>→</span></div>
    </div>
    <div class="phone-nav"><span>Perfil</span><span class="phone-nav-active">Carta</span><span>QR</span></div>
  </section>`;
}

function sceneMarkup(tutorial, beat, sceneIndex) {
  return `<section id="scene-${tutorial.id}-${sceneIndex}" class="scene scene-${sceneIndex}" aria-hidden="${sceneIndex === 0 ? 'false' : 'true'}">
    <div class="paper-sun"></div><div class="paper-line paper-line-a"></div><div class="paper-line paper-line-b"></div>
    <header class="scene-meta"><span>${esc(tutorial.title)}</span><span>${String(sceneIndex + 1).padStart(2, '0')} / ${String(tutorial.beats.length).padStart(2, '0')}</span></header>
    <main class="scene-copy">
      <span class="ticket"><b>${String(sceneIndex + 1).padStart(2, '0')}</b>${esc(beat.kicker)}</span>
      <h1>${esc(beat.title)}</h1>
      <p>${esc(beat.lead)}</p>
    </main>
    ${phoneContent(beat)}
    <div class="caption" aria-live="off"><span>${esc(beat.narration)}</span></div>
  </section>`;
}

function createComposition(tutorial, manifest) {
  let cursor = 0;
  const timings = tutorial.beats.map((beat) => {
    const start = Number(cursor.toFixed(3));
    const duration = durationFor(beat, manifest);
    cursor += duration;
    return { start, duration };
  });
  const totalDuration = Number(cursor.toFixed(3));
  const scenes = tutorial.beats.map((beat, index) => sceneMarkup(tutorial, beat, index)).join('\n');
  const audio = tutorial.beats.map((beat, index) => `<audio id="audio-${beat.id}" src="assets/audio/${beat.id}.wav" data-start="${timings[index].start}" data-duration="${audioDurationFor(beat, manifest)}" data-track-index="${Number(tutorial.id.slice(0, 2)) * 10 + index}"></audio>`).join('\n');
  const touchStart = Math.min(tutorial.touchAt, Math.max(0, totalDuration - 0.7));
  const touch = `<div id="tap-${tutorial.id}" data-composition-id="touch-indicator" data-composition-src="compositions/components/touch-indicator.html" data-start="${touchStart.toFixed(3)}" data-duration="0.7" data-track-index="8" data-variable-values='{"gesture":"tap","polarity":"dark","targetX":${tutorial.touchTarget.x},"targetY":${tutorial.touchTarget.y}}'></div>`;
  const transitionScript = tutorial.beats.slice(1).map((_, index) => {
    const at = Math.max(0, timings[index + 1].start - 0.45).toFixed(3);
    return `tl.to('#scene-${tutorial.id}-${index}', { autoAlpha: 0, y: -74, duration: 0.45, ease: 'power2.inOut' }, ${at});\n        tl.fromTo('#scene-${tutorial.id}-${index + 1}', { autoAlpha: 0, y: 106 }, { autoAlpha: 1, y: 0, duration: 0.45, ease: 'power2.out', immediateRender: false }, ${at});`;
  }).join('\n        ');
  const captionScript = tutorial.beats.map((_, index) => {
    const at = timings[index].start.toFixed(3);
    return `tl.fromTo('#scene-${tutorial.id}-${index} .caption', { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.28, ease: 'power2.out', immediateRender: false }, ${at});`;
  }).join('\n        ');

  return `<!doctype html>
<html lang="es" data-resolution="portrait">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=1920" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
  </head>
  <body>
    <div id="root" data-composition-id="${tutorial.id}" data-width="1080" data-height="1920" data-duration="${totalDuration}">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Archivo+Black&family=Montserrat:wght@500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        #root { --canvas: #f7f1e7; --paper: #fffdf8; --ink: #29271f; --olive: #315b45; --copper: #b75b38; --teal: #1598a6; position: relative; width: 1080px; height: 1920px; overflow: hidden; background: var(--canvas); color: var(--ink); font-family: Montserrat, Arial, sans-serif; }
        .scene { position: absolute; inset: 0; overflow: hidden; opacity: 0; visibility: hidden; }
        .paper-sun { position: absolute; top: -260px; right: -170px; width: 640px; height: 640px; border: 2px solid rgba(183,91,56,.2); border-radius: 50%; box-shadow: 0 0 0 72px rgba(183,91,56,.045), 0 0 0 144px rgba(183,91,56,.025); }
        .paper-line { position: absolute; width: 1px; background: rgba(49,91,69,.18); }
        .paper-line-a { top: 128px; bottom: 210px; left: 72px; }
        .paper-line-b { top: 310px; right: 72px; height: 360px; }
        .scene-meta { position: absolute; top: 78px; right: 72px; left: 96px; display: flex; justify-content: space-between; color: var(--olive); font-size: 18px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
        .scene-meta span:last-child { color: var(--copper); font-variant-numeric: tabular-nums; }
        .scene-copy { position: absolute; top: 164px; right: 78px; left: 96px; z-index: 2; }
        .ticket { display: inline-flex; min-height: 42px; align-items: center; gap: 12px; padding: 8px 16px 8px 8px; border: 2px solid var(--ink); border-radius: 7px; background: var(--paper); color: var(--olive); font-size: 16px; font-weight: 800; letter-spacing: .075em; text-transform: uppercase; box-shadow: 6px 6px 0 rgba(41,39,31,.12); }
        .ticket b { display: grid; width: 30px; height: 28px; place-items: center; background: var(--copper); color: white; font-size: 14px; }
        h1 { max-width: 860px; margin: 38px 0 20px; font-family: 'Archivo Black', sans-serif; font-size: 76px; font-weight: 400; letter-spacing: -.065em; line-height: .98; text-wrap: balance; }
        .scene-copy p { max-width: 660px; margin: 0; color: #5e5a4e; font-size: 28px; font-weight: 600; line-height: 1.42; text-wrap: pretty; }
        .phone { position: absolute; z-index: 2; right: 116px; bottom: 194px; left: 116px; height: 960px; padding: 40px 38px 30px; border: 7px solid var(--ink); border-radius: 68px; background: var(--paper); box-shadow: 16px 18px 0 var(--ink), 0 28px 54px rgba(41,39,31,.18); overflow: hidden; }
        .phone::before { position: absolute; inset: 16px; border: 1px dashed rgba(49,91,69,.2); border-radius: 49px; content: ''; pointer-events: none; }
        .phone-speaker { width: 172px; height: 24px; border-radius: 999px; margin: 0 auto 30px; background: var(--ink); }
        .phone-topline { position: relative; display: flex; justify-content: space-between; color: var(--ink); font-size: 23px; font-weight: 800; letter-spacing: -.03em; }
        .phone-live { color: var(--teal); font-size: 15px; letter-spacing: .07em; text-transform: uppercase; }
        .phone-panel { position: relative; min-height: 700px; padding: 36px; border: 2px solid rgba(41,39,31,.14); border-radius: 30px; margin-top: 32px; background: #fff; }
        .ui-label { max-width: 74%; color: var(--ink); font-size: 40px; font-weight: 800; letter-spacing: -.045em; line-height: 1.04; }
        .phone-logo { display: block; width: 86px; height: 86px; border-radius: 24px; margin: 22px 0 -4px; object-fit: cover; box-shadow: 0 8px 16px rgba(41,39,31,.14); }
        .ui-rows { display: grid; gap: 0; margin-top: 32px; }
        .ui-row { display: flex; min-height: 78px; align-items: center; gap: 16px; border-top: 1px solid rgba(41,39,31,.13); color: #4d4a41; font-size: 23px; font-weight: 700; }
        .row-dot { display: grid; width: 32px; height: 32px; flex: 0 0 auto; border-radius: 50%; background: #e3eee5; color: var(--olive); font-size: 12px; place-items: center; }
        .ui-row-final { color: var(--ink); }
        .toggle { display: grid; width: 30px; height: 30px; border-radius: 50%; margin-left: auto; background: var(--olive); color: white; font-size: 17px; place-items: center; }
        .ui-action { position: absolute; right: 36px; bottom: 34px; left: 36px; display: flex; min-height: 68px; align-items: center; justify-content: space-between; padding: 14px 20px; border-radius: 15px; background: var(--olive); color: white; font-size: 21px; font-weight: 800; box-shadow: 0 10px 20px rgba(49,91,69,.2); }
        .ui-action span { font-size: 28px; }
        .phone-nav { position: absolute; right: 42px; bottom: 30px; left: 42px; display: flex; justify-content: space-around; color: #817b6c; font-size: 15px; font-weight: 800; }
        .phone-nav-active { color: var(--olive); }
        .phone-login .phone-panel, .phone-form .phone-panel { background: #fcfaf4; }
        .phone-login .ui-row { padding: 0 18px; border: 2px solid rgba(41,39,31,.15); border-radius: 14px; margin-bottom: 16px; background: white; color: #817b6c; }
        .phone-login .row-dot { display: none; }
        .phone-navigation .phone-panel { padding-right: 0; padding-left: 0; background: var(--ink); }
        .phone-navigation .ui-label { padding: 0 36px; color: white; }
        .phone-navigation .ui-rows { margin-top: 26px; }
        .phone-navigation .ui-row { min-height: 88px; padding: 0 36px; border-color: rgba(255,255,255,.15); background: transparent; color: white; }
        .phone-navigation .ui-row:nth-child(2) { background: rgba(21,152,166,.22); }
        .phone-navigation .row-dot { background: var(--teal); color: white; }
        .phone-navigation .ui-action { right: 36px; left: 36px; background: var(--copper); }
        .phone-upload .phone-panel { background: #e0f4f2; }
        .phone-upload .ui-label::after { display: grid; width: 122px; height: 92px; border: 3px dashed var(--teal); border-radius: 18px; margin: 24px 0 -4px; color: var(--teal); content: '↑'; font-size: 52px; place-items: center; }
        .phone-comparison .ui-row:first-child { color: #9a4038; }
        .phone-comparison .ui-row:nth-child(2) { color: var(--olive); }
        .comparison-note { display: block; padding: 14px; border-radius: 12px; margin-top: 22px; background: #e3eee5; color: var(--olive); font-size: 17px; font-weight: 800; }
        .phone-processing .phone-panel { overflow: hidden; background: #0f2421; color: white; }
        .phone-processing .ui-label, .phone-processing .ui-row { color: white; }
        .phone-processing .ui-row { border-color: rgba(255,255,255,.17); }
        .phone-processing .row-dot { background: var(--teal); color: white; }
        .scan-line { position: absolute; top: 160px; right: 24px; left: 24px; height: 5px; background: var(--teal); box-shadow: 0 0 22px var(--teal); }
        .phone-processing .ui-action { background: var(--teal); }
        .status-mark { display: grid; width: 74px; height: 74px; border-radius: 50%; margin: 24px 0 -10px; background: var(--teal); color: white; font-size: 40px; place-items: center; }
        .phone-success .phone-panel, .phone-closing .phone-panel { background: #e3eee5; }
        .phone-publish .ui-action, .phone-download .ui-action, .phone-link .ui-action { background: var(--copper); }
        .phone-preview .phone-panel { background: #f3eadb; }
        .qr-code { display: grid; width: 198px; height: 198px; grid-template-columns: repeat(7, 1fr); grid-template-rows: repeat(7, 1fr); gap: 5px; padding: 14px; border: 8px solid var(--ink); border-radius: 14px; margin: 24px 0 10px; background: white; }
        .qr-code i { background: transparent; }
        .qr-code .qr-fill { background: var(--ink); }
        .phone-qr .phone-panel, .phone-share .phone-panel { background: #e0f4f2; }
        .phone-qr .ui-rows, .phone-share .ui-rows, .phone-closing .ui-rows { margin-top: 12px; }
        .caption { position: absolute; z-index: 4; right: 92px; bottom: 64px; left: 92px; display: grid; min-height: 104px; align-items: center; padding: 20px 26px; border: 2px solid rgba(41,39,31,.15); border-radius: 18px; background: rgba(255,253,248,.96); box-shadow: 0 10px 30px rgba(41,39,31,.11); color: var(--ink); font-size: 21px; font-weight: 700; line-height: 1.35; text-align: center; }
      </style>
      ${scenes}
      ${audio}
      ${touch}
    </div>
    <script>
      window.__timelines = window.__timelines || {};
      const tl = gsap.timeline({ paused: true });
      const scenes = gsap.utils.toArray('#root .scene');
      const captions = gsap.utils.toArray('#root .caption');
      gsap.set(scenes, { autoAlpha: 0, y: 0 });
      gsap.set(captions, { autoAlpha: 0, y: 20 });
      tl.set(scenes[0], { autoAlpha: 1, y: 0 }, 0);
      tl.to('#root .paper-sun', { rotation: 3, duration: ${totalDuration}, ease: 'none' }, 0);
      ${transitionScript}
      ${captionScript}
      window.__timelines['${tutorial.id}'] = tl;
    </script>
  </body>
</html>`;
}

async function main() {
  const manifest = await getManifest();
  await mkdir(outputDirectory, { recursive: true });
  await Promise.all(TUTORIALS.map((tutorial) =>
    writeFile(resolve(outputDirectory, `${tutorial.id}.html`), createComposition(tutorial, manifest), 'utf8'),
  ));
  await writeFile(resolve(projectRoot, 'SCRIPT.md'), `# Guion de voz aprobado\n\n${TUTORIALS.map((tutorial) => `## ${tutorial.title}\n\n${tutorial.beats.map((beat) => `- **${beat.id}** — ${beat.narration}`).join('\n')}`).join('\n\n')}\n`, 'utf8');
  console.log(`Generated ${TUTORIALS.length} final tutorial compositions. Audio manifest: ${manifest.exists ? 'loaded' : 'not found; planned durations used'}.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
