import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import type { CsvWorkerRequest, CsvWorkerResponse } from './csv-protocol';
import { CsvViewer } from './csv-viewer';

const replace = jest.fn();
// Stable like Next's own router: effects that depend on it must not re-run each render.
const router = { refresh: jest.fn(), replace };

jest.mock('next/navigation', () => ({
  useRouter: () => router,
}));

/** Stands in for the Web Worker: records what the page asks and lets the test answer. */
class FakeWorker {
  readonly posted: CsvWorkerRequest[] = [];
  terminated = false;
  private readonly listeners: Array<(event: { data: CsvWorkerResponse }) => void> = [];

  addEventListener(type: string, listener: (event: { data: CsvWorkerResponse }) => void): void {
    if (type === 'message') this.listeners.push(listener);
  }

  postMessage(message: CsvWorkerRequest): void {
    this.posted.push(message);
  }

  terminate(): void {
    this.terminated = true;
  }

  answer(data: CsvWorkerResponse): void {
    act(() => this.listeners.forEach((listener) => listener({ data })));
  }

  lastQuery(): Extract<CsvWorkerRequest, { type: 'query' }> {
    const query = this.posted.filter((message) => message.type === 'query').at(-1);
    if (!query || query.type !== 'query') throw new Error('No query was posted');
    return query;
  }
}

const workers: FakeWorker[] = [];
jest.mock('./create-csv-worker', () => ({
  createCsvWorker: () => {
    const worker = new FakeWorker();
    workers.push(worker);
    return worker;
  },
}));

const RESTAURANT_ID = '33333333-3333-4333-8333-333333333333';
const profile = { id: RESTAURANT_ID, name: 'Mesa Norte', slug: 'mesa-norte', status: 'ENABLED' };
const savedInfo = { originalName: 'carta.csv', sizeBytes: 2048, uploadedAt: '2026-10-27T15:00:00.000Z' };

function json(body: unknown, status = 200): Response {
  return { json: () => Promise.resolve(body), ok: status < 400, status } as unknown as Response;
}

let fetchMock: jest.Mock;

function serve({ saved }: { saved: boolean }): void {
  fetchMock = jest.fn().mockImplementation((url: string, init?: RequestInit) => {
    if (url === '/api/owner/restaurants') return Promise.resolve(json([profile]));
    if (url === `/api/owner/restaurants/${RESTAURANT_ID}/csv` && init?.method === 'PUT') {
      return Promise.resolve(json({ ...savedInfo, originalName: 'nueva.csv' }));
    }
    if (url === `/api/owner/restaurants/${RESTAURANT_ID}/csv`) {
      return Promise.resolve(saved ? json(savedInfo) : json({ code: 'CSV_FILE_NOT_FOUND' }, 404));
    }
    return Promise.reject(new Error(`Unexpected ${url}`));
  });
  global.fetch = fetchMock;
}

const READY: CsvWorkerResponse = {
  columns: ['plato', 'precio'],
  delimiter: ';',
  elapsedMs: 12,
  encoding: 'windows-1252',
  rowCount: 3,
  type: 'ready',
  warningCount: 1,
};

function answerPage(worker: FakeWorker): void {
  worker.answer({
    page: {
      matchCount: 3,
      page: 1,
      rows: [
        { cells: ['Piña colada', '18'], found: null, line: 2 },
        { cells: ['Ceviche', '35,5'], found: 3, line: 3 },
        { cells: ['Causa', '22'], found: null, line: 4 },
      ],
    },
    requestId: worker.lastQuery().requestId,
    type: 'page',
  });
}

async function chooseFile(file: File): Promise<void> {
  const input = await screen.findByTestId('csv-file-input');
  fireEvent.change(input, { target: { files: [file] } });
}

beforeEach(() => {
  workers.length = 0;
  replace.mockClear();
});

