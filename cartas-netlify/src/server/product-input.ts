import { z } from 'zod';

import { hasErrors } from '../shared/account-forms';
import { normalizeProduct, validateProductForm } from '../shared/menu';
import { requireUuid, validationError } from './http';
import type { ProductInput } from './menu-draft';

/** Body of POST /api/carta/productos and PATCH /api/carta/productos/{id}. */
export const ProductBody = z.object({
  basePrice: z.string().max(100),
  categoryId: z.string().max(100),
  description: z.string().max(10_000).default(''),
  isAvailable: z.boolean().default(true),
  name: z.string().max(1000),
});

/** Validates with the §E5 rules and returns what gets stored. */
export function toProductInput(body: z.infer<typeof ProductBody>): ProductInput {
  const errors = validateProductForm(body);
  if (hasErrors(errors)) throw validationError(errors);
  return {
    ...normalizeProduct(body),
    categoryId: requireUuid(body.categoryId, 'No encontramos esa sección.'),
    isAvailable: body.isAvailable,
  };
}
