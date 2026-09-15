import { expect, test, type APIRequestContext, type BrowserContext, type Page } from '@playwright/test';

const directApiUrl = process.env.E2E_DIRECT_API_URL ?? 'http://127.0.0.1:3001/api';
const webUrl = process.env.E2E_WEB_URL ?? 'http://127.0.0.1:3000';

interface CreatedRestaurant {
  id: string;
  slug: string;
}

interface DraftMenu {
  categories: Array<{ id: string }>;
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

/** Entra en español y cambia a inglés con la misma cookie de sesión que escribe el selector. */
async function signInInEnglish(
  context: BrowserContext,
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto(`${webUrl}/admin/login`);
  await page.getByLabel('Correo del propietario').fill(email);
  await page.getByLabel('Contraseña').fill(password);
  await page.getByRole('button', { name: 'Entrar a mi restaurante' }).click();
  await expect(page).toHaveURL(`${webUrl}/admin`, { timeout: 20_000 });
  await context.addCookies([{ name: 'sirio-locale', url: webUrl, value: 'en' }]);
}

/** True when the document itself scrolls sideways, which it never should. */
async function scrollsSideways(page: Page): Promise<boolean> {
  return page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
}

test.describe.serial('panel del dueño en inglés', () => {
  // WebKit tarda bastante más que Chromium en el guard de sesión y en cada navegación.
  test.describe.configure({ timeout: 120_000 });

  let restaurant: CreatedRestaurant | null = null;
  let restaurantName = '';
  let ownerEmail = '';
  const ownerPassword = 'IdiomaPanel-4!';

  test.beforeEach(async ({ request }) => {
    const suffix = `${Date.now()}-${test.info().parallelIndex}`;
    ownerEmail = `panel-en-${suffix}@example.test`;
    restaurantName = `Bistró Idioma ${suffix}`;
    const created = await request.post(`${directApiUrl}/backoffice/restaurants`, {
      data: { email: ownerEmail, initialPassword: ownerPassword, name: restaurantName },
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

  test('el perfil se edita y guarda en inglés', { tag: '@movil' }, async ({ context, page }) => {
    await signInInEnglish(context, page, ownerEmail, ownerPassword);
    await page.goto(`${webUrl}/admin`);

    await expect(page.getByRole('heading', { name: 'Your profile', level: 1 })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    const navigation = page.getByRole('navigation', { name: 'Restaurant panel' });
    await expect(navigation.getByRole('link', { name: 'Profile' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    // El nombre es contenido del dueño: se ve igual en cualquier idioma.
    await expect(page.getByRole('heading', { name: restaurantName, level: 2 })).toBeVisible();

    await page.getByLabel('Phone').fill('(01) 555-0199');
    await page.getByLabel('Address').fill('Av. Central 456, Miraflores');
    await page.getByRole('button', { name: 'Save profile' }).click();
    await expect(
      page.getByText("Profile saved. Your restaurant's identity is up to date."),
    ).toBeVisible();
    await expect(page.getByLabel('2 of 5 details completed')).toBeVisible();
    expect(await scrollsSideways(page)).toBe(false);
  });

  test(
    'la carta muestra conteos, precios y publicación en inglés',
    { tag: '@movil' },
    async ({ context, page, request }) => {
      if (!restaurant) throw new Error('Restaurant fixture was not created');
      const menuPath = `${directApiUrl}/owner/restaurants/${restaurant.id}/menu`;
      const headers = {
        authorization: `Bearer ${await apiLogin(request, ownerEmail, ownerPassword, 'OWNER')}`,
      };
      const withCategory = await request.post(`${menuPath}/categories`, {
        data: { name: 'Fondos' },
        headers,
      });
      expect(withCategory.ok()).toBe(true);
      const categoryId = ((await withCategory.json()) as DraftMenu).categories[0]?.id;
      const withProduct = await request.post(`${menuPath}/products`, {
        data: {
          basePrice: '32.00',
          categoryId,
          extras: [{ name: 'Queso', price: '3.00' }],
          name: 'Lomo saltado',
          variants: [{ name: 'Doble', price: '41.00' }],
        },
        headers,
      });
      expect(withProduct.ok()).toBe(true);

      await signInInEnglish(context, page, ownerEmail, ownerPassword);
      await page.goto(`${webUrl}/admin/menu`);

      await expect(
        page.getByRole('heading', { name: 'Get the next version of your menu ready.' }),
      ).toBeVisible({ timeout: 20_000 });
      await expect(page.getByText('1 section · 1 product')).toBeVisible();
      const section = page.getByTestId('managed-category');
      await expect(section.getByRole('heading', { name: 'Fondos' })).toBeVisible();
      await expect(section.getByText('Lomo saltado')).toBeVisible();
      await expect(section.getByText('1 variant · 1 add-on')).toBeVisible();
      await expect(section.getByText(/^PEN\s32\.00$/)).toBeVisible();
      await expect(page.getByRole('radio', { name: 'Traditional' })).toBeVisible();

      await page.getByRole('button', { name: 'Publish menu' }).click();
      await page.getByRole('dialog').getByRole('button', { name: 'Yes, publish menu' }).click();
      await expect(
        page.getByText('Your public menu is updated. The QR code stays the same.'),
      ).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Your public menu is up to date' })).toBeVisible();
      expect(await scrollsSideways(page)).toBe(false);
    },
  );

  test('el QR se descarga y comparte desde la pantalla en inglés', { tag: '@movil' }, async ({
    context,
    page,
  }) => {
    if (!restaurant) throw new Error('Restaurant fixture was not created');
    await signInInEnglish(context, page, ownerEmail, ownerPassword);
    await page.goto(`${webUrl}/admin/qr`);

    await expect(page.getByRole('heading', { name: 'Your QR code never changes' })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByAltText(`QR code for ${restaurantName}`)).toBeVisible();
    await expect(page.getByRole('link', { name: 'Download PNG' })).toHaveAttribute(
      'href',
      `/api/owner/restaurants/${restaurant.id}/qr/png?download=true`,
    );
    await expect(page.getByRole('link', { name: 'Download SVG' })).toHaveAttribute(
      'href',
      `/api/owner/restaurants/${restaurant.id}/qr/svg?download=true`,
    );
    await expect(page.getByRole('button', { name: 'Copy link' })).toBeEnabled();
    await expect(page.getByRole('link', { name: 'Try the public link ↗' })).toHaveAttribute(
      'href',
      new RegExp(`/${restaurant.slug}$`),
    );
    expect(await scrollsSideways(page)).toBe(false);
  });

  test('estadísticas y guías de ayuda se leen en inglés', { tag: '@movil' }, async ({
    context,
    page,
  }) => {
    await signInInEnglish(context, page, ownerEmail, ownerPassword);
    await page.goto(`${webUrl}/admin/statistics`);

    await expect(page.getByRole('heading', { name: 'Statistics', level: 1 })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByRole('heading', { name: 'Hourly rhythm' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Daily rhythm' })).toBeVisible();
    await expect(page.getByText('Peru time · UTC−5')).toBeVisible();
    await expect(page.getByText(/Nobody has opened this QR code yet/)).toBeVisible();
    await expect(page.getByText('Last 30 days')).toBeVisible();
    expect(await scrollsSideways(page)).toBe(false);

    await page.getByRole('navigation', { name: 'Restaurant panel' }).getByRole('link', { name: 'Help' }).click();
    await expect(
      page.getByRole('heading', { name: 'Learn to run your menu from your phone.' }),
    ).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('details')).toHaveCount(5);
    await expect(page.getByText('Sign in to your panel')).toBeVisible();
    await page.locator('summary').filter({ hasText: 'Share your QR code' }).click();
    await expect(page.getByRole('link', { name: /Go to QR/ })).toBeVisible();
    await expect(page.getByText('Tap “Copy link” to share it on WhatsApp or social media.')).toBeVisible();
    expect(await scrollsSideways(page)).toBe(false);
  });
});
