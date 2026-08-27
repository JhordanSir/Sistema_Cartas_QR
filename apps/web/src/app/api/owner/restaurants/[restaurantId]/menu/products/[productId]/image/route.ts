import {
  authenticatedApiFetch,
  isSameOrigin,
  proxyApiResponse,
} from '@/lib/api-server';

const MAXIMUM_IMAGE_BYTES = 4 * 1024 * 1024;

type RouteContext = {
  params: Promise<{ productId: string; restaurantId: string }>;
};

export async function GET(_request: Request, context: RouteContext): Promise<Response> {
  const { productId, restaurantId } = await context.params;
  return proxyApiResponse(
    await authenticatedApiFetch(imagePath(restaurantId, productId), {}, 'OWNER'),
  );
}

export async function PUT(request: Request, context: RouteContext): Promise<Response> {
  if (!isSameOrigin(request)) {
    return Response.json({ message: 'Invalid request origin' }, { status: 403 });
  }
  const incoming = await request.formData();
  const image = incoming.get('image');
  if (!(image instanceof File)) {
    return Response.json({ message: 'Product image is required' }, { status: 400 });
  }
  if (image.size > MAXIMUM_IMAGE_BYTES) {
    return Response.json({ message: 'Product image is too large' }, { status: 413 });
  }
  const body = new FormData();
  body.set('image', image);
  const { productId, restaurantId } = await context.params;
  return proxyApiResponse(
    await authenticatedApiFetch(
      imagePath(restaurantId, productId),
      { body, method: 'PUT' },
      'OWNER',
    ),
  );
}

export async function DELETE(request: Request, context: RouteContext): Promise<Response> {
  if (!isSameOrigin(request)) {
    return Response.json({ message: 'Invalid request origin' }, { status: 403 });
  }
  const { productId, restaurantId } = await context.params;
  return proxyApiResponse(
    await authenticatedApiFetch(
      imagePath(restaurantId, productId),
      { method: 'DELETE' },
      'OWNER',
    ),
  );
}

function imagePath(restaurantId: string, productId: string): string {
  return `/api/owner/restaurants/${encodeURIComponent(restaurantId)}/menu/products/${encodeURIComponent(productId)}/image`;
}
