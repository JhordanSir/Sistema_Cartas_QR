import { deleteBlobQuietly, productImageKey, putImage } from '@/server/blobs';
import { handleApi, jsonResponse, readFormData, requireUuid, validationError } from '@/server/http';
import { assertOwnProduct, getMenuDraft, setProductImage } from '@/server/menu-draft';
import { requireOwner } from '@/server/next/route-auth';
import { assertSameOrigin } from '@/server/origin';
import { detectImageType, IMAGE_MESSAGES, PRODUCT_IMAGE_MAX_BYTES } from '@/shared/images';

const PRODUCT_NOT_FOUND = 'No encontramos ese producto.';

type Context = RouteContext<'/api/carta/productos/[id]/imagen'>;

/**
 * Sets the product image (multipart, field `image`): at most 4 MB and a real
 * PNG, JPEG or WebP. The new blob goes up first; the previous one is deleted
 * only after the database points at the new one (§E6).
 */
export function PUT(request: Request, context: Context): Promise<Response> {
  return handleApi(async () => {
    assertSameOrigin(request);
    const { restaurant } = await requireOwner(request);
    const productId = requireUuid((await context.params).id, PRODUCT_NOT_FOUND);
    await assertOwnProduct(restaurant.id, productId);

    const image = (await readFormData(request)).get('image');
    if (!(image instanceof File) || image.size === 0) {
      throw validationError({ image: IMAGE_MESSAGES.productImageMissing });
    }
    if (image.size > PRODUCT_IMAGE_MAX_BYTES) {
      throw validationError({ image: IMAGE_MESSAGES.productImageTooLarge });
    }
    const bytes = new Uint8Array(await image.arrayBuffer());
    const type = detectImageType(bytes);
    if (!type) throw validationError({ image: IMAGE_MESSAGES.productImageType });

    const key = productImageKey(restaurant.id, productId);
    await putImage(key, bytes, type);
    let previousKey: string | null;
    try {
      previousKey = await setProductImage(restaurant.id, productId, key);
    } catch (error) {
      await deleteBlobQuietly(key);
      throw error;
    }
    if (previousKey) await deleteBlobQuietly(previousKey);
    return jsonResponse({ draft: await getMenuDraft(restaurant.id) });
  });
}

/** Removes the image; its blob is deleted after the change is committed. */
export function DELETE(request: Request, context: Context): Promise<Response> {
  return handleApi(async () => {
    assertSameOrigin(request);
    const { restaurant } = await requireOwner(request);
    const productId = requireUuid((await context.params).id, PRODUCT_NOT_FOUND);
    const previousKey = await setProductImage(restaurant.id, productId, null);
    if (previousKey) await deleteBlobQuietly(previousKey);
    return jsonResponse({ draft: await getMenuDraft(restaurant.id) });
  });
}
