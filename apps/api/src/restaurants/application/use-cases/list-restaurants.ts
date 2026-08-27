import type { AuthPrincipal } from '../../../auth/domain/auth.types.js';
import type { RestaurantStatus } from '../../domain/restaurant-status.js';
import type { PaginatedRestaurants } from '../../domain/restaurant.types.js';
import type { RestaurantRepository } from '../ports/restaurant.repository.js';
import { assertAdministrator } from '../restaurant.validation.js';

export interface ListRestaurantsCommand {
  page: number;
  pageSize: number;
  principal: AuthPrincipal;
  query?: string;
  status?: RestaurantStatus;
}

export class ListRestaurants {
  constructor(private readonly repository: RestaurantRepository) {}

  execute(command: ListRestaurantsCommand): Promise<PaginatedRestaurants> {
    assertAdministrator(command.principal);
    return this.repository.list({
      page: command.page,
      pageSize: command.pageSize,
      query: command.query?.trim() || undefined,
      status: command.status,
    });
  }
}
