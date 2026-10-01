import { listRestaurants } from '@/server/backoffice';
import { handleApi, jsonResponse } from '@/server/http';
import { requireAdmin } from '@/server/next/route-auth';
import { parseBackofficeQuery } from '@/shared/backoffice';

/** The restaurants of the backoffice: `?q=` searches name, slug and email; `?page=` pages by 20 (§E12). */
export function GET(request: Request): Promise<Response> {
  return handleApi(async () => {
    await requireAdmin(request);
    const { searchParams } = new URL(request.url);
    const { page, query } = parseBackofficeQuery({ page: searchParams.get('page'), q: searchParams.get('q') });
    return jsonResponse(await listRestaurants({ page, query }));
  });
}
