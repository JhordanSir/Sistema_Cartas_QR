import { expect, test, type Locator, type Page } from '@playwright/test';

import { NEXT_DIRECT_URL, newOwner, registerOwnerViaApi } from './support/cuentas';

async function createSection(page: Page, name: string, layout: 'Lista' | 'Tarjetas' = 'Lista') {
  await page.getByRole('button', { exact: true, name: 'Nueva sección' }).or(
    page.getByRole('button', { name: 'Crear la primera sección' }),
  ).first().click();
  const sheet = page.getByRole('dialog', { name: 'Nueva sección' });
  await sheet.getByLabel('Nombre de la sección').fill(name);
  await sheet.getByLabel(layout).check();
  await sheet.getByRole('button', { name: 'Crear sección' }).click();
  await expect(sheet).toBeHidden();
  await expect(sectionCard(page, name)).toBeVisible();
}

function sectionCard(page: Page, name: string): Locator {
  return page.getByRole('region', { exact: true, name });
}

async function addProduct(page: Page, section: string, name: string, price: string) {
  await page.getByRole('button', { name: `Agregar producto a ${section}` }).click();
  const sheet = page.getByRole('dialog', { name: 'Nuevo producto' });
  await sheet.getByLabel('Nombre del producto').fill(name);
  await sheet.getByLabel('Precio').fill(price);
  await sheet.getByRole('button', { name: 'Agregar producto' }).click();
  await expect(sheet).toBeHidden();
}

/** The h2 of each menu section; the template selector below them has its own h2. */
function sectionHeadings(page: Page): Locator {
  return page.getByRole('heading', { level: 2 }).filter({ hasNotText: /^Plantilla$/ });
}

async function productNames(page: Page, section: string): Promise<string[]> {
  return sectionCard(page, section).getByRole('heading', { level: 3 }).allTextContents();
}

