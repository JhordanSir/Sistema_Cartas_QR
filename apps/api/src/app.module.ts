import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AuthModule } from './auth/auth.module.js';
import { ROOT_ENV_FILE, validateEnvironment } from './config/environment.js';
import { DigitizationModule } from './digitization/digitization.module.js';
import { HealthModule } from './health/health.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { RestaurantsModule } from './restaurants/restaurants.module.js';

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
    HealthModule,
  ],
})
export class AppModule {}
