import type { ApiProblem } from '@sirio/shared';

export type AuthErrorCode =
  | 'ACCOUNT_NOT_FOUND'
  | 'CURRENT_PASSWORD_INVALID'
  | 'FORBIDDEN'
  | 'INVALID_CREDENTIALS'
  | 'INVALID_TOKEN'
  | 'PASSWORD_POLICY'
  | 'PASSWORD_REUSE';

export class AuthApplicationError extends Error {
  /** What the client should tell the person; without it the HTTP mapper picks one. */
  readonly problem: ApiProblem | undefined;

  constructor(
    readonly code: AuthErrorCode,
    message: string,
    options: { problem?: ApiProblem } = {},
  ) {
    super(message);
    this.name = 'AuthApplicationError';
    this.problem = options.problem;
  }
}
