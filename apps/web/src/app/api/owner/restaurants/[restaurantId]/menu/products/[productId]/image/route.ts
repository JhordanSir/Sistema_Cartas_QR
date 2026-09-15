import {
  authenticatedApiFetch,
  invalidOriginResponse,
  isSameOrigin,
  problemResponse,
  proxyApiResponse,
} from '@/lib/api-server';

const MAXIMUM_IMAGE_MB = 4;
const MAXIMUM_IMAGE_BYTES = MAXIMUM_IMAGE_MB * 1024 * 1024;

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
    return invalidOriginResponse();
  }
  const incoming = await request.formData();
  const image = incoming.get('image');
  if (!(image instanceof File)) {
    return problemResponse(400, 'Product image is required', { code: 'PRODUCT_IMAGE_REQUIRED' });
  }
  if (image.size > MAXIMUM_IMAGE_BYTES) {
    return problemResponse(413, 'Product image is too large', {
      code: 'PRODUCT_IMAGE_INVALID',
      params: { maxMb: MAXIMUM_IMAGE_MB },
    });
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
    return invalidOriginResponse();
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
