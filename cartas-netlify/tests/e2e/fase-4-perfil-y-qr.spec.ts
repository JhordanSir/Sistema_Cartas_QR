import { expect, test, type Page } from '@playwright/test';

import { newOwner, registerOwnerViaApi } from './support/cuentas';
import { drawPng, TEXT_AS_PNG, TINY_PNG } from './support/imagenes';

type Profile = { slug: string; publicUrl: string | null; logoUrl: string | null };

async function readProfile(page: Page): Promise<Profile> {
  const response = await page.request.get('/api/perfil');
  expect(response.status()).toBe(200);
  const body = (await response.json()) as { profile: Profile };
  return body.profile;
}

async function saveProfile(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Guardar perfil' }).click();
  await expect(page.getByText('Perfil guardado.')).toBeVisible();
}

test.describe('perfil del restaurante', () => {
  test.beforeEach(async ({ baseURL, page }) => {
    await registerOwnerViaApi(page.request, newOwner('Cevichería Luna'), baseURL);
    await page.goto('/panel');
  });

  test('guarda los datos de contacto y las redes, y siguen al recargar', async ({ page }) => {
    await page.getByLabel('Teléfono').fill('+51 987 654 321');
    await page.getByLabel('WhatsApp').fill('987 654 321');
    await page.getByLabel('Dirección').fill('Av. Grau 123, Barranco');
    await page.getByLabel('Instagram').fill('https://www.instagram.com/cevicherialuna');
    await saveProfile(page);

    await page.reload();
    await expect(page.getByLabel('Teléfono')).toHaveValue('+51 987 654 321');
    await expect(page.getByLabel('WhatsApp')).toHaveValue('987 654 321');
    await expect(page.getByLabel('Dirección')).toHaveValue('Av. Grau 123, Barranco');
    await expect(page.getByLabel('Instagram')).toHaveValue('https://www.instagram.com/cevicherialuna');
  });

  test('las redes solo aceptan enlaces https del propio sitio', async ({ page }) => {
    const instagramError = page.getByText(
      'Pega el enlace completo de tu perfil de Instagram, por ejemplo https://www.instagram.com/turestaurante.',
    );
    for (const url of ['http://instagram.com/x', 'https://evil.com/instagram.com']) {
      await page.getByLabel('Instagram').fill(url);
      await page.getByRole('button', { name: 'Guardar perfil' }).click();
      await expect(instagramError).toBeVisible();
      await expect(page.getByLabel('Instagram')).toBeFocused();
    }
    await expect(page.getByText('Perfil guardado.')).toHaveCount(0);
  });

  test('cambiar el nombre no cambia la dirección pública', async ({ page }) => {
    const address = page.getByTestId('direccion-publica');
    const before = await address.textContent();
    expect(before).toMatch(/\/cevicheria-luna(-\d+)?$/);

    await page.getByLabel('Nombre del restaurante').fill('Cevichería Luna de Barranco');
    await saveProfile(page);

    await expect(page.getByRole('heading', { level: 1, name: 'Cevichería Luna de Barranco' })).toBeVisible();
    await expect(address).toHaveText(before ?? '');
    await page.reload();
    await expect(address).toHaveText(before ?? '');
  });

  test('un logo válido se sube, se sirve desde /media y se puede quitar', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Elegir logo' })).toBeVisible();
    await page.getByLabel('Logo').setInputFiles({ buffer: TINY_PNG, mimeType: 'image/png', name: 'logo.png' });
    await saveProfile(page);
    await expect(page.getByRole('button', { name: 'Cambiar logo' })).toBeVisible();

    const logo = page.getByRole('img', { name: 'Logo del restaurante' });
    await expect(logo).toHaveAttribute('src', /^\/media\/restaurants\/[0-9a-f-]{36}\/logo\/[0-9a-f-]{36}$/);
    const src = (await logo.getAttribute('src')) ?? '';
    const served = await page.request.get(src);
    expect(served.status()).toBe(200);
    expect(served.headers()['content-type']).toBe('image/png');
    expect(served.headers()['cache-control']).toBe('public, max-age=31536000, immutable');

    await page.reload();
    await expect(logo).toHaveAttribute('src', src);

    await page.getByRole('button', { name: 'Quitar logo' }).click();
    await saveProfile(page);
    await expect(logo).toHaveCount(0);
    expect((await readProfile(page)).logoUrl).toBeNull();
    // The old blob is deleted once the change is committed.
    expect((await page.request.get(src)).status()).toBe(404);
  });

  test('un logo grande se reduce a JPEG de 1600 px antes de subirlo', async ({ page }) => {
    const big = await drawPng(page, 2400, 1200);
    await page.getByLabel('Logo').setInputFiles({ buffer: big, mimeType: 'image/png', name: 'grande.png' });
    await saveProfile(page);

    const src = (await page.getByRole('img', { name: 'Logo del restaurante' }).getAttribute('src')) ?? '';
    const served = await page.request.get(src);
    expect(served.headers()['content-type']).toBe('image/jpeg');
    const width = await page.evaluate(async (url) => {
      const bitmap = await createImageBitmap(await (await fetch(url)).blob());
      return bitmap.width;
    }, src);
    expect(width).toBe(1600);
  });

  test('un archivo de texto renombrado a .png se rechaza', async ({ baseURL, page }) => {
    await page.getByLabel('Logo').setInputFiles({ buffer: TEXT_AS_PNG, mimeType: 'image/png', name: 'logo.png' });
    await expect(page.getByText('No pudimos leer esa imagen. Prueba con otra.')).toBeVisible();

    // The server checks the binary signature too, whatever the browser sends.
    const response = await page.request.patch('/api/perfil', {
      headers: { Origin: new URL(baseURL ?? 'http://localhost:8888').origin },
      multipart: {
        logo: { buffer: TEXT_AS_PNG, mimeType: 'image/png', name: 'logo.png' },
        name: 'Cevichería Luna',
      },
    });
    expect(response.status()).toBe(400);
    expect(await response.json()).toMatchObject({
      fields: { logo: 'El logo debe ser una imagen PNG, JPG o WebP.' },
    });
  });
});

