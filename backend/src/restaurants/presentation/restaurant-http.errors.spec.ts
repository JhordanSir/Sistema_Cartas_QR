import type { HttpException } from '@nestjs/common';
import type { ApiErrorCode } from '@sirio/shared';

import {
  RestaurantApplicationError,
  type RestaurantErrorCode,
} from '../domain/restaurant.errors.js';
import { throwRestaurantHttpError } from './restaurant-http.errors.js';

const EXPECTED: Record<RestaurantErrorCode, [status: number, code: ApiErrorCode]> = {
  EMAIL_ALREADY_EXISTS: [409, 'OWNER_EMAIL_TAKEN'],
  FORBIDDEN: [403, 'ACCESS_DENIED'],
  INVALID_CONFIRMATION: [400, 'REQUEST_INVALID'],
  INVALID_INPUT: [400, 'REQUEST_INVALID'],
  INVALID_LOGO: [400, 'LOGO_FORMAT_INVALID'],
  QR_UNAVAILABLE: [500, 'QR_UNAVAILABLE'],
  RESTAURANT_NOT_FOUND: [404, 'RESTAURANT_NOT_FOUND'],
  SLUG_ALLOCATION_FAILED: [400, 'SLUG_UNAVAILABLE'],
};

describe('throwRestaurantHttpError', () => {
  it.each(Object.entries(EXPECTED))(
    'maps %s to its status with a default problem',
    (domainCode, [status, code]) => {
      const exception = mapped(
        new RestaurantApplicationError(domainCode as RestaurantErrorCode, 'Detalle del dominio'),
      );

      expect(exception.getStatus()).toBe(status);
      expect(exception.getResponse()).toMatchObject({
        code,
        message: 'Detalle del dominio',
        statusCode: status,
      });
    },
  );

  it('prefers the problem the domain attached', () => {
    const exception = mapped(
      new RestaurantApplicationError('INVALID_LOGO', 'El logo debe pesar como máximo 2 MB.', {
        problem: { code: 'LOGO_TOO_LARGE', params: { maxMb: 2 } },
      }),
    );

    expect(exception.getResponse()).toEqual({
      code: 'LOGO_TOO_LARGE',
      error: 'Bad Request',
      message: 'El logo debe pesar como máximo 2 MB.',
      params: { maxMb: 2 },
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
    throwRestaurantHttpError(error);
  } catch (exception) {
    return exception as HttpException;
  }
}
