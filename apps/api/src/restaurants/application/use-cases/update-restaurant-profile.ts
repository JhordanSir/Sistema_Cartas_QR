import { AuthRole } from '../../../auth/domain/auth-role.js';
import type { AuthPrincipal } from '../../../auth/domain/auth.types.js';
import { RestaurantApplicationError } from '../../domain/restaurant.errors.js';
import type { RestaurantProfile } from '../../domain/restaurant.types.js';
import type {
  RestaurantLogoStorage,
  RestaurantLogoUpload,
} from '../ports/restaurant-services.js';
import type { RestaurantProfileRepository } from '../ports/restaurant-profile.repository.js';
import {
  normalizeRestaurantProfile,
  type RestaurantProfileInput,
  validateRestaurantLogo,
} from '../restaurant-profile.validation.js';

export interface UpdateRestaurantProfileInput extends RestaurantProfileInput {
  logo?: RestaurantLogoUpload;
  principal: AuthPrincipal;
  restaurantId: string;
}

export class UpdateRestaurantProfile {
  constructor(
    private readonly repository: RestaurantProfileRepository,
    private readonly storage: RestaurantLogoStorage,
  ) {}

  async execute(input: UpdateRestaurantProfileInput): Promise<RestaurantProfile> {
    if (input.principal.role !== AuthRole.OWNER) {
      throw new RestaurantApplicationError('FORBIDDEN', 'Owner access required');
    }
    const current = await this.repository.findProfileForOwner(
      input.principal.accountId,
      input.restaurantId,
    );
    if (!current) {
      throw new RestaurantApplicationError(
        'RESTAURANT_NOT_FOUND',
        'Restaurant profile not found',
      );
    }

    const profile = normalizeRestaurantProfile(input);
    if (input.logo) {
      validateRestaurantLogo(input.logo);
      profile.logoPath = await this.storage.saveLogo(input.restaurantId, input.logo);
    }

    const updated = await this.repository.updateProfileForOwner(
      input.principal.accountId,
      input.restaurantId,
      profile,
    );
    if (!updated) {
      throw new RestaurantApplicationError(
        'RESTAURANT_NOT_FOUND',
        'Restaurant profile not found',
      );
    }
    return updated;
  }
}
