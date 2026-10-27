import { DETECTION_SAMPLE_BYTES, detectDelimiter, detectEncoding } from '@/lib/csv/detect';
import { createCsvParser } from '@/lib/csv/parser';
import { type CsvRow, createCsvIndex } from '@/lib/csv/query';

import type { CsvFailure, CsvOptions, CsvSource, CsvWorkerRequest, CsvWorkerResponse } from './csv-protocol';

interface EngineDependencies {
  fetch?: typeof fetch;
  now?: () => number;
  /** How often, at most, the page hears about progress while a file is read. */
  progressEveryMs?: number;
}

/** A, B, … Z, AA, AB…: the names of the columns when the file has no header row. */
export function columnLetter(index: number): string {
  let name = '';
  for (let rest = index + 1; rest > 0; rest = Math.floor((rest - 1) / 26)) {
    name = String.fromCharCode(65 + ((rest - 1) % 26)) + name;
  }
  return name;
}

/** Cells completed with empty ones or cut to the header's width, for display. */
function fit(cells: string[], width: number): string[] {
  return cells.length > width ? cells.slice(0, width) : [...cells, ...Array<string>(width - cells.length).fill('')];
}

function concat(chunks: Uint8Array[], length: number): Uint8Array {
  const joined = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    joined.set(chunk, offset);
    offset += chunk.length;
  }
  return joined;
}

/**
 * Everything the worker does, kept apart from the worker global so tests can drive
 * it directly. It holds the parsed rows: the page only ever receives the page of
 * rows it shows. A new "open" supersedes one still reading.
 */
export function createCsvEngine(
  post: (response: CsvWorkerResponse) => void,
  { fetch: fetchSource = fetch, now = () => performance.now(), progressEveryMs = 100 }: EngineDependencies = {},
): { handle(request: CsvWorkerRequest): Promise<void> } {
  let index: ReturnType<typeof createCsvIndex> | null = null;
  let generation = 0;

  async function openSource(
    source: CsvSource,
  ): Promise<{ stream: ReadableStream<Uint8Array>; totalBytes: number | null } | CsvFailure> {
    if (source.kind === 'file') return { stream: source.file.stream(), totalBytes: source.file.size };
    const response = await fetchSource(source.url, { cache: 'no-store' });
    if (response.status === 404) return 'not-found';
    if (!response.ok || !response.body) return 'unreadable';
    const length = Number(response.headers.get('content-length'));
    return { stream: response.body, totalBytes: Number.isFinite(length) && length > 0 ? length : null };
  }

  async function open(source: CsvSource, options: CsvOptions): Promise<void> {
    generation += 1;
    const run = generation;
    index = null;
    const startedAt = now();
    const opened = await openSource(source).catch((): CsvFailure => 'unreadable');
    if (typeof opened === 'string') {
      post({ reason: opened, type: 'failed' });
      return;
    }
    const reader = opened.stream.getReader();
    try {
      // The first 64 KiB decide the encoding and the delimiter.
      const head: Uint8Array[] = [];
      let headBytes = 0;
      let finished = false;
      while (headBytes < DETECTION_SAMPLE_BYTES) {
        const { done, value } = await reader.read();
        if (done) {
          finished = true;
          break;
        }
        head.push(value);
        headBytes += value.length;
      }
      if (run !== generation) return;
      if (headBytes === 0) {
        post({ reason: 'empty', type: 'failed' });
        return;
      }
      const sample = concat(head, headBytes);
      const encoding = options.encoding === 'auto' ? detectEncoding(sample.subarray(0, DETECTION_SAMPLE_BYTES)) : options.encoding;
      const decoder = new TextDecoder(encoding);
      const firstText = decoder.decode(sample, { stream: !finished });
      const delimiter = options.delimiter === 'auto' ? detectDelimiter(firstText) : options.delimiter;

      const rows: CsvRow[] = [];
      // Filled by the first record; a holder, because the parser callback sets it.
      const table: { columns: string[] | null } = { columns: null };
      let warningCount = 0;
      const parser = createCsvParser(delimiter, ({ cells, line }) => {
        if (table.columns === null) {
          if (options.header) {
            table.columns = cells.map((name, position) => name.trim() || columnLetter(position));
            return;
          }
          table.columns = cells.map((_cell, position) => columnLetter(position));
        }
        const width = table.columns.length;
        const matches = cells.length === width;
        if (!matches) warningCount += 1;
        rows.push({ cells: matches ? cells : fit(cells, width), found: matches ? null : cells.length, line });
      });

      let bytesRead = headBytes;
      let lastProgress = now();
      const progress = (): void =>
        post({ bytesRead, rows: rows.length, totalBytes: opened.totalBytes, type: 'progress' });
      parser.push(firstText);
      progress();
      while (!finished) {
        const { done, value } = await reader.read();
        if (run !== generation) return;
        if (done) break;
        bytesRead += value.length;
        parser.push(decoder.decode(value, { stream: true }));
        if (now() - lastProgress >= progressEveryMs) {
          progress();
          lastProgress = now();
        }
      }
      parser.push(decoder.decode());
      parser.end();
      if (run !== generation) return;
      if (table.columns === null) {
        post({ reason: 'empty', type: 'failed' });
        return;
      }
      progress();
      index = createCsvIndex(rows);
      post({
        columns: table.columns,
        delimiter,
        elapsedMs: Math.round(now() - startedAt),
        encoding,
        rowCount: rows.length,
        type: 'ready',
        warningCount,
      });
    } catch {
      if (run === generation) post({ reason: 'unreadable', type: 'failed' });
    } finally {
      if (run !== generation) await reader.cancel().catch(() => undefined);
    }
  }

  return {
    async handle(request) {
      if (request.type === 'open') {
        await open(request.source, request.options);
        return;
      }
      if (!index) return;
      post({ page: index.query(request.query), requestId: request.requestId, type: 'page' });
    },
  };
}
