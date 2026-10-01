import type { FieldErrors } from './account-forms';
import { collapseWhitespace } from './validation';

// Menu draft rules of §E5 and §E7, shared by the editor and the Route Handlers.

export type CategoryLayout = 'LIST' | 'CARDS';

/** A variant («Opciones») or an extra («Adicionales»): a name with its own price. */
export type PricedItem = { id: string; name: string; price: string };

export type DraftProduct = {
  id: string;
  name: string;
  description: string | null;
  /** Always two decimals, as stored: "18.50". */
  basePrice: string;
  imageUrl: string | null;
  isAvailable: boolean;
  variants: PricedItem[];
  extras: PricedItem[];
};

export type DraftCategory = {
  id: string;
  name: string;
  layout: CategoryLayout;
  products: DraftProduct[];
};

export type MenuDraft = {
  categories: DraftCategory[];
  /** While a digitization job is active every change answers 409 (§E7). */
  digitizationInProgress: boolean;
};

export const SECTION_NAME_MAX_LENGTH = 160;
export const PRODUCT_NAME_MAX_LENGTH = 200;
export const DESCRIPTION_MAX_LENGTH = 2000;

export const PRICE_PATTERN = /^\d{1,8}(?:\.\d{1,2})?$/;

/** Variants and extras: up to 30 of each per product, names of 1 to 160 characters (§E5). */
export const PRICED_ITEMS_MAX = 30;
export const PRICED_ITEM_NAME_MAX_LENGTH = 160;

export type PricedListKind = 'variants' | 'extras';

export const MENU_MESSAGES = {
  description: 'La descripción puede tener hasta 2000 caracteres.',
  price: 'Escribe un precio válido, por ejemplo 18.50.',
  pricedItemName: 'Escribe el nombre, de hasta 160 caracteres.',
  productName: 'Escribe el nombre del producto, de hasta 200 caracteres.',
  sectionName: 'Escribe el nombre de la sección, de hasta 160 caracteres.',
  tooManyExtras: 'Puedes agregar hasta 30 adicionales.',
  tooManyVariants: 'Puedes agregar hasta 30 opciones.',
} as const;

function characterCount(value: string): number {
  return [...value].length;
}

/** "18.5" → "18.50", "007" → "7.00"; null when it is not a valid price (§E5). */
export function normalizePrice(value: string): string | null {
  const price = value.trim();
  if (!PRICE_PATTERN.test(price)) return null;
  const [whole = '0', decimals = ''] = price.split('.');
  return `${whole.replace(/^0+(?=\d)/, '')}.${decimals.padEnd(2, '0')}`;
}

const priceFormat = new Intl.NumberFormat('es-PE', { currency: 'PEN', style: 'currency' });

/** "18.50" → "S/ 18.50" (§E8). */
export function formatPrice(price: string): string {
  return priceFormat.format(Number(price));
}

export function validateSectionName(value: string): string | null {
  const length = characterCount(collapseWhitespace(value));
  return length >= 1 && length <= SECTION_NAME_MAX_LENGTH ? null : MENU_MESSAGES.sectionName;
}

export type ProductValues = {
  name: string;
  description: string;
  basePrice: string;
};

export function validateProductForm(values: ProductValues): FieldErrors<keyof ProductValues> {
  const errors: FieldErrors<keyof ProductValues> = {};
  const nameLength = characterCount(collapseWhitespace(values.name));
  if (nameLength < 1 || nameLength > PRODUCT_NAME_MAX_LENGTH) errors.name = MENU_MESSAGES.productName;
  if (characterCount(values.description.trim()) > DESCRIPTION_MAX_LENGTH) {
    errors.description = MENU_MESSAGES.description;
  }
  if (normalizePrice(values.basePrice) === null) errors.basePrice = MENU_MESSAGES.price;
  return errors;
}

