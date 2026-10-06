import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

const directApiUrl = process.env.E2E_DIRECT_API_URL ?? 'http://127.0.0.1:3001/api';
const webUrl = process.env.E2E_WEB_URL ?? 'http://127.0.0.1:3000';
const realtimeUrl = `${webUrl.replace(/^http/, 'ws')}/api/realtime`;

interface CreatedRestaurant {
  id: string;
  slug: string;
}

interface SocketOutcome {
  closeCode: number;
  messages: unknown[];
}

async function adminToken(request: APIRequestContext): Promise<string> {
  const email = process.env.INITIAL_ADMIN_EMAIL;
  const password = process.env.INITIAL_ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error('Initial administrator credentials are required for E2E');
  }
  const response = await request.post(`${directApiUrl}/auth/login`, {
    data: { email, password, role: 'ADMIN' },
  });
  expect(response.ok()).toBe(true);
  return ((await response.json()) as { accessToken: string }).accessToken;
}

async function createRestaurant(
  request: APIRequestContext,
  label: string,
  password: string,
): Promise<CreatedRestaurant & { email: string }> {
  const suffix = `${Date.now()}-${label}`;
  const email = `ws-${suffix}@example.test`;
  const created = await request.post(`${directApiUrl}/backoffice/restaurants`, {
    data: { email, initialPassword: password, name: `Bistró Socket ${suffix}` },
    headers: { authorization: `Bearer ${await adminToken(request)}` },
  });
  expect(created.ok()).toBe(true);
  return { ...((await created.json()) as CreatedRestaurant), email };
}

async function deleteRestaurant(request: APIRequestContext, restaurant: CreatedRestaurant): Promise<void> {
  await request.delete(`${directApiUrl}/backoffice/restaurants/${restaurant.id}`, {
    data: {
      acknowledgePermanentDeletion: true,
      confirmationText: `ELIMINAR ${restaurant.slug}`,
    },
    headers: { authorization: `Bearer ${await adminToken(request)}` },
  });
}

/** Signs in through the BFF, which leaves the HttpOnly session cookies in the page's context. */
async function signInOwner(page: Page, email: string, password: string): Promise<void> {
  const response = await page.request.post(`${webUrl}/api/session/login`, {
    data: { email, password, role: 'OWNER' },
    headers: { origin: webUrl },
  });
  expect(response.ok()).toBe(true);
  await page.goto(`${webUrl}/health`);
}

/** Opens the socket from the page, sends the subscription and waits for the first reply or the close. */
function openSocket(page: Page, subscription?: object): Promise<SocketOutcome> {
  return page.evaluate(
    ({ subscription, url }) =>
      new Promise<SocketOutcome>((resolve) => {
        const socket = new WebSocket(url);
        const messages: unknown[] = [];
        const timer = window.setTimeout(() => socket.close(), 10_000);
        socket.addEventListener('open', () => {
          if (subscription) socket.send(JSON.stringify({ data: subscription, event: 'subscribe' }));
        });
        socket.addEventListener('message', (event) => {
          messages.push(JSON.parse(String(event.data)));
          socket.close(1000);
        });
        socket.addEventListener('close', (event) => {
          window.clearTimeout(timer);
          resolve({ closeCode: event.code, messages });
        });
      }),
    { subscription, url: realtimeUrl },
  );
}

test.describe.serial('WebSocket del progreso de digitalización', () => {
  const password = 'SocketTiempoReal-3!';
  let own: (CreatedRestaurant & { email: string }) | null = null;
  let foreign: (CreatedRestaurant & { email: string }) | null = null;

  test.beforeAll(async ({ request }) => {
    own = await createRestaurant(request, 'propio', password);
    foreign = await createRestaurant(request, 'ajeno', password);
  });

  test.afterAll(async ({ request }) => {
    for (const restaurant of [own, foreign]) {
      if (restaurant) await deleteRestaurant(request, restaurant);
    }
  });

  test('el dueño abre el socket a través de Next y se suscribe a su restaurante', async ({ page }) => {
    if (!own) throw new Error('Restaurant fixture was not created');
    await signInOwner(page, own.email, password);
    const sockets: string[] = [];
    page.on('websocket', (socket) => {
      if (socket.url().endsWith('/api/realtime')) sockets.push(socket.url());
    });

    const progressId = crypto.randomUUID();
    const outcome = await openSocket(page, {
      progressId,
      restaurantId: own.id,
      topic: 'digitization',
    });

    // The browser only ever talked to the web origin; Next proxied the upgrade to Nest.
    expect(sockets).toEqual([realtimeUrl]);
    expect(outcome).toEqual({
      closeCode: 1000,
      messages: [{ data: { progressId }, event: 'subscribed' }],
    });
  });

  test('rechaza la suscripción al restaurante de otro dueño', async ({ page }) => {
    if (!own || !foreign) throw new Error('Restaurant fixtures were not created');
    await signInOwner(page, own.email, password);

    const outcome = await openSocket(page, {
      progressId: crypto.randomUUID(),
      restaurantId: foreign.id,
      topic: 'digitization',
    });

    expect(outcome.messages).toEqual([{ data: { code: 'ACCESS_DENIED' }, event: 'error' }]);
  });

  test('cierra el socket de un navegador sin sesión', async ({ page }) => {
    await page.goto(`${webUrl}/health`);

    const outcome = await openSocket(page);

    expect(outcome).toEqual({ closeCode: 4401, messages: [] });
  });

  test('cierra el socket que llega desde otro origen aunque traiga la cookie', async ({ page }) => {
    if (!own) throw new Error('Restaurant fixture was not created');
    await signInOwner(page, own.email, password);
    const access = (await page.context().cookies(webUrl)).find(({ name }) => name === 'sirio_access');
    if (!access) throw new Error('The BFF did not set the access cookie');

    // A browser cannot forge Origin, so this handshake comes from Node's own WebSocket.
    const closeCode = await new Promise<number>((resolve, reject) => {
      const socket = new WebSocket(realtimeUrl, {
        headers: { cookie: `sirio_access=${access.value}`, origin: 'https://evil.example' },
      } as unknown as string[]);
      socket.addEventListener('close', (event) => resolve(event.code));
      socket.addEventListener('error', () => undefined);
      setTimeout(() => reject(new Error('The socket stayed open')), 10_000);
    });

    expect(closeCode).toBe(4403);
  });
});
