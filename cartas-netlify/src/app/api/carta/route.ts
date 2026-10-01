import { handleApi, jsonResponse } from '@/server/http';
import { getMenuDraft } from '@/server/menu-draft';
import { requireOwner } from '@/server/next/route-auth';

/** The whole draft, ordered, for the editor (§E7). */
export function GET(request: Request): Promise<Response> {
  return handleApi(async () => {
    const { restaurant } = await requireOwner(request);
    return jsonResponse({ draft: await getMenuDraft(restaurant.id) });
  });
}
