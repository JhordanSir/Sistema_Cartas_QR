import type { HttpException } from '@nestjs/common';
import type { ApiErrorCode } from '@sirio/shared';

import {
  DigitizationApplicationError,
  type DigitizationErrorCode,
} from '../domain/digitization.errors.js';
import { throwDigitizationHttpError } from './digitization-http.errors.js';

const EXPECTED: Record<DigitizationErrorCode, [status: number, code: ApiErrorCode]> = {
  EMPTY_MENU: [400, 'MENU_EMPTY'],
  FORBIDDEN: [403, 'ACCESS_DENIED'],
  INVALID_IMAGE: [400, 'MENU_PHOTO_INVALID'],
  INVALID_INPUT: [400, 'REQUEST_INVALID'],
  INVALID_MODEL_RESPONSE: [400, 'MODEL_RESPONSE_UNREADABLE'],
  MODEL_CONFIGURATION_ERROR: [502, 'MODEL_MISCONFIGURED'],
  MODEL_TIMEOUT: [504, 'MODEL_TIMEOUT'],
  MODEL_UNAVAILABLE: [503, 'MODEL_UNAVAILABLE'],
  RESTAURANT_NOT_FOUND: [404, 'RESTAURANT_NOT_FOUND'],
};

describe('throwDigitizationHttpError', () => {
  it.each(Object.entries(EXPECTED))(
    'maps %s to its status with a default problem',
    (domainCode, [status, code]) => {
      const exception = mapped(
        new DigitizationApplicationError(domainCode as DigitizationErrorCode, 'Detalle del dominio'),
      );

      expect(exception.getStatus()).toBe(status);
      expect(exception.getResponse()).toMatchObject({
        code,
        message: 'Detalle del dominio',
        statusCode: status,
      });
    },
  );

  it('never forwards what the model got wrong, only the advice', () => {
    const exception = mapped(
      new DigitizationApplicationError(
        'INVALID_MODEL_RESPONSE',
        'La categoría 3 no contiene productos válidos.',
      ),
    );

    expect(exception.getResponse()).not.toHaveProperty('params');
  });

  it('prefers the problem the domain attached', () => {
    const exception = mapped(
      new DigitizationApplicationError('INVALID_IMAGE', 'Sube entre 1 y 5 fotos de la carta.', {
        problem: { code: 'MENU_PHOTO_COUNT', params: { max: 5 } },
      }),
    );

    expect(exception.getResponse()).toMatchObject({
      code: 'MENU_PHOTO_COUNT',
      params: { max: 5 },
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
    throwDigitizationHttpError(error);
  } catch (exception) {
    return exception as HttpException;
  }
}
