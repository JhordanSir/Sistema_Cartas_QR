import { expect, test, type Page } from '@playwright/test';

import { createProductViaApi, createSectionViaApi, currentSlug, publishViaApi } from './support/carta';
import { newOwner, registerOwnerViaApi } from './support/cuentas';

async function chooseTemplate(page: Page, label: string): Promise<void> {
  await page.goto('/panel/carta');
  const template = page.getByRole('radio', { name: new RegExp(`^${label}`) });
  await template.check();
  await expect(template).toBeChecked();
  await expect(page.getByText('Tienes cambios por publicar.')).toBeVisible();
}

async function publicLook(page: Page, slug: string): Promise<{ background: string; font: string }> {
  await page.goto(`/${slug}`);
  const heading = page.getByRole('heading', { level: 1 });
  await expect(heading).toBeVisible();
  return heading.evaluate((element) => {
    const wrapper = element.closest('header')?.parentElement;
    return {
      background: wrapper ? getComputedStyle(wrapper).backgroundColor : '',
      font: getComputedStyle(element).fontFamily,
    };
  });
}

test.describe('plantillas', () => {
  test.beforeEach(async ({ baseURL, page }) => {
    await registerOwnerViaApi(page.request, newOwner('Cevichería Luna'), baseURL);
    const sectionId = await createSectionViaApi(page.request, 'Entradas', baseURL);
    await createProductViaApi(page.request, { basePrice: '28', categoryId: sectionId, name: 'Ceviche' }, baseURL);
    await publishViaApi(page.request, baseURL);
  });

  test('Premium marca cambios por publicar y, al publicar, la carta queda oscura con Playfair Display', async ({
    baseURL,
    page,
  }) => {
    const slug = await currentSlug(page.request);
    await chooseTemplate(page, 'Premium');
    await expect(page.getByText('Elegida')).toHaveCount(1);

    // Not published yet: diners still see the original look.
    expect(await publicLook(page, slug)).toMatchObject({ background: 'rgb(255, 255, 255)' });

    await publishViaApi(page.request, baseURL);
    const look = await publicLook(page, slug);
    expect(look.background).toBe('rgb(29, 24, 21)');
    expect(look.font).toMatch(/Playfair Display/);
  });

  test('Tradicional y Casual cambian colores y letra, y Original vuelve al estilo por defecto', async ({
    baseURL,
    page,
  }) => {
    const slug = await currentSlug(page.request);
    for (const [label, background, font] of [
      ['Tradicional', 'rgb(255, 248, 237)', /Libre Baskerville/],
      ['Casual', 'rgb(241, 247, 240)', /Nunito/],
      ['Original detectado', 'rgb(255, 255, 255)', /Inter/],
    ] as const) {
      if (label === 'Original detectado') {
        await chooseTemplate(page, 'Premium');
        await publishViaApi(page.request, baseURL);
        await page.goto('/panel/carta');
        await page.getByRole('radio', { name: /^Original detectado/ }).check();
        await expect(page.getByText('Tienes cambios por publicar.')).toBeVisible();
      } else {
        await chooseTemplate(page, label);
      }
      await publishViaApi(page.request, baseURL);
      const look = await publicLook(page, slug);
      expect(look.background).toBe(background);
      expect(look.font).toMatch(font);
    }
  });

  test('el panel no cambia de aspecto con la plantilla', async ({ page }) => {
    await chooseTemplate(page, 'Premium');
    const panel = await page.getByRole('heading', { level: 1, name: 'Carta' }).evaluate((element) => ({
      background: getComputedStyle(document.querySelector('main')?.parentElement ?? document.body).backgroundColor,
      font: getComputedStyle(element).fontFamily,
    }));
    expect(panel.background).toBe('rgb(251, 247, 240)');
    expect(panel.font).toMatch(/Fraunces/);
  });

  test('las letras de las cartas solo se cargan en la carta pública y en la vista previa', async ({ page }) => {
    const menuFamilies = async () =>
      page.evaluate(async () => {
        await document.fonts.ready;
        return [...document.fonts].map((face) => face.family.replaceAll('"', '')).filter((family) =>
          /Playfair Display|Libre Baskerville|Nunito/.test(family),
        );
      });

    for (const path of ['/panel', '/panel/qr', '/panel/cuenta']) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      expect(await menuFamilies()).toEqual([]);
    }

    await page.goto('/panel/carta');
    await expect(page.getByRole('heading', { name: 'Plantilla' })).toBeVisible();
    expect((await menuFamilies()).length).toBeGreaterThan(0);
  });

  test('la API valida la plantilla', async ({ baseURL, page }) => {
    const response = await page.request.put('/api/carta/plantilla', {
      data: { template: 'NEON' },
      headers: { Origin: new URL(baseURL ?? 'http://localhost:8888').origin },
    });
    expect(response.status()).toBe(400);
  });
});
