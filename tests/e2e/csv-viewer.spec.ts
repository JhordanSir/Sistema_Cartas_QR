import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

const directApiUrl = process.env.E2E_DIRECT_API_URL ?? 'http://127.0.0.1:3001/api';
const webUrl = process.env.E2E_WEB_URL ?? 'http://127.0.0.1:3000';

interface CreatedRestaurant {
  id: string;
  slug: string;
}

/** What Excel in Spanish saves as "CSV": semicolons, Windows-1252, CRLF. */
const EXCEL_CSV = Buffer.from(
  [
    'plato;precio;sección',
    '"Ceviche',
    'clásico";35,50;Entradas',
    'Piña colada;18;Bebidas',
    'Causa;22,90;Entradas;extra',
    'Chicha;8;Bebidas',
    '',
  ].join('\r\n'),
  'latin1',
);

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

function dataRows(page: Page) {
  return page.getByRole('table', { name: 'Contenido del CSV' }).locator('tbody tr');
}

async function upload(page: Page, name: string, buffer: Buffer): Promise<void> {
  await page.getByTestId('csv-file-input').setInputFiles({ buffer, mimeType: 'text/csv', name });
}

test.describe.serial('visor de CSV con Web Workers', () => {
  // WebKit tarda bastante más que Chromium en el guard de sesión y en cada navegación.
  test.describe.configure({ timeout: 120_000 });

  let restaurant: CreatedRestaurant | null = null;
  let ownerEmail = '';
  const ownerPassword = 'VisorCsv-6!';

  test.beforeEach(async ({ request }) => {
    const suffix = `${Date.now()}-${test.info().parallelIndex}`;
    ownerEmail = `visor-csv-${suffix}@example.test`;
    const created = await request.post(`${directApiUrl}/backoffice/restaurants`, {
      data: { email: ownerEmail, initialPassword: ownerPassword, name: `Visor CSV ${suffix}` },
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

  test('el dueño abre un CSV de Excel desde Carta y el worker lo muestra en una tabla', { tag: '@movil' }, async ({ page }) => {
    await signIn(page, ownerEmail, ownerPassword);
    await page.goto(`${webUrl}/admin/menu`);
    await page.getByRole('link', { name: 'Abrir un CSV' }).click();
    await expect(page).toHaveURL(`${webUrl}/admin/csv`);

    await upload(page, 'carta-excel.csv', EXCEL_CSV);

    await expect(dataRows(page)).toHaveCount(4);
    await expect(page.getByTestId('csv-source')).toContainText('Sin guardar: carta-excel.csv');
    await expect(page.getByRole('combobox', { name: 'Separador' })).toHaveText(/Automático \(punto y coma\)/);
    await expect(page.getByRole('combobox', { name: 'Codificación' })).toHaveText(/Automática \(Windows-1252\)/);
    await expect(page.getByRole('columnheader', { name: 'Ordenar por sección' })).toBeVisible();
    await expect(dataRows(page).first()).toContainText('Ceviche\nclásico');
    await expect(page.getByRole('img', { name: '4 columnas, se esperaban 3' })).toBeVisible();
    await expect(page.getByText('Avisos: 1 fila con otra cantidad de columnas')).toBeVisible();

    await page.getByRole('button', { name: 'Ordenar por precio' }).click();
    await expect(dataRows(page).locator('td:nth-of-type(1)')).toHaveText(['Chicha', 'Piña colada', 'Causa', 'Ceviche\nclásico']);

    await page.getByLabel('Buscar en todas las columnas').fill('pina');
    await expect(dataRows(page)).toHaveCount(1);
    await expect(dataRows(page)).toContainText('Piña colada');
    await expect(page.getByText('1 de 4 filas coinciden')).toBeVisible();
  });

  test('guarda el CSV, lo reabre al entrar y pide confirmar antes de reemplazarlo', { tag: '@movil' }, async ({ page }) => {
    await signIn(page, ownerEmail, ownerPassword);
    await page.goto(`${webUrl}/admin/csv`);
    await upload(page, 'primera.csv', Buffer.from('sku,nombre\n1,Ceviche\n2,Chicha\n'));
    await expect(dataRows(page)).toHaveCount(2);

    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByText('Guardado: «primera.csv» es ahora el CSV de tu restaurante.')).toBeVisible();

    await page.reload();
    await expect(page.getByTestId('csv-source')).toContainText('Guardado: primera.csv');
    await expect(dataRows(page)).toHaveCount(2);
    await expect(page.getByRole('button', { name: 'Guardar' })).toBeDisabled();

    await upload(page, 'segunda.csv', Buffer.from('sku,nombre\n3,Causa\n'));
    await expect(dataRows(page)).toHaveCount(1);
    await page.getByRole('button', { name: 'Guardar' }).click();
    const dialog = page.getByRole('dialog', { name: '¿Reemplazar el CSV guardado?' });
    await expect(dialog).toContainText('«primera.csv»');
    await dialog.getByRole('button', { name: 'Conservar el guardado' }).click();
    await expect(dialog).toBeHidden();

    await page.getByRole('button', { name: 'Guardar' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Reemplazar' }).click();
    await expect(page.getByText('Guardado: «segunda.csv» es ahora el CSV de tu restaurante.')).toBeVisible();
  });
});
