import type { PrismaService } from '../../prisma/prisma.service.js';
import type {
  MenuPublicationRepository,
  PublishMenuResult,
  ProductCorrection,
} from '../application/ports/menu-publication.repository.js';
import type {
  ExtractedMenu,
  PublishedMenu,
} from '../domain/menu.types.js';
import {
  hasPublishableProducts,
  menuInclude,
  parseStoredMenuStyle,
  preserveCurrentPublicMenu,
  resolveTemplateStyle,
  toMenuSnapshot,
  toOwnedMenu,
  type MenuTemplateId,
} from '../domain/menu-publication.js';
import type { Prisma } from '../../generated/prisma/client.js';

export class PrismaMenuPublicationRepository implements MenuPublicationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async existsForOwner(ownerId: string, restaurantId: string): Promise<boolean> {
    return (
      (await this.prisma.restaurant.count({
        where: { id: restaurantId, owners: { some: { ownerId } } },
      })) === 1
    );
  }

  async findForOwner(ownerId: string, restaurantId: string): Promise<PublishedMenu | null> {
    const restaurant = await this.prisma.restaurant.findFirst({
      include: menuInclude,
      where: { id: restaurantId, owners: { some: { ownerId } } },
    });
    return restaurant ? toOwnedMenu(restaurant) : null;
  }

  async replaceForOwner(
    ownerId: string,
    restaurantId: string,
    menu: ExtractedMenu,
  ): Promise<PublishedMenu | null> {
    return this.prisma.$transaction(async (transaction) => {
      const restaurant = await transaction.restaurant.findFirst({
        select: { id: true },
        where: { id: restaurantId, owners: { some: { ownerId } } },
      });
      if (!restaurant) return null;

      await preserveCurrentPublicMenu(transaction, restaurantId);
      await transaction.category.deleteMany({ where: { restaurantId } });
      await transaction.restaurant.update({
        data: {
          ...menu.style,
          menuTemplate: 'ORIGINAL',
          sourceStyle: menu.style as unknown as Prisma.InputJsonValue,
        },
        where: { id: restaurantId },
      });

      for (const [categoryOrder, category] of menu.categories.entries()) {
        const createdCategory = await transaction.category.create({
          data: { name: category.name, restaurantId, sortOrder: categoryOrder },
        });
        for (const [productOrder, product] of category.products.entries()) {
          const createdProduct = await transaction.product.create({
            data: {
              basePrice: product.basePrice,
              categoryId: createdCategory.id,
              description: product.description,
              name: product.name,
              restaurantId,
              sortOrder: productOrder,
            },
          });
          if (product.variants.length > 0) {
            await transaction.productVariant.createMany({
              data: product.variants.map((variant, sortOrder) => ({
                name: variant.name,
                price: variant.price,
                productId: createdProduct.id,
                restaurantId,
                sortOrder,
              })),
            });
          }
          if (product.extras.length > 0) {
            await transaction.productExtra.createMany({
              data: product.extras.map((extra, sortOrder) => ({
                name: extra.name,
                price: extra.price,
                productId: createdProduct.id,
                restaurantId,
                sortOrder,
              })),
            });
          }
        }
      }

      const draft = await transaction.restaurant.findUnique({
        include: menuInclude,
        where: { id: restaurantId },
      });
      return draft ? toOwnedMenu(draft) : null;
    });
  }

  async publishForOwner(
    ownerId: string,
    restaurantId: string,
  ): Promise<PublishMenuResult> {
    return this.prisma.$transaction(async (transaction) => {
      const restaurant = await transaction.restaurant.findFirst({
        include: menuInclude,
        where: { id: restaurantId, owners: { some: { ownerId } } },
      });
      if (!restaurant) return { kind: 'not-found' } as const;
      const snapshot = toMenuSnapshot(restaurant);
      if (!hasPublishableProducts(snapshot)) return { kind: 'empty' } as const;
      const published = await transaction.restaurant.update({
        data: {
          publishedAt: new Date(),
          publishedMenu: snapshot as unknown as Prisma.InputJsonValue,
          publicationInitialized: true,
        },
        include: menuInclude,
        where: { id: restaurantId },
      });
      return { kind: 'published', menu: toOwnedMenu(published) } as const;
    });
  }

  async updateProductForOwner(
    ownerId: string,
    restaurantId: string,
    productId: string,
    correction: ProductCorrection,
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
      await transaction.product.update({ data: correction, where: { id: productId } });
      return true;
    });
    return updated ? this.findForOwner(ownerId, restaurantId) : null;
  }

  async setTemplateForOwner(
    ownerId: string,
    restaurantId: string,
    template: MenuTemplateId,
  ): Promise<PublishedMenu | null> {
    const changed = await this.prisma.$transaction(async (transaction) => {
      const restaurant = await transaction.restaurant.findFirst({
        select: {
          backgroundColor: true,
          fontFamily: true,
          id: true,
          sourceStyle: true,
          textColor: true,
        },
        where: { id: restaurantId, owners: { some: { ownerId } } },
      });
      if (!restaurant) return false;
      await preserveCurrentPublicMenu(transaction, restaurantId);
      const originalStyle = parseStoredMenuStyle(restaurant.sourceStyle) ?? {
        backgroundColor: restaurant.backgroundColor,
        fontFamily: restaurant.fontFamily as PublishedMenu['style']['fontFamily'],
        textColor: restaurant.textColor,
      };
      await transaction.restaurant.update({
        data: {
          ...resolveTemplateStyle(template, originalStyle),
          menuTemplate: template,
          sourceStyle: originalStyle as unknown as Prisma.InputJsonValue,
        },
        where: { id: restaurantId },
      });
      return true;
    });
    return changed ? this.findForOwner(ownerId, restaurantId) : null;
  }
}
