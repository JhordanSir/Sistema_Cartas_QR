import { cookies } from 'next/headers';

const ACCESS_COOKIE = 'sirio_access';
const REFRESH_COOKIE = 'sirio_refresh';
const ROLE_COOKIE = 'sirio_role';
type SessionRole = 'ADMIN' | 'OWNER';

interface TokenResponse {
  accessExpiresIn: number;
  accessToken: string;
  principal: {
    accountId: string;
    email: string;
    role: SessionRole;
  };
  refreshExpiresIn: number;
  refreshToken: string;
}

export function apiInternalUrl(): string {
  return (process.env.API_INTERNAL_URL ?? 'http://api:3001').replace(/\/$/, '');
}

export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (origin === null) return false;
  const allowedOrigins = new Set([new URL(request.url).origin]);
  const forwardedHost =
    request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  const forwardedProtocol =
    request.headers.get('x-forwarded-proto') ?? new URL(request.url).protocol.slice(0, -1);
  if (forwardedHost) {
    allowedOrigins.add(`${forwardedProtocol}://${forwardedHost}`);
  }
  const publicAppUrl = process.env.PUBLIC_APP_URL;
  if (publicAppUrl) allowedOrigins.add(new URL(publicAppUrl).origin);
  return allowedOrigins.has(origin);
}

export async function setSessionCookies(tokens: TokenResponse): Promise<void> {
  const cookieStore = await cookies();
  const secure = (process.env.PUBLIC_APP_URL ?? '').startsWith('https://');
  cookieStore.set(ACCESS_COOKIE, tokens.accessToken, {
    httpOnly: true,
    maxAge: tokens.accessExpiresIn,
    path: '/',
    sameSite: 'strict',
    secure,
  });
  cookieStore.set(REFRESH_COOKIE, tokens.refreshToken, {
    httpOnly: true,
    maxAge: tokens.refreshExpiresIn,
    path: '/',
    sameSite: 'strict',
    secure,
  });
  cookieStore.set(ROLE_COOKIE, tokens.principal.role, {
    httpOnly: true,
    maxAge: tokens.refreshExpiresIn,
    path: '/',
    sameSite: 'strict',
    secure,
  });
}

export async function clearSessionCookies(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ACCESS_COOKIE);
  cookieStore.delete(REFRESH_COOKIE);
  cookieStore.delete(ROLE_COOKIE);
}

export async function hasSessionCookie(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.has(ACCESS_COOKIE) || cookieStore.has(REFRESH_COOKIE);
}

export async function hasSessionForRole(role: SessionRole): Promise<boolean> {
  const cookieStore = await cookies();
  return (
    (cookieStore.has(ACCESS_COOKIE) || cookieStore.has(REFRESH_COOKIE)) &&
    cookieStore.get(ROLE_COOKIE)?.value === role
  );
}

export async function authenticatedApiFetch(
  path: string,
  init: RequestInit = {},
  requiredRole: SessionRole = 'ADMIN',
): Promise<Response> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_COOKIE)?.value;
  if (!accessToken) {
    return new Response(JSON.stringify({ message: 'Authentication required' }), {
      headers: { 'content-type': 'application/json' },
      status: 401,
    });
  }

  let response = await apiFetch(path, accessToken, init);
  if (response.status !== 401) {
    return response;
  }

  const refreshToken = cookieStore.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) {
    await clearSessionCookies();
    return response;
  }

  const refreshed = await fetch(`${apiInternalUrl()}/api/auth/refresh`, {
    body: JSON.stringify({ refreshToken }),
    cache: 'no-store',
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  });
  if (!refreshed.ok) {
    await clearSessionCookies();
    return response;
  }

  const tokens = (await refreshed.json()) as TokenResponse;
  if (tokens.principal.role !== requiredRole) {
    await clearSessionCookies();
    return new Response(
      JSON.stringify({
        message: `${requiredRole === 'ADMIN' ? 'Administrator' : 'Owner'} access required`,
      }),
      {
        headers: { 'content-type': 'application/json' },
        status: 403,
      },
    );
  }
  await setSessionCookies(tokens);
  response = await apiFetch(path, tokens.accessToken, init);
  return response;
}

export async function proxyApiResponse(response: Response): Promise<Response> {
  const contentType = response.headers.get('content-type');
  return new Response(await response.arrayBuffer(), {
    headers: contentType ? { 'content-type': contentType } : undefined,
    status: response.status,
  });
}

async function apiFetch(
  path: string,
  accessToken: string,
  init: RequestInit,
): Promise<Response> {
  return fetch(`${apiInternalUrl()}${path}`, {
    ...init,
    cache: 'no-store',
    headers: {
      ...init.headers,
      authorization: `Bearer ${accessToken}`,
    },
  });
}
