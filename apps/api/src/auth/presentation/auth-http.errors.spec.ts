import type { HttpException } from '@nestjs/common';
import type { ApiErrorCode } from '@sirio/shared';

import { AuthApplicationError, type AuthErrorCode } from '../domain/auth.errors.js';
import { throwAuthHttpError } from './auth-http.errors.js';

const EXPECTED: Record<AuthErrorCode, [status: number, code: ApiErrorCode]> = {
  ACCOUNT_NOT_FOUND: [404, 'ACCOUNT_NOT_FOUND'],
  CURRENT_PASSWORD_INVALID: [401, 'CURRENT_PASSWORD_INVALID'],
  FORBIDDEN: [403, 'ACCESS_DENIED'],
  INVALID_CREDENTIALS: [401, 'INVALID_CREDENTIALS'],
  INVALID_TOKEN: [401, 'SESSION_EXPIRED'],
  PASSWORD_POLICY: [400, 'PASSWORD_LENGTH'],
  PASSWORD_REUSE: [400, 'PASSWORD_REUSE'],
};

describe('throwAuthHttpError', () => {
  it.each(Object.entries(EXPECTED))(
    'maps %s to its status with a default problem',
    (domainCode, [status, code]) => {
      const exception = mapped(new AuthApplicationError(domainCode as AuthErrorCode, 'Domain detail'));

      expect(exception.getStatus()).toBe(status);
      expect(exception.getResponse()).toMatchObject({
        code,
        message: 'Domain detail',
        statusCode: status,
      });
    },
  );

  it('prefers the problem the domain attached', () => {
    const exception = mapped(
      new AuthApplicationError('PASSWORD_POLICY', 'Password must contain an uppercase letter', {
        problem: { code: 'PASSWORD_COMPLEXITY' },
      }),
    );

    expect(exception.getResponse()).toEqual({
      code: 'PASSWORD_COMPLEXITY',
      error: 'Bad Request',
      message: 'Password must contain an uppercase letter',
      statusCode: 400,
    });
  });

  it('lets unexpected errors through untouched', () => {
    const failure = new Error('database unavailable');

    expect(mapped(failure)).toBe(failure);
  });
});

function mapped(error: unknown): HttpException {
  try {
    throwAuthHttpError(error);
  } catch (exception) {
    return exception as HttpException;
  }
}
