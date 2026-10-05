// Drizzle wraps driver failures in DrizzleQueryError, whose message and
// `params` carry the full query values (password hashes, token digests…).
// These helpers read the Postgres error underneath without exposing them.

type DriverError = { code?: unknown; constraint?: unknown; message?: unknown };

function findDriverError(error: unknown): DriverError | null {
  let current: unknown = error;
  for (let depth = 0; depth < 4 && typeof current === 'object' && current !== null; depth += 1) {
    if ('code' in current && typeof current.code === 'string') return current as DriverError;
    current = 'cause' in current ? current.cause : null;
  }
  return null;
}

/** True for a unique violation (23505) of the named constraint. */
export function isUniqueViolation(error: unknown, constraint: string): boolean {
  const driverError = findDriverError(error);
  return driverError?.code === '23505' && driverError.constraint === constraint;
}

/** DrizzleQueryError writes the parameters after "params:": only the query is kept. */
function withoutParams(text: string): string {
  const index = text.indexOf('\nparams:');
  return index === -1 ? text : text.slice(0, index);
}

/** The "at …" lines of a stack, without the message it starts with. */
function stackFrames(stack: string | undefined): string | undefined {
  return stack
    ?.split('\n')
    .filter((line) => line.trimStart().startsWith('at '))
    .join('\n');
}

/**
 * What may be logged about an unexpected error: never the query parameters.
 * A driver error is enough on its own; otherwise the cause goes along, since
 * Drizzle's message alone only says which query failed.
 */
export function describeErrorForLog(error: unknown, depth = 0): Record<string, unknown> {
  const driverError = findDriverError(error);
  if (driverError) {
    return {
      code: driverError.code,
      constraint: driverError.constraint,
      message: driverError.message,
    };
  }
  if (error instanceof Error) {
    const cause = error.cause !== undefined && depth < 3 ? describeErrorForLog(error.cause, depth + 1) : undefined;
    return {
      name: error.name,
      message: withoutParams(error.message),
      stack: stackFrames(error.stack),
      ...(cause ? { cause } : {}),
    };
  }
  return { error: String(error) };
}