/** What gets stored: collapsed name, null for an empty description, two-decimal price. */
export function normalizeProduct(values: ProductValues): {
  name: string;
  description: string | null;
  basePrice: string;
} {
  const description = values.description.trim();
  return {
    basePrice: normalizePrice(values.basePrice) ?? '0.00',
    description: description === '' ? null : description,
    name: collapseWhitespace(values.name),
  };
}

/** A row of the variants or extras editor, before it is stored. */
export type PricedItemValues = { name: string; price: string };

/** The key of one field of one row, as used in API errors and in the form: "variants.0.price". */
export function pricedItemField(kind: PricedListKind, index: number, field: keyof PricedItemValues): string {
  return `${kind}.${index}.${field}`;
}

/**
 * Validates one list (§E5): at most 30 rows, each with a name of 1 to 160
 * characters and a valid price. Errors are keyed like "variants.0.name"; a
 * list that is too long is reported under its own kind ("variants").
 */
export function validatePricedItems(
  kind: PricedListKind,
  items: readonly PricedItemValues[],
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (items.length > PRICED_ITEMS_MAX) {
    errors[kind] = kind === 'variants' ? MENU_MESSAGES.tooManyVariants : MENU_MESSAGES.tooManyExtras;
  }
  items.forEach((item, index) => {
    const nameLength = characterCount(collapseWhitespace(item.name));
    if (nameLength < 1 || nameLength > PRICED_ITEM_NAME_MAX_LENGTH) {
      errors[pricedItemField(kind, index, 'name')] = MENU_MESSAGES.pricedItemName;
    }
    if (normalizePrice(item.price) === null) {
      errors[pricedItemField(kind, index, 'price')] = MENU_MESSAGES.price;
    }
  });
  return errors;
}

export function normalizePricedItems(items: readonly PricedItemValues[]): PricedItemValues[] {
  return items.map((item) => ({
    name: collapseWhitespace(item.name),
    price: normalizePrice(item.price) ?? '0.00',
  }));
}

export type MoveDirection = 'up' | 'down';

/**
 * Moves one element one place up or down. Returns the new order, or null when
 * nothing changes: the element is missing or already at that end.
 */
export function moveItem<Item extends { id: string }>(
  items: readonly Item[],
  id: string,
  direction: MoveDirection,
): Item[] | null {
  const index = items.findIndex((item) => item.id === id);
  const target = direction === 'up' ? index - 1 : index + 1;
  if (index === -1 || target < 0 || target >= items.length) return null;
  const reordered = [...items];
  const [moved] = reordered.splice(index, 1);
  if (!moved) return null;
  reordered.splice(target, 0, moved);
  return reordered;
}

/** sort_order is always 0, 1, 2… in the stored order. */
export function sortOrders<Item extends { id: string }>(items: readonly Item[]): { id: string; sortOrder: number }[] {
  return items.map((item, sortOrder) => ({ id: item.id, sortOrder }));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isPricedItem(value: unknown): value is PricedItem {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.price === 'string'
  );
}

function isDraftProduct(value: unknown): value is DraftProduct {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    (value.description === null || typeof value.description === 'string') &&
    typeof value.basePrice === 'string' &&
    (value.imageUrl === null || typeof value.imageUrl === 'string') &&
    typeof value.isAvailable === 'boolean' &&
    Array.isArray(value.variants) &&
    value.variants.every(isPricedItem) &&
    Array.isArray(value.extras) &&
    value.extras.every(isPricedItem)
  );
}

function isDraftCategory(value: unknown): value is DraftCategory {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    (value.layout === 'LIST' || value.layout === 'CARDS') &&
    Array.isArray(value.products) &&
    value.products.every(isDraftProduct)
  );
}

/** The `draft` of an API response, or null if it does not have the expected shape. */
export function parseMenuDraft(data: unknown): MenuDraft | null {
  if (!isRecord(data) || !isRecord(data.draft)) return null;
  const { categories, digitizationInProgress } = data.draft;
  if (!Array.isArray(categories) || !categories.every(isDraftCategory)) return null;
  if (typeof digitizationInProgress !== 'boolean') return null;
  return { categories, digitizationInProgress };
}
