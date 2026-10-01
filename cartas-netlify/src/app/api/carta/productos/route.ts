import { handleApi, jsonResponse, readJsonBody } from '@/server/http';
import { createProduct, getMenuDraft } from '@/server/menu-draft';
import { requireOwner } from '@/server/next/route-auth';
import { assertSameOrigin } from '@/server/origin';
import { ProductBody, toProductInput } from '@/server/product-input';

/** A new product goes at the end of its section. */
export function POST(request: Request): Promise<Response> {
  return handleApi(async () => {
    assertSameOrigin(request);
    const { restaurant } = await requireOwner(request);
    const input = toProductInput(await readJsonBody(request, ProductBody));
    await createProduct(restaurant.id, input);
    return jsonResponse({ draft: await getMenuDraft(restaurant.id) }, 201);
  });
}
