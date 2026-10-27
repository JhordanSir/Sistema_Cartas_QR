/**
 * @jest-environment node
 */
import { columnLetter, createCsvEngine } from './csv-engine';
import type { CsvOptions, CsvWorkerResponse } from './csv-protocol';

const AUTO: CsvOptions = { delimiter: 'auto', encoding: 'auto', header: true };

function engineWith(fetchSource?: typeof fetch) {
  const messages: CsvWorkerResponse[] = [];
  const engine = createCsvEngine((message) => messages.push(message), { fetch: fetchSource, progressEveryMs: 0 });
  return { engine, messages };
}

function ready(messages: CsvWorkerResponse[]) {
  const message = messages.find((item) => item.type === 'ready');
  if (message?.type !== 'ready') throw new Error(`No ready message: ${JSON.stringify(messages)}`);
  return message;
}

describe('columnLetter', () => {
  it('names columns like a spreadsheet', () => {
    expect([0, 1, 25, 26, 27, 701, 702].map(columnLetter)).toEqual(['A', 'B', 'Z', 'AA', 'AB', 'ZZ', 'AAA']);
  });
});

describe('createCsvEngine', () => {
  it('detects an Excel CSV in Spanish and marks the rows with another width', async () => {
    const { engine, messages } = engineWith();
    const latin1 = Buffer.from('plato;precio\r\nPiña colada;18\r\nCeviche;35,5;extra\r\nCausa\r\n', 'latin1');

    await engine.handle({ options: AUTO, source: { file: new File([latin1], 'bebidas.csv'), kind: 'file' }, type: 'open' });

    expect(ready(messages)).toMatchObject({
      columns: ['plato', 'precio'],
      delimiter: ';',
      encoding: 'windows-1252',
      rowCount: 3,
      warningCount: 2,
    });
    await engine.handle({ query: { page: 1, pageSize: 50, search: '', sort: null }, requestId: 7, type: 'query' });
    expect(messages.at(-1)).toEqual({
      page: {
        matchCount: 3,
        page: 1,
        rows: [
          { cells: ['Piña colada', '18'], found: null, line: 2 },
          { cells: ['Ceviche', '35,5'], found: 3, line: 3 },
          { cells: ['Causa', ''], found: 1, line: 4 },
        ],
      },
      requestId: 7,
      type: 'page',
    });
  });

  it('honours forced options and names the columns when there is no header', async () => {
    const { engine, messages } = engineWith();
    const file = new File(['a;b\n1;2\n'], 'datos.csv');

    await engine.handle({ options: { delimiter: ',', encoding: 'utf-8', header: false }, source: { file, kind: 'file' }, type: 'open' });

    expect(ready(messages)).toMatchObject({ columns: ['A'], delimiter: ',', encoding: 'utf-8', rowCount: 2 });
  });

  it('reports progress in bytes and rows while it reads', async () => {
    const { engine, messages } = engineWith();
    const text = `n,v\n${Array.from({ length: 5000 }, (_v, i) => `fila ${i},${i}`).join('\n')}\n`;

    await engine.handle({ options: AUTO, source: { file: new File([text], 'grande.csv'), kind: 'file' }, type: 'open' });

    const progress = messages.filter((message) => message.type === 'progress');
    expect(progress.length).toBeGreaterThan(1);
    expect(progress.at(-1)).toEqual({ bytesRead: text.length, rows: 5000, totalBytes: text.length, type: 'progress' });
    expect(ready(messages).rowCount).toBe(5000);
  });

  it('downloads the saved CSV itself and parses it as it arrives', async () => {
    const body = 'sku,nombre\n1,Ceviche\n';
    const fetchSource = jest.fn().mockResolvedValue(
      new Response(body, { headers: { 'content-length': String(body.length), 'content-type': 'text/csv' } }),
    );
    const { engine, messages } = engineWith(fetchSource);

    await engine.handle({ options: AUTO, source: { kind: 'saved', url: '/api/owner/restaurants/r/csv/content' }, type: 'open' });

    expect(fetchSource).toHaveBeenCalledWith('/api/owner/restaurants/r/csv/content', { cache: 'no-store' });
    expect(ready(messages)).toMatchObject({ columns: ['sku', 'nombre'], rowCount: 1 });
  });

  it('says why it could not open a file', async () => {
    const missing = engineWith(jest.fn().mockResolvedValue(new Response(null, { status: 404 })));
    await missing.engine.handle({ options: AUTO, source: { kind: 'saved', url: '/x' }, type: 'open' });
    expect(missing.messages).toEqual([{ reason: 'not-found', type: 'failed' }]);

    const empty = engineWith();
    await empty.engine.handle({ options: AUTO, source: { file: new File([], 'vacio.csv'), kind: 'file' }, type: 'open' });
    expect(empty.messages).toEqual([{ reason: 'empty', type: 'failed' }]);
  });

  it('ignores page requests until a file is ready', async () => {
    const { engine, messages } = engineWith();

    await engine.handle({ query: { page: 1, pageSize: 50, search: '', sort: null }, requestId: 1, type: 'query' });

    expect(messages).toEqual([]);
  });
});
