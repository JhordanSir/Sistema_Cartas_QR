import {
  authenticatedApiFetch,
  invalidOriginResponse,
  isSameOrigin,
  problemResponse,
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
    return invalidOriginResponse();
  }
  const { restaurantId } = await context.params;
  const contentType = request.headers.get('content-type');
  if (!contentType?.startsWith('multipart/form-data;')) {
    return problemResponse(415, 'Multipart form data required', { code: 'REQUEST_INVALID' });
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
