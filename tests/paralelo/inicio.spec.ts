import { expect, test } from '@playwright/test';

// The largest file on purpose: without fullyParallel, its six tests share one worker.
test.describe('portada', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('saluda con su titular', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1, name: 'Tu carta trabaja mientras atiendes.' })).toBeVisible();
  });

  test('explica las tres funciones', async ({ page }) => {
    for (const name of ['Digitaliza tu menú', 'Comparte un QR único', 'Actualiza y entiende']) {
      await expect(page.getByRole('heading', { name })).toBeVisible();
    }
  });

  test('el botón principal lleva al acceso del dueño', async ({ page }) => {
    await expect(page.getByRole('link', { name: /Ingresar a mi restaurante/ })).toHaveAttribute('href', '/admin/login');
  });

  test('Administración lleva al acceso del backoffice', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'Administración' })).toHaveAttribute('href', '/login');
  });

  test('responde las preguntas frecuentes', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Lo que todos preguntan.' })).toBeVisible();
  });

  test('el contacto abre WhatsApp', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'Hablar con Sirio' })).toHaveAttribute('href', /^https:\/\/wa\.me\//);
  });
});
