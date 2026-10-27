import { UPLOAD_LIMITS } from '@sirio/shared';

export const CSV_FILE_LIMITS = {
  /** Comma, semicolon or tab separated text: the page detects which. */
  acceptedExtensions: ['.csv', '.tsv', '.txt'],
  maximumBytes: UPLOAD_LIMITS.csvFile.maximumBytes,
  maximumNameLength: 255,
} as const;

export interface CsvFileUpload {
  bytes: Uint8Array;
  originalName: string;
}

/** What the database keeps about the restaurant's saved CSV. */
export interface CsvFileRecord {
  originalName: string;
  relativePath: string;
  sizeBytes: number;
  uploadedAt: Date;
}

/** What the page shows about the saved CSV. */
export interface CsvFileInfo {
  originalName: string;
  sizeBytes: number;
  uploadedAt: string;
}

/** The saved CSV as it is downloaded: read from disk while it is sent. */
export interface CsvFileContent {
  content: AsyncIterable<Uint8Array>;
  info: CsvFileInfo;
}
