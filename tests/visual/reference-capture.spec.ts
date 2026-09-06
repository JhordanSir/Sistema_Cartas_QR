import path from 'node:path';

import {
  expect,
  request as playwrightRequest,
  test,
  type APIRequestContext,
  type Browser,
  type Page,
} from '@playwright/test';

const directApiUrl = process.env.E2E_DIRECT_API_URL ?? 'http://127.0.0.1:3001/api';
const webUrl = process.env.E2E_WEB_URL ?? 'http://127.0.0.1:3000';

// VISUAL_LABEL separates capture runs, e.g. VISUAL_LABEL=antes / VISUAL_LABEL=despues.
const label = process.env.VISUAL_LABEL ?? 'actual';
const outputRoot = path.join('artifacts', 'capturas', label);

const VIEWPORTS = [
  { height: 844, name: 'movil-390', width: 390 },
  { height: 1024, name: 'tablet-768', width: 768 },
  { height: 900, name: 'escritorio-1280', width: 1280 },
] as const;

interface Screen {
  name: string;
  path: string;
}

interface Session {
  email: string;
  password: string;
  role: 'ADMIN' | 'OWNER';
}

interface CreatedRestaurant {
  id: string;
  slug: string;
}

interface SeedProduct {
  category: string;
  description: string;
  extras?: Array<{ name: string; price: string }>;
  name: string;
  price: string;
  variants?: Array<{ name: string; price: string }>;
}

const SEED_PRODUCTS: SeedProduct[] = [
  {
    category: 'Entradas',
    description: 'Pulpo al olivo, aceituna botija y crocante de camote.',
    name: 'Causa de pulpo',
    price: '26.00',
  },
  {
    category: 'Entradas',
    description: 'Papa amarilla, ají amarillo y huacatay fresco.',
    name: 'Papa a la huancaína',
    price: '18.00',
  },
  {
    category: 'Fondos',
    description: 'Pescado del día, leche de tigre y choclo serrano.',
    extras: [{ name: 'Chicharrón de calamar', price: '12.00' }],
    name: 'Ceviche clásico',
    price: '38.00',
    variants: [
      { name: 'Personal', price: '38.00' },
      { name: 'Para compartir', price: '62.00' },
    ],
  },
  {
    category: 'Fondos',
    description: 'Lomo fino, cebolla roja y papas nativas fritas al momento.',
    name: 'Lomo saltado',
    price: '42.00',
  },
  {
    category: 'Bebidas',
    description: 'Maíz morado, piña y canela, servida bien fría.',
    name: 'Chicha morada',
    price: '10.00',
  },
];

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
    throw new Error('INITIAL_ADMIN_EMAIL e INITIAL_ADMIN_PASSWORD son obligatorios');
  }
  return { email, password };
}

async function signIn(page: Page, session: Session): Promise<void> {
  if (session.role === 'OWNER') {
    await page.goto(`${webUrl}/admin/login`, { waitUntil: 'networkidle' });
    await page.getByLabel('Correo del propietario').fill(session.email);
    await page.getByLabel('Contraseña').fill(session.password);
    await page.getByRole('button', { name: 'Entrar a mi restaurante' }).click();
    await page.waitForURL(`${webUrl}/admin`);
    return;
  }
  await page.goto(`${webUrl}/login`, { waitUntil: 'networkidle' });
  await page.getByLabel('Correo del administrador').fill(session.email);
  await page.getByLabel('Contraseña').fill(session.password);
  await page.getByRole('button', { name: 'Entrar al backoffice' }).click();
  await page.waitForURL(`${webUrl}/backoffice`);
}

async function capture(
  browser: Browser,
  screens: Screen[],
  session: Session | null,
): Promise<void> {
  for (const viewport of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { height: viewport.height, width: viewport.width },
    });
    const page = await context.newPage();
    try {
      if (session) await signIn(page, session);
      for (const screen of screens) {
        await page.goto(`${webUrl}${screen.path}`, { waitUntil: 'networkidle' });
        await page.screenshot({
          fullPage: true,
          path: path.join(outputRoot, `${screen.name}--${viewport.name}.png`),
        });
      }
    } finally {
      await context.close();
    }
  }
}

