import { ServiceUnavailableException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';
import { HealthService } from './health.service.js';

describe('HealthService', () => {
  const prisma = {
    checkConnection: jest.fn<() => Promise<void>>(),
  };
  let service: HealthService;

  beforeEach(() => {
    service = new HealthService(prisma as PrismaService);
  });

  it('reports a live process without querying PostgreSQL', () => {
    expect(service.getLiveness()).toEqual({
      service: 'api',
      status: 'ok',
      timestamp: expect.any(String),
    });
    expect(prisma.checkConnection).not.toHaveBeenCalled();
  });

  it('reports readiness when PostgreSQL responds', async () => {
    prisma.checkConnection.mockResolvedValueOnce();

    await expect(service.getReadiness()).resolves.toEqual({
      database: 'up',
      service: 'api',
      status: 'ok',
      timestamp: expect.any(String),
    });
    expect(prisma.checkConnection).toHaveBeenCalledTimes(1);
  });

  it('returns a service unavailable error when PostgreSQL is down', async () => {
    prisma.checkConnection.mockRejectedValueOnce(
      new Error('PostgreSQL is unavailable'),
    );

    await expect(service.getReadiness()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
