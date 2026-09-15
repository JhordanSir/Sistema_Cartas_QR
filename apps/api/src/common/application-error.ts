import type { ApiProblem } from '@sirio/shared';

export interface ApplicationErrorOptions extends ErrorOptions {
  /** What the client should tell the person; without it the HTTP mapper picks one. */
  problem?: ApiProblem;
}

/**
 * Base of every module's domain error: a closed code the HTTP layer maps to a status,
 * the English message for logs and, optionally, the exact problem the web translates.
 * Framework-free, so the domain can extend it.
 */
export abstract class ApplicationError<Code extends string> extends Error {
  readonly problem: ApiProblem | undefined;

  protected constructor(
    readonly code: Code,
    message: string,
    options: ApplicationErrorOptions = {},
  ) {
    super(message, options);
    this.problem = options.problem;
  }
}
