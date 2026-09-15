import { BYTES_PER_MEGABYTE, UPLOAD_LIMITS, toMegabytes } from '@sirio/shared';

import {
  authenticatedApiFetch,
  invalidOriginResponse,
  isSameOrigin,
  problemResponse,
  proxyApiResponse,
} from '@/lib/api-server';

const { maximumTotalBytes } = UPLOAD_LIMITS.menuPhotos;
// The photos plus one megabyte of multipart framing (boundaries and part headers).
const MAX_MULTIPART_BYTES = maximumTotalBytes + BYTES_PER_MEGABYTE;
const PHOTOS_TOO_LARGE = {
  code: 'MENU_PHOTOS_TOO_LARGE',
  params: { maxMb: toMegabytes(maximumTotalBytes) },
} as const;

export async function POST(
  request: Request,
  context: { params: Promise<{ restaurantId: string }> },
): Promise<Response> {
  if (!isSameOrigin(request)) {
    return invalidOriginResponse();
  }
  const contentType = request.headers.get('content-type');
  if (!contentType?.startsWith('multipart/form-data;')) {
    return problemResponse(415, 'Multipart form data required', { code: 'REQUEST_INVALID' });
  }
  const declaredLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_MULTIPART_BYTES) {
    return problemResponse(413, 'Menu photos exceed the 12 MB limit', PHOTOS_TOO_LARGE);
  }
  const { restaurantId } = await context.params;
  const body = await request.arrayBuffer();
  if (body.byteLength > MAX_MULTIPART_BYTES) {
    return problemResponse(413, 'Menu photos exceed the 12 MB limit', PHOTOS_TOO_LARGE);
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
