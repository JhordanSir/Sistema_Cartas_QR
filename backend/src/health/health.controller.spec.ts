import { Test } from '@nestjs/testing';

import { HealthController } from './health.controller.js';
import { HealthService } from './health.service.js';

describe('HealthController', () => {
  const healthService = {
    getLiveness: jest.fn(() => ({
      service: 'api' as const,
      status: 'ok' as const,
      timestamp: '2026-08-26T05:00:00.000Z',
    })),
    getReadiness: jest.fn(() =>
      Promise.resolve({
        database: 'up' as const,
        service: 'api' as const,
        status: 'ok' as const,
        timestamp: '2026-08-26T05:00:00.000Z',
      }),
    ),
  };
  let controller: HealthController;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: HealthService, useValue: healthService }],
    }).compile();

    controller = module.get(HealthController);
  });

  it('returns liveness without checking dependencies', () => {
    expect(controller.getLiveness()).toEqual({
      service: 'api',
      status: 'ok',
      timestamp: '2026-08-26T05:00:00.000Z',
    });
    expect(healthService.getLiveness).toHaveBeenCalledTimes(1);
  });

  it('delegates the readiness check', async () => {
    await expect(controller.getReadiness()).resolves.toEqual({
      database: 'up',
      service: 'api',
      status: 'ok',
      timestamp: '2026-08-26T05:00:00.000Z',
    });
    expect(healthService.getReadiness).toHaveBeenCalledTimes(1);
  });
});
