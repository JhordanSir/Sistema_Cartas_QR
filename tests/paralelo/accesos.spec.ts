import { expect, test } from '@playwright/test';

test.describe('pantallas de acceso', () => {
  test('el dueño ve su formulario', async ({ page }) => {
    await page.goto('/admin/login');
    await expect(page.getByRole('heading', { name: 'Tu carta empieza aquí.' })).toBeVisible();
    await expect(page.getByLabel('Correo del propietario')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Entrar a mi restaurante' })).toBeVisible();
  });

  test('el administrador ve el suyo', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Tu mesa de control.' })).toBeVisible();
    await expect(page.getByLabel('Correo del administrador')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Entrar al backoffice' })).toBeVisible();
  });

  test('el panel sin sesión manda al acceso del dueño', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin\/login$/);
  });

  test('el backoffice sin sesión manda al acceso del administrador', async ({ page }) => {
    await page.goto('/backoffice');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('la contraseña se puede mostrar y ocultar', async ({ page }) => {
    await page.goto('/admin/login');
    const password = page.getByLabel('Contraseña');
    await expect(password).toHaveAttribute('type', 'password');
    await page.getByRole('button', { name: 'Mostrar' }).click();
    await expect(password).toHaveAttribute('type', 'text');
    await page.getByRole('button', { name: 'Ocultar' }).click();
    await expect(password).toHaveAttribute('type', 'password');
  });
});
