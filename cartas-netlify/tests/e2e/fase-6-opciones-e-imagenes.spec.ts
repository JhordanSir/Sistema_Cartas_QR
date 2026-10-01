import { expect, test, type Locator, type Page } from '@playwright/test';

import { createProductViaApi, createSectionViaApi } from './support/carta';
import { NEXT_DIRECT_URL, newOwner, registerOwnerViaApi } from './support/cuentas';
import { TEXT_AS_PNG, TINY_PNG } from './support/imagenes';

async function openProduct(page: Page, name: string): Promise<Locator> {
  await page.getByRole('button', { name: `Editar ${name}` }).click();
  const sheet = page.getByRole('dialog', { name: 'Editar producto' });
  await expect(sheet.getByLabel('Nombre del producto')).toHaveValue(name);
  return sheet;
}

async function fillRow(sheet: Locator, kind: 'opción' | 'adicional', number: number, name: string, price: string) {
  const of = kind === 'opción' ? 'de la opción' : 'del adicional';
  await sheet.getByLabel(`Nombre ${of} ${number}`, { exact: true }).fill(name);
  await sheet.getByLabel(`Precio ${of} ${number}, en soles`, { exact: true }).fill(price);
}

test.describe('opciones y adicionales', () => {
  test.beforeEach(async ({ baseURL, page }) => {
    await registerOwnerViaApi(page.request, newOwner('Cevichería Luna'), baseURL);
    const sectionId = await createSectionViaApi(page.request, 'Entradas', baseURL);
    await createProductViaApi(page.request, { basePrice: '28', categoryId: sectionId, name: 'Ceviche' }, baseURL);
    await page.goto('/panel/carta');
  });

  test('un producto con 2 opciones y 1 adicional se guarda y sigue igual al recargar', async ({ page }) => {
    const sheet = await openProduct(page, 'Ceviche');
    await sheet.getByRole('button', { name: 'Agregar opción' }).click();
    await fillRow(sheet, 'opción', 1, 'Personal', '28');
    await sheet.getByRole('button', { name: 'Agregar opción' }).click();
    await fillRow(sheet, 'opción', 2, 'Para compartir', '45.5');
    await sheet.getByRole('button', { name: 'Agregar adicional' }).click();
    await fillRow(sheet, 'adicional', 1, 'Choclo', '3');
    await sheet.getByRole('button', { name: 'Guardar producto' }).click();
    await expect(sheet).toBeHidden();
    await expect(page.getByText('2 opciones · 1 adicional')).toBeVisible();

    await page.reload();
    const reopened = await openProduct(page, 'Ceviche');
    await expect(reopened.getByLabel('Nombre de la opción 1', { exact: true })).toHaveValue('Personal');
    await expect(reopened.getByLabel('Precio de la opción 1, en soles', { exact: true })).toHaveValue('28.00');
    await expect(reopened.getByLabel('Nombre de la opción 2', { exact: true })).toHaveValue('Para compartir');
    await expect(reopened.getByLabel('Precio de la opción 2, en soles', { exact: true })).toHaveValue('45.50');
    await expect(reopened.getByLabel('Nombre del adicional 1', { exact: true })).toHaveValue('Choclo');
    await expect(reopened.getByLabel('Precio del adicional 1, en soles', { exact: true })).toHaveValue('3.00');
  });

  test('cada fila se valida al guardar y su error se quita al corregirla', async ({ page }) => {
    const sheet = await openProduct(page, 'Ceviche');
    await sheet.getByRole('button', { name: 'Agregar opción' }).click();
    await fillRow(sheet, 'opción', 1, '  ', 'abc');
    await sheet.getByRole('button', { name: 'Guardar producto' }).click();

    const nameError = sheet.getByText('Escribe el nombre, de hasta 160 caracteres.');
    const priceError = sheet.getByText('Escribe un precio válido, por ejemplo 18.50.');
    await expect(nameError).toBeVisible();
    await expect(priceError).toBeVisible();
    await expect(sheet.getByLabel('Nombre de la opción 1', { exact: true })).toBeFocused();

    await sheet.getByLabel('Nombre de la opción 1', { exact: true }).fill('Personal');
    await expect(nameError).toHaveCount(0);
    await expect(priceError).toBeVisible();
    await sheet.getByLabel('Precio de la opción 1, en soles', { exact: true }).fill('28');
    await expect(priceError).toHaveCount(0);
  });

  test('las filas se reordenan y se quitan antes de guardar', async ({ page }) => {
    const sheet = await openProduct(page, 'Ceviche');
    for (const [number, name] of [
      [1, 'Personal'],
      [2, 'Mediano'],
      [3, 'Familiar'],
    ] as const) {
      await sheet.getByRole('button', { name: 'Agregar opción' }).click();
      await fillRow(sheet, 'opción', number, name, '10');
    }
    await sheet.getByRole('button', { name: 'Bajar opción 1' }).click();
    await sheet.getByRole('button', { name: 'Quitar opción 3' }).click();
    await sheet.getByRole('button', { name: 'Guardar producto' }).click();
    await expect(sheet).toBeHidden();

    const reopened = await openProduct(page, 'Ceviche');
    await expect(reopened.getByLabel('Nombre de la opción 1', { exact: true })).toHaveValue('Mediano');
    await expect(reopened.getByLabel('Nombre de la opción 2', { exact: true })).toHaveValue('Personal');
    await expect(reopened.getByLabel('Nombre de la opción 3', { exact: true })).toHaveCount(0);
  });

  test('la API rechaza más de 30 opciones', async ({ baseURL, page }) => {
    const { draft } = (await (await page.request.get('/api/carta')).json()) as {
      draft: { categories: { id: string; products: { id: string }[] }[] };
    };
    const section = draft.categories[0];
    const response = await page.request.patch(`/api/carta/productos/${section?.products[0]?.id}`, {
      data: {
        basePrice: '28',
        categoryId: section?.id,
        name: 'Ceviche',
        variants: Array.from({ length: 31 }, (_, index) => ({ name: `Opción ${index + 1}`, price: '1' })),
      },
      headers: { Origin: new URL(baseURL ?? 'http://localhost:8888').origin },
    });
    expect(response.status()).toBe(400);
    expect(await response.json()).toMatchObject({ fields: { variants: 'Puedes agregar hasta 30 opciones.' } });
  });
});

