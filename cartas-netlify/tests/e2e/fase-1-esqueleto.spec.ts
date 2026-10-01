import { expect, type Page, test } from '@playwright/test';

async function scrollsSideways(page: Page): Promise<boolean> {
  return page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
}

test.describe('esqueleto de Sirio Cartas', () => {
  test('la raíz lleva a la pantalla de acceso', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/entrar$/);
    await expect(page).toHaveTitle('Entrar · Sirio Cartas');
  });

  test('la pantalla de acceso muestra su formulario y la ayuda', async ({ page }) => {
    await page.goto('/entrar');

    await expect(page.getByRole('heading', { level: 1, name: 'Entra a tu panel' })).toBeVisible();
    await expect(page.getByLabel('Correo')).toHaveAttribute('type', 'email');
    await expect(page.getByLabel('Contraseña')).toHaveAttribute('type', 'password');
    await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible();
    await expect(
      page.getByText('¿Olvidaste tu contraseña? Contacta al administrador de la plataforma.'),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'Crear cuenta' })).toHaveAttribute(
      'href',
      '/registro',
    );
    expect(await scrollsSideways(page)).toBe(false);
  });

  test('el registro pide los cuatro datos del dueño', async ({ page }) => {
    await page.goto('/registro');

    await expect(
      page.getByRole('heading', { level: 1, name: 'Crea la carta digital de tu restaurante' }),
    ).toBeVisible();
    await expect(page.getByLabel('Nombre del restaurante')).toBeVisible();
    await expect(page.getByLabel('Correo')).toBeVisible();
    await expect(page.getByLabel('Contraseña', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Repite la contraseña')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Crear cuenta' })).toBeVisible();
    expect(await scrollsSideways(page)).toBe(false);
  });

  test('los títulos usan Fraunces y el texto Inter', async ({ page }) => {
    await page.goto('/entrar');

    await expect
      .poll(() => page.locator('h1').evaluate((element) => getComputedStyle(element).fontFamily))
      .toMatch(/^Fraunces/);
    await expect
      .poll(() =>
        page.getByText('Correo', { exact: true }).evaluate((element) => getComputedStyle(element).fontFamily),
      )
      .toMatch(/^Inter/);
  });

  test('enviar el acceso nunca pone la contraseña en la dirección', async ({ page }) => {
    await page.goto('/entrar');
    await page.getByLabel('Correo').fill('ana@mail.com');
    await page.getByLabel('Contraseña').fill('Secreta2026');
    await page.getByRole('button', { name: 'Entrar' }).click();

    await expect(page.getByText('Correo o contraseña incorrectos.')).toBeVisible();
    await expect(page).toHaveURL(/\/entrar$/);
  });

  test('una ruta inexistente responde 404 en español', async ({ page }) => {
    const response = await page.goto('/esta-ruta-no-existe/de-verdad');

    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { level: 1, name: 'Esta página no existe' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Ir al inicio' })).toHaveAttribute('href', '/entrar');
  });
});
