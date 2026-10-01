import { expect, test } from '@playwright/test';

import {
  ADMIN,
  NEXT_DIRECT_URL,
  newOwner,
  OWNER_PASSWORD,
  registerOwnerViaApi,
  signIn,
  uniqueEmail,
} from './support/cuentas';

const DAY_SECONDS = 24 * 60 * 60;

test.describe('registro e inicio de sesión', () => {
  test('un dueño se registra y llega a su panel', async ({ page }) => {
    await page.goto('/registro');
    await page.getByLabel('Nombre del restaurante').fill('Cevichería Luna');
    await page.getByLabel('Correo').fill(uniqueEmail('registro'));
    await page.getByLabel('Contraseña', { exact: true }).fill(OWNER_PASSWORD);
    await page.getByLabel('Repite la contraseña').fill(OWNER_PASSWORD);
    await page.getByRole('button', { name: 'Crear cuenta' }).click();

    await expect(page).toHaveURL(/\/panel$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Cevichería Luna' })).toBeVisible();
    const navigation = page.getByRole('navigation', { name: 'Principal' });
    await expect(navigation.getByRole('link', { name: 'Perfil' })).toHaveAttribute('aria-current', 'page');
    await expect(navigation.getByRole('link', { name: 'Cuenta' })).toBeVisible();
    await expect(navigation.getByRole('button', { name: 'Salir' })).toBeVisible();
  });

  test('el registro valida al enviar y quita cada error al corregirlo', async ({ page }) => {
    await page.goto('/registro');
    await page.getByLabel('Nombre del restaurante').fill('Cevichería Luna');
    await page.getByLabel('Correo').fill('hola@turestaurante');
    await page.getByLabel('Contraseña', { exact: true }).fill('clave');
    await page.getByLabel('Repite la contraseña').fill('otra');
    await page.getByRole('button', { name: 'Crear cuenta' }).click();

    const emailError = page.getByText('Escribe un correo válido, por ejemplo nombre@dominio.com.');
    const passwordError = page.getByText(
      'La contraseña debe tener entre 8 y 128 caracteres, con una mayúscula, una minúscula y un número.',
    );
    const mismatchError = page.getByText('Las contraseñas no coinciden.');
    await expect(emailError).toBeVisible();
    await expect(passwordError).toBeVisible();
    await expect(mismatchError).toBeVisible();
    await expect(page.getByLabel('Correo')).toBeFocused();
    await expect(page.getByLabel('Correo')).toHaveAttribute('aria-invalid', 'true');
    await expect(page).toHaveURL(/\/registro$/);

    await page.getByLabel('Correo').fill(uniqueEmail('corregido'));
    await expect(emailError).toHaveCount(0);
    await expect(passwordError).toBeVisible();

    await page.getByLabel('Contraseña', { exact: true }).fill(OWNER_PASSWORD);
    await page.getByLabel('Repite la contraseña').fill(OWNER_PASSWORD);
    await expect(passwordError).toHaveCount(0);
    await expect(mismatchError).toHaveCount(0);
  });

  test('un correo ya registrado muestra su aviso', async ({ baseURL, page, playwright }) => {
    const owner = newOwner('Pollería El Ñandú');
    const otherClient = await playwright.request.newContext({ baseURL });
    await registerOwnerViaApi(otherClient, owner, baseURL);
    await otherClient.dispose();

    await page.goto('/registro');
    await page.getByLabel('Nombre del restaurante').fill('Otra Pollería');
    await page.getByLabel('Correo').fill(owner.email.toUpperCase());
    await page.getByLabel('Contraseña', { exact: true }).fill(OWNER_PASSWORD);
    await page.getByLabel('Repite la contraseña').fill(OWNER_PASSWORD);
    await page.getByRole('button', { name: 'Crear cuenta' }).click();

    await expect(page.getByText('Ya existe una cuenta con ese correo.')).toBeVisible();
    await expect(page).toHaveURL(/\/registro$/);
  });

  test('una contraseña incorrecta o un correo desconocido muestran el mismo error', async ({ page }) => {
    await signIn(page, ADMIN.email, 'Incorrecta2026');
    await expect(page.getByText('Correo o contraseña incorrectos.')).toBeVisible();

    await signIn(page, uniqueEmail('nadie'), 'Incorrecta2026');
    await expect(page.getByText('Correo o contraseña incorrectos.')).toBeVisible();
    await expect(page).toHaveURL(/\/entrar$/);
  });

  test('el administrador entra al backoffice', async ({ page }) => {
    await signIn(page, ADMIN.email, ADMIN.password);

    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Backoffice' })).toBeVisible();
  });

  test('la cookie de sesión es HttpOnly, Secure, SameSite=Lax y dura 7 días', async ({
    baseURL,
    context,
    page,
  }) => {
    await registerOwnerViaApi(page.request, newOwner(), baseURL);

    const cookie = (await context.cookies()).find(({ name }) => name === 'sirio_session');
    expect(cookie).toMatchObject({ httpOnly: true, path: '/', sameSite: 'Lax', secure: true });
    const secondsLeft = (cookie?.expires ?? 0) - Date.now() / 1000;
    expect(secondsLeft).toBeGreaterThan(7 * DAY_SECONDS - 120);
    expect(secondsLeft).toBeLessThanOrEqual(7 * DAY_SECONDS);
  });
});

test.describe('acceso a las zonas privadas', () => {
  test('sin sesión, el panel y el backoffice llevan a /entrar', async ({ page }) => {
    for (const path of ['/panel', '/panel/cuenta', '/admin', '/admin/cuenta']) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/entrar$/);
    }
  });

  test('cada rol se queda en su zona', async ({ baseURL, browser }) => {
    const ownerContext = await browser.newContext();
    const ownerPage = await ownerContext.newPage();
    await registerOwnerViaApi(ownerPage.request, newOwner(), baseURL);
    await ownerPage.goto('/admin');
    await expect(ownerPage).toHaveURL(/\/panel$/);
    await ownerContext.close();

    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    await signIn(adminPage, ADMIN.email, ADMIN.password);
    await expect(adminPage).toHaveURL(/\/admin$/);
    await adminPage.goto('/panel');
    await expect(adminPage).toHaveURL(/\/admin$/);
    await adminContext.close();
  });

  test('con sesión, la raíz y las pantallas de acceso llevan al panel', async ({ baseURL, page }) => {
    await registerOwnerViaApi(page.request, newOwner(), baseURL);

    for (const path of ['/', '/entrar', '/registro']) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/panel$/);
    }
  });

  test('«Salir» cierra la sesión', async ({ baseURL, page }) => {
    await registerOwnerViaApi(page.request, newOwner(), baseURL);
    await page.goto('/panel');

    await page.getByRole('button', { name: 'Salir' }).click();
    await expect(page).toHaveURL(/\/entrar$/);
    await page.goto('/panel');
    await expect(page).toHaveURL(/\/entrar$/);
  });

  test('las APIs rechazan peticiones de otro origen', async ({ playwright }) => {
    // Straight to Next: `netlify dev` imitates the CDN and retries every 403
    // as a static file (.html, /index.html…), so through it a 403 ends as 404.
    const next = await playwright.request.newContext({ baseURL: NEXT_DIRECT_URL });
    const attempts: Record<string, string>[] = [{ Origin: 'https://evil.example' }, {}];
    for (const headers of attempts) {
      const response = await next.post('/api/sesion', {
        data: { email: ADMIN.email, password: ADMIN.password },
        headers,
      });
      expect(response.status()).toBe(403);
      expect(await response.json()).toMatchObject({ code: 'INVALID_ORIGIN' });
      expect(response.headers()['set-cookie']).toBeUndefined();
    }
    await next.dispose();
  });
});

