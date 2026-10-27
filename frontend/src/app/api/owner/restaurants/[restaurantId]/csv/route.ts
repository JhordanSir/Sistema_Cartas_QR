import { UPLOAD_LIMITS, toMegabytes } from '@sirio/shared';

import {
  authenticatedApiFetch,
  invalidOriginResponse,
  isSameOrigin,
  problemResponse,
  proxyApiResponse,
} from '@/lib/api-server';

const MAXIMUM_CSV_BYTES = UPLOAD_LIMITS.csvFile.maximumBytes;

type RouteContext = {
  params: Promise<{ restaurantId: string }>;
};

/** Name, size and date of the restaurant's saved CSV. */
export async function GET(_request: Request, context: RouteContext): Promise<Response> {
  const { restaurantId } = await context.params;
  return proxyApiResponse(await authenticatedApiFetch(csvPath(restaurantId), {}, 'OWNER'));
}

/** Saves the CSV the owner chose, replacing the previous one. */
export async function PUT(request: Request, context: RouteContext): Promise<Response> {
  if (!isSameOrigin(request)) {
    return invalidOriginResponse();
  }
  const incoming = await request.formData();
  const file = incoming.get('file');
  if (!(file instanceof File)) {
    return problemResponse(400, 'CSV file is required', { code: 'CSV_FILE_REQUIRED' });
  }
  if (file.size > MAXIMUM_CSV_BYTES) {
    return problemResponse(413, 'CSV file is too large', {
      code: 'CSV_FILE_TOO_LARGE',
      params: { maxMb: toMegabytes(MAXIMUM_CSV_BYTES) },
    });
  }
  const body = new FormData();
  body.set('file', file, file.name);
  const { restaurantId } = await context.params;
  return proxyApiResponse(
    await authenticatedApiFetch(csvPath(restaurantId), { body, method: 'PUT' }, 'OWNER'),
  );
}

function csvPath(restaurantId: string): string {
  return `/api/owner/restaurants/${encodeURIComponent(restaurantId)}/csv`;
}
