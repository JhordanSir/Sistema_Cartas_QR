import {
  authenticatedApiFetch,
  isSameOrigin,
  proxyApiResponse,
} from '@/lib/api-server';

export async function GET(
  _request: Request,
  context: { params: Promise<{ restaurantId: string }> },
): Promise<Response> {
  const { restaurantId } = await context.params;
  return proxyApiResponse(
    await authenticatedApiFetch(
      `/api/owner/restaurants/${encodeURIComponent(restaurantId)}/profile`,
      {},
      'OWNER',
    ),
  );
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ restaurantId: string }> },
): Promise<Response> {
  if (!isSameOrigin(request)) {
    return Response.json({ message: 'Invalid request origin' }, { status: 403 });
  }
  const { restaurantId } = await context.params;
  const contentType = request.headers.get('content-type');
  if (!contentType?.startsWith('multipart/form-data;')) {
    return Response.json({ message: 'Multipart form data required' }, { status: 415 });
  }
  return proxyApiResponse(
    await authenticatedApiFetch(
      `/api/owner/restaurants/${encodeURIComponent(restaurantId)}/profile`,
      {
        body: await request.arrayBuffer(),
        headers: { 'content-type': contentType },
        method: 'PATCH',
      },
      'OWNER',
    ),
  );
}
