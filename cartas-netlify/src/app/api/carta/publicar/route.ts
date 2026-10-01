import { handleApi, jsonResponse } from '@/server/http';
import { getMenuDraft, publishMenu } from '@/server/menu-draft';
import { invalidatePublicMenu } from '@/server/next/public-menu-cache';
import { requireOwner } from '@/server/next/route-auth';
import { assertSameOrigin } from '@/server/origin';

/**
 * Publishes the draft (§E7): at least one available product, or 400
 * EMPTY_MENU. Diners see the new menu on their next visit.
 */
export function POST(request: Request): Promise<Response> {
  return handleApi(async () => {
    assertSameOrigin(request);
    const { restaurant } = await requireOwner(request);
    const slug = await publishMenu(restaurant.id);
    invalidatePublicMenu(slug);
    return jsonResponse({ draft: await getMenuDraft(restaurant.id) });
  });
}
