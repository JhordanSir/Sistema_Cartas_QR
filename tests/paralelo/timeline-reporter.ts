import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import type { FullConfig, FullResult, Reporter, TestCase, TestResult } from '@playwright/test/reporter';

interface Bar {
  durationMs: number;
  file: string;
  /** 0 … workers − 1: the slot a worker occupies; a restarted worker keeps it. */
  parallelIndex: number;
  startMs: number;
  status: TestResult['status'];
  title: string;
  /** Unique per worker process: it changes when a worker is replaced after a failure. */
  workerIndex: number;
}

const COLORS = ['#117884', '#ac5635', '#315b45', '#6b4fa1', '#a1793a', '#3b6fb6'];
const ROW = 44;
const LEFT = 150;
const WIDTH = 1180;

const escape = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * Records which worker ran each test and when, and draws it: one row per worker
 * slot, one bar per test. Writes timeline.json and timeline.html in a folder named
 * after the run (workers, distribution and shard), so runs can be compared.
 */
export default class TimelineReporter implements Reporter {
  private readonly bars: Bar[] = [];
  private config: FullConfig | null = null;

  // Without options (a reporter named on the command line), it writes next to the config.
  constructor(private readonly options: { outputFolder?: string } = {}) {}

  onBegin(config: FullConfig): void {
    this.config = config;
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    this.bars.push({
      durationMs: result.duration,
      file: path.basename(test.location.file),
      parallelIndex: result.parallelIndex,
      startMs: result.startTime.getTime(),
      status: result.status,
      title: test.title,
      workerIndex: result.workerIndex,
    });
  }

  onEnd(result: FullResult): void {
    const config = this.config;
    if (!config || this.bars.length === 0) return;
    const shard = config.shard ? `shard-${config.shard.current}de${config.shard.total}-` : '';
    const repeat = config.projects[0]?.repeatEach ?? 1;
    const label = `${shard}w${config.workers}-${config.fullyParallel ? 'completo' : 'archivo'}${repeat > 1 ? `-x${repeat}` : ''}`;
    const baseDir = config.configFile ? path.dirname(config.configFile) : config.rootDir;
    const folder = path.resolve(baseDir, this.options.outputFolder ?? './artifacts/paralelo', label);
    mkdirSync(folder, { recursive: true });

    const origin = result.startTime.getTime();
    const summary = {
      distribution: config.fullyParallel ? 'fullyParallel' : 'por archivo',
      shard: config.shard,
      sumOfTestsMs: this.bars.reduce((total, bar) => total + bar.durationMs, 0),
      tests: this.bars.length,
      wallClockMs: Math.round(result.duration),
      workers: config.workers,
      workerProcesses: new Set(this.bars.map((bar) => bar.workerIndex)).size,
    };
    const bars = this.bars
      .map((bar) => ({ ...bar, startMs: bar.startMs - origin }))
      .sort((left, right) => left.startMs - right.startMs);
    writeFileSync(path.join(folder, 'timeline.json'), JSON.stringify({ bars, summary }, null, 2));
    writeFileSync(path.join(folder, 'timeline.html'), this.html(bars, summary, label));
    console.log(`Línea de tiempo: ${path.join(folder, 'timeline.html')}`);
  }

  private html(bars: Bar[], summary: { [key: string]: unknown }, label: string): string {
    const files = [...new Set(bars.map((bar) => bar.file))].sort();
    const color = (file: string) => COLORS[files.indexOf(file) % COLORS.length] ?? COLORS[0];
    const slots = Math.max(...bars.map((bar) => bar.parallelIndex)) + 1;
    const endMs = Math.max(Number(summary.wallClockMs), ...bars.map((bar) => bar.startMs + bar.durationMs));
    const scale = (WIDTH - LEFT - 20) / endMs;
    const step = endMs > 12_000 ? 2000 : endMs > 5000 ? 1000 : 500;
    const height = 40 + slots * ROW + 40;

    const ticks: string[] = [];
    for (let ms = 0; ms <= endMs; ms += step) {
      const x = LEFT + ms * scale;
      ticks.push(
        `<line x1="${x}" x2="${x}" y1="30" y2="${height - 30}" stroke="#ddd"/>` +
          `<text x="${x}" y="${height - 12}" text-anchor="middle">${(ms / 1000).toLocaleString('es-PE')} s</text>`,
      );
    }
    const rows = Array.from({ length: slots }, (_unused, slot) => {
      const y = 40 + slot * ROW;
      const processes = [...new Set(bars.filter((bar) => bar.parallelIndex === slot).map((bar) => bar.workerIndex))];
      return (
        `<text x="10" y="${y + ROW / 2 + 4}" font-weight="bold">Worker ${slot}</text>` +
        `<text x="10" y="${y + ROW / 2 + 18}" fill="#666">proceso ${processes.join(', ')}</text>`
      );
    });
    // The clip id goes by position: two tests can start in the same millisecond.
    const rects = bars.map((bar, index) => {
      const x = LEFT + bar.startMs * scale;
      const width = Math.max(2, bar.durationMs * scale);
      const y = 40 + bar.parallelIndex * ROW + 6;
      const text = width > 40 ? `<text x="${x + 4}" y="${y + 20}" fill="#fff" clip-path="url(#c${index})">${escape(bar.title)}</text>` : '';
      return (
        `<clipPath id="c${index}"><rect x="${x}" y="${y}" width="${width - 4}" height="${ROW - 12}"/></clipPath>` +
        `<rect x="${x}" y="${y}" width="${width}" height="${ROW - 12}" rx="4" fill="${color(bar.file)}"` +
        `${bar.status === 'passed' ? '' : ' stroke="#9a4038" stroke-width="3"'}>` +
        `<title>${escape(`${bar.file} · ${bar.title} · worker ${bar.parallelIndex} (proceso ${bar.workerIndex}) · ${bar.durationMs} ms · ${bar.status}`)}</title></rect>${text}`
      );
    });
    const legend = files
      .map((file) => `<span><i style="background:${color(file)}"></i>${escape(file)}</span>`)
      .join('');
    const seconds = (ms: unknown) => `${(Number(ms) / 1000).toLocaleString('es-PE', { maximumFractionDigits: 2 })} s`;

    return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Línea de tiempo ${escape(label)}</title>
<style>body{font:14px Arial,sans-serif;margin:24px;color:#222}h1{font-size:20px;margin:0 0 6px}p{margin:0 0 12px}
.legend span{margin-right:18px;white-space:nowrap}.legend i{display:inline-block;width:12px;height:12px;border-radius:3px;margin-right:6px;vertical-align:-1px}
svg text{font:12px Arial,sans-serif}</style></head><body>
<h1>Ejecución paralela con Playwright: ${escape(label)}</h1>
<p>${summary.tests} pruebas · ${summary.workers} ${summary.workers === 1 ? 'worker' : 'workers'} · reparto ${escape(String(summary.distribution))} · duración total ${seconds(summary.wallClockMs)} · suma de las pruebas ${seconds(summary.sumOfTestsMs)}</p>
<p class="legend">${legend}</p>
<svg width="${WIDTH}" height="${height}" xmlns="http://www.w3.org/2000/svg">${ticks.join('')}${rows.join('')}${rects.join('')}</svg>
</body></html>`;
  }
}
