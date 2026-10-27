import {
  ApplicationError,
  type ApplicationErrorOptions,
} from '../../common/application-error.js';

export type CsvFileErrorCode =
  | 'CSV_FILE_INVALID'
  | 'CSV_FILE_NOT_FOUND'
  | 'CSV_FILE_REQUIRED'
  | 'CSV_FILE_TOO_LARGE'
  | 'FORBIDDEN'
  | 'RESTAURANT_NOT_FOUND';

export class CsvFileApplicationError extends ApplicationError<CsvFileErrorCode> {
  constructor(code: CsvFileErrorCode, message: string, options?: ApplicationErrorOptions) {
    super(code, message, options);
    this.name = 'CsvFileApplicationError';
  }
}
