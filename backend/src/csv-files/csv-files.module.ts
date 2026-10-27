import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AuthModule } from '../auth/auth.module.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CsvFileRepository, CsvFileStorage } from './application/ports/csv-file.ports.js';
import {
  GetRestaurantCsv,
  OpenRestaurantCsv,
  SaveRestaurantCsv,
} from './application/use-cases/csv-file.use-cases.js';
import { CsvFilesController } from './csv-files.controller.js';
import {
  CSV_FILE_REPOSITORY,
  CSV_FILE_STORAGE,
  GET_RESTAURANT_CSV,
  OPEN_RESTAURANT_CSV,
  SAVE_RESTAURANT_CSV,
} from './csv-files.tokens.js';
import { LocalCsvFileStorage } from './infrastructure/local-csv-file.storage.js';
import { PrismaCsvFileRepository } from './infrastructure/prisma-csv-file.repository.js';

@Module({
  controllers: [CsvFilesController],
  imports: [AuthModule],
  providers: [
    {
      inject: [PrismaService],
      provide: CSV_FILE_REPOSITORY,
      useFactory: (prisma: PrismaService): CsvFileRepository => new PrismaCsvFileRepository(prisma),
    },
    {
      inject: [ConfigService],
      provide: CSV_FILE_STORAGE,
      useFactory: (config: ConfigService): CsvFileStorage =>
        new LocalCsvFileStorage(config.getOrThrow<string>('STORAGE_PATH')),
    },
    {
      inject: [CSV_FILE_REPOSITORY, CSV_FILE_STORAGE],
      provide: SAVE_RESTAURANT_CSV,
      useFactory: (repository: CsvFileRepository, storage: CsvFileStorage): SaveRestaurantCsv =>
        new SaveRestaurantCsv(repository, storage),
    },
    {
      inject: [CSV_FILE_REPOSITORY],
      provide: GET_RESTAURANT_CSV,
      useFactory: (repository: CsvFileRepository): GetRestaurantCsv => new GetRestaurantCsv(repository),
    },
    {
      inject: [CSV_FILE_REPOSITORY, CSV_FILE_STORAGE],
      provide: OPEN_RESTAURANT_CSV,
      useFactory: (repository: CsvFileRepository, storage: CsvFileStorage): OpenRestaurantCsv =>
        new OpenRestaurantCsv(repository, storage),
    },
  ],
})
export class CsvFilesModule {}
