import { DigitizationApplicationError } from '../domain/digitization.errors.js';
import {
  MENU_FONT_FAMILIES,
  MENU_PHOTO_LIMITS,
  type ExtractedMenu,
  type MenuCategory,
  type MenuFontFamily,
  type MenuPhoto,
  type MenuProduct,
  type MenuStyle,
} from '../domain/menu.types.js';

const MAX_CATEGORIES = 50;
const MAX_PRODUCTS = 500;
const MAX_PRODUCTS_PER_CATEGORY = 100;
const MAX_OPTIONS_PER_PRODUCT = 30;
const DEFAULT_STYLE: MenuStyle = {
  backgroundColor: '#ffffff',
  fontFamily: 'Inter',
  textColor: '#111827',
};

export function validateMenuPhotos(photos: MenuPhoto[]): void {
  if (photos.length < 1 || photos.length > MENU_PHOTO_LIMITS.maximumPhotoCount) {
    throw new DigitizationApplicationError(
      'INVALID_IMAGE',
      `Sube entre 1 y ${MENU_PHOTO_LIMITS.maximumPhotoCount} fotos de la carta.`,
    );
  }
  const totalBytes = photos.reduce((total, photo) => total + photo.bytes.byteLength, 0);
  if (totalBytes > MENU_PHOTO_LIMITS.maximumTotalBytes) {
    throw new DigitizationApplicationError(
      'INVALID_IMAGE',
      'Las fotos superan el límite total de 12 MB.',
    );
  }
  for (const photo of photos) {
    if (
      photo.bytes.byteLength < 12 ||
      photo.bytes.byteLength > MENU_PHOTO_LIMITS.maximumBytesPerPhoto ||
      !MENU_PHOTO_LIMITS.acceptedContentTypes.includes(
        photo.contentType as (typeof MENU_PHOTO_LIMITS.acceptedContentTypes)[number],
      ) ||
      !hasExpectedSignature(photo)
    ) {
      throw new DigitizationApplicationError(
        'INVALID_IMAGE',
        'Cada foto debe ser un archivo JPG, PNG o WebP válido de hasta 3 MB.',
      );
    }
  }
}

export function parseExtractedMenu(value: unknown): ExtractedMenu {
  const root = asObject(value, 'La respuesta no contiene un menú válido.');
  if (!Array.isArray(root.categories) || root.categories.length < 1) {
    invalidResponse('Gemini no encontró categorías en las fotos.');
  }
  if (root.categories.length > MAX_CATEGORIES) {
    invalidResponse('Gemini devolvió demasiadas categorías.');
  }

  const categories = root.categories.map((category, index) =>
    parseCategory(category, index),
  );
  const productCount = categories.reduce(
    (count, category) => count + category.products.length,
    0,
  );
  if (productCount < 1 || productCount > MAX_PRODUCTS) {
    invalidResponse('La carta debe contener entre 1 y 500 productos.');
  }
  return {
    categories,
    style: root.style === undefined ? DEFAULT_STYLE : parseStyle(root.style),
  };
}

export function normalizeProductCorrection(value: {
  basePrice: unknown;
  description: unknown;
  name: unknown;
}): { basePrice: string; description: string | null; name: string } {
  return {
    basePrice: parsePrice(value.basePrice, 'precio'),
    description:
      value.description === null || value.description === ''
        ? null
        : parseText(value.description, 1, 2_000, 'descripción'),
    name: parseText(value.name, 1, 200, 'nombre'),
  };
}

function parseCategory(value: unknown, categoryIndex: number): MenuCategory {
  const category = asObject(value, `La categoría ${categoryIndex + 1} no es válida.`);
  if (
    !Array.isArray(category.products) ||
    category.products.length < 1 ||
    category.products.length > MAX_PRODUCTS_PER_CATEGORY
  ) {
    invalidResponse(`La categoría ${categoryIndex + 1} no contiene productos válidos.`);
  }
  return {
    name: parseText(category.name, 1, 160, 'categoría'),
    products: category.products.map((product, productIndex) =>
      parseProduct(product, categoryIndex, productIndex),
    ),
  };
}

