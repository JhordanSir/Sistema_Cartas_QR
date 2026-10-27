import { act, fireEvent, render, screen, within } from '@testing-library/react';

import type { NdjsonLine } from '@/lib/ndjson';

import { ProductStreamViewer } from './product-stream-viewer';

const replace = jest.fn();
const router = { refresh: jest.fn(), replace };

jest.mock('next/navigation', () => ({
  useRouter: () => router,
}));

const readNdjson = jest.fn();
jest.mock('@/lib/ndjson', () => ({
  readNdjson: (body: unknown) => readNdjson(body) as unknown,
}));

const RESTAURANT_ID = '33333333-3333-4333-8333-333333333333';
const profile = { id: RESTAURANT_ID, name: 'Mesa Norte', slug: 'mesa-norte', status: 'ENABLED' };

function product(position: number, name: string, overrides: Record<string, unknown> = {}) {
  const value = {
    basePrice: '35.00',
    category: { id: 'starters', name: 'Entradas' },
    description: null,
    extras: [],
    hasImage: false,
    id: `product-${position}`,
    isAvailable: true,
    name,
    position,
    updatedAt: '2026-10-26T12:00:00.000Z',
    variants: [],
    ...overrides,
  };
  return { line: JSON.stringify(value), value };
}

/** A promise the test resolves when it wants the next object to "arrive". */
function gate() {
  let open = () => undefined as void;
  const promise = new Promise<void>((resolve) => {
    open = resolve;
  });
  return { open, promise };
}

let fetchMock: jest.Mock;

function streamRequest(): [string, RequestInit] {
  const call = fetchMock.mock.calls.find(([url]) => String(url).includes('/products/stream'));
  if (!call) throw new Error('The stream was never requested');
  return call as [string, RequestInit];
}

beforeEach(() => {
  replace.mockClear();
  readNdjson.mockReset();
  fetchMock = jest.fn().mockImplementation((url: string) =>
    Promise.resolve(
      url === '/api/owner/restaurants'
        ? ({ json: () => Promise.resolve([profile]), ok: true, status: 200 } as unknown as Response)
        : ({ body: {}, ok: true, status: 200 } as unknown as Response),
    ),
  );
  global.fetch = fetchMock;
});

describe('ProductStreamViewer', () => {
  it('shows each product as it arrives, with its raw NDJSON line', async () => {
    const second = gate();
    const ceviche = product(1, 'Ceviche clásico');
    readNdjson.mockImplementation(async function* (): AsyncGenerator<NdjsonLine<unknown>> {
      yield ceviche;
      await second.promise;
      yield product(2, 'Chicha morada', { isAvailable: false, variants: [{}, {}] });
    });
    render(<ProductStreamViewer />);

    fireEvent.click(await screen.findByRole('button', { name: 'Iniciar stream' }));

    const list = await screen.findByRole('list', { name: 'Productos recibidos' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(1);
    expect(within(list).getByText('Objeto 1')).toBeVisible();
    expect(within(list).getByLabelText('Línea NDJSON tal como llegó')).toHaveTextContent(ceviche.line);
    expect(screen.getByTestId('stream-received')).toHaveTextContent('1');
    expect(screen.getByRole('status')).toHaveTextContent('Recibiendo…');

    await act(async () => second.open());

    expect(within(list).getAllByRole('listitem')).toHaveLength(2);
    expect(within(list).getByText('Oculto al comensal')).toBeVisible();
    expect(within(list).getByText('· 2 opciones')).toBeVisible();
    expect(screen.getByRole('status')).toHaveTextContent('Completo');
    expect(screen.getByRole('button', { name: 'Repetir stream' })).toBeEnabled();
    expect(streamRequest()[0]).toBe(`/api/owner/restaurants/${RESTAURANT_ID}/menu/products/stream?delayMs=250`);
  });

  it('sends the chosen pause and cuts the download on Detener', async () => {
    readNdjson.mockImplementation(async function* (): AsyncGenerator<NdjsonLine<unknown>> {
      yield product(1, 'Ceviche clásico');
      const { signal } = streamRequest()[1];
      await new Promise((_resolve, reject) => {
        signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
      });
    });
    render(<ProductStreamViewer />);
    fireEvent.change(await screen.findByRole('combobox', { name: /Pausa entre objetos/ }), {
      target: { value: '0' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Iniciar stream' }));
    await screen.findByText('Objeto 1');
    fireEvent.click(screen.getByRole('button', { name: 'Detener' }));

    expect(await screen.findByText('Detenido')).toBeVisible();
    expect(streamRequest()[0]).toContain('?delayMs=0');
    expect(streamRequest()[1].signal?.aborted).toBe(true);
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
  });

  it('says so when the stream is cut before the end', async () => {
    readNdjson.mockImplementation(async function* (): AsyncGenerator<NdjsonLine<unknown>> {
      yield product(1, 'Ceviche clásico');
      await Promise.resolve();
      throw new TypeError('network error');
    });
    render(<ProductStreamViewer />);

    fireEvent.click(await screen.findByRole('button', { name: 'Iniciar stream' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'El stream se cortó antes de terminar. Vuelve a intentarlo.',
    );
    expect(screen.getByRole('status')).toHaveTextContent('Interrumpido');
  });

  it('shows the product photo from the owner image route', async () => {
    readNdjson.mockImplementation(async function* (): AsyncGenerator<NdjsonLine<unknown>> {
      yield await Promise.resolve(product(1, 'Lomo saltado', { hasImage: true }));
    });
    const { container } = render(<ProductStreamViewer />);

    fireEvent.click(await screen.findByRole('button', { name: 'Iniciar stream' }));
    await screen.findByText('Lomo saltado');

    expect(container.querySelector('li img')).toHaveAttribute(
      'src',
      `/api/owner/restaurants/${RESTAURANT_ID}/menu/products/product-1/image?v=2026-10-26T12%3A00%3A00.000Z`,
    );
  });

  it('sends an owner whose session expired back to the login', async () => {
    fetchMock.mockImplementation((url: string) =>
      Promise.resolve(
        url === '/api/owner/restaurants'
          ? ({ json: () => Promise.resolve([profile]), ok: true, status: 200 } as unknown as Response)
          : ({ ok: false, status: 401 } as unknown as Response),
      ),
    );
    render(<ProductStreamViewer />);

    fireEvent.click(await screen.findByRole('button', { name: 'Iniciar stream' }));

    await act(async () => Promise.resolve());
    expect(replace).toHaveBeenCalledWith('/admin/login');
    expect(readNdjson).not.toHaveBeenCalled();
  });
});