test.describe.serial('capturas de referencia de todas las superficies', () => {
  let restaurant: CreatedRestaurant | null = null;
  let ownerEmail = '';
  const ownerPassword = 'VisualPass-0!';

  test.beforeAll(async () => {
    const api = await playwrightRequest.newContext();
    try {
      const suffix = `${Date.now()}`;
      ownerEmail = `capturas-${suffix}@example.test`;
      const admin = adminCredentials();
      const adminToken = await login(api, admin.email, admin.password, 'ADMIN');
      const created = await api.post(`${directApiUrl}/backoffice/restaurants`, {
        data: {
          email: ownerEmail,
          initialPassword: ownerPassword,
          name: `Cevichería Referencia ${suffix}`,
        },
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(created.ok()).toBe(true);
      restaurant = (await created.json()) as CreatedRestaurant;

      const ownerToken = await login(api, ownerEmail, ownerPassword, 'OWNER');
      const auth = { authorization: `Bearer ${ownerToken}` };
      const menuUrl = `${directApiUrl}/owner/restaurants/${restaurant.id}/menu`;

      // Fondos usa tarjetas para que las capturas muestren los dos estilos de sección.
      const seedCategories = [
        { layout: 'LIST', name: 'Entradas' },
        { layout: 'CARDS', name: 'Fondos' },
        { layout: 'LIST', name: 'Bebidas' },
      ];
      for (const category of seedCategories) {
        const response = await api.post(`${menuUrl}/categories`, {
          data: category,
          headers: auth,
        });
        expect(response.ok()).toBe(true);
      }

      const menu = await api.get(menuUrl, { headers: auth });
      expect(menu.ok()).toBe(true);
      const { categories } = (await menu.json()) as {
        categories: Array<{ id: string; name: string }>;
      };

      for (const item of SEED_PRODUCTS) {
        const categoryId = categories.find((entry) => entry.name === item.category)?.id;
        expect(categoryId).toBeTruthy();
        const response = await api.post(`${menuUrl}/products`, {
          data: {
            basePrice: item.price,
            categoryId,
            description: item.description,
            extras: item.extras ?? [],
            name: item.name,
            variants: item.variants ?? [],
          },
          headers: auth,
        });
        expect(response.ok()).toBe(true);
      }

      const published = await api.post(`${menuUrl}/publish`, { headers: auth });
      expect(published.ok()).toBe(true);
    } finally {
      await api.dispose();
    }
  });

  test.afterAll(async () => {
    if (!restaurant) return;
    const api = await playwrightRequest.newContext();
    try {
      const admin = adminCredentials();
      const adminToken = await login(api, admin.email, admin.password, 'ADMIN');
      await api.delete(`${directApiUrl}/backoffice/restaurants/${restaurant.id}`, {
        data: {
          acknowledgePermanentDeletion: true,
          confirmationText: `ELIMINAR ${restaurant.slug}`,
        },
        headers: { authorization: `Bearer ${adminToken}` },
      });
    } finally {
      await api.dispose();
      restaurant = null;
    }
  });

  test('captura las pantallas públicas', async ({ browser }) => {
    if (!restaurant) throw new Error('El restaurante de referencia no se preparó');
    await capture(
      browser,
      [
        { name: '01-landing', path: '/' },
        { name: '02-login-admin', path: '/login' },
        { name: '03-login-dueno', path: '/admin/login' },
        { name: '04-carta-publica', path: `/${restaurant.slug}` },
        { name: '05-no-encontrada', path: '/restaurante-inexistente' },
      ],
      null,
    );
  });

  test('captura el panel del dueño', async ({ browser }) => {
    await capture(
      browser,
      [
        { name: '06-panel-perfil', path: '/admin' },
        { name: '07-panel-carta', path: '/admin/menu' },
        { name: '08-panel-qr', path: '/admin/qr' },
        { name: '09-panel-estadisticas', path: '/admin/statistics' },
        { name: '10-panel-ayuda', path: '/admin/help' },
      ],
      { email: ownerEmail, password: ownerPassword, role: 'OWNER' },
    );
  });

  test('captura el backoffice', async ({ browser }) => {
    const admin = adminCredentials();
    await capture(
      browser,
      [
        { name: '11-backoffice-registro', path: '/backoffice' },
        { name: '12-backoffice-estadisticas', path: '/backoffice/statistics' },
      ],
      { email: admin.email, password: admin.password, role: 'ADMIN' },
    );
  });
});
