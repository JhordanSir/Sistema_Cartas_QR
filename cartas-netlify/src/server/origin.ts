import { ApiError } from './http';

/** The host the browser addressed: the proxy's `x-forwarded-host` first, then `host`. */
export function requestHost(headers: Headers): string | null {
  const forwarded = headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  return forwarded || headers.get('host');
}

/** True when the `Origin` header names exactly this host (scheme aside, port included). */
export function isSameOrigin(origin: string | null, host: string | null): boolean {
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host.trim().toLowerCase();
  } catch {
    return false;
  }
}

/** Every request that changes data must come from our own pages (CSRF defense). */
export function assertSameOrigin(request: Request): void {
  if (!isSameOrigin(request.headers.get('origin'), requestHost(request.headers))) {
    throw new ApiError(403, 'INVALID_ORIGIN', 'Solicitud no permitida.');
  }
}
