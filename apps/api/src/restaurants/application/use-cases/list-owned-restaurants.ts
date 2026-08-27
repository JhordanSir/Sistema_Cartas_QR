import { AuthRole } from '../../../auth/domain/auth-role.js';
import type { AuthPrincipal } from '../../../auth/domain/auth.types.js';
import { RestaurantApplicationError } from '../../domain/restaurant.errors.js';
import type { RestaurantProfile } from '../../domain/restaurant.types.js';
import type { RestaurantProfileRepository } from '../ports/restaurant-profile.repository.js';

export class ListOwnedRestaurants {
  constructor(private readonly repository: RestaurantProfileRepository) {}

  async execute(principal: AuthPrincipal): Promise<RestaurantProfile[]> {
    if (principal.role !== AuthRole.OWNER) {
      throw new RestaurantApplicationError('FORBIDDEN', 'Owner access required');
    }
    return this.repository.listProfilesByOwner(principal.accountId);
  }
}
