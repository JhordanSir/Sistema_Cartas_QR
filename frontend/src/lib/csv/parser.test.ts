/**
 * @jest-environment node
 */
import { type CsvDelimiter, type CsvRecord, createCsvParser } from './parser';

/** Feeds the text in pieces of `size` characters, to cross every boundary. */
function parse(text: string, delimiter: CsvDelimiter = ',', size = text.length): CsvRecord[] {
  const records: CsvRecord[] = [];
  const parser = createCsvParser(delimiter, (record) => records.push(record));
  for (let start = 0; start < text.length; start += size) parser.push(text.slice(start, start + size));
  parser.end();
  return records;
}

describe('createCsvParser', () => {
  it('splits records and fields, with the line each record starts on', () => {
    expect(parse('nombre,precio\nCeviche,35\nChicha,8')).toEqual([
      { cells: ['nombre', 'precio'], line: 1 },
      { cells: ['Ceviche', '35'], line: 2 },
      { cells: ['Chicha', '8'], line: 3 },
    ]);
  });

  it('reads quoted fields with delimiters, escaped quotes and line breaks', () => {
    const text = 'plato,nota\n"Ceviche, mixto","dice ""picante""\ny frío"\nChicha,ok\n';

    expect(parse(text)).toEqual([
      { cells: ['plato', 'nota'], line: 1 },
      { cells: ['Ceviche, mixto', 'dice "picante"\ny frío'], line: 2 },
      { cells: ['Chicha', 'ok'], line: 4 },
    ]);
  });

  it('gives the same records whatever the size of the pieces', () => {
    const text = 'a;b\r\n"x\r\ny";"z"\r\n\r\n1;"2"""\r\n';
    const whole = parse(text, ';');

    for (const size of [1, 2, 3, 5]) expect(parse(text, ';', size)).toEqual(whole);
    expect(whole).toEqual([
      { cells: ['a', 'b'], line: 1 },
      { cells: ['x\r\ny', 'z'], line: 2 },
      { cells: ['1', '2"'], line: 5 },
    ]);
  });

  it('skips blank lines and keeps empty fields', () => {
    expect(parse('a,b\n\n,\n\nc,\n')).toEqual([
      { cells: ['a', 'b'], line: 1 },
      { cells: ['', ''], line: 3 },
      { cells: ['c', ''], line: 5 },
    ]);
  });

  it('accepts tabs, and a stray quote inside unquoted text', () => {
    expect(parse('pulgadas\tnota\n12"\tok', '\t')).toEqual([
      { cells: ['pulgadas', 'nota'], line: 1 },
      { cells: ['12"', 'ok'], line: 2 },
    ]);
  });

  it('keeps a CR that closes a quoted field from eating the next line break', () => {
    expect(parse('"a\r"\nb', ',', 1)).toEqual([
      { cells: ['a\r'], line: 1 },
      { cells: ['b'], line: 3 },
    ]);
  });

  it('keeps an unterminated quoted field until the end of the file', () => {
    expect(parse('a\n"sin cerrar,\nfin')).toEqual([
      { cells: ['a'], line: 1 },
      { cells: ['sin cerrar,\nfin'], line: 2 },
    ]);
  });
});
