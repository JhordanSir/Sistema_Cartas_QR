import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import { MenuManagementApplicationError } from '../domain/menu-management.errors.js';

export function throwMenuManagementHttpError(error: unknown): never {
  if (!(error instanceof MenuManagementApplicationError)) throw error;
  switch (error.code) {
    case 'FORBIDDEN':
      throw new ForbiddenException(error.message);
    case 'CATEGORY_NOT_FOUND':
    case 'PRODUCT_NOT_FOUND':
    case 'RESTAURANT_NOT_FOUND':
      throw new NotFoundException(error.message);
    case 'INVALID_IMAGE':
    case 'INVALID_INPUT':
    case 'INVALID_ORDER':
      throw new BadRequestException(error.message);
  }
}
