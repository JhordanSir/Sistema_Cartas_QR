import { handleApi, jsonResponse } from '@/server/http';
import { requireOwner } from '@/server/next/route-auth';
import { getViewStatistics } from '@/server/views';

/** Unique visits to the owner's public menu (§E11). */
export function GET(request: Request): Promise<Response> {
  return handleApi(async () => {
    const { restaurant } = await requireOwner(request);
    return jsonResponse({ statistics: await getViewStatistics(restaurant.id) });
  });
}
