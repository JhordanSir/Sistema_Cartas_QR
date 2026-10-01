import { RESTAURANT_NOT_FOUND, setTemporaryPassword } from '@/server/backoffice';
import { handleApi, jsonResponse, requireUuid } from '@/server/http';
import { requireAdmin } from '@/server/next/route-auth';
import { assertSameOrigin } from '@/server/origin';

type Context = RouteContext<'/api/admin/restaurantes/[id]/contrasena-temporal'>;

/** A temporary password for the owner, in this answer only and never stored in clear (§E12). */
export function POST(request: Request, context: Context): Promise<Response> {
  return handleApi(async () => {
    assertSameOrigin(request);
    await requireAdmin(request);
    const id = requireUuid((await context.params).id, RESTAURANT_NOT_FOUND);
    return jsonResponse(await setTemporaryPassword(id));
  });
}
