import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

const directApiUrl = process.env.E2E_DIRECT_API_URL ?? 'http://127.0.0.1:3001/api';
const webUrl = process.env.E2E_WEB_URL ?? 'http://127.0.0.1:3000';

interface CreatedRestaurant {
  id: string;
  slug: string;
}

interface DraftMenu {
  categories: Array<{ id: string; name: string; products: Array<{ id: string; name: string }> }>;
}

interface StreamedProduct {
  category: { name: string };
  isAvailable: boolean;
  name: string;
  position: number;
  variants: unknown[];
}

/** Menu order: sections first, then each section's products. */
const MENU = [
  { name: 'Entradas', products: ['Ceviche clásico', 'Causa limeña', 'Papa a la huancaína', 'Choritos a la chalaca', 'Tiradito'] },
  { name: 'Bebidas', products: ['Chicha morada', 'Limonada frozen', 'Emoliente'] },
];
const PRODUCT_NAMES = MENU.flatMap((category) => category.products);

async function apiLogin(
  request: APIRequestContext,
  email: string,
  password: string,
  role: 'ADMIN' | 'OWNER',
): Promise<string> {
  const response = await request.post(`${directApiUrl}/auth/login`, {
    data: { email, password, role },
  });
  expect(response.ok()).toBe(true);
  return ((await response.json()) as { accessToken: string }).accessToken;
}

async function adminToken(request: APIRequestContext): Promise<string> {
  const email = process.env.INITIAL_ADMIN_EMAIL;
  const password = process.env.INITIAL_ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error('Initial administrator credentials are required for E2E');
  }
  return apiLogin(request, email, password, 'ADMIN');
}

async function createRestaurant(
  request: APIRequestContext,
  email: string,
  password: string,
  name: string,
): Promise<CreatedRestaurant> {
  const created = await request.post(`${directApiUrl}/backoffice/restaurants`, {
    data: { email, initialPassword: password, name },
    headers: { authorization: `Bearer ${await adminToken(request)}` },
  });
  expect(created.ok()).toBe(true);
  return (await created.json()) as CreatedRestaurant;
}

async function deleteRestaurant(request: APIRequestContext, restaurant: CreatedRestaurant): Promise<void> {
  await request.delete(`${directApiUrl}/backoffice/restaurants/${restaurant.id}`, {
    data: { acknowledgePermanentDeletion: true, confirmationText: `ELIMINAR ${restaurant.slug}` },
    headers: { authorization: `Bearer ${await adminToken(request)}` },
  });
}

/** Two sections and eight products; the tiradito has options and is hidden from diners. */
async function seedMenu(request: APIRequestContext, restaurantId: string, token: string): Promise<void> {
  const base = `${directApiUrl}/owner/restaurants/${restaurantId}/menu`;
  const headers = { authorization: `Bearer ${token}` };
  for (const section of MENU) {
    const created = await request.post(`${base}/categories`, { data: { name: section.name }, headers });
    expect(created.ok()).toBe(true);
    const categoryId = ((await created.json()) as DraftMenu).categories.find(
      (category) => category.name === section.name,
    )?.id;
    for (const name of section.products) {
      const options = name === 'Tiradito' ? { variants: [{ name: 'Doble', price: '38.00' }] } : {};
      const product = await request.post(`${base}/products`, {
        data: { basePrice: '24.00', categoryId, name, ...options },
        headers,
      });
      expect(product.ok()).toBe(true);
    }
  }
  const menu = (await (await request.get(`${base}`, { headers })).json()) as DraftMenu;
  const tiradito = menu.categories.flatMap((category) => category.products).find((item) => item.name === 'Tiradito');
  const hidden = await request.patch(`${base}/products/${tiradito?.id}/availability`, {
    data: { isAvailable: false },
    headers,
  });
  expect(hidden.ok()).toBe(true);
}

