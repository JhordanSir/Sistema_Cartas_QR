import { handleApi, jsonResponse, readJsonBody, requireUuid } from '@/server/http';
import { deleteProduct, getMenuDraft, updateProduct } from '@/server/menu-draft';
import { requireOwner } from '@/server/next/route-auth';
import { assertSameOrigin } from '@/server/origin';
import { ProductBody, toProductInput } from '@/server/product-input';

const PRODUCT_NOT_FOUND = 'No encontramos ese producto.';

/** Saves the whole product; another section moves it to the end of that one. */
export function PATCH(request: Request, context: RouteContext<'/api/carta/productos/[id]'>): Promise<Response> {
  return handleApi(async () => {
    assertSameOrigin(request);
    const { restaurant } = await requireOwner(request);
    const productId = requireUuid((await context.params).id, PRODUCT_NOT_FOUND);
    const input = toProductInput(await readJsonBody(request, ProductBody));
    await updateProduct(restaurant.id, productId, input);
    return jsonResponse({ draft: await getMenuDraft(restaurant.id) });
  });
}

export function DELETE(request: Request, context: RouteContext<'/api/carta/productos/[id]'>): Promise<Response> {
  return handleApi(async () => {
    assertSameOrigin(request);
    const { restaurant } = await requireOwner(request);
    const productId = requireUuid((await context.params).id, PRODUCT_NOT_FOUND);
    await deleteProduct(restaurant.id, productId);
    return jsonResponse({ draft: await getMenuDraft(restaurant.id) });
  });
}
