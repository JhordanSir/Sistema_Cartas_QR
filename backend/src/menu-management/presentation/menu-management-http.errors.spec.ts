import type { HttpException } from '@nestjs/common';
import type { ApiErrorCode } from '@sirio/shared';

import {
  MenuManagementApplicationError,
  type MenuManagementErrorCode,
} from '../domain/menu-management.errors.js';
import { throwMenuManagementHttpError } from './menu-management-http.errors.js';

const EXPECTED: Record<MenuManagementErrorCode, [status: number, code: ApiErrorCode]> = {
  CATEGORY_NOT_FOUND: [404, 'CATEGORY_NOT_FOUND'],
  FORBIDDEN: [403, 'ACCESS_DENIED'],
  INVALID_IMAGE: [400, 'PRODUCT_IMAGE_INVALID'],
  INVALID_INPUT: [400, 'REQUEST_INVALID'],
  INVALID_ORDER: [400, 'MENU_ORDER_INCOMPLETE'],
  PRODUCT_NOT_FOUND: [404, 'PRODUCT_NOT_FOUND'],
  RESTAURANT_NOT_FOUND: [404, 'RESTAURANT_NOT_FOUND'],
};

describe('throwMenuManagementHttpError', () => {
  it.each(Object.entries(EXPECTED))(
    'maps %s to its status with a default problem',
    (domainCode, [status, code]) => {
      const exception = mapped(
        new MenuManagementApplicationError(
          domainCode as MenuManagementErrorCode,
          'Detalle del dominio',
        ),
      );

      expect(exception.getStatus()).toBe(status);
      expect(exception.getResponse()).toMatchObject({
        code,
        message: 'Detalle del dominio',
        statusCode: status,
      });
    },
  );

  it('fills the params a default problem needs', () => {
    expect(mapped(new MenuManagementApplicationError('INVALID_IMAGE', 'x')).getResponse()).toMatchObject({
      params: { maxMb: 4 },
    });
    expect(mapped(new MenuManagementApplicationError('INVALID_ORDER', 'x')).getResponse()).toMatchObject({
      params: { subject: 'items' },
    });
  });

  it('prefers the problem the domain attached', () => {
    const exception = mapped(
      new MenuManagementApplicationError('INVALID_ORDER', 'El orden contiene elementos repetidos.', {
        problem: { code: 'MENU_ORDER_DUPLICATED' },
      }),
    );

    expect(exception.getResponse()).toEqual({
      code: 'MENU_ORDER_DUPLICATED',
      error: 'Bad Request',
      message: 'El orden contiene elementos repetidos.',
      statusCode: 400,
    });
  });

  it('lets unexpected errors through untouched', () => {
    const failure = new Error('database unavailable');

    expect(mapped(failure)).toBe(failure);
  });
});

function mapped(error: unknown): HttpException {
  try {
    throwMenuManagementHttpError(error);
  } catch (exception) {
    return exception as HttpException;
  }
}
