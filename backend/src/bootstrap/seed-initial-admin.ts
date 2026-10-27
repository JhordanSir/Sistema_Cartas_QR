import 'reflect-metadata';

import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

import { AppModule } from '../app.module.js';
import { InitialAdminBootstrap } from '../auth/application/initial-admin.bootstrap.js';

async function seedInitialAdmin(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule);
  try {
    const config = app.get(ConfigService);
    const bootstrap = app.get(InitialAdminBootstrap);
    const result = await bootstrap.execute(
      config.getOrThrow<string>('INITIAL_ADMIN_EMAIL'),
      config.getOrThrow<string>('INITIAL_ADMIN_PASSWORD'),
    );

    Logger.log(
      result.created
        ? 'Initial administrator created'
        : 'Initial administrator already exists',
      'InitialAdminBootstrap',
    );
  } finally {
    await app.close();
  }
}

void seedInitialAdmin().catch((error: unknown) => {
  Logger.error(error, undefined, 'InitialAdminBootstrap');
  process.exitCode = 1;
});
