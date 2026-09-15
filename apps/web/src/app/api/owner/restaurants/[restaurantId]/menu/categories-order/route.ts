import {
  authenticatedApiFetch,
  invalidOriginResponse,
  isSameOrigin,
  proxyApiResponse,
} from '@/lib/api-server';

export async function PUT(
  request: Request,
  context: { params: Promise<{ restaurantId: string }> },
): Promise<Response> {
  if (!isSameOrigin(request)) {
    return invalidOriginResponse();
  }
  const { restaurantId } = await context.params;
  return proxyApiResponse(
    await authenticatedApiFetch(
      `/api/owner/restaurants/${encodeURIComponent(restaurantId)}/menu/categories-order`,
      {
        body: await request.text(),
        headers: { 'content-type': 'application/json' },
        method: 'PUT',
      },
      'OWNER',
    ),
  );
}
