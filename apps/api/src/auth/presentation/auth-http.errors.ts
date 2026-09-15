import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import type { ApiProblem } from '@sirio/shared';

import { problemException } from '../../common/problem-exception.js';
import {
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
} from '../application/auth.utils.js';
import { AuthApplicationError, type AuthErrorCode } from '../domain/auth.errors.js';

// Used when the domain did not attach a more specific problem to the error.
const DEFAULT_PROBLEMS: Record<AuthErrorCode, ApiProblem> = {
  ACCOUNT_NOT_FOUND: { code: 'ACCOUNT_NOT_FOUND' },
  CURRENT_PASSWORD_INVALID: { code: 'CURRENT_PASSWORD_INVALID' },
  FORBIDDEN: { code: 'ACCESS_DENIED' },
  INVALID_CREDENTIALS: { code: 'INVALID_CREDENTIALS' },
  INVALID_TOKEN: { code: 'SESSION_EXPIRED' },
  PASSWORD_POLICY: {
    code: 'PASSWORD_LENGTH',
    params: { max: MAX_PASSWORD_LENGTH, min: MIN_PASSWORD_LENGTH },
  },
  PASSWORD_REUSE: { code: 'PASSWORD_REUSE' },
};

export function throwAuthHttpError(error: unknown): never {
  if (!(error instanceof AuthApplicationError)) {
    throw error;
  }

  const problem = error.problem ?? DEFAULT_PROBLEMS[error.code];
  switch (error.code) {
    case 'INVALID_CREDENTIALS':
    case 'INVALID_TOKEN':
    case 'CURRENT_PASSWORD_INVALID':
      throw problemException(UnauthorizedException, error.message, problem);
    case 'FORBIDDEN':
      throw problemException(ForbiddenException, error.message, problem);
    case 'ACCOUNT_NOT_FOUND':
      throw problemException(NotFoundException, error.message, problem);
    case 'PASSWORD_POLICY':
    case 'PASSWORD_REUSE':
      throw problemException(BadRequestException, error.message, problem);
  }
}
