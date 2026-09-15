import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import type { ApiProblem } from '@sirio/shared';

import { problemException } from '../../common/problem-exception.js';
import {
  RestaurantApplicationError,
  type RestaurantErrorCode,
} from '../domain/restaurant.errors.js';

// Used when the domain did not attach a more specific problem to the error.
const DEFAULT_PROBLEMS: Record<RestaurantErrorCode, ApiProblem> = {
  EMAIL_ALREADY_EXISTS: { code: 'OWNER_EMAIL_TAKEN' },
  FORBIDDEN: { code: 'ACCESS_DENIED' },
  INVALID_CONFIRMATION: { code: 'REQUEST_INVALID' },
  INVALID_INPUT: { code: 'REQUEST_INVALID' },
  INVALID_LOGO: { code: 'LOGO_FORMAT_INVALID' },
  QR_UNAVAILABLE: { code: 'QR_UNAVAILABLE' },
  RESTAURANT_NOT_FOUND: { code: 'RESTAURANT_NOT_FOUND' },
  SLUG_ALLOCATION_FAILED: { code: 'SLUG_UNAVAILABLE' },
};

export function throwRestaurantHttpError(error: unknown): never {
  if (!(error instanceof RestaurantApplicationError)) {
    throw error;
  }

  const problem = error.problem ?? DEFAULT_PROBLEMS[error.code];
  switch (error.code) {
    case 'FORBIDDEN':
      throw problemException(ForbiddenException, error.message, problem);
    case 'RESTAURANT_NOT_FOUND':
      throw problemException(NotFoundException, error.message, problem);
    case 'EMAIL_ALREADY_EXISTS':
      throw problemException(ConflictException, error.message, problem);
    case 'INVALID_CONFIRMATION':
    case 'INVALID_INPUT':
    case 'INVALID_LOGO':
    case 'SLUG_ALLOCATION_FAILED':
      throw problemException(BadRequestException, error.message, problem);
    case 'QR_UNAVAILABLE':
      throw problemException(InternalServerErrorException, error.message, problem);
  }
}
