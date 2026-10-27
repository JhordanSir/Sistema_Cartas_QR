import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { MenuDigitizer } from './menu-digitizer';

const replace = jest.fn();
const refresh = jest.fn();
const router = { replace, refresh };

jest.mock('next/navigation', () => ({
  useRouter: () => router,
}));

const profile = {
  address: null,
  contactPhone: null,
  facebookUrl: null,
  id: '33333333-3333-4333-8333-333333333333',
  instagramUrl: null,
  logoPath: null,
  name: 'Mesa Norte',
  slug: 'mesa-norte',
  status: 'ENABLED',
  tiktokUrl: null,
  updatedAt: '2026-08-26T18:00:00.000Z',
  whatsapp: null,
};

const emptyMenu = {
  categories: [],
  publication: { hasPublishedMenu: false, hasUnpublishedChanges: false, publishedAt: null },
  restaurantId: profile.id,
  style: { backgroundColor: '#ffffff', fontFamily: 'Inter', textColor: '#111827' },
  template: 'ORIGINAL' as const,
  updatedAt: '2026-08-26T18:00:00.000Z',
};

const draftMenu = {
  ...emptyMenu,
  publication: { hasPublishedMenu: false, hasUnpublishedChanges: true, publishedAt: null },
  categories: [
    {
      id: 'category-1',
      name: 'Fondos',
      products: [
        {
          basePrice: '28.00',
          description: 'Con papas y arroz',
          extras: [],
          id: 'product-1',
          imagePath: null,
          isAvailable: true,
          name: 'Lomo Salatado',
          variants: [],
        },
      ],
    },
  ],
};

const publishedMenu = {
  ...draftMenu,
  publication: { hasPublishedMenu: true, hasUnpublishedChanges: false, publishedAt: '2026-08-26T18:00:00.000Z' },
};

const PROGRESS_ID = '44444444-4444-4444-8444-444444444444';

/**
 * Stands in for the browser's WebSocket. By default it fails right away, as when the
 * socket is unavailable; a test that wants live progress drives it by hand.
 */
class FakeWebSocket extends EventTarget {
  static autoFail = true;
  static instances: FakeWebSocket[] = [];
  readonly sent: unknown[] = [];
  closed = false;

  constructor(readonly url: string) {
    super();
    FakeWebSocket.instances.push(this);
    if (FakeWebSocket.autoFail) queueMicrotask(() => this.close(1006));
  }

  send(data: string): void {
    this.sent.push(JSON.parse(data));
  }

  close(code = 1000): void {
    if (this.closed) return;
    this.closed = true;
    this.dispatchEvent(Object.assign(new Event('close'), { code }));
  }

  open(): void {
    this.dispatchEvent(new Event('open'));
  }

  receive(message: unknown): void {
    this.dispatchEvent(Object.assign(new Event('message'), { data: JSON.stringify(message) }));
  }
}

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((settle) => {
    resolve = settle;
  });
  return { promise, resolve };
}

function lastSocket(): FakeWebSocket {
  const socket = FakeWebSocket.instances.at(-1);
  if (!socket) throw new Error('No WebSocket was opened');
  return socket;
}

