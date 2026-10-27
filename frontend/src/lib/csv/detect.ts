import { type CsvDelimiter, type CsvRecord, createCsvParser } from './parser';

export type CsvEncoding = 'utf-8' | 'windows-1252';

const CSV_DELIMITERS: readonly CsvDelimiter[] = [',', ';', '\t'];

/** How much of the file is looked at to guess its encoding and delimiter. */
export const DETECTION_SAMPLE_BYTES = 64 * 1024;

/**
 * UTF-8 is strict about its byte sequences; Windows-1252 (what Excel in Spanish
 * saves as "CSV") is not. If the sample is not valid UTF-8 it is read as 1252.
 * `stream: true` lets a character cut by the end of the sample pass.
 */
export function detectEncoding(sample: Uint8Array): CsvEncoding {
  try {
    new TextDecoder('utf-8', { fatal: true }).decode(sample, { stream: true });
    return 'utf-8';
  } catch {
    return 'windows-1252';
  }
}

/**
 * Parses the first records with each candidate and keeps the one that splits most of
 * them into the same number of cells (more than one). "1,5" in a semicolon file
 * splits on commas too, but not consistently, so it loses.
 */
export function detectDelimiter(sampleText: string): CsvDelimiter {
  let best: { delimiter: CsvDelimiter; score: number; width: number } = { delimiter: ',', score: 0, width: 0 };
  for (const delimiter of CSV_DELIMITERS) {
    const records: CsvRecord[] = [];
    const parser = createCsvParser(delimiter, (record) => {
      if (records.length < 20) records.push(record);
    });
    // The sample may end mid-record: only whole lines are compared.
    const lastBreak = Math.max(sampleText.lastIndexOf('\n'), sampleText.lastIndexOf('\r'));
    parser.push(lastBreak === -1 ? sampleText : sampleText.slice(0, lastBreak + 1));
    parser.end();
    const widths = new Map<number, number>();
    for (const { cells } of records) widths.set(cells.length, (widths.get(cells.length) ?? 0) + 1);
    let modeWidth = 0;
    let modeCount = 0;
    for (const [width, count] of widths) {
      if (count > modeCount || (count === modeCount && width > modeWidth)) {
        modeWidth = width;
        modeCount = count;
      }
    }
    const score = modeWidth > 1 ? modeCount : 0;
    if (score > best.score || (score === best.score && score > 0 && modeWidth > best.width)) {
      best = { delimiter, score, width: modeWidth };
    }
  }
  return best.delimiter;
}
