import { describe, expect, it } from 'vitest';

import {
  canonicalJson,
  hasUnpublishedChanges,
  parseMenuSnapshot,
  phoneLink,
  publicCategories,
  safeExternalUrl,
  sameMenuSnapshot,
  whatsappLink,
  type MenuSnapshot,
  type SnapshotProduct,
} from './menu-snapshot';
import { DEFAULT_MENU_STYLE, parseMenuStyle, resolveMenuStyle } from './menu-style';

function product(overrides: Partial<SnapshotProduct> = {}): SnapshotProduct {
  return {
    basePrice: '28.00',
    description: null,
    extras: [],
    id: 'p1',
    imageKey: null,
    isAvailable: true,
    name: 'Ceviche',
    variants: [],
    ...overrides,
  };
}

function snapshot(products: SnapshotProduct[], extra: Partial<MenuSnapshot> = {}): MenuSnapshot {
  return {
    categories: [{ id: 'c1', layout: 'LIST', name: 'Entradas', products }],
    style: DEFAULT_MENU_STYLE,
    template: 'ORIGINAL',
    ...extra,
  };
}

describe('canonicalJson y sameMenuSnapshot', () => {
  it('no distingue el orden de las claves', () => {
    expect(canonicalJson({ a: 1, b: { c: 2, d: 3 } })).toBe(canonicalJson({ b: { d: 3, c: 2 }, a: 1 }));
    const reordered = JSON.parse(
      '{"template":"ORIGINAL","categories":[{"products":[{"variants":[],"name":"Ceviche","isAvailable":true,"imageKey":null,"id":"p1","extras":[],"description":null,"basePrice":"28.00"}],"name":"Entradas","layout":"LIST","id":"c1"}],"style":{"textColor":"#111827","fontFamily":"Inter","backgroundColor":"#ffffff"}}',
    ) as MenuSnapshot;
    expect(sameMenuSnapshot(snapshot([product()]), reordered)).toBe(true);
  });

  it('distingue valores y el orden de las listas', () => {
    expect(sameMenuSnapshot(snapshot([product()]), snapshot([product({ basePrice: '29.00' })]))).toBe(false);
    const two = [product(), product({ id: 'p2', name: 'Causa' })];
    expect(sameMenuSnapshot(snapshot(two), snapshot([...two].reverse()))).toBe(false);
  });
});

describe('hasUnpublishedChanges', () => {
  it('sin publicar, hay cambios solo si existe un producto disponible', () => {
    expect(hasUnpublishedChanges(snapshot([]), null)).toBe(false);
    expect(hasUnpublishedChanges(snapshot([product({ isAvailable: false })]), null)).toBe(false);
    expect(hasUnpublishedChanges(snapshot([product()]), null)).toBe(true);
  });

  it('publicada, compara con lo publicado', () => {
    expect(hasUnpublishedChanges(snapshot([product()]), snapshot([product()]))).toBe(false);
    expect(hasUnpublishedChanges(snapshot([product({ name: 'Ceviche mixto' })]), snapshot([product()]))).toBe(true);
    expect(hasUnpublishedChanges(snapshot([product()], { template: 'PREMIUM' }), snapshot([product()]))).toBe(true);
  });
});

describe('publicCategories', () => {
  it('quita los productos no disponibles y las secciones que quedan vacías', () => {
    const menu: MenuSnapshot = {
      ...snapshot([]),
      categories: [
        { id: 'c1', layout: 'LIST', name: 'Entradas', products: [product(), product({ id: 'p2', isAvailable: false })] },
        { id: 'c2', layout: 'CARDS', name: 'Postres', products: [product({ id: 'p3', isAvailable: false })] },
        { id: 'c3', layout: 'LIST', name: 'Bebidas', products: [] },
      ],
    };
    expect(publicCategories(menu).map((category) => [category.name, category.products.map(({ id }) => id)])).toEqual([
      ['Entradas', ['p1']],
    ]);
  });
});

describe('parseMenuSnapshot', () => {
  it('acepta un snapshot guardado', () => {
    const menu = snapshot([product({ variants: [{ id: 'v1', name: 'Personal', price: '28.00' }] })]);
    expect(parseMenuSnapshot(JSON.parse(JSON.stringify(menu)))).toEqual(menu);
  });

  it('rechaza lo que no tiene la forma esperada', () => {
    expect(parseMenuSnapshot(null)).toBeNull();
    expect(parseMenuSnapshot({ ...snapshot([]), template: 'OTRA' })).toBeNull();
    expect(parseMenuSnapshot({ ...snapshot([]), style: { ...DEFAULT_MENU_STYLE, fontFamily: 'Comic Sans' } })).toBeNull();
  });
});

describe('whatsappLink', () => {
  it.each([
    ['987 654 321', 'https://wa.me/51987654321'],
    ['+51 987 654 321', 'https://wa.me/51987654321'],
    ['12345678', 'https://wa.me/12345678'],
    ['+1 (415) 555-0100', 'https://wa.me/14155550100'],
  ])('«%s» → %s', (value, link) => {
    expect(whatsappLink(value)).toBe(link);
  });

  it.each(['1234567', '1234567890123456', '', null])('oculta el enlace para «%s»', (value) => {
    expect(whatsappLink(value)).toBeNull();
  });
});

describe('phoneLink y safeExternalUrl', () => {
  it('arma tel: con dígitos y un + inicial', () => {
    expect(phoneLink('+51 987 654 321')).toBe('tel:+51987654321');
    expect(phoneLink('(01) 234-5678')).toBe('tel:012345678');
    expect(phoneLink(null)).toBeNull();
  });

  it('solo enlaza direcciones https://', () => {
    expect(safeExternalUrl('https://www.instagram.com/luna')).toBe('https://www.instagram.com/luna');
    expect(safeExternalUrl('http://instagram.com/luna')).toBeNull();
    expect(safeExternalUrl('javascript:alert(1)')).toBeNull();
  });
});

describe('estilo de la carta', () => {
  it('ORIGINAL usa el estilo detectado, normalizado', () => {
    expect(
      resolveMenuStyle('ORIGINAL', { backgroundColor: '#FFF8ED', fontFamily: 'Lato', textColor: '#3D2A20' }),
    ).toEqual({ backgroundColor: '#fff8ed', fontFamily: 'Lato', textColor: '#3d2a20' });
  });

  it('sin estilo válido usa los valores por defecto', () => {
    expect(resolveMenuStyle('ORIGINAL', null)).toEqual(DEFAULT_MENU_STYLE);
    expect(parseMenuStyle({ backgroundColor: 'red', fontFamily: 'Inter', textColor: '#000000' })).toBeNull();
    expect(parseMenuStyle({ backgroundColor: '#ffffff', fontFamily: 'Comic Sans', textColor: '#000000' })).toEqual({
      backgroundColor: '#ffffff',
      fontFamily: 'Inter',
      textColor: '#000000',
    });
  });
});
