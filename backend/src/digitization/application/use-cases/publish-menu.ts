import { AuthRole } from '../../../auth/domain/auth-role.js';
import type { AuthPrincipal } from '../../../auth/domain/auth.types.js';
import {
  MENU_TEMPLATE_IDS,
  type MenuTemplateId,
} from '../../domain/menu-publication.js';
import { DigitizationApplicationError } from '../../domain/digitization.errors.js';
import type { PublishedMenu } from '../../domain/menu.types.js';
import type { MenuPublicationRepository } from '../ports/menu-publication.repository.js';

export class PublishMenu {
  constructor(private readonly repository: MenuPublicationRepository) {}

  async execute(input: { principal: AuthPrincipal; restaurantId: string }): Promise<PublishedMenu> {
    assertOwner(input.principal);
    const result = await this.repository.publishForOwner(input.principal.accountId, input.restaurantId);
    if (result.kind === 'published') return result.menu;
    if (result.kind === 'empty') {
      throw new DigitizationApplicationError(
        'EMPTY_MENU',
        'Agrega al menos un producto disponible antes de publicar la carta.',
      );
    }
    throw new DigitizationApplicationError('RESTAURANT_NOT_FOUND', 'Restaurant not found.');
  }
}

export class SetMenuTemplate {
  constructor(private readonly repository: MenuPublicationRepository) {}

  async execute(input: {
    principal: AuthPrincipal;
    restaurantId: string;
    template: unknown;
  }): Promise<PublishedMenu> {
    assertOwner(input.principal);
    if (!MENU_TEMPLATE_IDS.includes(input.template as MenuTemplateId)) {
      throw new DigitizationApplicationError('INVALID_INPUT', 'Selecciona una plantilla válida.', {
        problem: { code: 'MENU_TEMPLATE_INVALID' },
      });
    }
    const menu = await this.repository.setTemplateForOwner(
      input.principal.accountId,
      input.restaurantId,
      input.template as MenuTemplateId,
    );
    if (!menu) {
      throw new DigitizationApplicationError('RESTAURANT_NOT_FOUND', 'Restaurant not found.');
    }
    return menu;
  }
}

function assertOwner(principal: AuthPrincipal): void {
  if (principal.role !== AuthRole.OWNER) {
    throw new DigitizationApplicationError('FORBIDDEN', 'Owner access required.');
  }
}
