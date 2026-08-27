import {
  type Owner,
  Prisma,
  type Restaurant,
  type RestaurantStatus as PrismaRestaurantStatus,
} from '../../generated/prisma/client.js';
import type { PrismaService } from '../../prisma/prisma.service.js';
import type {
  CreateRestaurantRecord,
  CreateRestaurantResult,
  ListRestaurantsQuery,
  RestaurantRepository,
} from '../application/ports/restaurant.repository.js';
import type {
  RestaurantProfileRepository,
  UpdateRestaurantProfileRecord,
} from '../application/ports/restaurant-profile.repository.js';
import { RestaurantStatus } from '../domain/restaurant-status.js';
import type {
  AssetDeletionJob,
  PaginatedRestaurants,
  PublicRestaurant,
  RestaurantSummary,
  RestaurantProfile,
} from '../domain/restaurant.types.js';

type RestaurantWithOwners = Restaurant & {
  owners: Array<{ owner: Owner }>;
};

export class PrismaRestaurantRepository
  implements RestaurantRepository, RestaurantProfileRepository
{
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateRestaurantRecord): Promise<CreateRestaurantResult> {
    try {
      const created = await this.prisma.$transaction(async (transaction) => {
        const owner = await transaction.owner.create({
          data: {
            email: input.email,
            passwordHash: input.passwordHash,
          },
        });
        const restaurant = await transaction.restaurant.create({
          data: {
            name: input.name,
            slug: input.slug,
          },
        });
        await transaction.restaurantOwner.create({
          data: {
            ownerId: owner.id,
            restaurantId: restaurant.id,
          },
        });
        return { ...restaurant, owners: [{ owner }] };
      });

      return { kind: 'created', restaurant: this.toSummary(created) };
    } catch (error) {
      if (!this.isUniqueConstraintError(error)) {
        throw error;
      }
      const target = JSON.stringify(error.meta?.target ?? '').toLowerCase();
      return target.includes('email')
        ? { kind: 'email-conflict' }
        : { kind: 'slug-conflict' };
    }
  }

  async slugExists(slug: string): Promise<boolean> {
    return (await this.prisma.restaurant.count({ where: { slug } })) > 0;
  }

  async list(query: ListRestaurantsQuery): Promise<PaginatedRestaurants> {
    const where: Prisma.RestaurantWhereInput = {
      ...(query.status ? { status: this.toPrismaStatus(query.status) } : {}),
      ...(query.query
        ? {
            OR: [
              { name: { contains: query.query, mode: 'insensitive' } },
              { slug: { contains: query.query, mode: 'insensitive' } },
              {
                owners: {
                  some: {
                    owner: {
                      email: { contains: query.query, mode: 'insensitive' },
                    },
                  },
                },
              },
            ],
          }
        : {}),
    };
    const [records, total] = await this.prisma.$transaction([
      this.prisma.restaurant.findMany({
        include: { owners: { include: { owner: true }, take: 1 } },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        where,
      }),
      this.prisma.restaurant.count({ where }),
    ]);

    return {
      items: records.map((record) => this.toSummary(record)),
      page: query.page,
      pageSize: query.pageSize,
      total,
    };
  }

  async findById(id: string): Promise<RestaurantSummary | null> {
    const restaurant = await this.prisma.restaurant.findUnique({
      include: { owners: { include: { owner: true }, take: 1 } },
      where: { id },
    });
    return restaurant ? this.toSummary(restaurant) : null;
  }

  async listProfilesByOwner(ownerId: string): Promise<RestaurantProfile[]> {
    const restaurants = await this.prisma.restaurant.findMany({
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      where: { owners: { some: { ownerId } } },
    });
    return restaurants.map((restaurant) => this.toProfile(restaurant));
  }

  async findProfileForOwner(
    ownerId: string,
    restaurantId: string,
  ): Promise<RestaurantProfile | null> {
    const restaurant = await this.prisma.restaurant.findFirst({
      where: {
        id: restaurantId,
        owners: { some: { ownerId } },
      },
    });
    return restaurant ? this.toProfile(restaurant) : null;
  }

  async updateProfileForOwner(
    ownerId: string,
    restaurantId: string,
    input: UpdateRestaurantProfileRecord,
  ): Promise<RestaurantProfile | null> {
    const updated = await this.prisma.restaurant.updateMany({
      data: input,
      where: {
        id: restaurantId,
        owners: { some: { ownerId } },
      },
    });
    return updated.count === 1
      ? this.findProfileForOwner(ownerId, restaurantId)
      : null;
  }

  async updateStatus(
    id: string,
    status: RestaurantStatus,
  ): Promise<RestaurantSummary | null> {
    const updated = await this.prisma.restaurant.updateMany({
      data: { status: this.toPrismaStatus(status) },
      where: { id },
    });
    return updated.count === 1 ? this.findById(id) : null;
  }

  async findPublicBySlug(slug: string): Promise<PublicRestaurant | null> {
    const restaurant = await this.prisma.restaurant.findFirst({
      include: {
        categories: {
          include: {
            products: {
              include: {
                extras: { orderBy: { sortOrder: 'asc' } },
                variants: { orderBy: { sortOrder: 'asc' } },
              },
              orderBy: { sortOrder: 'asc' },
              where: { isAvailable: true },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
      where: { slug, status: RestaurantStatus.ENABLED },
    });
    if (!restaurant) {
      return null;
    }
    return {
      backgroundColor: restaurant.backgroundColor,
      categories: restaurant.categories
        .filter((category) => category.products.length > 0)
        .map((category) => ({
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
            hasImage: product.imagePath !== null,
            id: product.id,
            name: product.name,
            variants: product.variants.map((variant) => ({
              id: variant.id,
              name: variant.name,
              price: variant.price.toFixed(2),
            })),
          })),
        })),
      fontFamily: restaurant.fontFamily,
      id: restaurant.id,
      logoPath: restaurant.logoPath,
      name: restaurant.name,
      slug: restaurant.slug,
      textColor: restaurant.textColor,
    };
  }

  async scheduleDeletion(
    restaurantId: string,
    relativePath: string,
  ): Promise<AssetDeletionJob | null> {
    return this.prisma.$transaction(async (transaction) => {
      const restaurant = await transaction.restaurant.findUnique({
        include: { owners: { select: { ownerId: true } } },
        where: { id: restaurantId },
      });
      if (!restaurant) {
        return null;
      }

      const job = await transaction.assetDeletionJob.create({
        data: { relativePath, restaurantId },
      });
      await transaction.restaurant.delete({ where: { id: restaurantId } });
      const ownerIds = restaurant.owners.map(({ ownerId }) => ownerId);
      if (ownerIds.length > 0) {
        await transaction.owner.deleteMany({
          where: {
            id: { in: ownerIds },
            restaurants: { none: {} },
          },
        });
      }
      return {
        id: job.id,
        relativePath: job.relativePath,
        restaurantId: job.restaurantId,
      };
    });
  }

  async listPendingAssetDeletions(): Promise<AssetDeletionJob[]> {
    const jobs = await this.prisma.assetDeletionJob.findMany({
      orderBy: { createdAt: 'asc' },
      take: 100,
    });
    return jobs.map(({ id, relativePath, restaurantId }) => ({
      id,
      relativePath,
      restaurantId,
    }));
  }

  async completeAssetDeletion(jobId: string): Promise<void> {
    await this.prisma.assetDeletionJob.deleteMany({ where: { id: jobId } });
  }

  async markAssetDeletionFailed(jobId: string, message: string): Promise<void> {
    await this.prisma.assetDeletionJob.updateMany({
      data: {
        attempts: { increment: 1 },
        lastError: message.slice(0, 4_000),
      },
      where: { id: jobId },
    });
  }

  private isUniqueConstraintError(
    error: unknown,
  ): error is Prisma.PrismaClientKnownRequestError {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }

  private toSummary(record: RestaurantWithOwners): RestaurantSummary {
    const owner = record.owners[0]?.owner;
    if (!owner) {
      throw new Error(`Restaurant ${record.id} has no owner`);
    }
    return {
      createdAt: record.createdAt.toISOString(),
      id: record.id,
      name: record.name,
      owner: {
        email: owner.email,
        id: owner.id,
        isActive: owner.isActive,
      },
      slug: record.slug,
      status: record.status as RestaurantStatus,
      updatedAt: record.updatedAt.toISOString(),
    };
  }

  private toProfile(record: Restaurant): RestaurantProfile {
    return {
      address: record.address,
      contactPhone: record.contactPhone,
      facebookUrl: record.facebookUrl,
      id: record.id,
      instagramUrl: record.instagramUrl,
      logoPath: record.logoPath,
      name: record.name,
      slug: record.slug,
      status: record.status as RestaurantStatus,
      tiktokUrl: record.tiktokUrl,
      updatedAt: record.updatedAt.toISOString(),
      whatsapp: record.whatsapp,
    };
  }

  private toPrismaStatus(status: RestaurantStatus): PrismaRestaurantStatus {
    return status;
  }
}
