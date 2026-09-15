import {
  ApplicationError,
  type ApplicationErrorOptions,
} from '../../common/application-error.js';

export type RestaurantErrorCode =
  | 'EMAIL_ALREADY_EXISTS'
  | 'FORBIDDEN'
  | 'INVALID_CONFIRMATION'
  | 'INVALID_INPUT'
  | 'INVALID_LOGO'
  | 'QR_UNAVAILABLE'
  | 'RESTAURANT_NOT_FOUND'
  | 'SLUG_ALLOCATION_FAILED';

export class RestaurantApplicationError extends ApplicationError<RestaurantErrorCode> {
  constructor(code: RestaurantErrorCode, message: string, options?: ApplicationErrorOptions) {
    super(code, message, options);
    this.name = 'RestaurantApplicationError';
  }
}
