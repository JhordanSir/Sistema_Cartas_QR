import type { ApiProblem } from '@sirio/shared';

import type { ApplicationError } from './application-error.js';
import { type HttpExceptionClass, problemException } from './problem-exception.js';

/** How one domain code reaches the client: its HTTP exception and its default problem. */
export interface HttpErrorRule {
  exception: HttpExceptionClass;
  problem: ApiProblem;
}

/**
 * Builds a module's `throw*HttpError`. The rules are keyed by every code of the module's
 * error, so adding a code without deciding its status and problem does not compile. A
 * problem attached where the error was thrown wins over the rule's default.
 */
export function httpErrorMapper<Code extends string>(
  ErrorClass: abstract new (...args: never[]) => ApplicationError<Code>,
  rules: NoInfer<Record<Code, HttpErrorRule>>,
): (error: unknown) => never {
  return (error: unknown): never => {
    if (!(error instanceof ErrorClass)) throw error;
    const rule = rules[error.code];
    throw problemException(rule.exception, error.message, error.problem ?? rule.problem);
  };
}
