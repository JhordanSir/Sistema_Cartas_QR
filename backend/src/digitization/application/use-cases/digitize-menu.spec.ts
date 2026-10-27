import type { DigitizationProgress } from '@sirio/shared';

import { AuthRole } from '../../../auth/domain/auth-role.js';
import type { AuthPrincipal } from '../../../auth/domain/auth.types.js';
import { DigitizationApplicationError, MenuExtractionGatewayError } from '../../domain/digitization.errors.js';
import type { MenuPhoto, PublishedMenu } from '../../domain/menu.types.js';
import type { DigitizationProgressReporter } from '../ports/digitization-progress.reporter.js';
import type { ExtractionProgress, MenuExtractionGateway } from '../ports/menu-extraction.gateway.js';
import type { MenuPublicationRepository } from '../ports/menu-publication.repository.js';
import { DigitizeMenu } from './digitize-menu.js';

const OWNER: AuthPrincipal = {
  accountId: 'owner-1',
  email: 'owner@example.test',
  role: AuthRole.OWNER,
  sessionId: 'session-1',
};
const RESTAURANT_ID = 'restaurant-1';
const PROGRESS_ID = 'progress-1';
const PHOTO: MenuPhoto = {
  bytes: Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]),
  contentType: 'image/png',
};
const RAW_MENU = {
  categories: [
    {
      name: 'Fondos',
      products: [
        { basePrice: '28.00', name: 'Lomo Saltado' },
        { basePrice: '24.00', name: 'Ají de Gallina' },
      ],
    },
    { name: 'Bebidas', products: [{ basePrice: '7.00', name: 'Limonada' }] },
  ],
};
const PUBLISHED: PublishedMenu = {
  categories: RAW_MENU.categories.map((category) => ({
    layout: 'LIST',
    name: category.name,
    products: category.products.map((product) => ({
      ...product,
      description: null,
      extras: [],
      imagePath: null,
      isAvailable: true,
      variants: [],
    })),
  })),
  publication: { hasPublishedMenu: false, hasUnpublishedChanges: true, publishedAt: null },
  restaurantId: RESTAURANT_ID,
  style: { backgroundColor: '#ffffff', fontFamily: 'Inter', textColor: '#111827' },
  template: 'ORIGINAL',
  updatedAt: '2026-10-06T12:00:00.000Z',
};

function setup(extract: MenuExtractionGateway['extract']): {
  digitize: DigitizeMenu;
  reported: DigitizationProgress[];
  repository: MenuPublicationRepository;
} {
  const reported: DigitizationProgress[] = [];
  const reporter: DigitizationProgressReporter = {
    report: (scope, progress) => {
      expect(scope).toEqual({ progressId: PROGRESS_ID, restaurantId: RESTAURANT_ID });
      reported.push(progress);
    },
  };
  const repository = {
    existsForOwner: jest.fn().mockResolvedValue(true),
    replaceForOwner: jest.fn().mockResolvedValue(PUBLISHED),
  } as unknown as MenuPublicationRepository;
  return {
    digitize: new DigitizeMenu({ extract }, repository, reporter),
    reported,
    repository,
  };
}

/** Behaves like the Gemini gateway: one failed attempt, a retry, then the menu. */
function extractAfterOneRetry(
  _photos: MenuPhoto[],
  onProgress?: (progress: ExtractionProgress) => void,
): Promise<unknown> {
  onProgress?.({ attempt: 1, maximumAttempts: 3, stage: 'reading' });
  onProgress?.({ attempt: 1, maximumAttempts: 3, stage: 'retrying' });
  onProgress?.({ attempt: 2, maximumAttempts: 3, stage: 'reading' });
  return Promise.resolve(RAW_MENU);
}

describe('DigitizeMenu progress', () => {
  it('reports every real stage in order, ending with what was detected', async () => {
    const { digitize, reported } = setup(extractAfterOneRetry);

    await expect(
      digitize.execute({ photos: [PHOTO], principal: OWNER, progressId: PROGRESS_ID, restaurantId: RESTAURANT_ID }),
    ).resolves.toBe(PUBLISHED);

    expect(reported).toEqual([
      { photoCount: 1, stage: 'received' },
      { attempt: 1, maximumAttempts: 3, stage: 'reading' },
      { attempt: 1, maximumAttempts: 3, stage: 'retrying' },
      { attempt: 2, maximumAttempts: 3, stage: 'reading' },
      { stage: 'validating' },
      { stage: 'saving' },
      { categoryCount: 2, productCount: 3, stage: 'completed' },
    ]);
  });

  it('reports nothing when the browser did not subscribe', async () => {
    const { digitize, reported } = setup(extractAfterOneRetry);

    await digitize.execute({ photos: [PHOTO], principal: OWNER, restaurantId: RESTAURANT_ID });

    expect(reported).toEqual([]);
  });

  it('reports the failure with the same code the HTTP response carries', async () => {
    const { digitize, reported, repository } = setup(() =>
      Promise.reject(new MenuExtractionGatewayError('TIMEOUT', 'Gemini request timed out.')),
    );

    await expect(
      digitize.execute({ photos: [PHOTO], principal: OWNER, progressId: PROGRESS_ID, restaurantId: RESTAURANT_ID }),
    ).rejects.toMatchObject({ code: 'MODEL_TIMEOUT' });

    expect(reported).toEqual([
      { photoCount: 1, stage: 'received' },
      { code: 'MODEL_TIMEOUT', stage: 'failed' },
    ]);
    expect(repository.replaceForOwner).not.toHaveBeenCalled();
  });

  it('reports nothing for photos rejected before any work starts', async () => {
    const { digitize, reported } = setup(extractAfterOneRetry);

    await expect(
      digitize.execute({
        photos: [{ ...PHOTO, contentType: 'image/gif' }],
        principal: OWNER,
        progressId: PROGRESS_ID,
        restaurantId: RESTAURANT_ID,
      }),
    ).rejects.toBeInstanceOf(DigitizationApplicationError);

    expect(reported).toEqual([]);
  });
});
