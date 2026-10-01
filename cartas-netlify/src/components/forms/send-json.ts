import { GENERIC_ERROR_MESSAGE, isApiErrorBody, type ApiErrorBody } from '@/shared/messages';

export type JsonResult =
  | { ok: true; data: unknown }
  | { ok: false; status: number; error: ApiErrorBody };

/**
 * Calls one of our Route Handlers. Network failures and unexpected bodies
 * become the generic message, so callers only ever show `error.message`.
 */
export async function sendJson(
  url: string,
  method: 'DELETE' | 'PATCH' | 'POST' | 'PUT',
  body?: unknown,
): Promise<JsonResult> {
  let response: Response;
  try {
    response = await fetch(url, {
      body: body === undefined ? undefined : JSON.stringify(body),
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      method,
    });
  } catch {
    return { error: { code: 'NETWORK_ERROR', message: GENERIC_ERROR_MESSAGE }, ok: false, status: 0 };
  }

  const payload: unknown = response.status === 204 ? null : await response.json().catch(() => null);
  if (response.ok) return { data: payload, ok: true };
  return {
    error: isApiErrorBody(payload) ? payload : { code: 'UNKNOWN_ERROR', message: GENERIC_ERROR_MESSAGE },
    ok: false,
    status: response.status,
  };
}

/** The `redirectTo` of a successful response, accepted only as a path of this site. */
export function redirectTarget(data: unknown, fallback = '/'): string {
  if (typeof data === 'object' && data !== null && 'redirectTo' in data) {
    const { redirectTo } = data;
    if (typeof redirectTo === 'string' && redirectTo.startsWith('/') && !redirectTo.startsWith('//')) {
      return redirectTo;
    }
  }
  return fallback;
}
