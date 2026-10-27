import type { PrismaService } from '../../prisma/prisma.service.js';
import type { CsvFileRepository } from '../application/ports/csv-file.ports.js';
import type { CsvFileRecord } from '../domain/csv-file.types.js';

const CSV_FILE_FIELDS = {
  originalName: true,
  relativePath: true,
  sizeBytes: true,
  uploadedAt: true,
} as const;

export class PrismaCsvFileRepository implements CsvFileRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findCsvFile(ownerId: string, restaurantId: string): Promise<CsvFileRecord | null> {
    return this.prisma.restaurantCsvFile.findFirst({
      select: CSV_FILE_FIELDS,
      where: { restaurant: { owners: { some: { ownerId } } }, restaurantId },
    });
  }

  async isOwnedRestaurant(ownerId: string, restaurantId: string): Promise<boolean> {
    return (
      (await this.prisma.restaurant.count({
        where: { id: restaurantId, owners: { some: { ownerId } } },
      })) === 1
    );
  }

  async replaceCsvFile(
    ownerId: string,
    restaurantId: string,
    file: Omit<CsvFileRecord, 'uploadedAt'>,
  ): Promise<{ current: CsvFileRecord; previous: CsvFileRecord | null } | null> {
    return this.prisma.$transaction(async (transaction) => {
      const owned = await transaction.restaurant.count({
        where: { id: restaurantId, owners: { some: { ownerId } } },
      });
      if (owned !== 1) return null;
      const previous = await transaction.restaurantCsvFile.findUnique({
        select: CSV_FILE_FIELDS,
        where: { restaurantId },
      });
      const uploadedAt = new Date();
      const current = await transaction.restaurantCsvFile.upsert({
        create: { ...file, restaurantId, uploadedAt },
        select: CSV_FILE_FIELDS,
        update: { ...file, uploadedAt },
        where: { restaurantId },
      });
      return { current, previous };
    });
  }
}
