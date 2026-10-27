import type { CategoryLayout, PublishedMenu } from '../../../digitization/domain/menu.types.js';
import type {
  ProductAssetRecord,
  ProductPatch,
  ProductValues,
} from '../../domain/menu-management.types.js';

export interface CategoryDeletionResult {
  imagePaths: string[];
  menu: PublishedMenu;
}

export interface ProductDeletionResult {
  imagePath: string | null;
  menu: PublishedMenu;
}

export interface CategoryValues {
  layout?: CategoryLayout;
  name: string;
}

/** Omitted fields are left untouched, so renaming never resets the layout. */
export interface CategoryPatch {
  layout?: CategoryLayout;
  name?: string;
}

export interface CategoryManagementRepository {
  createCategory(ownerId: string, restaurantId: string, values: CategoryValues): Promise<PublishedMenu | null>;
  deleteCategory(ownerId: string, restaurantId: string, categoryId: string): Promise<CategoryDeletionResult | null>;
  reorderCategories(ownerId: string, restaurantId: string, orderedIds: string[]): Promise<PublishedMenu | null>;
  updateCategory(ownerId: string, restaurantId: string, categoryId: string, values: CategoryPatch): Promise<PublishedMenu | null>;
}

export interface ProductManagementRepository {
  createProduct(ownerId: string, restaurantId: string, values: ProductValues): Promise<PublishedMenu | null>;
  deleteProduct(ownerId: string, restaurantId: string, productId: string): Promise<ProductDeletionResult | null>;
  findProductForOwner(ownerId: string, restaurantId: string, productId: string): Promise<ProductAssetRecord | null>;
  reorderProducts(ownerId: string, restaurantId: string, categoryId: string, orderedIds: string[]): Promise<PublishedMenu | null>;
  setProductImagePath(ownerId: string, restaurantId: string, productId: string, imagePath: string | null): Promise<PublishedMenu | null>;
  updateProduct(ownerId: string, restaurantId: string, productId: string, patch: ProductPatch): Promise<PublishedMenu | null>;
}

export interface ProductImageReadRepository {
  findPublicProductImage(slug: string, productId: string): Promise<string | null>;
  findProductForOwner(ownerId: string, restaurantId: string, productId: string): Promise<ProductAssetRecord | null>;
}
