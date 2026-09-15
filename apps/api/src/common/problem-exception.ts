import type { HttpException } from '@nestjs/common';
import type { ApiProblem } from '@sirio/shared';

type HttpExceptionClass = new (objectOrError?: object | string) => HttpException;

/**
 * Builds the exception Nest would build from `message` and adds the problem code the
 * clients translate. The standard `{ statusCode, error, message }` body stays intact,
 * so any client that only reads `message` keeps working.
 */
export function problemException(
  Exception: HttpExceptionClass,
  message: string,
  problem: ApiProblem,
): HttpException {
  const standardBody = new Exception(message).getResponse() as Record<string, unknown>;
  return new Exception({ ...standardBody, ...problem });
}
