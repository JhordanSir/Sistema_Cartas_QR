/**
 * @jest-environment node
 */
import { detectDelimiter, detectEncoding } from './detect';

describe('detectEncoding', () => {
  it('reads valid UTF-8 as UTF-8, even with a character cut at the end of the sample', () => {
    const bytes = new TextEncoder().encode('nombre;precio\nPiña;18\n');
    expect(detectEncoding(bytes)).toBe('utf-8');

    const cut = new TextEncoder().encode('Piña');
    expect(detectEncoding(cut.subarray(0, cut.length - 2))).toBe('utf-8');
  });

  it('falls back to Windows-1252 for an Excel CSV saved in Spanish', () => {
    // "Piña" in Windows-1252: ñ is the single byte 0xF1, invalid on its own in UTF-8.
    expect(detectEncoding(Uint8Array.from([0x50, 0x69, 0xf1, 0x61, 0x0a]))).toBe('windows-1252');
  });
});

describe('detectDelimiter', () => {
  it('finds commas, semicolons and tabs', () => {
    expect(detectDelimiter('a,b,c\n1,2,3\n4,5,6\n')).toBe(',');
    expect(detectDelimiter('a;b;c\n1;2;3\n4;5;6\n')).toBe(';');
    expect(detectDelimiter('a\tb\n1\t2\n')).toBe('\t');
  });

  it('is not fooled by decimal commas in a semicolon file', () => {
    expect(detectDelimiter('producto;precio;peso\nCeviche;35,50;0,4\nChicha;8;1,2\nCausa;22,90;0,3\n')).toBe(';');
  });

  it('ignores delimiters inside quoted fields and a cut last line', () => {
    expect(detectDelimiter('nombre;nota\n"a, b, c";x\n"d, e";y\nf;"g, h, i, j, k, l, m')).toBe(';');
  });

  it('falls back to comma when nothing splits', () => {
    expect(detectDelimiter('una sola columna\notra fila\n')).toBe(',');
  });
});
