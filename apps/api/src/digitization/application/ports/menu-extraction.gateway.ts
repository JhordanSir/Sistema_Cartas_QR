import type { DigitizationProgress } from '@sirio/shared';

import type { MenuPhoto } from '../../domain/menu.types.js';

export type ExtractionProgress = Extract<DigitizationProgress, { stage: 'reading' | 'retrying' }>;

export interface MenuExtractionGateway {
  extract(photos: MenuPhoto[], onProgress?: (progress: ExtractionProgress) => void): Promise<unknown>;
}
