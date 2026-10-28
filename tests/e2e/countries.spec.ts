import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

const directApiUrl = process.env.E2E_DIRECT_API_URL ?? 'http://127.0.0.1:3001/api';
const webUrl = process.env.E2E_WEB_URL ?? 'http://127.0.0.1:3000';

const COUNTRIES_API = 'https://countries.dev';
const FLAG = '<svg xmlns="http://www.w3.org/2000/svg" width="3" height="2"><rect width="3" height="2" fill="#117884"/></svg>';

const language = (code: string, name: string, nativeName: string) => ({ iso639_1: code, name, nativeName });

/** What countries.dev answers, by path. Anything else gets its 404. */
const RESPONSES: Record<string, unknown> = {
  '/alpha/BOL': {
    alpha2Code: 'BO',
    alpha3Code: 'BOL',
    capital: 'Sucre',
    flags: { svg: 'https://flagcdn.com/bo.svg' },
    languages: [
      language('es', 'Spanish', 'Español'),
      language('ay', 'Aymara', 'aymar aru'),
      language('qu', 'Quechua', 'Runa Simi'),
    ],
    name: 'Bolivia (Plurinational State of)',
    nativeName: 'Bolivia',
  },
  '/alpha/GMB': {
    alpha2Code: 'GM',
    alpha3Code: 'GMB',
    capital: 'Banjul',
    flags: { svg: 'https://flagcdn.com/gm.svg' },
    languages: [language('en', 'English', 'English')],
    name: 'Gambia',
    nativeName: 'Gambia',
  },
  '/alpha/PER': {
    alpha2Code: 'PE',
    alpha3Code: 'PER',
    capital: 'Lima',
    flags: { svg: 'https://flagcdn.com/pe.svg' },
    languages: [language('es', 'Spanish', 'Español')],
    name: 'Peru',
    nativeName: 'Perú',
  },
  '/region/Africa': [{ alpha2Code: 'GM', alpha3Code: 'GMB', name: 'Gambia' }],
  '/region/Americas': [
    { alpha2Code: 'PE', alpha3Code: 'PER', name: 'Peru' },
    { alpha2Code: 'BO', alpha3Code: 'BOL', name: 'Bolivia (Plurinational State of)' },
    { alpha2Code: 'AR', alpha3Code: 'ARG', name: 'Argentina' },
  ],
  '/regions': ['Africa', 'Americas', 'Antarctic', 'Antarctic Ocean', 'Asia', 'Europe', 'Oceania', 'Polar'],
};

interface CreatedRestaurant {
  id: string;
  slug: string;
}

async function adminToken(request: APIRequestContext): Promise<string> {
  const email = process.env.INITIAL_ADMIN_EMAIL;
  const password = process.env.INITIAL_ADMIN_PASSWORD;
  if (!email || !password) throw new Error('Initial administrator credentials are required for E2E');
  const response = await request.post(`${directApiUrl}/auth/login`, { data: { email, password, role: 'ADMIN' } });
  expect(response.ok()).toBe(true);
  return ((await response.json()) as { accessToken: string }).accessToken;
}

async function signIn(page: Page, email: string, password: string): Promise<void> {
  await page.goto(`${webUrl}/admin/login`);
  await page.getByLabel('Correo del propietario').fill(email);
  await page.getByLabel('Contraseña').fill(password);
  await page.getByRole('button', { name: 'Entrar a mi restaurante' }).click();
  await expect(page).toHaveURL(`${webUrl}/admin`, { timeout: 20_000 });
}

/**
 * Answers for countries.dev and the flag host, so the suite never depends on them.
 * Only requests the browser makes reach page.route, which is the point here: the
 * page calls the API itself. Records the paths asked, in order, and how.
 */
async function stubCountries(
  page: Page,
  service: { down: boolean },
): Promise<{ kinds: Set<string>; paths: string[] }> {
  const asked = { kinds: new Set<string>(), paths: [] as string[] };
  const cors = { 'access-control-allow-origin': '*' };
  await page.route(`${COUNTRIES_API}/**`, async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    asked.kinds.add(`${request.method()} ${request.resourceType()}`);
    asked.paths.push(path);
    if (service.down) return route.abort('internetdisconnected');
    const body = RESPONSES[path];
    if (body === undefined) return route.fulfill({ body: 'Country not found', headers: cors, status: 404 });
    return route.fulfill({ headers: cors, json: body });
  });
  await page.route('https://flagcdn.com/**', (route) => route.fulfill({ body: FLAG, contentType: 'image/svg+xml' }));
  return asked;
}

