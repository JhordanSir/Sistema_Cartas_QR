export type AuthErrorCode =
  | 'ACCOUNT_NOT_FOUND'
  | 'CURRENT_PASSWORD_INVALID'
  | 'FORBIDDEN'
  | 'INVALID_CREDENTIALS'
  | 'INVALID_TOKEN'
  | 'PASSWORD_POLICY'
  | 'PASSWORD_REUSE';

export class AuthApplicationError extends Error {
  constructor(
    readonly code: AuthErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'AuthApplicationError';
  }
}
