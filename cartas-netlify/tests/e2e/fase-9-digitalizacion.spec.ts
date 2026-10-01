import { expect, test, type Page } from '@playwright/test';

import { createProductViaApi, createSectionViaApi, currentSlug, publishViaApi } from './support/carta';
import { NEXT_DIRECT_URL, newOwner, registerOwnerViaApi } from './support/cuentas';
import { TEXT_AS_PNG, TINY_PNG } from './support/imagenes';

const photo = (name: string) => ({ buffer: TINY_PNG, mimeType: 'image/png', name });
const PROCESSING = 'Leyendo tu carta con IA (puede tardar hasta 2 minutos)…';
const DONE = 'Carta digitalizada. Revísala y publícala cuando esté lista.';

function origin(baseURL: string | undefined): { Origin: string } {
  return { Origin: new URL(baseURL ?? 'http://localhost:8888').origin };
}

/** Fails fast, saying why, when `netlify dev` runs without the simulated extractor. */
async function expectDigitized(page: Page): Promise<void> {
  const failure = page.getByText(/^Gemini /);
  await expect(page.getByText(DONE).or(failure)).toBeVisible({ timeout: 30_000 });
  await expect(failure, 'netlify dev debe correr con DIGITIZATION_FAKE=1 (extractor simulado)').toHaveCount(0);
}

async function choosePhotos(page: Page, count: number): Promise<void> {
  await page.getByRole('button', { name: 'Digitalizar desde fotos' }).first().click();
  const sheet = page.getByRole('dialog', { name: 'Digitalizar desde fotos' });
  await sheet.getByLabel('Fotos de la carta').setInputFiles(
    Array.from({ length: count }, (_, index) => photo(`pagina-${index + 1}.png`)),
  );
  await expect(sheet.getByRole('img', { name: /^Foto \d$/ })).toHaveCount(Math.min(count, 5));
}

