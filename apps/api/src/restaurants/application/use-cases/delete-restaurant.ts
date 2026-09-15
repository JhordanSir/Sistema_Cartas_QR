import type { AuthPrincipal } from '../../../auth/domain/auth.types.js';
import { RestaurantApplicationError } from '../../domain/restaurant.errors.js';
import type { RestaurantRepository } from '../ports/restaurant.repository.js';
import type { RestaurantAssetStorage } from '../ports/restaurant-services.js';
import { assertAdministrator } from '../restaurant.validation.js';

export interface DeleteRestaurantCommand {
  acknowledgePermanentDeletion: boolean;
  confirmationText: string;
  id: string;
  principal: AuthPrincipal;
}

export interface DeleteRestaurantResult {
  assets: 'deleted' | 'pending-retry';
  deleted: true;
}

export class DeleteRestaurant {
  constructor(
    private readonly repository: RestaurantRepository,
    private readonly storage: RestaurantAssetStorage,
  ) {}

  async execute(command: DeleteRestaurantCommand): Promise<DeleteRestaurantResult> {
    assertAdministrator(command.principal);
    const restaurant = await this.repository.findById(command.id);
    if (!restaurant) {
      throw new RestaurantApplicationError(
        'RESTAURANT_NOT_FOUND',
        'Restaurant not found',
      );
    }

    const expectedConfirmation = `ELIMINAR ${restaurant.slug}`;
    if (
      !command.acknowledgePermanentDeletion ||
      command.confirmationText !== expectedConfirmation
    ) {
      throw new RestaurantApplicationError(
        'INVALID_CONFIRMATION',
        `Type ${expectedConfirmation} and acknowledge the irreversible deletion`,
        {
          problem: {
            code: 'DELETION_CONFIRMATION_MISMATCH',
            params: { confirmation: expectedConfirmation },
          },
        },
      );
    }

    const job = await this.repository.scheduleDeletion(
      restaurant.id,
      `restaurants/${restaurant.id}`,
    );
    if (!job) {
      throw new RestaurantApplicationError(
        'RESTAURANT_NOT_FOUND',
        'Restaurant not found',
      );
    }

    try {
      await this.storage.deleteDirectory(job.relativePath);
      await this.repository.completeAssetDeletion(job.id);
      return { assets: 'deleted', deleted: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown cleanup error';
      await this.repository.markAssetDeletionFailed(job.id, message);
      return { assets: 'pending-retry', deleted: true };
    }
  }
}
