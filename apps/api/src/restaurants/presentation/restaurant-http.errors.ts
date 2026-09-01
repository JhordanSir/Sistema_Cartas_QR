import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

import { RestaurantApplicationError } from '../domain/restaurant.errors.js';

export function throwRestaurantHttpError(error: unknown): never {
  if (!(error instanceof RestaurantApplicationError)) {
    throw error;
  }

  switch (error.code) {
    case 'FORBIDDEN':
      throw new ForbiddenException(error.message);
    case 'RESTAURANT_NOT_FOUND':
      throw new NotFoundException(error.message);
    case 'EMAIL_ALREADY_EXISTS':
      throw new ConflictException(error.message);
    case 'INVALID_CONFIRMATION':
    case 'INVALID_INPUT':
    case 'INVALID_LOGO':
    case 'SLUG_ALLOCATION_FAILED':
      throw new BadRequestException(error.message);
    case 'QR_UNAVAILABLE':
      throw new InternalServerErrorException(error.message);
  }
}
