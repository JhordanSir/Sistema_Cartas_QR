/**
 * @jest-environment node
 */
import { type CsvRow, compareCells, createCsvIndex, foldForSearch, numericValue } from './query';

const row = (line: number, ...cells: string[]): CsvRow => ({ cells, found: null, line });

describe('numericValue', () => {
  it('reads decimal commas and points alike, and leaves text alone', () => {
    expect(numericValue('1,5')).toBe(1.5);
    expect(numericValue(' 1.5 ')).toBe(1.5);
    expect(numericValue('-20')).toBe(-20);
    expect(numericValue('S/ 35')).toBeNull();
    expect(numericValue('1.234,5')).toBeNull();
  });
});

describe('compareCells', () => {
  const sorted = (cells: string[], direction: 'asc' | 'desc') =>
    [...cells].sort((left, right) => compareCells(left, right, direction));

  it('orders numbers as numbers, before text, and leaves empty cells last', () => {
    expect(sorted(['10', 'Ceviche', '9', '', '1,5'], 'asc')).toEqual(['1,5', '9', '10', 'Ceviche', '']);
    expect(sorted(['10', 'Ceviche', '9', '', '1,5'], 'desc')).toEqual(['Ceviche', '10', '9', '1,5', '']);
  });

  it('orders text with Spanish rules: accents do not matter and ñ follows n', () => {
    expect(sorted(['ñandú', 'Ñoquis', 'nabo', 'Ají', 'arroz', 'zapallo'], 'asc')).toEqual([
      'Ají',
      'arroz',
      'nabo',
      'ñandú',
      'Ñoquis',
      'zapallo',
    ]);
  });
});

describe('createCsvIndex', () => {
  const rows = [row(2, 'Piña colada', '18'), row(3, 'Café', '6,5'), row(4, 'Ceviche', '35'), row(5, 'Chicha', '8')];

  it('searches every column without caring about accents or case', () => {
    expect(foldForSearch('Piña CAFÉ')).toBe('pina cafe');
    const page = createCsvIndex(rows).query({ page: 1, pageSize: 10, search: 'PINA', sort: null });

    expect(page.rows.map(({ line }) => line)).toEqual([2]);
    expect(page.matchCount).toBe(1);
  });

  it('sorts only the rows the search kept, and texts that read the same keep their file order', () => {
    const cafes = [row(2, 'cafe', '3'), row(3, 'arroz', '1'), row(4, 'Café', '2'), row(5, 'CAFE', '1')];
    const index = createCsvIndex(cafes);
    const lines = (sort: { column: number; direction: 'asc' | 'desc' }) =>
      index.query({ page: 1, pageSize: 10, search: 'caf', sort }).rows.map(({ line }) => line);

    expect(lines({ column: 1, direction: 'asc' })).toEqual([5, 4, 2]);
    expect(lines({ column: 0, direction: 'asc' })).toEqual([2, 4, 5]);
    expect(lines({ column: 0, direction: 'desc' })).toEqual([2, 4, 5]);
    const everyRow = index.query({ page: 1, pageSize: 10, search: '', sort: { column: 0, direction: 'desc' } });
    expect(everyRow.rows.map(({ line }) => line)).toEqual([2, 4, 5, 3]);
  });

  it('sorts and pages, clamping a page past the end to the last one', () => {
    const index = createCsvIndex(rows);
    const byPrice = { column: 1, direction: 'asc' as const };

    expect(index.query({ page: 1, pageSize: 3, search: '', sort: byPrice }).rows.map((r) => r.cells[1])).toEqual([
      '6,5',
      '8',
      '18',
    ]);
    expect(index.query({ page: 9, pageSize: 3, search: '', sort: byPrice })).toEqual({
      matchCount: 4,
      page: 2,
      rows: [rows[2]],
    });
  });
});
