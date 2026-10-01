import { describe, expect, it } from 'vitest';

import { digitizationErrorMessage, formatFileSize, parseDigitizationJob } from './digitization';
import { InvalidExtractedMenuError, parseExtractedMenu } from './parse-extracted-menu';

function menu(overrides: Record<string, unknown> = {}) {
  return {
    categories: [
      {
        name: '  Entradas   frías ',
        products: [
          {
            basePrice: 28,
            description: 'Pescado del día   en leche de tigre.',
            extras: [{ name: 'Choclo', price: 3 }],
            name: 'Ceviche',
            variants: [{ name: 'Personal', price: 28 }, { name: 'Para compartir', price: 45.5 }],
          },
          { basePrice: '18', description: null, extras: [], name: 'Causa', variants: [] },
        ],
      },
    ],
    style: { backgroundColor: '#FFF8ED', fontFamily: 'Lato', textColor: '#3D2A20' },
    ...overrides,
  };
}

function product(overrides: Record<string, unknown>) {
  return { basePrice: 10, description: null, extras: [], name: 'Plato', variants: [], ...overrides };
}

describe('parseExtractedMenu', () => {
  it('acepta una carta válida y la normaliza', () => {
    expect(parseExtractedMenu(menu())).toEqual({
      categories: [
        {
          name: 'Entradas frías',
          products: [
            {
              basePrice: '28.00',
              description: 'Pescado del día en leche de tigre.',
              extras: [{ name: 'Choclo', price: '3.00' }],
              name: 'Ceviche',
              variants: [
                { name: 'Personal', price: '28.00' },
                { name: 'Para compartir', price: '45.50' },
              ],
            },
            { basePrice: '18.00', description: null, extras: [], name: 'Causa', variants: [] },
          ],
        },
      ],
      style: { backgroundColor: '#fff8ed', fontFamily: 'Lato', textColor: '#3d2a20' },
    });
  });

  it('rechaza un precio negativo', () => {
    const negative = menu({ categories: [{ name: 'Entradas', products: [product({ basePrice: -1 })] }] });
    expect(() => parseExtractedMenu(negative)).toThrow(InvalidExtractedMenuError);
  });

  it('rechaza 51 secciones', () => {
    const sections = Array.from({ length: 51 }, (_, index) => ({ name: `Sección ${index}`, products: [product({})] }));
    expect(() => parseExtractedMenu(menu({ categories: sections }))).toThrow(InvalidExtractedMenuError);
  });

  it('rechaza más de 500 productos, más de 100 por sección y más de 30 variantes', () => {
    const many = (count: number) => Array.from({ length: count }, (_, index) => product({ name: `Plato ${index}` }));
    const sixHundred = Array.from({ length: 6 }, (_, index) => ({ name: `S${index}`, products: many(100) }));
    expect(() => parseExtractedMenu(menu({ categories: sixHundred }))).toThrow(InvalidExtractedMenuError);
    expect(() => parseExtractedMenu(menu({ categories: [{ name: 'S', products: many(101) }] }))).toThrow(
      InvalidExtractedMenuError,
    );
    const variants = Array.from({ length: 31 }, (_, index) => ({ name: `V${index}`, price: 1 }));
    expect(() => parseExtractedMenu(menu({ categories: [{ name: 'S', products: [product({ variants })] }] }))).toThrow(
      InvalidExtractedMenuError,
    );
  });

  it('rechaza una carta sin secciones, una sección sin productos y textos fuera de rango', () => {
    expect(() => parseExtractedMenu({ categories: [] })).toThrow(InvalidExtractedMenuError);
    expect(() => parseExtractedMenu(menu({ categories: [{ name: 'S', products: [] }] }))).toThrow(
      InvalidExtractedMenuError,
    );
    expect(() =>
      parseExtractedMenu(menu({ categories: [{ name: 'S', products: [product({ name: 'x'.repeat(201) })] }] })),
    ).toThrow(InvalidExtractedMenuError);
    expect(() => parseExtractedMenu('no es json')).toThrow(InvalidExtractedMenuError);
  });

  it('una descripción vacía queda en null', () => {
    const parsed = parseExtractedMenu(menu({ categories: [{ name: 'S', products: [product({ description: '   ' })] }] }));
    expect(parsed.categories[0]?.products[0]?.description).toBeNull();
  });

  it('un color inválido usa los valores por defecto', () => {
    const parsed = parseExtractedMenu(menu({ style: { backgroundColor: 'red', fontFamily: 'Inter', textColor: 'rgb(0,0,0)' } }));
    expect(parsed.style).toEqual({ backgroundColor: '#ffffff', fontFamily: 'Inter', textColor: '#111827' });
    expect(parseExtractedMenu(menu({ style: undefined })).style).toEqual({
      backgroundColor: '#ffffff',
      fontFamily: 'Inter',
      textColor: '#111827',
    });
  });

  it('un texto sin contraste pasa a negro o a blanco', () => {
    expect(
      parseExtractedMenu(menu({ style: { backgroundColor: '#ffffff', fontFamily: 'Inter', textColor: '#f0f0f0' } })).style
        .textColor,
    ).toBe('#000000');
    expect(
      parseExtractedMenu(menu({ style: { backgroundColor: '#101010', fontFamily: 'Inter', textColor: '#202020' } })).style
        .textColor,
    ).toBe('#ffffff');
  });

  it('una fuente desconocida pasa a Inter', () => {
    expect(
      parseExtractedMenu(menu({ style: { backgroundColor: '#ffffff', fontFamily: 'Comic Sans MS', textColor: '#000000' } }))
        .style.fontFamily,
    ).toBe('Inter');
  });
});

describe('textos de la digitalización', () => {
  it('traduce los códigos de error y usa el genérico para los desconocidos', () => {
    expect(digitizationErrorMessage('MODEL_TIMEOUT')).toBe('Gemini tardó demasiado en responder. Inténtalo nuevamente.');
    expect(digitizationErrorMessage('ALGO_RARO')).toBe('No pudimos completar la acción. Inténtalo de nuevo.');
    expect(digitizationErrorMessage(null)).toBe('No pudimos completar la acción. Inténtalo de nuevo.');
  });

  it('formatea tamaños de archivo', () => {
    expect(formatFileSize(1_258_291)).toBe('1.2 MB');
    expect(formatFileSize(870_400)).toBe('850 KB');
  });

  it('lee el trabajo de una respuesta de la API', () => {
    const job = { errorCode: null, id: 'j1', photoCount: 2, status: 'PROCESSING' };
    expect(parseDigitizationJob({ job })).toEqual(job);
    expect(parseDigitizationJob({ job: { ...job, status: 'OTRO' } })).toBeNull();
    expect(parseDigitizationJob({ job: null })).toBeNull();
  });
});
