import { AuthRole } from '../../../auth/domain/auth-role.js';
import type { AuthPrincipal } from '../../../auth/domain/auth.types.js';
import { RestaurantStatus } from '../../domain/restaurant-status.js';
import type { RestaurantSummary } from '../../domain/restaurant.types.js';
import type { RestaurantRepository } from '../ports/restaurant.repository.js';
import type { RestaurantAssetStorage } from '../ports/restaurant-services.js';
import { DeleteRestaurant } from './delete-restaurant.js';

const RESTAURANT_ID = '33333333-3333-4333-8333-333333333333';
const RESTAURANT: RestaurantSummary = {
  createdAt: '2026-08-26T18:00:00.000Z',
  id: RESTAURANT_ID,
  name: 'Cevichería Sur',
  owner: {
    email: 'owner@example.com',
    id: '44444444-4444-4444-8444-444444444444',
    isActive: true,
  },
  slug: 'cevicheria-sur',
  status: RestaurantStatus.ENABLED,
  updatedAt: '2026-08-26T18:00:00.000Z',
};
const ADMIN: AuthPrincipal = {
  accountId: '11111111-1111-4111-8111-111111111111',
  email: 'admin@example.com',
  role: AuthRole.ADMIN,
  sessionId: '22222222-2222-4222-8222-222222222222',
};

function repository(): jest.Mocked<RestaurantRepository> {
  return {
    completeAssetDeletion: jest.fn(),
    create: jest.fn(),
    findById: jest.fn().mockResolvedValue(RESTAURANT),
    findPublicBySlug: jest.fn(),
    findPublicLogoPath: jest.fn(),
    list: jest.fn(),
    listPendingAssetDeletions: jest.fn(),
    markAssetDeletionFailed: jest.fn(),
    scheduleDeletion: jest.fn().mockResolvedValue({
      id: '55555555-5555-4555-8555-555555555555',
      relativePath: `restaurants/${RESTAURANT_ID}`,
      restaurantId: RESTAURANT_ID,
    }),
    slugExists: jest.fn(),
    updateStatus: jest.fn(),
  };
}

describe('DeleteRestaurant', () => {
  let repo: jest.Mocked<RestaurantRepository>;
  let storage: jest.Mocked<RestaurantAssetStorage>;
  let useCase: DeleteRestaurant;

  beforeEach(() => {
    repo = repository();
    storage = { deleteDirectory: jest.fn() };
    useCase = new DeleteRestaurant(repo, storage);
  });

  it('requires both explicit confirmations before scheduling deletion', async () => {
    await expect(
      useCase.execute({
        acknowledgePermanentDeletion: false,
        confirmationText: 'ELIMINAR cevicheria-sur',
        id: RESTAURANT_ID,
        principal: ADMIN,
      }),
    ).rejects.toMatchObject({
      code: 'INVALID_CONFIRMATION',
      problem: { code: 'DELETION_CONFIRMATION_MISMATCH', params: { slug: 'cevicheria-sur' } },
    });
    expect(repo.scheduleDeletion).not.toHaveBeenCalled();
  });

  it('accepts the English phrase the backoffice asks for in English', async () => {
    await expect(
      useCase.execute({
        acknowledgePermanentDeletion: true,
        confirmationText: 'DELETE cevicheria-sur',
        id: RESTAURANT_ID,
        principal: ADMIN,
      }),
    ).resolves.toEqual({ assets: 'deleted', deleted: true });
  });

  it.each([
    ['another restaurant', 'ELIMINAR otro-local'],
    ['a lowercase verb', 'delete cevicheria-sur'],
  ])('rejects a phrase naming %s', async (_label, confirmationText) => {
    await expect(
      useCase.execute({
        acknowledgePermanentDeletion: true,
        confirmationText,
        id: RESTAURANT_ID,
        principal: ADMIN,
      }),
    ).rejects.toMatchObject({ code: 'INVALID_CONFIRMATION' });
    expect(repo.scheduleDeletion).not.toHaveBeenCalled();
  });

  it('deletes assets and completes the durable cleanup job', async () => {
    await expect(
      useCase.execute({
        acknowledgePermanentDeletion: true,
        confirmationText: 'ELIMINAR cevicheria-sur',
        id: RESTAURANT_ID,
        principal: ADMIN,
      }),
    ).resolves.toEqual({ assets: 'deleted', deleted: true });
    expect(storage.deleteDirectory).toHaveBeenCalledWith(
      `restaurants/${RESTAURANT_ID}`,
    );
    expect(repo.completeAssetDeletion).toHaveBeenCalled();
    expect(repo.markAssetDeletionFailed).not.toHaveBeenCalled();
  });

  it('keeps a durable retry job when the filesystem is unavailable', async () => {
    storage.deleteDirectory.mockRejectedValue(new Error('volume unavailable'));

    await expect(
      useCase.execute({
        acknowledgePermanentDeletion: true,
        confirmationText: 'ELIMINAR cevicheria-sur',
        id: RESTAURANT_ID,
        principal: ADMIN,
      }),
    ).resolves.toEqual({ assets: 'pending-retry', deleted: true });
    expect(repo.markAssetDeletionFailed).toHaveBeenCalledWith(
      '55555555-5555-4555-8555-555555555555',
      'volume unavailable',
    );
    expect(repo.completeAssetDeletion).not.toHaveBeenCalled();
  });
});
