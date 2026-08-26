import { Controller, Get } from '@nestjs/common';

import { Public } from '../auth/presentation/auth.decorators.js';
import { HealthService } from './health.service.js';
import type {
  LivenessResponse,
  ReadinessResponse,
} from './health.types.js';

@Public()
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
