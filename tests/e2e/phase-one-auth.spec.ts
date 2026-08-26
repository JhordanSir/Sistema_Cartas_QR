import { expect, test, type APIRequestContext } from '@playwright/test';

import {
  createE2EOwnerFixture,
  type E2EOwnerFixture,
  removeE2EOwnerFixture,
} from '../../apps/api/src/testing/e2e-owner.fixture.js';

const apiUrl = process.env.E2E_API_URL ?? 'http://127.0.0.1:3000/api';

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

async function login(
  request: APIRequestContext,
  email: string,
  password: string,
  role: 'ADMIN' | 'OWNER',
): Promise<{ response: Awaited<ReturnType<APIRequestContext['post']>>; tokens?: TokenPair }> {
  const response = await request.post(`${apiUrl}/auth/login`, {
    data: { email, password, role },
  });
  if (!response.ok()) {
    return { response };
  }
  return { response, tokens: (await response.json()) as TokenPair };
}

test.describe.serial('autenticacion y autorizacion de la Fase 1', () => {
  let owner: E2EOwnerFixture;
  let adminTokens: TokenPair;

  test.beforeAll(async ({ request }) => {
    owner = await createE2EOwnerFixture();
    const adminEmail = process.env.INITIAL_ADMIN_EMAIL;
    const adminPassword = process.env.INITIAL_ADMIN_PASSWORD;
    if (!adminEmail || !adminPassword) {
      throw new Error('Initial administrator credentials are required for E2E');
    }
    const adminLogin = await login(
      request,
      adminEmail,
      adminPassword,
      'ADMIN',
    );
    expect(adminLogin.response.ok()).toBe(true);
    if (!adminLogin.tokens) {
      throw new Error('Administrator login did not return tokens');
    }
    adminTokens = adminLogin.tokens;
  });

  test.afterAll(async ({ request }) => {
    if (adminTokens?.refreshToken) {
      await request.post(`${apiUrl}/auth/logout`, {
        data: { refreshToken: adminTokens.refreshToken },
      });
    }
    if (owner?.id) {
      await removeE2EOwnerFixture(owner.id);
    }
  });

  test('permite login de administrador y dueño, pero no credenciales inválidas', async ({
    request,
  }) => {
    const ownerLogin = await login(
      request,
      owner.email,
      owner.password,
      'OWNER',
    );
    expect(ownerLogin.response.ok()).toBe(true);
    expect(ownerLogin.tokens?.accessToken).toBeTruthy();
    expect(ownerLogin.tokens?.refreshToken).toBeTruthy();

    const invalidLogin = await login(
      request,
      owner.email,
      'incorrect-password',
      'OWNER',
    );
    expect(invalidLogin.response.status()).toBe(401);
  });

  test('deniega endpoints del rol contrario', async ({ request }) => {
    const ownerLogin = await login(
      request,
      owner.email,
      owner.password,
      'OWNER',
    );
    if (!ownerLogin.tokens) {
      throw new Error('Owner login did not return tokens');
    }

    const adminOnOwnerRoute = await request.post(`${apiUrl}/auth/password`, {
      data: {
        currentPassword: 'irrelevant-password',
        newPassword: 'another-password',
      },
      headers: { Authorization: `Bearer ${adminTokens.accessToken}` },
    });
    expect(adminOnOwnerRoute.status()).toBe(403);

    const ownerOnAdminRoute = await request.post(
      `${apiUrl}/auth/admin/owners/${owner.id}/reset-password`,
      {
        data: { newPassword: 'another-password' },
        headers: {
          Authorization: `Bearer ${ownerLogin.tokens.accessToken}`,
        },
      },
    );
    expect(ownerOnAdminRoute.status()).toBe(403);
  });

  test('rota refresh tokens y revoca la sesión si se reutiliza uno anterior', async ({
    request,
  }) => {
    const ownerLogin = await login(
      request,
      owner.email,
      owner.password,
      'OWNER',
    );
    if (!ownerLogin.tokens) {
      throw new Error('Owner login did not return tokens');
    }

    const refreshed = await request.post(`${apiUrl}/auth/refresh`, {
      data: { refreshToken: ownerLogin.tokens.refreshToken },
    });
    expect(refreshed.ok()).toBe(true);
    const rotatedTokens = (await refreshed.json()) as TokenPair;
    expect(rotatedTokens.refreshToken).not.toBe(ownerLogin.tokens.refreshToken);

    const replay = await request.post(`${apiUrl}/auth/refresh`, {
      data: { refreshToken: ownerLogin.tokens.refreshToken },
    });
    expect(replay.status()).toBe(401);

    const revokedAccess = await request.get(`${apiUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${rotatedTokens.accessToken}` },
    });
    expect(revokedAccess.status()).toBe(401);
  });

  test('el dueño cambia su contraseña actual y se revocan sus sesiones', async ({
    request,
  }) => {
    const ownerLogin = await login(
      request,
      owner.email,
      owner.password,
      'OWNER',
    );
    if (!ownerLogin.tokens) {
      throw new Error('Owner login did not return tokens');
    }
    const newPassword = 'OwnerPass-2';

    const changed = await request.post(`${apiUrl}/auth/password`, {
      data: {
        currentPassword: owner.password,
        newPassword,
      },
      headers: { Authorization: `Bearer ${ownerLogin.tokens.accessToken}` },
    });
    expect(changed.status()).toBe(204);

    const revokedAccess = await request.get(`${apiUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${ownerLogin.tokens.accessToken}` },
    });
    expect(revokedAccess.status()).toBe(401);
    expect(
      (await login(request, owner.email, owner.password, 'OWNER')).response.status(),
    ).toBe(401);
    expect(
      (await login(request, owner.email, newPassword, 'OWNER')).response.ok(),
    ).toBe(true);
    owner.password = newPassword;
  });

  test('el administrador resetea la contraseña del dueño', async ({ request }) => {
    const ownerLogin = await login(
      request,
      owner.email,
      owner.password,
      'OWNER',
    );
    if (!ownerLogin.tokens) {
      throw new Error('Owner login did not return tokens');
    }
    const resetPassword = 'OwnerPass-3';

    const reset = await request.post(
      `${apiUrl}/auth/admin/owners/${owner.id}/reset-password`,
      {
        data: { newPassword: resetPassword },
        headers: { Authorization: `Bearer ${adminTokens.accessToken}` },
      },
    );
    expect(reset.status()).toBe(204);

    const oldRefresh = await request.post(`${apiUrl}/auth/refresh`, {
      data: { refreshToken: ownerLogin.tokens.refreshToken },
    });
    expect(oldRefresh.status()).toBe(401);
    expect(
      (await login(request, owner.email, owner.password, 'OWNER')).response.status(),
    ).toBe(401);
    expect(
      (await login(request, owner.email, resetPassword, 'OWNER')).response.ok(),
    ).toBe(true);
    owner.password = resetPassword;
  });

  test('logout revoca el access token asociado a la sesión', async ({ request }) => {
    const ownerLogin = await login(
      request,
      owner.email,
      owner.password,
      'OWNER',
    );
    if (!ownerLogin.tokens) {
      throw new Error('Owner login did not return tokens');
    }

    const logout = await request.post(`${apiUrl}/auth/logout`, {
      data: { refreshToken: ownerLogin.tokens.refreshToken },
    });
    expect(logout.status()).toBe(204);

    const me = await request.get(`${apiUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${ownerLogin.tokens.accessToken}` },
    });
    expect(me.status()).toBe(401);
  });
});
