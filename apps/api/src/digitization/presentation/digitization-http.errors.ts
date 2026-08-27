import {
  BadGatewayException,
  BadRequestException,
  ForbiddenException,
  GatewayTimeoutException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';

import { DigitizationApplicationError } from '../domain/digitization.errors.js';

export function throwDigitizationHttpError(error: unknown): never {
  if (!(error instanceof DigitizationApplicationError)) throw error;
  switch (error.code) {
    case 'FORBIDDEN':
      throw new ForbiddenException(error.message);
    case 'RESTAURANT_NOT_FOUND':
      throw new NotFoundException(error.message);
    case 'MODEL_TIMEOUT':
      throw new GatewayTimeoutException(error.message);
    case 'MODEL_UNAVAILABLE':
      throw new ServiceUnavailableException(error.message);
    case 'MODEL_CONFIGURATION_ERROR':
      throw new BadGatewayException(error.message);
    case 'INVALID_IMAGE':
    case 'INVALID_INPUT':
    case 'INVALID_MODEL_RESPONSE':
      throw new BadRequestException(error.message);
  }
}
