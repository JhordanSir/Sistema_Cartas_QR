import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AuthModule } from '../auth/auth.module.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { SubscriptionHub } from '../realtime/application/subscription-hub.js';
import { RealtimeModule } from '../realtime/realtime.module.js';
import { SUBSCRIPTION_HUB } from '../realtime/realtime.tokens.js';
import type { DigitizationProgressReporter } from './application/ports/digitization-progress.reporter.js';
import type { MenuExtractionGateway } from './application/ports/menu-extraction.gateway.js';
import type { MenuPublicationRepository } from './application/ports/menu-publication.repository.js';
import { DigitizeMenu } from './application/use-cases/digitize-menu.js';
import { GetOwnedMenu } from './application/use-cases/get-owned-menu.js';
import { PublishMenu, SetMenuTemplate } from './application/use-cases/publish-menu.js';
import { DigitizationController } from './digitization.controller.js';
import {
  DIGITIZATION_PROGRESS_REPORTER,
  DIGITIZE_MENU,
  GET_OWNED_MENU,
  MENU_EXTRACTION_GATEWAY,
  MENU_PUBLICATION_REPOSITORY,
  PUBLISH_MENU,
  SET_MENU_TEMPLATE,
} from './digitization.tokens.js';
import { GeminiMenuExtractionGateway } from './infrastructure/gemini-menu-extraction.gateway.js';
import { PrismaMenuPublicationRepository } from './infrastructure/prisma-menu-publication.repository.js';
import { RealtimeDigitizationProgressReporter } from './infrastructure/realtime-progress.reporter.js';

@Module({
  controllers: [DigitizationController],
  imports: [AuthModule, RealtimeModule],
  providers: [
    {
      inject: [ConfigService],
      provide: MENU_EXTRACTION_GATEWAY,
      useFactory: (config: ConfigService): MenuExtractionGateway =>
        new GeminiMenuExtractionGateway({
          apiKey: config.getOrThrow<string>('GEMINI_API_KEY'),
          maximumRetries: config.getOrThrow<number>('GEMINI_MAX_RETRIES'),
          model: config.getOrThrow<string>('GEMINI_MODEL'),
          timeoutMilliseconds: config.getOrThrow<number>('GEMINI_TIMEOUT_MS'),
        }),
    },
    {
      inject: [PrismaService],
      provide: MENU_PUBLICATION_REPOSITORY,
      useFactory: (prisma: PrismaService): MenuPublicationRepository =>
        new PrismaMenuPublicationRepository(prisma),
    },
    {
      inject: [SUBSCRIPTION_HUB],
      provide: DIGITIZATION_PROGRESS_REPORTER,
      useFactory: (hub: SubscriptionHub): DigitizationProgressReporter =>
        new RealtimeDigitizationProgressReporter(hub),
    },
    {
      inject: [MENU_EXTRACTION_GATEWAY, MENU_PUBLICATION_REPOSITORY, DIGITIZATION_PROGRESS_REPORTER],
      provide: DIGITIZE_MENU,
      useFactory: (
        gateway: MenuExtractionGateway,
        repository: MenuPublicationRepository,
        progressReporter: DigitizationProgressReporter,
      ): DigitizeMenu => new DigitizeMenu(gateway, repository, progressReporter),
    },
    {
      inject: [MENU_PUBLICATION_REPOSITORY],
      provide: GET_OWNED_MENU,
      useFactory: (repository: MenuPublicationRepository): GetOwnedMenu =>
        new GetOwnedMenu(repository),
    },
    {
      inject: [MENU_PUBLICATION_REPOSITORY],
      provide: PUBLISH_MENU,
      useFactory: (repository: MenuPublicationRepository): PublishMenu =>
        new PublishMenu(repository),
    },
    {
      inject: [MENU_PUBLICATION_REPOSITORY],
      provide: SET_MENU_TEMPLATE,
      useFactory: (repository: MenuPublicationRepository): SetMenuTemplate =>
        new SetMenuTemplate(repository),
    },
  ],
})
export class DigitizationModule {}
