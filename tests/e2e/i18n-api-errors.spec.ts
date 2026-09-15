import { expect, test, type APIRequestContext, type BrowserContext, type Page } from '@playwright/test';

const directApiUrl = process.env.E2E_DIRECT_API_URL ?? 'http://127.0.0.1:3001/api';
const webUrl = process.env.E2E_WEB_URL ?? 'http://127.0.0.1:3000';

type Locale = 'en' | 'es';

interface CreatedRestaurant {
  id: string;
  slug: string;
}

interface DraftMenu {
  categories: Array<{ id: string; products: Array<{ id: string }> }>;
}

const LANGUAGES: Array<{ label: string; locale: Locale }> = [
  { label: 'español', locale: 'es' },
  { label: 'inglés', locale: 'en' },
];

// Lo que la persona debe leer. Si el código no viajara, la web mostraría el genérico
// por estado y estas aserciones fallarían.
const COPY: Record<Locale, Record<'duplicatedEmail' | 'emptyMenu' | 'expiredSession' | 'socialMismatch', string>> = {
  en: {
    duplicatedEmail: 'An owner account already uses that email.',
    emptyMenu: 'Add at least one available product before publishing the menu.',
    expiredSession: 'Your session has expired. Please sign in again.',
    socialMismatch: "The link doesn't point to Instagram or doesn't use HTTPS.",
  },
  es: {
    duplicatedEmail: 'Ya existe una cuenta de propietario con ese correo.',
    emptyMenu: 'Agrega al menos un producto disponible antes de publicar la carta.',
    expiredSession: 'Tu sesión expiró. Vuelve a ingresar.',
    socialMismatch: 'El enlace no corresponde a Instagram o no usa HTTPS.',
  },
};

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

/** Elige el idioma como lo haría el selector: la cookie de sesión que lee el servidor. */
async function chooseLanguage(context: BrowserContext, locale: Locale): Promise<void> {
  await context.addCookies([{ name: 'sirio-locale', url: webUrl, value: locale }]);
}

async function signInAsOwner(page: Page, email: string, password: string): Promise<void> {
  await page.goto(`${webUrl}/admin/login`);
  await page.getByLabel('Correo del propietario').fill(email);
  await page.getByLabel('Contraseña').fill(password);
  await page.getByRole('button', { name: 'Entrar a mi restaurante' }).click();
  await expect(page).toHaveURL(`${webUrl}/admin`, { timeout: 20_000 });
}

async function openProfile(page: Page): Promise<void> {
  await page.goto(`${webUrl}/admin`);
  await expect(page.getByLabel('Instagram')).toBeVisible({ timeout: 20_000 });
}

