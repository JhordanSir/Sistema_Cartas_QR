import { Controller, Get } from '@nestjs/common';

import { HealthService } from './health.service.js';
import type {
  LivenessResponse,
  ReadinessResponse,
} from './health.types.js';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  getLiveness(): LivenessResponse {
    return this.healthService.getLiveness();
  }

  @Get('ready')
  async getReadiness(): Promise<ReadinessResponse> {
    return this.healthService.getReadiness();
  }
}
