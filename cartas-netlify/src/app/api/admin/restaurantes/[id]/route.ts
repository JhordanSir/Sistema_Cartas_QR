import { z } from 'zod';

import { deleteRestaurant, RESTAURANT_NOT_FOUND, setRestaurantStatus } from '@/server/backoffice';
import { handleApi, jsonResponse, readJsonBody, requireUuid } from '@/server/http';
import { invalidatePublicMenu } from '@/server/next/public-menu-cache';
import { requireAdmin } from '@/server/next/route-auth';
import { assertSameOrigin } from '@/server/origin';

const StatusBody = z.object({ status: z.enum(['ENABLED', 'DISABLED']) });
const DeleteBody = z.object({ confirmation: z.string().max(400), understood: z.boolean() });

type Context = RouteContext<'/api/admin/restaurantes/[id]'>;

/** Pauses or reactivates a restaurant: its public menu answers 404 while paused (§E12). */
export function PATCH(request: Request, context: Context): Promise<Response> {
  return handleApi(async () => {
    assertSameOrigin(request);
    await requireAdmin(request);
    const id = requireUuid((await context.params).id, RESTAURANT_NOT_FOUND);
    const { status } = await readJsonBody(request, StatusBody);
    invalidatePublicMenu(await setRestaurantStatus(id, status));
    return jsonResponse({ restaurant: { id, status } });
  });
}

/** Deletes a restaurant, its owner and everything they had, for good (§E12). */
export function DELETE(request: Request, context: Context): Promise<Response> {
  return handleApi(async () => {
    assertSameOrigin(request);
    await requireAdmin(request);
    const id = requireUuid((await context.params).id, RESTAURANT_NOT_FOUND);
    const body = await readJsonBody(request, DeleteBody);
    invalidatePublicMenu(await deleteRestaurant(id, body));
    return new Response(null, { status: 204 });
  });
}
