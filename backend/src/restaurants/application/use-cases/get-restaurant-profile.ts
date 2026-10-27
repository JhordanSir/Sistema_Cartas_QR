import { AuthRole } from '../../../auth/domain/auth-role.js';
import type { AuthPrincipal } from '../../../auth/domain/auth.types.js';
import { RestaurantApplicationError } from '../../domain/restaurant.errors.js';
import type { RestaurantProfile } from '../../domain/restaurant.types.js';
import type { RestaurantProfileRepository } from '../ports/restaurant-profile.repository.js';

export class GetRestaurantProfile {
  constructor(private readonly repository: RestaurantProfileRepository) {}

  async execute(input: {
    principal: AuthPrincipal;
    restaurantId: string;
  }): Promise<RestaurantProfile> {
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
    return profile;
  }
}
