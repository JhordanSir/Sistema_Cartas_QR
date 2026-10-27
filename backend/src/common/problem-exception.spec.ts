import { BadRequestException, ForbiddenException } from '@nestjs/common';

import { problemException } from './problem-exception.js';

describe('problemException', () => {
  it('keeps the standard Nest body and adds the code with its params', () => {
    const exception = problemException(
      BadRequestException,
      'El logo debe pesar como máximo 2 MB.',
      { code: 'LOGO_TOO_LARGE', params: { maxMb: 2 } },
    );

    expect(exception).toBeInstanceOf(BadRequestException);
    expect(exception.getStatus()).toBe(400);
    expect(exception.message).toBe('El logo debe pesar como máximo 2 MB.');
    expect(exception.getResponse()).toEqual({
      code: 'LOGO_TOO_LARGE',
      error: 'Bad Request',
      message: 'El logo debe pesar como máximo 2 MB.',
      params: { maxMb: 2 },
      statusCode: 400,
    });
  });

  it('sends no params key for a code that needs none', () => {
    const exception = problemException(ForbiddenException, 'Owner access required', {
      code: 'ACCESS_DENIED',
    });

    expect(exception.getStatus()).toBe(403);
    expect(exception.getResponse()).toEqual({
      code: 'ACCESS_DENIED',
      error: 'Forbidden',
      message: 'Owner access required',
      statusCode: 403,
    });
  });
});
