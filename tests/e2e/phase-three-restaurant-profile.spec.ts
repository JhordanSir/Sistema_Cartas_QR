import { expect, test, type APIRequestContext } from '@playwright/test';

const directApiUrl =
  process.env.E2E_DIRECT_API_URL ?? 'http://127.0.0.1:3001/api';
const webUrl = process.env.E2E_WEB_URL ?? 'http://127.0.0.1:3000';

interface CreatedRestaurant {
  id: string;
  slug: string;
}

async function login(
  request: APIRequestContext,
  email: string,
  password: string,
  role: 'ADMIN' | 'OWNER',
): Promise<string> {
  const response = await request.post(`${directApiUrl}/auth/login`, {
    data: { email, password, role },
  });
  expect(response.ok()).toBe(true);
  return ((await response.json()) as { accessToken: string }).accessToken;
}

test.describe.serial('perfil del restaurante de la Fase 3', () => {
  let restaurant: CreatedRestaurant | null = null;
  let ownerEmail = '';
  const ownerPassword = 'OwnerPass-3!';

  test.beforeEach(async ({ request }) => {
    const suffix = `${Date.now()}-${test.info().parallelIndex}`;
    ownerEmail = `phase3-${suffix}@example.test`;
    const adminEmail = process.env.INITIAL_ADMIN_EMAIL;
    const adminPassword = process.env.INITIAL_ADMIN_PASSWORD;
    if (!adminEmail || !adminPassword) {
      throw new Error('Initial administrator credentials are required for E2E');
    }
    const token = await login(request, adminEmail, adminPassword, 'ADMIN');
    const created = await request.post(`${directApiUrl}/backoffice/restaurants`, {
      data: {
        email: ownerEmail,
        initialPassword: ownerPassword,
        name: `Bistró Perfil ${suffix}`,
      },
      headers: { authorization: `Bearer ${token}` },
    });
    expect(created.ok()).toBe(true);
    restaurant = (await created.json()) as CreatedRestaurant;
  });

  test.afterEach(async ({ request }) => {
    if (!restaurant) return;
    const token = await login(
      request,
      process.env.INITIAL_ADMIN_EMAIL ?? '',
      process.env.INITIAL_ADMIN_PASSWORD ?? '',
      'ADMIN',
    );
    await request.delete(
      `${directApiUrl}/backoffice/restaurants/${restaurant.id}`,
      {
        data: {
          acknowledgePermanentDeletion: true,
          confirmationText: `ELIMINAR ${restaurant.slug}`,
        },
        headers: { authorization: `Bearer ${token}` },
      },
    );
    restaurant = null;
  });

  test('el dueño sube su logo y conserva los datos al recargar', { tag: '@movil' }, async ({
    page,
    request,
  }) => {
    if (!restaurant) throw new Error('Restaurant fixture was not created');

    await page.goto(`${webUrl}/admin/login`);
    await expect(
      page.getByRole('heading', { name: 'Tu carta empieza aquí.' }),
    ).toBeVisible();
    await page.getByLabel('Correo del propietario').fill(ownerEmail);
    await page.getByLabel('Contraseña').fill(ownerPassword);
    await page.getByRole('button', { name: 'Entrar a mi restaurante' }).click();
    await expect(page).toHaveURL(`${webUrl}/admin`, { timeout: 20_000 });

    await page.getByLabel('Logo del restaurante').setInputFiles({
      buffer: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
        'base64',
      ),
      mimeType: 'image/png',
      name: 'logo.png',
    });
    await page.getByLabel('Teléfono').fill('(01) 555-0199');
    await page.getByLabel('WhatsApp').fill('+51 999 888 777');
    await page.getByLabel('Dirección').fill('Av. Central 456, Miraflores');
    await page.getByLabel('Instagram').fill('https://instagram.com/bistro.perfil');
    await page.getByRole('button', { name: 'Guardar perfil' }).click();
    await expect(
      page.getByText('Perfil guardado. La identidad de tu restaurante está al día.'),
    ).toBeVisible();

    await page.reload();
    await expect(page.getByLabel('Teléfono')).toHaveValue('(01) 555-0199');
    await expect(page.getByLabel('WhatsApp')).toHaveValue('+51 999 888 777');
    await expect(page.getByLabel('Dirección')).toHaveValue(
      'Av. Central 456, Miraflores',
    );
    await expect(page.getByAltText(/Logo de Bistró Perfil/)).toBeVisible();

    const ownerToken = await login(
      request,
      ownerEmail,
      ownerPassword,
      'OWNER',
    );
    const persisted = await request.get(
      `${directApiUrl}/owner/restaurants/${restaurant.id}/profile`,
      { headers: { authorization: `Bearer ${ownerToken}` } },
    );
    expect(persisted.ok()).toBe(true);
    await expect(persisted.json()).resolves.toMatchObject({
      address: 'Av. Central 456, Miraflores',
      contactPhone: '(01) 555-0199',
      instagramUrl: 'https://instagram.com/bistro.perfil',
      logoPath: `restaurants/${restaurant.id}/profile/logo`,
      whatsapp: '+51 999 888 777',
    });

    const logo = await request.get(
      `${directApiUrl}/owner/restaurants/${restaurant.id}/logo`,
      { headers: { authorization: `Bearer ${ownerToken}` } },
    );
    expect(logo.ok()).toBe(true);
    expect(logo.headers()['content-type']).toContain('image/png');
  });

  test('rechaza archivos que declaran ser imagen pero no lo son', async ({ request }) => {
    if (!restaurant) throw new Error('Restaurant fixture was not created');
    const ownerToken = await login(request, ownerEmail, ownerPassword, 'OWNER');
    const response = await request.patch(
      `${directApiUrl}/owner/restaurants/${restaurant.id}/profile`,
      {
        headers: { authorization: `Bearer ${ownerToken}` },
        multipart: {
          logo: {
            buffer: Buffer.from('<svg><script>alert(1)</script></svg>'),
            mimeType: 'image/png',
            name: 'fake.png',
          },
        },
      },
    );
    expect(response.status()).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      message: 'El logo debe ser un archivo PNG, JPG o WebP válido.',
    });
  });
});
