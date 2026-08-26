import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

import { AuthApplicationError } from '../domain/auth.errors.js';

export function throwAuthHttpError(error: unknown): never {
  if (!(error instanceof AuthApplicationError)) {
    throw error;
  }

  switch (error.code) {
    case 'INVALID_CREDENTIALS':
    case 'INVALID_TOKEN':
    case 'CURRENT_PASSWORD_INVALID':
      throw new UnauthorizedException(error.message);
    case 'FORBIDDEN':
      throw new ForbiddenException(error.message);
    case 'ACCOUNT_NOT_FOUND':
      throw new NotFoundException(error.message);
    case 'PASSWORD_POLICY':
    case 'PASSWORD_REUSE':
      throw new BadRequestException(error.message);
  }
}
