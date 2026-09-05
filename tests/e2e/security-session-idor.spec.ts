import { expect, test, type APIRequestContext } from '@playwright/test';

const directApiUrl = process.env.E2E_DIRECT_API_URL ?? 'http://127.0.0.1:3001/api';
const webUrl = process.env.E2E_WEB_URL ?? 'http://127.0.0.1:3000';

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

interface RestaurantFixture {
  id: string;
  slug: string;
}

async function login(
  request: APIRequestContext,
  email: string,
  password: string,
  role: 'ADMIN' | 'OWNER',
): Promise<AuthTokens> {
  const response = await request.post(`${directApiUrl}/auth/login`, {
    data: { email, password, role },
  });
  expect(response.ok()).toBe(true);
  return response.json() as Promise<AuthTokens>;
}

async function createRestaurant(
  request: APIRequestContext,
  adminToken: string,
  suffix: string,
): Promise<{ ownerEmail: string; ownerPassword: string; restaurant: RestaurantFixture }> {
  const ownerEmail = `idor-owner-${suffix}@example.test`;
  const ownerPassword = 'OwnerPass-Idor-1!';
  const response = await request.post(`${directApiUrl}/backoffice/restaurants`, {
    data: {
      email: ownerEmail,
      initialPassword: ownerPassword,
      name: `Restaurante IDOR ${suffix}`,
    },
    headers: { authorization: `Bearer ${adminToken}` },
  });
  expect(response.ok()).toBe(true);
  return {
    ownerEmail,
    ownerPassword,
    restaurant: (await response.json()) as RestaurantFixture,
  };
}

async function removeRestaurant(
  request: APIRequestContext,
  adminToken: string,
  restaurant: RestaurantFixture,
): Promise<void> {
  const response = await request.delete(`${directApiUrl}/backoffice/restaurants/${restaurant.id}`, {
    data: {
      acknowledgePermanentDeletion: true,
      confirmationText: `ELIMINAR ${restaurant.slug}`,
    },
    headers: { authorization: `Bearer ${adminToken}` },
  });
  expect(response.ok()).toBe(true);
}

test.describe.serial('sesión vencida y límites IDOR de propietario', () => {
  let adminToken = '';
  let first: Awaited<ReturnType<typeof createRestaurant>> | null = null;
  let second: Awaited<ReturnType<typeof createRestaurant>> | null = null;

  test.beforeAll(async ({ request }) => {
    const adminEmail = process.env.INITIAL_ADMIN_EMAIL;
    const adminPassword = process.env.INITIAL_ADMIN_PASSWORD;
    if (!adminEmail || !adminPassword) {
      throw new Error('Initial administrator credentials are required for E2E');
    }
    adminToken = (await login(request, adminEmail, adminPassword, 'ADMIN')).accessToken;
    const suffix = `${Date.now()}-${test.info().parallelIndex}`;
    first = await createRestaurant(request, adminToken, `${suffix}-a`);
    second = await createRestaurant(request, adminToken, `${suffix}-b`);
  });

  test.afterAll(async ({ request }) => {
    if (second) await removeRestaurant(request, adminToken, second.restaurant);
    if (first) await removeRestaurant(request, adminToken, first.restaurant);
  });

  test('limpia una sesión vencida y deja el formulario de propietario en el login', { tag: '@movil' }, async ({
    context,
    page,
  }) => {
    await context.addCookies([
      { name: 'sirio_access', url: webUrl, value: 'expired-access-token' },
      { name: 'sirio_refresh', url: webUrl, value: 'expired-refresh-token' },
      { name: 'sirio_role', url: webUrl, value: 'OWNER' },
    ]);
    const navigations: string[] = [];
    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame()) navigations.push(frame.url());
    });

    await page.goto(`${webUrl}/admin/login`, { waitUntil: 'networkidle' });
    await expect(page).toHaveURL(`${webUrl}/admin/login`);
    await expect(page.getByRole('heading', { name: 'Tu carta empieza aquí.' })).toBeVisible();
    expect(navigations).not.toContain(`${webUrl}/admin`);
    expect((await context.cookies()).map((cookie) => cookie.name)).not.toEqual(
      expect.arrayContaining(['sirio_access', 'sirio_refresh', 'sirio_role']),
    );
  });

  test('deniega por API y BFF todos los recursos de otro propietario', async ({
    context,
    page,
    request,
  }) => {
    if (!first || !second) throw new Error('IDOR fixtures were not created');
    const firstTokens = await login(request, first.ownerEmail, first.ownerPassword, 'OWNER');
    const ownerHeaders = { authorization: `Bearer ${firstTokens.accessToken}` };
    const foreignBase = `${directApiUrl}/owner/restaurants/${second.restaurant.id}`;

    const ownRestaurants = await request.get(`${directApiUrl}/owner/restaurants`, {
      headers: ownerHeaders,
    });
    expect(ownRestaurants.ok()).toBe(true);
    const ownRestaurantIds = ((await ownRestaurants.json()) as Array<{ id: string }>)
      .map((restaurant) => restaurant.id);
    expect(ownRestaurantIds).toContain(first.restaurant.id);
    expect(ownRestaurantIds).not.toContain(second.restaurant.id);

    for (const path of [
      `${foreignBase}/profile`,
      `${foreignBase}/logo`,
      `${foreignBase}/menu`,
      `${foreignBase}/qr`,
      `${foreignBase}/qr/svg`,
      `${foreignBase}/statistics`,
    ]) {
      expect((await request.get(path, { headers: ownerHeaders })).status()).toBe(403);
    }
    expect(
      (await request.post(`${foreignBase}/menu/categories`, {
        data: { name: 'No autorizado' },
        headers: ownerHeaders,
      })).status(),
    ).toBe(403);

    await context.addCookies([
      { name: 'sirio_access', url: webUrl, value: firstTokens.accessToken },
      { name: 'sirio_refresh', url: webUrl, value: firstTokens.refreshToken },
      { name: 'sirio_role', url: webUrl, value: 'OWNER' },
    ]);
    for (const path of [
      `/api/owner/restaurants/${second.restaurant.id}/profile`,
      `/api/owner/restaurants/${second.restaurant.id}/menu`,
      `/api/owner/restaurants/${second.restaurant.id}/qr`,
      `/api/owner/restaurants/${second.restaurant.id}/statistics`,
    ]) {
      expect((await page.request.get(`${webUrl}${path}`)).status()).toBe(403);
    }
  });
});
