import { describe, expect, it } from 'vitest';

import { logoKey, mediaUrl, PUBLIC_IMAGE_KEY_PATTERN } from './blobs';

const restaurantId = '0b9f5a8e-3c55-4c3b-9a6f-6f1a2b3c4d5e';
const productId = '7d1c2b3a-4e5f-4a6b-8c7d-9e0f1a2b3c4d';
const fileId = 'c0ffee00-1234-4abc-9def-001122334455';

describe('PUBLIC_IMAGE_KEY_PATTERN', () => {
  it('acepta logos e imágenes de producto', () => {
    expect(PUBLIC_IMAGE_KEY_PATTERN.test(`restaurants/${restaurantId}/logo/${fileId}`)).toBe(true);
    expect(
      PUBLIC_IMAGE_KEY_PATTERN.test(`restaurants/${restaurantId}/products/${productId}/${fileId}`),
    ).toBe(true);
  });

  it.each([
    `digitization/${fileId}/1`,
    `restaurants/${restaurantId}/logo/../../digitization/${fileId}/1`,
    `restaurants/${restaurantId}/logo`,
    `restaurants/${restaurantId}/otros/${fileId}`,
    `restaurants/${restaurantId.toUpperCase()}/logo/${fileId}`,
  ])('rechaza %s', (key) => {
    expect(PUBLIC_IMAGE_KEY_PATTERN.test(key)).toBe(false);
  });
});

describe('logoKey', () => {
  it('genera una clave nueva bajo el restaurante en cada subida', () => {
    const first = logoKey(restaurantId);

    expect(PUBLIC_IMAGE_KEY_PATTERN.test(first)).toBe(true);
    expect(first).not.toBe(logoKey(restaurantId));
    expect(mediaUrl(first)).toBe(`/media/${first}`);
  });
});
