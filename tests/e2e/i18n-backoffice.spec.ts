import {
  expect,
  test,
  type APIRequestContext,
  type BrowserContext,
  type Locator,
  type Page,
} from '@playwright/test';

const directApiUrl = process.env.E2E_DIRECT_API_URL ?? 'http://127.0.0.1:3001/api';
const webUrl = process.env.E2E_WEB_URL ?? 'http://127.0.0.1:3000';

interface CreatedRestaurant {
  id: string;
  name: string;
  slug: string;
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

async function deleteByEmail(request: APIRequestContext, email: string): Promise<void> {
  const headers = { authorization: `Bearer ${await adminToken(request)}` };
  const listing = await request.get(
    `${directApiUrl}/backoffice/restaurants?query=${encodeURIComponent(email)}`,
    { headers },
  );
  const { items } = (await listing.json()) as { items: CreatedRestaurant[] };
  for (const item of items) {
    await request.delete(`${directApiUrl}/backoffice/restaurants/${item.id}`, {
      data: { acknowledgePermanentDeletion: true, confirmationText: `DELETE ${item.slug}` },
      headers,
    });
  }
}

/** Entra en español y cambia a inglés con la misma cookie de sesión que escribe el selector. */
async function openBackofficeInEnglish(context: BrowserContext, page: Page): Promise<void> {
  await page.goto(`${webUrl}/login`);
  await page.getByLabel('Correo del administrador').fill(process.env.INITIAL_ADMIN_EMAIL ?? '');
  await page.getByLabel('Contraseña').fill(process.env.INITIAL_ADMIN_PASSWORD ?? '');
  await page.getByRole('button', { name: 'Entrar al backoffice' }).click();
  await expect(page).toHaveURL(`${webUrl}/backoffice`, { timeout: 20_000 });
  await context.addCookies([{ name: 'sirio-locale', url: webUrl, value: 'en' }]);
  await page.goto(`${webUrl}/backoffice`);
  await expect(page.getByRole('heading', { name: 'Restaurants', level: 1 })).toBeVisible({
    timeout: 20_000,
  });
}

/** Cada restaurante es una fila plegable: el detalle y las acciones solo existen abiertas. */
async function openRow(row: Locator): Promise<void> {
  if (await row.evaluate((node) => (node as HTMLDetailsElement).open)) return;
  await row.locator('summary').click();
}

async function findRow(page: Page, email: string): Promise<Locator> {
  await page.getByLabel('Search restaurants').fill(email);
  const row = page.getByTestId('restaurant-row').filter({ hasText: email });
  await expect(row).toBeVisible();
  await openRow(row);
  return row;
}

test.describe.serial('backoffice en inglés', () => {
  // WebKit tarda bastante más que Chromium en el guard de sesión y en cada navegación.
  test.describe.configure({ timeout: 120_000 });

  let restaurant: CreatedRestaurant | null = null;
  let ownerEmail = '';
  let uiOwnerEmail = '';

  test.beforeEach(async ({ request }) => {
    const suffix = `${Date.now()}-${test.info().parallelIndex}`;
    ownerEmail = `backoffice-en-${suffix}@example.test`;
    uiOwnerEmail = `backoffice-en-ui-${suffix}@example.test`;
    const created = await request.post(`${directApiUrl}/backoffice/restaurants`, {
      data: {
        email: ownerEmail,
        initialPassword: 'BackofficeEn-5!',
        name: `Registro Idioma ${suffix}`,
      },
      headers: { authorization: `Bearer ${await adminToken(request)}` },
    });
    expect(created.ok()).toBe(true);
    restaurant = (await created.json()) as CreatedRestaurant;
  });

  test.afterEach(async ({ request }) => {
    await deleteByEmail(request, uiOwnerEmail);
    if (restaurant) await deleteByEmail(request, ownerEmail);
    restaurant = null;
  });

  test('da de alta un restaurante con el formulario en inglés', { tag: '@movil' }, async ({
    context,
    page,
  }) => {
    await openBackofficeInEnglish(context, page);
    const name = `Alta Idioma ${Date.now()}`;

    await page.getByRole('button', { name: 'New restaurant' }).click();
    await expect(page.getByRole('heading', { name: "Open the restaurant's record" })).toBeVisible();
    await expect(
      page.getByText('At least 8 characters, with an uppercase letter, a lowercase letter and a number.'),
    ).toBeVisible();
    await page.getByLabel('Restaurant name').fill(name);
    await page.getByLabel("Owner's email").fill(uiOwnerEmail);
    await page.getByLabel(/Initial password/).fill('AltaIdioma-5!');
    await page.getByRole('button', { name: 'Create restaurant' }).click();

    await expect(page.getByText(new RegExp(`^${name} is set up at /`))).toBeVisible();
    const row = await findRow(page, uiOwnerEmail);
    await expect(row.getByText('Enabled')).toBeVisible();
    await expect(row.getByText('Created')).toBeVisible();
    await expect(row.getByText(/^[A-Z][a-z]{2} \d{1,2}, \d{4}$/)).toBeVisible();
  });

  test('deshabilita y reactiva desde la fila en inglés', { tag: '@movil' }, async ({
    context,
    page,
  }) => {
    if (!restaurant) throw new Error('Restaurant fixture was not created');
    await openBackofficeInEnglish(context, page);
    const row = await findRow(page, ownerEmail);

    await row.getByRole('button', { name: 'Disable' }).click();
    await expect(page.getByText(`${restaurant.name} is no longer publicly visible.`)).toBeVisible();
    await expect(row.getByText('Disabled', { exact: true })).toBeVisible();

    await openRow(row);
    await row.getByRole('button', { name: 'Re-enable' }).click();
    await expect(page.getByText(`${restaurant.name} is visible again.`)).toBeVisible();
    await expect(row.getByText('Enabled', { exact: true })).toBeVisible();
  });

  test('filtra, busca y abre las estadísticas del local en inglés', { tag: '@movil' }, async ({
    context,
    page,
  }) => {
    if (!restaurant) throw new Error('Restaurant fixture was not created');
    await openBackofficeInEnglish(context, page);

    await page.getByLabel('Search restaurants').fill(ownerEmail);
    await expect(page.getByText('1 restaurant in this search')).toBeVisible();
    await page.getByLabel('Filter by status').selectOption('DISABLED');
    await expect(page.getByRole('heading', { name: 'No restaurants in this view' })).toBeVisible();
    await page.getByLabel('Filter by status').selectOption('ENABLED');
    const row = page.getByTestId('restaurant-row').filter({ hasText: ownerEmail });
    await expect(row).toBeVisible();
    await openRow(row);

    await row.getByRole('link', { name: /View statistics/ }).click();
    await expect(page).toHaveURL(new RegExp(`/backoffice/statistics\\?restaurante=${restaurant.id}`));
    await expect(page.getByRole('heading', { name: 'Statistics', level: 1 })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText('Platform overview')).toBeVisible();
    await expect(page.getByRole('heading', { name: restaurant.name, level: 2 })).toBeVisible();
    await page
      .getByRole('navigation', { name: 'Back office' })
      .getByRole('link', { name: 'Restaurants' })
      .click();
    await expect(page.getByRole('heading', { name: 'Restaurants', level: 1 })).toBeVisible({
      timeout: 20_000,
    });
  });

  test('elimina definitivamente escribiendo la frase en inglés', { tag: '@movil' }, async ({
    context,
    page,
  }) => {
    if (!restaurant) throw new Error('Restaurant fixture was not created');
    await openBackofficeInEnglish(context, page);
    const row = await findRow(page, ownerEmail);

    // El borrado vive en su propio menú en móvil y en línea desde lg.
    const trigger = row.getByRole('button', { name: `Actions for ${restaurant.name}` });
    if (await trigger.isVisible()) await trigger.click();
    await page.getByRole('button', { exact: true, name: `Delete ${restaurant.name}` }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: `Delete ${restaurant.name}` })).toBeVisible();
    const submit = dialog.getByRole('button', { name: 'Delete permanently' });
    const phrase = dialog.getByLabel(new RegExp(`Type DELETE ${restaurant.slug}`));
    await dialog.getByLabel('I understand this deletion cannot be undone.').check();

    // La frase en español la acepta la API, pero la pantalla en inglés pide la suya.
    await phrase.fill(`ELIMINAR ${restaurant.slug}`);
    await expect(submit).toBeDisabled();
    await phrase.fill(`DELETE ${restaurant.slug}`);
    await expect(submit).toBeEnabled();
    await submit.click();

    await expect(page.getByText(`${restaurant.name} was permanently deleted.`)).toBeVisible();
    await expect(page.getByTestId('restaurant-row').filter({ hasText: ownerEmail })).toHaveCount(0);
    restaurant = null;
  });
});
