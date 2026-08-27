import { apiInternalUrl, isSameOrigin, proxyApiResponse, setSessionCookies } from '@/lib/api-server';

export async function POST(request: Request): Promise<Response> {
  if (!isSameOrigin(request)) {
    return Response.json({ message: 'Invalid request origin' }, { status: 403 });
  }

  const body = await request.text();
  let requestedRole: 'ADMIN' | 'OWNER';
  try {
    const parsed = JSON.parse(body) as { role?: string };
    if (parsed.role !== 'ADMIN' && parsed.role !== 'OWNER') {
      return Response.json({ message: 'Invalid role' }, { status: 400 });
    }
    requestedRole = parsed.role;
  } catch {
    return Response.json({ message: 'Invalid request body' }, { status: 400 });
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
    return Response.json(
      { message: 'Requested role does not match authenticated account' },
      { status: 403 },
    );
  }
  await setSessionCookies(tokens);
  return Response.json({ principal: tokens.principal });
}