async function choosePhotoAndDigitize(): Promise<void> {
  const photoInput = await screen.findByLabelText('Fotos de la carta');
  fireEvent.change(photoInput, {
    target: { files: [new File([new Uint8Array([137, 80, 78, 71])], 'carta.png', { type: 'image/png' })] },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Digitalizar en borrador' }));
}

function digitizeCall(): [RequestInfo | URL, RequestInit | undefined] | undefined {
  return (global.fetch as jest.Mock).mock.calls.find(([input]) => String(input).endsWith('/menu/digitize'));
}

// Each test walks the whole screen (load, digitize, publish, edit). With every suite
// running in parallel it regularly needs more than Jest's default 5 s.
jest.setTimeout(15_000);

describe('MenuDigitizer', () => {
  beforeEach(() => {
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: jest.fn().mockReturnValue('blob:menu-photo'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: jest.fn(),
    });
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
      configurable: true,
      value() { this.open = true; },
    });
    Object.defineProperty(HTMLDialogElement.prototype, 'close', {
      configurable: true,
      value() { this.open = false; },
    });
    FakeWebSocket.autoFail = true;
    FakeWebSocket.instances = [];
    Object.defineProperty(globalThis, 'WebSocket', { configurable: true, value: FakeWebSocket, writable: true });
    Object.defineProperty(globalThis.crypto, 'randomUUID', { configurable: true, value: () => PROGRESS_ID });
    global.fetch = jest.fn(async (input, init) => {
      const url = String(input);
      if (url === '/api/owner/restaurants') return apiResponse([profile]);
      if (url.endsWith('/menu/digitize') && init?.method === 'POST') return apiResponse(draftMenu);
      if (url.endsWith('/menu/publish') && init?.method === 'POST') return apiResponse(publishedMenu);
      if (url.endsWith('/menu/template') && init?.method === 'POST') {
        return apiResponse({
          ...draftMenu,
          style: { backgroundColor: '#F1F7F0', fontFamily: 'Nunito', textColor: '#20382D' },
          template: 'CASUAL',
        });
      }
      if (init?.method === 'PATCH') {
        return apiResponse({
          ...draftMenu,
          publication: { hasPublishedMenu: true, hasUnpublishedChanges: true, publishedAt: '2026-08-26T18:00:00.000Z' },
          categories: [
            {
              ...draftMenu.categories[0]!,
              products: [{ ...draftMenu.categories[0]!.products[0]!, name: 'Lomo Saltado' }],
            },
          ],
        });
      }
      return apiResponse(emptyMenu);
    }) as jest.Mock;
  });

  it('keeps a digitized menu as a draft until the owner explicitly publishes it', async () => {
    render(<MenuDigitizer />);

    expect(await screen.findByRole('heading', { name: 'Prepara la próxima versión de tu carta.' })).toBeVisible();
    expect(await screen.findByText('Aún no hay una carta publicada. Tu QR mostrará Próximamente.')).toBeVisible();
    const photoInput = await screen.findByLabelText('Fotos de la carta');
    const photo = new File([new Uint8Array([137, 80, 78, 71])], 'carta.png', {
      type: 'image/png',
    });
    fireEvent.change(photoInput, {
      target: { files: [photo] },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Digitalizar en borrador' }));

    expect((await screen.findAllByText('Lomo Salatado')).length).toBeGreaterThan(0);
    expect(
      screen.getByText('Carta digitalizada: 1 sección y 1 producto. Revísala y publícala cuando esté lista.'),
    ).toBeVisible();
    expect(screen.getByText('Hay cambios en borrador. La carta pública conserva su versión anterior.')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Publicar carta' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Sí, publicar carta' }));
    expect(await screen.findByText('La carta pública se actualizó. El QR sigue siendo el mismo.')).toBeVisible();
    expect(screen.getByText('La carta pública está al día')).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Editar Lomo Salatado' }));
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Lomo Saltado' } });
    fireEvent.submit(screen.getByRole('form', { name: 'Editar Lomo Salatado' }));

    await waitFor(() => expect(screen.getAllByText('Lomo Saltado').length).toBeGreaterThan(0));
    expect(screen.getByText('Producto actualizado en el borrador.')).toBeVisible();
    expect(screen.getByText('Hay cambios en borrador. La carta pública conserva su versión anterior.')).toBeVisible();
  });

  it('creates the first section from an empty menu', async () => {
    (global.fetch as jest.Mock).mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === '/api/owner/restaurants') return apiResponse([profile]);
      if (url.endsWith('/menu/categories') && init?.method === 'POST') {
        return apiResponse({
          ...emptyMenu,
          categories: [{ id: 'category-1', name: 'Entradas', products: [] }],
        });
      }
      return apiResponse(emptyMenu);
    });
    render(<MenuDigitizer />);

    await screen.findByText('Crea la primera sección para empezar tu carta.');
    fireEvent.click(screen.getByRole('button', { name: '+ Nueva sección' }));
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Entradas' } });
    fireEvent.submit(screen.getByRole('form', { name: 'Nueva sección' }));

    expect(await screen.findByRole('heading', { name: 'Entradas' })).toBeVisible();
    expect(screen.getByText('Sección creada en el borrador.')).toBeVisible();
  });

  it('shows the stages the API pushes over the WebSocket', async () => {
    const digitized = deferred<Response>();
    const defaultFetch = (global.fetch as jest.Mock).getMockImplementation();
    (global.fetch as jest.Mock).mockImplementation((input: RequestInfo | URL, init?: RequestInit) =>
      String(input).endsWith('/menu/digitize') ? digitized.promise : defaultFetch?.(input, init),
    );
    FakeWebSocket.autoFail = false;
    render(<MenuDigitizer />);

    await choosePhotoAndDigitize();
    await waitFor(() => expect(FakeWebSocket.instances).toHaveLength(1));
    const socket = lastSocket();
    expect(socket.url).toBe('ws://localhost/api/realtime');
    act(() => socket.open());
    expect(socket.sent).toEqual([
      { data: { progressId: PROGRESS_ID, restaurantId: profile.id, topic: 'digitization' }, event: 'subscribe' },
    ]);
    // The request only leaves once the page listens, and carries the id the API publishes to.
    expect(digitizeCall()).toBeUndefined();
    act(() => socket.receive({ data: { progressId: PROGRESS_ID }, event: 'subscribed' }));
    await waitFor(() => expect(digitizeCall()).toBeDefined());
    expect(digitizeCall()?.[1]?.headers).toEqual({ 'x-digitization-progress-id': PROGRESS_ID });

    const stage = await screen.findByText('Enviando tus fotos…');
    expect(screen.getByTestId('digitization-progress')).toBeInTheDocument();
    expect(screen.getByText('0 s transcurridos')).toBeVisible();
    const push = (data: object): void =>
      act(() => socket.receive({ data: { ...data, progressId: PROGRESS_ID }, event: 'digitization.progress' }));
    push({ photoCount: 1, stage: 'received' });
    expect(stage).toHaveTextContent('Foto recibida y validada.');
    push({ attempt: 1, maximumAttempts: 3, stage: 'reading' });
    expect(stage).toHaveTextContent('Gemini está leyendo tu carta…');
    push({ attempt: 1, maximumAttempts: 3, stage: 'retrying' });
    expect(stage).toHaveTextContent('Gemini no respondió. Reintentando (intento 2 de 3)…');
    push({ attempt: 2, maximumAttempts: 3, stage: 'reading' });
    expect(stage).toHaveTextContent('Gemini está leyendo tu carta (intento 2 de 3)…');
    push({ stage: 'validating' });
    expect(stage).toHaveTextContent('Validando secciones, platos y precios…');
    push({ stage: 'saving' });
    expect(stage).toHaveTextContent('Guardando el borrador…');
    // A stage meant for another digitization is ignored.
    act(() => socket.receive({ data: { progressId: 'other', stage: 'validating' }, event: 'digitization.progress' }));
    expect(stage).toHaveTextContent('Guardando el borrador…');

    digitized.resolve(apiResponse(draftMenu));
    expect(
      await screen.findByText('Carta digitalizada: 1 sección y 1 producto. Revísala y publícala cuando esté lista.'),
    ).toBeVisible();
    expect(socket.closed).toBe(true);
  });

  it('shows one generic line, never invented stages, when the socket is unavailable', async () => {
    const digitized = deferred<Response>();
    const defaultFetch = (global.fetch as jest.Mock).getMockImplementation();
    (global.fetch as jest.Mock).mockImplementation((input: RequestInfo | URL, init?: RequestInit) =>
      String(input).endsWith('/menu/digitize') ? digitized.promise : defaultFetch?.(input, init),
    );
    render(<MenuDigitizer />);

    await choosePhotoAndDigitize();

    expect(await screen.findByText('Gemini está leyendo tu carta…')).toBeVisible();
    expect(screen.queryByTestId('digitization-progress')).not.toBeInTheDocument();
    await waitFor(() => expect(digitizeCall()).toBeDefined());
    expect(digitizeCall()?.[1]?.headers).toBeUndefined();
    digitized.resolve(apiResponse(draftMenu));
    expect(await screen.findAllByText('Lomo Salatado')).not.toHaveLength(0);
  });

  it('renews an expired session once and subscribes again', async () => {
    FakeWebSocket.autoFail = false;
    render(<MenuDigitizer />);

    await choosePhotoAndDigitize();
    await waitFor(() => expect(FakeWebSocket.instances).toHaveLength(1));
    act(() => lastSocket().close(4401));

    await waitFor(() => expect(FakeWebSocket.instances).toHaveLength(2));
    expect(global.fetch).toHaveBeenCalledWith('/api/session/status?role=OWNER', { method: 'POST' });
    const renewed = lastSocket();
    act(() => {
      renewed.open();
      renewed.receive({ data: { progressId: PROGRESS_ID }, event: 'subscribed' });
    });

    await waitFor(() => expect(digitizeCall()?.[1]?.headers).toEqual({ 'x-digitization-progress-id': PROGRESS_ID }));
  });

  it('rejects more than five files before calling the API', async () => {
    render(<MenuDigitizer />);
    const photoInput = await screen.findByLabelText('Fotos de la carta');
    const files = Array.from({ length: 6 }, (_, index) =>
      new File([new Uint8Array([137, 80, 78, 71])], `carta-${index}.png`, {
        type: 'image/png',
      }),
    );
    fireEvent.change(photoInput, { target: { files } });
    expect(screen.getByRole('alert')).toHaveTextContent('Elige entre 1 y 5 fotos');
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});

function apiResponse(body: unknown): Response {
  return {
    json: jest.fn().mockResolvedValue(body),
    ok: true,
    status: 200,
  } as unknown as Response;
}
