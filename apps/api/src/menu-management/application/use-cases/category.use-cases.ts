import type { AuthPrincipal } from '../../../auth/domain/auth.types.js';
import type { PublishedMenu } from '../../../digitization/domain/menu.types.js';
import { MenuManagementApplicationError } from '../../domain/menu-management.errors.js';
import { assertOwner, normalizeCategoryName, normalizeOrderedIds } from '../menu-management.validation.js';
import type { CategoryManagementRepository } from '../ports/menu-management.repositories.js';
import type { ProductImageStorage } from '../ports/product-image.storage.js';

export class CreateCategory {
  constructor(private readonly repository: CategoryManagementRepository) {}

  async execute(input: {
    name: unknown;
    principal: AuthPrincipal;
    restaurantId: string;
  }): Promise<PublishedMenu> {
    assertOwner(input.principal);
    const menu = await this.repository.createCategory(
      input.principal.accountId,
      input.restaurantId,
      normalizeCategoryName(input.name),
    );
    return requireMenu(menu);
  }
}

export class UpdateCategory {
  constructor(private readonly repository: CategoryManagementRepository) {}

  async execute(input: {
    categoryId: string;
    name: unknown;
    principal: AuthPrincipal;
    restaurantId: string;
  }): Promise<PublishedMenu> {
    assertOwner(input.principal);
    const menu = await this.repository.updateCategory(
      input.principal.accountId,
      input.restaurantId,
      input.categoryId,
      normalizeCategoryName(input.name),
    );
    if (!menu) {
      throw new MenuManagementApplicationError('CATEGORY_NOT_FOUND', 'Category not found.');
    }
    return menu;
  }
}

export class DeleteCategory {
  constructor(
    private readonly repository: CategoryManagementRepository,
    private readonly imageStorage: ProductImageStorage,
  ) {}

  async execute(input: {
    categoryId: string;
    principal: AuthPrincipal;
    restaurantId: string;
  }): Promise<PublishedMenu> {
    assertOwner(input.principal);
    const result = await this.repository.deleteCategory(
      input.principal.accountId,
      input.restaurantId,
      input.categoryId,
    );
    if (!result) {
      throw new MenuManagementApplicationError('CATEGORY_NOT_FOUND', 'Category not found.');
    }
    await Promise.all(result.imagePaths.map((path) => ignoreStorageFailure(this.imageStorage, path)));
    return result.menu;
  }
}

export class ReorderCategories {
  constructor(private readonly repository: CategoryManagementRepository) {}

  async execute(input: {
    orderedIds: unknown;
    principal: AuthPrincipal;
    restaurantId: string;
  }): Promise<PublishedMenu> {
    assertOwner(input.principal);
    const menu = await this.repository.reorderCategories(
      input.principal.accountId,
      input.restaurantId,
      normalizeOrderedIds(input.orderedIds),
    );
    if (!menu) {
      throw new MenuManagementApplicationError(
        'INVALID_ORDER',
        'El orden debe incluir todas las categorías una sola vez.',
      );
    }
    return menu;
  }
}

function requireMenu(menu: PublishedMenu | null): PublishedMenu {
  if (!menu) {
    throw new MenuManagementApplicationError('RESTAURANT_NOT_FOUND', 'Restaurant not found.');
  }
  return menu;
}

async function ignoreStorageFailure(
  storage: ProductImageStorage,
  relativePath: string,
): Promise<void> {
  try {
    await storage.deleteImage(relativePath);
  } catch {
    // The database deletion remains authoritative. Restaurant deletion also clears this directory.
  }
}
