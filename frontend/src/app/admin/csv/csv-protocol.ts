import type { CsvEncoding } from '@/lib/csv/detect';
import type { CsvDelimiter } from '@/lib/csv/parser';
import type { CsvPage, CsvQuery } from '@/lib/csv/query';

/** "auto" lets the worker detect the value; anything else forces it. */
export interface CsvOptions {
  delimiter: CsvDelimiter | 'auto';
  encoding: CsvEncoding | 'auto';
  header: boolean;
}

/** A file picked on this device, or the restaurant's saved CSV, which the worker downloads. */
export type CsvSource = { file: File; kind: 'file' } | { kind: 'saved'; url: string };

/** What the page asks the worker. */
export type CsvWorkerRequest =
  | { options: CsvOptions; source: CsvSource; type: 'open' }
  | { query: CsvQuery; requestId: number; type: 'query' };

export type CsvFailure = 'empty' | 'not-found' | 'unreadable';

/** What the worker answers. */
export type CsvWorkerResponse =
  | { bytesRead: number; rows: number; totalBytes: number | null; type: 'progress' }
  | {
      columns: string[];
      delimiter: CsvDelimiter;
      elapsedMs: number;
      encoding: CsvEncoding;
      rowCount: number;
      type: 'ready';
      warningCount: number;
    }
  | { page: CsvPage; requestId: number; type: 'page' }
  | { reason: CsvFailure; type: 'failed' };
