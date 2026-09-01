import {
  authenticatedApiFetch,
  clearSessionCookies,
  isSameOrigin,
  proxyApiResponse,
} from '@/lib/api-server';

type SessionRole = 'ADMIN' | 'OWNER';

export async function POST(request: Request): Promise<Response> {
  if (!isSameOrigin(request)) {
    return Response.json({ message: 'Invalid request origin' }, { status: 403 });
  }

  const role = new URL(request.url).searchParams.get('role');
  if (role !== 'ADMIN' && role !== 'OWNER') {
    return Response.json({ message: 'Invalid role' }, { status: 400 });
  }

  const upstream = await authenticatedApiFetch('/api/auth/me', {}, role);
  if (!upstream.ok) return proxyApiResponse(upstream);

  const principal = (await upstream.json()) as { role?: SessionRole };
  if (principal.role !== role) {
    await clearSessionCookies();
    return Response.json({ message: 'Requested role does not match session' }, { status: 403 });
  }

  return Response.json({ role: principal.role });
}
