import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

const directApiUrl = process.env.E2E_DIRECT_API_URL ?? 'http://127.0.0.1:3001/api';
const webUrl = process.env.E2E_WEB_URL ?? 'http://127.0.0.1:3000';

const OWNER_DESTINATIONS = ['Perfil', 'Carta', 'QR', 'Estadísticas', 'Ayuda'];

const OWNER_SCREENS = [
  { active: 'Perfil', path: '/admin' },
  { active: 'Carta', path: '/admin/menu' },
  { active: 'QR', path: '/admin/qr' },
  { active: 'Estadísticas', path: '/admin/statistics' },
  { active: 'Ayuda', path: '/admin/help' },
];

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

/** True when the document itself scrolls sideways, which it never should. */
async function scrollsSideways(page: Page): Promise<boolean> {
  return page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
}

test.describe.serial('el panel del dueño se maneja con el pulgar', () => {
  test.describe.configure({ timeout: 90_000 });

  let restaurant: CreatedRestaurant | null = null;
  let ownerEmail = '';
  const ownerPassword = 'OwnerPass-8!';

  test.beforeEach(async ({ page, request, viewport }) => {
    // Verifica el comportamiento móvil del panel: en escritorio la barra inferior no
    // existe y las acciones de producto van en línea, así que no aplica.
    test.skip(
      (viewport?.width ?? 0) >= 1024,
      'La spec cubre el comportamiento del panel en pantalla estrecha',
    );

    const suffix = `${Date.now()}-${test.info().parallelIndex}`;
    ownerEmail = `responsive-${suffix}@example.test`;
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
        name: `Panel Responsivo ${suffix}`,
      },
      headers: { authorization: `Bearer ${token}` },
    });
    expect(created.ok()).toBe(true);
    restaurant = (await created.json()) as CreatedRestaurant;

    await page.goto(`${webUrl}/admin/login`, { waitUntil: 'networkidle' });
    await page.getByLabel('Correo del propietario').fill(ownerEmail);
    await page.getByLabel('Contraseña').fill(ownerPassword);
    await page.getByRole('button', { name: 'Entrar a mi restaurante' }).click();
    await page.waitForURL(`${webUrl}/admin`);
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

  test(
    'ninguna pantalla se desborda y la navegación queda siempre al alcance',
    { tag: '@movil' },
    async ({ page }) => {
      for (const screen of OWNER_SCREENS) {
        await page.goto(`${webUrl}${screen.path}`, { waitUntil: 'networkidle' });

        const navigation = page.getByRole('navigation', { name: 'Panel del restaurante' });
        // El panel se pinta tras validar la sesión en cliente; WebKit tarda bastante
        // más que Chromium en hidratar y resolver esa comprobación.
        await expect(navigation).toBeVisible({ timeout: 20_000 });

        for (const destination of OWNER_DESTINATIONS) {
          await expect(navigation.getByRole('link', { name: destination })).toBeVisible();
        }
        await expect(navigation.getByRole('link', { name: screen.active })).toHaveAttribute(
          'aria-current',
          'page',
        );

        expect(await scrollsSideways(page)).toBe(false);

        // Cerrar sesión vive en la cabecera, fuera de la barra de destinos.
        await expect(page.getByRole('button', { name: 'Cerrar sesión' })).toBeVisible();
      }
    },
  );

  test(
    'cada destino y acción respeta el objetivo táctil de 44 píxeles',
    { tag: '@movil' },
    async ({ page }) => {
      await page.goto(`${webUrl}/admin`, { waitUntil: 'networkidle' });

      const navigation = page.getByRole('navigation', { name: 'Panel del restaurante' });
      await expect(navigation).toBeVisible({ timeout: 20_000 });
      for (const destination of OWNER_DESTINATIONS) {
        const box = await navigation.getByRole('link', { name: destination }).boundingBox();
        expect(box, `${destination} debe ocupar espacio`).not.toBeNull();
        expect(box?.height ?? 0, `${destination} mide menos de 44px de alto`).toBeGreaterThanOrEqual(44);
      }

      const logout = await page.getByRole('button', { name: 'Cerrar sesión' }).boundingBox();
      expect(logout?.height ?? 0).toBeGreaterThanOrEqual(44);
    },
  );

  test(
    'el conmutador de tema aplica la elección y la conserva al navegar',
    { tag: '@movil' },
    async ({ page }) => {
      await page.goto(`${webUrl}/admin`, { waitUntil: 'networkidle' });
      await expect(page.getByRole('button', { name: /Cambiar tema/ })).toBeVisible({
        timeout: 20_000,
      });
      const readTheme = () => page.evaluate(() => document.documentElement.dataset.theme ?? null);

      expect(await readTheme()).toBeNull();

      const toggle = page.getByRole('button', { name: /Cambiar tema/ });
      await toggle.click();
      expect(await readTheme()).toBe('light');

      await toggle.click();
      expect(await readTheme()).toBe('dark');

      // La elección sobrevive a una recarga, sin parpadeo: la aplica el script del layout.
      await page.reload({ waitUntil: 'networkidle' });
      expect(await readTheme()).toBe('dark');

      // La carta pública no obedece al tema del panel: sus colores los fija el dueño.
      if (!restaurant) throw new Error('No se preparó el restaurante');
      await page.goto(`${webUrl}/${restaurant.slug}`, { waitUntil: 'networkidle' });
      const menuBackground = await page.evaluate(() => {
        const main = document.querySelector('main');
        return main ? getComputedStyle(main).getPropertyValue('--menu-background').trim() : '';
      });
      expect(menuBackground).not.toBe('');
    },
  );

  test(
    'las acciones de un producto se abren en una hoja inferior',
    { tag: '@movil' },
    async ({ page }) => {
      if (!restaurant) throw new Error('No se preparó el restaurante');
      await page.goto(`${webUrl}/admin/menu`, { waitUntil: 'networkidle' });

      const newSection = page.getByRole('button', { name: '+ Nueva sección' });
      await expect(newSection).toBeVisible({ timeout: 20_000 });
      await newSection.click();
      await page.getByLabel('Nombre').fill('Entradas');
      await page.getByRole('button', { name: 'Guardar sección' }).click();

      await page.getByRole('button', { name: 'Añadir producto a Entradas' }).click();
      await page.getByLabel('Nombre').fill('Causa limeña');
      await page.getByLabel('Precio base (S/)').fill('22.00');
      await page.getByRole('button', { name: 'Crear producto' }).click();
      await expect(page.getByText('Producto creado en el borrador.')).toBeVisible();

      const trigger = page.getByRole('button', { name: 'Acciones de Causa limeña' });
      const editAction = page.getByRole('button', { name: 'Editar Causa limeña' });

      // En móvil las acciones están recogidas hasta que se abre la hoja.
      await expect(trigger).toBeVisible();
      await expect(editAction).toBeHidden();

      await trigger.click();
      await expect(editAction).toBeVisible();
      expect((await editAction.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);

      await page.getByRole('button', { exact: true, name: 'Cerrar' }).click();
      await expect(editAction).toBeHidden();

      expect(await scrollsSideways(page)).toBe(false);
    },
  );
});
