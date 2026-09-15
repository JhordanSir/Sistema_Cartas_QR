import type { ApiProblem } from '@sirio/shared';

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
  /** What the client should tell the person; without it the HTTP mapper picks one. */
  readonly problem: ApiProblem | undefined;

  constructor(
    readonly code: RestaurantErrorCode,
    message: string,
    options: { problem?: ApiProblem } = {},
  ) {
    super(message);
    this.name = 'RestaurantApplicationError';
    this.problem = options.problem;
  }
}
