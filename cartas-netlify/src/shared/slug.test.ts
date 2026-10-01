import { describe, expect, it, vi } from 'vitest';

import {
  EmptySlugError,
  isReservedSlug,
  normalizeSlug,
  resolveUniqueSlug,
  SLUG_BASE_MAX_LENGTH,
} from './slug';

const nothingTaken = async () => false;

describe('normalizeSlug', () => {
  it.each([
    ['Cevichería Luna', 'cevicheria-luna'],
    ['¡¡Hola!!', 'hola'],
    ['  Pollería   El Ñandú  ', 'polleria-el-nandu'],
    ['Café & Té 24/7', 'cafe-te-24-7'],
  ])('convierte «%s» en «%s»', (name, slug) => {
    expect(normalizeSlug(name)).toBe(slug);
  });
});

describe('isReservedSlug', () => {
  it('reconoce las rutas de la app aunque lleven mayúsculas o tildes', () => {
    expect(isReservedSlug('admin')).toBe(true);
    expect(isReservedSlug('Panel')).toBe(true);
    expect(isReservedSlug('Regístro')).toBe(true);
    expect(isReservedSlug('cevicheria-luna')).toBe(false);
  });
});

describe('resolveUniqueSlug', () => {
  it('usa el nombre normalizado cuando está libre', async () => {
    await expect(resolveUniqueSlug('Cevichería Luna', nothingTaken)).resolves.toBe(
      'cevicheria-luna',
    );
  });

  it('añade un sufijo a un nombre reservado', async () => {
    await expect(resolveUniqueSlug('admin', nothingTaken)).resolves.toBe('admin-2');
  });

  it('salta los slugs ya ocupados en orden', async () => {
    const taken = new Set(['luna', 'luna-2']);
    const slugExists = vi.fn(async (candidate: string) => taken.has(candidate));

    await expect(resolveUniqueSlug('Luna', slugExists)).resolves.toBe('luna-3');
    expect(slugExists.mock.calls.map(([candidate]) => candidate)).toEqual([
      'luna',
      'luna-2',
      'luna-3',
    ]);
  });

  it('rechaza un nombre sin letras ni números', async () => {
    await expect(resolveUniqueSlug('---', nothingTaken)).rejects.toBeInstanceOf(EmptySlugError);
  });

  it('recorta el slug para que quepa con su sufijo en 160 caracteres', async () => {
    // U+FDFA se descompone en 18 caracteres: 160 de ellos superarían la columna.
    const slug = await resolveUniqueSlug('ﷺ'.repeat(160), nothingTaken);

    expect([...slug].length).toBeLessThanOrEqual(SLUG_BASE_MAX_LENGTH);
    expect(slug).not.toMatch(/^-|-$/);
  });
});
