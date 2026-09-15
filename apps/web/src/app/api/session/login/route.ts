import {
  apiInternalUrl,
  invalidOriginResponse,
  isSameOrigin,
  problemResponse,
  proxyApiResponse,
  setSessionCookies,
} from '@/lib/api-server';

export async function POST(request: Request): Promise<Response> {
  if (!isSameOrigin(request)) {
    return invalidOriginResponse();
  }

  const body = await request.text();
  let requestedRole: 'ADMIN' | 'OWNER';
  try {
    const parsed = JSON.parse(body) as { role?: string };
    if (parsed.role !== 'ADMIN' && parsed.role !== 'OWNER') {
      return problemResponse(400, 'Invalid role', { code: 'REQUEST_INVALID' });
    }
    requestedRole = parsed.role;
  } catch {
    return problemResponse(400, 'Invalid request body', { code: 'REQUEST_INVALID' });
  }

  const upstream = await fetch(`${apiInternalUrl()}/api/auth/login`, {
    body,
    cache: 'no-store',
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  });
  if (!upstream.ok) {
    return proxyApiResponse(upstream);
  }

  const tokens = await upstream.json();
  if (tokens.principal?.role !== requestedRole) {
    return problemResponse(403, 'Requested role does not match authenticated account', {
      code: 'ROLE_MISMATCH',
    });
  }
  await setSessionCookies(tokens);
  return Response.json({ principal: tokens.principal });
}
