import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

import { httpErrorMapper } from '../../common/http-error-mapper.js';
import {
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
} from '../application/auth.utils.js';
import { AuthApplicationError } from '../domain/auth.errors.js';

export const throwAuthHttpError: (error: unknown) => never = httpErrorMapper(
  AuthApplicationError,
  {
    ACCOUNT_NOT_FOUND: { exception: NotFoundException, problem: { code: 'ACCOUNT_NOT_FOUND' } },
    CURRENT_PASSWORD_INVALID: {
      exception: UnauthorizedException,
      problem: { code: 'CURRENT_PASSWORD_INVALID' },
    },
    FORBIDDEN: { exception: ForbiddenException, problem: { code: 'ACCESS_DENIED' } },
    INVALID_CREDENTIALS: {
      exception: UnauthorizedException,
      problem: { code: 'INVALID_CREDENTIALS' },
    },
    INVALID_TOKEN: { exception: UnauthorizedException, problem: { code: 'SESSION_EXPIRED' } },
    PASSWORD_POLICY: {
      exception: BadRequestException,
      problem: {
        code: 'PASSWORD_LENGTH',
        params: { max: MAX_PASSWORD_LENGTH, min: MIN_PASSWORD_LENGTH },
      },
    },
    PASSWORD_REUSE: { exception: BadRequestException, problem: { code: 'PASSWORD_REUSE' } },
  },
);
