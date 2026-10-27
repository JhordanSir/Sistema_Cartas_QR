import type { ServerResponse } from 'node:http';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

import {
  Controller,
  Get,
  Inject,
  Logger,
  Param,
  ParseUUIDPipe,
  Put,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { AuthRole } from '../auth/domain/auth-role.js';
import type { AuthPrincipal } from '../auth/domain/auth.types.js';
import { CurrentPrincipal, Roles } from '../auth/presentation/auth.decorators.js';
import { OwnerRestaurantGuard } from '../auth/presentation/owner-restaurant.guard.js';
import type {
  GetRestaurantCsv,
  OpenRestaurantCsv,
  SaveRestaurantCsv,
} from './application/use-cases/csv-file.use-cases.js';
import { GET_RESTAURANT_CSV, OPEN_RESTAURANT_CSV, SAVE_RESTAURANT_CSV } from './csv-files.tokens.js';
import { CSV_FILE_LIMITS, type CsvFileInfo } from './domain/csv-file.types.js';
import { throwCsvFileHttpError } from './presentation/csv-files-http.errors.js';

interface UploadedCsvFile {
  buffer: Buffer;
  originalname: string;
}

@Controller('owner/restaurants/:restaurantId/csv')
@Roles(AuthRole.OWNER)
@UseGuards(OwnerRestaurantGuard)
export class CsvFilesController {
  private readonly logger = new Logger(CsvFilesController.name);

  constructor(
    @Inject(SAVE_RESTAURANT_CSV) private readonly saveRestaurantCsv: SaveRestaurantCsv,
    @Inject(GET_RESTAURANT_CSV) private readonly getRestaurantCsv: GetRestaurantCsv,
    @Inject(OPEN_RESTAURANT_CSV) private readonly openRestaurantCsv: OpenRestaurantCsv,
  ) {}

  /** Name, size and date of the saved CSV, or 404 when there is none yet. */
  @Get()
  async info(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param('restaurantId', new ParseUUIDPipe({ version: '4' })) restaurantId: string,
  ): Promise<CsvFileInfo> {
    return this.handle(() => this.getRestaurantCsv.execute({ principal, restaurantId }));
  }

  /**
   * The saved CSV's bytes, read from disk as they are sent so the page's worker can
   * parse while it downloads. pipeline (not pipe) closes the file if the worker
   * stops halfway.
   */
  @Get('content')
  async content(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param('restaurantId', new ParseUUIDPipe({ version: '4' })) restaurantId: string,
    @Res() response: ServerResponse,
  ): Promise<void> {
    const { content, info } = await this.handle(() =>
      this.openRestaurantCsv.execute({ principal, restaurantId }),
    );
    response.statusCode = 200;
    // The bytes go as saved: the page detects the encoding, so no charset is claimed.
    response.setHeader('Content-Type', 'text/csv');
    response.setHeader('Content-Length', String(info.sizeBytes));
    response.setHeader('Cache-Control', 'no-store, no-transform');
    response.setHeader('X-Accel-Buffering', 'no');
    try {
      await pipeline(Readable.from(content), response);
    } catch (error) {
      if (isPrematureClose(error)) return;
      this.logger.error(
        `CSV download for ${restaurantId} failed`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  /** Saves the uploaded CSV as the restaurant's only one, replacing the previous. */
  @Put()
  @UseInterceptors(
    FileInterceptor('file', {
      // Browsers send file names as UTF-8; busboy would read them as latin1.
      defParamCharset: 'utf8',
      limits: { fileSize: CSV_FILE_LIMITS.maximumBytes, files: 1 },
    }),
  )
  async save(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param('restaurantId', new ParseUUIDPipe({ version: '4' })) restaurantId: string,
    @UploadedFile() file?: UploadedCsvFile,
  ): Promise<CsvFileInfo> {
    return this.handle(() =>
      this.saveRestaurantCsv.execute({
        bytes: file?.buffer,
        originalName: file?.originalname,
        principal,
        restaurantId,
      }),
    );
  }

  private async handle<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      throwCsvFileHttpError(error);
    }
  }
}

/** Read by its code: Node's own errors may come from another realm (as under Jest). */
function isPrematureClose(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'ERR_STREAM_PREMATURE_CLOSE'
  );
}
