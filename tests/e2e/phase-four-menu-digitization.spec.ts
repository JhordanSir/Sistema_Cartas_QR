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
 * lg. Este ayudante abre la hoja solo cuando el disparador está visible.
 */
async function productAction(page: Page, product: string, action: string): Promise<void> {
  const trigger = page.getByRole('button', { name: `Acciones de ${product}` });
  if (await trigger.isVisible()) await trigger.click();
  const control = page.getByRole('button', { name: action, exact: true });
  await expect(control).toBeVisible();
  await control.click();
}

test.describe.serial('digitalización de carta de la Fase 4', () => {
  test.setTimeout(120_000);

  let restaurant: CreatedRestaurant | null = null;
  let ownerEmail = '';
  const ownerPassword = 'OwnerPass-4!';

  test.beforeEach(async ({ request }) => {
    const suffix = `${Date.now()}-${test.info().parallelIndex}`;
    ownerEmail = `phase4-${suffix}@example.test`;
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
        name: `Bistró Gemini ${suffix}`,
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

  test('mantiene el borrador privado hasta publicar y conserva la carta anterior durante una corrección', async ({ browser, page }) => {
    if (!restaurant) throw new Error('Restaurant fixture was not created');
    const photoPage = await browser.newPage({ viewport: { height: 1500, width: 1200 } });
    await photoPage.setContent(`
      <style>
        body { margin: 0; padding: 80px; background: #f4ead6; color: #24382d; font-family: Georgia, serif; }
        main { min-height: 1260px; padding: 70px; border: 8px double #a95632; }
        h1 { margin: 0 0 60px; font-size: 88px; text-align: center; letter-spacing: 8px; }
        h2 { margin: 45px 0 22px; border-bottom: 3px solid #a95632; font-size: 44px; }
        article { display: grid; grid-template-columns: 1fr auto; margin: 28px 0; }
        h3 { margin: 0; font-size: 34px; }
        strong { font-size: 30px; }
        p { margin: 8px 0 0; font-size: 22px; }
      </style>
      <main>
        <h1>CARTA</h1>
        <h2>PLATOS DE FONDO</h2>
        <article><div><h3>Lomo Salatado</h3><p>Carne al wok, papas fritas y arroz.</p></div><strong>S/ 28.00</strong></article>
        <article><div><h3>Ají de Gallina</h3><p>Pollo deshilachado en cremosa salsa de ají amarillo.</p></div><strong>S/ 24.00</strong></article>
        <h2>BEBIDAS</h2>
        <article><div><h3>Limonada</h3><p>Vaso personal.</p></div><strong>S/ 7.00</strong></article>
      </main>
    `);
    const menuPhoto = await photoPage.screenshot({ fullPage: true, type: 'png' });
    await photoPage.close();

    await page.goto(`${webUrl}/admin/login`);
    await page.getByLabel('Correo del propietario').fill(ownerEmail);
    await page.getByLabel('Contraseña').fill(ownerPassword);
    await page.getByRole('button', { name: 'Entrar a mi restaurante' }).click();
    await page.getByRole('link', { name: /Carta/ }).click();
    await expect(page).toHaveURL(`${webUrl}/admin/menu`);
    await page.getByLabel('Fotos de la carta').setInputFiles({
      buffer: menuPhoto,
      mimeType: 'image/png',
      name: 'carta-fase-4.png',
    });
    await page.getByRole('button', { name: 'Digitalizar en borrador' }).click();
    await expect(page.getByText('Carta digitalizada. Revísala y publícala cuando esté lista.')).toBeVisible({
      timeout: 90_000,
    });
    await expect(
      page.getByTestId('managed-category').locator('article').filter({ hasText: 'Lomo Salatado' }).getByText('Lomo Salatado'),
    ).toBeVisible();
    await expect(
      page.getByTestId('managed-category').locator('article').filter({ hasText: 'Lomo Salatado' }).getByText('S/ 28.00'),
    ).toBeVisible();

    await page.getByRole('radio', { name: 'Casual' }).click();
    await expect(page.getByText('Plantilla aplicada al borrador. Publícala cuando estés conforme.')).toBeVisible();
    await page.getByRole('button', { name: 'Previsualizar borrador' }).click();
    await expect(page.getByText('Previsualización del borrador')).toBeVisible();
    await page.getByRole('button', { name: 'Cerrar previsualización' }).click();

    await page.goto(`${webUrl}/${restaurant.slug}`);
    await expect(page.getByRole('heading', { name: 'Estamos preparando la carta' })).toBeVisible();

    await page.goto(`${webUrl}/admin/menu`);
    await page.getByRole('button', { name: 'Publicar carta' }).click();
    await page.getByRole('button', { name: 'Sí, publicar carta' }).click();
    await expect(page.getByText('La carta pública se actualizó. El QR sigue siendo el mismo.')).toBeVisible();

    await page.goto(`${webUrl}/${restaurant.slug}`);
    await expect(page.getByRole('heading', { name: 'Lomo Salatado' })).toBeVisible();

    await page.goto(`${webUrl}/admin/menu`);
    await productAction(page, 'Lomo Salatado', 'Editar Lomo Salatado');
    await page.getByLabel('Nombre').fill('Lomo Saltado');
    await page.getByRole('button', { name: 'Guardar producto' }).click();
    await expect(page.getByText('Producto actualizado en el borrador.')).toBeVisible();
    await expect(
      page.getByTestId('managed-category').locator('article').filter({ hasText: 'Lomo Saltado' }).getByText('Lomo Saltado'),
    ).toBeVisible();

    await page.goto(`${webUrl}/${restaurant.slug}`);
    await expect(page.getByRole('heading', { name: 'Lomo Salatado' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Lomo Saltado' })).not.toBeVisible();

    await page.goto(`${webUrl}/admin/menu`);
    await page.getByRole('button', { name: 'Publicar cambios' }).click();
    await page.getByRole('button', { name: 'Sí, publicar carta' }).click();
    await expect(page.getByText('La carta pública se actualizó. El QR sigue siendo el mismo.')).toBeVisible();

    await page.goto(`${webUrl}/${restaurant.slug}`);
    await expect(page.getByRole('heading', { name: 'Lomo Saltado' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Platos de Fondo' })).toBeVisible();
    await expect(page.getByText('S/ 28.00')).toBeVisible();
  });
});
