import { Injectable, ServiceUnavailableException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';
import type {
  LivenessResponse,
  ReadinessResponse,
} from './health.types.js';

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  getLiveness(): LivenessResponse {
    return this.createHealthyResponse();
  }

  async getReadiness(): Promise<ReadinessResponse> {
    try {
      await this.prisma.checkConnection();
      return { database: 'up', ...this.createHealthyResponse() };
    } catch {
      throw new ServiceUnavailableException({
        database: 'down',
        status: 'error',
      });
    }
  }

  private createHealthyResponse(): LivenessResponse {
    return {
      service: 'api',
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
