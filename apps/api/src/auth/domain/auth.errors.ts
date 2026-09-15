import {
  ApplicationError,
  type ApplicationErrorOptions,
} from '../../common/application-error.js';

export type AuthErrorCode =
  | 'ACCOUNT_NOT_FOUND'
  | 'CURRENT_PASSWORD_INVALID'
  | 'FORBIDDEN'
  | 'INVALID_CREDENTIALS'
  | 'INVALID_TOKEN'
  | 'PASSWORD_POLICY'
  | 'PASSWORD_REUSE';

export class AuthApplicationError extends ApplicationError<AuthErrorCode> {
  constructor(code: AuthErrorCode, message: string, options?: ApplicationErrorOptions) {
    super(code, message, options);
    this.name = 'AuthApplicationError';
  }
}
