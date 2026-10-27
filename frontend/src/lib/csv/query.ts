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

/** What a cell is worth when sorting, worked out once instead of on every comparison. */
interface SortKey {
  empty: boolean;
  number: number | null;
  /** The text's place in Spanish order among the cells being sorted; equal texts share it. */
  rank: number;
}

/**
 * Collation is the slow part of sorting text, so each distinct text is ranked once
 * and two rows then compare two numbers. Texts the collator finds equal ("Café" and
 * "cafe") share a rank, so they keep their order in the file.
 */
function sortKeys(cells: readonly string[]): SortKey[] {
  const keys: SortKey[] = [];
  const texts = new Set<string>();
  for (const cell of cells) {
    const key = { empty: cell.trim() === '', number: numericValue(cell), rank: 0 };
    if (!key.empty && key.number === null) texts.add(cell);
    keys.push(key);
  }
  const ranks = new Map<string, number>();
  let rank = 0;
  let previous: string | null = null;
  for (const text of [...texts].sort(collator.compare)) {
    if (previous !== null && collator.compare(previous, text) !== 0) rank += 1;
    ranks.set(text, rank);
    previous = text;
  }
  keys.forEach((key, position) => {
    key.rank = ranks.get(cells[position] ?? '') ?? 0;
  });
  return keys;
}

/**
 * Orders by type: numbers as numbers, text with Spanish collation, numbers before
 * text, and empty cells always last whatever the direction.
 */
function compareKeys(left: SortKey, right: SortKey, direction: CsvSort['direction']): number {
  if (left.empty || right.empty) return Number(left.empty) - Number(right.empty);
  const sign = direction === 'asc' ? 1 : -1;
  if (left.number !== null && right.number !== null) return sign * (left.number - right.number);
  if (left.number !== null) return -sign;
  if (right.number !== null) return sign;
  return sign * (left.rank - right.rank);
}

export function compareCells(left: string, right: string, direction: CsvSort['direction']): number {
  const [leftKey, rightKey] = sortKeys([left, right]);
  return leftKey && rightKey ? compareKeys(leftKey, rightKey, direction) : 0;
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
      const matching = indexes;
      const keys = sortKeys(matching.map((index) => rows[index]?.cells[sort.column] ?? ''));
      // Positions in `matching`, which is in file order: ties keep the file's order.
      const positions = matching.map((_index, position) => position);
      positions.sort((left, right) => {
        const leftKey = keys[left];
        const rightKey = keys[right];
        return (leftKey && rightKey ? compareKeys(leftKey, rightKey, sort.direction) : 0) || left - right;
      });
      indexes = positions.flatMap((position) => matching[position] ?? []);
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
