import { AuthRole } from '../../../auth/domain/auth-role.js';
import type { AuthPrincipal } from '../../../auth/domain/auth.types.js';
import { DigitizationApplicationError } from '../../domain/digitization.errors.js';
import type { PublishedMenu } from '../../domain/menu.types.js';
import type { MenuPublicationRepository } from '../ports/menu-publication.repository.js';

export class GetOwnedMenu {
  constructor(private readonly repository: MenuPublicationRepository) {}

  async execute(input: { principal: AuthPrincipal; restaurantId: string }): Promise<PublishedMenu> {
    if (input.principal.role !== AuthRole.OWNER) {
      throw new DigitizationApplicationError('FORBIDDEN', 'Owner access required.');
    }
    const menu = await this.repository.findForOwner(
      input.principal.accountId,
      input.restaurantId,
    );
    if (!menu) {
      throw new DigitizationApplicationError('RESTAURANT_NOT_FOUND', 'Restaurant not found.');
    }
    return menu;
  }
}
