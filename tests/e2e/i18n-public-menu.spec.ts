import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

const directApiUrl = process.env.E2E_DIRECT_API_URL ?? 'http://127.0.0.1:3001/api';
const webUrl = process.env.E2E_WEB_URL ?? 'http://127.0.0.1:3000';

const ADDRESS = 'Av. La Marina 1234, San Miguel';

interface CreatedRestaurant {
  id: string;
  name: string;
  slug: string;
}

interface DraftMenu {
  categories: Array<{ id: string; name: string }>;
}

async function login(
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
  return login(request, email, password, 'ADMIN');
}

/** Dos secciones, un plato con descripción, variante y adicional, perfil con contacto. */
async function seedPublishedMenu(request: APIRequestContext, restaurantId: string, token: string): Promise<void> {
  const base = `${directApiUrl}/owner/restaurants/${restaurantId}`;
  const headers = { authorization: `Bearer ${token}` };

  const profile = await request.patch(`${base}/profile`, {
    headers,
    multipart: { address: ADDRESS, whatsapp: '+51 999 888 777' },
  });
  expect(profile.ok()).toBe(true);

  const mains = await request.post(`${base}/menu/categories`, {
    data: { name: 'Fondos criollos' },
    headers,
  });
  expect(mains.ok()).toBe(true);
  const mainsId = ((await mains.json()) as DraftMenu).categories[0]?.id;
  const lomo = await request.post(`${base}/menu/products`, {
    data: {
      basePrice: '32.00',
      categoryId: mainsId,
      description: 'Lomo fino salteado con papas nativas.',
      extras: [{ name: 'Huevo frito', price: '3.00' }],
      name: 'Lomo saltado',
      variants: [{ name: 'Doble', price: '41.00' }],
    },
    headers,
  });
  expect(lomo.ok()).toBe(true);

  const drinks = await request.post(`${base}/menu/categories`, {
    data: { name: 'Bebidas' },
    headers,
  });
  expect(drinks.ok()).toBe(true);
  const drinksId = ((await drinks.json()) as DraftMenu).categories.find(
    (category) => category.name === 'Bebidas',
  )?.id;
  const chicha = await request.post(`${base}/menu/products`, {
    data: { basePrice: '8.00', categoryId: drinksId, name: 'Chicha morada' },
    headers,
  });
  expect(chicha.ok()).toBe(true);

  const published = await request.post(`${base}/menu/publish`, { headers });
  expect(published.ok()).toBe(true);
}

/** El comensal no tiene selector: el idioma solo llega si ya lo eligió en su navegador. */
async function useEnglish(page: Page): Promise<void> {
  await page.context().addCookies([{ name: 'sirio-locale', url: webUrl, value: 'en' }]);
}

/** Todo lo que escribió el dueño, en el orden de la página. */
async function ownerContent(page: Page): Promise<string[]> {
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  const groups = await Promise.all([
    page.getByRole('heading', { level: 1 }).allTextContents(),
    page.locator('section[id^="categoria-"] h2').allTextContents(),
    page.locator('[data-testid="product-row"] h3').allTextContents(),
    page.locator('[data-testid="product-row"] p').allTextContents(),
    page.getByText(ADDRESS).allTextContents(),
  ]);
  return groups.flat().map((text) => text.trim());
}

/** True when the document itself scrolls sideways, which it never should. */
async function scrollsSideways(page: Page): Promise<boolean> {
  return page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
}

