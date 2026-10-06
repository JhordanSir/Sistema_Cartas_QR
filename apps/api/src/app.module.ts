import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AuthModule } from './auth/auth.module.js';
import { ROOT_ENV_FILE, validateEnvironment } from './config/environment.js';
import { DigitizationModule } from './digitization/digitization.module.js';
import { HealthModule } from './health/health.module.js';
import { MenuManagementModule } from './menu-management/menu-management.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { RealtimeModule } from './realtime/realtime.module.js';
import { RestaurantsModule } from './restaurants/restaurants.module.js';
import { ViewStatisticsModule } from './analytics/view-statistics.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      cache: true,
      envFilePath: ROOT_ENV_FILE,
      expandVariables: true,
      isGlobal: true,
      validate: validateEnvironment,
    }),
    PrismaModule,
    AuthModule,
    RestaurantsModule,
    DigitizationModule,
    MenuManagementModule,
    ViewStatisticsModule,
    RealtimeModule,
    HealthModule,
  ],
})
export class AppModule {}
