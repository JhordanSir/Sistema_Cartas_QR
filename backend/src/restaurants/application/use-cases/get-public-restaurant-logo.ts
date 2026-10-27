import type { RestaurantLogo } from '../../domain/restaurant.types.js';
import type { RestaurantRepository } from '../ports/restaurant.repository.js';
import type { RestaurantLogoStorage } from '../ports/restaurant-services.js';

/**
 * Serves the logo shown on the published menu.
 *
 * Unlike GetRestaurantLogo, which answers the authenticated owner, this one is
 * reachable by any diner. It leans on findPublicLogoPath, which only resolves
 * ENABLED restaurants, so disabling a restaurant hides its logo at the same instant
 * its carta starts responding 404.
 */
export class GetPublicRestaurantLogo {
  constructor(
    private readonly repository: RestaurantRepository,
    private readonly storage: RestaurantLogoStorage,
  ) {}

  async execute(slug: string): Promise<RestaurantLogo | null> {
    const logoPath = await this.repository.findPublicLogoPath(slug);
    if (!logoPath) return null;
    return this.storage.readLogo(logoPath);
  }
}