test.describe('cambio de contraseña', () => {
  test('la contraseña nueva reemplaza a la anterior y cierra las otras sesiones', async ({
    baseURL,
    browser,
  }) => {
    const owner = newOwner();
    const newPassword = 'Lúcuma2027';

    const mainContext = await browser.newContext();
    const mainPage = await mainContext.newPage();
    await registerOwnerViaApi(mainPage.request, owner, baseURL);

    const otherContext = await browser.newContext();
    const otherPage = await otherContext.newPage();
    await signIn(otherPage, owner.email, owner.password);
    await expect(otherPage).toHaveURL(/\/panel$/);

    await mainPage.goto('/panel/cuenta');
    await mainPage.getByLabel('Contraseña actual', { exact: true }).fill(owner.password);
    await mainPage.getByLabel('Nueva contraseña', { exact: true }).fill(newPassword);
    await mainPage.getByLabel('Repite la nueva contraseña').fill(newPassword);
    await mainPage.getByRole('button', { name: 'Cambiar contraseña' }).click();
    await expect(mainPage.getByText('Contraseña actualizada. Cerramos tus otras sesiones.')).toBeVisible();

    // The session that changed it stays; the other one is gone.
    await mainPage.goto('/panel');
    await expect(mainPage).toHaveURL(/\/panel$/);
    await otherPage.goto('/panel');
    await expect(otherPage).toHaveURL(/\/entrar$/);

    await signIn(otherPage, owner.email, owner.password);
    await expect(otherPage.getByText('Correo o contraseña incorrectos.')).toBeVisible();
    await signIn(otherPage, owner.email, newPassword);
    await expect(otherPage).toHaveURL(/\/panel$/);

    await mainContext.close();
    await otherContext.close();
  });

  test('una contraseña actual equivocada no cambia nada', async ({ baseURL, page }) => {
    const owner = newOwner();
    await registerOwnerViaApi(page.request, owner, baseURL);

    await page.goto('/panel/cuenta');
    await page.getByLabel('Contraseña actual', { exact: true }).fill('Equivocada2026');
    await page.getByLabel('Nueva contraseña', { exact: true }).fill('Lúcuma2027');
    await page.getByLabel('Repite la nueva contraseña').fill('Lúcuma2027');
    await page.getByRole('button', { name: 'Cambiar contraseña' }).click();

    await expect(page.getByText('La contraseña actual no es correcta.')).toBeVisible();
    await expect(page.getByLabel('Contraseña actual', { exact: true })).toBeFocused();
  });
});

test.describe('barra superior', () => {
  test('en pantallas angostas los enlaces se pliegan tras «Menú»', async ({ baseURL, page }) => {
    await page.setViewportSize({ height: 844, width: 390 });
    await registerOwnerViaApi(page.request, newOwner(), baseURL);
    await page.goto('/panel');

    const menu = page.getByRole('button', { name: 'Menú' });
    const accountLink = page.getByRole('link', { name: 'Cuenta' });
    await expect(menu).toHaveAttribute('aria-expanded', 'false');
    await expect(accountLink).toBeHidden();

    await menu.click();
    await expect(menu).toHaveAttribute('aria-expanded', 'true');
    await expect(accountLink).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(accountLink).toBeHidden();
    await expect(menu).toBeFocused();

    await menu.click();
    await accountLink.click();
    await expect(page).toHaveURL(/\/panel\/cuenta$/);
    await expect(accountLink).toBeHidden();
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)).toBe(
      false,
    );
  });
});
