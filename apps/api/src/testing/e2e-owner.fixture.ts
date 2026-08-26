import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../generated/prisma/client.js';
import { Argon2PasswordHasher } from '../auth/infrastructure/argon2-password.hasher.js';

export interface E2EOwnerFixture {
  email: string;
  id: string;
  password: string;
}

export async function createE2EOwnerFixture(): Promise<E2EOwnerFixture> {
  assertSafeTestEnvironment();
  const prisma = createPrismaClient();
  try {
    const suffix = `${Date.now()}-${crypto.randomUUID()}`;
    const email = `auth-owner-${suffix}@example.test`;
    const password = 'OwnerPass-1';
    const passwordHash = await new Argon2PasswordHasher().hash(password);
    const owner = await prisma.owner.create({
      data: { email, passwordHash },
    });
    return { email, id: owner.id, password };
  } finally {
    await prisma.$disconnect();
  }
}

export async function removeE2EOwnerFixture(ownerId: string): Promise<void> {
  assertSafeTestEnvironment();
  const prisma = createPrismaClient();
  try {
    await prisma.owner.deleteMany({ where: { id: ownerId } });
  } finally {
    await prisma.$disconnect();
  }
}

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required for the authentication E2E fixture');
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

function assertSafeTestEnvironment(): void {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Authentication E2E fixtures cannot run in production');
  }
}
