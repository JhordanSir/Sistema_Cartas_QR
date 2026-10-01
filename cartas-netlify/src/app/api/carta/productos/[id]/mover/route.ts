import { z } from 'zod';

import { handleApi, jsonResponse, readJsonBody, requireUuid } from '@/server/http';
import { getMenuDraft, moveProduct } from '@/server/menu-draft';
import { requireOwner } from '@/server/next/route-auth';
import { assertSameOrigin } from '@/server/origin';

const MoveBody = z.object({ direction: z.enum(['up', 'down']) });

/** «Subir» / «Bajar» inside its section; at either end nothing changes. */
export function POST(
  request: Request,
  context: RouteContext<'/api/carta/productos/[id]/mover'>,
): Promise<Response> {
  return handleApi(async () => {
    assertSameOrigin(request);
    const { restaurant } = await requireOwner(request);
    const productId = requireUuid((await context.params).id, 'No encontramos ese producto.');
    const { direction } = await readJsonBody(request, MoveBody);
    await moveProduct(restaurant.id, productId, direction);
    return jsonResponse({ draft: await getMenuDraft(restaurant.id) });
  });
}
