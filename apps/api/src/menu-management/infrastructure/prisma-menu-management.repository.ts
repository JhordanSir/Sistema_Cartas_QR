import type { PrismaService } from '../../prisma/prisma.service.js';
import type {
  CategoryDeletionResult,
  CategoryManagementRepository,
  CategoryPatch,
  CategoryValues,
  ProductDeletionResult,
  ProductImageReadRepository,
  ProductManagementRepository,
} from '../application/ports/menu-management.repositories.js';
import type {
  ProductAssetRecord,
  ProductPatch,
  ProductValues,
} from '../domain/menu-management.types.js';
import type { PublishedMenu } from '../../digitization/domain/menu.types.js';
import {
  menuInclude,
  parseMenuSnapshot,
  preserveCurrentPublicMenu,
  toOwnedMenu,
} from '../../digitization/domain/menu-publication.js';

export class PrismaMenuManagementRepository
  implements
    CategoryManagementRepository,
    ProductManagementRepository,
    ProductImageReadRepository
{
  constructor(private readonly prisma: PrismaService) {}

  async createCategory(
    ownerId: string,
    restaurantId: string,
    values: CategoryValues,
  ): Promise<PublishedMenu | null> {
    const created = await this.prisma.$transaction(async (transaction) => {
      if (!(await this.isOwned(transaction, ownerId, restaurantId))) return false;
      await preserveCurrentPublicMenu(transaction, restaurantId);
      const aggregate = await transaction.category.aggregate({
        _max: { sortOrder: true },
        where: { restaurantId },
      });
      await transaction.category.create({
        data: {
          ...values,
          restaurantId,
          sortOrder: (aggregate._max.sortOrder ?? -1) + 1,
        },
      });
      await this.touchRestaurant(transaction, restaurantId);
      return true;
    });
    return created ? this.findMenu(ownerId, restaurantId) : null;
  }

  async updateCategory(
    ownerId: string,
    restaurantId: string,
    categoryId: string,
    values: CategoryPatch,
  ): Promise<PublishedMenu | null> {
    const updated = await this.prisma.$transaction(async (transaction) => {
      const category = await transaction.category.findFirst({
        select: { id: true },
        where: {
          id: categoryId,
          restaurantId,
          restaurant: { owners: { some: { ownerId } } },
        },
      });
      if (!category) return false;
      await preserveCurrentPublicMenu(transaction, restaurantId);
      await transaction.category.update({ data: values, where: { id: categoryId } });
      await this.touchRestaurant(transaction, restaurantId);
      return true;
    });
    return updated ? this.findMenu(ownerId, restaurantId) : null;
  }

  async deleteCategory(
    ownerId: string,
    restaurantId: string,
    categoryId: string,
  ): Promise<CategoryDeletionResult | null> {
    const imagePaths = await this.prisma.$transaction(async (transaction) => {
      const category = await transaction.category.findFirst({
        include: { products: { select: { imagePath: true } } },
        where: {
          id: categoryId,
          restaurantId,
          restaurant: { owners: { some: { ownerId } } },
        },
      });
      if (!category) return null;
      await preserveCurrentPublicMenu(transaction, restaurantId);
      await transaction.category.delete({ where: { id: categoryId } });
      await this.compactCategoryOrder(transaction, restaurantId);
      await this.touchRestaurant(transaction, restaurantId);
      return category.products.flatMap((product) =>
        product.imagePath ? [product.imagePath] : [],
      );
    });
    if (!imagePaths) return null;
    const menu = await this.findMenu(ownerId, restaurantId);
    return menu ? { imagePaths, menu } : null;
  }

  async reorderCategories(
    ownerId: string,
    restaurantId: string,
    orderedIds: string[],
  ): Promise<PublishedMenu | null> {
    const reordered = await this.prisma.$transaction(async (transaction) => {
      if (!(await this.isOwned(transaction, ownerId, restaurantId))) return false;
      await preserveCurrentPublicMenu(transaction, restaurantId);
      const records = await transaction.category.findMany({
        select: { id: true },
        where: { restaurantId },
      });
      if (!sameIds(records.map(({ id }) => id), orderedIds)) return false;
      for (const [sortOrder, id] of orderedIds.entries()) {
        await transaction.category.update({ data: { sortOrder }, where: { id } });
      }
      await this.touchRestaurant(transaction, restaurantId);
      return true;
    });
    return reordered ? this.findMenu(ownerId, restaurantId) : null;
  }

  async createProduct(
    ownerId: string,
    restaurantId: string,
    values: ProductValues,
  ): Promise<PublishedMenu | null> {
    const created = await this.prisma.$transaction(async (transaction) => {
      const category = await transaction.category.findFirst({
        select: { id: true },
        where: {
          id: values.categoryId,
          restaurantId,
          restaurant: { owners: { some: { ownerId } } },
        },
      });
      if (!category) return false;
      await preserveCurrentPublicMenu(transaction, restaurantId);
      const aggregate = await transaction.product.aggregate({
        _max: { sortOrder: true },
        where: { categoryId: values.categoryId, restaurantId },
      });
      const product = await transaction.product.create({
        data: {
          basePrice: values.basePrice,
          categoryId: values.categoryId,
          description: values.description,
          name: values.name,
          restaurantId,
          sortOrder: (aggregate._max.sortOrder ?? -1) + 1,
        },
      });
      await this.replaceOptions(transaction, restaurantId, product.id, values.variants, values.extras);
      await this.touchRestaurant(transaction, restaurantId);
      return true;
    });
    return created ? this.findMenu(ownerId, restaurantId) : null;
  }

  async updateProduct(
    ownerId: string,
    restaurantId: string,
    productId: string,
    patch: ProductPatch,
  ): Promise<PublishedMenu | null> {
    const updated = await this.prisma.$transaction(async (transaction) => {
      const current = await transaction.product.findFirst({
        select: { categoryId: true, id: true },
        where: {
          id: productId,
          restaurantId,
          restaurant: { owners: { some: { ownerId } } },
        },
      });
      if (!current) return false;
      await preserveCurrentPublicMenu(transaction, restaurantId);

      let nextSortOrder: number | undefined;
      if (patch.categoryId && patch.categoryId !== current.categoryId) {
        const category = await transaction.category.findFirst({
          select: { id: true },
          where: { id: patch.categoryId, restaurantId },
        });
        if (!category) return false;
        const aggregate = await transaction.product.aggregate({
          _max: { sortOrder: true },
          where: { categoryId: patch.categoryId, restaurantId },
        });
        nextSortOrder = (aggregate._max.sortOrder ?? -1) + 1;
      }

      const { extras, variants, ...productPatch } = patch;
      await transaction.product.update({
        data: {
          ...productPatch,
          ...(nextSortOrder === undefined ? {} : { sortOrder: nextSortOrder }),
        },
        where: { id: productId },
      });
      if (variants !== undefined) {
        await transaction.productVariant.deleteMany({ where: { productId, restaurantId } });
        if (variants.length > 0) {
          await transaction.productVariant.createMany({
            data: variants.map((variant, sortOrder) => ({
              ...variant,
              productId,
              restaurantId,
              sortOrder,
            })),
          });
        }
      }
      if (extras !== undefined) {
        await transaction.productExtra.deleteMany({ where: { productId, restaurantId } });
        if (extras.length > 0) {
          await transaction.productExtra.createMany({
            data: extras.map((extra, sortOrder) => ({
              ...extra,
              productId,
              restaurantId,
              sortOrder,
            })),
          });
        }
      }
      if (nextSortOrder !== undefined) {
        await this.compactProductOrder(transaction, restaurantId, current.categoryId);
      }
      await this.touchRestaurant(transaction, restaurantId);
      return true;
    });
    return updated ? this.findMenu(ownerId, restaurantId) : null;
  }

  async deleteProduct(
    ownerId: string,
    restaurantId: string,
    productId: string,
  ): Promise<ProductDeletionResult | null> {
    const imagePath = await this.prisma.$transaction(async (transaction) => {
      const product = await transaction.product.findFirst({
        select: { categoryId: true, imagePath: true },
        where: {
          id: productId,
          restaurantId,
          restaurant: { owners: { some: { ownerId } } },
        },
      });
      if (!product) return undefined;
      await preserveCurrentPublicMenu(transaction, restaurantId);
      await transaction.product.delete({ where: { id: productId } });
      await this.compactProductOrder(transaction, restaurantId, product.categoryId);
      await this.touchRestaurant(transaction, restaurantId);
      return product.imagePath;
    });
    if (imagePath === undefined) return null;
    const menu = await this.findMenu(ownerId, restaurantId);
    return menu ? { imagePath, menu } : null;
  }

  async reorderProducts(
    ownerId: string,
    restaurantId: string,
    categoryId: string,
    orderedIds: string[],
  ): Promise<PublishedMenu | null> {
    const reordered = await this.prisma.$transaction(async (transaction) => {
      const category = await transaction.category.findFirst({
        select: { id: true },
        where: {
          id: categoryId,
          restaurantId,
          restaurant: { owners: { some: { ownerId } } },
        },
      });
      if (!category) return false;
      await preserveCurrentPublicMenu(transaction, restaurantId);
      const products = await transaction.product.findMany({
        select: { id: true },
        where: { categoryId, restaurantId },
      });
      if (!sameIds(products.map(({ id }) => id), orderedIds)) return false;
      for (const [sortOrder, id] of orderedIds.entries()) {
        await transaction.product.update({ data: { sortOrder }, where: { id } });
      }
      await this.touchRestaurant(transaction, restaurantId);
      return true;
    });
    return reordered ? this.findMenu(ownerId, restaurantId) : null;
  }

  async findProductForOwner(
    ownerId: string,
    restaurantId: string,
    productId: string,
  ): Promise<ProductAssetRecord | null> {
    const product = await this.prisma.product.findFirst({
      select: { id: true, imagePath: true, restaurantId: true },
      where: {
        id: productId,
        restaurantId,
        restaurant: { owners: { some: { ownerId } } },
      },
    });
    return product
      ? { imagePath: product.imagePath, productId: product.id, restaurantId: product.restaurantId }
      : null;
  }

  async setProductImagePath(
    ownerId: string,
    restaurantId: string,
    productId: string,
    imagePath: string | null,
  ): Promise<PublishedMenu | null> {
    const updated = await this.prisma.$transaction(async (transaction) => {
      const product = await transaction.product.findFirst({
        select: { id: true },
        where: {
          id: productId,
          restaurantId,
          restaurant: { owners: { some: { ownerId } } },
        },
      });
      if (!product) return false;
      await preserveCurrentPublicMenu(transaction, restaurantId);
      await transaction.product.update({ data: { imagePath }, where: { id: productId } });
      await this.touchRestaurant(transaction, restaurantId);
      return true;
    });
    return updated ? this.findMenu(ownerId, restaurantId) : null;
  }

  async findPublicProductImage(slug: string, productId: string): Promise<string | null> {
    const published = await this.prisma.restaurant.findFirst({
      select: { publicationInitialized: true, publishedMenu: true },
      where: { slug, status: 'ENABLED' },
    });
    const snapshot = published ? parseMenuSnapshot(published.publishedMenu) : null;
    if (snapshot) {
      for (const category of snapshot.categories) {
        const product = category.products.find((item) => item.id === productId && item.isAvailable);
        if (product) return product.imagePath;
      }
      return null;
    }
    if (published?.publicationInitialized) return null;
    const product = await this.prisma.product.findFirst({
      select: { imagePath: true },
      where: {
        id: productId,
        isAvailable: true,
        restaurant: { slug, status: 'ENABLED' },
      },
    });
    return product?.imagePath ?? null;
  }

  private async findMenu(ownerId: string, restaurantId: string): Promise<PublishedMenu | null> {
    const restaurant = await this.prisma.restaurant.findFirst({
      include: menuInclude,
      where: { id: restaurantId, owners: { some: { ownerId } } },
    });
    return restaurant ? toOwnedMenu(restaurant) : null;
  }

  private async isOwned(
    transaction: Pick<PrismaService, 'restaurant'>,
    ownerId: string,
    restaurantId: string,
  ): Promise<boolean> {
    return (
      (await transaction.restaurant.count({
        where: { id: restaurantId, owners: { some: { ownerId } } },
      })) === 1
    );
  }

  private async touchRestaurant(
    transaction: Pick<PrismaService, 'restaurant'>,
    restaurantId: string,
  ): Promise<void> {
    await transaction.restaurant.update({
      data: { updatedAt: new Date() },
      where: { id: restaurantId },
    });
  }

  private async replaceOptions(
    transaction: Pick<PrismaService, 'productExtra' | 'productVariant'>,
    restaurantId: string,
    productId: string,
    variants: ProductValues['variants'],
    extras: ProductValues['extras'],
  ): Promise<void> {
    if (variants.length > 0) {
      await transaction.productVariant.createMany({
        data: variants.map((variant, sortOrder) => ({
          ...variant,
          productId,
          restaurantId,
          sortOrder,
        })),
      });
    }
    if (extras.length > 0) {
      await transaction.productExtra.createMany({
        data: extras.map((extra, sortOrder) => ({
          ...extra,
          productId,
          restaurantId,
          sortOrder,
        })),
      });
    }
  }

  private async compactCategoryOrder(
    transaction: Pick<PrismaService, 'category'>,
    restaurantId: string,
  ): Promise<void> {
    const categories = await transaction.category.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      select: { id: true },
      where: { restaurantId },
    });
    for (const [sortOrder, category] of categories.entries()) {
      await transaction.category.update({ data: { sortOrder }, where: { id: category.id } });
    }
  }

  private async compactProductOrder(
    transaction: Pick<PrismaService, 'product'>,
    restaurantId: string,
    categoryId: string,
  ): Promise<void> {
    const products = await transaction.product.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      select: { id: true },
      where: { categoryId, restaurantId },
    });
    for (const [sortOrder, product] of products.entries()) {
      await transaction.product.update({ data: { sortOrder }, where: { id: product.id } });
    }
  }
}

function sameIds(current: string[], requested: string[]): boolean {
  return (
    current.length === requested.length &&
    current.every((id) => requested.includes(id))
  );
}