async function signIn(page: Page, email: string, password: string): Promise<void> {
  await page.goto(`${webUrl}/admin/login`);
  await page.getByLabel('Correo del propietario').fill(email);
  await page.getByLabel('Contraseña').fill(password);
  await page.getByRole('button', { name: 'Entrar a mi restaurante' }).click();
  await expect(page).toHaveURL(`${webUrl}/admin`, { timeout: 20_000 });
}

function parseNdjson(body: string): StreamedProduct[] {
  return body
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line) => JSON.parse(line) as StreamedProduct);
}

test.describe.serial('stream de objetos de la carta del dueño', () => {
  // WebKit tarda bastante más que Chromium en el guard de sesión y en cada navegación.
  test.describe.configure({ timeout: 120_000 });

  let restaurant: CreatedRestaurant | null = null;
  let ownerEmail = '';
  let ownerToken = '';
  const ownerPassword = 'StreamCarta-4!';

  test.beforeEach(async ({ request }) => {
    const suffix = `${Date.now()}-${test.info().parallelIndex}`;
    ownerEmail = `stream-${suffix}@example.test`;
    restaurant = await createRestaurant(request, ownerEmail, ownerPassword, `Cevichería Stream ${suffix}`);
    ownerToken = await apiLogin(request, ownerEmail, ownerPassword, 'OWNER');
    await seedMenu(request, restaurant.id, ownerToken);
  });

  test.afterEach(async ({ request }) => {
    if (!restaurant) return;
    await deleteRestaurant(request, restaurant);
    restaurant = null;
  });

  test('el dueño abre el stream desde Carta y ve llegar los productos uno a uno', { tag: '@movil' }, async ({ page }) => {
    await signIn(page, ownerEmail, ownerPassword);
    await page.goto(`${webUrl}/admin/menu`);
    await page.getByRole('link', { name: 'Ver productos en streaming' }).click();
    await expect(page).toHaveURL(`${webUrl}/admin/stream`);
    await expect(page.getByRole('combobox', { name: /Pausa entre objetos/ })).toHaveValue('250');

    await page.getByRole('button', { name: 'Iniciar stream' }).click();
    const list = page.getByRole('list', { name: 'Productos recibidos' });
    const items = list.getByRole('listitem');
    await expect(list.getByText('Objeto 1')).toBeVisible();
    // A 250 ms por objeto, ocho productos tardan unos dos segundos: el primero
    // ya está en pantalla mientras el resto sigue en camino.
    expect(await items.count()).toBeLessThan(PRODUCT_NAMES.length);

    await expect(items).toHaveCount(PRODUCT_NAMES.length, { timeout: 30_000 });
    await expect(page.getByRole('status').filter({ hasText: 'Completo' })).toBeVisible();
    await expect(page.getByTestId('stream-received')).toHaveText(String(PRODUCT_NAMES.length));
    await expect(items.locator('strong')).toHaveText(PRODUCT_NAMES);
    await expect(items.first().getByLabel('Línea NDJSON tal como llegó')).toContainText('"position":1');
    await expect(items.filter({ hasText: 'Tiradito' })).toContainText('Oculto al comensal');
  });

  test('Detener corta el stream y no llegan más productos', { tag: '@movil' }, async ({ page }) => {
    await signIn(page, ownerEmail, ownerPassword);
    await page.goto(`${webUrl}/admin/stream`);
    await page.getByRole('combobox', { name: /Pausa entre objetos/ }).selectOption('500');

    await page.getByRole('button', { name: 'Iniciar stream' }).click();
    const items = page.getByRole('list', { name: 'Productos recibidos' }).getByRole('listitem');
    await expect(items.first()).toBeVisible();
    await page.getByRole('button', { name: 'Detener' }).click();

    await expect(page.getByRole('status').filter({ hasText: 'Detenido' })).toBeVisible();
    const received = await items.count();
    expect(received).toBeLessThan(PRODUCT_NAMES.length);
    // Una espera fija es la única forma de comprobar que algo NO ocurre: a 500 ms por
    // objeto, en un segundo y medio habrían llegado al menos dos productos más.
    await page.waitForTimeout(1_500);
    await expect(items).toHaveCount(received);
  });

  test('la API envía NDJSON en orden de carta, con su disponibilidad', async ({ request }) => {
    const response = await request.get(
      `${directApiUrl}/owner/restaurants/${restaurant?.id}/menu/products/stream?delayMs=0`,
      { headers: { authorization: `Bearer ${ownerToken}` } },
    );

    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toBe('application/x-ndjson; charset=utf-8');
    expect(response.headers()['cache-control']).toBe('no-store, no-transform');
    expect(response.headers()['x-accel-buffering']).toBe('no');
    const products = parseNdjson(await response.text());
    expect(products.map((product) => product.name)).toEqual(PRODUCT_NAMES);
    expect(products.map((product) => product.position)).toEqual(PRODUCT_NAMES.map((_name, index) => index + 1));
    expect(products.map((product) => product.category.name)).toEqual(
      MENU.flatMap((category) => category.products.map(() => category.name)),
    );
    expect(products.find((product) => product.name === 'Tiradito')).toMatchObject({
      isAvailable: false,
      variants: [{ name: 'Doble', price: '38.00' }],
    });
  });

  test('la API rechaza pausas fuera de rango y restaurantes ajenos', async ({ request }) => {
    const path = `${directApiUrl}/owner/restaurants/${restaurant?.id}/menu/products/stream`;
    const headers = { authorization: `Bearer ${ownerToken}` };
    expect((await request.get(`${path}?delayMs=5000`, { headers })).status()).toBe(400);
    expect((await request.get(`${path}?delayMs=rapido`, { headers })).status()).toBe(400);

    const suffix = `${Date.now()}-ajeno`;
    const foreignEmail = `stream-${suffix}@example.test`;
    const foreign = await createRestaurant(request, foreignEmail, ownerPassword, `Ajeno Stream ${suffix}`);
    try {
      const foreignToken = await apiLogin(request, foreignEmail, ownerPassword, 'OWNER');
      const response = await request.get(path, { headers: { authorization: `Bearer ${foreignToken}` } });
      expect(response.status()).toBe(403);
    } finally {
      await deleteRestaurant(request, foreign);
    }
  });

  test('el BFF reenvía cada línea apenas llega, sin esperar al final', async ({ request }) => {
    const login = await request.post(`${webUrl}/api/session/login`, {
      data: { email: ownerEmail, password: ownerPassword, role: 'OWNER' },
      headers: { origin: webUrl },
    });
    expect(login.ok()).toBe(true);
    const { cookies } = await request.storageState();
    const cookie = cookies.map(({ name, value }) => `${name}=${value}`).join('; ');

    // El fetch de Node expone el cuerpo como stream: así se ve cuándo llega cada trozo,
    // cosa que el cliente HTTP de Playwright no permite porque lo lee entero.
    const startedAt = Date.now();
    const response = await fetch(
      `${webUrl}/api/owner/restaurants/${restaurant?.id}/menu/products/stream?delayMs=200`,
      { headers: { 'accept-encoding': 'identity', cookie } },
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('x-accel-buffering')).toBe('no');
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    const arrivals: number[] = [];
    let body = '';
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      arrivals.push(Date.now() - startedAt);
      body += decoder.decode(value, { stream: true });
    }

    expect(parseNdjson(body)).toHaveLength(PRODUCT_NAMES.length);
    expect(arrivals.length).toBeGreaterThan(1);
    // Ocho objetos a 200 ms: unos 1,6 s de principio a fin. Si algo los acumulara,
    // todo llegaría junto al final.
    const first = arrivals[0] ?? 0;
    const last = arrivals.at(-1) ?? 0;
    expect(last - first).toBeGreaterThan(1_000);
  });
});
