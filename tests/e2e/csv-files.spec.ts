import { expect, test, type APIRequestContext } from '@playwright/test';

const directApiUrl = process.env.E2E_DIRECT_API_URL ?? 'http://127.0.0.1:3001/api';
const webUrl = process.env.E2E_WEB_URL ?? 'http://127.0.0.1:3000';

interface CreatedRestaurant {
  id: string;
  slug: string;
}

interface CsvInfo {
  originalName: string;
  sizeBytes: number;
  uploadedAt: string;
}

async function apiLogin(
  request: APIRequestContext,
  email: string,
  password: string,
  role: 'ADMIN' | 'OWNER',
): Promise<string> {
  const response = await request.post(`${directApiUrl}/auth/login`, { data: { email, password, role } });
  expect(response.ok()).toBe(true);
  return ((await response.json()) as { accessToken: string }).accessToken;
}

async function adminToken(request: APIRequestContext): Promise<string> {
  const email = process.env.INITIAL_ADMIN_EMAIL;
  const password = process.env.INITIAL_ADMIN_PASSWORD;
  if (!email || !password) throw new Error('Initial administrator credentials are required for E2E');
  return apiLogin(request, email, password, 'ADMIN');
}

async function createRestaurant(
  request: APIRequestContext,
  email: string,
  password: string,
  name: string,
): Promise<CreatedRestaurant> {
  const created = await request.post(`${directApiUrl}/backoffice/restaurants`, {
    data: { email, initialPassword: password, name },
    headers: { authorization: `Bearer ${await adminToken(request)}` },
  });
  expect(created.ok()).toBe(true);
  return (await created.json()) as CreatedRestaurant;
}

async function deleteRestaurant(request: APIRequestContext, restaurant: CreatedRestaurant): Promise<void> {
  await request.delete(`${directApiUrl}/backoffice/restaurants/${restaurant.id}`, {
    data: { acknowledgePermanentDeletion: true, confirmationText: `ELIMINAR ${restaurant.slug}` },
    headers: { authorization: `Bearer ${await adminToken(request)}` },
  });
}

function csvUpload(name: string, content: string | Buffer, mimeType = 'text/csv') {
  return { file: { buffer: Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf8'), mimeType, name } };
}

test.describe.serial('CSV guardado del restaurante', () => {
  let restaurant: CreatedRestaurant | null = null;
  let ownerEmail = '';
  let ownerToken = '';
  const ownerPassword = 'CsvGuardado-5!';

  test.beforeEach(async ({ request }) => {
    const suffix = `${Date.now()}-${test.info().parallelIndex}`;
    ownerEmail = `csv-${suffix}@example.test`;
    restaurant = await createRestaurant(request, ownerEmail, ownerPassword, `Cevichería CSV ${suffix}`);
    ownerToken = await apiLogin(request, ownerEmail, ownerPassword, 'OWNER');
  });

  test.afterEach(async ({ request }) => {
    if (!restaurant) return;
    await deleteRestaurant(request, restaurant);
    restaurant = null;
  });

  test('la API guarda el CSV, lo devuelve intacto y lo reemplaza con el siguiente', async ({ request }) => {
    const base = `${directApiUrl}/owner/restaurants/${restaurant?.id}/csv`;
    const headers = { authorization: `Bearer ${ownerToken}` };
    const missing = await request.get(base, { headers });
    expect(missing.status()).toBe(404);
    expect(await missing.json()).toMatchObject({ code: 'CSV_FILE_NOT_FOUND' });

    const first = 'nombre;precio\nCeviche clásico;35,00\n';
    const saved = await request.put(base, { headers, multipart: csvUpload('carta de menú.csv', first) });
    expect(saved.status()).toBe(200);
    expect((await saved.json()) as CsvInfo).toMatchObject({
      originalName: 'carta de menú.csv',
      sizeBytes: Buffer.byteLength(first),
    });

    const content = await request.get(`${base}/content`, { headers });
    expect(content.status()).toBe(200);
    expect(content.headers()['content-type']).toBe('text/csv');
    expect(content.headers()['content-length']).toBe(String(Buffer.byteLength(first)));
    expect((await content.body()).toString('utf8')).toBe(first);

    // Windows-1252 bytes travel untouched: the page decides how to read them.
    const latin1 = Buffer.from('nombre;precio\nPiña colada;18\n', 'latin1');
    const replaced = await request.put(base, { headers, multipart: csvUpload('bebidas.csv', latin1) });
    expect(((await replaced.json()) as CsvInfo).originalName).toBe('bebidas.csv');
    expect(((await (await request.get(base, { headers })).json()) as CsvInfo).sizeBytes).toBe(latin1.length);
    expect(Buffer.compare(await (await request.get(`${base}/content`, { headers })).body(), latin1)).toBe(0);
  });

  test('la API rechaza archivos que no son CSV de texto y restaurantes ajenos', async ({ request }) => {
    const base = `${directApiUrl}/owner/restaurants/${restaurant?.id}/csv`;
    const headers = { authorization: `Bearer ${ownerToken}` };
    const png = await request.put(base, { headers, multipart: csvUpload('foto.png', 'a,b\n', 'image/png') });
    expect(png.status()).toBe(400);
    expect(await png.json()).toMatchObject({ code: 'CSV_FILE_INVALID' });
    const binary = await request.put(base, { headers, multipart: csvUpload('raro.csv', Buffer.from([97, 0, 98])) });
    expect(binary.status()).toBe(400);
    expect(await binary.json()).toMatchObject({ code: 'CSV_FILE_INVALID' });

    const suffix = `${Date.now()}-ajeno`;
    const foreignEmail = `csv-${suffix}@example.test`;
    const foreign = await createRestaurant(request, foreignEmail, ownerPassword, `Ajeno CSV ${suffix}`);
    try {
      const foreignToken = await apiLogin(request, foreignEmail, ownerPassword, 'OWNER');
      const response = await request.put(base, {
        headers: { authorization: `Bearer ${foreignToken}` },
        multipart: csvUpload('ajeno.csv', 'a,b\n'),
      });
      expect(response.status()).toBe(403);
    } finally {
      await deleteRestaurant(request, foreign);
    }
  });

  test('el BFF limita el tamaño y entrega el CSV guardado por partes', async ({ request }) => {
    const login = await request.post(`${webUrl}/api/session/login`, {
      data: { email: ownerEmail, password: ownerPassword, role: 'OWNER' },
      headers: { origin: webUrl },
    });
    expect(login.ok()).toBe(true);
    const base = `${webUrl}/api/owner/restaurants/${restaurant?.id}/csv`;

    const tooLarge = await request.put(base, {
      headers: { origin: webUrl },
      multipart: csvUpload('enorme.csv', Buffer.alloc(20 * 1024 * 1024 + 1, 'a')),
    });
    expect(tooLarge.status()).toBe(413);
    expect(await tooLarge.json()).toMatchObject({ code: 'CSV_FILE_TOO_LARGE', params: { maxMb: 20 } });

    const csv = 'sku,nombre\n1,Ceviche\n2,Chicha\n';
    const saved = await request.put(base, { headers: { origin: webUrl }, multipart: csvUpload('carta.csv', csv) });
    expect(saved.status()).toBe(200);
    const content = await request.get(`${base}/content`);
    expect(content.status()).toBe(200);
    expect(content.headers()['x-accel-buffering']).toBe('no');
    expect(content.headers()['content-length']).toBe(String(Buffer.byteLength(csv)));
    expect(await content.text()).toBe(csv);
  });
});
