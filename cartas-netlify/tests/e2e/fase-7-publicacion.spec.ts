import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

import { createProductViaApi, createSectionViaApi, currentSlug, publishViaApi } from './support/carta';
import { NEXT_DIRECT_URL, newOwner, registerOwnerViaApi } from './support/cuentas';
import { TINY_PNG } from './support/imagenes';

function origin(baseURL: string | undefined): { Origin: string } {
  return { Origin: new URL(baseURL ?? 'http://localhost:8888').origin };
}

/** Two sections: Entradas (list, one product unavailable) and Fondos (cards, with a photo), plus Postres (only unavailable). */
async function seedMenu(request: APIRequestContext, baseURL: string | undefined): Promise<void> {
  const entradas = await createSectionViaApi(request, 'Entradas', baseURL);
  await createProductViaApi(
    request,
    {
      basePrice: '28',
      categoryId: entradas,
      description: 'Pescado del día en leche de tigre.',
      extras: [{ name: 'Choclo', price: '3' }],
      name: 'Ceviche',
      variants: [
        { name: 'Personal', price: '28' },
        { name: 'Para compartir', price: '45.5' },
      ],
    },
    baseURL,
  );
  await createProductViaApi(request, { basePrice: '22', categoryId: entradas, isAvailable: false, name: 'Pulpo al olivo' }, baseURL);

  const fondos = await createSectionViaApi(request, 'Fondos', baseURL);
  await request.patch(`/api/carta/secciones/${fondos}`, { data: { layout: 'CARDS' }, headers: origin(baseURL) });
  const arroz = await createProductViaApi(request, { basePrice: '45.9', categoryId: fondos, name: 'Arroz con mariscos' }, baseURL);
  await createProductViaApi(request, { basePrice: '39', categoryId: fondos, name: 'Chicharrón de pescado' }, baseURL);
  const photo = await request.put(`/api/carta/productos/${arroz}/imagen`, {
    headers: origin(baseURL),
    multipart: { image: { buffer: TINY_PNG, mimeType: 'image/png', name: 'arroz.png' } },
  });
  expect(photo.status()).toBe(200);

  const postres = await createSectionViaApi(request, 'Postres', baseURL);
  await createProductViaApi(request, { basePrice: '12', categoryId: postres, isAvailable: false, name: 'Suspiro limeño' }, baseURL);
}

async function publishFromEditor(page: Page): Promise<void> {
  await page.goto('/panel/carta');
  await page.getByRole('button', { name: 'Publicar carta' }).click();
  const confirm = page.getByRole('alertdialog', { name: '¿Publicar tu carta?' });
  await confirm.getByRole('button', { name: 'Publicar carta' }).click();
  await expect(confirm).toBeHidden();
}

