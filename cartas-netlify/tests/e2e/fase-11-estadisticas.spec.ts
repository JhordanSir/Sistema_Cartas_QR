import { expect, test, type Page } from '@playwright/test';

import { createProductViaApi, createSectionViaApi, publishViaApi } from './support/carta';
import { NEXT_DIRECT_URL, newOwner, registerOwnerViaApi } from './support/cuentas';

const EMPTY = 'Aún no hay visitas. Comparte tu QR para empezar a medir.';
const WEEKDAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

/** The current hour and weekday on a Lima clock (UTC−5, no daylight saving time). */
function limaNow(): { hour: string; weekday: string } {
  const clock = new Date(Date.now() - 5 * 60 * 60 * 1000);
  return { hour: `${String(clock.getUTCHours()).padStart(2, '0')}:00`, weekday: WEEKDAYS[clock.getUTCDay()] ?? '' };
}

function figure(page: Page, label: string) {
  return page.locator('dl > div', { hasText: label }).getByRole('definition');
}

/** Opens the public menu and waits for the visit it sends. */
async function openPublicMenu(page: Page, slug: string): Promise<void> {
  const counted = page.waitForResponse(
    (response) => response.request().method() === 'POST' && response.url().endsWith(`/api/vistas/${slug}`),
  );
  await page.goto(`/${slug}`);
  expect((await counted).status()).toBe(204);
}

test.describe('estadísticas', () => {
  test.beforeEach(async ({ baseURL, page }) => {
    await registerOwnerViaApi(page.request, newOwner('Cevichería Luna'), baseURL);
  });

  test('sin visitas se ve el estado vacío', async ({ page }) => {
    await page.goto('/panel');
    await page.getByRole('link', { name: 'Estadísticas' }).click();

    await expect(page.getByRole('heading', { level: 1, name: 'Estadísticas' })).toBeVisible();
    await expect(page.getByText(EMPTY)).toBeVisible();
    await expect(page.getByRole('link', { name: 'Ver mi código QR' })).toHaveAttribute('href', '/panel/qr');
  });

  test('cada persona cuenta una vez al día, y la hora y el día de hoy (en Lima) tienen datos', async ({
    baseURL,
    page,
    playwright,
  }) => {
    const sectionId = await createSectionViaApi(page.request, 'Entradas', baseURL);
    await createProductViaApi(page.request, { basePrice: '28', categoryId: sectionId, name: 'Ceviche' }, baseURL);
    const slug = await publishViaApi(page.request, baseURL);

    // The same browser twice: one visit.
    await openPublicMenu(page, slug);
    await openPublicMenu(page, slug);

    // Another visitor, as Netlify would report its IP. Straight to Next, which
    // receives the header untouched.
    const other = await playwright.request.newContext();
    for (let visit = 0; visit < 2; visit += 1) {
      const response = await other.post(`${NEXT_DIRECT_URL}/api/vistas/${slug}`, {
        headers: { Origin: new URL(NEXT_DIRECT_URL).origin, 'x-nf-client-connection-ip': '203.0.113.7' },
      });
      expect(response.status()).toBe(204);
    }
    await other.dispose();

    await page.goto('/panel/estadisticas');
    await expect(page.getByText(EMPTY)).toHaveCount(0);
    await expect(figure(page, 'Últimos 7 días')).toHaveText('2');
    await expect(figure(page, 'Últimos 30 días')).toHaveText('2');
    await expect(figure(page, 'Desde el inicio')).toHaveText('2');
    await expect(page.getByText(/^El mayor movimiento llega los .+ a las \d\d:00\.$/)).toBeVisible();

    const { hour, weekday } = limaNow();
    const hours = page.getByRole('region', { name: 'Por hora' });
    await expect(hours.getByText(`${hour}: 2 visitas en total, 2.0 en promedio`)).toBeAttached();
    await expect(page.getByText(`${weekday}: 2 visitas en total, 2.0 en promedio`)).toBeAttached();
  });

  test('las APIs de visitas y estadísticas', async ({ baseURL, page, playwright }) => {
    const anonymous = await playwright.request.newContext();
    const nextOrigin = { Origin: new URL(NEXT_DIRECT_URL).origin };

    // Like every write, a visit must come from our own pages (straight to Next for the exact code).
    expect((await anonymous.post(`${NEXT_DIRECT_URL}/api/vistas/cevicheria-luna`)).status()).toBe(403);
    expect(
      (await anonymous.post(`${NEXT_DIRECT_URL}/api/vistas/cevicheria-luna`, { headers: { Origin: 'https://otro.example' } })).status(),
    ).toBe(403);
    // A menu that does not exist still answers 204: the answer reveals nothing.
    expect(
      (await anonymous.post(`${NEXT_DIRECT_URL}/api/vistas/no-existe-esta-carta`, { headers: nextOrigin })).status(),
    ).toBe(204);

    expect((await anonymous.get(`${baseURL}/api/estadisticas`)).status()).toBe(401);
    await anonymous.dispose();

    const response = await page.request.get('/api/estadisticas');
    expect(response.status()).toBe(200);
    const { statistics } = (await response.json()) as {
      statistics: { allTime: number; hours: unknown[]; peak: unknown; weekdays: unknown[] };
    };
    expect(statistics).toMatchObject({ allTime: 0, last30Days: 0, last7Days: 0, peak: null });
    expect(statistics.hours).toHaveLength(24);
    expect(statistics.weekdays).toHaveLength(7);
  });
});
