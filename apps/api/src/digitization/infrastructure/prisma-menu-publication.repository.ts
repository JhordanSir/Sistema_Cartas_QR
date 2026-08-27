import type { PrismaService } from '../../prisma/prisma.service.js';
import type {
  MenuPublicationRepository,
  ProductCorrection,
} from '../application/ports/menu-publication.repository.js';
import type {
  ExtractedMenu,
  PublishedMenu,
} from '../domain/menu.types.js';

const menuInclude = {
  categories: {
    include: {
      products: {
        include: {
          extras: { orderBy: { sortOrder: 'asc' as const } },
          variants: { orderBy: { sortOrder: 'asc' as const } },
        },
        orderBy: { sortOrder: 'asc' as const },
      },
    },
    orderBy: { sortOrder: 'asc' as const },
  },
} as const;

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
    return restaurant ? this.toPublishedMenu(restaurant) : null;
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

      await transaction.category.deleteMany({ where: { restaurantId } });
      await transaction.restaurant.update({
        data: menu.style,
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

      const published = await transaction.restaurant.findUnique({
        include: menuInclude,
        where: { id: restaurantId },
      });
      return published ? this.toPublishedMenu(published) : null;
    });
  }

  async updateProductForOwner(
    ownerId: string,
    restaurantId: string,
    productId: string,
    correction: ProductCorrection,
  ): Promise<PublishedMenu | null> {
    const updated = await this.prisma.product.updateMany({
      data: correction,
      where: {
        id: productId,
        restaurantId,
        restaurant: { owners: { some: { ownerId } } },
      },
    });
    return updated.count === 1 ? this.findForOwner(ownerId, restaurantId) : null;
  }

  private toPublishedMenu(record: {
    backgroundColor: string;
    categories: Array<{
      id: string;
      name: string;
      products: Array<{
        basePrice: { toFixed(digits: number): string };
        description: string | null;
        extras: Array<{ id: string; name: string; price: { toFixed(digits: number): string } }>;
        id: string;
        imagePath: string | null;
        isAvailable: boolean;
        name: string;
        variants: Array<{ id: string; name: string; price: { toFixed(digits: number): string } }>;
      }>;
    }>;
    fontFamily: string;
    id: string;
    textColor: string;
    updatedAt: Date;
  }): PublishedMenu {
    return {
      categories: record.categories.map((category) => ({
        id: category.id,
        name: category.name,
        products: category.products.map((product) => ({
          basePrice: product.basePrice.toFixed(2),
          description: product.description,
          extras: product.extras.map((extra) => ({
            id: extra.id,
            name: extra.name,
            price: extra.price.toFixed(2),
          })),
          id: product.id,
          imagePath: product.imagePath,
          isAvailable: product.isAvailable,
          name: product.name,
          variants: product.variants.map((variant) => ({
            id: variant.id,
            name: variant.name,
            price: variant.price.toFixed(2),
          })),
        })),
      })),
      restaurantId: record.id,
      style: {
        backgroundColor: record.backgroundColor,
        fontFamily: record.fontFamily as PublishedMenu['style']['fontFamily'],
        textColor: record.textColor,
      },
      updatedAt: record.updatedAt.toISOString(),
    };
  }
}
