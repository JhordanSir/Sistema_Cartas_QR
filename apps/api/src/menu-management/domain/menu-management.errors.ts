import type { ApiProblem } from '@sirio/shared';

export type MenuManagementErrorCode =
  | 'CATEGORY_NOT_FOUND'
  | 'FORBIDDEN'
  | 'INVALID_IMAGE'
  | 'INVALID_INPUT'
  | 'INVALID_ORDER'
  | 'PRODUCT_NOT_FOUND'
  | 'RESTAURANT_NOT_FOUND';

export class MenuManagementApplicationError extends Error {
  /** What the client should tell the person; without it the HTTP mapper picks one. */
  readonly problem: ApiProblem | undefined;

  constructor(
    readonly code: MenuManagementErrorCode,
    message: string,
    options: { problem?: ApiProblem } = {},
  ) {
    super(message);
    this.name = 'MenuManagementApplicationError';
    this.problem = options.problem;
  }
}
