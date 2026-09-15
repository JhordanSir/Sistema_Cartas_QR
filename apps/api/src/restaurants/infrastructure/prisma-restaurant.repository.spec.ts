import { Prisma } from '../../generated/prisma/client.js';
import type { PrismaService } from '../../prisma/prisma.service.js';
import type { CreateRestaurantRecord } from '../application/ports/restaurant.repository.js';
import { PrismaRestaurantRepository } from './prisma-restaurant.repository.js';

const RECORD: CreateRestaurantRecord = {
  email: 'dueno@example.test',
  name: 'Bistró',
  passwordHash: 'hash',
  qrPayload: 'https://sirio.test/bistro',
  qrPng: new Uint8Array([1]),
  qrSvg: new Uint8Array([2]),
  slug: 'bistro',
};

function failingWithUniqueViolation(meta: Record<string, unknown>): PrismaRestaurantRepository {
  const error = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    clientVersion: 'test',
    code: 'P2002',
    meta,
  });
  const prisma = { $transaction: jest.fn().mockRejectedValue(error) } as unknown as PrismaService;
  return new PrismaRestaurantRepository(prisma);
}

function adapterViolation(table: string, index: string): Record<string, unknown> {
  return {
    driverAdapterError: {
      cause: {
        constraint: { index },
        kind: 'UniqueConstraintViolation',
        originalCode: '23505',
        table,
      },
      name: 'DriverAdapterError',
    },
    modelName: table,
  };
}

describe('PrismaRestaurantRepository.create', () => {
  it('reports a repeated owner email in the shape Prisma 7 driver adapters use', async () => {
    const repository = failingWithUniqueViolation(adapterViolation('Owner', 'Owner_email_key'));

    await expect(repository.create(RECORD)).resolves.toEqual({ kind: 'email-conflict' });
  });

  it('still understands the target list reported without a driver adapter', async () => {
    const repository = failingWithUniqueViolation({ target: ['email'] });

    await expect(repository.create(RECORD)).resolves.toEqual({ kind: 'email-conflict' });
  });

  it('treats a taken slug as a conflict worth retrying with another slug', async () => {
    const repository = failingWithUniqueViolation(adapterViolation('Restaurant', 'Restaurant_slug_key'));

    await expect(repository.create(RECORD)).resolves.toEqual({ kind: 'slug-conflict' });
  });
});
