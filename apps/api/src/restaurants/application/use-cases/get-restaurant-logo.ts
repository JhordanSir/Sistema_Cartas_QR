import { AuthRole } from '../../../auth/domain/auth-role.js';
import type { AuthPrincipal } from '../../../auth/domain/auth.types.js';
import { RestaurantApplicationError } from '../../domain/restaurant.errors.js';
import type { RestaurantLogo } from '../../domain/restaurant.types.js';
import type { RestaurantLogoStorage } from '../ports/restaurant-services.js';
import type { RestaurantProfileRepository } from '../ports/restaurant-profile.repository.js';

export class GetRestaurantLogo {
  constructor(
    private readonly repository: RestaurantProfileRepository,
    private readonly storage: RestaurantLogoStorage,
  ) {}

  async execute(input: {
    principal: AuthPrincipal;
    restaurantId: string;
  }): Promise<RestaurantLogo | null> {
    if (input.principal.role !== AuthRole.OWNER) {
      throw new RestaurantApplicationError('FORBIDDEN', 'Owner access required');
    }
    const profile = await this.repository.findProfileForOwner(
      input.principal.accountId,
      input.restaurantId,
    );
    if (!profile) {
      throw new RestaurantApplicationError(
        'RESTAURANT_NOT_FOUND',
        'Restaurant profile not found',
      );
    }
    if (!profile.logoPath) return null;
    return this.storage.readLogo(profile.logoPath);
  }
}
