import { access, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { LocalRestaurantAssetStorage } from './local-restaurant-asset.storage.js';

const RESTAURANT_ID = '33333333-3333-4333-8333-333333333333';

describe('LocalRestaurantAssetStorage', () => {
  let storageRoot: string;

  beforeEach(async () => {
    storageRoot = await mkdtemp(join(tmpdir(), 'sirio-storage-'));
  });

  afterEach(async () => {
    await rm(storageRoot, { force: true, recursive: true });
  });

  it('removes the complete restaurant directory recursively', async () => {
    const restaurantDirectory = join(storageRoot, 'restaurants', RESTAURANT_ID);
    await mkdir(join(restaurantDirectory, 'products'), { recursive: true });
    await writeFile(join(restaurantDirectory, 'logo.webp'), 'logo');
    await writeFile(join(restaurantDirectory, 'products', 'dish.webp'), 'dish');

    const storage = new LocalRestaurantAssetStorage(storageRoot);
    await storage.deleteDirectory(`restaurants/${RESTAURANT_ID}`);

    await expect(access(restaurantDirectory)).rejects.toThrow();
  });

  it.each(['../outside', '.', 'restaurants/not-a-uuid']) (
    'rejects unsafe path %s',
    async (unsafePath) => {
      const storage = new LocalRestaurantAssetStorage(storageRoot);
      await expect(storage.deleteDirectory(unsafePath)).rejects.toThrow(
        'Invalid restaurant asset path',
      );
    },
  );

  it('stores and reads a logo inside the restaurant profile directory', async () => {
    const storage = new LocalRestaurantAssetStorage(storageRoot);
    const png = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3]);

    const relativePath = await storage.saveLogo(RESTAURANT_ID, {
      bytes: png,
      contentType: 'image/png',
    });

    expect(relativePath).toBe(`restaurants/${RESTAURANT_ID}/profile/logo`);
    await expect(storage.readLogo(relativePath)).resolves.toEqual({
      bytes: Buffer.from(png),
      contentType: 'image/png',
    });
  });

  it('rejects logo paths outside the strict restaurant profile convention', async () => {
    const storage = new LocalRestaurantAssetStorage(storageRoot);
    await expect(storage.readLogo('../logo')).rejects.toThrow(
      'Invalid restaurant logo path',
    );
  });
});