test.describe('código QR', () => {
  test('se genera una sola vez con la dirección pública y se descarga', async ({ baseURL, page }) => {
    await registerOwnerViaApi(page.request, newOwner('Pollería El Ñandú'), baseURL);
    const { publicUrl, slug } = await readProfile(page);
    expect(publicUrl).toMatch(new RegExp(`^https?://[^/]+/${slug}$`));

    await page.goto('/panel/qr');
    await expect(page.getByRole('img', { name: 'Código QR de la carta de Pollería El Ñandú' })).toBeVisible();
    await expect(page.getByTestId('url-qr')).toHaveText(publicUrl ?? '');
    await expect(
      page.getByText('Este QR no cambia aunque edites tu carta o el nombre del restaurante.'),
    ).toBeVisible();

    const first = await (await page.request.get('/api/qr')).json();
    await page.reload();
    const second = await (await page.request.get('/api/qr')).json();
    expect(second).toEqual(first);
    expect(first).toMatchObject({ url: publicUrl });

    const pngDownload = page.waitForEvent('download');
    await page.getByRole('link', { name: 'Descargar PNG' }).click();
    expect((await pngDownload).suggestedFilename()).toBe(`qr-${slug}.png`);

    const svgDownload = page.waitForEvent('download');
    await page.getByRole('link', { name: 'Descargar SVG' }).click();
    expect((await svgDownload).suggestedFilename()).toBe(`qr-${slug}.svg`);

    await expect(page.getByRole('link', { name: 'Abrir carta pública' })).toHaveAttribute('href', `/${slug}`);
  });

  test('«Copiar enlace» copia la dirección pública', async ({ baseURL, context, page }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await registerOwnerViaApi(page.request, newOwner(), baseURL);
    await page.goto('/panel/qr');

    await page.getByRole('button', { name: 'Copiar enlace' }).click();
    await expect(page.getByText('Enlace copiado.')).toBeVisible();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    await expect(page.getByTestId('url-qr')).toHaveText(copied);
  });

  test('el menú del panel lleva al QR', async ({ baseURL, page }) => {
    await registerOwnerViaApi(page.request, newOwner(), baseURL);
    await page.goto('/panel');

    await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'QR' }).click();
    await expect(page).toHaveURL(/\/panel\/qr$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Código QR' })).toBeVisible();
  });
});

test.describe('archivos públicos', () => {
  test('/media solo sirve imágenes de restaurantes', async ({ request }) => {
    const id = 'c0ffee00-1234-4abc-9def-001122334455';
    for (const path of [
      `/media/digitization/${id}/1`,
      `/media/restaurants/${id}/logo/${id}`,
      '/media/restaurants/no-es-un-uuid/logo/x',
    ]) {
      expect((await request.get(path)).status()).toBe(404);
    }
  });

  test('el perfil exige la sesión del dueño', async ({ request }) => {
    const response = await request.get('/api/perfil');
    expect(response.status()).toBe(401);
    expect(await response.json()).toMatchObject({ code: 'UNAUTHENTICATED' });
  });
});
