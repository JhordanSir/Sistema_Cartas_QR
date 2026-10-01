import { expect, test, type APIRequestContext, type Browser, type Page } from '@playwright/test';

import { createProductViaApi, createSectionViaApi, currentSlug, publishViaApi } from './support/carta';
import { ADMIN, NEXT_DIRECT_URL, newOwner, registerOwnerViaApi, signIn, type Owner } from './support/cuentas';
import { TINY_PNG } from './support/imagenes';

const PAUSED = 'Tu carta está pausada por el administrador. Los clientes no pueden verla.';
const WRONG_CREDENTIALS = 'Correo o contraseña incorrectos.';

function origin(baseURL: string | undefined): { Origin: string } {
  return { Origin: new URL(baseURL ?? 'http://localhost:8888').origin };
}

async function signInAdminViaApi(request: APIRequestContext, baseURL: string | undefined): Promise<void> {
  const response = await request.post(`${baseURL ?? ''}/api/sesion`, { data: ADMIN, headers: origin(baseURL) });
  expect(response.status()).toBe(200);
}

/** An owner with a published menu, signed in on a browser context of its own. */
async function ownerWithMenu(
  browser: Browser,
  baseURL: string | undefined,
  restaurantName: string,
): Promise<{ owner: Owner; ownerPage: Page; slug: string }> {
  const ownerPage = await (await browser.newContext()).newPage();
  const owner = newOwner(restaurantName);
  await registerOwnerViaApi(ownerPage.request, owner, baseURL);
  const sectionId = await createSectionViaApi(ownerPage.request, 'Entradas', baseURL);
  await createProductViaApi(ownerPage.request, { basePrice: '28', categoryId: sectionId, name: 'Ceviche' }, baseURL);
  return { owner, ownerPage, slug: await publishViaApi(ownerPage.request, baseURL) };
}

function rowOf(page: Page, slug: string) {
  return page.getByRole('row').filter({ has: page.getByRole('link', { exact: true, name: `/${slug}` }) });
}

async function search(page: Page, text: string): Promise<void> {
  await page.getByLabel('Buscar por nombre, slug o correo').fill(text);
  await page.getByRole('button', { exact: true, name: 'Buscar' }).click();
  await page.waitForURL((url) => url.searchParams.get('q') === text);
}

async function restaurantIdOf(request: APIRequestContext, query: string): Promise<string> {
  const response = await request.get(`/api/admin/restaurantes?q=${encodeURIComponent(query)}`);
  const { restaurants } = (await response.json()) as { restaurants: { id: string }[] };
  expect(restaurants).toHaveLength(1);
  return restaurants[0]?.id ?? '';
}

