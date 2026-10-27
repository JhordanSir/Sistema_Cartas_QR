import { AuthRole } from '../../../auth/domain/auth-role.js';
import type { AuthPrincipal } from '../../../auth/domain/auth.types.js';
import type { RestaurantApplicationError } from '../../domain/restaurant.errors.js';
import { RestaurantStatus } from '../../domain/restaurant-status.js';
import type { RestaurantSummary } from '../../domain/restaurant.types.js';
import type { RestaurantRepository } from '../ports/restaurant.repository.js';
import type {
  RestaurantPasswordHasher,
  RestaurantQrRenderer,
} from '../ports/restaurant-services.js';
import { CreateRestaurant } from './create-restaurant.js';

const ADMIN: AuthPrincipal = {
  accountId: '11111111-1111-4111-8111-111111111111',
  email: 'admin@example.com',
  role: AuthRole.ADMIN,
  sessionId: '22222222-2222-4222-8222-222222222222',
};

function summary(slug: string): RestaurantSummary {
  return {
    createdAt: '2026-08-26T18:00:00.000Z',
    id: '33333333-3333-4333-8333-333333333333',
    name: 'Pizza Félix',
    owner: {
      email: 'owner@example.com',
      id: '44444444-4444-4444-8444-444444444444',
      isActive: true,
    },
    slug,
    status: RestaurantStatus.ENABLED,
    updatedAt: '2026-08-26T18:00:00.000Z',
  };
}

function repository(): jest.Mocked<RestaurantRepository> {
  return {
    completeAssetDeletion: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    findPublicBySlug: jest.fn(),
    findPublicLogoPath: jest.fn(),
    list: jest.fn(),
    listPendingAssetDeletions: jest.fn(),
    markAssetDeletionFailed: jest.fn(),
    scheduleDeletion: jest.fn(),
    slugExists: jest.fn(),
    updateStatus: jest.fn(),
  };
}

describe('CreateRestaurant', () => {
  let repo: jest.Mocked<RestaurantRepository>;
  let hasher: jest.Mocked<RestaurantPasswordHasher>;
  let qrRenderer: jest.Mocked<RestaurantQrRenderer>;
  let useCase: CreateRestaurant;

  beforeEach(() => {
    repo = repository();
    hasher = { hash: jest.fn().mockResolvedValue('argon2-hash') };
    qrRenderer = {
      render: jest.fn().mockImplementation((payload, format) =>
        Promise.resolve(Buffer.from(`${format}:${payload}`)),
      ),
    };
    useCase = new CreateRestaurant(
      repo,
      hasher,
      qrRenderer,
      'https://cartas.example.com',
    );
  });

  it('normalizes input, hashes the password and creates the aggregate', async () => {
    repo.slugExists.mockResolvedValue(false);
    repo.create.mockResolvedValue({
      kind: 'created',
      restaurant: summary('pizza-felix'),
    });

    await expect(
      useCase.execute({
        email: ' OWNER@Example.com ',
        initialPassword: 'OwnerPass-1',
        name: '  Pizza   Félix ',
        principal: ADMIN,
      }),
    ).resolves.toMatchObject({ slug: 'pizza-felix' });
    expect(repo.create).toHaveBeenCalledWith({
      email: 'owner@example.com',
      name: 'Pizza Félix',
      passwordHash: 'argon2-hash',
      qrPayload: 'https://cartas.example.com/pizza-felix',
      qrPng: Buffer.from('png:https://cartas.example.com/pizza-felix'),
      qrSvg: Buffer.from('svg:https://cartas.example.com/pizza-felix'),
      slug: 'pizza-felix',
    });
    expect(qrRenderer.render).toHaveBeenCalledWith(
      'https://cartas.example.com/pizza-felix',
      'png',
    );
  });

  it('retries with an incremental slug after a concurrent collision', async () => {
    repo.slugExists
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);
    repo.create
      .mockResolvedValueOnce({ kind: 'slug-conflict' })
      .mockResolvedValueOnce({
        kind: 'created',
        restaurant: summary('pizza-felix-2'),
      });

    await expect(
      useCase.execute({
        email: 'owner@example.com',
        initialPassword: 'OwnerPass-1',
        name: 'Pizza Félix',
        principal: ADMIN,
      }),
    ).resolves.toMatchObject({ slug: 'pizza-felix-2' });
    expect(repo.create.mock.calls.map(([input]) => input.slug)).toEqual([
      'pizza-felix',
      'pizza-felix-2',
    ]);
    expect(hasher.hash).toHaveBeenCalledTimes(1);
  });

  it('adds a suffix when the normalized slug is reserved', async () => {
    repo.slugExists.mockResolvedValue(false);
    repo.create.mockImplementation((input) =>
      Promise.resolve({
        kind: 'created',
        restaurant: summary(input.slug),
      }),
    );

    await expect(
      useCase.execute({
        email: 'owner@example.com',
        initialPassword: 'OwnerPass-1',
        name: 'Admin',
        principal: ADMIN,
      }),
    ).resolves.toMatchObject({ slug: 'admin-2' });
  });

  it('reports an existing owner email without exposing persistence details', async () => {
    repo.slugExists.mockResolvedValue(false);
    repo.create.mockResolvedValue({ kind: 'email-conflict' });

    await expect(
      useCase.execute({
        email: 'owner@example.com',
        initialPassword: 'OwnerPass-1',
        name: 'Cevichería Sur',
        principal: ADMIN,
      }),
    ).rejects.toMatchObject<Partial<RestaurantApplicationError>>({
      code: 'EMAIL_ALREADY_EXISTS',
    });
  });
});
