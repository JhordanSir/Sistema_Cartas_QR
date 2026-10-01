import { z } from 'zod';

import { handleApi, jsonResponse, readJsonBody, validationError } from '@/server/http';
import { createSection, getMenuDraft } from '@/server/menu-draft';
import { requireOwner } from '@/server/next/route-auth';
import { assertSameOrigin } from '@/server/origin';
import { validateSectionName } from '@/shared/menu';
import { collapseWhitespace } from '@/shared/validation';

const SectionBody = z.object({
  layout: z.enum(['LIST', 'CARDS']).default('LIST'),
  name: z.string().max(1000),
});

/** A new section goes at the end of the menu. */
export function POST(request: Request): Promise<Response> {
  return handleApi(async () => {
    assertSameOrigin(request);
    const { restaurant } = await requireOwner(request);
    const body = await readJsonBody(request, SectionBody);
    const nameError = validateSectionName(body.name);
    if (nameError) throw validationError({ name: nameError });

    await createSection(restaurant.id, { layout: body.layout, name: collapseWhitespace(body.name) });
    return jsonResponse({ draft: await getMenuDraft(restaurant.id) }, 201);
  });
}
