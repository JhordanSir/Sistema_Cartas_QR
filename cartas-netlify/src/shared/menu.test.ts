import { describe, expect, it } from 'vitest';

import {
  formatPrice,
  MENU_MESSAGES,
  moveItem,
  normalizePrice,
  normalizeProduct,
  parseMenuDraft,
  sortOrders,
  validateProductForm,
  validateSectionName,
} from './menu';

describe('normalizePrice', () => {
  it.each([
    ['18.5', '18.50'],
    ['18', '18.00'],
    ['0', '0.00'],
    ['007.1', '7.10'],
    [' 28.00 ', '28.00'],
    ['99999999.99', '99999999.99'],
  ])('«%s» → «%s»', (value, expected) => {
    expect(normalizePrice(value)).toBe(expected);
  });

  it.each(['abc', '-1', '18,50', '18.505', '.5', '100000000', 'S/ 18', ''])('rechaza «%s»', (value) => {
    expect(normalizePrice(value)).toBeNull();
  });
});

describe('formatPrice', () => {
  it('muestra soles con dos decimales', () => {
    expect(formatPrice('18.50').replace(/\s/g, ' ')).toBe('S/ 18.50');
    expect(formatPrice('1234.5').replace(/\s/g, ' ')).toBe('S/ 1,234.50');
  });
});

describe('validateSectionName', () => {
  it('acepta de 1 a 160 caracteres', () => {
    expect(validateSectionName('Entradas')).toBeNull();
    expect(validateSectionName('x'.repeat(160))).toBeNull();
  });

  it('rechaza un nombre vacío o demasiado largo', () => {
    expect(validateSectionName('   ')).toBe(MENU_MESSAGES.sectionName);
    expect(validateSectionName('x'.repeat(161))).toBe(MENU_MESSAGES.sectionName);
  });
});

describe('validateProductForm y normalizeProduct', () => {
  it('acepta un producto sin descripción', () => {
    expect(validateProductForm({ basePrice: '28', description: '', name: 'Ceviche' })).toEqual({});
  });

  it('marca nombre, descripción y precio inválidos', () => {
    expect(
      validateProductForm({ basePrice: 'abc', description: 'x'.repeat(2001), name: ' ' }),
    ).toEqual({
      basePrice: MENU_MESSAGES.price,
      description: MENU_MESSAGES.description,
      name: MENU_MESSAGES.productName,
    });
  });

  it('guarda null en una descripción vacía y el precio con dos decimales', () => {
    expect(normalizeProduct({ basePrice: '18.5', description: '   ', name: '  Ceviche   mixto ' })).toEqual({
      basePrice: '18.50',
      description: null,
      name: 'Ceviche mixto',
    });
  });
});

describe('moveItem', () => {
  const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

  it('sube y baja un elemento un lugar', () => {
    expect(moveItem(items, 'b', 'up')?.map(({ id }) => id)).toEqual(['b', 'a', 'c']);
    expect(moveItem(items, 'b', 'down')?.map(({ id }) => id)).toEqual(['a', 'c', 'b']);
  });

  it('en los extremos no hace nada', () => {
    expect(moveItem(items, 'a', 'up')).toBeNull();
    expect(moveItem(items, 'c', 'down')).toBeNull();
    expect(moveItem(items, 'z', 'up')).toBeNull();
  });

  it('no modifica la lista original', () => {
    moveItem(items, 'c', 'up');
    expect(items.map(({ id }) => id)).toEqual(['a', 'b', 'c']);
  });
});

describe('sortOrders', () => {
  it('renumera desde 0 en el orden dado', () => {
    expect(sortOrders([{ id: 'c' }, { id: 'a' }])).toEqual([
      { id: 'c', sortOrder: 0 },
      { id: 'a', sortOrder: 1 },
    ]);
  });
});

describe('parseMenuDraft', () => {
  const draft = {
    categories: [
      {
        id: 'c1',
        layout: 'LIST',
        name: 'Entradas',
        products: [
          {
            basePrice: '28.00',
            description: null,
            id: 'p1',
            imageUrl: null,
            isAvailable: true,
            name: 'Ceviche',
          },
        ],
      },
    ],
    digitizationInProgress: false,
  };

  it('acepta la respuesta de la API', () => {
    expect(parseMenuDraft({ draft })).toEqual(draft);
  });

  it('rechaza formas inesperadas', () => {
    expect(parseMenuDraft({})).toBeNull();
    expect(parseMenuDraft({ draft: { ...draft, digitizationInProgress: 'no' } })).toBeNull();
    expect(
      parseMenuDraft({ draft: { ...draft, categories: [{ ...draft.categories[0], layout: 'GRID' }] } }),
    ).toBeNull();
  });
});
