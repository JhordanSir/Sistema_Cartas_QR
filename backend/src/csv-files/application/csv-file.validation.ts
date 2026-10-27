import { AuthRole } from '../../auth/domain/auth-role.js';
import type { AuthPrincipal } from '../../auth/domain/auth.types.js';
import { CsvFileApplicationError } from '../domain/csv-file.errors.js';
import { CSV_FILE_LIMITS, type CsvFileUpload } from '../domain/csv-file.types.js';

export function assertOwner(principal: AuthPrincipal): void {
  if (principal.role !== AuthRole.OWNER) {
    throw new CsvFileApplicationError('FORBIDDEN', 'Owner access required.');
  }
}

/**
 * A CSV has no binary signature to check, so the rules are: a text name extension,
 * the size limit and no NUL byte, which only binary files (or UTF-16 text, which the
 * page cannot read) contain.
 */
export function normalizeCsvUpload(upload: {
  bytes: Uint8Array | undefined;
  originalName: unknown;
}): CsvFileUpload {
  const { bytes } = upload;
  if (!bytes || bytes.length === 0) {
    throw new CsvFileApplicationError('CSV_FILE_REQUIRED', 'A CSV file is required.');
  }
  if (bytes.length > CSV_FILE_LIMITS.maximumBytes) {
    throw new CsvFileApplicationError('CSV_FILE_TOO_LARGE', 'The CSV file is too large.');
  }
  const originalName = normalizeFileName(upload.originalName);
  const lowerName = originalName.toLowerCase();
  if (!CSV_FILE_LIMITS.acceptedExtensions.some((extension) => lowerName.endsWith(extension))) {
    throw new CsvFileApplicationError('CSV_FILE_INVALID', 'The file is not a CSV.');
  }
  if (bytes.includes(0)) {
    throw new CsvFileApplicationError('CSV_FILE_INVALID', 'The CSV file is not text.');
  }
  return { bytes, originalName };
}

/** The name as shown back to the owner: no folders, no control characters, bounded. */
function normalizeFileName(value: unknown): string {
  const name = (typeof value === 'string' ? value : '')
    .split(/[\\/]/)
    .at(-1)
    ?.replace(/[\p{Cc}\p{Cf}]/gu, '')
    .trim();
  if (!name) return 'archivo.csv';
  if (name.length <= CSV_FILE_LIMITS.maximumNameLength) return name;
  const dot = name.lastIndexOf('.');
  const extension = dot > 0 ? name.slice(dot) : '';
  return name.slice(0, CSV_FILE_LIMITS.maximumNameLength - extension.length) + extension;
}
