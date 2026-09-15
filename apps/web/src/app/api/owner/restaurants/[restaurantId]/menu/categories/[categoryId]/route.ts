import {
  authenticatedApiFetch,
  invalidOriginResponse,
  isSameOrigin,
  proxyApiResponse,
} from '@/lib/api-server';

type RouteContext = {
  params: Promise<{ categoryId: string; restaurantId: string }>;
};

export async function PATCH(request: Request, context: RouteContext): Promise<Response> {
  return mutateCategory(request, context, 'PATCH');
}

export async function DELETE(request: Request, context: RouteContext): Promise<Response> {
  return mutateCategory(request, context, 'DELETE');
}

async function mutateCategory(
  request: Request,
  context: RouteContext,
  method: 'DELETE' | 'PATCH',
): Promise<Response> {
  if (!isSameOrigin(request)) {
    return invalidOriginResponse();
  }
  const { categoryId, restaurantId } = await context.params;
  return proxyApiResponse(
    await authenticatedApiFetch(
      `/api/owner/restaurants/${encodeURIComponent(restaurantId)}/menu/categories/${encodeURIComponent(categoryId)}`,
      {
        ...(method === 'PATCH'
          ? {
              body: await request.text(),
              headers: { 'content-type': 'application/json' },
            }
          : {}),
        method,
      },
      'OWNER',
    ),
  );
}
