import { z } from 'zod';

import {
  normalizePricedItems,
  normalizeProduct,
  validatePricedItems,
  validateProductForm,
} from '../shared/menu';
import { requireUuid, validationError } from './http';
import type { ProductInput } from './menu-draft';

const PricedItemBody = z.object({ name: z.string().max(1000), price: z.string().max(100) });

/**
 * Body of POST /api/carta/productos and PATCH /api/carta/productos/{id}. The
 * lists accept more than 30 rows here so the §E5 limit answers with its own
 * message instead of a generic one.
 */
export const ProductBody = z.object({
  basePrice: z.string().max(100),
  categoryId: z.string().max(100),
  description: z.string().max(10_000).default(''),
  extras: z.array(PricedItemBody).max(200).default([]),
  isAvailable: z.boolean().default(true),
  name: z.string().max(1000),
  variants: z.array(PricedItemBody).max(200).default([]),
});

/** Validates with the §E5 rules and returns what gets stored. */
export function toProductInput(body: z.infer<typeof ProductBody>): ProductInput {
  const errors = {
    ...validateProductForm(body),
    ...validatePricedItems('variants', body.variants),
    ...validatePricedItems('extras', body.extras),
  };
  if (Object.keys(errors).length > 0) throw validationError(errors);
  return {
    ...normalizeProduct(body),
    categoryId: requireUuid(body.categoryId, 'No encontramos esa sección.'),
    extras: normalizePricedItems(body.extras),
    isAvailable: body.isAvailable,
    variants: normalizePricedItems(body.variants),
  };
}
