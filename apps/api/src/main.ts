import 'reflect-metadata';

import { RequestMethod } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module.js';
import { parseCorsOrigins } from './config/cors.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService);

  app.enableCors({
    credentials: true,
    origin: parseCorsOrigins(config.getOrThrow<string>('CORS_ORIGINS')),
  });
  app.setGlobalPrefix('api', {
    exclude: [
      { method: RequestMethod.GET, path: 'health' },
      { method: RequestMethod.GET, path: 'health/ready' },
    ],
  });
  app.enableShutdownHooks();

  await app.listen(
    config.getOrThrow<number>('API_PORT'),
    '0.0.0.0',
  );
}

void bootstrap();
