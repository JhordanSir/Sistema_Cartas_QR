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

function adminCredentials(): { email: string; password: string } {
  const email = process.env.INITIAL_ADMIN_EMAIL;
  const password = process.env.INITIAL_ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error('Initial administrator credentials are required for E2E');
  }
  return { email, password };
}

async function scrollsSideways(page: Page): Promise<boolean> {
  return page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
}

test.describe.serial('landing y pantallas de acceso', () => {
  let restaurant: CreatedRestaurant | null = null;
  let ownerEmail = '';
  const ownerPassword = 'AccessPass-5!';

  test.beforeEach(async ({ request }) => {
    const suffix = `${Date.now()}-${test.info().parallelIndex}`;
    ownerEmail = `acceso-${suffix}@example.test`;
    const admin = adminCredentials();
    const token = await login(request, admin.email, admin.password, 'ADMIN');
    const created = await request.post(`${directApiUrl}/backoffice/restaurants`, {
      data: {
        email: ownerEmail,
        initialPassword: ownerPassword,
        name: `Acceso E2E ${suffix}`,
      },
      headers: { authorization: `Bearer ${token}` },
    });
    expect(created.ok()).toBe(true);
    restaurant = (await created.json()) as CreatedRestaurant;
  });

  test.afterEach(async ({ request }) => {
    if (!restaurant) return;
    const admin = adminCredentials();
    const token = await login(request, admin.email, admin.password, 'ADMIN');
    await request.delete(`${directApiUrl}/backoffice/restaurants/${restaurant.id}`, {
      data: {
        acknowledgePermanentDeletion: true,
        confirmationText: `ELIMINAR ${restaurant.slug}`,
      },
      headers: { authorization: `Bearer ${token}` },
    });
    restaurant = null;
  });

  test(
    'la landing lleva al acceso del dueño y responde las dudas sin JavaScript de por medio',
    { tag: '@movil' },
    async ({ page }) => {
      await page.goto(webUrl);

      await expect(page.getByRole('heading', { name: /tu carta trabaja/i })).toBeVisible();
      expect(await scrollsSideways(page)).toBe(false);

      // El acceso de administración no compite con el del dueño en la cabecera.
      const adminLink = page.getByRole('link', { name: 'Administración' });
      await expect(adminLink).toHaveCount(1);
      await expect(adminLink).toHaveAttribute('href', '/login');

      const question = page.getByText('¿El QR cambia si actualizo mi carta?');
      await expect(question).toBeVisible();
      await expect(page.getByText(/El código se imprime una sola vez/)).toBeHidden();
      await question.click();
      await expect(page.getByText(/El código se imprime una sola vez/)).toBeVisible();

      await page.getByRole('link', { name: 'Ingresar', exact: true }).click();
      await expect(page).toHaveURL(`${webUrl}/admin/login`);
      await expect(page.getByRole('heading', { name: 'Tu carta empieza aquí.' })).toBeVisible();
    },
  );

  test(
    'el dueño entra con sus credenciales y ve un error claro cuando falla',
    { tag: '@movil' },
    async ({ page }) => {
      await page.goto(`${webUrl}/admin/login`);
      expect(await scrollsSideways(page)).toBe(false);

      await page.getByLabel('Correo del propietario').fill(ownerEmail);
      await page.getByLabel('Contraseña').fill('contraseña-equivocada');
      await page.getByRole('button', { name: 'Entrar a mi restaurante' }).click();

      // getByRole('alert') también coincide con el anunciador de rutas de Next,
      // que es un contenedor vacío siempre presente.
      await expect(
        page.getByText('El correo o la contraseña no son correctos.'),
      ).toBeVisible();
      await expect(page).toHaveURL(`${webUrl}/admin/login`);

      await page.getByLabel('Contraseña').fill(ownerPassword);
      await page.getByRole('button', { name: 'Entrar a mi restaurante' }).click();
      await expect(page).toHaveURL(`${webUrl}/admin`);
      await expect(page.getByRole('navigation', { name: 'Panel del restaurante' })).toBeVisible();
    },
  );

  test(
    'la contraseña se puede revisar antes de enviarla',
    { tag: '@movil' },
    async ({ page }) => {
      await page.goto(`${webUrl}/admin/login`);

      const password = page.getByLabel('Contraseña');
      await password.fill(ownerPassword);
      await expect(password).toHaveAttribute('type', 'password');

      const reveal = page.getByRole('button', { name: 'Mostrar' });
      expect((await reveal.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
      await reveal.click();

      await expect(password).toHaveAttribute('type', 'text');
      await expect(password).toHaveValue(ownerPassword);
      await page.getByRole('button', { name: 'Ocultar' }).click();
      await expect(password).toHaveAttribute('type', 'password');
    },
  );

  test(
    'el administrador entra por su propia puerta',
    { tag: '@movil' },
    async ({ page }) => {
      const admin = adminCredentials();
      await page.goto(`${webUrl}/login`);
      expect(await scrollsSideways(page)).toBe(false);

      await expect(page.getByRole('heading', { name: 'Tu mesa de control.' })).toBeVisible();
      await page.getByLabel('Correo del administrador').fill(admin.email);
      await page.getByLabel('Contraseña').fill(admin.password);
      await page.getByRole('button', { name: 'Entrar al backoffice' }).click();

      await expect(page).toHaveURL(`${webUrl}/backoffice`);
      await expect(page.getByRole('navigation', { name: 'Backoffice' })).toBeVisible();
    },
  );

  test(
    'una dirección inexistente explica qué pasó y ofrece la salida',
    { tag: '@movil' },
    async ({ page }) => {
      await page.goto(`${webUrl}/restaurante-que-no-existe`);

      await expect(
        page.getByRole('heading', { name: 'Esta carta no está disponible.' }),
      ).toBeVisible();
      await expect(page.getByRole('link', { name: 'Volver al inicio' })).toHaveAttribute(
        'href',
        '/',
      );
      expect(await scrollsSideways(page)).toBe(false);
    },
  );
});
