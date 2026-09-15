import {
  BadGatewayException,
  BadRequestException,
  ForbiddenException,
  GatewayTimeoutException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { toMegabytes } from '@sirio/shared';

import { httpErrorMapper } from '../../common/http-error-mapper.js';
import { DigitizationApplicationError } from '../domain/digitization.errors.js';
import { MENU_PHOTO_LIMITS } from '../domain/menu.types.js';

// Every INVALID_MODEL_RESPONSE detail ("categoría 3 no contiene productos…") is internal,
// so the person always reads the same actionable advice.
export const throwDigitizationHttpError: (error: unknown) => never = httpErrorMapper(
  DigitizationApplicationError,
  {
    EMPTY_MENU: { exception: BadRequestException, problem: { code: 'MENU_EMPTY' } },
    FORBIDDEN: { exception: ForbiddenException, problem: { code: 'ACCESS_DENIED' } },
    INVALID_IMAGE: {
      exception: BadRequestException,
      problem: {
        code: 'MENU_PHOTO_INVALID',
        params: { maxMb: toMegabytes(MENU_PHOTO_LIMITS.maximumBytesPerPhoto) },
      },
    },
    INVALID_INPUT: { exception: BadRequestException, problem: { code: 'REQUEST_INVALID' } },
    INVALID_MODEL_RESPONSE: {
      exception: BadRequestException,
      problem: { code: 'MODEL_RESPONSE_UNREADABLE' },
    },
    MODEL_CONFIGURATION_ERROR: {
      exception: BadGatewayException,
      problem: { code: 'MODEL_MISCONFIGURED' },
    },
    MODEL_TIMEOUT: { exception: GatewayTimeoutException, problem: { code: 'MODEL_TIMEOUT' } },
    MODEL_UNAVAILABLE: {
      exception: ServiceUnavailableException,
      problem: { code: 'MODEL_UNAVAILABLE' },
    },
    RESTAURANT_NOT_FOUND: {
      exception: NotFoundException,
      problem: { code: 'RESTAURANT_NOT_FOUND' },
    },
  },
);
