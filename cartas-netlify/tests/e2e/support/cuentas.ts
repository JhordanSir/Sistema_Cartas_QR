import { expect, type APIRequestContext, type Page } from '@playwright/test';

/**
 * The Next.js server behind `netlify dev`. Only for checking exact API status
 * codes: the netlify dev proxy turns every 403 into a 404 (see the origin test).
 */
export const NEXT_DIRECT_URL = process.env.E2E_NEXT_URL ?? 'http://localhost:3000';

/** Local test administrator, created by the `base-local` setup on every run. */
export const ADMIN = { email: 'admin@sirio.test', password: 'AdminSirio2026' } as const;

export const OWNER_PASSWORD = 'Ñandú2024';

/** A fresh address per test, so tests never depend on each other's data. */
export function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@sirio.test`;
}

export type Owner = { email: string; password: string; restaurantName: string };

export function newOwner(restaurantName = 'Cevichería Luna'): Owner {
  return { email: uniqueEmail('dueno'), password: OWNER_PASSWORD, restaurantName };
}

function originOf(baseURL: string | undefined): string {
  return new URL(baseURL ?? 'http://localhost:8888').origin;
}

/**
 * Registers an owner through the API. With `page.request`, the session cookie
 * lands in the page's context, so the page is signed in afterwards.
 */
export async function registerOwnerViaApi(
  request: APIRequestContext,
  owner: Owner,
  baseURL: string | undefined,
): Promise<void> {
  const response = await request.post('/api/registro', {
    data: {
      email: owner.email,
      mode: 'owner',
      password: owner.password,
      passwordConfirmation: owner.password,
      restaurantName: owner.restaurantName,
    },
    headers: { Origin: originOf(baseURL) },
  });
  expect(response.status()).toBe(201);
}

export async function signIn(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/entrar');
  await page.getByLabel('Correo').fill(email);
  await page.getByLabel('Contraseña').fill(password);
  await page.getByRole('button', { name: 'Entrar' }).click();
}
