import { expect, test } from '@playwright/test';

test.describe('carta pública y salud', () => {
  test('una carta inexistente responde 404 con su aviso', async ({ page }) => {
    const response = await page.goto('/no-existe-este-restaurante');
    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { name: 'Esta carta no está disponible.' })).toBeVisible();
  });

  test('el aviso devuelve a la portada', async ({ page }) => {
    await page.goto('/no-existe-este-restaurante');
    await page.getByRole('link', { name: 'Volver al inicio' }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test('la API responde su health check a través de la web', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.ok()).toBe(true);
    expect(await response.json()).toMatchObject({ service: 'api', status: 'ok' });
  });
});
