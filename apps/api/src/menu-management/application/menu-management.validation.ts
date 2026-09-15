import { toMegabytes } from '@sirio/shared';
import type { ApiErrorParamMap, ApiProblem } from '@sirio/shared';

import { AuthRole } from '../../auth/domain/auth-role.js';
import type { AuthPrincipal } from '../../auth/domain/auth.types.js';
import { CATEGORY_LAYOUTS, type CategoryLayout } from '../../digitization/domain/menu.types.js';
import { MenuManagementApplicationError } from '../domain/menu-management.errors.js';
import {
  PRODUCT_IMAGE_LIMITS,
  type ProductImageUpload,
  type ProductOptionInput,
  type ProductPatch,
  type ProductValues,
} from '../domain/menu-management.types.js';

type MenuField = ApiErrorParamMap['FIELD_INVALID']['field'];
type OptionKind = ApiErrorParamMap['PRODUCT_OPTION_LIMIT']['kind'];
type PriceField = ApiErrorParamMap['FIELD_PRICE_INVALID']['field'];

const MAX_OPTIONS = 30;
// Up to 8 integer digits and 2 decimals, no sign or exponent: the shape the DTO used to
// enforce before this validation became the only one.
const PRICE_PATTERN = /^\d{1,8}(?:\.\d{1,2})?$/;

// Labels for the API's own Spanish `message`, which stays as it was. Clients read
// `problem` instead and name the field in the interface language.
const FIELD_LABELS: Record<MenuField, string> = {
  categoryId: 'categoría',
  categoryName: 'nombre de categoría',
  description: 'descripción',
  extraName: 'adicional',
  orderId: 'identificador de orden',
  productName: 'nombre del producto',
  variantName: 'variante',
};

const PRICE_LABELS: Record<PriceField, string> = {
  basePrice: 'precio base',
  extraPrice: 'precio de adicional',
  variantPrice: 'precio de variante',
};

const OPTION_LABELS: Record<OptionKind, string> = { extra: 'adicional', variant: 'variante' };

const OPTION_FIELDS: Record<OptionKind, { name: MenuField; price: PriceField }> = {
  extra: { name: 'extraName', price: 'extraPrice' },
  variant: { name: 'variantName', price: 'variantPrice' },
};

export function assertOwner(principal: AuthPrincipal): void {
  if (principal.role !== AuthRole.OWNER) {
    throw new MenuManagementApplicationError('FORBIDDEN', 'Owner access required.');
  }
}

export function normalizeCategoryName(value: unknown): string {
  return normalizeText(value, 1, 160, 'categoryName');
}

/**
 * The layout is optional on every request: omitting it leaves the section as it is,
 * which keeps a rename from silently resetting a card layout back to a list.
 */
export function normalizeCategoryLayout(value: unknown): CategoryLayout | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string' || !CATEGORY_LAYOUTS.includes(value as CategoryLayout)) {
    invalid('El estilo de la sección debe ser LIST o CARDS.', { code: 'CATEGORY_LAYOUT_INVALID' });
  }
  return value as CategoryLayout;
}

export function normalizeProductValues(input: {
  basePrice: unknown;
  categoryId: unknown;
  description?: unknown;
  extras?: unknown;
  name: unknown;
  variants?: unknown;
}): ProductValues {
  return {
    basePrice: normalizePrice(input.basePrice, 'basePrice'),
    categoryId: normalizeUuid(input.categoryId, 'categoryId'),
    description: normalizeDescription(input.description),
    extras: normalizeOptions(input.extras, 'extra'),
    name: normalizeText(input.name, 1, 200, 'productName'),
    variants: normalizeOptions(input.variants, 'variant'),
  };
}

export function normalizeProductPatch(input: {
  basePrice?: unknown;
  categoryId?: unknown;
  description?: unknown;
  extras?: unknown;
  isAvailable?: unknown;
  name?: unknown;
  variants?: unknown;
}): ProductPatch {
  const patch: ProductPatch = {};
  if (input.basePrice !== undefined) patch.basePrice = normalizePrice(input.basePrice, 'basePrice');
  if (input.categoryId !== undefined) patch.categoryId = normalizeUuid(input.categoryId, 'categoryId');
  if (input.description !== undefined) patch.description = normalizeDescription(input.description);
  if (input.extras !== undefined) patch.extras = normalizeOptions(input.extras, 'extra');
  if (input.name !== undefined) patch.name = normalizeText(input.name, 1, 200, 'productName');
  if (input.variants !== undefined) patch.variants = normalizeOptions(input.variants, 'variant');
  if (input.isAvailable !== undefined) {
    if (typeof input.isAvailable !== 'boolean') {
      invalid('La disponibilidad no es válida.', { code: 'PRODUCT_AVAILABILITY_INVALID' });
    }
    patch.isAvailable = input.isAvailable;
  }
  if (Object.keys(patch).length === 0) {
    invalid('Envía al menos un cambio para el producto.', { code: 'PRODUCT_PATCH_EMPTY' });
  }
  return patch;
}

