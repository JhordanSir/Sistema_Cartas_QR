import { expect, test } from '@playwright/test';

import { newOwner, registerOwnerViaApi } from './support/cuentas';
import { TINY_PNG } from './support/imagenes';

const INVALID_RESPONSE = 'Gemini no pudo interpretar una carta válida. Prueba con fotos más nítidas.';
const DONE = 'Carta digitalizada. Revísala y publícala cuando esté lista.';
const JOB_STATUS = /\/api\/digitalizacion\/[0-9a-f-]{36}$/;
const BACKGROUND_FUNCTION = '**/.netlify/functions/digitize-background';

test.describe('digitalización con Gemini', () => {
  // Two digitizations in one test: the second runs the simulated extractor.
  test.describe.configure({ timeout: 60_000 });

  test.beforeEach(async ({ baseURL, page }) => {
    await registerOwnerViaApi(page.request, newOwner('Cevichería Luna'), baseURL);
  });

  test('si Gemini no reconoce una carta, se ve el motivo y se puede volver a intentar', async ({ baseURL, page }) => {
    // The fake extractor never fails, so Gemini's answer is simulated: the
    // function is not invoked and the job status comes back FAILED.
    await page.route(BACKGROUND_FUNCTION, (route) => route.fulfill({ status: 202 }));
    await page.route(JOB_STATUS, async (route) => {
      if (route.request().method() !== 'GET') return route.continue();
      const { job } = (await (await route.fetch()).json()) as { job: Record<string, unknown> };
      await route.fulfill({ json: { job: { ...job, errorCode: 'INVALID_MODEL_RESPONSE', status: 'FAILED' } } });
    });

    await page.goto('/panel/carta');
    await page.getByRole('button', { name: 'Digitalizar desde fotos' }).first().click();
    const sheet = page.getByRole('dialog', { name: 'Digitalizar desde fotos' });
    await sheet.getByLabel('Fotos de la carta').setInputFiles({ buffer: TINY_PNG, mimeType: 'image/png', name: 'pared.png' });
    await expect(sheet.getByRole('img', { name: 'Foto 1' })).toBeVisible();
    const created = page.waitForResponse(
      (response) => response.request().method() === 'POST' && response.url().endsWith('/api/digitalizacion'),
    );
    await sheet.getByRole('button', { name: 'Digitalizar carta' }).click();
    const { job } = (await (await created).json()) as { job: { id: string } };

    await expect(page.getByText(INVALID_RESPONSE)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('button', { exact: true, name: 'Nueva sección' })).toBeEnabled();

    // What the function would have done with that answer: the job ends FAILED.
    const discarded = await page.request.delete(`/api/digitalizacion/${job.id}`, {
      headers: { Origin: new URL(baseURL ?? 'http://localhost:8888').origin },
    });
    expect(discarded.ok()).toBe(true);
    await page.unroute(BACKGROUND_FUNCTION);
    await page.unroute(JOB_STATUS);

    // The photos were deleted, so they have to be chosen again.
    await page.getByRole('button', { name: 'Volver a intentar' }).click();
    await expect(sheet).toBeVisible();
    await expect(sheet.getByRole('img', { name: /^Foto \d$/ })).toHaveCount(0);
    await sheet.getByLabel('Fotos de la carta').setInputFiles({ buffer: TINY_PNG, mimeType: 'image/png', name: 'carta.png' });
    await expect(sheet.getByRole('img', { name: 'Foto 1' })).toBeVisible();
    await sheet.getByRole('button', { name: 'Digitalizar carta' }).click();

    await expect(page.getByText(DONE)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(INVALID_RESPONSE)).toHaveCount(0);
    await expect(page.getByRole('region', { name: 'Entradas' }).getByText('Ceviche clásico')).toBeVisible();
  });
});
