import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

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

/**
 * Las acciones de un producto viven en una hoja inferior en móvil y en línea desde
 * lg. Este ayudante abre la hoja solo cuando el disparador está visible, así la
 * misma spec sirve en los tres perfiles.
 */
async function productAction(page: Page, product: string, action: string): Promise<void> {
  const trigger = page.getByRole('button', { name: `Acciones de ${product}` });
  if (await trigger.isVisible()) await trigger.click();
  await page.getByRole('button', { name: action }).click();
}

test.describe.serial('gestión completa de carta de la Fase 5', () => {
  test.describe.configure({ timeout: 60_000 });

  let restaurant: CreatedRestaurant | null = null;
  let ownerEmail = '';
  const ownerPassword = 'OwnerPass-5!';

  test.beforeEach(async ({ request }) => {
    const suffix = `${Date.now()}-${test.info().parallelIndex}`;
    ownerEmail = `phase5-${suffix}@example.test`;
    const adminEmail = process.env.INITIAL_ADMIN_EMAIL;
    const adminPassword = process.env.INITIAL_ADMIN_PASSWORD;
    if (!adminEmail || !adminPassword) {
      throw new Error('Initial administrator credentials are required for E2E');
    }
    const token = await login(request, adminEmail, adminPassword, 'ADMIN');
    const created = await request.post(`${directApiUrl}/backoffice/restaurants`, {
      data: {
        email: ownerEmail,
        initialPassword: ownerPassword,
        name: `Bistró Gestión ${suffix}`,
      },
      headers: { authorization: `Bearer ${token}` },
    });
    expect(created.ok()).toBe(true);
    restaurant = (await created.json()) as CreatedRestaurant;
  });

  test.afterEach(async ({ request }) => {
    if (!restaurant) return;
    const token = await login(
      request,
      process.env.INITIAL_ADMIN_EMAIL ?? '',
      process.env.INITIAL_ADMIN_PASSWORD ?? '',
      'ADMIN',
    );
    await request.delete(`${directApiUrl}/backoffice/restaurants/${restaurant.id}`, {
      data: {
        acknowledgePermanentDeletion: true,
        confirmationText: `ELIMINAR ${restaurant.slug}`,
      },
      headers: { authorization: `Bearer ${token}` },
    });
    restaurant = null;
  });

  test('crea, ordena, publica, oculta y elimina productos sin cambiar la URL pública', { tag: '@movil' }, async ({
    context,
    page,
  }) => {
    if (!restaurant) throw new Error('Restaurant fixture was not created');

    await page.goto(`${webUrl}/admin/login`);
    await page.getByLabel('Correo del propietario').fill(ownerEmail);
    await page.getByLabel('Contraseña').fill(ownerPassword);
    await page.getByRole('button', { name: 'Entrar a mi restaurante' }).click();
    await page.getByRole('link', { name: /Carta/ }).click();
    await expect(page).toHaveURL(`${webUrl}/admin/menu`);

    await createCategory(page, 'Fondos');
    await createCategory(page, 'Bebidas');
    await page.getByRole('button', { name: 'Subir Bebidas' }).click();
    await expect.poll(async () => page.getByTestId('managed-category').locator('h3').allTextContents())
      .toEqual(['Bebidas', 'Fondos']);

    await page.getByRole('button', { name: 'Editar sección Fondos' }).click();
    await page.getByLabel('Nombre').fill('Platos de fondo');
    await page.getByRole('button', { name: 'Guardar sección' }).click();
    await expect(page.getByRole('heading', { name: 'Platos de fondo' })).toBeVisible();

    await page.getByRole('button', { name: 'Añadir producto a Platos de fondo' }).click();
    await page.getByLabel('Nombre').fill('Hamburguesa Sirio');
    await page.getByLabel('Descripción').fill('Pan artesanal, carne y salsa de la casa.');
    await page.getByLabel('Precio base (S/)').fill('24.50');
    await page.getByRole('button', { name: '+ Añadir variantes' }).click();
    await page.getByLabel('Variantes 1 nombre').fill('Doble');
    await page.getByLabel('Variantes 1 precio').fill('31.00');
    await page.getByRole('button', { name: '+ Añadir adicionales' }).click();
    await page.getByLabel('Adicionales 1 nombre').fill('Queso');
    await page.getByLabel('Adicionales 1 precio').fill('3.00');
    await page.getByLabel('Imagen del producto').setInputFiles({
      buffer: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
        'base64',
      ),
      mimeType: 'image/png',
      name: 'hamburguesa.png',
    });
    await page.getByRole('button', { name: 'Crear producto' }).click();
    await expect(page.getByText('Producto creado en el borrador.')).toBeVisible();
    await expect(page.getByText('1 variantes · 1 adicionales')).toBeVisible();

    await page.getByRole('button', { name: 'Añadir producto a Platos de fondo' }).click();
    await page.getByLabel('Nombre').fill('Ensalada fresca');
    await page.getByLabel('Precio base (S/)').fill('18.00');
    await page.getByRole('button', { name: 'Crear producto' }).click();
    await productAction(page, 'Ensalada fresca', 'Subir Ensalada fresca');
    const productNames = page.getByTestId('managed-category').filter({ hasText: 'Platos de fondo' })
      .getByTestId('product-name');
    await expect.poll(async () => productNames.allTextContents())
      .toEqual(['Ensalada fresca', 'Hamburguesa Sirio']);

    const publicPage = await context.newPage();
    const publicUrl = `${webUrl}/${restaurant.slug}`;
    await publicPage.goto(publicUrl, { waitUntil: 'networkidle' });
    await expect(publicPage.getByRole('heading', { name: 'Estamos preparando la carta' })).toBeVisible();

    await page.getByRole('button', { name: 'Publicar carta' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Sí, publicar carta' }).click();
    await expect(page.getByText('La carta pública se actualizó. El QR sigue siendo el mismo.')).toBeVisible();
    await publicPage.reload({ waitUntil: 'networkidle' });
    await expect(publicPage.getByRole('heading', { name: 'Hamburguesa Sirio' })).toBeVisible();
    await expect(publicPage.getByText('Doble S/ 31.00')).toBeVisible();
    await expect(publicPage.getByText('Queso S/ 3.00')).toBeVisible();
    await expect(publicPage.getByAltText('Hamburguesa Sirio')).toBeVisible();

    await productAction(page, 'Hamburguesa Sirio', 'Marcar no disponible Hamburguesa Sirio');
    await expect(page.getByText('Producto marcado como no disponible en el borrador.')).toBeVisible();
    await publicPage.reload({ waitUntil: 'networkidle' });
    await expect(publicPage.getByRole('heading', { name: 'Hamburguesa Sirio' })).toBeVisible();
    await page.getByRole('button', { name: 'Publicar cambios' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Sí, publicar carta' }).click();
    await publicPage.reload({ waitUntil: 'networkidle' });
    await expect(publicPage.getByRole('heading', { name: 'Hamburguesa Sirio' })).toHaveCount(0);
    await expect(publicPage).toHaveURL(publicUrl);

    await productAction(page, 'Hamburguesa Sirio', 'Hacer disponible Hamburguesa Sirio');
    await expect(page.getByText('Producto marcado como disponible en el borrador.')).toBeVisible();
    await publicPage.reload({ waitUntil: 'networkidle' });
    await expect(publicPage.getByRole('heading', { name: 'Hamburguesa Sirio' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Publicar cambios' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Sí, publicar carta' }).click();
    await publicPage.reload({ waitUntil: 'networkidle' });
    await expect(publicPage.getByRole('heading', { name: 'Hamburguesa Sirio' })).toBeVisible();

    page.once('dialog', (dialog) => dialog.accept());
    await productAction(page, 'Hamburguesa Sirio', 'Eliminar Hamburguesa Sirio');
    await expect(page.getByText('Producto eliminado del borrador.')).toBeVisible();
    await expect(page.getByText('Hamburguesa Sirio')).toHaveCount(0);
    await publicPage.reload({ waitUntil: 'networkidle' });
    await expect(publicPage.getByRole('heading', { name: 'Hamburguesa Sirio' })).toBeVisible();
    await page.getByRole('button', { name: 'Publicar cambios' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Sí, publicar carta' }).click();
    await publicPage.reload({ waitUntil: 'networkidle' });
    await expect(publicPage.getByRole('heading', { name: 'Hamburguesa Sirio' })).toHaveCount(0);
    await expect(publicPage).toHaveURL(publicUrl);
    await publicPage.close();
  });
});

async function createCategory(page: import('@playwright/test').Page, name: string): Promise<void> {
  await page.getByRole('button', { name: '+ Nueva sección' }).click();
  await page.getByLabel('Nombre').fill(name);
  await page.getByRole('button', { name: 'Guardar sección' }).click();
  await expect(page.getByRole('heading', { name })).toBeVisible();
}
