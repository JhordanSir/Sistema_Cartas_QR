import {
  authenticatedApiFetch,
  isSameOrigin,
  proxyApiResponse,
} from '@/lib/api-server';

export async function PATCH(
  request: Request,
  context: RouteContext<'/api/backoffice/restaurants/[id]/status'>,
): Promise<Response> {
  if (!isSameOrigin(request)) {
    return Response.json({ message: 'Invalid request origin' }, { status: 403 });
  }
  const { id } = await context.params;
  const upstream = await authenticatedApiFetch(
    `/api/backoffice/restaurants/${encodeURIComponent(id)}/status`,
    {
      body: await request.text(),
      headers: { 'content-type': 'application/json' },
      method: 'PATCH',
    },
  );
  return proxyApiResponse(upstream);
}
