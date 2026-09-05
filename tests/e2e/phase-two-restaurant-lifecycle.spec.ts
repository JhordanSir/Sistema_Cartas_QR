import {
  expect,
  test,
  type APIRequestContext,
} from '@playwright/test';

const apiUrl = process.env.E2E_API_URL ?? 'http://127.0.0.1:3000/api';
const directApiUrl =
  process.env.E2E_DIRECT_API_URL ?? 'http://127.0.0.1:3001/api';
const webUrl = process.env.E2E_WEB_URL ?? 'http://127.0.0.1:3000';

interface CreatedRestaurant {
  id: string;
  slug: string;
}

async function adminAccessToken(request: APIRequestContext): Promise<string> {
  const email = process.env.INITIAL_ADMIN_EMAIL;
  const password = process.env.INITIAL_ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error('Initial administrator credentials are required for E2E');
  }
  const login = await request.post(`${directApiUrl}/auth/login`, {
    data: { email, password, role: 'ADMIN' },
  });
  expect(login.ok()).toBe(true);
  return ((await login.json()) as { accessToken: string }).accessToken;
}

test.describe.serial('ciclo de vida de restaurantes de la Fase 2', () => {
  let created: CreatedRestaurant | null = null;

  test.afterEach(async ({ request }) => {
    if (!created) return;
    const token = await adminAccessToken(request);
    await request.delete(`${directApiUrl}/backoffice/restaurants/${created.id}`, {
      data: {
        acknowledgePermanentDeletion: true,
        confirmationText: `ELIMINAR ${created.slug}`,
      },
      headers: { authorization: `Bearer ${token}` },
    });
    created = null;
  });

  test('crea, deshabilita, reactiva y elimina definitivamente desde el backoffice', { tag: '@movil' }, async ({
    context,
    page,
    request,
  }) => {
    const suffix = `${Date.now()}-${test.info().parallelIndex}`;
    const restaurantName = `Sazón E2E ${suffix}`;
    const ownerEmail = `phase2-${suffix}@example.test`;
    const ownerPassword = 'OwnerPass-2!';

    await page.goto(`${webUrl}/login`);
    await expect(
      page.getByRole('heading', { name: 'Tu mesa de control.' }),
    ).toBeVisible();
    await page.getByLabel('Correo del administrador').fill(
      process.env.INITIAL_ADMIN_EMAIL ?? '',
    );
    await page.getByLabel('Contraseña').fill(
      process.env.INITIAL_ADMIN_PASSWORD ?? '',
    );
    await page.getByRole('button', { name: 'Entrar al backoffice' }).click();
    await expect(page).toHaveURL(`${webUrl}/backoffice`);

    await page.getByRole('button', { name: 'Nuevo restaurante' }).click();
    await page.getByLabel('Nombre del restaurante').fill(restaurantName);
    await page.getByLabel('Correo del dueño').fill(ownerEmail);
    await page.getByLabel(/Contraseña inicial/).fill(ownerPassword);
    await page.getByRole('button', { name: 'Crear restaurante' }).click();

    const row = page.getByTestId('restaurant-row').filter({ hasText: ownerEmail });
    await expect(row).toBeVisible();
    const publicLink = row.getByTestId('public-menu-link');
    const href = await publicLink.getAttribute('href');
    if (!href) throw new Error('The restaurant public URL was not rendered');
    const slug = href.slice(1);

    const token = await adminAccessToken(request);
    const listing = await request.get(
      `${directApiUrl}/backoffice/restaurants?query=${encodeURIComponent(ownerEmail)}`,
      { headers: { authorization: `Bearer ${token}` } },
    );
    const listed = (await listing.json()) as {
      items: Array<{ id: string; slug: string }>;
    };
    created = listed.items[0] ?? null;
    expect(created?.slug).toBe(slug);

    const publicPage = await context.newPage();
    await publicPage.goto(`${webUrl}/${slug}`);
    await expect(
      publicPage.getByRole('heading', { name: restaurantName, level: 1 }),
    ).toBeVisible();

    await row.getByRole('button', { name: 'Deshabilitar' }).click();
    await expect(row.getByText('Deshabilitado')).toBeVisible();
    await publicPage.goto(`${webUrl}/${slug}`);
    await expect(
      publicPage.getByRole('heading', {
        name: 'Esta carta no está disponible.',
      }),
    ).toBeVisible();

    const ownerLoginWhileDisabled = await request.post(`${directApiUrl}/auth/login`, {
      data: { email: ownerEmail, password: ownerPassword, role: 'OWNER' },
    });
    expect(ownerLoginWhileDisabled.ok()).toBe(true);

    await row.getByRole('button', { name: 'Reactivar' }).click();
    await expect(row.getByText('Habilitado')).toBeVisible();
    await publicPage.goto(`${webUrl}/${slug}`);
    await expect(
      publicPage.getByRole('heading', { name: restaurantName, level: 1 }),
    ).toBeVisible();

    await row.getByRole('button', { name: `Eliminar ${restaurantName}` }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('button', { name: 'Eliminar definitivamente' })).toBeDisabled();
    await dialog.getByLabel(new RegExp(`Escribe ELIMINAR ${slug}`)).fill(
      `ELIMINAR ${slug}`,
    );
    await dialog.getByLabel(/Entiendo que esta eliminación/).check();
    await dialog.getByRole('button', { name: 'Eliminar definitivamente' }).click();
    await expect(row).toHaveCount(0);
    created = null;

    await publicPage.goto(`${webUrl}/${slug}`);
    await expect(
      publicPage.getByRole('heading', {
        name: 'Esta carta no está disponible.',
      }),
    ).toBeVisible();
    const deletedOwnerLogin = await request.post(`${directApiUrl}/auth/login`, {
      data: { email: ownerEmail, password: ownerPassword, role: 'OWNER' },
    });
    expect(deletedOwnerLogin.status()).toBe(401);
  });
});
