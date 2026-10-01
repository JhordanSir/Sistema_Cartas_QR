import { z } from 'zod';

import { handleApi, jsonResponse, readJsonBody, requireUuid } from '@/server/http';
import { getMenuDraft, moveSection } from '@/server/menu-draft';
import { requireOwner } from '@/server/next/route-auth';
import { assertSameOrigin } from '@/server/origin';

const MoveBody = z.object({ direction: z.enum(['up', 'down']) });

/** «Subir» / «Bajar»: one place up or down; at either end nothing changes. */
export function POST(
  request: Request,
  context: RouteContext<'/api/carta/secciones/[id]/mover'>,
): Promise<Response> {
  return handleApi(async () => {
    assertSameOrigin(request);
    const { restaurant } = await requireOwner(request);
    const sectionId = requireUuid((await context.params).id, 'No encontramos esa sección.');
    const { direction } = await readJsonBody(request, MoveBody);
    await moveSection(restaurant.id, sectionId, direction);
    return jsonResponse({ draft: await getMenuDraft(restaurant.id) });
  });
}
