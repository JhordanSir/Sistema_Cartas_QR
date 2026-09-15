import type { HttpException } from '@nestjs/common';
import type { ApiProblem } from '@sirio/shared';

export type HttpExceptionClass = new (objectOrError?: object | string) => HttpException;

export function problemException(Exception: HttpExceptionClass, message: string, problem: ApiProblem): HttpException {
  const standardBody = new Exception(message).getResponse() as Record<string, unknown>;
  return new Exception({ ...standardBody, ...problem });
}