test.describe.serial('países e idiomas con llamadas asíncronas', () => {
  // WebKit tarda bastante más que Chromium en el guard de sesión y en cada navegación.
  test.describe.configure({ timeout: 120_000 });

  let restaurant: CreatedRestaurant | null = null;
  let ownerEmail = '';
  const ownerPassword = 'PaisesIdiomas-4!';

  test.beforeEach(async ({ request }) => {
    const suffix = `${Date.now()}-${test.info().parallelIndex}`;
    ownerEmail = `paises-${suffix}@example.test`;
    const created = await request.post(`${directApiUrl}/backoffice/restaurants`, {
      data: { email: ownerEmail, initialPassword: ownerPassword, name: `Paises ${suffix}` },
      headers: { authorization: `Bearer ${await adminToken(request)}` },
    });
    expect(created.ok()).toBe(true);
    restaurant = (await created.json()) as CreatedRestaurant;
  });

  test.afterEach(async ({ request }) => {
    if (!restaurant) return;
    await request.delete(`${directApiUrl}/backoffice/restaurants/${restaurant.id}`, {
      data: { acknowledgePermanentDeletion: true, confirmationText: `ELIMINAR ${restaurant.slug}` },
      headers: { authorization: `Bearer ${await adminToken(request)}` },
    });
    restaurant = null;
  });

  test('el dueño elige región y país, y el navegador pide regiones, países y el país en ese orden', { tag: '@movil' }, async ({ page }) => {
    const asked = await stubCountries(page, { down: false });
    await signIn(page, ownerEmail, ownerPassword);
    await page.getByRole('region', { name: 'Países del mundo' }).getByRole('link', { name: 'Explorar países' }).click();
    await expect(page).toHaveURL(`${webUrl}/admin/countries`);

    const region = page.getByRole('combobox', { name: 'Región' });
    const country = page.getByRole('combobox', { name: 'País' });
    await expect(region).toBeEnabled({ timeout: 20_000 });
    await expect(region.locator('option')).toHaveText(['Elige una región', 'África', 'América', 'Asia', 'Europa', 'Oceanía']);
    await expect(country).toBeDisabled();

    await region.selectOption('Americas');
    await expect(country).toBeEnabled();
    await expect(country.locator('option')).toHaveText(['Elige un país', 'Argentina', 'Bolivia', 'Perú']);
    await country.selectOption('BOL');

    const bolivia = page.getByRole('table', { name: 'Idiomas de Bolivia' });
    await expect(bolivia.locator('tbody tr')).toHaveText([/Español\s*Español/, /Aimara\s*aymar aru/, /Quechua\s*Runa Simi/]);
    await expect(page.getByText('Nombre nativo: Bolivia · Capital: Sucre')).toBeVisible();
    await expect(page.getByRole('img', { name: 'Bandera de Bolivia' })).toBeVisible();
    expect(asked.paths).toEqual(['/regions', '/region/Americas', '/alpha/BOL']);

    // Another region empties the country and its table until the owner picks again.
    await region.selectOption('Africa');
    await expect(bolivia).toHaveCount(0);
    await expect(country.locator('option')).toHaveText(['Elige un país', 'Gambia']);
    await country.selectOption('GMB');
    await expect(page.getByRole('table', { name: 'Idiomas de Gambia' }).locator('tbody tr')).toHaveText([/Inglés\s*English/]);
    expect(asked.paths).toEqual(['/regions', '/region/Americas', '/alpha/BOL', '/region/Africa', '/alpha/GMB']);
    // Every call is the page's own fetch, not a navigation or a server request.
    expect([...asked.kinds]).toEqual(['GET fetch']);
  });

  test('recuerda la elección en este dispositivo y ofrece reintentar cuando la API no responde', { tag: '@movil' }, async ({ page }) => {
    const service = { down: false };
    const asked = await stubCountries(page, service);
    await signIn(page, ownerEmail, ownerPassword);
    await page.goto(`${webUrl}/admin/countries`);

    const region = page.getByRole('combobox', { name: 'Región' });
    const country = page.getByRole('combobox', { name: 'País' });
    await expect(region).toBeEnabled({ timeout: 20_000 });
    await region.selectOption('Americas');
    await expect(country).toBeEnabled();
    await country.selectOption('PER');
    await expect(page.getByRole('table', { name: 'Idiomas de Perú' })).toBeVisible();

    service.down = true;
    await page.reload();
    const failure = page.getByRole('alert').filter({ hasText: 'No pudimos cargar las regiones.' });
    await expect(failure).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('table')).toHaveCount(0);

    service.down = false;
    await failure.getByRole('button', { name: 'Reintentar' }).click();
    await expect(page.getByRole('table', { name: 'Idiomas de Perú' })).toBeVisible();
    await expect(region).toHaveValue('Americas');
    await expect(country).toHaveValue('PER');
    expect(asked.paths.slice(-4)).toEqual(['/regions', '/regions', '/region/Americas', '/alpha/PER']);
  });
});
