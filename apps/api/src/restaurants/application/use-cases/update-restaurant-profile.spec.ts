import { AuthRole } from '../../../auth/domain/auth-role.js';
import type { AuthPrincipal } from '../../../auth/domain/auth.types.js';
import type { RestaurantProfileRepository } from '../ports/restaurant-profile.repository.js';
import type { RestaurantLogoStorage } from '../ports/restaurant-services.js';
import { RestaurantStatus } from '../../domain/restaurant-status.js';
import type { RestaurantProfile } from '../../domain/restaurant.types.js';
import { UpdateRestaurantProfile } from './update-restaurant-profile.js';

const OWNER: AuthPrincipal = {
  accountId: '11111111-1111-4111-8111-111111111111',
  email: 'owner@example.com',
  role: AuthRole.OWNER,
  sessionId: '22222222-2222-4222-8222-222222222222',
};
const RESTAURANT_ID = '33333333-3333-4333-8333-333333333333';

function profile(overrides: Partial<RestaurantProfile> = {}): RestaurantProfile {
  return {
    address: null,
    contactPhone: null,
    facebookUrl: null,
    id: RESTAURANT_ID,
    instagramUrl: null,
    logoPath: null,
    name: 'Mesa Norte',
    slug: 'mesa-norte',
    status: RestaurantStatus.ENABLED,
    tiktokUrl: null,
    updatedAt: '2026-08-26T18:00:00.000Z',
    whatsapp: null,
    ...overrides,
  };
}

describe('UpdateRestaurantProfile', () => {
  let repository: jest.Mocked<RestaurantProfileRepository>;
  let storage: jest.Mocked<RestaurantLogoStorage>;
  let useCase: UpdateRestaurantProfile;

  beforeEach(() => {
    repository = {
      findProfileForOwner: jest.fn().mockResolvedValue(profile()),
      listProfilesByOwner: jest.fn(),
      updateProfileForOwner: jest.fn(),
    };
    storage = {
      readLogo: jest.fn(),
      saveLogo: jest.fn().mockResolvedValue(`restaurants/${RESTAURANT_ID}/profile/logo`),
    };
    useCase = new UpdateRestaurantProfile(repository, storage);
  });

  it('persists normalized contact data and the validated logo path', async () => {
    repository.updateProfileForOwner.mockResolvedValue(
      profile({
        address: 'Av. Central 456',
        logoPath: `restaurants/${RESTAURANT_ID}/profile/logo`,
        whatsapp: '+51 999 888 777',
      }),
    );
    const logo = {
      bytes: Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]),
      contentType: 'image/png',
    };

    await expect(
      useCase.execute({
        address: '  Av. Central 456 ',
        logo,
        principal: OWNER,
        restaurantId: RESTAURANT_ID,
        whatsapp: ' +51 999 888 777 ',
      }),
    ).resolves.toMatchObject({ address: 'Av. Central 456' });
    expect(storage.saveLogo).toHaveBeenCalledWith(RESTAURANT_ID, logo);
    expect(repository.updateProfileForOwner).toHaveBeenCalledWith(
      OWNER.accountId,
      RESTAURANT_ID,
      expect.objectContaining({
        address: 'Av. Central 456',
        logoPath: `restaurants/${RESTAURANT_ID}/profile/logo`,
        whatsapp: '+51 999 888 777',
      }),
    );
  });

  it('does not allow one owner to update an unrelated restaurant', async () => {
    repository.findProfileForOwner.mockResolvedValue(null);
    await expect(
      useCase.execute({ principal: OWNER, restaurantId: RESTAURANT_ID }),
    ).rejects.toMatchObject({ code: 'RESTAURANT_NOT_FOUND' });
    expect(repository.updateProfileForOwner).not.toHaveBeenCalled();
    expect(storage.saveLogo).not.toHaveBeenCalled();
  });
});
