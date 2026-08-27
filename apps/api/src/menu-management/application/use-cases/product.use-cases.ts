import type { AuthPrincipal } from '../../../auth/domain/auth.types.js';
import type { PublishedMenu } from '../../../digitization/domain/menu.types.js';
import { MenuManagementApplicationError } from '../../domain/menu-management.errors.js';
import {
  assertOwner,
  normalizeOrderedIds,
  normalizeProductPatch,
  normalizeProductValues,
} from '../menu-management.validation.js';
import type { ProductManagementRepository } from '../ports/menu-management.repositories.js';
import type { ProductImageStorage } from '../ports/product-image.storage.js';

export class CreateProduct {
  constructor(private readonly repository: ProductManagementRepository) {}

  async execute(input: {
    basePrice: unknown;
    categoryId: unknown;
    description?: unknown;
    extras?: unknown;
    name: unknown;
    principal: AuthPrincipal;
    restaurantId: string;
    variants?: unknown;
  }): Promise<PublishedMenu> {
    assertOwner(input.principal);
    const menu = await this.repository.createProduct(
      input.principal.accountId,
      input.restaurantId,
      normalizeProductValues(input),
    );
    if (!menu) {
      throw new MenuManagementApplicationError('CATEGORY_NOT_FOUND', 'Category not found.');
    }
    return menu;
  }
}

export class UpdateProduct {
  constructor(private readonly repository: ProductManagementRepository) {}

  async execute(input: {
    basePrice?: unknown;
    categoryId?: unknown;
    description?: unknown;
    extras?: unknown;
    isAvailable?: unknown;
    name?: unknown;
    principal: AuthPrincipal;
    productId: string;
    restaurantId: string;
    variants?: unknown;
  }): Promise<PublishedMenu> {
    assertOwner(input.principal);
    const menu = await this.repository.updateProduct(
      input.principal.accountId,
      input.restaurantId,
      input.productId,
      normalizeProductPatch(input),
    );
    if (!menu) {
      throw new MenuManagementApplicationError('PRODUCT_NOT_FOUND', 'Product not found.');
    }
    return menu;
  }
}

export class SetProductAvailability {
  constructor(private readonly repository: ProductManagementRepository) {}

  async execute(input: {
    isAvailable: unknown;
    principal: AuthPrincipal;
    productId: string;
    restaurantId: string;
  }): Promise<PublishedMenu> {
    assertOwner(input.principal);
    const patch = normalizeProductPatch({ isAvailable: input.isAvailable });
    const menu = await this.repository.updateProduct(
      input.principal.accountId,
      input.restaurantId,
      input.productId,
      patch,
    );
    if (!menu) {
      throw new MenuManagementApplicationError('PRODUCT_NOT_FOUND', 'Product not found.');
    }
    return menu;
  }
}

export class DeleteProduct {
  constructor(
    private readonly repository: ProductManagementRepository,
    private readonly imageStorage: ProductImageStorage,
  ) {}

  async execute(input: {
    principal: AuthPrincipal;
    productId: string;
    restaurantId: string;
  }): Promise<PublishedMenu> {
    assertOwner(input.principal);
    const result = await this.repository.deleteProduct(
      input.principal.accountId,
      input.restaurantId,
      input.productId,
    );
    if (!result) {
      throw new MenuManagementApplicationError('PRODUCT_NOT_FOUND', 'Product not found.');
    }
    if (result.imagePath) {
      try {
        await this.imageStorage.deleteImage(result.imagePath);
      } catch {
        // The product is already deleted; restaurant cleanup remains the final safety net.
      }
    }
    return result.menu;
  }
}

export class ReorderProducts {
  constructor(private readonly repository: ProductManagementRepository) {}

  async execute(input: {
    categoryId: string;
    orderedIds: unknown;
    principal: AuthPrincipal;
    restaurantId: string;
  }): Promise<PublishedMenu> {
    assertOwner(input.principal);
    const menu = await this.repository.reorderProducts(
      input.principal.accountId,
      input.restaurantId,
      input.categoryId,
      normalizeOrderedIds(input.orderedIds),
    );
    if (!menu) {
      throw new MenuManagementApplicationError(
        'INVALID_ORDER',
        'El orden debe incluir todos los productos de la categoría una sola vez.',
      );
    }
    return menu;
  }
}
