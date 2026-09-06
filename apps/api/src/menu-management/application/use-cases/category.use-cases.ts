import type { AuthPrincipal } from '../../../auth/domain/auth.types.js';
import type { PublishedMenu } from '../../../digitization/domain/menu.types.js';
import { MenuManagementApplicationError } from '../../domain/menu-management.errors.js';
import {
  assertOwner,
  normalizeCategoryLayout,
  normalizeCategoryName,
  normalizeOrderedIds,
} from '../menu-management.validation.js';
import type { CategoryManagementRepository } from '../ports/menu-management.repositories.js';

export class CreateCategory {
  constructor(private readonly repository: CategoryManagementRepository) {}

  async execute(input: {
    layout?: unknown;
    name: unknown;
    principal: AuthPrincipal;
    restaurantId: string;
  }): Promise<PublishedMenu> {
    assertOwner(input.principal);
    const layout = normalizeCategoryLayout(input.layout);
    const menu = await this.repository.createCategory(
      input.principal.accountId,
      input.restaurantId,
      { name: normalizeCategoryName(input.name), ...(layout ? { layout } : {}) },
    );
    return requireMenu(menu);
  }
}

export class UpdateCategory {
  constructor(private readonly repository: CategoryManagementRepository) {}

  async execute(input: {
    categoryId: string;
    layout?: unknown;
    name: unknown;
    principal: AuthPrincipal;
    restaurantId: string;
  }): Promise<PublishedMenu> {
    assertOwner(input.principal);
    const layout = normalizeCategoryLayout(input.layout);
    const menu = await this.repository.updateCategory(
      input.principal.accountId,
      input.restaurantId,
      input.categoryId,
      { name: normalizeCategoryName(input.name), ...(layout ? { layout } : {}) },
    );
    if (!menu) {
      throw new MenuManagementApplicationError('CATEGORY_NOT_FOUND', 'Category not found.');
    }
    return menu;
  }
}

export class DeleteCategory {
  constructor(private readonly repository: CategoryManagementRepository) {}

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
