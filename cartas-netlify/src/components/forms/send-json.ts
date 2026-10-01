import { GENERIC_ERROR_MESSAGE, isApiErrorBody, type ApiErrorBody } from '@/shared/messages';

export type JsonResult =
  | { ok: true; data: unknown }
  | { ok: false; status: number; error: ApiErrorBody };

type Method = 'DELETE' | 'PATCH' | 'POST' | 'PUT';

async function send(url: string, init: RequestInit): Promise<JsonResult> {
  let response: Response;
  try {
    response = await fetch(url, init);
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

/**
 * Calls one of our Route Handlers with a JSON body. Network failures and
 * unexpected bodies become the generic message, so callers only ever show
 * `error.message`.
 */
export function sendJson(url: string, method: Method, body?: unknown): Promise<JsonResult> {
  return send(url, {
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    method,
  });
}

/** Same as sendJson with a multipart body (the browser sets its boundary). */
export function sendForm(url: string, method: Method, body: FormData): Promise<JsonResult> {
  return send(url, { body, method });
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
