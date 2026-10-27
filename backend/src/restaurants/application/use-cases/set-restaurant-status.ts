import type { AuthPrincipal } from '../../../auth/domain/auth.types.js';
import { RestaurantApplicationError } from '../../domain/restaurant.errors.js';
import type { RestaurantStatus } from '../../domain/restaurant-status.js';
import type { RestaurantSummary } from '../../domain/restaurant.types.js';
import type { RestaurantRepository } from '../ports/restaurant.repository.js';
import { assertAdministrator } from '../restaurant.validation.js';

export interface SetRestaurantStatusCommand {
  id: string;
  principal: AuthPrincipal;
  status: RestaurantStatus;
}

export class SetRestaurantStatus {
  constructor(private readonly repository: RestaurantRepository) {}

  async execute(command: SetRestaurantStatusCommand): Promise<RestaurantSummary> {
    assertAdministrator(command.principal);
    const restaurant = await this.repository.updateStatus(
      command.id,
      command.status,
    );
    if (!restaurant) {
      throw new RestaurantApplicationError(
        'RESTAURANT_NOT_FOUND',
        'Restaurant not found',
      );
    }
    return restaurant;
  }
}