export function normalizeOrderedIds(value: unknown): string[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 500) {
    throw new MenuManagementApplicationError(
      'INVALID_ORDER',
      'El orden debe incluir todos los elementos una sola vez.',
      { problem: { code: 'MENU_ORDER_INCOMPLETE', params: { subject: 'items' } } },
    );
  }
  const ids = value.map((id) => normalizeUuid(id, 'orderId'));
  if (new Set(ids).size !== ids.length) {
    throw new MenuManagementApplicationError(
      'INVALID_ORDER',
      'El orden contiene elementos repetidos.',
      { problem: { code: 'MENU_ORDER_DUPLICATED' } },
    );
  }
  return ids;
}

export function validateProductImage(image: ProductImageUpload): StoredImageType {
  if (
    image.bytes.byteLength < 12 ||
    image.bytes.byteLength > PRODUCT_IMAGE_LIMITS.maximumBytes ||
    !PRODUCT_IMAGE_LIMITS.acceptedContentTypes.includes(
      image.contentType as StoredImageType,
    )
  ) {
    invalidImage();
  }
  const detected = detectProductImageContentType(image.bytes);
  if (!detected || detected !== image.contentType) invalidImage();
  return detected;
}

export type StoredImageType = (typeof PRODUCT_IMAGE_LIMITS.acceptedContentTypes)[number];

export function detectProductImageContentType(bytes: Uint8Array): StoredImageType | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return 'image/jpeg';
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return 'image/png';
  }
  if (
    String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' &&
    String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'
  ) {
    return 'image/webp';
  }
  return null;
}

function normalizeOptions(value: unknown, kind: OptionKind): ProductOptionInput[] {
  if (value === undefined) return [];
  const label = OPTION_LABELS[kind];
  if (!Array.isArray(value) || value.length > MAX_OPTIONS) {
    invalid(`El producto admite hasta ${MAX_OPTIONS} ${label}s.`, {
      code: 'PRODUCT_OPTION_LIMIT',
      params: { kind, max: MAX_OPTIONS },
    });
  }
  const options = value.map((option, index) => {
    if (typeof option !== 'object' || option === null || Array.isArray(option)) {
      invalid(`El ${label} ${index + 1} no es válido.`, {
        code: 'PRODUCT_OPTION_INVALID',
        params: { kind, position: index + 1 },
      });
    }
    const record = option as Record<string, unknown>;
    return {
      name: normalizeText(record.name, 1, 160, OPTION_FIELDS[kind].name),
      price: normalizePrice(record.price, OPTION_FIELDS[kind].price),
    };
  });
  const normalizedNames = options.map((option) => option.name.toLocaleLowerCase('es'));
  if (new Set(normalizedNames).size !== normalizedNames.length) {
    invalid(`No repitas nombres de ${label}s en el mismo producto.`, {
      code: 'PRODUCT_OPTION_DUPLICATED',
      params: { kind },
    });
  }
  return options;
}

function normalizeDescription(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null;
  return normalizeText(value, 1, 2_000, 'description');
}

function normalizePrice(value: unknown, field: PriceField): string {
  const number = typeof value === 'string' && PRICE_PATTERN.test(value) ? Number(value) : value;
  if (
    typeof number !== 'number' ||
    !Number.isFinite(number) ||
    number < 0 ||
    number > 99_999_999.99
  ) {
    invalid(`El campo ${PRICE_LABELS[field]} no es un precio válido.`, {
      code: 'FIELD_PRICE_INVALID',
      params: { field },
    });
  }
  return number.toFixed(2);
}

function normalizeText(
  value: unknown,
  minimum: number,
  maximum: number,
  field: MenuField,
): string {
  if (typeof value !== 'string') invalidField(field);
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (normalized.length < minimum || normalized.length > maximum) {
    invalidField(field);
  }
  return normalized;
}

function normalizeUuid(value: unknown, field: MenuField): string {
  if (
    typeof value !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  ) {
    invalidField(field);
  }
  return value;
}

function invalidField(field: MenuField): never {
  invalid(`El campo ${FIELD_LABELS[field]} no es válido.`, {
    code: 'FIELD_INVALID',
    params: { field },
  });
}

function invalid(message: string, problem: ApiProblem): never {
  throw new MenuManagementApplicationError('INVALID_INPUT', message, { problem });
}

function invalidImage(): never {
  throw new MenuManagementApplicationError(
    'INVALID_IMAGE',
    'La imagen debe ser un archivo PNG, JPG o WebP válido de hasta 4 MB.',
    {
      problem: {
        code: 'PRODUCT_IMAGE_INVALID',
        params: { maxMb: toMegabytes(PRODUCT_IMAGE_LIMITS.maximumBytes) },
      },
    },
  );
}
