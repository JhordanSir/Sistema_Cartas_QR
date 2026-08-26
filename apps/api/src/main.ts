import 'reflect-metadata';

import { RequestMethod } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module.js';
import { parseCorsOrigins } from './config/cors.js';
import type { Environment } from './config/environment.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService<Environment, true>);

  app.enableCors({
    credentials: true,
    origin: parseCorsOrigins(config.get('CORS_ORIGINS', { infer: true })),
  });
  app.setGlobalPrefix('api', {
    exclude: [
      { method: RequestMethod.GET, path: 'health' },
      { method: RequestMethod.GET, path: 'health/ready' },
    ],
  });
  app.enableShutdownHooks();

  await app.listen(
    config.get('API_PORT', { infer: true }),
    '0.0.0.0',
  );
}

void bootstrap();
