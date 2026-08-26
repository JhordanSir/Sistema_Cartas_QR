import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { ROOT_ENV_FILE, validateEnvironment } from './config/environment.js';
import { HealthModule } from './health/health.module.js';
import { PrismaModule } from './prisma/prisma.module.js';

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
    HealthModule,
  ],
})
export class AppModule {}
