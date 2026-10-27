export interface CsvRow {
  cells: string[];
  line: number;
  /** Set when the record had another number of cells than the header. */
  found: number | null;
}

export interface CsvSort {
  column: number;
  direction: 'asc' | 'desc';
}

export interface CsvQuery {
  page: number;
  pageSize: number;
  search: string;
  sort: CsvSort | null;
}

export interface CsvPage {
  matchCount: number;
  /** The page actually returned: a query past the end gets the last one. */
  page: number;
  rows: CsvRow[];
}

const NUMBER = /^[-+]?\d+(?:[.,]\d+)?$/;
const collator = new Intl.Collator('es', { numeric: true, sensitivity: 'base' });

/** "1,5" and "1.5" are the same number; anything else is text. */
export function numericValue(cell: string): number | null {
  const trimmed = cell.trim();
  return NUMBER.test(trimmed) ? Number(trimmed.replace(',', '.')) : null;
}

/** Lower case without accents, so "pina" finds "Piña" and "cafe" finds "Café". */
export function foldForSearch(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

/**
 * Orders cells by type: numbers as numbers, text with Spanish collation, numbers
 * before text, and empty cells always last whatever the direction.
 */
export function compareCells(left: string, right: string, direction: CsvSort['direction']): number {
  const leftEmpty = left.trim() === '';
  const rightEmpty = right.trim() === '';
  if (leftEmpty || rightEmpty) return Number(leftEmpty) - Number(rightEmpty);
  const sign = direction === 'asc' ? 1 : -1;
  const leftNumber = numericValue(left);
  const rightNumber = numericValue(right);
  if (leftNumber !== null && rightNumber !== null) return sign * (leftNumber - rightNumber);
  if (leftNumber !== null) return -sign;
  if (rightNumber !== null) return sign;
  return sign * collator.compare(left, right);
}

/**
 * Keeps the filtered and sorted order of the rows between page requests, so moving
 * through pages does not search or sort again.
 */
export function createCsvIndex(rows: readonly CsvRow[]): { query(request: CsvQuery): CsvPage } {
  let folded: string[] | null = null;
  let cached: { key: string; order: number[] } | null = null;

  function order(search: string, sort: CsvSort | null): number[] {
    const key = JSON.stringify([search, sort]);
    if (cached?.key === key) return cached.order;
    let indexes = rows.map((_row, index) => index);
    const needle = foldForSearch(search.trim());
    if (needle !== '') {
      folded ??= rows.map((row) => foldForSearch(row.cells.join('\u0000')));
      const haystack = folded;
      indexes = indexes.filter((index) => (haystack[index] ?? '').includes(needle));
    }
    if (sort) {
      indexes.sort(
        (left, right) =>
          compareCells(rows[left]?.cells[sort.column] ?? '', rows[right]?.cells[sort.column] ?? '', sort.direction) ||
          left - right,
      );
    }
    cached = { key, order: indexes };
    return indexes;
  }

  return {
    query({ page, pageSize, search, sort }) {
      const indexes = order(search, sort);
      const lastPage = Math.max(1, Math.ceil(indexes.length / pageSize));
      const current = Math.min(Math.max(1, page), lastPage);
      const start = (current - 1) * pageSize;
      return {
        matchCount: indexes.length,
        page: current,
        rows: indexes.slice(start, start + pageSize).flatMap((index) => rows[index] ?? []),
      };
    },
  };
}
