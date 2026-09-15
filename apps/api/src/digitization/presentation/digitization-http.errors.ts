import {
  BadGatewayException,
  BadRequestException,
  ForbiddenException,
  GatewayTimeoutException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { ApiProblem } from '@sirio/shared';

import { problemException } from '../../common/problem-exception.js';
import {
  DigitizationApplicationError,
  type DigitizationErrorCode,
} from '../domain/digitization.errors.js';
import { MENU_PHOTO_LIMITS } from '../domain/menu.types.js';

const BYTES_PER_MB = 1024 * 1024;

// Used when the domain did not attach a more specific problem to the error. Every
// INVALID_MODEL_RESPONSE detail ("categoría 3 no contiene productos…") is internal, so
// the person always reads the same actionable advice.
const DEFAULT_PROBLEMS: Record<DigitizationErrorCode, ApiProblem> = {
  EMPTY_MENU: { code: 'MENU_EMPTY' },
  FORBIDDEN: { code: 'ACCESS_DENIED' },
  INVALID_IMAGE: {
    code: 'MENU_PHOTO_INVALID',
    params: { maxMb: MENU_PHOTO_LIMITS.maximumBytesPerPhoto / BYTES_PER_MB },
  },
  INVALID_INPUT: { code: 'REQUEST_INVALID' },
  INVALID_MODEL_RESPONSE: { code: 'MODEL_RESPONSE_UNREADABLE' },
  MODEL_CONFIGURATION_ERROR: { code: 'MODEL_MISCONFIGURED' },
  MODEL_TIMEOUT: { code: 'MODEL_TIMEOUT' },
  MODEL_UNAVAILABLE: { code: 'MODEL_UNAVAILABLE' },
  RESTAURANT_NOT_FOUND: { code: 'RESTAURANT_NOT_FOUND' },
};

export function throwDigitizationHttpError(error: unknown): never {
  if (!(error instanceof DigitizationApplicationError)) throw error;
  const problem = error.problem ?? DEFAULT_PROBLEMS[error.code];
  switch (error.code) {
    case 'EMPTY_MENU':
      throw problemException(BadRequestException, error.message, problem);
    case 'FORBIDDEN':
      throw problemException(ForbiddenException, error.message, problem);
    case 'RESTAURANT_NOT_FOUND':
      throw problemException(NotFoundException, error.message, problem);
    case 'MODEL_TIMEOUT':
      throw problemException(GatewayTimeoutException, error.message, problem);
    case 'MODEL_UNAVAILABLE':
      throw problemException(ServiceUnavailableException, error.message, problem);
    case 'MODEL_CONFIGURATION_ERROR':
      throw problemException(BadGatewayException, error.message, problem);
    case 'INVALID_IMAGE':
    case 'INVALID_INPUT':
    case 'INVALID_MODEL_RESPONSE':
      throw problemException(BadRequestException, error.message, problem);
  }
}