test.describe.serial('carta pública en inglés', () => {
  // WebKit tarda bastante más que Chromium en cada navegación.
  test.describe.configure({ timeout: 120_000 });

  let restaurant: CreatedRestaurant | null = null;
  let ownerToken = '';

  test.beforeEach(async ({ request }) => {
    const suffix = `${Date.now()}-${test.info().parallelIndex}`;
    const ownerEmail = `carta-en-${suffix}@example.test`;
    const ownerPassword = 'CartaIdioma-6!';
    const created = await request.post(`${directApiUrl}/backoffice/restaurants`, {
      data: { email: ownerEmail, initialPassword: ownerPassword, name: `Picantería Idioma ${suffix}` },
      headers: { authorization: `Bearer ${await adminToken(request)}` },
    });
    expect(created.ok()).toBe(true);
    restaurant = (await created.json()) as CreatedRestaurant;
    ownerToken = await login(request, ownerEmail, ownerPassword, 'OWNER');
  });

  test.afterEach(async ({ request }) => {
    if (!restaurant) return;
    await request.delete(`${directApiUrl}/backoffice/restaurants/${restaurant.id}`, {
      data: {
        acknowledgePermanentDeletion: true,
        confirmationText: `ELIMINAR ${restaurant.slug}`,
      },
      headers: { authorization: `Bearer ${await adminToken(request)}` },
    });
    restaurant = null;
  });

  test('el marco de la carta, su idioma y su título pasan a inglés', { tag: '@movil' }, async ({
    page,
    request,
  }) => {
    if (!restaurant) throw new Error('Restaurant fixture was not created');
    await seedPublishedMenu(request, restaurant.id, ownerToken);
    await useEnglish(page);
    await page.goto(`${webUrl}/${restaurant.slug}`);

    await expect(page.getByRole('heading', { level: 1, name: restaurant.name })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page).toHaveTitle(`${restaurant.name} · Digital menu`);
    await expect(page.getByText('Digital menu', { exact: true })).toBeVisible();
    await expect(page.getByText('Menu published', { exact: true })).toBeVisible();
    await expect(page.getByText('Pick a section and find your next favorite.')).toBeVisible();
    const sections = page.getByRole('navigation', { name: 'Menu sections' });
    await expect(sections.getByText('Sections', { exact: true })).toBeVisible();
    await expect(page.getByText('Options', { exact: true })).toBeVisible();
    await expect(page.getByText('Add-ons', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Contact' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Message on WhatsApp/ })).toHaveAttribute(
      'href',
      'https://wa.me/51999888777',
    );
    await expect(
      page.getByRole('link', { name: 'Message the restaurant on WhatsApp' }),
    ).toBeVisible();
    await expect(page.getByText('Digital menu published with Sirio')).toBeVisible();

    // Nada del marco en español queda a la vista.
    for (const spanish of ['Carta publicada', 'Presentaciones', 'Adicionales', 'Contacto']) {
      await expect(page.getByText(spanish, { exact: true })).toHaveCount(0);
    }
    expect(await scrollsSideways(page)).toBe(false);
  });

  test('el contenido del dueño se ve idéntico y solo cambia cómo se escribe el precio', {
    tag: '@movil',
  }, async ({ page, request }) => {
    if (!restaurant) throw new Error('Restaurant fixture was not created');
    await seedPublishedMenu(request, restaurant.id, ownerToken);
    const basePrice = page.locator('[data-testid="product-row"] strong').first();
    const variantPrice = page.getByRole('listitem').filter({ hasText: 'Doble' }).locator('b');

    await page.goto(`${webUrl}/${restaurant.slug}`);
    await expect(page.locator('html')).toHaveAttribute('lang', 'es', { timeout: 20_000 });
    const spanish = await ownerContent(page);
    expect(spanish).toEqual([
      restaurant.name,
      'Fondos criollos',
      'Bebidas',
      'Lomo saltado',
      'Chicha morada',
      'Lomo fino salteado con papas nativas.',
      ADDRESS,
      ADDRESS,
    ]);
    await expect(basePrice).toHaveText(/^S\/\s32\.00$/);
    await expect(variantPrice).toHaveText(/^S\/\s41\.00$/);

    await useEnglish(page);
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en', { timeout: 20_000 });
    expect(await ownerContent(page)).toEqual(spanish);
    await expect(basePrice).toHaveText(/^PEN\s32\.00$/);
    await expect(variantPrice).toHaveText(/^PEN\s41\.00$/);
  });

  test('una carta aún sin publicar avisa en inglés que está en preparación', { tag: '@movil' }, async ({
    page,
  }) => {
    if (!restaurant) throw new Error('Restaurant fixture was not created');
    await useEnglish(page);
    await page.goto(`${webUrl}/${restaurant.slug}`);

    await expect(page.getByRole('heading', { name: "We're getting the menu ready" })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText('Coming soon', { exact: true })).toBeVisible();
    await expect(
      page.getByText("Very soon you'll find all of the restaurant's dishes here."),
    ).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page).toHaveTitle(`${restaurant.name} · Digital menu`);
  });
});
