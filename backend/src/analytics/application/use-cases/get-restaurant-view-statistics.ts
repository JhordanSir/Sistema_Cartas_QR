import { toPeruDateTime } from '../../domain/peru-time.js';
import {
  calculateRestaurantViewStatistics,
  type RestaurantViewStatistics,
} from '../../domain/view-statistics.types.js';
import type { ViewStatisticsRepository } from '../ports/view-statistics.repository.js';

export interface GetRestaurantViewStatisticsInput {
  now?: Date;
  restaurantId: string;
}

export class GetRestaurantViewStatistics {
  constructor(private readonly repository: ViewStatisticsRepository) {}

  async execute(
    input: GetRestaurantViewStatisticsInput,
  ): Promise<RestaurantViewStatistics | null> {
    const buckets = await this.repository.getBucketsForRestaurant(input.restaurantId);
    if (!buckets) return null;
    return calculateRestaurantViewStatistics(
      buckets,
      toPeruDateTime(input.now ?? new Date()).date,
    );
  }
}
