import {
  authenticatedApiFetch,
  isSameOrigin,
  proxyApiResponse,
} from '@/lib/api-server';

const MAX_MULTIPART_BYTES = 13 * 1024 * 1024;

export async function POST(
  request: Request,
  context: { params: Promise<{ restaurantId: string }> },
): Promise<Response> {
  if (!isSameOrigin(request)) {
    return Response.json({ message: 'Invalid request origin' }, { status: 403 });
  }
  const contentType = request.headers.get('content-type');
  if (!contentType?.startsWith('multipart/form-data;')) {
    return Response.json({ message: 'Multipart form data required' }, { status: 415 });
  }
  const declaredLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_MULTIPART_BYTES) {
    return Response.json({ message: 'Menu photos exceed the 12 MB limit' }, { status: 413 });
  }
  const { restaurantId } = await context.params;
  const body = await request.arrayBuffer();
  if (body.byteLength > MAX_MULTIPART_BYTES) {
    return Response.json({ message: 'Menu photos exceed the 12 MB limit' }, { status: 413 });
  }
  return proxyApiResponse(
    await authenticatedApiFetch(
      `/api/owner/restaurants/${encodeURIComponent(restaurantId)}/menu/digitize`,
      {
        body,
        headers: { 'content-type': contentType },
        method: 'POST',
      },
      'OWNER',
    ),
  );
}