test.describe.serial('errores de la API traducidos por código', () => {
  // WebKit tarda bastante más que Chromium en el guard de sesión y en cada navegación.
  test.describe.configure({ timeout: 120_000 });

  let restaurant: CreatedRestaurant | null = null;
  let ownerEmail = '';
  const ownerPassword = 'ErroresPass-3!';

  test.beforeEach(async ({ request }) => {
    const suffix = `${Date.now()}-${test.info().parallelIndex}`;
    ownerEmail = `errores-${suffix}@example.test`;
    const created = await request.post(`${directApiUrl}/backoffice/restaurants`, {
      data: { email: ownerEmail, initialPassword: ownerPassword, name: `Errores E2E ${suffix}` },
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

  for (const { label, locale } of LANGUAGES) {
    test(
      `publicar una carta que se quedó sin productos disponibles lo explica en ${label}`,
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
          data: { basePrice: '32.00', categoryId, name: 'Lomo saltado' },
          headers,
        });
        expect(withProduct.ok()).toBe(true);
        const productId = ((await withProduct.json()) as DraftMenu).categories[0]?.products[0]?.id;

        await signInAsOwner(page, ownerEmail, ownerPassword);
        await chooseLanguage(context, locale);
        await page.goto(`${webUrl}/admin/menu`);
        const publish = page.getByRole('button', { name: 'Publicar carta' });
        await expect(publish).toBeEnabled({ timeout: 20_000 });
        await publish.click();
        const confirm = page.getByRole('dialog').getByRole('button', { name: 'Sí, publicar carta' });
        await expect(confirm).toBeVisible();

        // Mientras la confirmación sigue abierta, el único producto deja de estar disponible.
        const hidden = await request.patch(`${menuPath}/products/${productId}/availability`, {
          data: { isAvailable: false },
          headers,
        });
        expect(hidden.ok()).toBe(true);

        const refused = page.waitForResponse(
          (response) => response.url().endsWith('/menu/publish') && response.request().method() === 'POST',
        );
        await confirm.click();
        const response = await refused;
        expect(response.status()).toBe(400);
        await expect(response.json()).resolves.toMatchObject({ code: 'MENU_EMPTY' });
        await expect(page.getByRole('alert').filter({ hasText: COPY[locale].emptyMenu })).toBeVisible();
      },
    );

    test(
      `guardar el perfil con la sesión vencida pide volver a ingresar en ${label}`,
      { tag: '@movil' },
      async ({ context, page }) => {
        await signInAsOwner(page, ownerEmail, ownerPassword);
        await chooseLanguage(context, locale);
        await openProfile(page);

        // La sesión se pierde con la pantalla abierta; el BFF responde antes de llegar a Nest.
        await context.clearCookies({ name: /^sirio_(access|refresh|role)$/ });
        const refused = page.waitForResponse(
          (response) => response.url().endsWith('/profile') && response.request().method() === 'PATCH',
        );
        await page.getByRole('button', { name: 'Guardar perfil' }).click();
        const response = await refused;
        expect(response.status()).toBe(401);
        await expect(response.json()).resolves.toMatchObject({ code: 'SESSION_EXPIRED' });
        await expect(
          page.getByRole('alert').filter({ hasText: COPY[locale].expiredSession }),
        ).toBeVisible();
      },
    );

    test(
      `dar de alta un restaurante con un correo ya usado lo explica en ${label}`,
      { tag: '@movil' },
      async ({ context, page }) => {
        await page.goto(`${webUrl}/login`);
        await page.getByLabel('Correo del administrador').fill(process.env.INITIAL_ADMIN_EMAIL ?? '');
        await page.getByLabel('Contraseña').fill(process.env.INITIAL_ADMIN_PASSWORD ?? '');
        await page.getByRole('button', { name: 'Entrar al backoffice' }).click();
        await expect(page).toHaveURL(`${webUrl}/backoffice`, { timeout: 20_000 });
        await chooseLanguage(context, locale);
        await page.goto(`${webUrl}/backoffice`);

        await page.getByRole('button', { name: 'Nuevo restaurante' }).click();
        await page.getByLabel('Nombre del restaurante').fill('Restaurante repetido');
        await page.getByLabel('Correo del dueño').fill(ownerEmail);
        await page.getByLabel(/Contraseña inicial/).fill('OtraClave-9!');
        const refused = page.waitForResponse(
          (response) =>
            response.url().endsWith('/api/backoffice/restaurants') && response.request().method() === 'POST',
        );
        await page.getByRole('button', { name: 'Crear restaurante' }).click();
        const response = await refused;
        expect(response.status()).toBe(409);
        await expect(response.json()).resolves.toMatchObject({ code: 'OWNER_EMAIL_TAKEN' });
        await expect(
          page.getByRole('alert').filter({ hasText: COPY[locale].duplicatedEmail }),
        ).toBeVisible();
      },
    );

    test(
      `un enlace que no es de Instagram se rechaza con un mensaje en ${label}`,
      { tag: '@movil' },
      async ({ context, page }) => {
        await signInAsOwner(page, ownerEmail, ownerPassword);
        await chooseLanguage(context, locale);
        await openProfile(page);

        await page.getByLabel('Instagram').fill('https://evil.test/instagram.com/bistro');
        const refused = page.waitForResponse(
          (response) => response.url().endsWith('/profile') && response.request().method() === 'PATCH',
        );
        await page.getByRole('button', { name: 'Guardar perfil' }).click();
        const response = await refused;
        expect(response.status()).toBe(400);
        await expect(response.json()).resolves.toMatchObject({
          code: 'SOCIAL_URL_MISMATCH',
          params: { network: 'instagram' },
        });
        await expect(
          page.getByRole('alert').filter({ hasText: COPY[locale].socialMismatch }),
        ).toBeVisible();
      },
    );
  }
});
