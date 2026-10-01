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

/** What may be logged about an unexpected error: never the query parameters. */
export function describeErrorForLog(error: unknown): Record<string, unknown> {
  const driverError = findDriverError(error);
  if (driverError) {
    return {
      code: driverError.code,
      constraint: driverError.constraint,
      message: driverError.message,
    };
  }
  if (error instanceof Error) return { name: error.name, message: error.message, stack: error.stack };
  return { error: String(error) };
}
