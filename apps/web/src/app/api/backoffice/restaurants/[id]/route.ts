import {
  authenticatedApiFetch,
  isSameOrigin,
  proxyApiResponse,
} from '@/lib/api-server';

export async function DELETE(
  request: Request,
  context: RouteContext<'/api/backoffice/restaurants/[id]'>,
): Promise<Response> {
  if (!isSameOrigin(request)) {
    return Response.json({ message: 'Invalid request origin' }, { status: 403 });
  }
  const { id } = await context.params;
  const upstream = await authenticatedApiFetch(
    `/api/backoffice/restaurants/${encodeURIComponent(id)}`,
    {
      body: await request.text(),
      headers: { 'content-type': 'application/json' },
      method: 'DELETE',
    },
  );
  return proxyApiResponse(upstream);
}
