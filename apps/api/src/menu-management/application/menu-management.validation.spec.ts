import { MenuManagementApplicationError } from '../domain/menu-management.errors.js';
import {
  normalizeCategoryLayout,
  normalizeOrderedIds,
  normalizeProductPatch,
  normalizeProductValues,
  validateProductImage,
} from './menu-management.validation.js';

const CATEGORY_ID = '33333333-3333-4333-8333-333333333333';
const SECOND_ID = '44444444-4444-4444-8444-444444444444';

describe('menu management validation', () => {
  it('normalizes a product with independently priced variants and extras', () => {
    expect(normalizeProductValues({
      basePrice: '18.5',
      categoryId: CATEGORY_ID,
      description: '  Pan   artesanal  ',
      extras: [{ name: 'Queso', price: 2 }],
      name: '  Hamburguesa clásica ',
      variants: [{ name: 'Doble', price: '27.9' }],
    })).toEqual({
      basePrice: '18.50',
      categoryId: CATEGORY_ID,
      description: 'Pan artesanal',
      extras: [{ name: 'Queso', price: '2.00' }],
      name: 'Hamburguesa clásica',
      variants: [{ name: 'Doble', price: '27.90' }],
    });
  });

  it('rejects duplicate option names and invalid prices', () => {
    expect(() => normalizeProductValues({
      basePrice: -1,
      categoryId: CATEGORY_ID,
      name: 'Producto',
    })).toThrow(MenuManagementApplicationError);

    expect(() => normalizeProductValues({
      basePrice: 10,
      categoryId: CATEGORY_ID,
      extras: [
        { name: 'Queso', price: 2 },
        { name: ' queso ', price: 3 },
      ],
      name: 'Producto',
    })).toThrow('No repitas nombres');
  });

  it('accepts availability as an isolated patch without deleting the product', () => {
    expect(normalizeProductPatch({ isAvailable: false })).toEqual({ isAvailable: false });
    expect(() => normalizeProductPatch({ isAvailable: 'false' })).toThrow(
      'La disponibilidad no es válida',
    );
  });

  it('requires a complete duplicate-free UUID order', () => {
    expect(normalizeOrderedIds([CATEGORY_ID, SECOND_ID])).toEqual([CATEGORY_ID, SECOND_ID]);
    expect(() => normalizeOrderedIds([CATEGORY_ID, CATEGORY_ID])).toThrow(
      'El orden contiene elementos repetidos',
    );
    expect(() => normalizeOrderedIds([])).toThrow(MenuManagementApplicationError);
  });

  it('validates the declared product image type against its signature', () => {
    const png = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3, 4]);
    expect(validateProductImage({ bytes: png, contentType: 'image/png' })).toBe('image/png');
    expect(() => validateProductImage({ bytes: png, contentType: 'image/jpeg' })).toThrow(
      'La imagen debe ser un archivo PNG, JPG o WebP válido',
    );
  });

  describe('estilo de sección', () => {
    it('acepta los dos estilos publicables', () => {
      expect(normalizeCategoryLayout('LIST')).toBe('LIST');
      expect(normalizeCategoryLayout('CARDS')).toBe('CARDS');
    });

    it('devuelve undefined cuando no se envía, para no pisar el estilo actual', () => {
      expect(normalizeCategoryLayout(undefined)).toBeUndefined();
      expect(normalizeCategoryLayout(null)).toBeUndefined();
    });

    it('rechaza cualquier otro valor', () => {
      for (const value of ['MOSAICO', 'list', '', 3, true, {}, []]) {
        expect(() => normalizeCategoryLayout(value)).toThrow(MenuManagementApplicationError);
        expect(() => normalizeCategoryLayout(value)).toThrow(
          'El estilo de la sección debe ser LIST o CARDS.',
        );
      }
    });
  });
});