test.describe('digitalización', () => {
  // The background function and the simulated extractor take about 10 s.
  test.describe.configure({ timeout: 60_000 });

  test.beforeEach(async ({ baseURL, page }) => {
    await registerOwnerViaApi(page.request, newOwner('Cevichería Luna'), baseURL);
  });

  test('las fotos reemplazan el borrador tras confirmar, y la carta publicada no cambia', async ({
    baseURL,
    page,
  }) => {
    const sectionId = await createSectionViaApi(page.request, 'Vieja', baseURL);
    await createProductViaApi(page.request, { basePrice: '10', categoryId: sectionId, name: 'Plato viejo' }, baseURL);
    const slug = await publishViaApi(page.request, baseURL);

    await page.goto('/panel/carta');
    await choosePhotos(page, 2);
    const sheet = page.getByRole('dialog', { name: 'Digitalizar desde fotos' });
    await expect(sheet.getByText(/^Foto 1 · \d+ KB$/)).toBeVisible();
    await expect(sheet.getByText('2 de 5 fotos', { exact: false })).toBeVisible();

    await sheet.getByRole('button', { name: 'Digitalizar carta' }).click();
    const confirm = page.getByRole('alertdialog', { name: '¿Reemplazar tu borrador?' });
    await expect(confirm).toContainText(
      'La carta digitalizada reemplazará todo tu borrador actual. Tu carta publicada no cambia hasta que publiques.',
    );
    await confirm.getByRole('button', { name: 'Reemplazar mi borrador' }).click();

    await expect(page.getByText(PROCESSING)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('button', { exact: true, name: 'Nueva sección' })).toBeDisabled();
    await expectDigitized(page);

    await expect(page.getByRole('region', { name: 'Entradas' }).getByText('Ceviche clásico')).toBeVisible();
    await expect(page.getByRole('region', { name: 'Fondos' }).getByText('Arroz con mariscos')).toBeVisible();
    await expect(page.getByRole('region', { name: 'Vieja' })).toHaveCount(0);
    await expect(page.getByText('Tienes cambios por publicar.')).toBeVisible();
    await expect(page.getByRole('button', { exact: true, name: 'Nueva sección' })).toBeEnabled();

    await page.goto(`/${slug}`);
    await expect(page.getByText('Plato viejo')).toBeVisible();
    await expect(page.getByText('Ceviche clásico')).toHaveCount(0);
  });

  test('mientras dura, la carta no se puede editar, y el seguimiento sigue al recargar', async ({ baseURL, page }) => {
    await page.goto('/panel/carta');
    await choosePhotos(page, 1);
    await page.getByRole('dialog', { name: 'Digitalizar desde fotos' }).getByRole('button', { name: 'Digitalizar carta' }).click();
    await expect(page.getByText(PROCESSING)).toBeVisible({ timeout: 15_000 });

    const blocked = await page.request.post('/api/carta/secciones', { data: { name: 'Intento' }, headers: origin(baseURL) });
    expect(blocked.status()).toBe(409);
    expect(await blocked.json()).toMatchObject({ code: 'DIGITIZATION_IN_PROGRESS' });

    await page.reload();
    await expect(page.getByText(PROCESSING)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Digitalizar desde fotos' }).first()).toBeDisabled();
    await expectDigitized(page);
    await expect(page.getByRole('region', { name: 'Entradas' })).toBeVisible();
  });

  test('un archivo que no es imagen y una sexta foto se rechazan', async ({ page }) => {
    await page.goto('/panel/carta');
    await page.getByRole('button', { name: 'Digitalizar desde fotos' }).first().click();
    const sheet = page.getByRole('dialog', { name: 'Digitalizar desde fotos' });

    await sheet.getByLabel('Fotos de la carta').setInputFiles({ buffer: TEXT_AS_PNG, mimeType: 'image/png', name: 'menu.png' });
    await expect(sheet.getByText('No pudimos leer esa imagen. Prueba con otra.')).toBeVisible();

    await sheet.getByLabel('Fotos de la carta').setInputFiles(
      Array.from({ length: 6 }, (_, index) => photo(`pagina-${index + 1}.png`)),
    );
    await expect(sheet.getByText('Puedes subir de 1 a 5 fotos.')).toBeVisible();
    await expect(sheet.getByRole('img', { name: /^Foto \d$/ })).toHaveCount(5);
    await expect(sheet.getByRole('button', { name: 'Agregar más fotos' })).toBeDisabled();

    await sheet.getByRole('button', { name: 'Quitar la foto 5' }).click();
    await expect(sheet.getByRole('img', { name: /^Foto \d$/ })).toHaveCount(4);
  });

  test('una subida interrumpida se puede descartar', async ({ baseURL, page }) => {
    const created = await page.request.post('/api/digitalizacion', { headers: origin(baseURL) });
    expect(created.status()).toBe(201);

    await page.goto('/panel/carta');
    // First it waits in case the function is just about to start (a cold start)…
    await expect(page.getByText(PROCESSING)).toBeVisible();
    await expect(page.getByRole('button', { exact: true, name: 'Nueva sección' })).toBeDisabled();
    // …and only then treats the upload as interrupted.
    await expect(page.getByText('La subida de las fotos anteriores no terminó.')).toBeVisible({ timeout: 30_000 });
    await page.getByRole('button', { name: 'Descartar y volver a empezar' }).click();
    await expect(page.getByText('La subida de las fotos anteriores no terminó.')).toHaveCount(0);
    await expect(page.getByRole('button', { exact: true, name: 'Nueva sección' })).toBeEnabled();
  });

  test('la API valida los trabajos y la función exige la sesión del dueño', async ({ baseURL, page, playwright }) => {
    const created = await page.request.post('/api/digitalizacion', { headers: origin(baseURL) });
    const { job } = (await created.json()) as { job: { id: string } };

    const second = await page.request.post('/api/digitalizacion', { headers: origin(baseURL) });
    expect(second.status()).toBe(409);
    const sixth = await page.request.put(`/api/digitalizacion/${job.id}/fotos/6`, {
      headers: origin(baseURL),
      multipart: { photo: photo('sexta.png') },
    });
    expect(sixth.status()).toBe(400);
    const textPhoto = await page.request.put(`/api/digitalizacion/${job.id}/fotos/1`, {
      headers: origin(baseURL),
      multipart: { photo: { buffer: TEXT_AS_PNG, mimeType: 'image/png', name: 'menu.png' } },
    });
    expect(textPhoto.status()).toBe(400);
    const first = await page.request.put(`/api/digitalizacion/${job.id}/fotos/1`, {
      headers: origin(baseURL),
      multipart: { photo: photo('menu.png') },
    });
    expect(await first.json()).toMatchObject({ job: { photoCount: 1, status: 'UPLOADING' } });

    // Without the owner's cookie the function answers 202 but does nothing.
    const anonymous = await playwright.request.newContext({ baseURL });
    const invoked = await anonymous.post('/.netlify/functions/digitize-background', {
      data: { jobId: job.id },
      headers: origin(baseURL),
    });
    expect(invoked.status()).toBe(202);
    await anonymous.dispose();
    await page.waitForTimeout(2000);
    const status = await (await page.request.get(`/api/digitalizacion/${job.id}`)).json();
    expect(status).toMatchObject({ job: { status: 'UPLOADING' } });

    // Another owner cannot see or touch this job (straight to Next for exact codes).
    const intruder = await playwright.request.newContext();
    await registerOwnerViaApi(intruder, newOwner('Pollería El Ñandú'), baseURL);
    const nextOrigin = { Origin: new URL(NEXT_DIRECT_URL).origin };
    expect((await intruder.get(`${NEXT_DIRECT_URL}/api/digitalizacion/${job.id}`)).status()).toBe(404);
    const foreignPhoto = await intruder.put(`${NEXT_DIRECT_URL}/api/digitalizacion/${job.id}/fotos/2`, {
      headers: nextOrigin,
      multipart: { photo: photo('ajena.png') },
    });
    expect(foreignPhoto.status()).toBe(404);
    await intruder.dispose();
  });

  test('una carta vacía ofrece digitalizar desde fotos', async ({ page }) => {
    await page.goto('/panel/carta');
    await expect(
      page.getByText('Tu carta está vacía. Crea tu primera sección o digitaliza tu carta desde fotos.'),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Digitalizar desde fotos' })).toHaveCount(2);
    expect(await currentSlug(page.request)).toMatch(/^cevicheria-luna/);
  });
});
