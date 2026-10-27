import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { toMegabytes } from '@sirio/shared';

import { httpErrorMapper } from '../../common/http-error-mapper.js';
import { CsvFileApplicationError } from '../domain/csv-file.errors.js';
import { CSV_FILE_LIMITS } from '../domain/csv-file.types.js';

export const throwCsvFileHttpError: (error: unknown) => never = httpErrorMapper(
  CsvFileApplicationError,
  {
    CSV_FILE_INVALID: { exception: BadRequestException, problem: { code: 'CSV_FILE_INVALID' } },
    CSV_FILE_NOT_FOUND: { exception: NotFoundException, problem: { code: 'CSV_FILE_NOT_FOUND' } },
    CSV_FILE_REQUIRED: { exception: BadRequestException, problem: { code: 'CSV_FILE_REQUIRED' } },
    CSV_FILE_TOO_LARGE: {
      exception: PayloadTooLargeException,
      problem: {
        code: 'CSV_FILE_TOO_LARGE',
        params: { maxMb: toMegabytes(CSV_FILE_LIMITS.maximumBytes) },
      },
    },
    FORBIDDEN: { exception: ForbiddenException, problem: { code: 'ACCESS_DENIED' } },
    RESTAURANT_NOT_FOUND: {
      exception: NotFoundException,
      problem: { code: 'RESTAURANT_NOT_FOUND' },
    },
  },
);
