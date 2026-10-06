import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AuthModule } from '../auth/auth.module.js';
import { parseCorsOrigins } from '../config/cors.js';
import { SubscriptionHub } from './application/subscription-hub.js';
import { RealtimeGateway, type RealtimeOptions } from './presentation/realtime.gateway.js';
import { REALTIME_OPTIONS, SUBSCRIPTION_HUB } from './realtime.tokens.js';

@Module({
  exports: [SUBSCRIPTION_HUB],
  imports: [AuthModule],
  providers: [
    {
      provide: SUBSCRIPTION_HUB,
      useFactory: (): SubscriptionHub => new SubscriptionHub(),
    },
    {
      inject: [ConfigService],
      provide: REALTIME_OPTIONS,
      useFactory: (config: ConfigService): RealtimeOptions => ({
        allowedOrigins: [
          ...parseCorsOrigins(config.getOrThrow<string>('CORS_ORIGINS')),
          new URL(config.getOrThrow<string>('PUBLIC_APP_URL')).origin,
        ],
      }),
    },
    RealtimeGateway,
  ],
})
export class RealtimeModule {}