test.describe('publicación', () => {
  test.beforeEach(async ({ baseURL, page }) => {
    await registerOwnerViaApi(page.request, newOwner('Cevichería Luna'), baseURL);
  });

  test('antes de publicar, la carta pública dice «Próximamente»', async ({ page }) => {
    const slug = await currentSlug(page.request);
    await page.goto(`/${slug}`);

    await expect(page).toHaveTitle('Cevichería Luna · Carta digital');
    await expect(page.getByRole('heading', { level: 1, name: 'Cevichería Luna' })).toBeVisible();
    await expect(page.getByText('Próximamente: este restaurante está preparando su carta digital.')).toBeVisible();
  });

  test('publicar exige al menos un producto disponible', async ({ page }) => {
    await page.goto('/panel/carta');
    await expect(page.getByText('Tu carta aún no está publicada.')).toBeVisible();
    await publishFromEditor(page);
    await expect(page.getByText('Agrega al menos un producto disponible antes de publicar.')).toBeVisible();
  });

  test('la carta publicada muestra solo lo disponible, con precios, opciones, adicionales y fotos', async ({
    baseURL,
    page,
  }) => {
    await seedMenu(page.request, baseURL);
    await page.goto('/panel/carta');
    await expect(page.getByText('Tienes cambios por publicar.')).toBeVisible();
    await publishFromEditor(page);
    await expect(page.getByText('Tu carta está publicada y al día.')).toBeVisible();

    const slug = await currentSlug(page.request);
    await page.goto(`/${slug}`);
    const index = page.getByRole('navigation', { name: 'Secciones de la carta' });
    await expect(index.getByRole('link')).toHaveText(['Entradas', 'Fondos']);

    const entradas = page.getByRole('region', { name: 'Entradas' });
    await expect(entradas.getByRole('heading', { level: 3 })).toHaveText(['Ceviche']);
    await expect(entradas.getByText('S/ 28.00').first()).toBeVisible();
    await expect(entradas.getByText('Opciones')).toBeVisible();
    await expect(entradas.getByText('Para compartir')).toBeVisible();
    await expect(entradas.getByText('S/ 45.50')).toBeVisible();
    await expect(entradas.getByText('Adicionales')).toBeVisible();
    await expect(entradas.getByText('S/ 3.00')).toBeVisible();
    await expect(page.getByText('Pulpo al olivo')).toHaveCount(0);
    await expect(page.getByRole('region', { name: 'Postres' })).toHaveCount(0);

    const fondos = page.getByRole('region', { name: 'Fondos' });
    await expect(fondos.locator('img[src^="/media/restaurants/"]')).toHaveCount(1);

    await index.getByRole('link', { name: 'Fondos' }).click();
    await expect(page).toHaveURL(/#seccion-[0-9a-f-]{36}$/);
  });

  test('los cambios del borrador no llegan a la carta pública hasta volver a publicar', async ({ baseURL, page }) => {
    const sectionId = await createSectionViaApi(page.request, 'Entradas', baseURL);
    await createProductViaApi(page.request, { basePrice: '28', categoryId: sectionId, name: 'Ceviche' }, baseURL);
    const slug = await publishViaApi(page.request, baseURL);

    const { draft } = (await (await page.request.get('/api/carta')).json()) as {
      draft: { categories: { products: { id: string }[] }[] };
    };
    const productId = draft.categories[0]?.products[0]?.id ?? '';
    await page.request.patch(`/api/carta/productos/${productId}`, {
      data: { basePrice: '31.50', categoryId: sectionId, name: 'Ceviche' },
      headers: origin(baseURL),
    });

    await page.goto('/panel/carta');
    await expect(page.getByText('Tienes cambios por publicar.')).toBeVisible();
    await page.goto(`/${slug}`);
    await expect(page.getByText('S/ 28.00')).toBeVisible();
    await expect(page.getByText('S/ 31.50')).toHaveCount(0);

    await publishFromEditor(page);
    await expect(page.getByText('Tu carta está publicada y al día.')).toBeVisible();
    await page.goto(`/${slug}`);
    await expect(page.getByText('S/ 31.50')).toBeVisible();
  });

  test('el contacto enlaza teléfono, WhatsApp y redes, y el perfil se refleja en la carta', async ({ baseURL, page }) => {
    const response = await page.request.patch('/api/perfil', {
      headers: origin(baseURL),
      multipart: {
        address: 'Av. Grau 123, Barranco',
        contactPhone: '+51 01 234 5678',
        facebookUrl: '',
        instagramUrl: 'https://www.instagram.com/cevicherialuna',
        name: 'Cevichería Luna de Barranco',
        tiktokUrl: '',
        whatsapp: '987 654 321',
      },
    });
    expect(response.status()).toBe(200);
    const slug = await currentSlug(page.request);
    await page.goto(`/${slug}`);

    await expect(page.getByRole('heading', { level: 1, name: 'Cevichería Luna de Barranco' })).toBeVisible();
    await expect(page.getByText('Av. Grau 123, Barranco')).toBeVisible();
    const contact = page.getByRole('region', { name: 'Contacto' });
    await expect(contact.getByRole('link', { name: 'Llamar al +51 01 234 5678' })).toHaveAttribute('href', 'tel:+51012345678');
    await expect(contact.getByRole('link', { name: 'Escribir por WhatsApp' })).toHaveAttribute('href', 'https://wa.me/51987654321');
    await expect(contact.getByRole('link', { name: 'Instagram' })).toHaveAttribute('href', 'https://www.instagram.com/cevicherialuna');
    await expect(page.getByText('Carta digital creada con Sirio')).toBeVisible();

    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      'content',
      'Carta de Cevichería Luna de Barranco en Av. Grau 123, Barranco. Platos, precios y disponibilidad al día.',
    );
    await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute('content', 'es_PE');
  });

  test('las tarjetas van en una columna en el celular y en varias en escritorio', async ({ baseURL, page }) => {
    await seedMenu(page.request, baseURL);
    const slug = await publishViaApi(page.request, baseURL);
    const cards = page.getByRole('region', { name: 'Fondos' }).getByRole('listitem');

    await page.setViewportSize({ height: 844, width: 390 });
    await page.goto(`/${slug}`);
    const [first, second] = [await cards.nth(0).boundingBox(), await cards.nth(1).boundingBox()];
    expect(first?.x).toBe(second?.x);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)).toBe(false);

    await page.setViewportSize({ height: 900, width: 1280 });
    await page.goto(`/${slug}`);
    const [wideFirst, wideSecond] = [await cards.nth(0).boundingBox(), await cards.nth(1).boundingBox()];
    expect(wideFirst?.y).toBe(wideSecond?.y);
    expect(wideFirst?.x).toBeLessThan(wideSecond?.x ?? 0);
  });

  test('la carta pública no carga las fuentes del panel', async ({ page }) => {
    const slug = await currentSlug(page.request);
    await page.goto(`/${slug}`);
    await expect(page.locator('link[rel="preload"][as="font"]')).toHaveCount(0);
    const family = await page.getByRole('heading', { level: 1 }).evaluate((element) => getComputedStyle(element).fontFamily);
    expect(family).not.toMatch(/Fraunces/);
  });
});

test.describe('carta inexistente', () => {
  test('un slug inexistente responde la 404 de la carta', async ({ playwright, request }) => {
    expect((await request.get('/no-existe-esta-carta')).status()).toBe(404);

    // Straight to Next: `netlify dev` retries the 404 as /index.htm and ends on the global 404 page.
    const next = await playwright.request.newContext({ baseURL: NEXT_DIRECT_URL });
    const response = await next.get('/no-existe-esta-carta');
    expect(response.status()).toBe(404);
    expect(await response.text()).toContain('<title>Carta no disponible</title>');
    await next.dispose();
  });
});
