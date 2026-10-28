import { expect, test } from '@playwright/test';

/**
 * Three steps that depend on each other through `ownerLogin`, so they must run in
 * order in the same worker. Serial mode guarantees that even under fullyParallel,
 * and skips the remaining steps if one fails.
 */
test.describe('recorrido en modo serial', () => {
  test.describe.configure({ mode: 'serial' });

  let ownerLogin = '';

  test('1. la portada enlaza al acceso del dueño', async ({ page }) => {
    await page.goto('/');
    ownerLogin = (await page.getByRole('link', { name: /Ingresar a mi restaurante/ }).getAttribute('href')) ?? '';
    expect(ownerLogin).toBe('/admin/login');
  });

  test('2. ese enlace abre el formulario', async ({ page }) => {
    await page.goto(ownerLogin);
    await expect(page.getByRole('heading', { name: 'Tu carta empieza aquí.' })).toBeVisible();
  });

  test('3. el formulario exige correo y contraseña', async ({ page }) => {
    await page.goto(ownerLogin);
    await expect(page.getByLabel('Correo del propietario')).toHaveAttribute('required', '');
    await expect(page.getByLabel('Contraseña')).toHaveAttribute('required', '');
  });
});
