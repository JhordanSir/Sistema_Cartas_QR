import { z } from 'zod';

import {
  ApiError,
  handleApi,
  INVALID_INPUT_MESSAGE,
  jsonResponse,
  readJsonBody,
  requireUuid,
  validationError,
} from '@/server/http';
import { deleteSection, getMenuDraft, updateSection } from '@/server/menu-draft';
import { requireOwner } from '@/server/next/route-auth';
import { assertSameOrigin } from '@/server/origin';
import { validateSectionName } from '@/shared/menu';
import { collapseWhitespace } from '@/shared/validation';

const SECTION_NOT_FOUND = 'No encontramos esa sección.';

const SectionPatch = z.object({
  layout: z.enum(['LIST', 'CARDS']).optional(),
  name: z.string().max(1000).optional(),
});

/** Renames the section and/or changes its layout (LIST or CARDS). */
export function PATCH(request: Request, context: RouteContext<'/api/carta/secciones/[id]'>): Promise<Response> {
  return handleApi(async () => {
    assertSameOrigin(request);
    const { restaurant } = await requireOwner(request);
    const sectionId = requireUuid((await context.params).id, SECTION_NOT_FOUND);
    const body = await readJsonBody(request, SectionPatch);
    if (body.name === undefined && body.layout === undefined) {
      throw new ApiError(400, 'INVALID_INPUT', INVALID_INPUT_MESSAGE);
    }
    if (body.name !== undefined) {
      const nameError = validateSectionName(body.name);
      if (nameError) throw validationError({ name: nameError });
    }

    await updateSection(restaurant.id, sectionId, {
      ...(body.layout === undefined ? {} : { layout: body.layout }),
      ...(body.name === undefined ? {} : { name: collapseWhitespace(body.name) }),
    });
    return jsonResponse({ draft: await getMenuDraft(restaurant.id) });
  });
}

/** Deletes the section with all its products (and their images). */
export function DELETE(request: Request, context: RouteContext<'/api/carta/secciones/[id]'>): Promise<Response> {
  return handleApi(async () => {
    assertSameOrigin(request);
    const { restaurant } = await requireOwner(request);
    const sectionId = requireUuid((await context.params).id, SECTION_NOT_FOUND);
    await deleteSection(restaurant.id, sectionId);
    return jsonResponse({ draft: await getMenuDraft(restaurant.id) });
  });
}