test.describe('backoffice', () => {
  test('el buscador encuentra por nombre, slug y correo, y la lista va de 20 en 20', async ({
    baseURL,
    browser,
    page,
  }) => {
    const marker = `Fonda ${Date.now().toString(36)}`;
    const registrations = await browser.newContext();
    const owners: Owner[] = [];
    for (let number = 1; number <= 21; number += 1) {
      const owner = newOwner(`${marker} ${String(number).padStart(2, '0')}`);
      await registerOwnerViaApi(registrations.request, owner, baseURL);
      owners.push(owner);
    }
    await registrations.close();

    await signInAdminViaApi(page.request, baseURL);
    await page.goto('/admin');
    await search(page, marker);
    await expect(page.getByText(`21 restaurantes para «${marker}».`)).toBeVisible();
    const table = page.getByRole('table', { name: 'Restaurantes' });
    // The header row plus the 20 newest.
    await expect(table.getByRole('row')).toHaveCount(21);
    await expect(table.getByText(`${marker} 21`)).toBeVisible();
    await expect(table.getByText(`${marker} 01`)).toHaveCount(0);

    await page.getByRole('link', { name: 'Siguiente' }).click();
    await expect(page.getByText('Página 2 de 2')).toBeVisible();
    await expect(table.getByRole('row')).toHaveCount(2);
    await expect(table.getByText(`${marker} 01`)).toBeVisible();

    const fifth = owners[4];
    const fifthSlug = `${marker.toLowerCase().replace(' ', '-')}-05`;
    await search(page, fifthSlug);
    await expect(page.getByText(`1 restaurante para «${fifthSlug}».`)).toBeVisible();
    await expect(rowOf(page, fifthSlug)).toBeVisible();

    await search(page, fifth?.email ?? '');
    await expect(rowOf(page, fifthSlug)).toContainText(fifth?.email ?? '');

    await search(page, 'nadie-se-llama-asi');
    await expect(page.getByText('Ningún restaurante coincide con «nadie-se-llama-asi».')).toBeVisible();
    // The administrator has no restaurant: it is never listed.
    await search(page, ADMIN.email);
    await expect(page.getByText(`Ningún restaurante coincide con «${ADMIN.email}».`)).toBeVisible();
  });

  test('pausar deja la carta en 404, sin contar visitas, y avisa al dueño; reactivar la devuelve', async ({
    baseURL,
    browser,
    page,
    playwright,
  }) => {
    const { ownerPage, slug } = await ownerWithMenu(browser, baseURL, 'Pollería El Ñandú');
    const next = await playwright.request.newContext({ baseURL: NEXT_DIRECT_URL });
    expect((await next.get(`/${slug}`)).status()).toBe(200);

    await signInAdminViaApi(page.request, baseURL);
    await page.goto(`/admin?q=${slug}`);
    const row = rowOf(page, slug);
    await expect(row.getByText('Activa')).toBeVisible();
    await row.getByRole('button', { name: 'Pausar Pollería El Ñandú' }).click();
    const confirmPause = page.getByRole('alertdialog', { name: '¿Pausar Pollería El Ñandú?' });
    await expect(confirmPause).toContainText(`Su carta dejará de verse en /${slug}`);
    await confirmPause.getByRole('button', { exact: true, name: 'Pausar' }).click();
    await expect(page.getByText('Pausaste Pollería El Ñandú: su carta ya no se puede ver.')).toBeVisible();
    await expect(row.getByText('Pausada')).toBeVisible();

    // Straight to Next for the exact status of the page.
    expect((await next.get(`/${slug}`)).status()).toBe(404);
    const visit = await next.post(`/api/vistas/${slug}`, {
      headers: { Origin: new URL(NEXT_DIRECT_URL).origin, 'x-nf-client-connection-ip': '203.0.113.9' },
    });
    expect(visit.status()).toBe(204);

    // The owner still signs in and edits, warned.
    await ownerPage.goto('/panel');
    await expect(ownerPage.getByText(PAUSED)).toBeVisible();
    const { statistics } = (await (await ownerPage.request.get('/api/estadisticas')).json()) as {
      statistics: { allTime: number };
    };
    expect(statistics.allTime).toBe(0);

    await row.getByRole('button', { name: 'Reactivar Pollería El Ñandú' }).click();
    await page
      .getByRole('alertdialog', { name: '¿Reactivar Pollería El Ñandú?' })
      .getByRole('button', { exact: true, name: 'Reactivar' })
      .click();
    await expect(page.getByText('Reactivaste Pollería El Ñandú: su carta vuelve a verse.')).toBeVisible();
    await expect(row.getByText('Activa')).toBeVisible();

    const reopened = await next.get(`/${slug}`);
    expect(reopened.status()).toBe(200);
    expect(await reopened.text()).toContain('Ceviche');
    await ownerPage.reload();
    await expect(ownerPage.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(ownerPage.getByText(PAUSED)).toHaveCount(0);
    await next.dispose();
    await ownerPage.context().close();
  });

  test('una contraseña temporal deja entrar al dueño, que debe cambiarla, y la anterior ya no sirve', async ({
    baseURL,
    browser,
    context,
    page,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    const ownerPage = await (await browser.newContext()).newPage();
    const owner = newOwner('Chifa Dragón Rojo');
    await registerOwnerViaApi(ownerPage.request, owner, baseURL);
    const slug = await currentSlug(ownerPage.request);

    await signInAdminViaApi(page.request, baseURL);
    await page.goto(`/admin?q=${slug}`);
    await rowOf(page, slug).getByRole('button', { name: 'Contraseña temporal de Chifa Dragón Rojo' }).click();
    const confirm = page.getByRole('alertdialog', { name: '¿Crear una contraseña temporal?' });
    await expect(confirm).toContainText(owner.email);
    await confirm.getByRole('button', { name: 'Crear contraseña' }).click();

    const shown = page.getByRole('dialog', { name: 'Contraseña temporal' });
    const field = shown.getByRole('textbox', { name: 'Contraseña temporal' });
    await expect(field).toHaveValue(/^[a-km-zA-HJ-NP-Z2-9]{12}$/);
    const temporary = await field.inputValue();
    await shown.getByRole('button', { exact: true, name: 'Copiar' }).click();
    await expect(shown.getByText('Contraseña copiada.')).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(temporary);
    // Shown once: after «Listo» it is gone from the page.
    await shown.getByRole('button', { name: 'Listo' }).click();
    await expect(shown).toBeHidden();
    await expect(page.getByRole('textbox', { name: 'Contraseña temporal' })).toHaveCount(0);

    // Every session of the owner ended, and the old password no longer works.
    expect((await ownerPage.request.get('/api/carta')).status()).toBe(401);
    await signIn(ownerPage, owner.email, owner.password);
    await expect(ownerPage.getByText(WRONG_CREDENTIALS)).toBeVisible();

    // The temporary one only lets them change it.
    await signIn(ownerPage, owner.email, temporary);
    await expect(ownerPage).toHaveURL(/\/panel\/cuenta$/);
    await expect(ownerPage.getByText('Debes cambiar tu contraseña para continuar.')).toBeVisible();
    await ownerPage.goto('/panel/carta');
    await expect(ownerPage).toHaveURL(/\/panel\/cuenta$/);
    const blocked = await ownerPage.request.get(`${NEXT_DIRECT_URL}/api/carta`);
    expect(blocked.status()).toBe(403);
    expect(await blocked.json()).toMatchObject({ code: 'MUST_CHANGE_PASSWORD' });

    const chosen = 'Dragon2027';
    await ownerPage.getByLabel('Contraseña actual', { exact: true }).fill(temporary);
    await ownerPage.getByLabel('Nueva contraseña', { exact: true }).fill(chosen);
    await ownerPage.getByLabel('Repite la nueva contraseña').fill(chosen);
    await ownerPage.getByRole('button', { name: 'Cambiar contraseña' }).click();
    await expect(ownerPage).toHaveURL(/\/panel$/);
    await ownerPage.goto('/panel/carta');
    await expect(ownerPage).toHaveURL(/\/panel\/carta$/);
    expect((await ownerPage.request.get('/api/carta')).status()).toBe(200);
    await ownerPage.context().close();
  });

  test('eliminar exige la frase exacta y la casilla; después la carta da 404 y su dueño ya no entra', async ({
    baseURL,
    browser,
    page,
    playwright,
  }) => {
    const { owner, ownerPage, slug } = await ownerWithMenu(browser, baseURL, 'Sanguchería La Esquina');
    // A logo, to check that the restaurant's files go too.
    const saved = await ownerPage.request.patch('/api/perfil', {
      headers: origin(baseURL),
      multipart: {
        address: '',
        contactPhone: '',
        facebookUrl: '',
        instagramUrl: '',
        logo: { buffer: TINY_PNG, mimeType: 'image/png', name: 'logo.png' },
        name: 'Sanguchería La Esquina',
        tiktokUrl: '',
        whatsapp: '',
      },
    });
    expect(saved.status()).toBe(200);
    const { profile } = (await (await ownerPage.request.get('/api/perfil')).json()) as {
      profile: { logoUrl: string };
    };
    expect((await ownerPage.request.get(profile.logoUrl)).status()).toBe(200);

    await signInAdminViaApi(page.request, baseURL);
    // The API checks the phrase and the box too.
    const id = await restaurantIdOf(page.request, slug);
    const lowercase = await page.request.delete(`/api/admin/restaurantes/${id}`, {
      data: { confirmation: `eliminar ${slug}`, understood: true },
      headers: origin(baseURL),
    });
    expect(lowercase.status()).toBe(400);
    expect(await lowercase.json()).toMatchObject({ fields: { confirmation: `Escribe exactamente ELIMINAR ${slug}.` } });
    const unticked = await page.request.delete(`/api/admin/restaurantes/${id}`, {
      data: { confirmation: `ELIMINAR ${slug}`, understood: false },
      headers: origin(baseURL),
    });
    expect(await unticked.json()).toMatchObject({ fields: { understood: 'Marca la casilla para confirmar.' } });

    await page.goto(`/admin?q=${slug}`);
    await rowOf(page, slug).getByRole('button', { name: 'Eliminar Sanguchería La Esquina' }).click();
    const dialog = page.getByRole('dialog', { name: '¿Eliminar Sanguchería La Esquina?' });
    const phrase = dialog.getByLabel(`Escribe ELIMINAR ${slug} para confirmar`);
    const understood = dialog.getByLabel('Entiendo que se borrará para siempre');
    const submit = dialog.getByRole('button', { name: 'Eliminar restaurante' });
    await expect(dialog).toContainText(owner.email);
    await expect(submit).toBeDisabled();
    await phrase.fill(`ELIMINAR ${slug.toUpperCase()}`);
    await understood.check();
    await expect(submit).toBeDisabled();
    await phrase.fill(`ELIMINAR ${slug}`);
    await understood.uncheck();
    await expect(submit).toBeDisabled();
    await understood.check();
    await expect(submit).toBeEnabled();
    await submit.click();

    await expect(page.getByText('Eliminaste Sanguchería La Esquina y la cuenta de su dueño.')).toBeVisible();
    await expect(page.getByText(`Ningún restaurante coincide con «${slug}».`)).toBeVisible();
    const next = await playwright.request.newContext({ baseURL: NEXT_DIRECT_URL });
    expect((await next.get(`/${slug}`)).status()).toBe(404);
    await next.dispose();
    expect((await page.request.get(profile.logoUrl)).status()).toBe(404);
    expect((await ownerPage.request.get('/api/carta')).status()).toBe(401);
    await signIn(ownerPage, owner.email, owner.password);
    await expect(ownerPage.getByText(WRONG_CREDENTIALS)).toBeVisible();
    await ownerPage.context().close();
  });

  test('solo el administrador usa el backoffice', async ({ baseURL, page, playwright }) => {
    const owner = newOwner('Juguería Don Lucho');
    await registerOwnerViaApi(page.request, owner, baseURL);
    // An owner: 403 from the API (straight to Next for the exact code), and /admin sends them home.
    expect((await page.request.get(`${NEXT_DIRECT_URL}/api/admin/restaurantes`)).status()).toBe(403);
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/panel$/);

    const anonymous = await playwright.request.newContext();
    expect((await anonymous.get(`${baseURL}/api/admin/restaurantes`)).status()).toBe(401);
    await anonymous.dispose();

    const admin = await playwright.request.newContext({ baseURL: NEXT_DIRECT_URL });
    await signInAdminViaApi(admin, NEXT_DIRECT_URL);
    const id = await restaurantIdOf(admin, owner.email);
    const nextOrigin = origin(NEXT_DIRECT_URL);
    // Writes need our own Origin; an id that is not a UUID is a 404; the status is validated.
    expect((await admin.patch(`/api/admin/restaurantes/${id}`, { data: { status: 'DISABLED' } })).status()).toBe(403);
    expect(
      (await admin.patch('/api/admin/restaurantes/no-es-un-id', { data: { status: 'DISABLED' }, headers: nextOrigin })).status(),
    ).toBe(404);
    expect(
      (await admin.patch(`/api/admin/restaurantes/${id}`, { data: { status: 'BORRADO' }, headers: nextOrigin })).status(),
    ).toBe(400);
    expect(
      (await admin.post(`/api/admin/restaurantes/${id}/contrasena-temporal`)).status(),
    ).toBe(403);
    await admin.dispose();
  });
});
