import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AuthModule } from '../auth/auth.module.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { ViewStatisticsRepository } from './application/ports/view-statistics.repository.js';
import { GetRestaurantViewStatistics } from './application/use-cases/get-restaurant-view-statistics.js';
import { RecordPublicView } from './application/use-cases/record-public-view.js';
import { RetainViewEvents } from './application/use-cases/retain-view-events.js';
import { PrismaViewStatisticsRepository } from './infrastructure/prisma-view-statistics.repository.js';
import { ViewRetentionScheduler } from './infrastructure/view-retention.scheduler.js';
import {
  GET_RESTAURANT_VIEW_STATISTICS,
  RECORD_PUBLIC_VIEW,
  RETAIN_VIEW_EVENTS,
  VIEW_STATISTICS_REPOSITORY,
} from './view-statistics.tokens.js';
import { ViewStatisticsController } from './view-statistics.controller.js';

@Module({
  controllers: [ViewStatisticsController],
  imports: [AuthModule],
  providers: [
    {
      inject: [PrismaService],
      provide: VIEW_STATISTICS_REPOSITORY,
      useFactory: (prisma: PrismaService): ViewStatisticsRepository =>
        new PrismaViewStatisticsRepository(prisma),
    },
    {
      inject: [VIEW_STATISTICS_REPOSITORY, ConfigService],
      provide: RECORD_PUBLIC_VIEW,
      useFactory: (
        repository: ViewStatisticsRepository,
        config: ConfigService,
      ): RecordPublicView =>
        new RecordPublicView(
          repository,
          config.getOrThrow<string>('VIEW_IP_HASH_SECRET'),
        ),
    },
    {
      inject: [VIEW_STATISTICS_REPOSITORY],
      provide: GET_RESTAURANT_VIEW_STATISTICS,
      useFactory: (
        repository: ViewStatisticsRepository,
      ): GetRestaurantViewStatistics => new GetRestaurantViewStatistics(repository),
    },
    {
      inject: [VIEW_STATISTICS_REPOSITORY],
      provide: RETAIN_VIEW_EVENTS,
      useFactory: (repository: ViewStatisticsRepository): RetainViewEvents =>
        new RetainViewEvents(repository),
    },
    ViewRetentionScheduler,
  ],
})
export class ViewStatisticsModule {}
