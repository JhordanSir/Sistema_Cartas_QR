import type { ViewStatisticsBucket } from '../../domain/view-statistics.types.js';

export interface RecordPublicViewRecord {
  slug: string;
  viewDate: Date;
  viewedAt: Date;
  viewHour: number;
  visitorHash: string;
}

export type RecordPublicViewResult = 'duplicate' | 'recorded' | 'unavailable';

export interface ViewStatisticsRepository {
  consolidateEventsBefore(cutoffDate: Date): Promise<number>;
  getBucketsForRestaurant(restaurantId: string): Promise<ViewStatisticsBucket[] | null>;
  recordUniquePublicView(input: RecordPublicViewRecord): Promise<RecordPublicViewResult>;
}