test.describe('imagen del producto', () => {
  let productId = '';
  let sectionId = '';

  test.beforeEach(async ({ baseURL, page }) => {
    await registerOwnerViaApi(page.request, newOwner('Cevichería Luna'), baseURL);
    sectionId = await createSectionViaApi(page.request, 'Entradas', baseURL);
    productId = await createProductViaApi(page.request, { basePrice: '28', categoryId: sectionId, name: 'Ceviche' }, baseURL);
    await page.goto('/panel/carta');
  });

  async function uploadPhoto(page: Page): Promise<string> {
    const sheet = await openProduct(page, 'Ceviche');
    await expect(sheet.getByRole('button', { name: 'Agregar imagen' })).toBeVisible();
    await sheet.getByLabel('Foto del producto').setInputFiles({ buffer: TINY_PNG, mimeType: 'image/png', name: 'ceviche.png' });
    const photo = sheet.getByRole('img', { name: 'Foto de Ceviche' });
    await expect(photo).toHaveAttribute('src', new RegExp(`^/media/restaurants/[0-9a-f-]{36}/products/${productId}/[0-9a-f-]{36}$`));
    return (await photo.getAttribute('src')) ?? '';
  }

  test('se sube, se ve en miniatura, se cambia y se quita', async ({ page }) => {
    const first = await uploadPhoto(page);
    const sheet = page.getByRole('dialog', { name: 'Editar producto' });
    expect((await page.request.get(first)).status()).toBe(200);
    await expect(sheet.getByRole('button', { name: 'Cambiar imagen' })).toBeVisible();

    await sheet.getByLabel('Foto del producto').setInputFiles({ buffer: TINY_PNG, mimeType: 'image/png', name: 'otra.png' });
    await expect(sheet.getByRole('img', { name: 'Foto de Ceviche' })).not.toHaveAttribute('src', first);
    // The replaced blob is deleted after the change is committed.
    await expect.poll(async () => (await page.request.get(first)).status()).toBe(404);
    const second = (await sheet.getByRole('img', { name: 'Foto de Ceviche' }).getAttribute('src')) ?? '';

    await sheet.getByRole('button', { name: 'Cerrar' }).click();
    await expect(page.getByRole('region', { name: 'Entradas' }).locator(`img[src="${second}"]`)).toBeVisible();

    const reopened = await openProduct(page, 'Ceviche');
    await reopened.getByRole('button', { name: 'Quitar imagen' }).click();
    await expect(reopened.getByText('Sin foto')).toBeVisible();
    expect((await page.request.get(second)).status()).toBe(404);
  });

  test('un archivo que no es imagen se rechaza en el navegador y en la API', async ({ baseURL, page }) => {
    const sheet = await openProduct(page, 'Ceviche');
    await sheet.getByLabel('Foto del producto').setInputFiles({ buffer: TEXT_AS_PNG, mimeType: 'image/png', name: 'ceviche.png' });
    await expect(sheet.getByText('No pudimos leer esa imagen. Prueba con otra.')).toBeVisible();

    const response = await page.request.put(`/api/carta/productos/${productId}/imagen`, {
      headers: { Origin: new URL(baseURL ?? 'http://localhost:8888').origin },
      multipart: { image: { buffer: TEXT_AS_PNG, mimeType: 'image/png', name: 'ceviche.png' } },
    });
    expect(response.status()).toBe(400);
    expect(await response.json()).toMatchObject({ fields: { image: 'La imagen debe ser PNG, JPG o WebP.' } });
  });

  test('borrar el producto borra también su imagen', async ({ page }) => {
    const photo = await uploadPhoto(page);
    const sheet = page.getByRole('dialog', { name: 'Editar producto' });
    await sheet.getByRole('button', { name: 'Eliminar producto' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Eliminar producto' }).click();

    await expect(page.getByText('Esta sección aún no tiene productos.')).toBeVisible();
    // Scoped to <main>: Next keeps an empty role="alert" route announcer in <body>.
    await expect(page.getByRole('main').getByRole('alert')).toHaveCount(0);
    expect((await page.request.get(photo)).status()).toBe(404);
  });

  test('borrar la sección borra las imágenes de sus productos', async ({ page }) => {
    const photo = await uploadPhoto(page);
    await page.getByRole('dialog', { name: 'Editar producto' }).getByRole('button', { name: 'Cerrar' }).click();

    await page.getByRole('button', { name: 'Eliminar sección Entradas' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Eliminar sección' }).click();
    await expect(page.getByRole('region', { name: 'Entradas' })).toHaveCount(0);
    expect((await page.request.get(photo)).status()).toBe(404);
  });

  test('otro dueño no puede cambiar la imagen de este producto', async ({ baseURL, browser }) => {
    const intruderContext = await browser.newContext();
    const intruder = await intruderContext.newPage();
    await registerOwnerViaApi(intruder.request, newOwner('Pollería El Ñandú'), baseURL);
    // Straight to Next: through `netlify dev` a 404 can end as another code (see CLAUDE.md).
    const origin = { Origin: new URL(NEXT_DIRECT_URL).origin };
    const put = await intruder.request.put(`${NEXT_DIRECT_URL}/api/carta/productos/${productId}/imagen`, {
      headers: origin,
      multipart: { image: { buffer: TINY_PNG, mimeType: 'image/png', name: 'x.png' } },
    });
    const remove = await intruder.request.delete(`${NEXT_DIRECT_URL}/api/carta/productos/${productId}/imagen`, {
      headers: origin,
    });
    expect(put.status()).toBe(404);
    expect(remove.status()).toBe(404);
    await intruderContext.close();
  });
});
