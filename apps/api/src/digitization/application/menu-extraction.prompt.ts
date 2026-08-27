import { MENU_FONT_FAMILIES } from '../domain/menu.types.js';

export const MENU_EXTRACTION_PROMPT = `Analiza todas las fotografías como páginas de una misma carta de restaurante.
Extrae solo información visible. No inventes productos, precios ni ingredientes. Une categorías repetidas entre páginas.
Los precios deben ser números en soles peruanos, sin símbolo monetario. Si un producto no tiene descripción visible usa null.
"variants" son presentaciones o tamaños con precio propio; "extras" son adicionales opcionales con precio propio.
Estima el color de fondo, el color principal del texto y la familia de Google Fonts más cercana al diseño.
Devuelve únicamente el objeto que cumple el esquema estructurado.`;

const pricedItemSchema = {
  additionalProperties: false,
  properties: {
    name: { type: 'string' },
    price: { type: 'number' },
  },
  required: ['name', 'price'],
  type: 'object',
};

export const MENU_EXTRACTION_RESPONSE_SCHEMA = {
  additionalProperties: false,
  properties: {
    categories: {
      items: {
        additionalProperties: false,
        properties: {
          name: { type: 'string' },
          products: {
            items: {
              additionalProperties: false,
              properties: {
                basePrice: { type: 'number' },
                description: { anyOf: [{ type: 'string' }, { type: 'null' }] },
                extras: { items: pricedItemSchema, type: 'array' },
                name: { type: 'string' },
                variants: { items: pricedItemSchema, type: 'array' },
              },
              required: [
                'name',
                'description',
                'basePrice',
                'variants',
                'extras',
              ],
              type: 'object',
            },
            type: 'array',
          },
        },
        required: ['name', 'products'],
        type: 'object',
      },
      type: 'array',
    },
    style: {
      additionalProperties: false,
      properties: {
        backgroundColor: { type: 'string' },
        fontFamily: { enum: [...MENU_FONT_FAMILIES], type: 'string' },
        textColor: { type: 'string' },
      },
      required: ['backgroundColor', 'textColor', 'fontFamily'],
      type: 'object',
    },
  },
  required: ['categories', 'style'],
  type: 'object',
};
