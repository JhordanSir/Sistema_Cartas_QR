import { parseExtractedMenu, validateMenuPhotos } from './menu.validation.js';

describe('menu extraction validation', () => {
  it('normalizes a complete structured response and enforces readable colors', () => {
    const menu = parseExtractedMenu({
      categories: [
        {
          name: '  Fondos  ',
          products: [
            {
              basePrice: 28,
              description: ' Lomo  salteado al wok ',
              extras: [{ name: 'Huevo', price: 3 }],
              name: 'Lomo Saltado',
              variants: [{ name: 'Personal', price: 28 }],
            },
          ],
        },
      ],
      style: {
        backgroundColor: '#ffffff',
        fontFamily: 'Playfair Display',
        textColor: '#eeeeee',
      },
    });

    expect(menu).toEqual({
      categories: [
        {
          // Una carta recién digitalizada siempre nace como lista compacta.
          layout: 'LIST',
          name: 'Fondos',
          products: [
            {
              basePrice: '28.00',
              description: 'Lomo salteado al wok',
              extras: [{ name: 'Huevo', price: '3.00' }],
              imagePath: null,
              isAvailable: true,
              name: 'Lomo Saltado',
              variants: [{ name: 'Personal', price: '28.00' }],
            },
          ],
        },
      ],
      style: {
        backgroundColor: '#ffffff',
        fontFamily: 'Playfair Display',
        textColor: '#111827',
      },
    });
  });

  it('accepts a partial optional response with safe defaults', () => {
    expect(
      parseExtractedMenu({
        categories: [
          {
            name: 'Bebidas',
            products: [{ basePrice: '6.5', name: 'Limonada' }],
          },
        ],
      }),
    ).toMatchObject({
      categories: [
        {
          products: [
            {
              basePrice: '6.50',
              description: null,
              extras: [],
              imagePath: null,
              isAvailable: true,
              variants: [],
            },
          ],
        },
      ],
      style: { backgroundColor: '#ffffff', fontFamily: 'Inter', textColor: '#111827' },
    });
  });

  it('rejects a response that is missing required product data', () => {
    expect(() =>
      parseExtractedMenu({
        categories: [{ name: 'Fondos', products: [{ name: 'Sin precio' }] }],
      }),
    ).toThrow('precio del producto 1 de la categoría 1');
  });

  it('validates image signatures instead of trusting the declared MIME type', () => {
    expect(() =>
      validateMenuPhotos([
        {
          bytes: Buffer.from('<svg><script>alert(1)</script></svg>'),
          contentType: 'image/png',
        },
      ]),
    ).toThrow('JPG, PNG o WebP válido');
  });

  it('attaches the limit the client shows for each photo rejection', () => {
    const png = (bytes: number): { bytes: Uint8Array; contentType: string } => ({
      bytes: new Uint8Array(bytes),
      contentType: 'image/png',
    });

    expect(problemOf(() => validateMenuPhotos([]))).toEqual({
      code: 'MENU_PHOTO_COUNT',
      params: { max: 5 },
    });
    expect(problemOf(() => validateMenuPhotos(Array.from({ length: 5 }, () => png(3 * 1024 * 1024))))).toEqual({
      code: 'MENU_PHOTOS_TOO_LARGE',
      params: { maxMb: 12 },
    });
    expect(problemOf(() => validateMenuPhotos([png(64)]))).toEqual({
      code: 'MENU_PHOTO_INVALID',
      params: { maxMb: 3 },
    });
  });
});

function problemOf(run: () => unknown): unknown {
  try {
    run();
  } catch (error) {
    return (error as { problem?: unknown }).problem;
  }
  throw new Error('Expected validation failure');
}
