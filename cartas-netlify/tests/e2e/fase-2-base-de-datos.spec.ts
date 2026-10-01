import { expect, test } from '@playwright/test';

test.describe('base de datos', () => {
  test('la API de salud confirma que la base de datos responde', async ({ request }) => {
    const response = await request.get('/api/salud');

    expect(response.status()).toBe(200);
    expect(response.headers()['cache-control']).toBe('no-store');
    expect(await response.json()).toEqual({ ok: true, database: 'up' });
  });
});
