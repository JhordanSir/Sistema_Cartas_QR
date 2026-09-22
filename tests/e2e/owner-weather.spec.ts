import {
  expect,
  test,
  type APIRequestContext,
  type BrowserContext,
  type Page,
  type Request,
} from '@playwright/test';

const directApiUrl = process.env.E2E_DIRECT_API_URL ?? 'http://127.0.0.1:3001/api';
const webUrl = process.env.E2E_WEB_URL ?? 'http://127.0.0.1:3000';

const GEOCODING = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST = 'https://api.open-meteo.com/v1/forecast';

interface CreatedRestaurant {
  id: string;
  slug: string;
}

interface OpenMeteoStub {
  forecast?: { temperature: number; weatherCode: number };
  place?: { admin1: string; name: string } | null;
  unreachable?: boolean;
}

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

async function signIn(page: Page, email: string, password: string): Promise<void> {
  await page.goto(`${webUrl}/admin/login`);
  await page.getByLabel('Correo del propietario').fill(email);
  await page.getByLabel('Contraseña').fill(password);
  await page.getByRole('button', { name: 'Entrar a mi restaurante' }).click();
  await expect(page).toHaveURL(`${webUrl}/admin`, { timeout: 20_000 });
}

/**
 * Answers for Open-Meteo so the suite never depends on the real service. Only a
 * request the browser makes can be intercepted here: a call from the Next.js
 * server would bypass page.route entirely.
 */
async function stubOpenMeteo(page: Page, stub: OpenMeteoStub): Promise<Request[]> {
  const requests: Request[] = [];
  const cors = { 'access-control-allow-origin': '*' };
  await page.route(`${GEOCODING}**`, async (route) => {
    requests.push(route.request());
    if (stub.unreachable) return route.abort('internetdisconnected');
    const place = stub.place
      ? { ...stub.place, country: 'Perú', latitude: -12.04318, longitude: -77.02824 }
      : null;
    return route.fulfill({
      headers: cors,
      json: place ? { results: [place] } : { generationtime_ms: 0.1 },
    });
  });
  await page.route(`${FORECAST}**`, async (route) => {
    requests.push(route.request());
    const forecast = stub.forecast ?? { temperature: 19.4, weatherCode: 2 };
    return route.fulfill({
      headers: cors,
      json: {
        current: {
          interval: 900,
          is_day: 1,
          temperature_2m: forecast.temperature,
          time: '2026-09-22T15:00',
          weather_code: forecast.weatherCode,
        },
      },
    });
  });
  return requests;
}

async function saveCity(
  request: APIRequestContext,
  restaurantId: string,
  token: string,
  city: string,
): Promise<void> {
  const response = await request.patch(`${directApiUrl}/owner/restaurants/${restaurantId}/profile`, {
    headers: { authorization: `Bearer ${token}` },
    multipart: { city },
  });
  expect(response.ok()).toBe(true);
}

