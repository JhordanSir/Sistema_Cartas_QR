import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { expect, test as setup } from '@playwright/test';

import { ADMIN } from './support/cuentas';

const appRoot = fileURLToPath(new URL('../..', import.meta.url));
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

// Runs once per `pnpm test:e2e`, after Playwright has `netlify dev` up: every
// run starts from an empty LOCAL database with the current migrations, and the
// first account is the test administrator, created through the real form.

setup('reinicia la base de datos local', async ({ baseURL, request }) => {
  if (!baseURL || !LOCAL_HOSTS.has(new URL(baseURL).hostname)) {
    throw new Error(`The E2E suite resets the local database; refusing to run against ${baseURL}.`);
  }

  execFileSync(process.execPath, ['scripts/local-db.ts', 'reset'], {
    cwd: appRoot,
    stdio: 'inherit',
  });

  const response = await request.get('/api/salud');
  expect(response.status()).toBe(200);
});

setup('la primera cuenta creada en /registro es la de administrador', async ({ page }) => {
  await page.goto('/registro');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Crear la cuenta de administrador' }),
  ).toBeVisible();
  await expect(page.getByText('Esta será la única cuenta con acceso al backoffice.')).toBeVisible();
  await expect(page.getByLabel('Nombre del restaurante')).toHaveCount(0);

  await page.getByLabel('Correo').fill(ADMIN.email);
  await page.getByLabel('Contraseña', { exact: true }).fill(ADMIN.password);
  await page.getByLabel('Repite la contraseña').fill(ADMIN.password);
  await page.getByRole('button', { name: 'Crear cuenta' }).click();

  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Backoffice' })).toBeVisible();
});
