import {
  authenticatedApiFetch,
  isSameOrigin,
  proxyApiResponse,
} from '@/lib/api-server';

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const upstream = await authenticatedApiFetch(
    `/api/backoffice/restaurants${url.search}`,
  );
  return proxyApiResponse(upstream);
}

export async function POST(request: Request): Promise<Response> {
  if (!isSameOrigin(request)) {
    return Response.json({ message: 'Invalid request origin' }, { status: 403 });
  }
  const upstream = await authenticatedApiFetch('/api/backoffice/restaurants', {
    body: await request.text(),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  });
  return proxyApiResponse(upstream);
}
