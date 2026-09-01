export type RestaurantErrorCode =
  | 'EMAIL_ALREADY_EXISTS'
  | 'FORBIDDEN'
  | 'INVALID_CONFIRMATION'
  | 'INVALID_INPUT'
  | 'INVALID_LOGO'
  | 'QR_UNAVAILABLE'
  | 'RESTAURANT_NOT_FOUND'
  | 'SLUG_ALLOCATION_FAILED';

export class RestaurantApplicationError extends Error {
  constructor(
    readonly code: RestaurantErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'RestaurantApplicationError';
  }
}
