import {
  authenticatedApiFetch,
  clearSessionCookies,
  invalidOriginResponse,
  isSameOrigin,
  problemResponse,
  proxyApiResponse,
} from '@/lib/api-server';

type SessionRole = 'ADMIN' | 'OWNER';

export async function POST(request: Request): Promise<Response> {
  if (!isSameOrigin(request)) {
    return invalidOriginResponse();
  }

  const role = new URL(request.url).searchParams.get('role');
  if (role !== 'ADMIN' && role !== 'OWNER') {
    return problemResponse(400, 'Invalid role', { code: 'REQUEST_INVALID' });
  }

  const upstream = await authenticatedApiFetch('/api/auth/me', {}, role);
  if (!upstream.ok) return proxyApiResponse(upstream);

  const principal = (await upstream.json()) as { role?: SessionRole };
  if (principal.role !== role) {
    await clearSessionCookies();
    return problemResponse(403, 'Requested role does not match session', { code: 'ROLE_MISMATCH' });
  }

  return Response.json({ role: principal.role });
}
