import { expect, test, type APIRequestContext } from '@playwright/test';

const directApiUrl = process.env.E2E_DIRECT_API_URL ?? 'http://127.0.0.1:3001/api';
const webUrl = process.env.E2E_WEB_URL ?? 'http://127.0.0.1:3000';

interface CreatedRestaurant {
  id: string;
  slug: string;
}

interface PublishedMenu {
  categories: Array<{
    id: string;
    name: string;
    products: Array<{ id: string; isAvailable: boolean; name: string }>;
  }>;
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

async function createCategory(
  request: APIRequestContext,
  restaurantId: string,
  token: string,
  name: string,
): Promise<PublishedMenu> {
  const response = await request.post(
    `${directApiUrl}/owner/restaurants/${restaurantId}/menu/categories`,
    {
      data: { name },
      headers: { authorization: `Bearer ${token}` },
    },
  );
  expect(response.ok()).toBe(true);
  return response.json() as Promise<PublishedMenu>;
}

async function createProduct(
  request: APIRequestContext,
  restaurantId: string,
  token: string,
  input: { basePrice: string; categoryId: string; name: string },
): Promise<PublishedMenu> {
  const response = await request.post(
    `${directApiUrl}/owner/restaurants/${restaurantId}/menu/products`,
    {
      data: { ...input, extras: [], variants: [] },
      headers: { authorization: `Bearer ${token}` },
    },
  );
  expect(response.ok()).toBe(true);
  return response.json() as Promise<PublishedMenu>;
}

async function publishMenu(
  request: APIRequestContext,
  restaurantId: string,
  token: string,
): Promise<void> {
  const response = await request.post(
    `${directApiUrl}/owner/restaurants/${restaurantId}/menu/publish`,
    { headers: { authorization: `Bearer ${token}` } },
  );
  expect(response.ok()).toBe(true);
}

function categoryId(menu: PublishedMenu, name: string): string {
  const category = menu.categories.find((candidate) => candidate.name === name);
  if (!category) throw new Error(`Category ${name} was not published`);
  return category.id;
}

function productId(menu: PublishedMenu, name: string): string {
  const product = menu.categories
    .flatMap((category) => category.products)
    .find((candidate) => candidate.name === name);
  if (!product) throw new Error(`Product ${name} was not published`);
  return product.id;
}

test.describe.serial('QR permanente y carta pública móvil de la Fase 6', () => {
  test.describe.configure({ timeout: 60_000 });

  let restaurant: CreatedRestaurant | null = null;
  let adminToken = '';
  let ownerEmail = '';
  let restaurantName = '';
  let ownerToken = '';
  const ownerPassword = 'OwnerPass-6!';

  test.beforeEach(async ({ request }) => {
    const suffix = `${Date.now()}-${test.info().parallelIndex}`;
    ownerEmail = `phase6-${suffix}@example.test`;
    restaurantName = `Mesa QR ${suffix}`;
    const adminEmail = process.env.INITIAL_ADMIN_EMAIL;
    const adminPassword = process.env.INITIAL_ADMIN_PASSWORD;
    if (!adminEmail || !adminPassword) {
      throw new Error('Initial administrator credentials are required for E2E');
    }
    adminToken = await login(request, adminEmail, adminPassword, 'ADMIN');
    const created = await request.post(`${directApiUrl}/backoffice/restaurants`, {
      data: {
        email: ownerEmail,
        initialPassword: ownerPassword,
        name: restaurantName,
      },
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(created.ok()).toBe(true);
    restaurant = (await created.json()) as CreatedRestaurant;
    ownerToken = await login(request, ownerEmail, ownerPassword, 'OWNER');
  });

  test.afterEach(async ({ request }) => {
    if (!restaurant) return;
    await request.delete(`${directApiUrl}/backoffice/restaurants/${restaurant.id}`, {
      data: {
        acknowledgePermanentDeletion: true,
        confirmationText: `ELIMINAR ${restaurant.slug}`,
      },
      headers: { authorization: `Bearer ${adminToken}` },
    });
    restaurant = null;
  });

  test('materializa un QR fijo, descarga ambos formatos y publica una carta móvil', { tag: '@movil' }, async ({
    browser,
    context,
    page,
    request,
  }) => {
    if (!restaurant) throw new Error('Restaurant fixture was not created');
    const baseOwnerUrl = `${directApiUrl}/owner/restaurants/${restaurant.id}`;
    const ownerHeaders = { authorization: `Bearer ${ownerToken}` };

    const identity = await request.get(`${baseOwnerUrl}/qr`, { headers: ownerHeaders });
    expect(identity.ok()).toBe(true);
    const qrIdentity = (await identity.json()) as { publicUrl: string; slug: string };
    expect(qrIdentity).toMatchObject({ slug: restaurant.slug });
    expect(new URL(qrIdentity.publicUrl).pathname).toBe(`/${restaurant.slug}`);

    const pngBefore = await request.get(`${baseOwnerUrl}/qr/png?download=true`, {
      headers: ownerHeaders,
    });
    const svgBefore = await request.get(`${baseOwnerUrl}/qr/svg?download=true`, {
      headers: ownerHeaders,
    });
    expect(pngBefore.ok()).toBe(true);
    expect(pngBefore.headers()['content-type']).toContain('image/png');
    expect(pngBefore.headers()['content-disposition']).toContain(`${restaurant.slug}-qr.png`);
    expect((await pngBefore.body()).subarray(0, 8)).toEqual(
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    );
    expect(svgBefore.ok()).toBe(true);
    expect(svgBefore.headers()['content-type']).toContain('image/svg+xml');
    expect(svgBefore.headers()['content-disposition']).toContain(`${restaurant.slug}-qr.svg`);
    const svgBytesBefore = await svgBefore.body();
    expect(svgBytesBefore.toString('utf8')).toContain('<svg');

    let menu = await createCategory(request, restaurant.id, ownerToken, 'Para compartir');
    const startersId = categoryId(menu, 'Para compartir');
    menu = await createProduct(request, restaurant.id, ownerToken, {
      basePrice: '18.00',
      categoryId: startersId,
      name: 'Croquetas de ají',
    });
    menu = await createProduct(request, restaurant.id, ownerToken, {
      basePrice: '15.00',
      categoryId: startersId,
      name: 'Producto temporal',
    });
    menu = await createCategory(request, restaurant.id, ownerToken, 'Bebidas');
    const drinksId = categoryId(menu, 'Bebidas');
    menu = await createProduct(request, restaurant.id, ownerToken, {
      basePrice: '12.00',
      categoryId: drinksId,
      name: 'Limonada de la casa',
    });
    const permanentProductId = productId(menu, 'Croquetas de ají');
    const hiddenProductId = productId(menu, 'Producto temporal');

    const priceEdit = await request.patch(
      `${baseOwnerUrl}/menu/products/${permanentProductId}`,
      {
        data: { basePrice: '19.00' },
        headers: ownerHeaders,
      },
    );
    expect(priceEdit.ok()).toBe(true);
    const profileEdit = await request.patch(`${baseOwnerUrl}/profile`, {
      headers: ownerHeaders,
      multipart: {
        address: 'Av. La Marina 1234, San Miguel',
        contactPhone: '+51 999 888 777',
        instagramUrl: 'https://instagram.com/mesa_qr',
        whatsapp: '+51 999 888 777',
      },
    });
    expect(profileEdit.ok()).toBe(true);
    const svgAfterEdits = await request.get(`${baseOwnerUrl}/qr/svg?download=true`, {
      headers: ownerHeaders,
    });
    expect(Buffer.compare(svgBytesBefore, await svgAfterEdits.body())).toBe(0);

    const hideProduct = await request.patch(
      `${baseOwnerUrl}/menu/products/${hiddenProductId}/availability`,
      {
        data: { isAvailable: false },
        headers: ownerHeaders,
      },
    );
    expect(hideProduct.ok()).toBe(true);
    await publishMenu(request, restaurant.id, ownerToken);
    const publicApi = await request.get(
      `${directApiUrl}/restaurants/public/${restaurant.slug}`,
    );
    expect(publicApi.ok()).toBe(true);
    const published = (await publicApi.json()) as PublishedMenu;
    expect(published.categories.flatMap((category) => category.products).map((product) => product.name))
      .toEqual(expect.arrayContaining(['Croquetas de ají', 'Limonada de la casa']));
    expect(published.categories.flatMap((category) => category.products).map((product) => product.name))
      .not.toContain('Producto temporal');

    await page.goto(`${webUrl}/admin/login`);
    await page.getByLabel('Correo del propietario').fill(ownerEmail);
    await page.getByLabel('Contraseña').fill(ownerPassword);
    await page.getByRole('button', { name: 'Entrar a mi restaurante' }).click();
    await page.getByRole('link', { name: 'QR' }).click();
    await expect(page).toHaveURL(`${webUrl}/admin/qr`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Tu QR no cambia' })).toBeVisible();
    await expect(page.getByAltText(/Código QR de Mesa QR/)).toBeVisible();
    await expect(page.getByText(qrIdentity.publicUrl)).toBeVisible();

    const pngDownload = page.waitForEvent('download');
    await page.getByRole('link', { name: 'Descargar PNG' }).click();
    expect((await pngDownload).suggestedFilename()).toBe(`${restaurant.slug}-qr.png`);
    const svgDownload = page.waitForEvent('download');
    await page.getByRole('link', { name: 'Descargar SVG' }).click();
    expect((await svgDownload).suggestedFilename()).toBe(`${restaurant.slug}-qr.svg`);

    await page.getByRole('link', { name: 'Ayuda' }).click();
    await expect(page).toHaveURL(`${webUrl}/admin/help`);
    await expect(page.getByRole('heading', {
      name: 'Aprende a manejar tu carta desde el celular.',
    })).toBeVisible();
    const guides = page.locator('details');
    await expect(guides).toHaveCount(5);
    // La primera guía llega desplegada; el resto se abren a demanda.
    await expect(guides.first()).toHaveAttribute('open', '');
    await expect(page.getByText('Ingresa a tu panel')).toBeVisible();

    const publicPage = await context.newPage();
    await publicPage.goto(`${webUrl}/${restaurant.slug}`, { waitUntil: 'networkidle' });
    await expect(publicPage.getByRole('heading', { name: 'Croquetas de ají' })).toBeVisible();
    await expect(publicPage.getByRole('heading', { name: 'Limonada de la casa' })).toBeVisible();
    await expect(publicPage.getByText('Producto temporal')).toHaveCount(0);
    const navigationDuration = await publicPage.evaluate(() =>
      performance.getEntriesByType('navigation')[0]?.duration ?? 0,
    );
    expect(navigationDuration).toBeLessThan(5_000);

    const mobileContext = await browser.newContext({
      isMobile: true,
      viewport: { height: 844, width: 390 },
    });
    const mobilePage = await mobileContext.newPage();
    await mobilePage.goto(`${webUrl}/${restaurant.slug}`, { waitUntil: 'networkidle' });

    // El perfil del dueño llega hasta el comensal: dirección, contacto y redes.
    await expect(mobilePage.getByText('Av. La Marina 1234, San Miguel').first()).toBeVisible();
    const whatsappButton = mobilePage.getByRole('link', {
      name: 'Escribir al restaurante por WhatsApp',
    });
    await expect(whatsappButton).toBeVisible();
    await expect(whatsappButton).toHaveAttribute('href', 'https://wa.me/51999888777');
    await expect(mobilePage.getByRole('link', { name: 'Instagram' })).toHaveAttribute(
      'href',
      'https://instagram.com/mesa_qr',
    );
    // Compartir el enlace debe mostrar el restaurante, no el título genérico de Sirio.
    await expect(mobilePage).toHaveTitle(new RegExp(restaurantName));

    const categoryNavigation = mobilePage.getByRole('navigation', {
      name: 'Secciones de la carta',
    });
    await expect(categoryNavigation).toBeVisible();
    const secondCategoryLink = categoryNavigation.getByRole('link').nth(1);
    const secondCategoryHref = await secondCategoryLink.getAttribute('href');
    expect(secondCategoryHref).toBe(`#categoria-${drinksId}`);
    await secondCategoryLink.click();
    await expect(mobilePage.locator(secondCategoryHref ?? '')).toBeInViewport();
    expect(await mobilePage.evaluate(() =>
      document.documentElement.scrollWidth <= window.innerWidth,
    )).toBe(true);
    await mobilePage.screenshot({
      fullPage: true,
      path: test.info().outputPath('phase-six-mobile-menu.png'),
    });
    await mobileContext.close();

    const helpMobileContext = await browser.newContext({
      isMobile: true,
      storageState: await context.storageState(),
      viewport: { height: 844, width: 390 },
    });
    const helpMobilePage = await helpMobileContext.newPage();
    await helpMobilePage.goto(`${webUrl}/admin/help`, { waitUntil: 'networkidle' });
    await expect(helpMobilePage.getByRole('heading', {
      name: 'Aprende a manejar tu carta desde el celular.',
    })).toBeVisible();
    await expect(helpMobilePage.locator('details')).toHaveCount(5);
    // Las guías se abren a demanda; al desplegar la del QR aparece su acceso directo.
    await helpMobilePage.locator('summary').filter({ hasText: 'Comparte tu QR' }).click();
    await expect(helpMobilePage.getByRole('link', { name: /Ir a QR/ })).toBeVisible();
    expect(await helpMobilePage.evaluate(() =>
      document.documentElement.scrollWidth <= window.innerWidth,
    )).toBe(true);
    await helpMobilePage.screenshot({
      fullPage: true,
      path: test.info().outputPath('phase-eight-mobile-help.png'),
    });
    await helpMobileContext.close();

    const disable = await request.patch(
      `${directApiUrl}/backoffice/restaurants/${restaurant.id}/status`,
      {
        data: { status: 'DISABLED' },
        headers: { authorization: `Bearer ${adminToken}` },
      },
    );
    expect(disable.ok()).toBe(true);
    const disabledPublicApi = await request.get(
      `${directApiUrl}/restaurants/public/${restaurant.slug}`,
    );
    expect(disabledPublicApi.status()).toBe(404);
    await publicPage.reload({ waitUntil: 'networkidle' });
    await expect(publicPage.getByRole('heading', {
      name: 'Esta carta no está disponible.',
    })).toBeVisible();
    await publicPage.close();
  });
});
