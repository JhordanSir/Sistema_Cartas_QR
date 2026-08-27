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
});