test.describe.serial('clima del restaurante consultado desde el navegador', () => {
  // WebKit tarda bastante más que Chromium en el guard de sesión y en cada navegación.
  test.describe.configure({ timeout: 120_000 });

  let restaurant: CreatedRestaurant | null = null;
  let ownerEmail = '';
  const ownerPassword = 'ClimaPerfil-2!';

  test.beforeEach(async ({ request }) => {
    const suffix = `${Date.now()}-${test.info().parallelIndex}`;
    ownerEmail = `clima-${suffix}@example.test`;
    const created = await request.post(`${directApiUrl}/backoffice/restaurants`, {
      data: { email: ownerEmail, initialPassword: ownerPassword, name: `Bistró Clima ${suffix}` },
      headers: { authorization: `Bearer ${await adminToken(request)}` },
    });
    expect(created.ok()).toBe(true);
    restaurant = (await created.json()) as CreatedRestaurant;
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

  test(
    'el dueño guarda su ciudad y el navegador pide el clima a Open-Meteo',
    { tag: '@movil' },
    async ({ page, request }) => {
      if (!restaurant) throw new Error('Restaurant fixture was not created');
      const requests = await stubOpenMeteo(page, {
        place: { admin1: 'Provincia de Lima', name: 'Lima' },
      });

      await signIn(page, ownerEmail, ownerPassword);
      const weather = page.getByRole('region', { name: 'Clima ahora' });
      await expect(weather).toContainText(
        'Agrega la ciudad de tu local para ver el clima de tu zona.',
        { timeout: 20_000 },
      );
      expect(requests).toHaveLength(0);

      await page.getByLabel('Dirección').fill('Av. Central 456');
      await page.getByLabel(/^Ciudad/).fill('Lima');
      await page.getByRole('button', { name: 'Guardar perfil' }).click();
      await expect(
        page.getByText('Perfil guardado. La identidad de tu restaurante está al día.'),
      ).toBeVisible();

      await expect(weather.getByText('19 °C')).toBeVisible();
      await expect(weather.getByText('Parcialmente nublado')).toBeVisible();
      await expect(weather.getByText('Lima · Provincia de Lima')).toBeVisible();
      await expect(weather.getByText('Medido a las 15:00 (hora local)')).toBeVisible();
      await expect(
        weather.getByRole('link', { name: 'Weather data by Open-Meteo.com' }),
      ).toHaveAttribute('href', 'https://open-meteo.com/');

      const [geocoding, forecast] = requests;
      if (!geocoding || !forecast) throw new Error('Open-Meteo was not called');
      expect(geocoding.resourceType()).toBe('fetch');
      expect(geocoding.frame()).toBe(page.mainFrame());
      expect(Object.fromEntries(new URL(geocoding.url()).searchParams)).toMatchObject({
        countryCode: 'PE',
        language: 'es',
        name: 'Lima',
      });
      expect(new URL(forecast.url()).searchParams.get('temperature_unit')).toBe('celsius');

      // Saving other details keeps the city, so Open-Meteo is not asked again.
      await page.getByRole('button', { name: 'Cerrar aviso' }).click();
      await page.getByLabel('Teléfono').fill('(01) 555-0199');
      await page.getByRole('button', { name: 'Guardar perfil' }).click();
      await expect(
        page.getByText('Perfil guardado. La identidad de tu restaurante está al día.'),
      ).toBeVisible();
      // Proving that nothing is requested needs a window for a stray request to show up.
      await page.waitForTimeout(1_000);
      await expect(weather.getByText('19 °C')).toBeVisible();
      expect(requests).toHaveLength(2);

      const persisted = await request.get(
        `${directApiUrl}/owner/restaurants/${restaurant.id}/profile`,
        {
          headers: {
            authorization: `Bearer ${await apiLogin(request, ownerEmail, ownerPassword, 'OWNER')}`,
          },
        },
      );
      await expect(persisted.json()).resolves.toMatchObject({
        address: 'Av. Central 456',
        city: 'Lima',
      });

      await page.goto(`${webUrl}/${restaurant.slug}`);
      await expect(page.getByText('Av. Central 456 · Lima').first()).toBeVisible();
    },
  );

  test(
    'en inglés el clima se pide y se muestra en grados Fahrenheit',
    { tag: '@movil' },
    async ({ context, page, request }) => {
      if (!restaurant) throw new Error('Restaurant fixture was not created');
      await saveCity(
        request,
        restaurant.id,
        await apiLogin(request, ownerEmail, ownerPassword, 'OWNER'),
        'Cusco',
      );
      const requests = await stubOpenMeteo(page, {
        forecast: { temperature: 53.6, weatherCode: 61 },
        place: { admin1: 'Cuzco Department', name: 'Cusco' },
      });

      await signIn(page, ownerEmail, ownerPassword);
      await switchToEnglish(context, page);

      const weather = page.getByRole('region', { name: 'Weather now' });
      await expect(weather.getByText('54 °F')).toBeVisible({ timeout: 20_000 });
      await expect(weather.getByText('Rain', { exact: true })).toBeVisible();
      await expect(weather.getByText('Cusco · Cuzco Department')).toBeVisible();
      await expect(weather.getByText('Measured at 15:00 (local time)')).toBeVisible();
      await expect(page.getByLabel(/^City/)).toHaveValue('Cusco');

      const englishForecast = requests.filter((sent) => sent.url().startsWith(FORECAST)).at(-1);
      expect(new URL(englishForecast?.url() ?? FORECAST).searchParams.get('temperature_unit')).toBe(
        'fahrenheit',
      );
    },
  );

  test(
    'una ciudad desconocida o un corte de red solo afectan a la tarjeta del clima',
    { tag: '@movil' },
    async ({ page, request }) => {
      if (!restaurant) throw new Error('Restaurant fixture was not created');
      const token = await apiLogin(request, ownerEmail, ownerPassword, 'OWNER');
      await saveCity(request, restaurant.id, token, 'Barranco');
      await stubOpenMeteo(page, { place: null });

      await signIn(page, ownerEmail, ownerPassword);
      const weather = page.getByRole('region', { name: 'Clima ahora' });
      await expect(
        weather.getByText('No encontramos «Barranco». Prueba solo con el distrito o la ciudad.'),
      ).toBeVisible({ timeout: 20_000 });

      await page.unrouteAll({ behavior: 'wait' });
      await stubOpenMeteo(page, { unreachable: true });
      await page.getByLabel(/^Ciudad/).fill('Lima');
      await page.getByRole('button', { name: 'Guardar perfil' }).click();
      await expect(
        page.getByText('Perfil guardado. La identidad de tu restaurante está al día.'),
      ).toBeVisible();
      await expect(
        weather.getByText('No pudimos cargar el clima. Inténtalo más tarde.'),
      ).toBeVisible();
      await expect(page.getByLabel(/^Ciudad/)).toHaveValue('Lima');
    },
  );
});

async function switchToEnglish(context: BrowserContext, page: Page): Promise<void> {
  await context.addCookies([{ name: 'sirio-locale', url: webUrl, value: 'en' }]);
  await page.goto(`${webUrl}/admin`);
  await expect(page.getByRole('heading', { name: 'Your profile', level: 1 })).toBeVisible({
    timeout: 20_000,
  });
}