describe('CsvViewer', () => {
  it('opens the saved CSV on entry and shows the rows the worker sends', async () => {
    serve({ saved: true });
    render(<CsvViewer />);

    await waitFor(() => expect(workers[0]?.posted[0]).toBeDefined());
    const worker = workers[0]!;
    expect(worker.posted[0]).toEqual({
      options: { delimiter: 'auto', encoding: 'auto', header: true },
      source: { kind: 'saved', url: `/api/owner/restaurants/${RESTAURANT_ID}/csv/content` },
      type: 'open',
    });
    worker.answer({ bytesRead: 1024, rows: 3, totalBytes: 2048, type: 'progress' });
    expect(screen.getByRole('progressbar', { name: 'Leyendo el archivo' })).toHaveAttribute('aria-valuenow', '50');
    expect(screen.getByText('3 filas leídas · 50 %')).toBeVisible();

    worker.answer(READY);
    expect(worker.lastQuery().query).toEqual({ page: 1, pageSize: 50, search: '', sort: null });
    answerPage(worker);

    const table = screen.getByRole('table', { name: 'Contenido del CSV' });
    expect(within(table).getAllByRole('row')).toHaveLength(4);
    expect(within(table).getByRole('img', { name: '3 columnas, se esperaban 2' })).toBeVisible();
    expect(screen.getByText('Avisos: 1 fila con otra cantidad de columnas, resaltado en la tabla.')).toBeVisible();
    expect(screen.getByTestId('csv-source')).toHaveTextContent(/^Guardado: carta\.csv · 2 KB · /);
    expect(screen.getByRole('combobox', { name: 'Separador' })).toHaveDisplayValue('Automático (punto y coma)');
    expect(screen.getByRole('combobox', { name: 'Codificación' })).toHaveDisplayValue('Automática (Windows-1252)');
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled();
  });

  it('reads a chosen file, sorts by a column and saves it after confirming the replacement', async () => {
    serve({ saved: true });
    render(<CsvViewer />);
    await waitFor(() => expect(workers[0]?.posted).toHaveLength(1));
    const worker = workers[0]!;
    const file = new File(['plato;precio\nCeviche;35\n'], 'nueva.csv', { type: 'text/csv' });

    await chooseFile(file);
    expect(worker.posted.at(-1)).toEqual({
      options: { delimiter: 'auto', encoding: 'auto', header: true },
      source: { file, kind: 'file' },
      type: 'open',
    });
    expect(screen.getByTestId('csv-source')).toHaveTextContent('Sin guardar: nueva.csv · 1 KB');
    worker.answer(READY);
    answerPage(worker);

    fireEvent.click(screen.getByRole('button', { name: 'Ordenar por precio' }));
    expect(worker.lastQuery().query.sort).toEqual({ column: 1, direction: 'asc' });
    fireEvent.click(screen.getByRole('button', { name: 'Ordenar por precio' }));
    expect(worker.lastQuery().query.sort).toEqual({ column: 1, direction: 'desc' });

    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(screen.getByText('El archivo guardado «carta.csv» se reemplazará por el que ves en pantalla. No se puede deshacer.')).toBeVisible();
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Reemplazar' })));

    const [url, init] = fetchMock.mock.calls.find(([, options]) => (options as RequestInit | undefined)?.method === 'PUT') as [
      string,
      RequestInit,
    ];
    expect(url).toBe(`/api/owner/restaurants/${RESTAURANT_ID}/csv`);
    const sent = (init.body as FormData).get('file') as File;
    expect([sent.name, sent.size]).toEqual(['nueva.csv', file.size]);
    expect(await screen.findByText('Guardado: «nueva.csv» es ahora el CSV de tu restaurante.')).toBeVisible();
  });

  it('re-reads the same file with the separator the owner corrects', async () => {
    serve({ saved: false });
    render(<CsvViewer />);
    const file = new File(['a;b\n1;2\n'], 'datos.csv');
    await chooseFile(file);
    const worker = workers[0]!;
    worker.answer(READY);

    fireEvent.change(screen.getByRole('combobox', { name: 'Separador' }), { target: { value: ',' } });

    expect(worker.posted.at(-1)).toEqual({
      options: { delimiter: ',', encoding: 'auto', header: true },
      source: { file, kind: 'file' },
      type: 'open',
    });
  });

  it('cancels a reading by ending the worker', async () => {
    serve({ saved: false });
    render(<CsvViewer />);
    await chooseFile(new File(['a,b\n'], 'datos.csv'));
    const worker = workers[0]!;

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(worker.terminated).toBe(true);
    expect(screen.getByText('Lectura cancelada. Vuelve a elegir el archivo para verlo.')).toBeVisible();
  });

  it('refuses a file over 20 MB before reading it', async () => {
    serve({ saved: false });
    render(<CsvViewer />);
    const file = new File(['x'], 'enorme.csv');
    Object.defineProperty(file, 'size', { value: 20 * 1024 * 1024 + 1 });

    await chooseFile(file);

    expect(screen.getByRole('alert')).toHaveTextContent('El CSV puede pesar hasta 20 MB.');
    expect(workers).toHaveLength(0);
  });
});
