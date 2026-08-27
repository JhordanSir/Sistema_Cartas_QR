import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AuthModule } from '../auth/auth.module.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { MenuExtractionGateway } from './application/ports/menu-extraction.gateway.js';
import type { MenuPublicationRepository } from './application/ports/menu-publication.repository.js';
import { DigitizeMenu } from './application/use-cases/digitize-menu.js';
import { GetOwnedMenu } from './application/use-cases/get-owned-menu.js';
import { DigitizationController } from './digitization.controller.js';
import {
  DIGITIZE_MENU,
  GET_OWNED_MENU,
  MENU_EXTRACTION_GATEWAY,
  MENU_PUBLICATION_REPOSITORY,
} from './digitization.tokens.js';
import { GeminiMenuExtractionGateway } from './infrastructure/gemini-menu-extraction.gateway.js';
import { PrismaMenuPublicationRepository } from './infrastructure/prisma-menu-publication.repository.js';

@Module({
  controllers: [DigitizationController],
  imports: [AuthModule],
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
      inject: [MENU_EXTRACTION_GATEWAY, MENU_PUBLICATION_REPOSITORY],
      provide: DIGITIZE_MENU,
      useFactory: (
        gateway: MenuExtractionGateway,
        repository: MenuPublicationRepository,
      ): DigitizeMenu => new DigitizeMenu(gateway, repository),
    },
    {
      inject: [MENU_PUBLICATION_REPOSITORY],
      provide: GET_OWNED_MENU,
      useFactory: (repository: MenuPublicationRepository): GetOwnedMenu =>
        new GetOwnedMenu(repository),
    },
  ],
})
export class DigitizationModule {}
