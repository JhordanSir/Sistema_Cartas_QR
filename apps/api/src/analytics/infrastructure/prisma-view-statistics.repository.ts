import { Prisma, RestaurantStatus } from '../../generated/prisma/client.js';
import type { PrismaService } from '../../prisma/prisma.service.js';
import type {
  RecordPublicViewRecord,
  RecordPublicViewResult,
  ViewStatisticsRepository,
} from '../application/ports/view-statistics.repository.js';
import { storedDateToPeruDate } from '../domain/peru-time.js';
import type { ViewStatisticsBucket } from '../domain/view-statistics.types.js';

export class PrismaViewStatisticsRepository implements ViewStatisticsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async recordUniquePublicView(
    input: RecordPublicViewRecord,
  ): Promise<RecordPublicViewResult> {
    const restaurant = await this.prisma.restaurant.findFirst({
      select: { id: true },
      where: { slug: input.slug, status: RestaurantStatus.ENABLED },
    });
    if (!restaurant) return 'unavailable';

    try {
      await this.prisma.viewEvent.create({
        data: {
          restaurantId: restaurant.id,
          viewDate: input.viewDate,
          viewedAt: input.viewedAt,
          viewHour: input.viewHour,
          visitorHash: input.visitorHash,
        },
      });
      return 'recorded';
    } catch (error) {
      if (this.isUniqueConstraintError(error)) return 'duplicate';
      throw error;
    }
  }

  async getBucketsForRestaurant(
    restaurantId: string,
  ): Promise<ViewStatisticsBucket[] | null> {
    const exists = await this.prisma.restaurant.findUnique({
      select: { id: true },
      where: { id: restaurantId },
    });
    if (!exists) return null;

    const [events, summaries] = await this.prisma.$transaction([
      this.prisma.viewEvent.groupBy({
        _count: { _all: true },
        by: ['viewDate', 'viewHour'],
        orderBy: [{ viewDate: 'asc' }, { viewHour: 'asc' }],
        where: { restaurantId },
      }),
      this.prisma.viewSummary.groupBy({
        _sum: { viewCount: true },
        by: ['summaryDate', 'viewHour'],
        orderBy: [{ summaryDate: 'asc' }, { viewHour: 'asc' }],
        where: { restaurantId },
      }),
    ]);

    return [
      ...events.map((event) => ({
        date: storedDateToPeruDate(event.viewDate),
        hour: event.viewHour,
        viewCount: event._count._all,
      })),
      ...summaries.map((summary) => ({
        date: storedDateToPeruDate(summary.summaryDate),
        hour: summary.viewHour,
        viewCount: summary._sum.viewCount ?? 0,
      })),
    ];
  }

  async consolidateEventsBefore(cutoffDate: Date): Promise<number> {
    return this.prisma.$transaction(async (transaction) => {
      await transaction.$executeRaw(
        Prisma.sql`
          INSERT INTO "ViewSummary" ("restaurantId", "summaryDate", "viewHour", "viewCount", "createdAt", "updatedAt")
          SELECT
            "restaurantId",
            "viewDate",
            "viewHour",
            COUNT(*)::integer,
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
          FROM "ViewEvent"
          WHERE "viewDate" < ${cutoffDate}
          GROUP BY "restaurantId", "viewDate", "viewHour"
          ON CONFLICT ("restaurantId", "summaryDate", "viewHour")
          DO UPDATE SET
            "viewCount" = "ViewSummary"."viewCount" + EXCLUDED."viewCount",
            "updatedAt" = CURRENT_TIMESTAMP
        `,
      );
      const removed = await transaction.viewEvent.deleteMany({
        where: { viewDate: { lt: cutoffDate } },
      });
      return removed.count;
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
}
