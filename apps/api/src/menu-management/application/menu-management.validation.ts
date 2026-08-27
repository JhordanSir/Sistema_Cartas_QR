import { AuthRole } from '../../auth/domain/auth-role.js';
import type { AuthPrincipal } from '../../auth/domain/auth.types.js';
import { MenuManagementApplicationError } from '../domain/menu-management.errors.js';
import {
  PRODUCT_IMAGE_LIMITS,
  type ProductImageUpload,
  type ProductOptionInput,
  type ProductPatch,
  type ProductValues,
} from '../domain/menu-management.types.js';

const MAX_OPTIONS = 30;

export function assertOwner(principal: AuthPrincipal): void {
  if (principal.role !== AuthRole.OWNER) {
    throw new MenuManagementApplicationError('FORBIDDEN', 'Owner access required.');
  }
}

export function normalizeCategoryName(value: unknown): string {
  return normalizeText(value, 1, 160, 'nombre de categoría');
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
    basePrice: normalizePrice(input.basePrice, 'precio base'),
    categoryId: normalizeUuid(input.categoryId, 'categoría'),
    description: normalizeDescription(input.description),
    extras: normalizeOptions(input.extras, 'adicional'),
    name: normalizeText(input.name, 1, 200, 'nombre del producto'),
    variants: normalizeOptions(input.variants, 'variante'),
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
  if (input.basePrice !== undefined) patch.basePrice = normalizePrice(input.basePrice, 'precio base');
  if (input.categoryId !== undefined) patch.categoryId = normalizeUuid(input.categoryId, 'categoría');
  if (input.description !== undefined) patch.description = normalizeDescription(input.description);
  if (input.extras !== undefined) patch.extras = normalizeOptions(input.extras, 'adicional');
  if (input.name !== undefined) patch.name = normalizeText(input.name, 1, 200, 'nombre del producto');
  if (input.variants !== undefined) patch.variants = normalizeOptions(input.variants, 'variante');
  if (input.isAvailable !== undefined) {
    if (typeof input.isAvailable !== 'boolean') invalid('La disponibilidad no es válida.');
    patch.isAvailable = input.isAvailable;
  }
  if (Object.keys(patch).length === 0) invalid('Envía al menos un cambio para el producto.');
  return patch;
}

export function normalizeOrderedIds(value: unknown): string[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 500) {
    throw new MenuManagementApplicationError(
      'INVALID_ORDER',
      'El orden debe incluir todos los elementos una sola vez.',
    );
  }
  const ids = value.map((id) => normalizeUuid(id, 'identificador de orden'));
  if (new Set(ids).size !== ids.length) {
    throw new MenuManagementApplicationError(
      'INVALID_ORDER',
      'El orden contiene elementos repetidos.',
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

function normalizeOptions(value: unknown, label: string): ProductOptionInput[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > MAX_OPTIONS) {
    invalid(`El producto admite hasta ${MAX_OPTIONS} ${label}s.`);
  }
  const options = value.map((option, index) => {
    if (typeof option !== 'object' || option === null || Array.isArray(option)) {
      invalid(`El ${label} ${index + 1} no es válido.`);
    }
    const record = option as Record<string, unknown>;
    return {
      name: normalizeText(record.name, 1, 160, label),
      price: normalizePrice(record.price, `precio de ${label}`),
    };
  });
  const normalizedNames = options.map((option) => option.name.toLocaleLowerCase('es'));
  if (new Set(normalizedNames).size !== normalizedNames.length) {
    invalid(`No repitas nombres de ${label}s en el mismo producto.`);
  }
  return options;
}

function normalizeDescription(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null;
  return normalizeText(value, 1, 2_000, 'descripción');
}

function normalizePrice(value: unknown, label: string): string {
  const number = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  if (
    typeof number !== 'number' ||
    !Number.isFinite(number) ||
    number < 0 ||
    number > 99_999_999.99
  ) {
    invalid(`El campo ${label} no es un precio válido.`);
  }
  return number.toFixed(2);
}

function normalizeText(
  value: unknown,
  minimum: number,
  maximum: number,
  label: string,
): string {
  if (typeof value !== 'string') invalid(`El campo ${label} no es válido.`);
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (normalized.length < minimum || normalized.length > maximum) {
    invalid(`El campo ${label} no es válido.`);
  }
  return normalized;
}

function normalizeUuid(value: unknown, label: string): string {
  if (
    typeof value !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  ) {
    invalid(`El campo ${label} no es válido.`);
  }
  return value;
}

function invalid(message: string): never {
  throw new MenuManagementApplicationError('INVALID_INPUT', message);
}

function invalidImage(): never {
  throw new MenuManagementApplicationError(
    'INVALID_IMAGE',
    'La imagen debe ser un archivo PNG, JPG o WebP válido de hasta 4 MB.',
  );
}
