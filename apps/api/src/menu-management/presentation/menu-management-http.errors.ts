import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import type { ApiProblem } from '@sirio/shared';

import { problemException } from '../../common/problem-exception.js';
import {
  MenuManagementApplicationError,
  type MenuManagementErrorCode,
} from '../domain/menu-management.errors.js';
import { PRODUCT_IMAGE_LIMITS } from '../domain/menu-management.types.js';

const BYTES_PER_MB = 1024 * 1024;

// Used when the domain did not attach a more specific problem to the error.
const DEFAULT_PROBLEMS: Record<MenuManagementErrorCode, ApiProblem> = {
  CATEGORY_NOT_FOUND: { code: 'CATEGORY_NOT_FOUND' },
  FORBIDDEN: { code: 'ACCESS_DENIED' },
  INVALID_IMAGE: {
    code: 'PRODUCT_IMAGE_INVALID',
    params: { maxMb: PRODUCT_IMAGE_LIMITS.maximumBytes / BYTES_PER_MB },
  },
  INVALID_INPUT: { code: 'REQUEST_INVALID' },
  INVALID_ORDER: { code: 'MENU_ORDER_INCOMPLETE', params: { subject: 'items' } },
  PRODUCT_NOT_FOUND: { code: 'PRODUCT_NOT_FOUND' },
  RESTAURANT_NOT_FOUND: { code: 'RESTAURANT_NOT_FOUND' },
};

export function throwMenuManagementHttpError(error: unknown): never {
  if (!(error instanceof MenuManagementApplicationError)) throw error;
  const problem = error.problem ?? DEFAULT_PROBLEMS[error.code];
  switch (error.code) {
    case 'FORBIDDEN':
      throw problemException(ForbiddenException, error.message, problem);
    case 'CATEGORY_NOT_FOUND':
    case 'PRODUCT_NOT_FOUND':
    case 'RESTAURANT_NOT_FOUND':
      throw problemException(NotFoundException, error.message, problem);
    case 'INVALID_IMAGE':
    case 'INVALID_INPUT':
    case 'INVALID_ORDER':
      throw problemException(BadRequestException, error.message, problem);
  }
}
