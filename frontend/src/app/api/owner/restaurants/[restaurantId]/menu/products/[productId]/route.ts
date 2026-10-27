import {
  authenticatedApiFetch,
  invalidOriginResponse,
  isSameOrigin,
  proxyApiResponse,
} from '@/lib/api-server';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ productId: string; restaurantId: string }> },
): Promise<Response> {
  if (!isSameOrigin(request)) {
    return invalidOriginResponse();
  }
  const { productId, restaurantId } = await context.params;
  return proxyApiResponse(
    await authenticatedApiFetch(
      `/api/owner/restaurants/${encodeURIComponent(restaurantId)}/menu/products/${encodeURIComponent(productId)}`,
      {
        body: await request.text(),
        headers: { 'content-type': 'application/json' },
        method: 'PATCH',
      },
      'OWNER',
    ),
  );
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ productId: string; restaurantId: string }> },
): Promise<Response> {
  if (!isSameOrigin(request)) {
    return invalidOriginResponse();
  }
  const { productId, restaurantId } = await context.params;
  return proxyApiResponse(
    await authenticatedApiFetch(
      `/api/owner/restaurants/${encodeURIComponent(restaurantId)}/menu/products/${encodeURIComponent(productId)}`,
      { method: 'DELETE' },
      'OWNER',
    ),
  );
}