test.describe('editor de la carta', () => {
  test.beforeEach(async ({ baseURL, page }) => {
    await registerOwnerViaApi(page.request, newOwner('Cevichería Luna'), baseURL);
    await page.goto('/panel/carta');
  });

  test('una carta nueva muestra su estado vacío', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1, name: 'Carta' })).toBeVisible();
    await expect(
      page.getByText('Tu carta está vacía. Crea tu primera sección o digitaliza tu carta desde fotos.'),
    ).toBeVisible();
  });

  test('crea secciones y productos, los reordena y el orden se mantiene al recargar', async ({ page }) => {
    await createSection(page, 'Entradas');
    await createSection(page, 'Fondos', 'Tarjetas');
    await addProduct(page, 'Entradas', 'Ceviche', '28');
    await addProduct(page, 'Entradas', 'Causa', '12');
    await addProduct(page, 'Fondos', 'Arroz con mariscos', '45.90');
    await expect(sectionCard(page, 'Fondos').getByText('Diseño en tarjetas')).toBeVisible();

    await page.getByRole('button', { name: 'Subir Causa' }).click();
    await expect.poll(() => productNames(page, 'Entradas')).toEqual(['Causa', 'Ceviche']);
    await page.getByRole('button', { name: 'Subir sección Fondos' }).click();
    await expect(sectionHeadings(page)).toHaveText(['Fondos', 'Entradas']);

    await page.reload();
    await expect(sectionHeadings(page)).toHaveText(['Fondos', 'Entradas']);
    expect(await productNames(page, 'Entradas')).toEqual(['Causa', 'Ceviche']);
    // At either end the button is disabled: nothing to move.
    await expect(page.getByRole('button', { name: 'Subir sección Fondos' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Bajar Ceviche' })).toBeDisabled();
  });

  test('mueve un producto a otra sección, lo edita y lo marca no disponible', async ({ page }) => {
    await createSection(page, 'Entradas');
    await createSection(page, 'Fondos');
    await addProduct(page, 'Entradas', 'Ceviche', '28');

    await page.getByRole('button', { name: 'Editar Ceviche' }).click();
    const sheet = page.getByRole('dialog', { name: 'Editar producto' });
    await sheet.getByLabel('Nombre del producto').fill('Ceviche mixto');
    await sheet.getByLabel('Descripción').fill('Pescado y mariscos en leche de tigre.');
    await sheet.getByLabel('Sección').selectOption({ label: 'Fondos' });
    await sheet.getByLabel('Disponible').uncheck();
    await sheet.getByRole('button', { name: 'Guardar producto' }).click();
    await expect(sheet).toBeHidden();

    const fondos = sectionCard(page, 'Fondos');
    await expect(fondos.getByText('Ceviche mixto')).toBeVisible();
    await expect(fondos.getByText('Pescado y mariscos en leche de tigre.')).toBeVisible();
    await expect(fondos.getByText('No disponible')).toBeVisible();
    await expect(sectionCard(page, 'Entradas').getByText('Esta sección aún no tiene productos.')).toBeVisible();
  });

  test('el precio se valida y se guarda con dos decimales', async ({ page }) => {
    await createSection(page, 'Entradas');
    await page.getByRole('button', { name: 'Agregar producto a Entradas' }).click();
    const sheet = page.getByRole('dialog', { name: 'Nuevo producto' });
    await sheet.getByLabel('Nombre del producto').fill('Ceviche');
    await sheet.getByLabel('Precio').fill('abc');
    await sheet.getByRole('button', { name: 'Agregar producto' }).click();

    await expect(sheet.getByText('Escribe un precio válido, por ejemplo 18.50.')).toBeVisible();
    await expect(sheet.getByLabel('Precio')).toBeFocused();

    await sheet.getByLabel('Precio').fill('18.5');
    await expect(sheet.getByText('Escribe un precio válido, por ejemplo 18.50.')).toHaveCount(0);
    await sheet.getByRole('button', { name: 'Agregar producto' }).click();
    await expect(sheet).toBeHidden();
    await expect(sectionCard(page, 'Entradas').getByText('S/ 18.50')).toBeVisible();
  });

  test('eliminar una sección avisa cuántos productos se borran', async ({ page }) => {
    await createSection(page, 'Entradas');
    await addProduct(page, 'Entradas', 'Ceviche', '28');
    await addProduct(page, 'Entradas', 'Causa', '12');

    await page.getByRole('button', { name: 'Eliminar sección Entradas' }).click();
    const confirm = page.getByRole('alertdialog', { name: '¿Eliminar la sección «Entradas»?' });
    await expect(confirm).toContainText('También se eliminarán sus 2 productos.');
    await expect(confirm.getByRole('button', { name: 'Cancelar' })).toBeFocused();

    await confirm.getByRole('button', { name: 'Cancelar' }).click();
    await expect(sectionCard(page, 'Entradas')).toBeVisible();

    await page.getByRole('button', { name: 'Eliminar sección Entradas' }).click();
    await confirm.getByRole('button', { name: 'Eliminar sección' }).click();
    await expect(sectionCard(page, 'Entradas')).toHaveCount(0);
    await expect(
      page.getByText('Tu carta está vacía. Crea tu primera sección o digitaliza tu carta desde fotos.'),
    ).toBeVisible();
  });

  test('un producto se elimina desde su edición, tras confirmar', async ({ page }) => {
    await createSection(page, 'Entradas');
    await addProduct(page, 'Entradas', 'Ceviche', '28');

    await page.getByRole('button', { name: 'Editar Ceviche' }).click();
    await page.getByRole('dialog', { name: 'Editar producto' }).getByRole('button', { name: 'Eliminar producto' }).click();
    await page.getByRole('alertdialog', { name: '¿Eliminar «Ceviche»?' }).getByRole('button', { name: 'Eliminar producto' }).click();

    await expect(page.getByRole('dialog', { name: 'Editar producto' })).toBeHidden();
    await expect(sectionCard(page, 'Entradas').getByText('Esta sección aún no tiene productos.')).toBeVisible();
  });

  test('«Subir» y «Bajar» se usan con el teclado y conservan el foco', async ({ page }) => {
    await createSection(page, 'Entradas');
    await addProduct(page, 'Entradas', 'Ceviche', '28');
    await addProduct(page, 'Entradas', 'Causa', '12');
    await addProduct(page, 'Entradas', 'Chicharrón', '24');

    await page.getByRole('button', { name: 'Bajar Ceviche' }).focus();
    await page.keyboard.press('Enter');
    await expect.poll(() => productNames(page, 'Entradas')).toEqual(['Causa', 'Ceviche', 'Chicharrón']);
    await expect(page.getByRole('button', { name: 'Bajar Ceviche' })).toBeFocused();

    await page.keyboard.press('Enter');
    await expect.poll(() => productNames(page, 'Entradas')).toEqual(['Causa', 'Chicharrón', 'Ceviche']);
    // Now at the bottom «Bajar» is disabled, so the focus moves to «Subir».
    await expect(page.getByRole('button', { name: 'Subir Ceviche' })).toBeFocused();
  });

  test('las hojas de edición se cierran con Escape', async ({ page }) => {
    await page.getByRole('button', { exact: true, name: 'Nueva sección' }).click();
    const sheet = page.getByRole('dialog', { name: 'Nueva sección' });
    await expect(sheet.getByLabel('Nombre de la sección')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(sheet).toBeHidden();
  });
});

test.describe('aislamiento entre restaurantes', () => {
  test('un dueño no puede tocar la carta de otro restaurante', async ({ baseURL, browser }) => {
    const origin = new URL(baseURL ?? 'http://localhost:8888').origin;

    const ownerContext = await browser.newContext();
    const owner = await ownerContext.newPage();
    await registerOwnerViaApi(owner.request, newOwner('Cevichería Luna'), baseURL);
    const created = await owner.request.post('/api/carta/secciones', {
      data: { name: 'Entradas' },
      headers: { Origin: origin },
    });
    const sectionId = ((await created.json()) as { draft: { categories: { id: string }[] } }).draft
      .categories[0]?.id;
    const withProduct = await owner.request.post('/api/carta/productos', {
      data: { basePrice: '28', categoryId: sectionId, name: 'Ceviche' },
      headers: { Origin: origin },
    });
    const productId = (
      (await withProduct.json()) as { draft: { categories: { products: { id: string }[] }[] } }
    ).draft.categories[0]?.products[0]?.id;

    const otherContext = await browser.newContext();
    const other = await otherContext.newPage();
    await registerOwnerViaApi(other.request, newOwner('Pollería El Ñandú'), baseURL);
    // Straight to Next for exact codes: `netlify dev` retries every 404 as a
    // static file, and for a POST its last attempt ends in 405. The session
    // cookie belongs to `localhost`, so it travels to any port.
    const next = NEXT_DIRECT_URL;
    const nextOrigin = { Origin: new URL(next).origin };
    const attempts = [
      other.request.patch(`${next}/api/carta/productos/${productId}`, {
        data: { basePrice: '1', categoryId: sectionId, name: 'Robado' },
        headers: nextOrigin,
      }),
      other.request.delete(`${next}/api/carta/productos/${productId}`, { headers: nextOrigin }),
      other.request.delete(`${next}/api/carta/secciones/${sectionId}`, { headers: nextOrigin }),
      other.request.post(`${next}/api/carta/secciones/${sectionId}/mover`, {
        data: { direction: 'down' },
        headers: nextOrigin,
      }),
      other.request.post(`${next}/api/carta/productos`, {
        data: { basePrice: '1', categoryId: sectionId, name: 'Intruso' },
        headers: nextOrigin,
      }),
    ];
    for (const response of await Promise.all(attempts)) {
      expect(response.status()).toBe(404);
      expect(await response.json()).toMatchObject({ code: 'NOT_FOUND' });
    }

    const draft = (await (await owner.request.get('/api/carta')).json()) as {
      draft: { categories: { name: string; products: { name: string }[] }[] };
    };
    expect(draft.draft.categories).toEqual([
      expect.objectContaining({ name: 'Entradas', products: [expect.objectContaining({ name: 'Ceviche' })] }),
    ]);
    await ownerContext.close();
    await otherContext.close();
  });
});
