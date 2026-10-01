import { z } from 'zod';

import { handleApi, jsonResponse, readJsonBody } from '@/server/http';
import { getMenuDraft, setMenuTemplate } from '@/server/menu-draft';
import { invalidatePublicMenu } from '@/server/next/public-menu-cache';
import { requireOwner } from '@/server/next/route-auth';
import { assertSameOrigin } from '@/server/origin';

const TemplateBody = z.object({ template: z.enum(['ORIGINAL', 'TRADITIONAL', 'CASUAL', 'PREMIUM']) });

/** Chooses the template of the menu; diners see it after the next publication (§E7). */
export function PUT(request: Request): Promise<Response> {
  return handleApi(async () => {
    assertSameOrigin(request);
    const { restaurant } = await requireOwner(request);
    const { template } = await readJsonBody(request, TemplateBody);
    await setMenuTemplate(restaurant.id, template);
    // §E2 lists the template change among the invalidations of menu:{slug}.
    invalidatePublicMenu(restaurant.slug);
    return jsonResponse({ draft: await getMenuDraft(restaurant.id) });
  });
}
