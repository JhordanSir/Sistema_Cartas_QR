import { PRICED_ITEMS_MAX } from './menu';
import {
  DEFAULT_MENU_STYLE,
  ensureReadableText,
  isMenuFont,
  type MenuStyle,
} from './menu-style';
import { collapseWhitespace } from './validation';

// Validation of what the extractor (Gemini, or the simulated one) returns
// (§E10). A menu that breaks a structural rule is rejected as a whole
// (INVALID_MODEL_RESPONSE); only the style falls back to safe values.

export type ExtractedItem = { name: string; price: string };

export type ExtractedProduct = {
  name: string;
  description: string | null;
  basePrice: string;
  variants: ExtractedItem[];
  extras: ExtractedItem[];
};

export type ExtractedCategory = { name: string; products: ExtractedProduct[] };

export type ExtractedMenu = { categories: ExtractedCategory[]; style: MenuStyle };

export const EXTRACTED_MENU_LIMITS = {
  maxCategories: 50,
  maxProducts: 500,
  maxProductsPerCategory: 100,
} as const;

export class InvalidExtractedMenuError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = 'InvalidExtractedMenuError';
  }
}

function invalid(reason: string): never {
  throw new InvalidExtractedMenuError(reason);
}

function asRecord(value: unknown, what: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) invalid(`${what} is not an object`);
  return value as Record<string, unknown>;
}

function text(value: unknown, maxLength: number, what: string): string {
  if (typeof value !== 'string') invalid(`${what} is not text`);
  const normalized = collapseWhitespace(value);
  const length = [...normalized].length;
  if (length < 1 || length > maxLength) invalid(`${what} has ${length} characters`);
  return normalized;
}

function description(value: unknown, what: string): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') invalid(`${what} is not text`);
  const normalized = collapseWhitespace(value);
  return normalized === '' ? null : text(normalized, 2000, what);
}

/** A finite number (or numeric text) from 0 to 99 999 999.99, kept with two decimals. */
function price(value: unknown, what: string): string {
  const parsed = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  if (typeof parsed !== 'number' || !Number.isFinite(parsed) || parsed < 0 || parsed > 99_999_999.99) {
    invalid(`${what} is not a valid price`);
  }
  return parsed.toFixed(2);
}

function items(value: unknown, what: string): ExtractedItem[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.length > PRICED_ITEMS_MAX) invalid(`${what} is not a valid list`);
  return value.map((item, index) => {
    const record = asRecord(item, `${what} ${index + 1}`);
    return { name: text(record.name, 160, `${what} ${index + 1} name`), price: price(record.price, `${what} ${index + 1}`) };
  });
}

function hexColor(value: unknown, fallback: string): string {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : fallback;
}

function style(value: unknown): MenuStyle {
  if (typeof value !== 'object' || value === null) return DEFAULT_MENU_STYLE;
  const record = value as Record<string, unknown>;
  return ensureReadableText({
    backgroundColor: hexColor(record.backgroundColor, DEFAULT_MENU_STYLE.backgroundColor),
    fontFamily: isMenuFont(record.fontFamily) ? record.fontFamily : DEFAULT_MENU_STYLE.fontFamily,
    textColor: hexColor(record.textColor, DEFAULT_MENU_STYLE.textColor),
  });
}

/**
 * Between 1 and 50 sections and between 1 and 500 products overall; each
 * section between 1 and 100 products; up to 30 variants and 30 extras per
 * product; texts with collapsed spaces and the lengths of §E5; prices with two
 * decimals. Colors that are not #rrggbb fall back to white and #111827,
 * unreadable text becomes black or white, and an unknown font becomes Inter.
 */
export function parseExtractedMenu(value: unknown): ExtractedMenu {
  const root = asRecord(value, 'menu');
  const { categories } = root;
  if (!Array.isArray(categories) || categories.length < 1) invalid('no sections');
  if (categories.length > EXTRACTED_MENU_LIMITS.maxCategories) invalid(`${categories.length} sections`);

  const parsed = categories.map((category, categoryIndex): ExtractedCategory => {
    const record = asRecord(category, `section ${categoryIndex + 1}`);
    const { products } = record;
    if (!Array.isArray(products) || products.length < 1) invalid(`section ${categoryIndex + 1} has no products`);
    if (products.length > EXTRACTED_MENU_LIMITS.maxProductsPerCategory) {
      invalid(`section ${categoryIndex + 1} has ${products.length} products`);
    }
    return {
      name: text(record.name, 160, `section ${categoryIndex + 1} name`),
      products: products.map((product, productIndex) => {
        const what = `product ${productIndex + 1} of section ${categoryIndex + 1}`;
        const fields = asRecord(product, what);
        return {
          basePrice: price(fields.basePrice, `${what} price`),
          description: description(fields.description, `${what} description`),
          extras: items(fields.extras, `${what} extra`),
          name: text(fields.name, 200, `${what} name`),
          variants: items(fields.variants, `${what} variant`),
        };
      }),
    };
  });

  const productCount = parsed.reduce((total, category) => total + category.products.length, 0);
  if (productCount > EXTRACTED_MENU_LIMITS.maxProducts) invalid(`${productCount} products`);

  return { categories: parsed, style: style(root.style) };
}