function parseProduct(
  value: unknown,
  categoryIndex: number,
  productIndex: number,
): MenuProduct {
  const label = `producto ${productIndex + 1} de la categoría ${categoryIndex + 1}`;
  const product = asObject(value, `El ${label} no es válido.`);
  return {
    basePrice: parsePrice(product.basePrice, `precio del ${label}`),
    description:
      product.description === null || product.description === undefined
        ? null
        : parseText(product.description, 1, 2_000, `descripción del ${label}`),
    extras: parsePricedItems(product.extras, 'adicional', label),
    name: parseText(product.name, 1, 200, `nombre del ${label}`),
    variants: parsePricedItems(product.variants, 'variante', label),
  };
}

function parsePricedItems(
  value: unknown,
  kind: string,
  productLabel: string,
): Array<{ name: string; price: string }> {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > MAX_OPTIONS_PER_PRODUCT) {
    invalidResponse(`Las opciones del ${productLabel} no son válidas.`);
  }
  return value.map((item, index) => {
    const record = asObject(item, `La ${kind} ${index + 1} no es válida.`);
    return {
      name: parseText(record.name, 1, 160, kind),
      price: parsePrice(record.price, `precio de ${kind}`),
    };
  });
}

function parseStyle(value: unknown): MenuStyle {
  const style = asObject(value, 'El estilo estimado no es válido.');
  const backgroundColor = parseHexColor(style.backgroundColor, DEFAULT_STYLE.backgroundColor);
  const requestedTextColor = parseHexColor(style.textColor, DEFAULT_STYLE.textColor);
  const textColor =
    contrastRatio(backgroundColor, requestedTextColor) >= 4.5
      ? requestedTextColor
      : bestTextColor(backgroundColor);
  const fontFamily = MENU_FONT_FAMILIES.includes(style.fontFamily as MenuFontFamily)
    ? (style.fontFamily as MenuFontFamily)
    : DEFAULT_STYLE.fontFamily;
  return { backgroundColor, fontFamily, textColor };
}

function parseHexColor(value: unknown, fallback: string): string {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value)
    ? value.toLowerCase()
    : fallback;
}

function parseText(
  value: unknown,
  minimum: number,
  maximum: number,
  label: string,
): string {
  if (typeof value !== 'string') invalidResponse(`El campo ${label} no es válido.`);
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (normalized.length < minimum || normalized.length > maximum) {
    invalidResponse(`El campo ${label} no es válido.`);
  }
  return normalized;
}

function parsePrice(value: unknown, label: string): string {
  const price = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  if (typeof price !== 'number' || !Number.isFinite(price) || price < 0 || price > 99_999_999.99) {
    invalidResponse(`El campo ${label} no es un precio válido.`);
  }
  return price.toFixed(2);
}

function asObject(value: unknown, message: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    invalidResponse(message);
  }
  return value as Record<string, unknown>;
}

function invalidResponse(message: string): never {
  throw new DigitizationApplicationError('INVALID_MODEL_RESPONSE', message);
}

function hasExpectedSignature(photo: MenuPhoto): boolean {
  const bytes = photo.bytes;
  if (photo.contentType === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8;
  if (photo.contentType === 'image/png') {
    return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  }
  return (
    photo.contentType === 'image/webp' &&
    String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' &&
    String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'
  );
}

function bestTextColor(background: string): string {
  return contrastRatio(background, '#111827') >= contrastRatio(background, '#ffffff')
    ? '#111827'
    : '#ffffff';
}

function contrastRatio(first: string, second: string): number {
  const a = relativeLuminance(first);
  const b = relativeLuminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

function relativeLuminance(color: string): number {
  const channels = ([1, 3, 5] as const).map(
    (offset) => Number.parseInt(color.slice(offset, offset + 2), 16) / 255,
  );
  const [red, green, blue] = channels.map((channel) =>
    channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  ) as [number, number, number];
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}
