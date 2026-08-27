import { access, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { LocalProductImageStorage } from './local-product-image.storage.js';

const RESTAURANT_ID = '33333333-3333-4333-8333-333333333333';
const PRODUCT_ID = '44444444-4444-4444-8444-444444444444';

describe('LocalProductImageStorage', () => {
  let storageRoot: string;

  beforeEach(async () => {
    storageRoot = await mkdtemp(join(tmpdir(), 'sirio-product-storage-'));
  });

  afterEach(async () => {
    await rm(storageRoot, { force: true, recursive: true });
  });

  it('atomically stores, reads and removes a product image at its fixed path', async () => {
    const storage = new LocalProductImageStorage(storageRoot);
    const png = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3, 4]);

    const relativePath = await storage.saveImage(RESTAURANT_ID, PRODUCT_ID, {
      bytes: png,
      contentType: 'image/png',
    });

    expect(relativePath).toBe(
      `restaurants/${RESTAURANT_ID}/products/${PRODUCT_ID}/image`,
    );
    await expect(storage.readImage(relativePath)).resolves.toEqual({
      bytes: Buffer.from(png),
      contentType: 'image/png',
    });
    await storage.deleteImage(relativePath);
    await expect(access(dirname(join(storageRoot, relativePath)))).rejects.toThrow();
  });

  it.each([
    '../outside',
    `restaurants/${RESTAURANT_ID}/products/${PRODUCT_ID}/../../image`,
    `restaurants/${RESTAURANT_ID}/products/not-a-uuid/image`,
  ])('rejects an unsafe image path: %s', async (unsafePath) => {
    const storage = new LocalProductImageStorage(storageRoot);
    await expect(storage.readImage(unsafePath)).rejects.toThrow(
      'Invalid product image path',
    );
  });
});
