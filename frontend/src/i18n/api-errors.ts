import { isApiErrorCode } from '@sirio/shared';

import type { ApiErrorCopy } from './messages/api-errors';

/**
 * Turns an API or BFF error body into a sentence in the interface language. A known
 * code wins; anything else (class-validator arrays, an nginx HTML page, a code this
 * build does not know) falls back to a message chosen by HTTP status. The raw
 * `message` is never shown.
 */
export function describeApiError(body: unknown, status: number, copy: ApiErrorCopy): string {
  const { code, params } = (typeof body === 'object' && body !== null ? body : {}) as {
    code?: unknown;
    params?: unknown;
  };
  if (isApiErrorCode(code)) {
    const entry = copy.codes[code] as string | ((values: object) => string);
    if (typeof entry === 'string') return entry;
    if (typeof params === 'object' && params !== null) return entry(params);
  }
  return fallbackFor(status, copy);
}

export async function readApiError(response: Response, copy: ApiErrorCopy): Promise<string> {
  const body: unknown = await response.json().catch(() => null);
  return describeApiError(body, response.status, copy);
}

function fallbackFor(status: number, copy: ApiErrorCopy): string {
  if (status === 401 || status === 403) return copy.fallback.session;
  if (status === 404) return copy.fallback.notFound;
  if (status === 413) return copy.fallback.tooLarge;
  if (status >= 400 && status < 500) return copy.fallback.badRequest;
  return copy.fallback.unavailable;
}
