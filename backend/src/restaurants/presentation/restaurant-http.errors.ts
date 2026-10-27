import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

import { httpErrorMapper } from '../../common/http-error-mapper.js';
import { RestaurantApplicationError } from '../domain/restaurant.errors.js';

export const throwRestaurantHttpError: (error: unknown) => never = httpErrorMapper(
  RestaurantApplicationError,
  {
    EMAIL_ALREADY_EXISTS: { exception: ConflictException, problem: { code: 'OWNER_EMAIL_TAKEN' } },
    FORBIDDEN: { exception: ForbiddenException, problem: { code: 'ACCESS_DENIED' } },
    INVALID_CONFIRMATION: { exception: BadRequestException, problem: { code: 'REQUEST_INVALID' } },
    INVALID_INPUT: { exception: BadRequestException, problem: { code: 'REQUEST_INVALID' } },
    INVALID_LOGO: { exception: BadRequestException, problem: { code: 'LOGO_FORMAT_INVALID' } },
    QR_UNAVAILABLE: {
      exception: InternalServerErrorException,
      problem: { code: 'QR_UNAVAILABLE' },
    },
    RESTAURANT_NOT_FOUND: {
      exception: NotFoundException,
      problem: { code: 'RESTAURANT_NOT_FOUND' },
    },
    SLUG_ALLOCATION_FAILED: {
      exception: BadRequestException,
      problem: { code: 'SLUG_UNAVAILABLE' },
    },
  },
);
