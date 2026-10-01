import { MENU_FONTS } from '../../shared/menu-style';

// The prompt and the response schema of §E10, word for word.

export const MENU_EXTRACTION_PROMPT = `Analiza todas las fotografías como páginas de una misma carta de restaurante.
Extrae solo información visible. No inventes productos, precios ni ingredientes. Une categorías repetidas entre páginas.
Los precios deben ser números en soles peruanos, sin símbolo monetario. Si un producto no tiene descripción visible usa null.
"variants" son presentaciones o tamaños con precio propio; "extras" son adicionales opcionales con precio propio.
Estima el color de fondo, el color principal del texto y la familia de Google Fonts más cercana al diseño.
Devuelve únicamente el objeto que cumple el esquema estructurado.`;

export const MENU_EXTRACTION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['categories', 'style'],
  properties: {
    categories: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'products'],
        properties: {
          name: { type: 'string' },
          products: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['name', 'description', 'basePrice', 'variants', 'extras'],
              properties: {
                name: { type: 'string' },
                description: { anyOf: [{ type: 'string' }, { type: 'null' }] },
                basePrice: { type: 'number' },
                variants: { type: 'array', items: { $ref: '#/$defs/pricedItem' } },
                extras: { type: 'array', items: { $ref: '#/$defs/pricedItem' } },
              },
            },
          },
        },
      },
    },
    style: {
      type: 'object',
      additionalProperties: false,
      required: ['backgroundColor', 'textColor', 'fontFamily'],
      properties: {
        backgroundColor: { type: 'string' },
        textColor: { type: 'string' },
        fontFamily: { type: 'string', enum: [...MENU_FONTS] },
      },
    },
  },
  $defs: {
    pricedItem: {
      type: 'object',
      additionalProperties: false,
      required: ['name', 'price'],
      properties: { name: { type: 'string' }, price: { type: 'number' } },
    },
  },
} as const;
