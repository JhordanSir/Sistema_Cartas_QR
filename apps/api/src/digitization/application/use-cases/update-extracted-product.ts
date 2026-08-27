import { AuthRole } from '../../../auth/domain/auth-role.js';
import type { AuthPrincipal } from '../../../auth/domain/auth.types.js';
import { DigitizationApplicationError } from '../../domain/digitization.errors.js';
import type { PublishedMenu } from '../../domain/menu.types.js';
import { normalizeProductCorrection } from '../menu.validation.js';
import type { MenuPublicationRepository } from '../ports/menu-publication.repository.js';

export class UpdateExtractedProduct {
  constructor(private readonly repository: MenuPublicationRepository) {}

  async execute(input: {
    basePrice: unknown;
    description: unknown;
    name: unknown;
    principal: AuthPrincipal;
    productId: string;
    restaurantId: string;
  }): Promise<PublishedMenu> {
    if (input.principal.role !== AuthRole.OWNER) {
      throw new DigitizationApplicationError('FORBIDDEN', 'Owner access required.');
    }
    const menu = await this.repository.updateProductForOwner(
      input.principal.accountId,
      input.restaurantId,
      input.productId,
      normalizeProductCorrection(input),
    );
    if (!menu) {
      throw new DigitizationApplicationError(
        'RESTAURANT_NOT_FOUND',
        'Restaurant or product not found.',
      );
    }
    return menu;
  }
}
