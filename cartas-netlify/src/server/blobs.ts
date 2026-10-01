import { randomUUID } from 'node:crypto';

import { getStore } from '@netlify/blobs';

import { isImageMimeType, type ImageMimeType } from '../shared/images';
import { describeErrorForLog } from './db-errors';

// Netlify Blobs store of §E6. The store is shared by production and previews,
// so every key carries the UUID of its restaurant or job.

const STORE_NAME = 'uploads';

/** Strong consistency: an image must be readable right after its upload. */
function uploads() {
  return getStore({ consistency: 'strong', name: STORE_NAME });
}

export function logoKey(restaurantId: string): string {
  return `restaurants/${restaurantId}/logo/${randomUUID()}`;
}

export function productImageKey(restaurantId: string, productId: string): string {
  return `restaurants/${restaurantId}/products/${productId}/${randomUUID()}`;
}

/** Keys that /media may serve: logos and product images, nothing else. */
export const PUBLIC_IMAGE_KEY_PATTERN =
  /^restaurants\/[0-9a-f-]{36}\/(?:logo|products\/[0-9a-f-]{36})\/[0-9a-f-]{36}$/;

export function mediaUrl(key: string): string {
  return `/media/${key}`;
}

export async function putImage(key: string, bytes: Uint8Array, contentType: ImageMimeType): Promise<void> {
  const data = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  await uploads().set(key, data, { metadata: { contentType } });
}

export async function readImage(
  key: string,
): Promise<{ data: ArrayBuffer; contentType: ImageMimeType } | null> {
  const entry = await uploads().getWithMetadata(key, { type: 'arrayBuffer' });
  if (!entry) return null;
  const { contentType } = entry.metadata;
  if (!isImageMimeType(contentType)) return null;
  return { contentType, data: entry.data };
}

/**
 * Deletes after the database change was confirmed (§E6). A failure leaves an
 * orphan blob, which is harmless, so it is logged and never thrown.
 */
export async function deleteBlobQuietly(key: string): Promise<void> {
  try {
    await uploads().delete(key);
  } catch (error) {
    console.error('Could not delete blob', key, describeErrorForLog(error));
  }
}
