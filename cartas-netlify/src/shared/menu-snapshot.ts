import type { CategoryLayout } from './menu';
import { isMenuFont, type MenuStyle, type MenuTemplate } from './menu-style';

// The published menu is a JSON snapshot of the draft (§E7). The public page
// renders only the snapshot; the draft never reaches a diner.

export type SnapshotItem = { id: string; name: string; price: string };

export type SnapshotProduct = {
  id: string;
  name: string;
  description: string | null;
  basePrice: string;
  imageKey: string | null;
  isAvailable: boolean;
  variants: SnapshotItem[];
  extras: SnapshotItem[];
};

export type SnapshotCategory = {
  id: string;
  name: string;
  layout: CategoryLayout;
  products: SnapshotProduct[];
};

export type MenuSnapshot = {
  template: MenuTemplate;
  style: MenuStyle;
  categories: SnapshotCategory[];
};

/** JSON with the keys of every object sorted, so key order never makes two snapshots differ. */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(value, (_key, inner: unknown) => {
    if (inner === null || typeof inner !== 'object' || Array.isArray(inner)) return inner;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(inner).sort()) sorted[key] = (inner as Record<string, unknown>)[key];
    return sorted;
  });
}

export function sameMenuSnapshot(a: MenuSnapshot, b: MenuSnapshot): boolean {
  return canonicalJson(a) === canonicalJson(b);
}

export function hasAvailableProduct(snapshot: MenuSnapshot): boolean {
  return snapshot.categories.some((category) => category.products.some((product) => product.isAvailable));
}

/**
 * «Tienes cambios por publicar» (§E7): the draft differs from what is
 * published. Never published: there are changes as soon as one product is available.
 */
export function hasUnpublishedChanges(draft: MenuSnapshot, published: MenuSnapshot | null): boolean {
  if (!published) return hasAvailableProduct(draft);
  return !sameMenuSnapshot(draft, published);
}

/** What diners see: only available products, and only sections that still have one. */
export function publicCategories(snapshot: MenuSnapshot): SnapshotCategory[] {
  return snapshot.categories
    .map((category) => ({ ...category, products: category.products.filter((product) => product.isAvailable) }))
    .filter((category) => category.products.length > 0);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isItem(value: unknown): value is SnapshotItem {
  return isRecord(value) && typeof value.id === 'string' && typeof value.name === 'string' && typeof value.price === 'string';
}

function isProduct(value: unknown): value is SnapshotProduct {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    (value.description === null || typeof value.description === 'string') &&
    typeof value.basePrice === 'string' &&
    (value.imageKey === null || typeof value.imageKey === 'string') &&
    typeof value.isAvailable === 'boolean' &&
    Array.isArray(value.variants) &&
    value.variants.every(isItem) &&
    Array.isArray(value.extras) &&
    value.extras.every(isItem)
  );
}

function isCategory(value: unknown): value is SnapshotCategory {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    (value.layout === 'LIST' || value.layout === 'CARDS') &&
    Array.isArray(value.products) &&
    value.products.every(isProduct)
  );
}

const TEMPLATES: readonly MenuTemplate[] = ['ORIGINAL', 'TRADITIONAL', 'CASUAL', 'PREMIUM'];

/** A stored `published_menu`, or null when it does not have the expected shape. */
export function parseMenuSnapshot(value: unknown): MenuSnapshot | null {
  if (!isRecord(value) || !isRecord(value.style) || !Array.isArray(value.categories)) return null;
  const { style, template } = value;
  if (!TEMPLATES.includes(template as MenuTemplate)) return null;
  if (typeof style.backgroundColor !== 'string' || typeof style.textColor !== 'string') return null;
  if (!isMenuFont(style.fontFamily)) return null;
  if (!value.categories.every(isCategory)) return null;
  return {
    categories: value.categories,
    style: { backgroundColor: style.backgroundColor, fontFamily: style.fontFamily, textColor: style.textColor },
    template: template as MenuTemplate,
  };
}

/**
 * The wa.me link for a WhatsApp number (§E8): digits only; nine digits that
 * start with 9 are a Peruvian mobile and get 51 in front. Anything outside
 * 8 to 15 digits has no link.
 */
export function whatsappLink(value: string | null): string | null {
  if (!value) return null;
  let digits = value.replace(/\D/g, '');
  if (digits.length === 9 && digits.startsWith('9')) digits = `51${digits}`;
  if (digits.length < 8 || digits.length > 15) return null;
  return `https://wa.me/${digits}`;
}

/** The tel: link of a phone: digits and a leading +. */
export function phoneLink(value: string | null): string | null {
  if (!value) return null;
  const phone = value.trim().replace(/(?!^\+)[^\d]/g, '');
  return /\d{6,}/.test(phone) ? `tel:${phone}` : null;
}

/** Only https:// addresses are linked from the public menu (§E8). */
export function safeExternalUrl(value: string | null): string | null {
  return value && value.startsWith('https://') ? value : null;
}
