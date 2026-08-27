import type { PublicRestaurant } from '../../domain/restaurant.types.js';
import type { RestaurantRepository } from '../ports/restaurant.repository.js';

export class GetPublicRestaurant {
  constructor(private readonly repository: RestaurantRepository) {}

  execute(slug: string): Promise<PublicRestaurant | null> {
    return this.repository.findPublicBySlug(slug);
  }
}
