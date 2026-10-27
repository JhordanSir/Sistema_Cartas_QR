import { ServiceUnavailableException } from '@nestjs/common';

import type { PrismaService } from '../prisma/prisma.service.js';
import { HealthService } from './health.service.js';

describe('HealthService', () => {
  const checkConnection = jest.fn<Promise<void>, []>();
  const prisma = { checkConnection };
  let service: HealthService;

  beforeEach(() => {
    service = new HealthService(prisma as unknown as PrismaService);
  });

  it('reports a live process without querying PostgreSQL', () => {
    const response = service.getLiveness();

    expect(response).toMatchObject({
      service: 'api',
      status: 'ok',
    });
    expect(Number.isNaN(Date.parse(response.timestamp))).toBe(false);
    expect(prisma.checkConnection).not.toHaveBeenCalled();
  });

  it('reports readiness when PostgreSQL responds', async () => {
    prisma.checkConnection.mockResolvedValueOnce(undefined);

    const response = await service.getReadiness();

    expect(response).toMatchObject({
      database: 'up',
      service: 'api',
      status: 'ok',
    });
    expect(Number.isNaN(Date.parse(response.timestamp))).toBe(false);
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
