import type { DigitizationProgress } from '@sirio/shared';

import { AuthRole } from '../../../auth/domain/auth-role.js';
import type { AuthPrincipal } from '../../../auth/domain/auth.types.js';
import { DigitizationApplicationError, MenuExtractionGatewayError } from '../../domain/digitization.errors.js';
import type { MenuPhoto, PublishedMenu } from '../../domain/menu.types.js';
import type { DigitizationProgressReporter } from '../ports/digitization-progress.reporter.js';
import type { MenuExtractionGateway } from '../ports/menu-extraction.gateway.js';
import type { MenuPublicationRepository } from '../ports/menu-publication.repository.js';
import { parseExtractedMenu, validateMenuPhotos } from '../menu.validation.js';

export class DigitizeMenu {
  constructor(
    private readonly extractionGateway: MenuExtractionGateway,
    private readonly repository: MenuPublicationRepository,
    private readonly progressReporter: DigitizationProgressReporter,
  ) {}

  async execute(input: {
    photos: MenuPhoto[];
    principal: AuthPrincipal;
    /** Set when the browser subscribed to this digitization over the realtime socket. */
    progressId?: string;
    restaurantId: string;
  }): Promise<PublishedMenu> {
    if (input.principal.role !== AuthRole.OWNER) {
      throw new DigitizationApplicationError('FORBIDDEN', 'Owner access required.');
    }
    validateMenuPhotos(input.photos);
    if (!(await this.repository.existsForOwner(input.principal.accountId, input.restaurantId))) {
      throw new DigitizationApplicationError('RESTAURANT_NOT_FOUND', 'Restaurant not found.');
    }

    const { progressId, restaurantId } = input;
    const report = (progress: DigitizationProgress): void => {
      if (progressId) this.progressReporter.report({ progressId, restaurantId }, progress);
    };
    report({ photoCount: input.photos.length, stage: 'received' });

    try {
      const rawMenu = await this.extract(input.photos, report);
      report({ stage: 'validating' });
      const menu = parseExtractedMenu(rawMenu);
      report({ stage: 'saving' });
      const published = await this.repository.replaceForOwner(
        input.principal.accountId,
        restaurantId,
        menu,
      );
      if (!published) {
        throw new DigitizationApplicationError('RESTAURANT_NOT_FOUND', 'Restaurant not found.');
      }
      report({
        categoryCount: published.categories.length,
        productCount: published.categories.reduce(
          (total, category) => total + category.products.length,
          0,
        ),
        stage: 'completed',
      });
      return published;
    } catch (error) {
      report({
        code: error instanceof DigitizationApplicationError ? error.code : 'UNEXPECTED',
        stage: 'failed',
      });
      throw error;
    }
  }

  private async extract(
    photos: MenuPhoto[],
    report: (progress: DigitizationProgress) => void,
  ): Promise<unknown> {
    try {
      return await this.extractionGateway.extract(photos, report);
    } catch (error) {
      if (!(error instanceof MenuExtractionGatewayError)) throw error;
      const mapping = {
        CONFIGURATION: ['MODEL_CONFIGURATION_ERROR', 'Gemini no está configurado correctamente. Contacta al administrador.'],
        RESPONSE: ['INVALID_MODEL_RESPONSE', 'Gemini no pudo interpretar una carta válida. Prueba con fotos más nítidas.'],
        TIMEOUT: ['MODEL_TIMEOUT', 'Gemini tardó demasiado en responder. Inténtalo nuevamente.'],
        UNAVAILABLE: ['MODEL_UNAVAILABLE', 'Gemini no está disponible temporalmente. Inténtalo en unos minutos.'],
      } as const;
      const [code, message] = mapping[error.kind];
      throw new DigitizationApplicationError(code, message, { cause: error });
    }
  }
}
