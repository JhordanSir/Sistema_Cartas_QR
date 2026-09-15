import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

const directApiUrl = process.env.E2E_DIRECT_API_URL ?? 'http://127.0.0.1:3001/api';
const webUrl = process.env.E2E_WEB_URL ?? 'http://127.0.0.1:3000';

interface CreatedRestaurant {
  id: string;
  slug: string;
}

async function adminToken(request: APIRequestContext): Promise<string> {
  const email = process.env.INITIAL_ADMIN_EMAIL;
  const password = process.env.INITIAL_ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error('Initial administrator credentials are required for E2E');
  }
  const response = await request.post(`${directApiUrl}/auth/login`, {
    data: { email, password, role: 'ADMIN' },
  });
  expect(response.ok()).toBe(true);
  return ((await response.json()) as { accessToken: string }).accessToken;
}

/** True when the document itself scrolls sideways, which it never should. */
async function scrollsSideways(page: Page): Promise<boolean> {
  return page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
}

test.describe('selector de idioma', () => {
  test(
    'la landing y los accesos cambian a inglés y vuelven a español sin perder lo escrito',
    { tag: '@movil' },
    async ({ context, page }) => {
      await page.goto(webUrl);
      await expect(page.locator('html')).toHaveAttribute('lang', 'es');
      await expect(page.getByRole('heading', { name: /tu carta trabaja/i })).toBeVisible();
      const idioma = page.getByLabel('Idioma');
      await expect(idioma).toHaveValue('es');
      expect(await scrollsSideways(page)).toBe(false);

      await idioma.selectOption('en');
      await expect(page.getByRole('heading', { name: /your menu works/i })).toBeVisible();
      await expect(page.locator('html')).toHaveAttribute('lang', 'en');
      await expect(page).toHaveTitle('Sirio Automatiza | QR Menus');
      expect(await scrollsSideways(page)).toBe(false);

      // Cookie de sesión: sin fecha de expiración, termina con el navegador.
      const cookie = (await context.cookies()).find((entry) => entry.name === 'sirio-locale');
      expect(cookie?.value).toBe('en');
      expect(cookie?.expires).toBe(-1);
      expect(cookie?.httpOnly).toBe(true);

      await page.reload();
      await expect(page.getByRole('heading', { name: /your menu works/i })).toBeVisible();

      await page.getByRole('link', { exact: true, name: 'Sign in' }).click();
      await expect(page).toHaveURL(`${webUrl}/admin/login`);
      await expect(page.getByRole('heading', { name: 'Your menu starts here.' })).toBeVisible();

      await page.getByLabel('Owner email').fill('hola@turestaurante');
      await page.getByLabel('Password').fill('OwnerPass-1');
      await page.getByRole('button', { name: 'Go to my restaurant' }).click();
      await expect(
        page.getByText('Enter a valid email, for example name@domain.com.'),
      ).toBeVisible();

      // Volver a español re-renderiza el servidor pero conserva el estado del formulario:
      // el aviso sigue ahí, ahora en español, y lo escrito no se pierde.
      await page.getByLabel('Language').selectOption('es');
      await expect(page.getByRole('heading', { name: 'Tu carta empieza aquí.' })).toBeVisible();
      await expect(page.locator('html')).toHaveAttribute('lang', 'es');
      await expect(
        page.getByText('Escribe un correo válido, por ejemplo nombre@dominio.com.'),
      ).toBeVisible();
      await expect(page.getByLabel('Correo del propietario')).toHaveValue('hola@turestaurante');
    },
  );

  test.describe('en el panel', () => {
    let restaurant: CreatedRestaurant | null = null;
    let ownerEmail = '';
    const ownerPassword = 'IdiomaPass-1!';

    test.beforeEach(async ({ request }) => {
      const suffix = `${Date.now()}-${test.info().parallelIndex}`;
      ownerEmail = `idioma-${suffix}@example.test`;
      const created = await request.post(`${directApiUrl}/backoffice/restaurants`, {
        data: { email: ownerEmail, initialPassword: ownerPassword, name: `Idioma E2E ${suffix}` },
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
      'el idioma elegido al entrar se mantiene y el selector convive con el tema',
      { tag: '@movil' },
      async ({ page }) => {
        await page.goto(`${webUrl}/admin/login`);
        await page.getByLabel('Idioma').selectOption('en');
        await expect(page.getByRole('heading', { name: 'Your menu starts here.' })).toBeVisible();

        await page.getByLabel('Owner email').fill(ownerEmail);
        await page.getByLabel('Password').fill(ownerPassword);
        await page.getByRole('button', { name: 'Go to my restaurant' }).click();
        await expect(page).toHaveURL(`${webUrl}/admin`);

        // El guard valida la sesión en cliente; WebKit tarda en resolverlo.
        const signOut = page.getByRole('button', { name: 'Sign out' });
        await expect(signOut).toBeVisible({ timeout: 20_000 });
        const language = page.getByLabel('Language');
        await expect(language).toHaveValue('en');
        await expect(page.getByRole('button', { name: /Change theme/ })).toBeVisible();
        expect((await language.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
        expect(await scrollsSideways(page)).toBe(false);

        await language.selectOption('es');
        await expect(page.getByRole('button', { name: 'Cerrar sesión' })).toBeVisible();
        await expect(page.getByRole('button', { name: /Cambiar tema/ })).toBeVisible();
        expect(await scrollsSideways(page)).toBe(false);
      },
    );
  });
});
