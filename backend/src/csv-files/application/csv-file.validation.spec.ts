import { AuthRole } from '../../auth/domain/auth-role.js';
import { CSV_FILE_LIMITS } from '../domain/csv-file.types.js';
import { assertOwner, normalizeCsvUpload } from './csv-file.validation.js';

const csv = (text: string): Uint8Array => new TextEncoder().encode(text);

/** The code of the error a call throws, so the assertions read as plain values. */
function codeOf(call: () => unknown): unknown {
  try {
    call();
  } catch (error) {
    return (error as { code?: unknown }).code;
  }
  return undefined;
}

describe('normalizeCsvUpload', () => {
  it('accepts comma, semicolon and tab separated text by its extension', () => {
    for (const name of ['carta.csv', 'CARTA.CSV', 'ventas.tsv', 'export.txt']) {
      expect(normalizeCsvUpload({ bytes: csv('a;b\n1;2\n'), originalName: name }).originalName).toBe(name);
    }
  });

  it('asks for a file when nothing or an empty file arrives', () => {
    expect(codeOf(() => normalizeCsvUpload({ bytes: undefined, originalName: 'carta.csv' }))).toBe('CSV_FILE_REQUIRED');
    expect(codeOf(() => normalizeCsvUpload({ bytes: new Uint8Array(), originalName: 'carta.csv' }))).toBe('CSV_FILE_REQUIRED');
  });

  it('refuses files over the limit', () => {
    const bytes = new Uint8Array(CSV_FILE_LIMITS.maximumBytes + 1).fill(65);

    expect(codeOf(() => normalizeCsvUpload({ bytes, originalName: 'grande.csv' }))).toBe('CSV_FILE_TOO_LARGE');
  });

  it('refuses other extensions and binary content', () => {
    expect(codeOf(() => normalizeCsvUpload({ bytes: csv('a,b'), originalName: 'foto.png' }))).toBe('CSV_FILE_INVALID');
    expect(codeOf(() =>
      normalizeCsvUpload({ bytes: Uint8Array.from([97, 0, 98]), originalName: 'utf16.csv' }),
    )).toBe('CSV_FILE_INVALID');
  });

  it('keeps only a clean, bounded file name', () => {
    expect(normalizeCsvUpload({ bytes: csv('a'), originalName: 'C:\\exports\\menú\u0007.csv' }).originalName).toBe(
      'menú.csv',
    );
    const longName = `${'x'.repeat(300)}.csv`;
    const normalized = normalizeCsvUpload({ bytes: csv('a'), originalName: longName }).originalName;
    expect(normalized).toHaveLength(CSV_FILE_LIMITS.maximumNameLength);
    expect(normalized.endsWith('.csv')).toBe(true);
  });
});

describe('assertOwner', () => {
  it('only lets owners through', () => {
    const principal = { accountId: 'a', email: 'admin@example.com', role: AuthRole.ADMIN, sessionId: 's' };

    expect(codeOf(() => assertOwner(principal))).toBe('FORBIDDEN');
  });
});
