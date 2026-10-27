export type CsvDelimiter = ',' | ';' | '\t';

export interface CsvRecord {
  cells: string[];
  /** The line of the file where the record starts (1-based). */
  line: number;
}

export interface CsvParser {
  /** Feeds the next piece of text; it may end anywhere, even inside a quoted field. */
  push(text: string): void;
  /** Flushes the last record once the whole file has been fed. */
  end(): void;
}

const QUOTE = 34;
const LF = 10;
const CR = 13;

const enum State {
  /** At the start of a field: a quote here opens a quoted field. */
  FieldStart,
  /** Inside an unquoted field. */
  Unquoted,
  /** Inside a quoted field, where delimiters and line breaks are text. */
  Quoted,
  /** Just read a quote inside a quoted field: either "" (a literal quote) or the end. */
  QuoteInQuoted,
}

/**
 * Incremental RFC 4180 parser. Text arrives in arbitrary pieces, so every bit of
 * state lives between calls: the field being built, whether it is quoted, a CR whose
 * LF may come in the next piece, and the line count, which also advances inside
 * quoted fields so each record knows the line it started on. Blank lines are
 * skipped, and a stray quote inside an unquoted field is kept as text.
 */
export function createCsvParser(delimiter: CsvDelimiter, onRecord: (record: CsvRecord) => void): CsvParser {
  const separator = delimiter.charCodeAt(0);
  let state = State.FieldStart;
  let field = '';
  let cells: string[] = [];
  let line = 1;
  let recordLine = 1;
  let recordStarted = false;
  let pendingCR = false;

  function endField(): void {
    cells.push(field);
    field = '';
    state = State.FieldStart;
  }

  function endRecord(): void {
    if (recordStarted) {
      endField();
      onRecord({ cells, line: recordLine });
    }
    cells = [];
    field = '';
    state = State.FieldStart;
    recordStarted = false;
  }

  function newLine(): void {
    line += 1;
    if (!recordStarted) recordLine = line;
  }

  /** Line breaks inside a quoted field still move the line count on. */
  function countBreaks(text: string, from: number, to: number): void {
    for (let index = from; index < to; index += 1) {
      const code = text.charCodeAt(index);
      if (code === LF) {
        if (!pendingCR) line += 1;
        pendingCR = false;
      } else if (code === CR) {
        line += 1;
        pendingCR = true;
      } else {
        pendingCR = false;
      }
    }
  }

  function push(text: string): void {
    const length = text.length;
    let index = 0;
    while (index < length) {
      if (state === State.Quoted) {
        const quote = text.indexOf('"', index);
        const stop = quote === -1 ? length : quote;
        countBreaks(text, index, stop);
        field += text.slice(index, stop);
        if (quote === -1) return;
        index = quote + 1;
        // A CR right before the closing quote belongs to the field, not to a CRLF.
        pendingCR = false;
        state = State.QuoteInQuoted;
        continue;
      }
      const code = text.charCodeAt(index);
      if (pendingCR && code === LF) {
        // The LF of a CRLF whose CR ended the previous record.
        pendingCR = false;
        index += 1;
        continue;
      }
      pendingCR = false;
      if (state === State.QuoteInQuoted) {
        if (code === QUOTE) {
          field += '"';
          state = State.Quoted;
          index += 1;
          continue;
        }
        // The quote closed the field; anything up to the delimiter is kept as text.
        state = State.Unquoted;
      }
      if (code === separator) {
        recordStarted = true;
        endField();
        index += 1;
        continue;
      }
      if (code === LF || code === CR) {
        endRecord();
        newLine();
        pendingCR = code === CR;
        recordLine = line;
        index += 1;
        continue;
      }
      recordStarted = true;
      if (code === QUOTE && state === State.FieldStart) {
        state = State.Quoted;
        index += 1;
        continue;
      }
      // Plain text: take everything up to the next delimiter or line break at once.
      let stop = index + 1;
      while (stop < length) {
        const next = text.charCodeAt(stop);
        if (next === separator || next === LF || next === CR) break;
        stop += 1;
      }
      field += text.slice(index, stop);
      state = State.Unquoted;
      index = stop;
    }
  }

  function end(): void {
    endRecord();
  }

  return { end, push };
}
