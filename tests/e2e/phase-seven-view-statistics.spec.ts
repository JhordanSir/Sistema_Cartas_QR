import { expect, test, type APIRequestContext } from '@playwright/test';

const directApiUrl = process.env.E2E_DIRECT_API_URL ?? 'http://127.0.0.1:3001/api';
const webUrl = process.env.E2E_WEB_URL ?? 'http://127.0.0.1:3000';

interface CreatedRestaurant {
  id: string;
  slug: string;
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

test.describe.serial('Estadísticas de visualización de la Fase 7', () => {
  let adminToken = '';
  let ownerEmail = '';
  let ownerToken = '';
  let restaurant: CreatedRestaurant | null = null;
  const ownerPassword = 'OwnerPass-7!';

  test.beforeEach(async ({ request }) => {
    const suffix = `${Date.now()}-${test.info().parallelIndex}`;
    const adminEmail = process.env.INITIAL_ADMIN_EMAIL;
    const adminPassword = process.env.INITIAL_ADMIN_PASSWORD;
    if (!adminEmail || !adminPassword) {
      throw new Error('Initial administrator credentials are required for E2E');
    }
    adminToken = await login(request, adminEmail, adminPassword, 'ADMIN');
    ownerEmail = `phase7-${suffix}@example.test`;
    const created = await request.post(`${directApiUrl}/backoffice/restaurants`, {
      data: {
        email: ownerEmail,
        initialPassword: ownerPassword,
        name: `Pulso QR ${suffix}`,
      },
      headers: { authorization: `Bearer ${adminToken}` },
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
      headers: { authorization: `Bearer ${adminToken}` },
    });
    restaurant = null;
  });

  test('deduplica por visitante y día, y muestra el análisis al dueño y al administrador', async ({
    page,
    request,
  }) => {
    if (!restaurant) throw new Error('Restaurant fixture was not created');
    const viewUrl = `${directApiUrl}/restaurants/public/${restaurant.slug}/view`;
    const sameVisitor = { 'x-sirio-visitor-ip': '203.0.113.11' };
    expect((await request.post(viewUrl, { headers: sameVisitor })).status()).toBe(204);
    expect((await request.post(viewUrl, { headers: sameVisitor })).status()).toBe(204);
    expect((await request.post(viewUrl, {
      headers: { 'x-sirio-visitor-ip': '203.0.113.12' },
    })).status()).toBe(204);

    const ownerStatistics = await request.get(
      `${directApiUrl}/owner/restaurants/${restaurant.id}/statistics`,
      { headers: { authorization: `Bearer ${ownerToken}` } },
    );
    expect(ownerStatistics.ok()).toBe(true);
    expect((await ownerStatistics.json()).uniqueViews).toMatchObject({
      allTime: 2,
      last30Days: 2,
      last7Days: 2,
    });

    const adminStatistics = await request.get(
      `${directApiUrl}/backoffice/restaurants/${restaurant.id}/statistics`,
      { headers: { authorization: `Bearer ${adminToken}` } },
    );
    expect(adminStatistics.ok()).toBe(true);
    expect((await adminStatistics.json()).uniqueViews.allTime).toBe(2);

    await page.goto(`${webUrl}/admin/login`);
    await page.getByLabel('Correo del propietario').fill(ownerEmail);
    await page.getByLabel('Contraseña').fill(ownerPassword);
    await page.getByRole('button', { name: 'Entrar a mi restaurante' }).click();
    await page.getByRole('link', { name: 'Estadísticas' }).click();
    await expect(page).toHaveURL(`${webUrl}/admin/statistics`);
    await expect(page.getByRole('heading', { name: 'Estadísticas' })).toBeVisible();
    await expect(page.getByText('2', { exact: true })).toHaveCount(3);
    await expect(page.getByRole('heading', { name: 'Ritmo por hora' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Ritmo por día' })).toBeVisible();

    await page.goto(`${webUrl}/login`);
    await page.getByLabel('Correo del administrador').fill(process.env.INITIAL_ADMIN_EMAIL!);
    await page.getByLabel('Contraseña').fill(process.env.INITIAL_ADMIN_PASSWORD!);
    await page.getByRole('button', { name: 'Entrar al backoffice' }).click();
    await page.getByRole('link', { name: 'Estadísticas' }).click();
    await expect(page).toHaveURL(`${webUrl}/backoffice/statistics`);
    await expect(page.getByRole('heading', { name: 'Estadísticas' })).toBeVisible();
    await page.getByLabel('Restaurante').selectOption(restaurant.id);
    await expect(page.getByRole('heading', { name: /Pulso QR/ })).toBeVisible();
  });
});
