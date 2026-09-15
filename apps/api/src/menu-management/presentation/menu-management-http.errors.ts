import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { toMegabytes } from '@sirio/shared';

import { httpErrorMapper } from '../../common/http-error-mapper.js';
import { MenuManagementApplicationError } from '../domain/menu-management.errors.js';
import { PRODUCT_IMAGE_LIMITS } from '../domain/menu-management.types.js';

export const throwMenuManagementHttpError: (error: unknown) => never = httpErrorMapper(
  MenuManagementApplicationError,
  {
    CATEGORY_NOT_FOUND: { exception: NotFoundException, problem: { code: 'CATEGORY_NOT_FOUND' } },
    FORBIDDEN: { exception: ForbiddenException, problem: { code: 'ACCESS_DENIED' } },
    INVALID_IMAGE: {
      exception: BadRequestException,
      problem: {
        code: 'PRODUCT_IMAGE_INVALID',
        params: { maxMb: toMegabytes(PRODUCT_IMAGE_LIMITS.maximumBytes) },
      },
    },
    INVALID_INPUT: { exception: BadRequestException, problem: { code: 'REQUEST_INVALID' } },
    INVALID_ORDER: {
      exception: BadRequestException,
      problem: { code: 'MENU_ORDER_INCOMPLETE', params: { subject: 'items' } },
    },
    PRODUCT_NOT_FOUND: { exception: NotFoundException, problem: { code: 'PRODUCT_NOT_FOUND' } },
    RESTAURANT_NOT_FOUND: {
      exception: NotFoundException,
      problem: { code: 'RESTAURANT_NOT_FOUND' },
    },
  },
);
